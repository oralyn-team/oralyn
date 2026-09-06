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
      { id: 1, consultorio_id: 10, email: 'doctor@oralyn.test', password_hash: passwordHash, nombre: 'Dra. Test', token_version: 0 }
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
  assert.equal(usuarioDB.token_version, 0)
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
// 2. Pruebas de Login (POST /api/auth/login) y Cookies
// ─────────────────────────────────────────────────────────────

test('Auth Login: Inicia sesión correctamente con credenciales válidas, no retorna JWT en body pero setea la cookie', async (t) => {
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
  assert.equal(body.token, undefined, 'El token JWT crudo no debe exponerse en el body de respuesta')
  assert.equal(body.usuario.email, 'doctor@oralyn.test')
  assert.equal(body.usuario.consultorio_id, 10)

  // Validar la cookie HttpOnly
  const cookieHeader = response.headers.get('set-cookie') || ''
  assert.ok(cookieHeader.includes('token='), 'Debe setear la cookie token')
  assert.ok(cookieHeader.includes('HttpOnly'), 'La cookie debe ser HttpOnly')
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

test('Auth Cookies: SameSite se configura como None en producción y Lax en desarrollo/test', async (t) => {
  const originalEnv = process.env.NODE_ENV
  t.after(() => {
    process.env.NODE_ENV = originalEnv
  })

  const harness = await startAppWithPrisma(createAuthPrismaMock())
  t.after(() => harness.close())

  // Caso: Entorno de Test (debe ser Lax)
  process.env.NODE_ENV = 'test'
  const { response: resTest } = await harness.request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'doctor@oralyn.test', password: 'Password123' })
  })
  const cookieHeaderTest = resTest.headers.get('set-cookie') || ''
  assert.ok(cookieHeaderTest.includes('SameSite=Lax'), 'Debe usar SameSite=Lax en entorno test')

  // Caso: Entorno de Producción (debe ser None + Secure)
  process.env.NODE_ENV = 'production'
  const { response: resProd } = await harness.request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'doctor@oralyn.test', password: 'Password123' })
  })
  const cookieHeaderProd = resProd.headers.get('set-cookie') || ''
  assert.ok(cookieHeaderProd.includes('SameSite=None'), 'Debe usar SameSite=None en entorno producción')
  assert.ok(cookieHeaderProd.includes('Secure'), 'Debe usar Secure en producción')
})

test('Auth Cookies: POST /api/auth/logout limpia la cookie y posterior petición falla', async (t) => {
  const harness = await startAppWithPrisma(createAuthPrismaMock())
  t.after(() => harness.close())

  // Login para obtener cookie
  const { response: loginRes } = await harness.request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'doctor@oralyn.test', password: 'Password123' })
  })
  const cookieHeader = loginRes.headers.get('set-cookie') || ''
  const tokenCookie = cookieHeader.split(';')[0]

  // Logout
  const { response: logoutRes } = await harness.request('/api/auth/logout', {
    method: 'POST',
    headers: { 'Cookie': tokenCookie }
  })
  assert.equal(logoutRes.status, 200)
  const clearCookieHeader = logoutRes.headers.get('set-cookie') || ''
  assert.ok(clearCookieHeader.includes('token=;'), 'Debe vaciar el valor de la cookie')

  // Petición posterior con la cookie vaciada/limpia debe fallar con 401
  const { response: meRes } = await harness.request('/api/auth/me', {
    headers: { 'Cookie': clearCookieHeader.split(';')[0] }
  })
  assert.equal(meRes.status, 401)
})

// ─────────────────────────────────────────────────────────────
// 3. Pruebas de Permisos, Revocación y Aislamiento (GAP-001)
// ─────────────────────────────────────────────────────────────

test('Auth Seguridad: Falla con código 403 si el token fue manipulado (firma inválida)', async (t) => {
  const harness = await startAppWithPrisma(createAuthPrismaMock())
  t.after(() => harness.close())

  const tokenManipulado = jwt.sign(
    { id: 1, consultorio_id: 10, email: 'doctor@oralyn.test', tv: 0 },
    'firma-incorrecta-secreta'
  )

  const { response, body } = await harness.request('/api/auth/me', {
    headers: { 'Cookie': `token=${tokenManipulado}` }
  })

  assert.equal(response.status, 403)
  assert.equal(body.error, 'Token inválido o expirado')
})

test('Auth Seguridad: Fallback de cabecera Authorization (modo legado) sigue funcionando', async (t) => {
  const harness = await startAppWithPrisma(createAuthPrismaMock())
  t.after(() => harness.close())

  // Firmar token manual válido
  const token = jwt.sign(
    { id: 1, consultorio_id: 10, email: 'doctor@oralyn.test', tv: 0 },
    process.env.JWT_SECRET
  )

  const { response, body } = await harness.request('/api/auth/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  })

  assert.equal(response.status, 200)
  assert.equal(body.usuario.email, 'doctor@oralyn.test')
})

test('Auth Revocación: Cambiar contraseña incrementa token_version en BD e invalida tokens anteriores', async (t) => {
  const prismaMock = createAuthPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  // 1. Obtener cookie inicial
  const { response: loginRes } = await harness.request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'doctor@oralyn.test', password: 'Password123' })
  })
  const cookieHeader = loginRes.headers.get('set-cookie') || ''
  const initialCookie = cookieHeader.split(';')[0]

  // Validar acceso inicial
  const { response: meRes } = await harness.request('/api/auth/me', {
    headers: { 'Cookie': initialCookie }
  })
  assert.equal(meRes.status, 200)

  // 2. Cambiar contraseña
  const { response: changeRes } = await harness.request('/api/auth/change-password', {
    method: 'POST',
    headers: {
      'Cookie': initialCookie,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      currentPassword: 'Password123',
      newPassword: 'NewPassword456'
    })
  })
  assert.equal(changeRes.status, 200)

  // Validar incremento de versión en BD
  const userDB = prismaMock.__db.usuario.find(u => u.email === 'doctor@oralyn.test')
  assert.equal(userDB.token_version, 1)

  // 3. Cookie inicial (token_version 0) ahora debe fallar con 401 (revocada)
  const { response: meResRechazado } = await harness.request('/api/auth/me', {
    headers: { 'Cookie': initialCookie }
  })
  assert.equal(meResRechazado.status, 401)

  // 4. Login con nueva contraseña debe funcionar y emitir cookie con tv = 1
  const { response: loginResNew } = await harness.request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'doctor@oralyn.test', password: 'NewPassword456' })
  })
  assert.equal(loginResNew.status, 200)

  const newCookieHeader = loginResNew.headers.get('set-cookie') || ''
  const newCookie = newCookieHeader.split(';')[0]

  // Acceso concedido con nueva cookie
  const { response: meResAceptado } = await harness.request('/api/auth/me', {
    headers: { 'Cookie': newCookie }
  })
  assert.equal(meResAceptado.status, 200)
})

// ─────────────────────────────────────────────────────────────
// 4. CORS y Cabeceras
// ─────────────────────────────────────────────────────────────

test('Auth CORS: Valida presencia de Access-Control-Allow-Credentials y Origin exacto', async (t) => {
  const harness = await startAppWithPrisma(createAuthPrismaMock())
  t.after(() => harness.close())

  const { response } = await harness.request('/api/auth/login', {
    method: 'OPTIONS',
    headers: {
      'Origin': 'https://oralyn.vercel.app',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type'
    }
  })

  assert.equal(response.headers.get('access-control-allow-credentials'), 'true')
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://oralyn.vercel.app')
})
