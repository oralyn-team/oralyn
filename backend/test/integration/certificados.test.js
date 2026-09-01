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

function createCertificadosMock() {
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
    certificadoDental: [
      {
        id: 401,
        consultorio_id: 10,
        paciente_id: 5,
        tipo_cita_texto: 'Consulta General',
        fecha_expedicion: new Date('2026-08-01T10:00:00Z'),
        ciudad: 'Bogotá',
        anulado: false
      }
    ]
  })
}

// ─────────────────────────────────────────────────────────────
// 1. POST /api/certificados
// ─────────────────────────────────────────────────────────────

test('POST /api/certificados — creación correcta', async (t) => {
  const prismaMock = createCertificadosMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    paciente_id: 5,
    tipo_cita_texto: 'Tratamiento conducto',
    fecha_expedicion: '2026-08-12T10:30:00Z',
    ciudad: 'Villavicencio'
  }

  const { response, body } = await harness.request('/api/certificados', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 201)
  assert.equal(body.tipo_cita_texto, 'Tratamiento conducto')
  assert.equal(body.consultorio_id, 10)

  const dbCert = prismaMock.__db.certificadoDental.find(c => c.id === body.id)
  assert.ok(dbCert)
  assert.equal(dbCert.tipo_cita_texto, 'Tratamiento conducto')
})

test('POST /api/certificados — campos obligatorios faltantes retorna 400', async (t) => {
  const harness = await startAppWithPrisma(createCertificadosMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    paciente_id: 5
    // falta tipo_cita_texto y fecha_expedicion
  }

  const { response, body } = await harness.request('/api/certificados', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 400)
  assert.equal(body.error, 'Paciente, tipo de cita y fecha son obligatorios')
})

// ─────────────────────────────────────────────────────────────
// 2. GET /api/certificados/paciente/:pacienteId
// ─────────────────────────────────────────────────────────────

test('GET /api/certificados/paciente/:pacienteId — obtiene listado correcto', async (t) => {
  const harness = await startAppWithPrisma(createCertificadosMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response, body } = await harness.request('/api/certificados/paciente/5', {
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 200)
  assert.ok(Array.isArray(body))
  assert.equal(body.length, 1)
  assert.equal(body[0].id, 401)
})

// ─────────────────────────────────────────────────────────────
// 3. PATCH /api/certificados/:id/anular
// ─────────────────────────────────────────────────────────────

test('PATCH /api/certificados/:id/anular — anulación correcta', async (t) => {
  const prismaMock = createCertificadosMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = { motivo_anulacion: 'Error ortográfico' }

  const { response, body } = await harness.request('/api/certificados/401/anular', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 200)
  assert.equal(body.anulado, true)
  assert.equal(body.motivo_anulacion, 'Error ortográfico')
  assert.ok(body.anulado_en)

  const dbCert = prismaMock.__db.certificadoDental.find(c => c.id === 401)
  assert.equal(dbCert.anulado, true)
})

test('PATCH /api/certificados/:id/anular — falta motivo retorna 400', async (t) => {
  const harness = await startAppWithPrisma(createCertificadosMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {} // Sin motivo

  const { response, body } = await harness.request('/api/certificados/401/anular', {
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
// 4. DELETE /api/certificados/:id
// ─────────────────────────────────────────────────────────────

test('DELETE /api/certificados/:id — eliminación correcta', async (t) => {
  const prismaMock = createCertificadosMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response } = await harness.request('/api/certificados/401', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 204)
  assert.equal(prismaMock.__db.certificadoDental.filter(c => c.id === 401).length, 0)
})

test('DELETE /api/certificados/:id — inexistente retorna 404', async (t) => {
  const harness = await startAppWithPrisma(createCertificadosMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response } = await harness.request('/api/certificados/999', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 404)
})

// ─────────────────────────────────────────────────────────────
// 5. GET /api/certificados/:id/pdf
// ─────────────────────────────────────────────────────────────

test('PDF: Generación correcta de PDF de certificado dental', async (t) => {
  const harness = await startAppWithPrisma(createCertificadosMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response, body } = await harness.request('/api/certificados/401/pdf', {
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'application/pdf')
  assert.ok(response.headers.get('content-disposition').includes('inline; filename=certificado-401.pdf'))

  const buffer = Buffer.from(body)
  assert.ok(buffer.toString('utf-8', 0, 4).startsWith('%PDF'))
})

// ─────────────────────────────────────────────────────────────
// 6. Seguridad Cross-Tenant (Sprint 6D)
// ─────────────────────────────────────────────────────────────

function createCertificadosSecurityMock() {
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
    certificadoDental: [
      {
        id: 401,
        consultorio_id: 10,
        paciente_id: 5,
        tipo_cita_texto: 'Consulta General',
        fecha_expedicion: new Date('2026-08-01T10:00:00Z'),
        ciudad: 'Bogotá',
        anulado: false
      }
    ]
  })
}

test('Aislamiento: POST /api/certificados — no permite crear certificado para paciente de otro consultorio (BUG DE SEGURIDAD)', async (t) => {
  const harness = await startAppWithPrisma(createCertificadosSecurityMock())
  t.after(() => harness.close())

  const tokenB = generateToken(2, 99) // Usuario del consultorio 99
  const payload = {
    paciente_id: 5, // Paciente del consultorio 10
    tipo_cita_texto: 'Tratamiento conducto',
    fecha_expedicion: '2026-08-12T10:30:00Z'
  }

  const { response } = await harness.request('/api/certificados', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenB}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 403) // Esperado: 403 o 404. Obtenido: 201 (Vulnerabilidad).
})

test('Aislamiento: GET /api/certificados/paciente/:pacienteId — no permite listar certificados de paciente de otro consultorio (BUG DE SEGURIDAD)', async (t) => {
  const harness = await startAppWithPrisma(createCertificadosSecurityMock())
  t.after(() => harness.close())

  const tokenB = generateToken(2, 99) // Usuario del consultorio 99

  const { response, body } = await harness.request('/api/certificados/paciente/5', { // Paciente del consultorio 10
    headers: { Authorization: `Bearer ${tokenB}` }
  })

  // Debería ser 403 o retornar lista vacía filtrando por consultorio, pero en prod retorna el certificado
  assert.equal(response.status, 200)
  assert.ok(Array.isArray(body))
  assert.equal(body.length, 0) // Esperado: 0. Obtenido: 1 (Vulnerabilidad).
})

test('Aislamiento: PATCH /api/certificados/:id/anular — no permite anular certificado de otro consultorio (BUG DE SEGURIDAD)', async (t) => {
  const harness = await startAppWithPrisma(createCertificadosSecurityMock())
  t.after(() => harness.close())

  const tokenB = generateToken(2, 99) // Usuario del consultorio 99
  const payload = { motivo_anulacion: 'Hacked' }

  const { response } = await harness.request('/api/certificados/401/anular', { // Certificado del consultorio 10
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${tokenB}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 403) // Esperado: 403 o 404. Obtenido: 200 (Vulnerabilidad).
})

test('Aislamiento: DELETE /api/certificados/:id — no permite eliminar certificado de otro consultorio (BUG DE SEGURIDAD)', async (t) => {
  const harness = await startAppWithPrisma(createCertificadosSecurityMock())
  t.after(() => harness.close())

  const tokenB = generateToken(2, 99) // Usuario del consultorio 99

  const { response } = await harness.request('/api/certificados/401', { // Certificado del consultorio 10
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenB}` }
  })

  assert.equal(response.status, 403) // Esperado: 403 o 404. Obtenido: 204 (Vulnerabilidad).
})

test('Aislamiento: GET /api/certificados/:id/pdf — no permite descargar PDF de certificado de otro consultorio (BUG DE SEGURIDAD)', async (t) => {
  const harness = await startAppWithPrisma(createCertificadosSecurityMock())
  t.after(() => harness.close())

  const tokenB = generateToken(2, 99) // Usuario del consultorio 99

  const { response } = await harness.request('/api/certificados/401/pdf', { // Certificado del consultorio 10
    headers: { Authorization: `Bearer ${tokenB}` }
  })

  assert.equal(response.status, 403) // Esperado: 403 o 404. Obtenido: 200 (Vulnerabilidad).
})

