const test = require('node:test')
const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')

const { startAppWithPrisma } = require('../helpers/appHarness')
const { createUnifiedPrismaMock } = require('../helpers/mockPrisma')

process.env.JWT_SECRET = 'integration-test-secret'
process.env.NODE_ENV = 'test'

function generateToken(userId, consultorioId) {
  return jwt.sign({ id: userId, consultorio_id: consultorioId, email: 'doctor@oralyn.test' }, process.env.JWT_SECRET)
}

function createConfiguracionMock() {
  return createUnifiedPrismaMock({
    configuracion: [
      { id: 10, nombre_consultorio: 'Consultorio A', nombre_profesional: 'Dr. A' },
      { id: 99, nombre_consultorio: 'Consultorio B', nombre_profesional: 'Dr. B' }
    ],
    usuario: [
      { id: 1, consultorio_id: 10, email: 'doctorA@oralyn.test', password_hash: 'hash', nombre: 'Dra. A' },
      { id: 2, consultorio_id: 99, email: 'doctorB@oralyn.test', password_hash: 'hash', nombre: 'Dr. B' }
    ]
  })
}

// ─────────────────────────────────────────────────────────────
// 1. GET /api/configuracion
// ─────────────────────────────────────────────────────────────

test('GET /api/configuracion — obtiene configuración del consultorio correcto', async (t) => {
  const harness = await startAppWithPrisma(createConfiguracionMock())
  t.after(() => harness.close())

  const tokenA = generateToken(1, 10)

  const { response, body } = await harness.request('/api/configuracion', {
    headers: { Authorization: `Bearer ${tokenA}` }
  })

  assert.equal(response.status, 200)
  assert.equal(body.id, 10)
  assert.equal(body.nombre_consultorio, 'Consultorio A')
})

test('GET /api/configuracion — inexistente retorna 404', async (t) => {
  const prismaMock = createConfiguracionMock()
  // Eliminar configuración de ID 10
  prismaMock.__db.configuracion = prismaMock.__db.configuracion.filter(c => c.id !== 10)

  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const tokenA = generateToken(1, 10)

  const { response } = await harness.request('/api/configuracion', {
    headers: { Authorization: `Bearer ${tokenA}` }
  })

  assert.equal(response.status, 404)
})

// ─────────────────────────────────────────────────────────────
// 2. POST /api/configuracion
// ─────────────────────────────────────────────────────────────

test('POST /api/configuracion — campos obligatorios faltantes retorna 400', async (t) => {
  const harness = await startAppWithPrisma(createConfiguracionMock())
  t.after(() => harness.close())

  const tokenA = generateToken(1, 10)
  const payload = { nombre_consultorio: 'Falta profesional' }

  const { response, body } = await harness.request('/api/configuracion', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 400)
  assert.equal(body.error, 'Nombre del consultorio y profesional son obligatorios')
})

test('POST /api/configuracion — si ya existe configuración retorna 400', async (t) => {
  const harness = await startAppWithPrisma(createConfiguracionMock())
  t.after(() => harness.close())

  const tokenA = generateToken(1, 10)
  const payload = {
    nombre_consultorio: 'Otro',
    nombre_profesional: 'Otro'
  }

  const { response, body } = await harness.request('/api/configuracion', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 400)
  assert.equal(body.error, 'Ya existe una configuración. Usa PUT para actualizarla.')
})

test('POST /api/configuracion — creación vincula el id al consultorio_id del usuario (BUG DE LÓGICA)', async (t) => {
  const prismaMock = createConfiguracionMock()
  // Eliminar la de ID 10 para poder crearla
  prismaMock.__db.configuracion = prismaMock.__db.configuracion.filter(c => c.id !== 10)

  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const tokenA = generateToken(1, 10)
  const payload = {
    nombre_consultorio: 'Nuevo Consultorio A',
    nombre_profesional: 'Dr. Nuevo A'
  }

  const { response, body } = await harness.request('/api/configuracion', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 201)
  
  // BUG: El id devuelto debería ser 10 (el del consultorio_id del usuario), pero actualmente retorna uno auto-incrementado (p. ej. 1)
  assert.equal(body.id, 10)

  // BUG CONSECUENTE: Al hacer GET, el backend buscará por el id = 10 del usuario. Debería retornar 200 OK con la configuración.
  const getRes = await harness.request('/api/configuracion', {
    headers: { Authorization: `Bearer ${tokenA}` }
  })
  assert.equal(getRes.response.status, 200)
})

// ─────────────────────────────────────────────────────────────
// 3. PUT /api/configuracion
// ─────────────────────────────────────────────────────────────

test('PUT /api/configuracion — actualiza configuración correctamente', async (t) => {
  const prismaMock = createConfiguracionMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const tokenA = generateToken(1, 10)
  const payload = {
    nombre_consultorio: 'Consultorio A Modificado',
    nombre_profesional: 'Dr. A Modificado',
    direccion: 'Calle Falsa 123'
  }

  const { response, body } = await harness.request('/api/configuracion', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 200)
  assert.equal(body.nombre_consultorio, 'Consultorio A Modificado')
  assert.equal(body.direccion, 'Calle Falsa 123')

  const dbConfig = prismaMock.__db.configuracion.find(c => c.id === 10)
  assert.equal(dbConfig.nombre_consultorio, 'Consultorio A Modificado')
  assert.equal(dbConfig.direccion, 'Calle Falsa 123')
})

// ─────────────────────────────────────────────────────────────
// 4. Aislamiento Cross-Tenant
// ─────────────────────────────────────────────────────────────

test('Aislamiento Configuración: No mezcla ni permite leer o modificar configuraciones de otros consultorios', async (t) => {
  const prismaMock = createConfiguracionMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const tokenB = generateToken(2, 99) // Usuario del consultorio 99

  // GET: Solo obtiene la de su consultorio (99), no la del consultorio 10
  const getRes = await harness.request('/api/configuracion', {
    headers: { Authorization: `Bearer ${tokenB}` }
  })
  assert.equal(getRes.response.status, 200)
  assert.equal(getRes.body.id, 99)
  assert.equal(getRes.body.nombre_consultorio, 'Consultorio B')

  // PUT: Modifica solo su consultorio (99)
  const putRes = await harness.request('/api/configuracion', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${tokenB}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ nombre_consultorio: 'Consultorio B Hackeado' })
  })
  assert.equal(putRes.response.status, 200)
  assert.equal(putRes.body.id, 99)

  // Verificar que la configuración del consultorio 10 no fue modificada
  const configA = prismaMock.__db.configuracion.find(c => c.id === 10)
  assert.equal(configA.nombre_consultorio, 'Consultorio A')
})
