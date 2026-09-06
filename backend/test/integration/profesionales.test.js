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
    { id: userId, consultorio_id: consultorioId, email: 'profesional_test@oralyn.com', rol },
    process.env.JWT_SECRET
  )
}

function createProfesionalesMock() {
  return createUnifiedPrismaMock({
    configuracion: [
      { id: 10, nombre_consultorio: 'Consultorio Test 10', nombre_profesional: 'Dra. Rocío' },
      { id: 99, nombre_consultorio: 'Consultorio Test 99', nombre_profesional: 'Dr. Otro' }
    ],
    usuario: [
      { id: 1, consultorio_id: 10, email: 'dueno10@oralyn.test', rol: ROLES.DUENO, nombre: 'Dra. Rocío' },
      { id: 2, consultorio_id: 99, email: 'dueno99@oralyn.test', rol: ROLES.DUENO, nombre: 'Dr. Otro' },
      { id: 3, consultorio_id: null, email: 'super@oralyn.test', rol: ROLES.SUPERADMIN, nombre: 'Super' },
      { id: 4, consultorio_id: 10, email: 'asistente10@oralyn.test', rol: ROLES.ASISTENTE_ODONTOLOGO, nombre: 'Asistente' },
      { id: 5, consultorio_id: 10, email: 'recepcion10@oralyn.test', rol: ROLES.RECEPCIONISTA, nombre: 'Recepción' }
    ],
    profesional: [
      { id: 101, consultorio_id: 10, nombre_completo: 'Dra. Rocío Murillo', cedula_profesional: '39579364', firma_default: 'data:image/png;base64,firma101', activo: true, creado_en: new Date('2026-01-01') },
      { id: 102, consultorio_id: 10, nombre_completo: 'Dr. Felipe Torres', cedula_profesional: '7741234', firma_default: null, activo: true, creado_en: new Date('2026-01-02') },
      { id: 103, consultorio_id: 10, nombre_completo: 'Dr. Inactivo', cedula_profesional: '11111', firma_default: null, activo: false, creado_en: new Date('2026-01-03') },
      { id: 991, consultorio_id: 99, nombre_completo: 'Dr. Consultorio 99', cedula_profesional: '99999', firma_default: null, activo: true, creado_en: new Date('2026-01-01') }
    ]
  })
}

// ─────────────────────────────────────────────────────────────
// 1. GET /api/profesionales
// ─────────────────────────────────────────────────────────────

test('GET /api/profesionales — retorna lista de profesionales activos del consultorio del usuario', async (t) => {
  const harness = await startAppWithPrisma(createProfesionalesMock())
  t.after(() => harness.close())

  const token10 = generateToken(1, 10, ROLES.DUENO)

  const { response, body } = await harness.request('/api/profesionales', {
    headers: { Authorization: `Bearer ${token10}` }
  })

  assert.equal(response.status, 200)
  assert.ok(Array.isArray(body))
  // Solo debe incluir los activos del consultorio 10 (id: 101 y 102, excluye 103 inactivo y 991 del consultorio 99)
  assert.equal(body.length, 2)
  const ids = body.map(p => p.id)
  assert.ok(ids.includes(101))
  assert.ok(ids.includes(102))
  assert.equal(ids.includes(103), false)
  assert.equal(ids.includes(991), false)
})

test('GET /api/profesionales — permite acceso a RECEPCIONISTA (SETTINGS_READ) y bloquea a ASISTENTE sin permiso', async (t) => {
  const harness = await startAppWithPrisma(createProfesionalesMock())
  t.after(() => harness.close())

  const tokenRecepcion = generateToken(5, 10, ROLES.RECEPCIONISTA)
  const tokenAsistente = generateToken(4, 10, ROLES.ASISTENTE_ODONTOLOGO)

  const resRecepcion = await harness.request('/api/profesionales', {
    headers: { Authorization: `Bearer ${tokenRecepcion}` }
  })
  assert.equal(resRecepcion.response.status, 200)

  const resAsistente = await harness.request('/api/profesionales', {
    headers: { Authorization: `Bearer ${tokenAsistente}` }
  })
  assert.equal(resAsistente.response.status, 403)
})

test('GET /api/profesionales — sin token retorna 401', async (t) => {
  const harness = await startAppWithPrisma(createProfesionalesMock())
  t.after(() => harness.close())

  const { response } = await harness.request('/api/profesionales')
  assert.equal(response.status, 401)
})

test('GET /api/profesionales — SUPERADMIN es rechazado con 403', async (t) => {
  const harness = await startAppWithPrisma(createProfesionalesMock())
  t.after(() => harness.close())

  const tokenSuper = generateToken(3, null, ROLES.SUPERADMIN)

  const { response, body } = await harness.request('/api/profesionales', {
    headers: { Authorization: `Bearer ${tokenSuper}` }
  })

  assert.equal(response.status, 403)
  assert.ok(body.error.includes('Acceso denegado'))
})

// ─────────────────────────────────────────────────────────────
// 2. POST /api/profesionales
// ─────────────────────────────────────────────────────────────

test('POST /api/profesionales — crea un nuevo profesional exitosamente', async (t) => {
  const mock = createProfesionalesMock()
  const harness = await startAppWithPrisma(mock)
  t.after(() => harness.close())

  const token10 = generateToken(1, 10, ROLES.DUENO)
  const payload = {
    nombre_completo: 'Dra. Carolina Vargas',
    cedula_profesional: '52890123'
  }

  const { response, body } = await harness.request('/api/profesionales', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token10}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 201)
  assert.equal(body.nombre_completo, 'Dra. Carolina Vargas')
  assert.equal(body.cedula_profesional, '52890123')
  assert.equal(body.consultorio_id, 10)
  assert.equal(body.activo, true)
})

test('POST /api/profesionales — valida que nombre_completo sea obligatorio (400)', async (t) => {
  const harness = await startAppWithPrisma(createProfesionalesMock())
  t.after(() => harness.close())

  const token10 = generateToken(1, 10, ROLES.DUENO)

  const { response, body } = await harness.request('/api/profesionales', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token10}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ cedula_profesional: '123' })
  })

  assert.equal(response.status, 400)
  assert.equal(body.error, 'El nombre completo del profesional es obligatorio')
})

// ─────────────────────────────────────────────────────────────
// 3. PUT /api/profesionales/:id/firma-default
// ─────────────────────────────────────────────────────────────

test('PUT /api/profesionales/:id/firma-default — actualiza la firma por defecto del profesional', async (t) => {
  const mock = createProfesionalesMock()
  const harness = await startAppWithPrisma(mock)
  t.after(() => harness.close())

  const token10 = generateToken(1, 10, ROLES.DUENO)
  const fakeFirma = 'data:image/png;base64,nuevafirma101=='

  const { response, body } = await harness.request('/api/profesionales/101/firma-default', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token10}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ firma_default: fakeFirma })
  })

  assert.equal(response.status, 200)
  assert.equal(body.id, 101)
  assert.equal(body.firma_default, fakeFirma)

  const dbProf = mock.__db.profesional.find(p => p.id === 101)
  assert.equal(dbProf.firma_default, fakeFirma)
})

test('PUT /api/profesionales/:id/firma-default — aislamiento cross-tenant (retorna 404 al intentar modificar profesional de otro consultorio)', async (t) => {
  const mock = createProfesionalesMock()
  const harness = await startAppWithPrisma(mock)
  t.after(() => harness.close())

  const token10 = generateToken(1, 10, ROLES.DUENO)

  const { response, body } = await harness.request('/api/profesionales/991/firma-default', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token10}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ firma_default: 'data:image/png;base64,hack' })
  })

  assert.equal(response.status, 404)
  assert.equal(body.error, 'Profesional no encontrado')
})

// ─────────────────────────────────────────────────────────────
// 4. PUT /api/profesionales/:id (Edición & Soft-Delete)
// ─────────────────────────────────────────────────────────────

test('PUT /api/profesionales/:id — edita datos del profesional correctamente', async (t) => {
  const mock = createProfesionalesMock()
  const harness = await startAppWithPrisma(mock)
  t.after(() => harness.close())

  const token10 = generateToken(1, 10, ROLES.DUENO)

  const { response, body } = await harness.request('/api/profesionales/102', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token10}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      nombre_completo: 'Dr. Felipe Torres A.',
      cedula_profesional: '7741234-X'
    })
  })

  assert.equal(response.status, 200)
  assert.equal(body.nombre_completo, 'Dr. Felipe Torres A.')
  assert.equal(body.cedula_profesional, '7741234-X')
})

test('PUT /api/profesionales/:id — desactivación soft-delete (activo: false)', async (t) => {
  const mock = createProfesionalesMock()
  const harness = await startAppWithPrisma(mock)
  t.after(() => harness.close())

  const token10 = generateToken(1, 10, ROLES.DUENO)

  // Desactivar profesional 102
  const { response, body } = await harness.request('/api/profesionales/102', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token10}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ activo: false })
  })

  assert.equal(response.status, 200)
  assert.equal(body.activo, false)

  // Confirmar que GET /api/profesionales ya no lo lista
  const getRes = await harness.request('/api/profesionales', {
    headers: { Authorization: `Bearer ${token10}` }
  })
  assert.equal(getRes.response.status, 200)
  const ids = getRes.body.map(p => p.id)
  assert.equal(ids.includes(102), false)
  assert.equal(ids.includes(101), true)
})
