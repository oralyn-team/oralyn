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

function createPatientsPrismaMock() {
  return createUnifiedPrismaMock({
    configuracion: [
      { id: 10, nombre_consultorio: 'Consultorio A', nombre_profesional: 'Dr. A' }
    ],
    usuario: [
      { id: 1, consultorio_id: 10, email: 'doctor@oralyn.test', password_hash: 'hash', nombre: 'Dra. Test' }
    ],
    paciente: [
      {
        id: 1,
        consultorio_id: 10,
        primer_apellido: 'Perez',
        segundo_apellido: 'Gomez',
        nombres: 'Juan',
        tipo_documento: 'CC',
        numero_documento: '12345',
        fecha_nacimiento: new Date('1990-05-15'),
        sexo: 'masculino',
        municipio_ciudad: 'Villavicencio',
        telefono: '3001234567',
        correo: 'juan@test.com'
      },
      {
        id: 2,
        consultorio_id: 99, // Otro consultorio (para verificar aislamiento)
        primer_apellido: 'Rodriguez',
        segundo_apellido: 'Lopez',
        nombres: 'Maria',
        tipo_documento: 'CC',
        numero_documento: '54321',
        fecha_nacimiento: new Date('1995-10-20'),
        sexo: 'femenino',
        municipio_ciudad: 'Cali',
        telefono: '3007654321',
        correo: 'maria@test.com'
      }
    ],
    historiaClinica: [
      { id: 101, paciente_id: 1, motivo_consulta: 'Inicial', fecha_atencion: new Date() }
    ],
    cita: [
      { id: 201, paciente_id: 1, fecha_hora: new Date('2026-09-01T10:00:00Z'), estado: 'pendiente' }
    ],
    cotizacion: [
      { id: 301, paciente_id: 1, total: 500, saldo: 200, estado: 'activo' }
    ],
    pago: [
      { id: 401, paciente_id: 1, cotizacion_id: 301, monto: 300 }
    ]
  })
}

// ─────────────────────────────────────────────────────────────
// 1. POST /api/pacientes
// ─────────────────────────────────────────────────────────────

test('POST /api/pacientes — creación correcta', async (t) => {
  const prismaMock = createPatientsPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    primer_apellido: 'Gomez',
    nombres: 'Carlos',
    tipo_documento: 'CC',
    numero_documento: '99999',
    fecha_nacimiento: '1988-12-12',
    sexo: 'masculino',
    municipio_ciudad: 'Bogota'
  }

  const { response, body } = await harness.request('/api/pacientes', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 201)
  assert.equal(body.nombres, 'Carlos')
  assert.equal(body.numero_documento, '99999')
  assert.equal(body.consultorio_id, 10)

  // Verificar creación de historia clínica automática
  const hc = prismaMock.__db.historiaClinica.find(h => h.paciente_id === body.id)
  assert.ok(hc)
  assert.equal(hc.motivo_consulta, 'Valoración inicial')
})

test('POST /api/pacientes — campos obligatorios faltantes', async (t) => {
  const harness = await startAppWithPrisma(createPatientsPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  
  // Payload sin nombres
  const payload = {
    primer_apellido: 'Gomez',
    tipo_documento: 'CC',
    numero_documento: '99999',
    fecha_nacimiento: '1988-12-12',
    sexo: 'masculino',
    municipio_ciudad: 'Bogota'
  }

  const { response, body } = await harness.request('/api/pacientes', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 400)
  assert.equal(body.error, 'Faltan campos obligatorios')
})

test('POST /api/pacientes — documento duplicado', async (t) => {
  const harness = await startAppWithPrisma(createPatientsPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    primer_apellido: 'Perez',
    nombres: 'Juan Duplicado',
    tipo_documento: 'CC',
    numero_documento: '12345', // Duplicado de id: 1
    fecha_nacimiento: '1990-05-15',
    sexo: 'masculino',
    municipio_ciudad: 'Villavicencio'
  }

  const { response, body } = await harness.request('/api/pacientes', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 400)
  assert.equal(body.error, 'Ya existe un paciente con ese documento')
})

// ─────────────────────────────────────────────────────────────
// 2. GET /api/pacientes
// ─────────────────────────────────────────────────────────────

test('GET /api/pacientes — listado correcto', async (t) => {
  const harness = await startAppWithPrisma(createPatientsPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response, body } = await harness.request('/api/pacientes', {
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 200)
  assert.ok(Array.isArray(body))
  // Solo debe devolver el paciente con consultorio_id 10 (id: 1)
  assert.equal(body.length, 1)
  assert.equal(body[0].id, 1)
  assert.equal(body[0].primer_apellido, 'Perez')
  assert.equal(body[0].saldoPendiente, 200)
})

// ─────────────────────────────────────────────────────────────
// 3. GET /api/pacientes/:id
// ─────────────────────────────────────────────────────────────

test('GET /api/pacientes/:id — consulta correcta', async (t) => {
  const harness = await startAppWithPrisma(createPatientsPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response, body } = await harness.request('/api/pacientes/1', {
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 200)
  assert.equal(body.id, 1)
  assert.ok(Array.isArray(body.historias))
  assert.ok(Array.isArray(body.citas))
  assert.equal(body.historias[0].id, 101)
  assert.equal(body.citas[0].id, 201)
})

test('GET /api/pacientes/:id — paciente de otro consultorio da 404', async (t) => {
  const harness = await startAppWithPrisma(createPatientsPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response } = await harness.request('/api/pacientes/2', {
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 404)
})

// ─────────────────────────────────────────────────────────────
// 4. PUT /api/pacientes/:id
// ─────────────────────────────────────────────────────────────

test('PUT /api/pacientes/:id — modificación correcta', async (t) => {
  const prismaMock = createPatientsPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    nombres: 'Juan Modificado',
    telefono: '3999999999'
  }

  const { response, body } = await harness.request('/api/pacientes/1', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 200)
  assert.equal(body.nombres, 'Juan Modificado')
  assert.equal(body.telefono, '3999999999')

  // Verificar en la db
  const p = prismaMock.__db.paciente.find(p => p.id === 1)
  assert.equal(p.nombres, 'Juan Modificado')
  assert.equal(p.telefono, '3999999999')
})

test('PUT /api/pacientes/:id — paciente de otro consultorio da 404', async (t) => {
  const harness = await startAppWithPrisma(createPatientsPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    nombres: 'Trato de Modificar'
  }

  const { response } = await harness.request('/api/pacientes/2', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 404)
})

// ─────────────────────────────────────────────────────────────
// 5. DELETE /api/pacientes/:id
// ─────────────────────────────────────────────────────────────

test('DELETE /api/pacientes/:id — eliminación correcta', async (t) => {
  const prismaMock = createPatientsPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response, body } = await harness.request('/api/pacientes/1', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 200)
  assert.equal(body.message, 'Paciente eliminado correctamente')

  // Verificar que el paciente y todos sus registros relacionados fueron eliminados
  assert.equal(prismaMock.__db.paciente.filter(p => p.id === 1).length, 0)
  assert.equal(prismaMock.__db.historiaClinica.filter(h => h.paciente_id === 1).length, 0)
  assert.equal(prismaMock.__db.cita.filter(c => c.paciente_id === 1).length, 0)
  assert.equal(prismaMock.__db.cotizacion.filter(c => c.paciente_id === 1).length, 0)
  assert.equal(prismaMock.__db.pago.filter(p => p.paciente_id === 1).length, 0)
})

test('DELETE /api/pacientes/:id — paciente de otro consultorio da 404', async (t) => {
  const harness = await startAppWithPrisma(createPatientsPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response } = await harness.request('/api/pacientes/2', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 404)
})

// ─────────────────────────────────────────────────────────────
// 6. Pruebas de Aislamiento Cross-Tenant (Sprint 3C)
// ─────────────────────────────────────────────────────────────

test('Aislamiento: GET /api/pacientes — no lista pacientes de otros consultorios', async (t) => {
  const harness = await startAppWithPrisma(createPatientsPrismaMock())
  t.after(() => harness.close())

  const tokenA = generateToken(1, 10) // Usuario de Consultorio A

  const { response, body } = await harness.request('/api/pacientes', {
    headers: { Authorization: `Bearer ${tokenA}` }
  })

  assert.equal(response.status, 200)
  assert.ok(body.every(p => p.id !== 2)) // No debe incluir al Paciente B (id: 2, consultorio 99)
  assert.ok(body.some(p => p.id === 1))  // Debe incluir al Paciente A (id: 1, consultorio 10)
})

test('Aislamiento: GET /api/pacientes/:id — no permite consultar paciente de otro consultorio', async (t) => {
  const harness = await startAppWithPrisma(createPatientsPrismaMock())
  t.after(() => harness.close())

  const tokenA = generateToken(1, 10) // Usuario de Consultorio A

  const { response } = await harness.request('/api/pacientes/2', { // Paciente B (id: 2, consultorio 99)
    headers: { Authorization: `Bearer ${tokenA}` }
  })

  // Esperado por la seguridad de Oralyn: 404 si el paciente no pertenece al consultorio
  assert.equal(response.status, 404)
})

test('Aislamiento: PUT /api/pacientes/:id — no permite modificar paciente de otro consultorio', async (t) => {
  const harness = await startAppWithPrisma(createPatientsPrismaMock())
  t.after(() => harness.close())

  const tokenA = generateToken(1, 10) // Usuario de Consultorio A

  const { response } = await harness.request('/api/pacientes/2', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ nombres: 'Intento hackear' })
  })

  assert.equal(response.status, 404)
})

test('Aislamiento: DELETE /api/pacientes/:id — no permite eliminar paciente de otro consultorio', async (t) => {
  const harness = await startAppWithPrisma(createPatientsPrismaMock())
  t.after(() => harness.close())

  const tokenA = generateToken(1, 10) // Usuario de Consultorio A

  const { response } = await harness.request('/api/pacientes/2', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenA}` }
  })

  assert.equal(response.status, 404)
})

test('Aislamiento: GET /api/pacientes/buscar — no busca pacientes de otros consultorios', async (t) => {
  const harness = await startAppWithPrisma(createPatientsPrismaMock())
  t.after(() => harness.close())

  const tokenA = generateToken(1, 10) // Usuario de Consultorio A

  // Buscando "Rodriguez" (Paciente B - consultorio 99) con token de Consultorio A (10)
  const { response, body } = await harness.request('/api/pacientes/buscar?q=Rodriguez', {
    headers: { Authorization: `Bearer ${tokenA}` }
  })

  assert.equal(response.status, 200)
  assert.ok(Array.isArray(body))
  assert.equal(body.length, 0) // No debe encontrar ningún resultado de otros consultorios
})

// ─────────────────────────────────────────────────────────────
// 7. Pruebas de Validación de Entrada (Sprint 3)
// ─────────────────────────────────────────────────────────────

test('Validación: GET /api/pacientes/:id — id inválido (texto) retorna 404', async (t) => {
  const harness = await startAppWithPrisma(createPatientsPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response } = await harness.request('/api/pacientes/abc', {
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 404)
})

test('Validación: POST /api/pacientes — documento vacío retorna 400', async (t) => {
  const harness = await startAppWithPrisma(createPatientsPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    primer_apellido: 'Gomez',
    nombres: 'Carlos',
    tipo_documento: 'CC',
    numero_documento: '', // Vacío
    fecha_nacimiento: '1988-12-12',
    sexo: 'masculino',
    municipio_ciudad: 'Bogota'
  }

  const { response, body } = await harness.request('/api/pacientes', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 400)
  assert.equal(body.error, 'Faltan campos obligatorios')
})

test('Validación: POST /api/pacientes — documento con solo espacios retorna 400', async (t) => {
  const harness = await startAppWithPrisma(createPatientsPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    primer_apellido: 'Gomez',
    nombres: 'Carlos',
    tipo_documento: 'CC',
    numero_documento: '   ', // Solo espacios
    fecha_nacimiento: '1988-12-12',
    sexo: 'masculino',
    municipio_ciudad: 'Bogota'
  }

  const { response, body } = await harness.request('/api/pacientes', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  // Se documenta el comportamiento real del backend
  assert.equal(response.status, 400)
})

test('Validación: POST /api/pacientes — nombre vacío retorna 400', async (t) => {
  const harness = await startAppWithPrisma(createPatientsPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    primer_apellido: 'Gomez',
    nombres: '', // Vacío
    tipo_documento: 'CC',
    numero_documento: '99999',
    fecha_nacimiento: '1988-12-12',
    sexo: 'masculino',
    municipio_ciudad: 'Bogota'
  }

  const { response, body } = await harness.request('/api/pacientes', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 400)
  assert.equal(body.error, 'Faltan campos obligatorios')
})

test('Validación: POST /api/pacientes — tipo_documento inválido retorna 400', async (t) => {
  const harness = await startAppWithPrisma(createPatientsPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    primer_apellido: 'Gomez',
    nombres: 'Carlos',
    tipo_documento: 'TIPO_INVALIDO', // Inválido
    numero_documento: '99999',
    fecha_nacimiento: '1988-12-12',
    sexo: 'masculino',
    municipio_ciudad: 'Bogota'
  }

  const { response, body } = await harness.request('/api/pacientes', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  // Se documenta el comportamiento real del backend
  assert.equal(response.status, 400)
})

test('Validación: POST /api/pacientes — fecha inválida retorna 400', async (t) => {
  const harness = await startAppWithPrisma(createPatientsPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    primer_apellido: 'Gomez',
    nombres: 'Carlos',
    tipo_documento: 'CC',
    numero_documento: '99999',
    fecha_nacimiento: 'fecha-incorrecta', // Inválido
    sexo: 'masculino',
    municipio_ciudad: 'Bogota'
  }

  const { response, body } = await harness.request('/api/pacientes', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  // Se documenta el comportamiento real del backend
  assert.equal(response.status, 400)
})

test('Validación: POST /api/pacientes — JSON incorrecto retorna 400', async (t) => {
  const harness = await startAppWithPrisma(createPatientsPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response } = await harness.request('/api/pacientes', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: '{"primer_apellido": "Gomez", nombres: ' // JSON malformado
  })

  // El parser de body de express debería rechazarlo con 400
  assert.equal(response.status, 400)
})


