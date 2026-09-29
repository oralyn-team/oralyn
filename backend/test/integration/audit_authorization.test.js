const test = require('node:test')
const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')

const { startAppWithPrisma } = require('../helpers/appHarness')
const { createUnifiedPrismaMock } = require('../helpers/mockPrisma')
const { ROLES } = require('../../src/lib/permissions')

process.env.JWT_SECRET = 'integration-test-secret'
process.env.NODE_ENV = 'test'

function generateToken(userId, consultorioId, rol = ROLES.DUENO, overrides = {}) {
  return jwt.sign(
    { id: userId, consultorio_id: consultorioId, email: 'audit_test@oralyn.com', rol, tv: 0, ...overrides },
    process.env.JWT_SECRET
  )
}

function crearMock() {
  return createUnifiedPrismaMock({
    configuracion: [
      { id: 10, nombre_consultorio: 'Consultorio Test 10' }
    ],
    usuario: [
      { id: 1, consultorio_id: 10, email: 'dueno10@oralyn.test', rol: ROLES.DUENO, nombre: 'Dra. Dueña', token_version: 0, activo: true },
      { id: 2, consultorio_id: 10, email: 'recepcion10@oralyn.test', rol: ROLES.RECEPCIONISTA, nombre: 'Recepción', token_version: 0, activo: true },
      { id: 3, consultorio_id: 10, email: 'inactivo@oralyn.test', rol: ROLES.RECEPCIONISTA, nombre: 'Ex-empleada', token_version: 0, activo: false }
    ]
  })
}

// ── requirePermission / requireRole: 403 por falta de permiso ──

test('GET /api/usuarios sin USERS_READ: retorna 403 y registra ACCESO_DENEGADO en Auditoria', async (t) => {
  const prismaMock = crearMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const token = generateToken(2, 10, ROLES.RECEPCIONISTA)
  const { response } = await harness.request('/api/usuarios', {
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 403)

  const entradas = prismaMock.__db.auditoria.filter((a) => a.accion === 'ACCESO_DENEGADO')
  assert.equal(entradas.length, 1)
  assert.equal(entradas[0].usuario_id, 2)
  assert.equal(entradas[0].consultorio_id, 10)
  assert.equal(entradas[0].modulo, 'Autorización')
  assert.equal(entradas[0].estado, 'FALLIDO')
  assert.match(entradas[0].detalles, /users\.read/)
  assert.match(entradas[0].detalles, /GET \/api\/usuarios/)
})

// ── verificarToken: cuenta desactivada (403) ──

test('Token válido de cuenta desactivada: retorna 403 y registra TOKEN_RECHAZADO', async (t) => {
  const prismaMock = crearMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const token = generateToken(3, 10, ROLES.RECEPCIONISTA)
  const { response } = await harness.request('/api/usuarios', {
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 403)

  const entradas = prismaMock.__db.auditoria.filter((a) => a.accion === 'TOKEN_RECHAZADO')
  assert.equal(entradas.length, 1)
  assert.equal(entradas[0].usuario_id, 3)
  assert.equal(entradas[0].estado, 'FALLIDO')
  assert.match(entradas[0].detalles, /desactivada/)
})

// ── verificarToken: token revocado (token_version desactualizado) ──

test('Token con token_version desactualizado (revocado): retorna 401 y registra TOKEN_RECHAZADO', async (t) => {
  const prismaMock = crearMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  // El usuario tiene token_version 0 en la BD; el token trae tv=5 (versión ya inválida/futura respecto a la sesión).
  const token = generateToken(1, 10, ROLES.DUENO, { tv: 5 })
  const { response } = await harness.request('/api/usuarios', {
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 401)

  const entradas = prismaMock.__db.auditoria.filter((a) => a.accion === 'TOKEN_RECHAZADO')
  assert.equal(entradas.length, 1)
  assert.equal(entradas[0].usuario_id, 1)
  assert.match(entradas[0].detalles, /revocado/)
})

// ── verificarToken: token expirado NO se audita (flujo normal, no intento de intrusión) ──

test('Token expirado (JWT expirado): retorna 403 y NO registra auditoría', async (t) => {
  const prismaMock = crearMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const tokenExpirado = jwt.sign(
    { id: 1, consultorio_id: 10, email: 'dueno10@oralyn.test', rol: ROLES.DUENO, tv: 0 },
    process.env.JWT_SECRET,
    { expiresIn: -10 } // ya expirado
  )
  const { response } = await harness.request('/api/usuarios', {
    headers: { Authorization: `Bearer ${tokenExpirado}` }
  })

  assert.equal(response.status, 403)
  assert.equal(prismaMock.__db.auditoria.length, 0)
})

// ── verificarToken: token con firma inválida SÍ se audita ──

test('Token con firma inválida (alterado): retorna 403 y registra TOKEN_RECHAZADO', async (t) => {
  const prismaMock = crearMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const tokenAjeno = jwt.sign(
    { id: 1, consultorio_id: 10, email: 'dueno10@oralyn.test', rol: ROLES.DUENO, tv: 0 },
    'otro-secreto-distinto'
  )
  const { response } = await harness.request('/api/usuarios', {
    headers: { Authorization: `Bearer ${tokenAjeno}` }
  })

  assert.equal(response.status, 403)

  const entradas = prismaMock.__db.auditoria.filter((a) => a.accion === 'TOKEN_RECHAZADO')
  assert.equal(entradas.length, 1)
  assert.match(entradas[0].detalles, /JsonWebTokenError/)
})
