const test = require('node:test')
const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')

const { startAppWithPrisma } = require('../helpers/appHarness')
const { createPDFPrismaMock } = require('../helpers/mockPrisma')

process.env.JWT_SECRET = 'integration-test-secret'
process.env.ADMIN_SECRET = 'admin-test-secret'
process.env.NODE_ENV = 'test'

function token(consultorioId = 10) {
  return jwt.sign({
    id: 1,
    consultorio_id: consultorioId,
    email: 'doctor@oralyn.test',
    nombre: 'Dra. Test'
  }, process.env.JWT_SECRET)
}

function authHeaders(consultorioId = 10) {
  return { Authorization: `Bearer ${token(consultorioId)}` }
}

function isPDFBuffer(buffer) {
  if (!Buffer.isBuffer(buffer)) return false
  // Magic number check for PDF: %PDF-
  return buffer.toString('utf8', 0, 5) === '%PDF-'
}

// ─────────────────────────────────────────────────────────────
// 1. Pruebas de Permisos y Cabeceras Generales
// ─────────────────────────────────────────────────────────────

test('PDF: Rechaza solicitudes sin token', async (t) => {
  const harness = await startAppWithPrisma(createPDFPrismaMock())
  t.after(() => harness.close())

  const { response, body } = await harness.request('/api/pdf/paciente/1')

  assert.equal(response.status, 401)
  assert.equal(body.error, 'Token requerido')
})

test('PDF: Rechaza solicitudes con token inválido', async (t) => {
  const harness = await startAppWithPrisma(createPDFPrismaMock())
  t.after(() => harness.close())

  const { response, body } = await harness.request('/api/pdf/paciente/1', {
    headers: { Authorization: 'Bearer token-falso' }
  })

  assert.equal(response.status, 403)
  assert.equal(body.error, 'Token inválido o expirado')
})

// ─────────────────────────────────────────────────────────────
// 2. Pruebas del Generador de Ficha de Paciente
// ─────────────────────────────────────────────────────────────

test('PDF Paciente: Genera PDF correctamente con cabeceras y estructura válidas', async (t) => {
  const harness = await startAppWithPrisma(createPDFPrismaMock())
  t.after(() => harness.close())

  const { response, body } = await harness.request('/api/pdf/paciente/1', {
    headers: authHeaders(10)
  })

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'application/pdf')
  assert.match(response.headers.get('content-disposition'), /inline; filename=paciente-1.pdf/)
  
  const buffer = Buffer.from(body)
  assert.ok(isPDFBuffer(buffer), 'El cuerpo devuelto debe ser un archivo PDF válido')
  assert.ok(buffer.length > 1000, 'El tamaño del PDF debe ser razonable')
})

test('PDF Paciente: Retorna 404 si el paciente no existe', async (t) => {
  const harness = await startAppWithPrisma(createPDFPrismaMock())
  t.after(() => harness.close())

  const { response, body } = await harness.request('/api/pdf/paciente/999', {
    headers: authHeaders(10)
  })

  assert.equal(response.status, 404)
  assert.equal(body.error, 'Paciente no encontrado')
})

test('PDF Paciente: Retorna 404 si el paciente pertenece a otro consultorio (Permisos)', async (t) => {
  const harness = await startAppWithPrisma(createPDFPrismaMock())
  t.after(() => harness.close())

  // Paciente 2 pertenece al consultorio 99, pero el token es para el consultorio 10
  const { response, body } = await harness.request('/api/pdf/paciente/2', {
    headers: authHeaders(10)
  })

  assert.equal(response.status, 404)
  assert.equal(body.error, 'Paciente no encontrado')
})

// ─────────────────────────────────────────────────────────────
// 3. Pruebas del Generador de Historia Clínica
// ─────────────────────────────────────────────────────────────

test('PDF Historia Clínica: Genera PDF con odontograma y datos correctamente', async (t) => {
  const harness = await startAppWithPrisma(createPDFPrismaMock())
  t.after(() => harness.close())

  const { response, body } = await harness.request('/api/pdf/historia/100', {
    headers: authHeaders(10)
  })

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'application/pdf')
  assert.match(response.headers.get('content-disposition'), /inline; filename=historia-100.pdf/)
  
  const buffer = Buffer.from(body)
  assert.ok(isPDFBuffer(buffer))
})

test('PDF Historia Clínica: Retorna 404 si la historia clínica no existe', async (t) => {
  const harness = await startAppWithPrisma(createPDFPrismaMock())
  t.after(() => harness.close())

  const { response, body } = await harness.request('/api/pdf/historia/999', {
    headers: authHeaders(10)
  })

  assert.equal(response.status, 404)
  assert.equal(body.error, 'Historia no encontrada')
})

test('PDF Historia Clínica: Retorna 403 si la historia clínica pertenece a otro consultorio', async (t) => {
  const harness = await startAppWithPrisma(createPDFPrismaMock())
  t.after(() => harness.close())

  // Historia 200 pertenece a un paciente del consultorio 99, pero el token es del consultorio 10
  const { response, body } = await harness.request('/api/pdf/historia/200', {
    headers: authHeaders(10)
  })

  assert.equal(response.status, 403)
  assert.equal(body.error, 'No autorizado')
})

// ─────────────────────────────────────────────────────────────
// 4. Pruebas del Generador de Cotizaciones
// ─────────────────────────────────────────────────────────────

test('PDF Cotización: Genera PDF correctamente', async (t) => {
  const harness = await startAppWithPrisma(createPDFPrismaMock())
  t.after(() => harness.close())

  const { response, body } = await harness.request('/api/pdf/cotizacion/150', {
    headers: authHeaders(10)
  })

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'application/pdf')
  assert.match(response.headers.get('content-disposition'), /inline; filename=cotizacion-150.pdf/)
  
  const buffer = Buffer.from(body)
  assert.ok(isPDFBuffer(buffer))
})

test('PDF Cotización: Retorna 404 si la cotización no existe', async (t) => {
  const harness = await startAppWithPrisma(createPDFPrismaMock())
  t.after(() => harness.close())

  const { response, body } = await harness.request('/api/pdf/cotizacion/999', {
    headers: authHeaders(10)
  })

  assert.equal(response.status, 404)
  assert.equal(body.error, 'Cotización no encontrada')
})

// ─────────────────────────────────────────────────────────────
// 5. Pruebas del Generador de Certificados Dentales
// ─────────────────────────────────────────────────────────────

test('PDF Certificado: Genera PDF correctamente', async (t) => {
  const harness = await startAppWithPrisma(createPDFPrismaMock())
  t.after(() => harness.close())

  const { response, body } = await harness.request('/api/pdf/certificado/250', {
    headers: authHeaders(10)
  })

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'application/pdf')
  assert.match(response.headers.get('content-disposition'), /inline; filename=certificado-250.pdf/)
  
  const buffer = Buffer.from(body)
  assert.ok(isPDFBuffer(buffer))
})

test('PDF Certificado: Retorna 404 si el certificado no existe', async (t) => {
  const harness = await startAppWithPrisma(createPDFPrismaMock())
  t.after(() => harness.close())

  const { response, body } = await harness.request('/api/pdf/certificado/999', {
    headers: authHeaders(10)
  })

  assert.equal(response.status, 404)
  assert.equal(body.error, 'Certificado no encontrado')
})

// ─────────────────────────────────────────────────────────────
// 6. Pruebas del Generador de Recomendaciones
// ─────────────────────────────────────────────────────────────

test('PDF Recomendaciones: Genera PDF correctamente', async (t) => {
  const harness = await startAppWithPrisma(createPDFPrismaMock())
  t.after(() => harness.close())

  const { response, body } = await harness.request('/api/pdf/recomendaciones', {
    headers: authHeaders(10)
  })

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'application/pdf')
  assert.match(response.headers.get('content-disposition'), /inline; filename=recomendaciones-postqx.pdf/)
  
  const buffer = Buffer.from(body)
  assert.ok(isPDFBuffer(buffer))
})

// ─────────────────────────────────────────────────────────────
// 7. Pruebas del Generador de Consentimientos
// ─────────────────────────────────────────────────────────────

test('PDF Consentimiento: Genera PDF correctamente', async (t) => {
  const harness = await startAppWithPrisma(createPDFPrismaMock())
  t.after(() => harness.close())

  const { response, body } = await harness.request('/api/pdf/consentimiento/350', {
    headers: authHeaders(10)
  })

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'application/pdf')
  assert.match(response.headers.get('content-disposition'), /inline; filename=consentimiento-anestesia-350.pdf/)
  
  const buffer = Buffer.from(body)
  assert.ok(isPDFBuffer(buffer))
})

test('PDF Consentimiento: Retorna 404 si el consentimiento no existe', async (t) => {
  const harness = await startAppWithPrisma(createPDFPrismaMock())
  t.after(() => harness.close())

  const { response, body } = await harness.request('/api/pdf/consentimiento/999', {
    headers: authHeaders(10)
  })

  assert.equal(response.status, 404)
  assert.equal(body.error, 'Consentimiento no encontrado')
})

// ─────────────────────────────────────────────────────────────
// 8. Pruebas de Resiliencia: Logos Inexistentes e Imágenes Faltantes
// ─────────────────────────────────────────────────────────────

test('PDF Resiliencia: Genera PDF correctamente sin logo_url (Logo Inexistente)', async (t) => {
  const mockPrisma = createPDFPrismaMock()
  // Establecer logo_url a null para el consultorio 10
  mockPrisma.configuracion.findUnique = async () => ({
    id: 10,
    nombre_consultorio: 'Clínica A',
    nombre_profesional: 'Dr. A',
    logo_url: null
  })

  const harness = await startAppWithPrisma(mockPrisma)
  t.after(() => harness.close())

  const { response, body } = await harness.request('/api/pdf/recomendaciones', {
    headers: authHeaders(10)
  })

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'application/pdf')
  const buffer = Buffer.from(body)
  assert.ok(isPDFBuffer(buffer), 'Debe generar el PDF aunque no haya logo_url')
})

test('PDF Resiliencia: Genera PDF correctamente con una imagen base64 corrupta / rota', async (t) => {
  // El consultorio 99 en nuestro mock tiene un logo_url base64 inválido
  const harness = await startAppWithPrisma(createPDFPrismaMock())
  t.after(() => harness.close())

  const { response, body } = await harness.request('/api/pdf/recomendaciones', {
    headers: authHeaders(99)
  })

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'application/pdf')
  const buffer = Buffer.from(body)
  assert.ok(isPDFBuffer(buffer), 'Debe generar el PDF sin caerse si la imagen base64 es inválida')
})

// ─────────────────────────────────────────────────────────────
// 9. Pruebas de Firma Default del Doctor y Trazabilidad (Origen)
// ─────────────────────────────────────────────────────────────

test('PDF Firma Doctor: Aplica firma_doctor_default si el documento no tiene firma_doctor propia (origen: default)', async (t) => {
  const mockPrisma = createPDFPrismaMock()
  const base64Default = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

  // Config con firma_doctor_default
  mockPrisma.configuracion.findUnique = async () => ({
    id: 10,
    nombre_consultorio: 'Clínica A',
    nombre_profesional: 'Dr. A',
    firma_doctor_default: base64Default
  })

  // Consentimiento sin firma_doctor propia
  mockPrisma.consentimiento.findFirst = async () => ({
    id: 350,
    consultorio_id: 10,
    paciente_id: 1,
    tipo: 'anestesia',
    fecha: new Date(),
    ciudad: 'Villavicencio',
    firma_doctor: null,
    paciente: { nombres: 'Juan', primer_apellido: 'Pérez', numero_documento: '123' }
  })

  const harness = await startAppWithPrisma(mockPrisma)
  t.after(() => harness.close())

  const { response, body } = await harness.request('/api/pdf/consentimiento/350', {
    headers: authHeaders(10)
  })

  assert.equal(response.status, 200)
  const buffer = Buffer.from(body)
  assert.ok(isPDFBuffer(buffer))
})

test('PDF Firma Doctor: Prioriza firma_doctor capturada sobre firma_doctor_default (origen: capturada)', async (t) => {
  const mockPrisma = createPDFPrismaMock()
  const base64Capturada = 'data:image/png;base64,CAPTURED_DOCTOR_SIGNATURE'
  const base64Default = 'data:image/png;base64,DEFAULT_DOCTOR_SIGNATURE'

  mockPrisma.configuracion.findUnique = async () => ({
    id: 10,
    nombre_consultorio: 'Clínica A',
    nombre_profesional: 'Dr. A',
    firma_doctor_default: base64Default
  })

  mockPrisma.consentimiento.findFirst = async () => ({
    id: 350,
    consultorio_id: 10,
    paciente_id: 1,
    tipo: 'anestesia',
    fecha: new Date(),
    ciudad: 'Villavicencio',
    firma_doctor: base64Capturada,
    paciente: { nombres: 'Juan', primer_apellido: 'Pérez', numero_documento: '123' }
  })

  const harness = await startAppWithPrisma(mockPrisma)
  t.after(() => harness.close())

  const { response, body } = await harness.request('/api/pdf/consentimiento/350', {
    headers: authHeaders(10)
  })

  assert.equal(response.status, 200)
  const buffer = Buffer.from(body)
  assert.ok(isPDFBuffer(buffer))
})

