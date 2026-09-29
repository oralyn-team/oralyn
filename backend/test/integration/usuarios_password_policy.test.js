const test = require('node:test')
const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')

const { startAppWithPrisma } = require('../helpers/appHarness')
const { createUnifiedPrismaMock } = require('../helpers/mockPrisma')
const { ROLES } = require('../../src/lib/permissions')

process.env.JWT_SECRET = 'integration-test-secret'
process.env.NODE_ENV = 'test'

function generateToken(userId, consultorioId, rol = ROLES.DUENO) {
  return jwt.sign(
    { id: userId, consultorio_id: consultorioId, email: 'dueno@oralyn.test', rol, tv: 0 },
    process.env.JWT_SECRET
  )
}

function crearMock() {
  return createUnifiedPrismaMock({
    configuracion: [{ id: 10, nombre_consultorio: 'Consultorio Test 10' }],
    usuario: [
      { id: 1, consultorio_id: 10, email: 'dueno@oralyn.test', rol: ROLES.DUENO, nombre: 'Dra. Dueña', token_version: 0, activo: true }
    ]
  })
}

// GAP-005 (POST /api/usuarios): un DUEÑO tampoco puede crear un compañero con contraseña débil.

test('POST /api/usuarios — falla con 400 si la contraseña del nuevo usuario no cumple la política', async (t) => {
  const prismaMock = crearMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const token = generateToken(1, 10, ROLES.DUENO)
  const { response, body } = await harness.request('/api/usuarios', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      email: 'nuevo@oralyn.test',
      password: 'debil123', // sin mayúscula ni carácter especial
      nombre: 'Nuevo Asistente'
    })
  })

  assert.equal(response.status, 400)
  assert.equal(body.error, 'La contraseña no cumple los requisitos de seguridad')
  assert.equal(prismaMock.__db.usuario.some(u => u.email === 'nuevo@oralyn.test'), false)
})

test('POST /api/usuarios — crea correctamente con una contraseña que cumple la política', async (t) => {
  const prismaMock = crearMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const token = generateToken(1, 10, ROLES.DUENO)
  const { response, body } = await harness.request('/api/usuarios', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      email: 'nuevo@oralyn.test',
      password: 'Segura123!',
      nombre: 'Nuevo Asistente'
    })
  })

  assert.equal(response.status, 201)
  assert.equal(body.email, 'nuevo@oralyn.test')
  assert.equal(prismaMock.__db.usuario.some(u => u.email === 'nuevo@oralyn.test'), true)
})
