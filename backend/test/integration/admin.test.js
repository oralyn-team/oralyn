const test = require('node:test')
const assert = require('node:assert/strict')
const bcrypt = require('bcryptjs')

const { startAppWithPrisma } = require('../helpers/appHarness')
const { createUnifiedPrismaMock } = require('../helpers/mockPrisma')

process.env.ADMIN_SECRET = 'super-secret-admin-key'
process.env.NODE_ENV = 'test'

function createAdminMock() {
  return createUnifiedPrismaMock({
    configuracion: [
      { id: 10, nombre_consultorio: 'Consultorio A', nombre_profesional: 'Dr. A', creado_en: new Date('2026-01-01T10:00:00Z') }
    ],
    usuario: [
      { id: 1, consultorio_id: 10, email: 'doctorA@oralyn.test', password_hash: 'hash', nombre: 'Dra. A' }
    ],
    paciente: []
  })
}

// ─────────────────────────────────────────────────────────────
// 1. POST /api/admin/consultorio
// ─────────────────────────────────────────────────────────────

test('Admin: POST /api/admin/consultorio — creación correcta de consultorio y primer usuario admin', async (t) => {
  const prismaMock = createAdminMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const payload = {
    nombre_consultorio: 'Consultorio C',
    nombre_profesional: 'Dr. C',
    nit: ' Nit-C',
    usuario_email: 'adminC@oralyn.test',
    usuario_password: 'Password123',
    usuario_nombre: 'Dra. Carlos C'
  }

  const { response, body } = await harness.request('/api/admin/consultorio', {
    method: 'POST',
    headers: {
      'x-admin-secret': 'super-secret-admin-key',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 201)
  assert.equal(body.mensaje, 'Consultorio creado correctamente')
  assert.equal(body.nombre_consultorio, 'Consultorio C')
  assert.equal(body.usuario_email, 'adminC@oralyn.test')
  assert.ok(body.consultorio_id)

  // Verificar en base de datos simulada
  const dbConfig = prismaMock.__db.configuracion.find(c => c.id === body.consultorio_id)
  assert.ok(dbConfig)
  assert.equal(dbConfig.nombre_consultorio, 'Consultorio C')

  const dbUser = prismaMock.__db.usuario.find(u => u.email === 'adminC@oralyn.test')
  assert.ok(dbUser)
  assert.equal(dbUser.consultorio_id, body.consultorio_id)
  
  // Verificar hash de contraseña
  const passMatch = await bcrypt.compare('Password123', dbUser.password_hash)
  assert.ok(passMatch)
})

test('Admin: POST /api/admin/consultorio — campos obligatorios faltantes retorna 400', async (t) => {
  const harness = await startAppWithPrisma(createAdminMock())
  t.after(() => harness.close())

  const payload = {
    nombre_consultorio: 'Consultorio Sin Campos'
    // Faltan profesional, email, password, etc.
  }

  const { response, body } = await harness.request('/api/admin/consultorio', {
    method: 'POST',
    headers: {
      'x-admin-secret': 'super-secret-admin-key',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 400)
  assert.equal(body.error, 'Faltan campos obligatorios')
})

test('Admin: POST /api/admin/consultorio — correo de usuario ya existente retorna 400', async (t) => {
  const harness = await startAppWithPrisma(createAdminMock())
  t.after(() => harness.close())

  const payload = {
    nombre_consultorio: 'Consultorio Repetido',
    nombre_profesional: 'Dr. Repetido',
    usuario_email: 'doctorA@oralyn.test', // Ya registrado en createAdminMock
    usuario_password: 'Password123',
    usuario_nombre: 'Dr. Repetido'
  }

  const { response, body } = await harness.request('/api/admin/consultorio', {
    method: 'POST',
    headers: {
      'x-admin-secret': 'super-secret-admin-key',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 400)
  assert.equal(body.error, 'El correo del usuario ya está registrado')
})

// ─────────────────────────────────────────────────────────────
// 2. GET /api/admin/consultorios
// ─────────────────────────────────────────────────────────────

test('Admin: GET /api/admin/consultorios — obtiene listado de consultorios con contadores', async (t) => {
  const prismaMock = createAdminMock()
  
  // Agregar algunos registros de prueba
  prismaMock.__db.paciente.push({ id: 80, consultorio_id: 10, nombres: 'Carlos' })

  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const { response, body } = await harness.request('/api/admin/consultorios', {
    headers: { 'x-admin-secret': 'super-secret-admin-key' }
  })

  assert.equal(response.status, 200)
  assert.ok(Array.isArray(body))
  assert.equal(body.length, 1)
  assert.equal(body[0].nombre_consultorio, 'Consultorio A')
  
  // Verificar _count implementado en el mock
  assert.ok(body[0]._count)
  assert.equal(body[0]._count.pacientes, 1)
  assert.equal(body[0]._count.usuarios, 1)
})

// ─────────────────────────────────────────────────────────────
// 3. Control de Permisos y x-admin-secret
// ─────────────────────────────────────────────────────────────

test('Admin Permisos: Sin header x-admin-secret retorna 403', async (t) => {
  const harness = await startAppWithPrisma(createAdminMock())
  t.after(() => harness.close())

  const { response } = await harness.request('/api/admin/consultorios', {
    headers: {} // Vacío
  })

  assert.equal(response.status, 403)
})

test('Admin Permisos: Con header x-admin-secret incorrecto retorna 403', async (t) => {
  const harness = await startAppWithPrisma(createAdminMock())
  t.after(() => harness.close())

  const { response } = await harness.request('/api/admin/consultorios', {
    headers: { 'x-admin-secret': 'incorrect-secret' }
  })

  assert.equal(response.status, 403)
})

test('Admin Permisos: POST /consultorio sin x-admin-secret retorna 403', async (t) => {
  const harness = await startAppWithPrisma(createAdminMock())
  t.after(() => harness.close())

  const { response } = await harness.request('/api/admin/consultorio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre_consultorio: 'Hacker' })
  })

  assert.equal(response.status, 403)
})
