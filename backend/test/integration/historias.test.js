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

function createHistoriasPrismaMock() {
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
        nombres: 'Juan',
        tipo_documento: 'CC',
        numero_documento: '12345',
        fecha_nacimiento: new Date('1990-05-15'),
        sexo: 'masculino',
        municipio_ciudad: 'Villavicencio'
      },
      {
        id: 2,
        consultorio_id: 99, // Otro consultorio
        primer_apellido: 'Rodriguez',
        nombres: 'Maria',
        tipo_documento: 'CC',
        numero_documento: '54321',
        fecha_nacimiento: new Date('1995-10-20'),
        sexo: 'femenino',
        municipio_ciudad: 'Cali'
      }
    ],
    historiaClinica: [
      {
        id: 101,
        paciente_id: 1,
        motivo_consulta: 'Control inicial',
        diagnostico: 'Sano',
        fecha_atencion: new Date('2026-08-01T10:00:00Z')
      },
      {
        id: 102,
        paciente_id: 2,
        motivo_consulta: 'Control B',
        diagnostico: 'Sano B',
        fecha_atencion: new Date('2026-08-01T10:00:00Z')
      }
    ],
    hcAntecedentes: [
      { id: 501, historia_id: 101, reacciones_alergicas: false, alergias_obs: 'Ninguna', tratamiento_medicacion: false, tratamiento_med_obs: 'Ninguno' }
    ],
    hcExamenEstomatologico: [
      { id: 601, historia_id: 101, estructuras_json: '{}', observaciones: 'Normal' }
    ],
    hojaEvolucion: [
      {
        id: 701,
        historia_id: 101,
        fecha: new Date('2026-08-02T10:00:00Z'),
        procedimiento: 'Limpieza dental'
      },
      {
        id: 702,
        historia_id: 102,
        fecha: new Date('2026-08-02T10:00:00Z'),
        procedimiento: 'Limpieza B'
      }
    ],
    hcOdontograma: [
      {
        id: 801,
        historia_id: 101,
        dientes_json: '{"11": "S"}',
        observaciones: 'Odontograma inicial'
      }
    ],
    hcAdjunto: [
      {
        id: 901,
        historia_id: 101,
        nombre_archivo: 'radiografia.png',
        mime_type: 'image/png'
      },
      {
        id: 902,
        historia_id: 102,
        nombre_archivo: 'foto_b.jpg',
        mime_type: 'image/jpeg'
      }
    ]
  })
}

// ─────────────────────────────────────────────────────────────
// 1. POST /api/historias/:pacienteId
// ─────────────────────────────────────────────────────────────

test('POST /api/historias/:pacienteId — creación correcta de historia con antecedentes y examen', async (t) => {
  const prismaMock = createHistoriasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    motivo_consulta: 'Paciente refiere dolor',
    diagnostico: 'Caries dentales múltiples',
    antecedentes: { reacciones_alergicas: true, alergias_obs: 'Penicilina', tratamiento_medicacion: true, tratamiento_med_obs: 'Hipertensión' },
    examen: { estructuras_json: '{"labios":"normal"}', observaciones: 'Todo en orden' },
    odontograma: { dientes_json: '{"18":"C"}', observaciones: 'Caries' }
  }

  const { response, body } = await harness.request('/api/historias/1', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 201)
  assert.equal(body.motivo_consulta, 'Paciente refiere dolor')
  assert.equal(body.diagnostico, 'Caries dentales múltiples')

  // Verificar inserciones anidadas en el mock
  const ant = prismaMock.__db.hcAntecedentes.find(a => a.historia_id === body.id)
  assert.ok(ant)
  assert.equal(ant.alergias_obs, 'Penicilina')

  const ex = prismaMock.__db.hcExamenEstomatologico.find(e => e.historia_id === body.id)
  assert.ok(ex)
  assert.equal(ex.observaciones, 'Todo en orden')

  const od = prismaMock.__db.hcOdontograma.find(o => o.historia_id === body.id)
  assert.ok(od)
  assert.equal(od.observaciones, 'Caries')
})

test('POST /api/historias/:pacienteId — campos obligatorios faltantes da 400', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    diagnostico: 'Solo diagnostico, falta motivo'
  }

  const { response, body } = await harness.request('/api/historias/1', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 400)
  assert.equal(body.error, 'Motivo de consulta y diagnóstico son obligatorios')
})

test('POST /api/historias/:pacienteId — paciente inexistente da 404', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    motivo_consulta: 'Consulta',
    diagnostico: 'Diagnostico'
  }

  const { response } = await harness.request('/api/historias/999', {
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
// 2. GET /api/historias/:pacienteId
// ─────────────────────────────────────────────────────────────

test('GET /api/historias/:pacienteId — listado correcto', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response, body } = await harness.request('/api/historias/1', {
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 200)
  assert.ok(Array.isArray(body))
  assert.equal(body.length, 1)
  assert.equal(body[0].id, 101)
  assert.equal(body[0].motivo_consulta, 'Control inicial')
})

// ─────────────────────────────────────────────────────────────
// 3. GET /api/historias/detalle/:id
// ─────────────────────────────────────────────────────────────

test('GET /api/historias/detalle/:id — consulta de detalle correcta con nested tables', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response, body } = await harness.request('/api/historias/detalle/101', {
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 200)
  assert.equal(body.id, 101)
  assert.ok(body.paciente)
  assert.equal(body.paciente.id, 1)
  assert.ok(body.antecedentes)
  assert.equal(body.antecedentes.alergias_obs, 'Ninguna')
  assert.ok(body.examen)
  assert.equal(body.examen.observaciones, 'Normal')
  assert.ok(Array.isArray(body.odontogramas))
  assert.equal(body.odontogramas[0].id, 801)
  assert.ok(Array.isArray(body.evoluciones))
  assert.equal(body.evoluciones[0].id, 701)
  assert.ok(Array.isArray(body.adjuntos))
  assert.equal(body.adjuntos[0].id, 901)
})

test('GET /api/historias/detalle/:id — historia inexistente da 404', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response } = await harness.request('/api/historias/detalle/999', {
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 404)
})

// ─────────────────────────────────────────────────────────────
// 4. PUT /api/historias/:id
// ─────────────────────────────────────────────────────────────

test('PUT /api/historias/:id — modificación correcta (incluyendo upserts)', async (t) => {
  const prismaMock = createHistoriasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    motivo_consulta: 'Motivo modificado',
    diagnostico: 'Diagnostico modificado',
    antecedentes: { reacciones_alergicas: true, alergias_obs: 'Nueva alergia' },
    examen: { estructuras_json: '{"encias":"rojas"}', observaciones: 'Gingivitis' }
  }

  const { response, body } = await harness.request('/api/historias/101', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 200)
  assert.equal(body.motivo_consulta, 'Motivo modificado')
  assert.equal(body.diagnostico, 'Diagnostico modificado')

  // Verificar actualizaciones en la db
  const h = prismaMock.__db.historiaClinica.find(h => h.id === 101)
  assert.equal(h.motivo_consulta, 'Motivo modificado')

  const ant = prismaMock.__db.hcAntecedentes.find(a => a.historia_id === 101)
  assert.equal(ant.alergias_obs, 'Nueva alergia')

  const ex = prismaMock.__db.hcExamenEstomatologico.find(e => e.historia_id === 101)
  assert.equal(ex.observaciones, 'Gingivitis')
})

// ─────────────────────────────────────────────────────────────
// 5. Evoluciones (POST, GET, PUT, DELETE)
// ─────────────────────────────────────────────────────────────

test('Evoluciones: POST /api/historias/:historiaId/evoluciones — creación correcta', async (t) => {
  const prismaMock = createHistoriasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    doctor: 'Dr. Gomez',
    procedimiento: 'Calza resina',
    motivo: 'Dolor en diente',
    observaciones: 'Ninguna'
  }

  const { response, body } = await harness.request('/api/historias/101/evoluciones', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 201)
  assert.equal(body.procedimiento, 'Calza resina')
  assert.equal(body.doctor, 'Dr. Gomez')

  const ev = prismaMock.__db.hojaEvolucion.find(e => e.id === body.id)
  assert.ok(ev)
  assert.equal(ev.procedimiento, 'Calza resina')
})

test('Evoluciones: POST /api/historias/:historiaId/evoluciones — campos obligatorios faltantes da 400', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    doctor: 'Dr. Gomez' // Falta procedimiento
  }

  const { response } = await harness.request('/api/historias/101/evoluciones', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 400)
})

test('Evoluciones: GET /api/historias/:historiaId/evoluciones — listado correcto', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response, body } = await harness.request('/api/historias/101/evoluciones', {
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 200)
  assert.ok(Array.isArray(body))
  assert.equal(body.length, 1)
  assert.equal(body[0].id, 701)
})

test('Evoluciones: PUT /api/historias/:historiaId/evoluciones/:evolucionId — modificación correcta', async (t) => {
  const prismaMock = createHistoriasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    procedimiento: 'Limpieza dental profunda',
    observaciones: 'Encías sangrantes'
  }

  const { response, body } = await harness.request('/api/historias/101/evoluciones/701', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 200)
  assert.equal(body.procedimiento, 'Limpieza dental profunda')
  assert.equal(body.observaciones, 'Encías sangrantes')

  const ev = prismaMock.__db.hojaEvolucion.find(e => e.id === 701)
  assert.equal(ev.procedimiento, 'Limpieza dental profunda')
})

test('Evoluciones: DELETE /api/historias/:historiaId/evoluciones/:evolucionId — eliminación correcta', async (t) => {
  const prismaMock = createHistoriasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response } = await harness.request('/api/historias/101/evoluciones/701', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 204)
  assert.equal(prismaMock.__db.hojaEvolucion.filter(e => e.id === 701).length, 0)
})

// ─────────────────────────────────────────────────────────────
// 6. Odontograma (PUT)
// ─────────────────────────────────────────────────────────────

test('Odontograma: PUT /api/historias/:historiaId/odontograma — actualización/creación correcta', async (t) => {
  const prismaMock = createHistoriasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    dientes_json: '{"11": "C", "12": "S"}',
    observaciones: 'Odontograma actualizado'
  }

  const { response, body } = await harness.request('/api/historias/101/odontograma/general_adulto', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 200)
  assert.equal(body.dientes_json, '{"11": "C", "12": "S"}')

  const od = prismaMock.__db.hcOdontograma.find(o => o.historia_id === 101)
  assert.equal(od.dientes_json, '{"11": "C", "12": "S"}')
})

// ─────────────────────────────────────────────────────────────
// 7. Adjuntos (POST, GET, DELETE)
// ─────────────────────────────────────────────────────────────

test('Adjuntos: POST /api/historias/:historiaId/adjuntos — creación correcta', async (t) => {
  const prismaMock = createHistoriasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    nombre_archivo: 'nueva_foto.jpg',
    mime_type: 'image/jpeg',
    tamano_bytes: 2048,
    url: 'http://test.com/nueva_foto.jpg'
  }

  const { response, body } = await harness.request('/api/historias/101/adjuntos', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 201)
  assert.equal(body.nombre_archivo, 'nueva_foto.jpg')

  const adj = prismaMock.__db.hcAdjunto.find(a => a.id === body.id)
  assert.ok(adj)
  assert.equal(adj.nombre_archivo, 'nueva_foto.jpg')
})

test('Adjuntos: GET /api/historias/:historiaId/adjuntos — listado correcto', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response, body } = await harness.request('/api/historias/101/adjuntos', {
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 200)
  assert.ok(Array.isArray(body))
  assert.equal(body.length, 1)
  assert.equal(body[0].id, 901)
})

test('Adjuntos: DELETE /api/historias/:historiaId/adjuntos/:adjuntoId — eliminación correcta', async (t) => {
  const prismaMock = createHistoriasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response } = await harness.request('/api/historias/101/adjuntos/901', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 204)
  assert.equal(prismaMock.__db.hcAdjunto.filter(a => a.id === 901).length, 0)
})

// ─────────────────────────────────────────────────────────────
// 8. Pruebas de Aislamiento Cross-Tenant (Sprint 4C)
// ─────────────────────────────────────────────────────────────

test('Aislamiento: POST /api/historias/:pacienteId — no permite crear historia para paciente de otro consultorio', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const tokenA = generateToken(1, 10) // Usuario de consultorio 10
  const payload = { motivo_consulta: 'Hacker', diagnostico: 'Intrusión' }

  const { response } = await harness.request('/api/historias/2', { // Paciente B (id: 2, consultorio 99)
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 404)
})

test('Aislamiento: GET /api/historias/:pacienteId — no permite listar historias de paciente de otro consultorio', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const tokenA = generateToken(1, 10)

  const { response } = await harness.request('/api/historias/2', { // Paciente B (id: 2, consultorio 99)
    headers: { Authorization: `Bearer ${tokenA}` }
  })

  assert.equal(response.status, 404)
})

test('Aislamiento: GET /api/historias/detalle/:id — no permite consultar detalle de historia de otro consultorio', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const tokenA = generateToken(1, 10)

  const { response } = await harness.request('/api/historias/detalle/102', { // Historia B (id: 102, consultorio 99)
    headers: { Authorization: `Bearer ${tokenA}` }
  })

  assert.equal(response.status, 403)
})

test('Aislamiento: PUT /api/historias/:id — no permite modificar historia de otro consultorio (BUG DE SEGURIDAD)', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const tokenA = generateToken(1, 10)
  const payload = { motivo_consulta: 'Ataque', diagnostico: 'Modificado' }

  const { response } = await harness.request('/api/historias/102', { // Historia B (id: 102, consultorio 99)
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  // Se espera que falle con 403 o 404 si es seguro
  assert.equal(response.status, 403)
})

test('Aislamiento: POST /api/historias/:historiaId/evoluciones — no permite agregar evolución a historia de otro consultorio (BUG DE SEGURIDAD)', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const tokenA = generateToken(1, 10)
  const payload = { procedimiento: 'Acceso no autorizado' }

  const { response } = await harness.request('/api/historias/102/evoluciones', { // Historia B
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 403)
})

test('Aislamiento: GET /api/historias/:historiaId/evoluciones — no permite listar evoluciones de historia de otro consultorio', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const tokenA = generateToken(1, 10)

  const { response } = await harness.request('/api/historias/102/evoluciones', { // Historia B
    headers: { Authorization: `Bearer ${tokenA}` }
  })

  assert.equal(response.status, 404)
})

test('Aislamiento: PUT /api/historias/:historiaId/evoluciones/:evolucionId — no permite editar evolución de otro consultorio (BUG DE SEGURIDAD)', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const tokenA = generateToken(1, 10)
  const payload = { procedimiento: 'Edición hacker' }

  const { response } = await harness.request('/api/historias/102/evoluciones/702', { // Evolución B (id: 702)
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 403)
})

test('Aislamiento: DELETE /api/historias/:historiaId/evoluciones/:evolucionId — no permite eliminar evolución de otro consultorio (BUG DE SEGURIDAD)', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const tokenA = generateToken(1, 10)

  const { response } = await harness.request('/api/historias/102/evoluciones/702', { // Evolución B (id: 702)
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenA}` }
  })

  assert.equal(response.status, 403)
})

test('Aislamiento: PUT /api/historias/:historiaId/odontograma — no permite modificar odontograma de otro consultorio (BUG DE SEGURIDAD)', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const tokenA = generateToken(1, 10)
  const payload = { dientes_json: '{"18":"C"}' }

  const { response } = await harness.request('/api/historias/102/odontograma/general_adulto', { // Historia B
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 404)
})

test('Aislamiento: GET /api/historias/:historiaId/adjuntos — no permite listar adjuntos de historia de otro consultorio (BUG DE SEGURIDAD)', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const tokenA = generateToken(1, 10)

  const { response } = await harness.request('/api/historias/102/adjuntos', { // Historia B
    headers: { Authorization: `Bearer ${tokenA}` }
  })

  assert.equal(response.status, 403)
})

test('Aislamiento: POST /api/historias/:historiaId/adjuntos — no permite agregar adjunto a historia de otro consultorio (BUG DE SEGURIDAD)', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const tokenA = generateToken(1, 10)
  const payload = { nombre_archivo: 'hacker.png' }

  const { response } = await harness.request('/api/historias/102/adjuntos', { // Historia B
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 403)
})

test('Aislamiento: DELETE /api/historias/:historiaId/adjuntos/:adjuntoId — no permite eliminar adjunto de historia de otro consultorio (BUG DE SEGURIDAD)', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const tokenA = generateToken(1, 10)

  const { response } = await harness.request('/api/historias/102/adjuntos/902', { // Adjunto B (id: 902)
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenA}` }
  })

  assert.equal(response.status, 403)
})

// ─────────────────────────────────────────────────────────────
// 9. Pruebas de Validación de Entrada (Sprint 4D)
// ─────────────────────────────────────────────────────────────

test('Validación: POST /api/historias/:pacienteId — motivo con solo espacios retorna 400', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    motivo_consulta: '   ', // Solo espacios
    diagnostico: 'Gingivitis'
  }

  const { response } = await harness.request('/api/historias/1', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  // Esperado: 400 Bad Request
  assert.equal(response.status, 400)
})

test('Validación: POST /api/historias/:pacienteId — paciente ID inválido (NaN) retorna 400/404', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    motivo_consulta: 'Control',
    diagnostico: 'Sano'
  }

  const { response } = await harness.request('/api/historias/abc', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.ok(response.status === 400 || response.status === 404)
})

test('Validación: POST /api/historias/:historiaId/evoluciones — procedimiento vacío retorna 400', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    procedimiento: '' // Vacío
  }

  const { response } = await harness.request('/api/historias/101/evoluciones', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 400)
})

test('Validación: PUT /api/historias/:historiaId/odontograma — dientes_json vacío retorna 400', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    observaciones: 'Sin dientes' // Falta dientes_json
  }

  const { response } = await harness.request('/api/historias/101/odontograma/general_adulto', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 400)
})

test('Validación: PUT /api/historias/:historiaId/evoluciones/:evolucionId — ID de evolución inválido (NaN) retorna 400', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = { procedimiento: 'Limpieza' }

  const { response } = await harness.request('/api/historias/101/evoluciones/abc', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 400)
})

test('Validación: DELETE /api/historias/:historiaId/evoluciones/:evolucionId — ID de historia inválido (NaN) retorna 400', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response } = await harness.request('/api/historias/abc/evoluciones/701', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 400)
})

test('Validación: POST /api/historias/:historiaId/adjuntos — nombre de archivo vacío retorna 400', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    mime_type: 'image/png' // Falta nombre_archivo y nombre
  }

  const { response } = await harness.request('/api/historias/101/adjuntos', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 400)
})

test('Validación: DELETE /api/historias/:historiaId/adjuntos/:adjuntoId — ID de adjunto inválido (NaN) retorna 400', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response } = await harness.request('/api/historias/101/adjuntos/abc', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 400)
})

// ─────────────────────────────────────────────────────────────
// 10. Pruebas de Odontograma (Sprint 4D)
// ─────────────────────────────────────────────────────────────

test('Odontograma: Crear odontograma en historia existente', async (t) => {
  const prismaMock = createHistoriasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = { dientes_json: '{"21": "C"}', observaciones: 'Odonto nuevo' }

  // Eliminar el odontograma precargado para probar creación
  prismaMock.__db.hcOdontograma = prismaMock.__db.hcOdontograma.filter(o => o.historia_id !== 101)

  const { response, body } = await harness.request('/api/historias/101/odontograma/general_adulto', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 200)
  assert.equal(body.dientes_json, '{"21": "C"}')
  assert.equal(body.observaciones, 'Odonto nuevo')
  assert.ok(body.id)
})

test('Odontograma: Actualizar odontograma existente', async (t) => {
  const prismaMock = createHistoriasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = { dientes_json: '{"21": "S"}', observaciones: 'Odonto modificado' }

  const { response, body } = await harness.request('/api/historias/101/odontograma/general_adulto', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 200)
  assert.equal(body.id, 801) // Debe actualizar el id: 801 existente
  assert.equal(body.dientes_json, '{"21": "S"}')
})

test('Odontograma: Consultar odontograma de una historia', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response, body } = await harness.request('/api/historias/detalle/101', {
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 200)
  assert.ok(Array.isArray(body.odontogramas))
  assert.equal(body.odontogramas.length, 1)
  assert.equal(body.odontogramas[0].id, 801)
  assert.equal(body.odontogramas[0].dientes_json, '{"11": "S"}')
})

test('Odontograma: Intentar crear/actualizar en historia inexistente da 404', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = { dientes_json: '{"21": "C"}', observaciones: 'Inexistente' }

  const { response } = await harness.request('/api/historias/999/odontograma/general_adulto', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 404)
})

test('Odontograma: Aislamiento — Intentar modificar odontograma de otro consultorio (BUG DE SEGURIDAD)', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const tokenA = generateToken(1, 10) // Usuario A de Consultorio 10
  const payload = { dientes_json: '{"21": "C"}' }

  const { response } = await harness.request('/api/historias/102/odontograma/general_adulto', { // Historia B de Consultorio 99
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 404)
})

test('Odontograma: Aislamiento — Intentar consultar odontograma de otro consultorio', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const tokenA = generateToken(1, 10)

  const { response } = await harness.request('/api/historias/detalle/102', { // Historia B
    headers: { Authorization: `Bearer ${tokenA}` }
  })

  assert.equal(response.status, 403)
})

// ─────────────────────────────────────────────────────────────
// 11. Pruebas de Adjuntos (Sprint 4E)
// ─────────────────────────────────────────────────────────────

test('Adjuntos: Subir adjunto en historia existente', async (t) => {
  const prismaMock = createHistoriasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    nombre_archivo: 'nueva_foto_4e.jpg',
    mime_type: 'image/jpeg',
    tamano_bytes: 4096,
    url: 'http://test.com/nueva_foto_4e.jpg'
  }

  const { response, body } = await harness.request('/api/historias/101/adjuntos', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 201)
  assert.equal(body.nombre_archivo, 'nueva_foto_4e.jpg')
  assert.ok(body.id)
})

test('Adjuntos: Listar adjuntos de una historia existente', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response, body } = await harness.request('/api/historias/101/adjuntos', {
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 200)
  assert.ok(Array.isArray(body))
  assert.equal(body.length, 1)
  assert.equal(body[0].id, 901)
})

test('Adjuntos: Eliminar adjunto existente', async (t) => {
  const prismaMock = createHistoriasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response } = await harness.request('/api/historias/101/adjuntos/901', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 204)
  assert.equal(prismaMock.__db.hcAdjunto.filter(a => a.id === 901).length, 0)
})

test('Adjuntos: Intentar subir adjunto a historia inexistente da 404', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = { nombre_archivo: 'error.png' }

  const { response } = await harness.request('/api/historias/999/adjuntos', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 404)
})

test('Adjuntos: Intentar eliminar adjunto inexistente da 404', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response } = await harness.request('/api/historias/101/adjuntos/999', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 404)
})

test('Adjuntos: Aislamiento — Intentar subir adjunto a historia de otro consultorio (BUG DE SEGURIDAD)', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const tokenA = generateToken(1, 10) // Usuario A de Consultorio 10
  const payload = { nombre_archivo: 'hacker_4e.png' }

  const { response } = await harness.request('/api/historias/102/adjuntos', { // Historia B de Consultorio 99
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 403)
})

test('Adjuntos: Aislamiento — Intentar listar adjuntos de historia de otro consultorio (BUG DE SEGURIDAD)', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const tokenA = generateToken(1, 10)

  const { response } = await harness.request('/api/historias/102/adjuntos', { // Historia B
    headers: { Authorization: `Bearer ${tokenA}` }
  })

  assert.equal(response.status, 403)
})

test('Adjuntos: Aislamiento — Intentar eliminar adjunto de historia de otro consultorio (BUG DE SEGURIDAD)', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const tokenA = generateToken(1, 10)

  const { response } = await harness.request('/api/historias/102/adjuntos/902', { // Adjunto B (id: 902)
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenA}` }
  })

  assert.equal(response.status, 403)
})

// ─────────────────────────────────────────────────────────────
// 12. Generación de PDF (Sprint 4F)
// ─────────────────────────────────────────────────────────────

test('PDF: Generación correcta de PDF de historia clínica', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response, body } = await harness.request('/api/historias/101/pdf', {
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'application/pdf')
  assert.ok(response.headers.get('content-disposition').includes('inline; filename=historia-101.pdf'))
  
  // El cuerpo de respuesta debe ser un buffer PDF válido (los PDFs empiezan con %PDF-)
  const buffer = Buffer.from(body)
  assert.ok(buffer.toString('utf-8', 0, 4).startsWith('%PDF'))
})

test('PDF: Historia inexistente retorna 404', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response } = await harness.request('/api/historias/999/pdf', {
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 404)
})

test('PDF: Rechaza solicitud con token inválido', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const tokenInvalido = 'invalido'

  const { response } = await harness.request('/api/historias/101/pdf', {
    headers: { Authorization: `Bearer ${tokenInvalido}` }
  })

  assert.equal(response.status, 403)
})

test('PDF: Rechaza solicitud sin token', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const { response } = await harness.request('/api/historias/101/pdf')

  assert.equal(response.status, 401)
})

test('PDF: Aislamiento — Historia perteneciente a otro consultorio retorna 403', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const tokenA = generateToken(1, 10) // Usuario de consultorio 10

  const { response } = await harness.request('/api/historias/102/pdf', { // Historia B de consultorio 99
    headers: { Authorization: `Bearer ${tokenA}` }
  })

  assert.equal(response.status, 403)
})





