const test = require('node:test')
const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

const { startAppWithPrisma } = require('../helpers/appHarness')
const { createUnifiedPrismaMock } = require('../helpers/mockPrisma')

process.env.JWT_SECRET = 'integration-test-secret'
process.env.ADMIN_SECRET = 'admin-test-secret'
process.env.NODE_ENV = 'test'

// Helper para crear un mock de Prisma con datos iniciales de auth
function createAuthPrismaMock() {
  const passwordHash = bcrypt.hashSync('Password123', 10)
  return createUnifiedPrismaMock({
    configuracion: [
      { id: 10, nombre_consultorio: 'Consultorio A', nombre_profesional: 'Dr. A' }
    ],
    usuario: [
      { id: 1, consultorio_id: 10, email: 'doctor@oralyn.test', password_hash: passwordHash, nombre: 'Dra. Test' }
    ]
  })
}

// ─────────────────────────────────────────────────────────────
// 1. Pruebas de Registro (POST /api/auth/registro)
// ─────────────────────────────────────────────────────────────

test('Auth Registro: Registra un usuario válido correctamente', async (t) => {
  const prismaMock = createAuthPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const { response, body } = await harness.request('/api/auth/registro', {
    method: 'POST',
    body: JSON.stringify({
      email: 'nuevo_doctor@oralyn.test',
      password: 'Password123',
      nombre: 'Dr. Nuevo',
      consultorio_id: 10
    })
  })

  assert.equal(response.status, 201)
  assert.equal(body.mensaje, 'Usuario creado correctamente')
  assert.equal(body.usuario.email, 'nuevo_doctor@oralyn.test')
  assert.equal(body.usuario.consultorio_id, 10)
  assert.ok(body.usuario.id)
  
  // Verificar en la "base de datos" mock
  const usuarioDB = prismaMock.__db.usuario.find(u => u.email === 'nuevo_doctor@oralyn.test')
  assert.ok(usuarioDB)
  assert.ok(bcrypt.compareSync('Password123', usuarioDB.password_hash))
})

test('Auth Registro: Falla con código 400 si el correo ya está registrado', async (t) => {
  const harness = await startAppWithPrisma(createAuthPrismaMock())
  t.after(() => harness.close())

  const { response, body } = await harness.request('/api/auth/registro', {
    method: 'POST',
    body: JSON.stringify({
      email: 'doctor@oralyn.test', // Ya existe en la base de datos
      password: 'Password123',
      nombre: 'Dr. Duplicado',
      consultorio_id: 10
    })
  })

  assert.equal(response.status, 400)
  assert.equal(body.error, 'El correo ya está registrado')
})

test('Auth Registro: Falla con código 404 si el consultorio no existe', async (t) => {
  const harness = await startAppWithPrisma(createAuthPrismaMock())
  t.after(() => harness.close())

  const { response, body } = await harness.request('/api/auth/registro', {
    method: 'POST',
    body: JSON.stringify({
      email: 'doctor_clinica_invalida@oralyn.test',
      password: 'Password123',
      nombre: 'Dr. Clinica Invalida',
      consultorio_id: 999 // ID de consultorio inexistente
    })
  })

  assert.equal(response.status, 404)
  assert.equal(body.error, 'Consultorio no encontrado')
})

test('Auth Registro: Falla con código 400 si faltan campos obligatorios', async (t) => {
  const harness = await startAppWithPrisma(createAuthPrismaMock())
  t.after(() => harness.close())

  const casosIncompletos = [
    { password: 'Password123', nombre: 'Test', consultorio_id: 10 }, // Falta email
    { email: 'test@oralyn.test', nombre: 'Test', consultorio_id: 10 }, // Falta password
    { email: 'test@oralyn.test', password: 'Password123', consultorio_id: 10 }, // Falta nombre
  ]

  for (const payload of casosIncompletos) {
    const { response, body } = await harness.request('/api/auth/registro', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    assert.equal(response.status, 400)
    assert.equal(body.error, 'Faltan campos obligatorios')
  }

  // Caso especial: Falta consultorio_id
  const { response, body } = await harness.request('/api/auth/registro', {
    method: 'POST',
    body: JSON.stringify({
      email: 'test_sin_id@oralyn.test',
      password: 'Password123',
      nombre: 'Test sin ID'
    })
  })
  assert.equal(response.status, 400)
  assert.equal(body.error, 'El consultorio_id es obligatorio')
})

// ─────────────────────────────────────────────────────────────
// 2. Pruebas de Login (POST /api/auth/login)
// ─────────────────────────────────────────────────────────────

test('Auth Login: Inicia sesión correctamente con credenciales válidas y retorna JWT', async (t) => {
  const harness = await startAppWithPrisma(createAuthPrismaMock())
  t.after(() => harness.close())

  const { response, body } = await harness.request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'doctor@oralyn.test',
      password: 'Password123'
    })
  })

  assert.equal(response.status, 200)
  assert.ok(body.token)
  assert.equal(body.usuario.email, 'doctor@oralyn.test')
  assert.equal(body.usuario.consultorio_id, 10)

  // Validar la firma y estructura del token JWT retornado
  const payload = jwt.verify(body.token, process.env.JWT_SECRET)
  assert.equal(payload.id, body.usuario.id)
  assert.equal(payload.email, 'doctor@oralyn.test')
  assert.equal(payload.consultorio_id, 10)
})

test('Auth Login: Falla con código 401 si la contraseña es incorrecta', async (t) => {
  const harness = await startAppWithPrisma(createAuthPrismaMock())
  t.after(() => harness.close())

  const { response, body } = await harness.request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'doctor@oralyn.test',
      password: 'PasswordErronea'
    })
  })

  assert.equal(response.status, 401)
  assert.equal(body.error, 'Credenciales incorrectas')
})

test('Auth Login: Falla con código 401 si el usuario no existe', async (t) => {
  const harness = await startAppWithPrisma(createAuthPrismaMock())
  t.after(() => harness.close())

  const { response, body } = await harness.request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'no_existe_usuario@oralyn.test',
      password: 'Password123'
    })
  })

  assert.equal(response.status, 401)
  assert.equal(body.error, 'Credenciales incorrectas')
})

// ─────────────────────────────────────────────────────────────
// 3. Pruebas de Permisos de Token (Rutas Protegidas)
// ─────────────────────────────────────────────────────────────

test('Auth Seguridad: Falla con código 403 si el token fue manipulado (firma inválida)', async (t) => {
  const harness = await startAppWithPrisma(createAuthPrismaMock())
  t.after(() => harness.close())

  // Firmar un token con una clave secreta incorrecta (manipulada)
  const tokenManipulado = jwt.sign(
    { id: 1, consultorio_id: 10, email: 'doctor@oralyn.test' },
    'firma-incorrecta-secreta'
  )

  const { response, body } = await harness.request('/api/pdf/recomendaciones', {
    headers: { Authorization: `Bearer ${tokenManipulado}` }
  })

  assert.equal(response.status, 403)
  assert.equal(body.error, 'Token inválido o expirado')
})

test('Auth Seguridad: Falla con código 403 si el token es inválido (malformado / no bien formado)', async (t) => {
  const harness = await startAppWithPrisma(createAuthPrismaMock())
  t.after(() => harness.close())

  const { response, body } = await harness.request('/api/pdf/recomendaciones', {
    headers: { Authorization: 'Bearer esto-no-es-un-jwt-valido' }
  })

  assert.equal(response.status, 403)
  assert.equal(body.error, 'Token inválido o expirado')
})

test('Auth Seguridad: Falla con código 403 si el token ha expirado', async (t) => {
  const harness = await startAppWithPrisma(createAuthPrismaMock())
  t.after(() => harness.close())

  // Crear un token que ya expiró (expiración en el pasado)
  const tokenExpirado = jwt.sign(
    { id: 1, consultorio_id: 10, email: 'doctor@oralyn.test', exp: Math.floor(Date.now() / 1000) - 10 },
    process.env.JWT_SECRET
  )

  const { response, body } = await harness.request('/api/pdf/recomendaciones', {
    headers: { Authorization: `Bearer ${tokenExpirado}` }
  })

  assert.equal(response.status, 403)
  assert.equal(body.error, 'Token inválido o expirado')
})
