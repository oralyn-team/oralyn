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

function createConsentimientosMock() {
  return createUnifiedPrismaMock({
    configuracion: [
      { id: 10, nombre_consultorio: 'Consultorio A', nombre_profesional: 'Dr. A' }
    ],
    usuario: [
      { id: 1, consultorio_id: 10, email: 'doctor@oralyn.test', password_hash: 'hash', nombre: 'Dra. Test' }
    ],
    paciente: [
      {
        id: 5,
        consultorio_id: 10,
        primer_apellido: 'Gomez',
        nombres: 'Carlos',
        tipo_documento: 'CC',
        numero_documento: '99999',
        fecha_nacimiento: new Date('1985-04-12'),
        sexo: 'masculino',
        municipio_ciudad: 'Bogotá'
      }
    ],
    consentimiento: [
      {
        id: 301,
        consultorio_id: 10,
        paciente_id: 5,
        tipo: 'anestesia',
        ciudad: 'Bogotá',
        fecha: new Date('2026-08-01T10:00:00Z'),
        anulado: false
      }
    ]
  })
}

// ─────────────────────────────────────────────────────────────
// 1. POST /api/consentimientos
// ─────────────────────────────────────────────────────────────

test('POST /api/consentimientos — creación correcta', async (t) => {
  const prismaMock = createConsentimientosMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    paciente_id: 5,
    tipo: 'cirugia_oral',
    ciudad: 'Villavicencio',
    nombre_paciente_declarado: 'Carlos Gomez',
    cc_paciente_declarado: '99999'
  }

  const { response, body } = await harness.request('/api/consentimientos', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 201)
  assert.equal(body.tipo, 'cirugia_oral')
  assert.equal(body.consultorio_id, 10)

  const dbConsent = prismaMock.__db.consentimiento.find(c => c.id === body.id)
  assert.ok(dbConsent)
  assert.equal(dbConsent.tipo, 'cirugia_oral')
})

test('POST /api/consentimientos — tipo inválido retorna 400', async (t) => {
  const harness = await startAppWithPrisma(createConsentimientosMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    paciente_id: 5,
    tipo: 'invalido' // no permitido en la lista
  }

  const { response, body } = await harness.request('/api/consentimientos', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 400)
  assert.equal(body.error, 'Tipo no válido')
})

test('POST /api/consentimientos — campos obligatorios faltantes retorna 400', async (t) => {
  const harness = await startAppWithPrisma(createConsentimientosMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    paciente_id: 5
    // falta tipo
  }

  const { response, body } = await harness.request('/api/consentimientos', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 400)
  assert.equal(body.error, 'Paciente y tipo de consentimiento son obligatorios')
})

test('POST /api/consentimientos — paciente inexistente retorna 404', async (t) => {
  const harness = await startAppWithPrisma(createConsentimientosMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    paciente_id: 999, // Inexistente
    tipo: 'anestesia'
  }

  const { response } = await harness.request('/api/consentimientos', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 404)
})

// ─────────────────────────────────────────────────────────────
// 2. GET /api/consentimientos/paciente/:pacienteId
// ─────────────────────────────────────────────────────────────

test('GET /api/consentimientos/paciente/:pacienteId — obtiene listado correcto', async (t) => {
  const harness = await startAppWithPrisma(createConsentimientosMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response, body } = await harness.request('/api/consentimientos/paciente/5', {
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 200)
  assert.ok(Array.isArray(body))
  assert.equal(body.length, 1)
  assert.equal(body[0].id, 301)
})

// ─────────────────────────────────────────────────────────────
// 3. GET /api/consentimientos/:id
// ─────────────────────────────────────────────────────────────

test('GET /api/consentimientos/:id — consulta de detalle correcta con paciente incluido', async (t) => {
  const harness = await startAppWithPrisma(createConsentimientosMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response, body } = await harness.request('/api/consentimientos/301', {
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 200)
  assert.equal(body.id, 301)
  assert.equal(body.tipo, 'anestesia')
  assert.ok(body.paciente)
  assert.equal(body.paciente.nombres, 'Carlos')
})

test('GET /api/consentimientos/:id — inexistente retorna 404', async (t) => {
  const harness = await startAppWithPrisma(createConsentimientosMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response } = await harness.request('/api/consentimientos/999', {
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 404)
})

// ─────────────────────────────────────────────────────────────
// 4. PATCH /api/consentimientos/:id/firmas
// ─────────────────────────────────────────────────────────────

test('PATCH /api/consentimientos/:id/firmas — actualización correcta de firmas', async (t) => {
  const prismaMock = createConsentimientosMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    firma_paciente: 'data:image/png;base64,paciente',
    firma_doctor: 'data:image/png;base64,doctor',
    cc_profesional: 'TP12345'
  }

  const { response, body } = await harness.request('/api/consentimientos/301/firmas', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 200)
  assert.equal(body.firma_paciente, 'data:image/png;base64,paciente')
  assert.equal(body.firma_doctor, 'data:image/png;base64,doctor')
  assert.equal(body.cc_profesional, 'TP12345')

  const dbConsent = prismaMock.__db.consentimiento.find(c => c.id === 301)
  assert.equal(dbConsent.cc_profesional, 'TP12345')
  assert.ok(dbConsent.pdf_generado_en)
})

test('PATCH /api/consentimientos/:id/firmas — inexistente retorna 404', async (t) => {
  const harness = await startAppWithPrisma(createConsentimientosMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = { cc_profesional: 'TP123' }

  const { response } = await harness.request('/api/consentimientos/999/firmas', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 404)
})

// ─────────────────────────────────────────────────────────────
// 5. PATCH /api/consentimientos/:id/anular
// ─────────────────────────────────────────────────────────────

test('PATCH /api/consentimientos/:id/anular — anulación correcta', async (t) => {
  const prismaMock = createConsentimientosMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = { motivo_anulacion: 'Error en datos' }

  const { response, body } = await harness.request('/api/consentimientos/301/anular', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 200)
  assert.equal(body.anulado, true)
  assert.equal(body.motivo_anulacion, 'Error en datos')
  assert.ok(body.anulado_en)

  const dbConsent = prismaMock.__db.consentimiento.find(c => c.id === 301)
  assert.equal(dbConsent.anulado, true)
})

test('PATCH /api/consentimientos/:id/anular — falta motivo retorna 400', async (t) => {
  const harness = await startAppWithPrisma(createConsentimientosMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {} // Sin motivo

  const { response, body } = await harness.request('/api/consentimientos/301/anular', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 400)
  assert.equal(body.error, 'El motivo de anulación es obligatorio')
})

// ─────────────────────────────────────────────────────────────
// 6. DELETE /api/consentimientos/:id
// ─────────────────────────────────────────────────────────────

test('DELETE /api/consentimientos/:id — eliminación correcta', async (t) => {
  const prismaMock = createConsentimientosMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response } = await harness.request('/api/consentimientos/301', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 204)
  assert.equal(prismaMock.__db.consentimiento.filter(c => c.id === 301).length, 0)
})

test('DELETE /api/consentimientos/:id — inexistente retorna 404', async (t) => {
  const harness = await startAppWithPrisma(createConsentimientosMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response } = await harness.request('/api/consentimientos/999', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 404)
})

// ─────────────────────────────────────────────────────────────
// 7. GET /api/consentimientos/:id/pdf
// ─────────────────────────────────────────────────────────────

test('PDF: Generación correcta de PDF de consentimiento informado', async (t) => {
  const harness = await startAppWithPrisma(createConsentimientosMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response, body } = await harness.request('/api/consentimientos/301/pdf', {
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'application/pdf')
  assert.ok(response.headers.get('content-disposition').includes('inline; filename=consentimiento-301.pdf'))

  const buffer = Buffer.from(body)
  assert.ok(buffer.toString('utf-8', 0, 4).startsWith('%PDF'))
})

// ─────────────────────────────────────────────────────────────
// 8. Seguridad Cross-Tenant (Sprint 6D)
// ─────────────────────────────────────────────────────────────

function createConsentimientosSecurityMock() {
  return createUnifiedPrismaMock({
    configuracion: [
      { id: 10, nombre_consultorio: 'Consultorio A', nombre_profesional: 'Dr. A' },
      { id: 99, nombre_consultorio: 'Consultorio B', nombre_profesional: 'Dr. B' }
    ],
    usuario: [
      { id: 1, consultorio_id: 10, email: 'doctorA@oralyn.test', password_hash: 'hash', nombre: 'Dra. A' },
      { id: 2, consultorio_id: 99, email: 'doctorB@oralyn.test', password_hash: 'hash', nombre: 'Dr. B' }
    ],
    paciente: [
      { id: 5, consultorio_id: 10, primer_apellido: 'Gomez', nombres: 'Carlos', tipo_documento: 'CC', numero_documento: '99999' },
      { id: 6, consultorio_id: 99, primer_apellido: 'Ramirez', nombres: 'Ana', tipo_documento: 'CC', numero_documento: '88888' }
    ],
    consentimiento: [
      {
        id: 301,
        consultorio_id: 10,
        paciente_id: 5,
        tipo: 'anestesia',
        ciudad: 'Bogotá',
        fecha: new Date('2026-08-01T10:00:00Z'),
        anulado: false
      }
    ]
  })
}

test('Aislamiento: GET /api/consentimientos/paciente/:pacienteId — no permite listar consentimientos de paciente de otro consultorio', async (t) => {
  const harness = await startAppWithPrisma(createConsentimientosSecurityMock())
  t.after(() => harness.close())

  const tokenB = generateToken(2, 99) // Usuario del consultorio 99

  const { response, body } = await harness.request('/api/consentimientos/paciente/5', { // Paciente de consultorio 10
    headers: { Authorization: `Bearer ${tokenB}` }
  })

  assert.equal(response.status, 200)
  assert.ok(Array.isArray(body))
  assert.equal(body.length, 0)
})

test('Aislamiento: GET /api/consentimientos/:id — no permite consultar consentimiento de otro consultorio', async (t) => {
  const harness = await startAppWithPrisma(createConsentimientosSecurityMock())
  t.after(() => harness.close())

  const tokenB = generateToken(2, 99) // Usuario del consultorio 99

  const { response } = await harness.request('/api/consentimientos/301', { // Consentimiento de consultorio 10
    headers: { Authorization: `Bearer ${tokenB}` }
  })

  assert.equal(response.status, 404)
})

test('Aislamiento: PATCH /api/consentimientos/:id/firmas — no permite firmar consentimiento de otro consultorio', async (t) => {
  const harness = await startAppWithPrisma(createConsentimientosSecurityMock())
  t.after(() => harness.close())

  const tokenB = generateToken(2, 99) // Usuario del consultorio 99
  const payload = { cc_profesional: 'TP99999' }

  const { response } = await harness.request('/api/consentimientos/301/firmas', { // Consentimiento de consultorio 10
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${tokenB}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 404)
})

test('Aislamiento: GET /api/consentimientos/:id/pdf — no permite descargar PDF de consentimiento de otro consultorio', async (t) => {
  const harness = await startAppWithPrisma(createConsentimientosSecurityMock())
  t.after(() => harness.close())

  const tokenB = generateToken(2, 99) // Usuario del consultorio 99

  const { response } = await harness.request('/api/consentimientos/301/pdf', { // Consentimiento de consultorio 10
    headers: { Authorization: `Bearer ${tokenB}` }
  })

  assert.equal(response.status, 404)
})

test('Aislamiento: PATCH /api/consentimientos/:id/anular — no permite anular consentimiento de otro consultorio (BUG DE SEGURIDAD)', async (t) => {
  const harness = await startAppWithPrisma(createConsentimientosSecurityMock())
  t.after(() => harness.close())

  const tokenB = generateToken(2, 99) // Usuario del consultorio 99
  const payload = { motivo_anulacion: 'Hacked' }

  const { response } = await harness.request('/api/consentimientos/301/anular', { // Consentimiento de consultorio 10
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${tokenB}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 403) // Esperado: 403 o 404. Obtenido: 200 (Vulnerabilidad).
})

test('Aislamiento: DELETE /api/consentimientos/:id — no permite eliminar consentimiento de otro consultorio (BUG DE SEGURIDAD)', async (t) => {
  const harness = await startAppWithPrisma(createConsentimientosSecurityMock())
  t.after(() => harness.close())

  const tokenB = generateToken(2, 99) // Usuario del consultorio 99

  const { response } = await harness.request('/api/consentimientos/301', { // Consentimiento de consultorio 10
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenB}` }
  })

  assert.equal(response.status, 403) // Esperado: 403 o 404. Obtenido: 204 (Vulnerabilidad).
})

