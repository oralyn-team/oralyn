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

function createCitasPrismaMock() {
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
    cita: [
      {
        id: 201,
        consultorio_id: 10,
        paciente_id: 5,
        fecha_hora: new Date('2026-08-10T09:00:00Z'),
        procedimiento: 'Consulta general',
        estado: 'pendiente'
      }
    ]
  })
}

// ─────────────────────────────────────────────────────────────
// 1. POST /api/citas
// ─────────────────────────────────────────────────────────────

test('POST /api/citas — creación correcta', async (t) => {
  const prismaMock = createCitasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    paciente_id: 5,
    fecha_hora: '2026-08-12T10:30:00Z',
    procedimiento: 'Limpieza profunda',
    doctor: 'Dr. Gomez',
    valor_cobrado: 85000
  }

  const { response, body } = await harness.request('/api/citas', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 201)
  assert.equal(body.procedimiento, 'Limpieza profunda')
  assert.equal(body.consultorio_id, 10)
  assert.equal(body.paciente_id, 5)

  const dbCita = prismaMock.__db.cita.find(c => c.id === body.id)
  assert.ok(dbCita)
  assert.equal(dbCita.procedimiento, 'Limpieza profunda')
})

test('POST /api/citas — campos obligatorios faltantes retorna 400', async (t) => {
  const harness = await startAppWithPrisma(createCitasPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    paciente_id: 5,
    // falta fecha_hora y procedimiento
  }

  const { response, body } = await harness.request('/api/citas', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 400)
  assert.equal(body.error, 'Paciente, fecha y procedimiento son obligatorios')
})

test('POST /api/citas — paciente inexistente retorna 404', async (t) => {
  const harness = await startAppWithPrisma(createCitasPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    paciente_id: 999, // Inexistente
    fecha_hora: '2026-08-12T10:30:00Z',
    procedimiento: 'Consulta general'
  }

  const { response, body } = await harness.request('/api/citas', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 404)
  assert.equal(body.error, 'Paciente no encontrado')
})

// ─────────────────────────────────────────────────────────────
// 2. GET /api/citas/:id
// ─────────────────────────────────────────────────────────────

test('GET /api/citas/:id — consulta de detalle correcta con paciente incluido', async (t) => {
  const harness = await startAppWithPrisma(createCitasPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response, body } = await harness.request('/api/citas/201', {
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 200)
  assert.equal(body.id, 201)
  assert.equal(body.procedimiento, 'Consulta general')
  assert.ok(body.paciente)
  assert.equal(body.paciente.nombres, 'Carlos')
})

test('GET /api/citas/:id — cita inexistente retorna 404', async (t) => {
  const harness = await startAppWithPrisma(createCitasPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response, body } = await harness.request('/api/citas/999', {
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 404)
  assert.equal(body.error, 'Cita no encontrada')
})

// ─────────────────────────────────────────────────────────────
// 3. PUT /api/citas/:id
// ─────────────────────────────────────────────────────────────

test('PUT /api/citas/:id — edición correcta de datos', async (t) => {
  const prismaMock = createCitasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    procedimiento: 'Consulta general actualizada',
    doctor: 'Dra. Rápida',
    valor_cobrado: 90000
  }

  const { response, body } = await harness.request('/api/citas/201', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 200)
  assert.equal(body.procedimiento, 'Consulta general actualizada')
  assert.equal(body.doctor, 'Dra. Rápida')
  assert.equal(body.valor_cobrado, 90000)

  const dbCita = prismaMock.__db.cita.find(c => c.id === 201)
  assert.equal(dbCita.procedimiento, 'Consulta general actualizada')
})

test('PUT /api/citas/:id — cita inexistente retorna 404', async (t) => {
  const harness = await startAppWithPrisma(createCitasPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = { procedimiento: 'Cambio' }

  const { response } = await harness.request('/api/citas/999', {
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
// 4. DELETE /api/citas/:id
// ─────────────────────────────────────────────────────────────

test('DELETE /api/citas/:id — eliminación correcta (soft delete, marca cancelada)', async (t) => {
  const prismaMock = createCitasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response, body } = await harness.request('/api/citas/201', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 200)
  assert.equal(body.message, 'Cita cancelada correctamente')

  const dbCita = prismaMock.__db.cita.find(c => c.id === 201)
  assert.equal(dbCita.estado, 'cancelada')
})

test('DELETE /api/citas/:id — cita inexistente retorna 404', async (t) => {
  const harness = await startAppWithPrisma(createCitasPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response } = await harness.request('/api/citas/999', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 404)
})

// ─────────────────────────────────────────────────────────────
// 5. PATCH /api/citas/:id/estado (Sprint 5C)
// ─────────────────────────────────────────────────────────────

test('PATCH /api/citas/:id/estado — transición a pendiente', async (t) => {
  const prismaMock = createCitasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const { response, body } = await harness.request('/api/citas/201/estado', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ estado: 'pendiente' })
  })

  assert.equal(response.status, 200)
  assert.equal(body.estado, 'pendiente')
})

test('PATCH /api/citas/:id/estado — transición a asistio', async (t) => {
  const prismaMock = createCitasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const { response, body } = await harness.request('/api/citas/201/estado', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ estado: 'asistio' })
  })

  assert.equal(response.status, 200)
  assert.equal(body.estado, 'asistio')
})

test('PATCH /api/citas/:id/estado — transición a no_asistio', async (t) => {
  const prismaMock = createCitasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const { response, body } = await harness.request('/api/citas/201/estado', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ estado: 'no_asistio' })
  })

  assert.equal(response.status, 200)
  assert.equal(body.estado, 'no_asistio')
})

test('PATCH /api/citas/:id/estado — transición a cancelada', async (t) => {
  const prismaMock = createCitasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const { response, body } = await harness.request('/api/citas/201/estado', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ estado: 'cancelada' })
  })

  assert.equal(response.status, 200)
  assert.equal(body.estado, 'cancelada')
})

test('PATCH /api/citas/:id/estado — estado inválido retorna 400', async (t) => {
  const harness = await startAppWithPrisma(createCitasPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const { response } = await harness.request('/api/citas/201/estado', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ estado: 'invalido' })
  })

  assert.equal(response.status, 400)
})

test('PATCH /api/citas/:id/estado — cita inexistente retorna 404', async (t) => {
  const harness = await startAppWithPrisma(createCitasPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const { response } = await harness.request('/api/citas/999/estado', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ estado: 'asistio' })
  })

  assert.equal(response.status, 404)
})

test('PATCH /api/citas/:id/estado — actualización repetida (mismo estado) retorna 200', async (t) => {
  const prismaMock = createCitasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  // Primera actualización a asistio
  await harness.request('/api/citas/201/estado', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ estado: 'asistio' })
  })

  // Segunda actualización (repetida)
  const { response, body } = await harness.request('/api/citas/201/estado', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ estado: 'asistio' })
  })

  assert.equal(response.status, 200)
  assert.equal(body.estado, 'asistio')
})

test('PATCH /api/citas/:id/estado — ID inválido (NaN) retorna 400/404', async (t) => {
  const harness = await startAppWithPrisma(createCitasPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const { response } = await harness.request('/api/citas/abc/estado', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ estado: 'asistio' })
  })

  assert.ok(response.status === 400 || response.status === 404)
})

// ─────────────────────────────────────────────────────────────
// 6. Consultas y Filtros (Sprint 5D)
// ─────────────────────────────────────────────────────────────

function createCitasConsultasMock() {
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
        fecha_nacimiento: new Date('1985-04-12')
      }
    ],
    cita: [
      {
        id: 201,
        consultorio_id: 10,
        paciente_id: 5,
        fecha_hora: new Date('2026-08-10T09:00:00.000Z'),
        procedimiento: 'Cita A (Temprana)',
        estado: 'pendiente'
      },
      {
        id: 202,
        consultorio_id: 10,
        paciente_id: 5,
        fecha_hora: new Date('2026-08-10T11:00:00.000Z'),
        procedimiento: 'Cita B (Tardía)',
        estado: 'pendiente'
      },
      {
        id: 203,
        consultorio_id: 10,
        paciente_id: 5,
        fecha_hora: new Date('2026-08-10T10:00:00.000Z'),
        procedimiento: 'Cita C (Cancelada)',
        estado: 'cancelada'
      },
      {
        id: 204,
        consultorio_id: 10,
        paciente_id: 5,
        fecha_hora: new Date('2026-08-11T09:00:00.000Z'),
        procedimiento: 'Cita D (Otro día)',
        estado: 'pendiente'
      }
    ]
  })
}

test('Consultas: GET /api/citas — obtiene listado con registros ordenados ASC por defecto (excluye canceladas)', async (t) => {
  const harness = await startAppWithPrisma(createCitasConsultasMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response, body } = await harness.request('/api/citas', {
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 200)
  assert.ok(Array.isArray(body))
  // Excluye la cancelada (203) y es de hoy, pero sin filtro de fecha lista todas las no canceladas (201, 202, 204)
  assert.equal(body.length, 3)
  
  // Ordenado ASC por fecha_hora: 201 (09:00) -> 202 (11:00) -> 204 (día siguiente 09:00)
  // Wait, let's verify if the order is correct:
  assert.equal(body[0].id, 201)
  assert.equal(body[1].id, 202)
  assert.equal(body[2].id, 204)
})

test('Consultas: GET /api/citas — incluye canceladas si se solicita', async (t) => {
  const harness = await startAppWithPrisma(createCitasConsultasMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response, body } = await harness.request('/api/citas?incluir_canceladas=true', {
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 200)
  assert.equal(body.length, 4) // Incluye la cancelada (203)
  
  // Ordenado ASC: 201 (09:00) -> 203 (10:00) -> 202 (11:00) -> 204 (día siguiente)
  assert.equal(body[0].id, 201)
  assert.equal(body[1].id, 203)
  assert.equal(body[2].id, 202)
  assert.equal(body[3].id, 204)
})

test('Consultas: GET /api/citas — listado vacío', async (t) => {
  const prismaMock = createCitasConsultasMock()
  prismaMock.__db.cita = [] // Vaciar citas

  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response, body } = await harness.request('/api/citas', {
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 200)
  assert.ok(Array.isArray(body))
  assert.equal(body.length, 0)
})

test('Consultas: GET /api/citas/paciente/:pacienteId — obtiene listado ordenado DESC', async (t) => {
  const harness = await startAppWithPrisma(createCitasConsultasMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response, body } = await harness.request('/api/citas/paciente/5', {
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 200)
  assert.ok(Array.isArray(body))
  // Excluye cancelada (203) por defecto. Quedan 201, 202, 204.
  assert.equal(body.length, 3)

  // Ordenado DESC por fecha_hora: 204 (día siguiente) -> 202 (11:00) -> 201 (09:00)
  assert.equal(body[0].id, 204)
  assert.equal(body[1].id, 202)
  assert.equal(body[2].id, 201)
})

test('Consultas: GET /api/citas/paciente/:pacienteId — paciente inexistente retorna lista vacía (o similar según Oralyn)', async (t) => {
  const harness = await startAppWithPrisma(createCitasConsultasMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response, body } = await harness.request('/api/citas/paciente/999', {
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 200)
  assert.ok(Array.isArray(body))
  assert.equal(body.length, 0)
})

// ─────────────────────────────────────────────────────────────
// Pruebas de Filtros de Fechas
// ─────────────────────────────────────────────────────────────

test('Filtros Fecha: Rango válido (fecha específica)', async (t) => {
  const harness = await startAppWithPrisma(createCitasConsultasMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  // Consultar citas del 2026-08-10 (debería retornar 201 y 202, excluye cancelada 203 y la del día siguiente 204)
  const { response, body } = await harness.request('/api/citas?fecha=2026-08-10', {
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 200)
  assert.equal(body.length, 2)
  assert.equal(body[0].id, 201)
  assert.equal(body[1].id, 202)
})

test('Filtros Fecha: Rango vacío (fecha sin citas)', async (t) => {
  const harness = await startAppWithPrisma(createCitasConsultasMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  // Consultar citas del 2026-08-15 (no hay citas ese día)
  const { response, body } = await harness.request('/api/citas?fecha=2026-08-15', {
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 200)
  assert.equal(body.length, 0)
})

test('Filtros Fecha: Rango inválido (fecha malformada) retorna 400 o 500 (BUG DE VALIDACIÓN)', async (t) => {
  const harness = await startAppWithPrisma(createCitasConsultasMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  // Enviar una fecha malformada
  const { response } = await harness.request('/api/citas?fecha=fecha-incorrecta', {
    headers: { Authorization: `Bearer ${token}` }
  })

  // Si es robusto, debería retornar 400 Bad Request
  assert.equal(response.status, 400)
})

// ─────────────────────────────────────────────────────────────
// 7. Aislamiento Cross-Tenant (Sprint 5E)
// ─────────────────────────────────────────────────────────────

function createCitasSecurityMock() {
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
      {
        id: 5,
        consultorio_id: 10,
        primer_apellido: 'Gomez',
        nombres: 'Carlos',
        tipo_documento: 'CC',
        numero_documento: '99999'
      },
      {
        id: 6,
        consultorio_id: 99,
        primer_apellido: 'Ramirez',
        nombres: 'Ana',
        tipo_documento: 'CC',
        numero_documento: '88888'
      }
    ],
    cita: [
      {
        id: 201,
        consultorio_id: 10,
        paciente_id: 5,
        fecha_hora: new Date('2026-08-10T09:00:00Z'),
        procedimiento: 'Consulta general A',
        estado: 'pendiente'
      },
      {
        id: 202,
        consultorio_id: 99,
        paciente_id: 6,
        fecha_hora: new Date('2026-08-10T10:00:00Z'),
        procedimiento: 'Consulta general B',
        estado: 'pendiente'
      }
    ]
  })
}

test('Aislamiento: GET /api/citas — no permite listar citas de otros consultorios', async (t) => {
  const harness = await startAppWithPrisma(createCitasSecurityMock())
  t.after(() => harness.close())

  const tokenB = generateToken(2, 99) // Usuario de consultorio 99

  const { response, body } = await harness.request('/api/citas', {
    headers: { Authorization: `Bearer ${tokenB}` }
  })

  assert.equal(response.status, 200)
  assert.ok(Array.isArray(body))
  // Solo debe listar la cita 202 del consultorio 99, no la 201 del consultorio 10
  assert.equal(body.length, 1)
  assert.equal(body[0].id, 202)
})

test('Aislamiento: GET /api/citas/:id — no permite consultar cita de otro consultorio', async (t) => {
  const harness = await startAppWithPrisma(createCitasSecurityMock())
  t.after(() => harness.close())

  const tokenB = generateToken(2, 99) // Usuario de consultorio 99

  const { response } = await harness.request('/api/citas/201', { // Cita de consultorio 10
    headers: { Authorization: `Bearer ${tokenB}` }
  })

  assert.equal(response.status, 404)
})

test('Aislamiento: GET /api/citas/paciente/:pacienteId — no permite listar citas de paciente de otro consultorio', async (t) => {
  const harness = await startAppWithPrisma(createCitasSecurityMock())
  t.after(() => harness.close())

  const tokenB = generateToken(2, 99) // Usuario de consultorio 99

  const { response, body } = await harness.request('/api/citas/paciente/5', { // Paciente del consultorio 10
    headers: { Authorization: `Bearer ${tokenB}` }
  })

  assert.equal(response.status, 200)
  assert.ok(Array.isArray(body))
  assert.equal(body.length, 0)
})

test('Aislamiento: POST /api/citas — no permite crear cita para paciente de otro consultorio', async (t) => {
  const harness = await startAppWithPrisma(createCitasSecurityMock())
  t.after(() => harness.close())

  const tokenB = generateToken(2, 99) // Usuario de consultorio 99
  const payload = {
    paciente_id: 5, // Paciente de consultorio 10
    fecha_hora: '2026-08-12T10:00:00Z',
    procedimiento: 'Intrusión'
  }

  const { response } = await harness.request('/api/citas', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenB}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 404) // Retorna paciente no encontrado
})

test('Aislamiento: PUT /api/citas/:id — no permite modificar cita de otro consultorio', async (t) => {
  const harness = await startAppWithPrisma(createCitasSecurityMock())
  t.after(() => harness.close())

  const tokenB = generateToken(2, 99) // Usuario de consultorio 99
  const payload = { procedimiento: 'Hacked' }

  const { response } = await harness.request('/api/citas/201', { // Cita de consultorio 10
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${tokenB}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 404)
})

test('Aislamiento: PATCH /api/citas/:id/estado — no permite cambiar estado de cita de otro consultorio', async (t) => {
  const harness = await startAppWithPrisma(createCitasSecurityMock())
  t.after(() => harness.close())

  const tokenB = generateToken(2, 99) // Usuario de consultorio 99
  const payload = { estado: 'asistio' }

  const { response } = await harness.request('/api/citas/201/estado', { // Cita de consultorio 10
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${tokenB}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 404)
})

test('Aislamiento: DELETE /api/citas/:id — no permite cancelar cita de otro consultorio', async (t) => {
  const harness = await startAppWithPrisma(createCitasSecurityMock())
  t.after(() => harness.close())

  const tokenB = generateToken(2, 99) // Usuario de consultorio 99

  const { response } = await harness.request('/api/citas/201', { // Cita de consultorio 10
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenB}` }
  })

  assert.equal(response.status, 404)
})



