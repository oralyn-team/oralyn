const test = require('node:test')
const assert = require('node:assert/strict')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const { startAppWithPrisma } = require('../helpers/appHarness')
const { createUnifiedPrismaMock } = require('../helpers/mockPrisma')

process.env.NODE_ENV = 'test'
process.env.JWT_ADMIN_SECRET = 'test-admin-jwt-secret'
process.env.JWT_SECRET = 'integration-test-secret'

async function createAdminMock() {
  const hash = await bcrypt.hash('AdminPassword123', 10)
  return createUnifiedPrismaMock({
    configuracion: [
      { id: 10, nombre_consultorio: 'Consultorio A', nombre_profesional: 'Dr. A', creado_en: new Date('2026-01-01T10:00:00Z') }
    ],
    usuario: [
      { id: 1, consultorio_id: 10, email: 'doctorA@oralyn.test', password_hash: 'hash', nombre: 'Dra. A' }
    ],
    administrador: [
      { id: 1, email: 'admin@oralyn.test', password_hash: hash, nombre: 'Admin Uno', activo: true, creado_en: new Date() }
    ],
    paciente: []
  })
}

function signAdminToken(payload = {}, expiresIn = '2h') {
  return jwt.sign(
    {
      id: 1,
      email: 'admin@oralyn.test',
      nombre: 'Admin Uno',
      role: 'admin',
      ...payload
    },
    process.env.JWT_ADMIN_SECRET,
    { expiresIn }
  )
}

function signUserToken(payload = {}) {
  return jwt.sign(
    {
      id: 1,
      consultorio_id: 10,
      email: 'doctorA@oralyn.test',
      nombre: 'Dra. A',
      ...payload
    },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  )
}

// ─────────────────────────────────────────────────────────────
// 1. POST /api/admin/auth/login (Autenticación)
// ─────────────────────────────────────────────────────────────

test('Admin Auth: POST /api/admin/auth/login — login correcto con credenciales válidas', async (t) => {
  const prismaMock = await createAdminMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const { response, body } = await harness.request('/api/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin@oralyn.test',
      password: 'AdminPassword123'
    })
  })

  assert.equal(response.status, 200)
  assert.ok(body.token)
  assert.equal(body.admin.email, 'admin@oralyn.test')
  assert.equal(body.admin.nombre, 'Admin Uno')

  // Verificar que el token sea decodificable y tenga claims admin
  const decoded = jwt.verify(body.token, process.env.JWT_ADMIN_SECRET)
  assert.equal(decoded.email, 'admin@oralyn.test')
  assert.equal(decoded.role, 'admin')
})

test('Admin Auth: POST /api/admin/auth/login — login fallido con contraseña incorrecta', async (t) => {
  const prismaMock = await createAdminMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const { response, body } = await harness.request('/api/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin@oralyn.test',
      password: 'WrongPassword'
    })
  })

  assert.equal(response.status, 401)
  assert.equal(body.error, 'Credenciales incorrectas')
})

test('Admin Auth: POST /api/admin/auth/login — login fallido con email inexistente (mensaje genérico)', async (t) => {
  const prismaMock = await createAdminMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const { response, body } = await harness.request('/api/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'nonexistent@oralyn.test',
      password: 'AdminPassword123'
    })
  })

  assert.equal(response.status, 401)
  assert.equal(body.error, 'Credenciales incorrectas')
})

test('Admin Auth: POST /api/admin/auth/login — login fallido si falta email o password', async (t) => {
  const prismaMock = await createAdminMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const { response: responseNoEmail } = await harness.request('/api/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password: 'AdminPassword123' })
  })
  assert.equal(responseNoEmail.status, 400)

  const { response: responseNoPassword } = await harness.request('/api/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@oralyn.test' })
  })
  assert.equal(responseNoPassword.status, 400)
})

// ─────────────────────────────────────────────────────────────
// 2. Control de Permisos y x-admin-secret (Seguridad)
// ─────────────────────────────────────────────────────────────

test('Admin Permisos: Sin header Authorization retorna 401', async (t) => {
  const prismaMock = await createAdminMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const { response } = await harness.request('/api/admin/consultorios', {
    headers: {}
  })

  assert.equal(response.status, 401)
})

test('Admin Permisos: Con JWT de usuario normal (no admin) retorna 401 (fallo en validación de firma por secreto diferente)', async (t) => {
  const prismaMock = await createAdminMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const userToken = signUserToken()
  const { response } = await harness.request('/api/admin/consultorios', {
    headers: { 'Authorization': `Bearer ${userToken}` }
  })

  // Como el token del usuario se firma con JWT_SECRET, al verificarlo con JWT_ADMIN_SECRET
  // la verificación de firma siempre fallará y debe retornar 401 (no 403)
  assert.equal(response.status, 401)
})

test('Admin Permisos: Con JWT firmado con secret de admin pero sin rol admin retorna 403', async (t) => {
  const prismaMock = await createAdminMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const tokenWithoutRole = signAdminToken({ role: 'user' })
  const { response } = await harness.request('/api/admin/consultorios', {
    headers: { 'Authorization': `Bearer ${tokenWithoutRole}` }
  })

  assert.equal(response.status, 403)
})

test('Admin Permisos: Con el antiguo header x-admin-secret retorna 401', async (t) => {
  const prismaMock = await createAdminMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const { response } = await harness.request('/api/admin/consultorios', {
    headers: { 'x-admin-secret': 'super-secret-admin-key' }
  })

  // Al no llevar Token Bearer en Authorization, retorna 401
  assert.equal(response.status, 401)
})

test('Admin Permisos: Con JWT de admin expirado retorna 401', async (t) => {
  const prismaMock = await createAdminMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  // Crear token expirado (-1 segundo)
  const expiredToken = signAdminToken({}, '-1s')
  const { response } = await harness.request('/api/admin/consultorios', {
    headers: { 'Authorization': `Bearer ${expiredToken}` }
  })

  assert.equal(response.status, 401)
})

test('Admin Permisos: Con JWT de admin válido retorna 200', async (t) => {
  const prismaMock = await createAdminMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const adminToken = signAdminToken()
  const { response } = await harness.request('/api/admin/consultorios', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  })

  assert.equal(response.status, 200)
})

// ─────────────────────────────────────────────────────────────
// 3. POST /api/admin/consultorio (Operacional)
// ─────────────────────────────────────────────────────────────

test('Admin: POST /api/admin/consultorio — creación correcta de consultorio con JWT admin', async (t) => {
  const prismaMock = await createAdminMock()
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

  const token = signAdminToken()
  const { response, body } = await harness.request('/api/admin/consultorio', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 201)
  assert.equal(body.mensaje, 'Consultorio creado correctamente')
  assert.equal(body.nombre_consultorio, 'Consultorio C')
  assert.equal(body.usuario_email, 'adminC@oralyn.test')

  const dbConfig = prismaMock.__db.configuracion.find(c => c.id === body.consultorio_id)
  assert.ok(dbConfig)
})

// ─────────────────────────────────────────────────────────────
// 4. Chequeos de Bootstrap / Variables de entorno
// ─────────────────────────────────────────────────────────────

test('Admin Boot: app.js no causa error de salida si NODE_ENV es test y falta JWT_ADMIN_SECRET', (t) => {
  const originalEnv = { ...process.env }
  const originalExit = process.exit

  t.after(() => {
    process.env = originalEnv
    process.exit = originalExit
  })

  delete process.env.JWT_ADMIN_SECRET
  process.env.NODE_ENV = 'test'

  let exitCalled = false
  process.exit = () => {
    exitCalled = true
  }

  // Limpiar cache para volver a cargar app.js y evaluar la condición
  const appPath = require.resolve('../../src/app')
  delete require.cache[appPath]

  require('../../src/app')

  assert.equal(exitCalled, false, 'No debería llamar a process.exit')
})

test('Admin Boot: app.js finaliza el proceso (exit 1) si NODE_ENV es distinto de test y falta JWT_ADMIN_SECRET', (t) => {
  const originalEnv = { ...process.env }
  const originalExit = process.exit

  t.after(() => {
    process.env = originalEnv
    process.exit = originalExit
  })

  delete process.env.JWT_ADMIN_SECRET
  process.env.NODE_ENV = 'production'

  let exitCode = null
  process.exit = (code) => {
    exitCode = code
  }

  const appPath = require.resolve('../../src/app')
  delete require.cache[appPath]

  require('../../src/app')

  assert.equal(exitCode, 1, 'Debería llamar a process.exit(1)')
})
