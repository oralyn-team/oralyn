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
        fecha_atencion: new Date('2026-08-01T10:00:00Z'),
        version: 1
      },
      {
        id: 102,
        paciente_id: 2,
        motivo_consulta: 'Control B',
        diagnostico: 'Sano B',
        fecha_atencion: new Date('2026-08-01T10:00:00Z'),
        version: 1
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
        procedimiento: 'Limpieza dental',
        observaciones: 'Sin novedad',
        version: 1,
        anulada: false
      },
      {
        id: 702,
        historia_id: 102,
        fecha: new Date('2026-08-02T10:00:00Z'),
        procedimiento: 'Limpieza B',
        version: 1,
        anulada: false
      }
    ],
    hcOdontograma: [
      {
        id: 801,
        historia_id: 101,
        tipo: 'GENERAL_ADULTO',
        dientes_json: '{"11": "S"}',
        observaciones: 'Odontograma inicial',
        version: 1
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
    version: 1,
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
  assert.equal(body.version, 2)

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
    version: 1,
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
  assert.equal(body.version, 2)

  const ev = prismaMock.__db.hojaEvolucion.find(e => e.id === 701)
  assert.equal(ev.procedimiento, 'Limpieza dental profunda')
  // fecha no venía en el body: se conserva la original, no se reemplaza por "ahora"
  assert.equal(new Date(ev.fecha).toISOString(), '2026-08-02T10:00:00.000Z')
})

test('Evoluciones: DELETE /api/historias/:historiaId/evoluciones/:evolucionId — responde 405 y no borra la fila', async (t) => {
  const prismaMock = createHistoriasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response, body } = await harness.request('/api/historias/101/evoluciones/701', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 405)
  assert.equal(body.error, 'METODO_NO_PERMITIDO')
  assert.equal(body.mensaje, 'Las evoluciones no se eliminan; usa la anulación.')
  const ev = prismaMock.__db.hojaEvolucion.find(e => e.id === 701)
  assert.ok(ev)
  assert.equal(ev.anulada, false)
  assert.equal(ev.version, 1)
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
    observaciones: 'Odontograma actualizado',
    version: 1
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
  const payload = { version: 1, motivo_consulta: 'Ataque', diagnostico: 'Modificado' }

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
  const payload = { version: 1, procedimiento: 'Edición hacker' }

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

test('Aislamiento: DELETE /api/historias/:historiaId/evoluciones/:evolucionId — evolución de otro consultorio: 405 y la fila sigue intacta', async (t) => {
  const prismaMock = createHistoriasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const tokenA = generateToken(1, 10)

  const { response } = await harness.request('/api/historias/102/evoluciones/702', { // Evolución B (id: 702)
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenA}` }
  })

  assert.equal(response.status, 405)
  assert.ok(prismaMock.__db.hojaEvolucion.find(e => e.id === 702))
})

test('Aislamiento: PATCH /api/historias/:historiaId/evoluciones/:evolucionId/anular — no permite anular evolución de otro consultorio', async (t) => {
  const prismaMock = createHistoriasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const tokenA = generateToken(1, 10)

  const { response } = await harness.request('/api/historias/102/evoluciones/702/anular', { // Evolución B (id: 702)
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ motivo: 'Intrusión', version: 1 })
  })

  assert.equal(response.status, 403)
  assert.equal(prismaMock.__db.hojaEvolucion.find(e => e.id === 702).anulada, false)
})

test('Aislamiento: PUT /api/historias/:historiaId/odontograma — no permite modificar odontograma de otro consultorio (BUG DE SEGURIDAD)', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const tokenA = generateToken(1, 10)
  const payload = { dientes_json: '{"18":"C"}', version: 1 }

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
    observaciones: 'Sin dientes', // Falta dientes_json
    version: 1
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

test('Validación: DELETE /api/historias/:historiaId/evoluciones/:evolucionId — con ID inválido (NaN) también responde 405', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const { response } = await harness.request('/api/historias/abc/evoluciones/701', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 405)
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
  const payload = { dientes_json: '{"21": "C"}', observaciones: 'Odonto nuevo', version: 0 }

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
  const payload = { dientes_json: '{"21": "S"}', observaciones: 'Odonto modificado', version: 1 }

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
  const payload = { dientes_json: '{"21": "C"}', observaciones: 'Inexistente', version: 1 }

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
  const payload = { dientes_json: '{"21": "C"}', version: 1 }

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

// ─────────────────────────────────────────────────────────────
// 12. Control de concurrencia optimista (campo `version`)
// ─────────────────────────────────────────────────────────────

async function putJson(harness, url, token, payload) {
  return harness.request(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

// ── PUT /api/historias/:id ──

test('Concurrencia historia: sin version, con "1" (string) o con true responde 400 VERSION_REQUERIDA y no escribe', async (t) => {
  const prismaMock = createHistoriasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())
  const token = generateToken(1, 10)

  for (const [caso, extra] of [['sin version', {}], ['string "1"', { version: '1' }], ['booleano true', { version: true }]]) {
    const { response, body } = await putJson(harness, '/api/historias/101', token, { motivo_consulta: `Intento ${caso}`, ...extra })
    assert.equal(response.status, 400, caso)
    assert.equal(body.error, 'VERSION_REQUERIDA', caso)
  }

  const h = prismaMock.__db.historiaClinica.find(x => x.id === 101)
  assert.equal(h.motivo_consulta, 'Control inicial')
  assert.equal(h.version, 1)
})

test('Concurrencia historia: versión desfasada responde 409 y deja intactos motivo, antecedentes y examen', async (t) => {
  const prismaMock = createHistoriasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())
  const token = generateToken(1, 10)

  // Otro usuario ya guardó: la historia está en version 2
  prismaMock.__db.historiaClinica.find(x => x.id === 101).version = 2

  const { response, body } = await putJson(harness, '/api/historias/101', token, {
    version: 1,
    motivo_consulta: 'Motivo con vista vieja',
    antecedentes: { reacciones_alergicas: true, alergias_obs: 'Sobrescrita' },
    examen: { estructuras_json: '{}', observaciones: 'Sobrescrito' }
  })

  assert.equal(response.status, 409)
  assert.equal(body.error, 'CONFLICTO_VERSION')
  assert.ok(body.mensaje)

  const h = prismaMock.__db.historiaClinica.find(x => x.id === 101)
  assert.equal(h.motivo_consulta, 'Control inicial')
  assert.equal(h.version, 2)
  assert.equal(prismaMock.__db.hcAntecedentes.find(a => a.historia_id === 101).alergias_obs, 'Ninguna')
  assert.equal(prismaMock.__db.hcExamenEstomatologico.find(e => e.historia_id === 101).observaciones, 'Normal')
})

test('Concurrencia historia: versión correcta responde 200 e incrementa version', async (t) => {
  const prismaMock = createHistoriasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())
  const token = generateToken(1, 10)

  const { response, body } = await putJson(harness, '/api/historias/101', token, { version: 1, motivo_consulta: 'Nuevo motivo' })

  assert.equal(response.status, 200)
  assert.equal(body.version, 2)
  assert.equal(body.motivo_consulta, 'Nuevo motivo')
  assert.equal(prismaMock.__db.historiaClinica.find(x => x.id === 101).version, 2)
})

// ── PUT /api/historias/:historiaId/odontograma/:tipo ──

test('Concurrencia odontograma: version 0 sin fila crea el odontograma con version 1', async (t) => {
  const prismaMock = createHistoriasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())
  const token = generateToken(1, 10)

  const { response, body } = await putJson(harness, '/api/historias/101/odontograma/general_infantil', token, { version: 0, dientes_json: { 55: { estado: 'caries' } } })

  assert.equal(response.status, 200)
  assert.equal(body.version, 1)
  assert.equal(body.tipo, 'GENERAL_INFANTIL')
  const filas = prismaMock.__db.hcOdontograma.filter(o => o.historia_id === 101)
  assert.equal(filas.length, 2)
  assert.equal(prismaMock.__db.hcOdontograma.find(o => o.id === 801).version, 1)   // el adulto no se tocó
})

test('Concurrencia odontograma: version 0 con fila existente responde 409 y no sobrescribe', async (t) => {
  const prismaMock = createHistoriasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())
  const token = generateToken(1, 10)

  const { response, body } = await putJson(harness, '/api/historias/101/odontograma/general_adulto', token, { version: 0, dientes_json: { 21: { estado: 'caries' } } })

  assert.equal(response.status, 409)
  assert.equal(body.error, 'CONFLICTO_VERSION')
  const od = prismaMock.__db.hcOdontograma.find(o => o.id === 801)
  assert.equal(od.dientes_json, '{"11": "S"}')
  assert.equal(od.version, 1)
  assert.equal(prismaMock.__db.hcOdontograma.filter(o => o.historia_id === 101).length, 1)
})

test('Concurrencia odontograma: versión correcta incrementa y la desfasada responde 409 sin escribir', async (t) => {
  const prismaMock = createHistoriasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())
  const token = generateToken(1, 10)

  const ok = await putJson(harness, '/api/historias/101/odontograma/general_adulto', token, { version: 1, dientes_json: { 16: { estado: 'caries' } } })
  assert.equal(ok.response.status, 200)
  assert.equal(ok.body.version, 2)
  assert.equal(ok.body.id, 801)

  const viejo = await putJson(harness, '/api/historias/101/odontograma/general_adulto', token, { version: 1, dientes_json: { 21: { estado: 'ausente' } } })
  assert.equal(viejo.response.status, 409)
  assert.equal(viejo.body.error, 'CONFLICTO_VERSION')

  const od = prismaMock.__db.hcOdontograma.find(o => o.id === 801)
  assert.deepEqual(od.dientes_json, { 16: { estado: 'caries' } })
  assert.equal(od.version, 2)
})

test('Concurrencia odontograma: version como string responde 400 VERSION_REQUERIDA', async (t) => {
  const prismaMock = createHistoriasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())
  const token = generateToken(1, 10)

  const { response, body } = await putJson(harness, '/api/historias/101/odontograma/general_adulto', token, { version: '1', dientes_json: { 21: { estado: 'caries' } } })

  assert.equal(response.status, 400)
  assert.equal(body.error, 'VERSION_REQUERIDA')
  assert.equal(prismaMock.__db.hcOdontograma.find(o => o.id === 801).dientes_json, '{"11": "S"}')
})

test('Concurrencia odontograma: dos guardados seguidos con la versión devuelta no generan conflicto', async (t) => {
  const prismaMock = createHistoriasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())
  const token = generateToken(1, 10)

  const primero = await putJson(harness, '/api/historias/101/odontograma/general_adulto', token, { version: 1, dientes_json: { 26: { estado: 'caries' } } })
  assert.equal(primero.response.status, 200)

  const segundo = await putJson(harness, '/api/historias/101/odontograma/general_adulto', token, {
    version: primero.body.version,
    dientes_json: { 26: { estado: 'caries' }, 27: { estado: 'caries' } }
  })
  assert.equal(segundo.response.status, 200)
  assert.equal(segundo.body.version, 3)
})

// ── Regresión: dos sesiones sobre el mismo odontograma (lost update) ──

test('Concurrencia odontograma (regresión A/B): el hallazgo de B sobrevive aunque A guarde con la vista vieja', async (t) => {
  const prismaMock = createHistoriasPrismaMock()
  // Segunda persona del mismo consultorio: asistente con permiso para editar el odontograma
  prismaMock.__db.usuario.push({ id: 3, consultorio_id: 10, email: 'asistente@oralyn.test', password_hash: 'hash', nombre: 'Asistente', rol: 'ASISTENTE_ODONTOLOGO', activo: true, token_version: 0 })
  prismaMock.__db.hcOdontograma.find(o => o.id === 801).dientes_json = { 11: { estado: 'restauracion' } }
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())
  const tokenA = generateToken(1, 10)   // odontóloga
  const tokenB = generateToken(3, 10)   // asistente

  // Las dos sesiones cargan la historia (odontograma en version 1)
  const cargar = async (token) => (await harness.request('/api/historias/detalle/101', { headers: { Authorization: `Bearer ${token}` } })).body.odontogramas[0]
  const vistaA = await cargar(tokenA)
  const vistaB = await cargar(tokenB)
  assert.equal(vistaA.version, 1)
  assert.equal(vistaB.version, 1)

  // B marca el 16 como caries y guarda
  const guardadoB = await putJson(harness, '/api/historias/101/odontograma/general_adulto', tokenB, {
    version: vistaB.version, dientes_json: { ...vistaB.dientes_json, 16: { estado: 'caries' } }
  })
  assert.equal(guardadoB.response.status, 200)

  // A, con su vista de antes, marca el 21 y guarda: debe ser rechazado
  const guardadoA = await putJson(harness, '/api/historias/101/odontograma/general_adulto', tokenA, {
    version: vistaA.version, dientes_json: { ...vistaA.dientes_json, 21: { estado: 'ausente' } }
  })
  assert.equal(guardadoA.response.status, 409)
  assert.equal(guardadoA.body.error, 'CONFLICTO_VERSION')
  assert.deepEqual(prismaMock.__db.hcOdontograma.find(o => o.id === 801).dientes_json, { 11: { estado: 'restauracion' }, 16: { estado: 'caries' } })

  // A recarga y vuelve a guardar: ahora quedan los tres dientes
  const recargadaA = await cargar(tokenA)
  assert.equal(recargadaA.version, 2)
  const reintentoA = await putJson(harness, '/api/historias/101/odontograma/general_adulto', tokenA, {
    version: recargadaA.version, dientes_json: { ...recargadaA.dientes_json, 21: { estado: 'ausente' } }
  })
  assert.equal(reintentoA.response.status, 200)
  assert.equal(reintentoA.body.version, 3)
  assert.deepEqual(prismaMock.__db.hcOdontograma.find(o => o.id === 801).dientes_json, {
    11: { estado: 'restauracion' }, 16: { estado: 'caries' }, 21: { estado: 'ausente' }
  })
})

// ─────────────────────────────────────────────────────────────
// 13. Evoluciones: versión, anulación y bloqueo del borrado
// ─────────────────────────────────────────────────────────────

async function patchJson(harness, url, token, payload) {
  return harness.request(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

const URL_EV_701 = '/api/historias/101/evoluciones/701'

test('Evolución PUT: sin version, con "1" (string), true o 0 responde 400 VERSION_REQUERIDA y no escribe', async (t) => {
  const prismaMock = createHistoriasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())
  const token = generateToken(1, 10)

  for (const [caso, extra] of [['sin version', {}], ['string "1"', { version: '1' }], ['booleano true', { version: true }], ['cero', { version: 0 }]]) {
    const { response, body } = await putJson(harness, URL_EV_701, token, { procedimiento: `Intento ${caso}`, ...extra })
    assert.equal(response.status, 400, caso)
    assert.equal(body.error, 'VERSION_REQUERIDA', caso)
  }

  const ev = prismaMock.__db.hojaEvolucion.find(e => e.id === 701)
  assert.equal(ev.procedimiento, 'Limpieza dental')
  assert.equal(ev.version, 1)
})

test('Evolución PUT: versión desfasada responde 409 CONFLICTO_VERSION y no escribe', async (t) => {
  const prismaMock = createHistoriasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())
  const token = generateToken(1, 10)

  prismaMock.__db.hojaEvolucion.find(e => e.id === 701).version = 2

  const { response, body } = await putJson(harness, URL_EV_701, token, { version: 1, procedimiento: 'Con vista vieja' })

  assert.equal(response.status, 409)
  assert.equal(body.error, 'CONFLICTO_VERSION')
  const ev = prismaMock.__db.hojaEvolucion.find(e => e.id === 701)
  assert.equal(ev.procedimiento, 'Limpieza dental')
  assert.equal(ev.version, 2)
})

test('Evolución PUT: versión correcta responde 200 con version + 1, ausente no toca, null borra y audita las diferencias', async (t) => {
  const prismaMock = createHistoriasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())
  const token = generateToken(1, 10)

  const ev0 = prismaMock.__db.hojaEvolucion.find(e => e.id === 701)
  ev0.proximo_control = new Date('2026-09-01T00:00:00Z')
  ev0.doctor = 'Dr. Original'

  const { response, body } = await putJson(harness, URL_EV_701, token, {
    version: 1,
    procedimiento: 'Profilaxis',
    observaciones: null,       // null explícito: se borra
    proximo_control: null      // null explícito: se borra
    // doctor y fecha ausentes: no se tocan
  })

  assert.equal(response.status, 200)
  assert.equal(body.version, 2)
  assert.equal(body.procedimiento, 'Profilaxis')

  const ev = prismaMock.__db.hojaEvolucion.find(e => e.id === 701)
  assert.equal(ev.version, 2)
  assert.equal(ev.observaciones, null)
  assert.equal(ev.proximo_control, null)
  assert.equal(ev.doctor, 'Dr. Original')
  assert.equal(new Date(ev.fecha).toISOString(), '2026-08-02T10:00:00.000Z')

  const audit = prismaMock.__db.auditoria.find(a => a.accion === 'ACTUALIZAR_EVOLUCION')
  assert.ok(audit)
  const campos = audit.metadata.cambios.map(c => c.campo).sort()
  assert.deepEqual(campos, ['observaciones', 'procedimiento', 'proximo_control'])
})

test('Evolución PUT: fecha null responde 400 (la columna es obligatoria)', async (t) => {
  const prismaMock = createHistoriasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())
  const token = generateToken(1, 10)

  const { response } = await putJson(harness, URL_EV_701, token, { version: 1, procedimiento: 'X', fecha: null })

  assert.equal(response.status, 400)
  assert.equal(prismaMock.__db.hojaEvolucion.find(e => e.id === 701).version, 1)
})

test('Evolución PUT: editar una evolución anulada responde 409 EVOLUCION_ANULADA aunque la versión coincida', async (t) => {
  const prismaMock = createHistoriasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())
  const token = generateToken(1, 10)

  Object.assign(prismaMock.__db.hojaEvolucion.find(e => e.id === 701), { anulada: true, version: 2, motivo_anulacion: 'Paciente equivocado' })

  const { response, body } = await putJson(harness, URL_EV_701, token, { version: 2, procedimiento: 'Reescritura' })

  assert.equal(response.status, 409)
  assert.equal(body.error, 'EVOLUCION_ANULADA')
  const ev = prismaMock.__db.hojaEvolucion.find(e => e.id === 701)
  assert.equal(ev.procedimiento, 'Limpieza dental')
  assert.equal(ev.version, 2)
})

test('Evolución anular: sin motivo (ausente o en blanco) responde 400 MOTIVO_REQUERIDO; sin version, 400 VERSION_REQUERIDA', async (t) => {
  const prismaMock = createHistoriasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())
  const token = generateToken(1, 10)

  for (const payload of [{ version: 1 }, { version: 1, motivo: '   ' }]) {
    const { response, body } = await patchJson(harness, `${URL_EV_701}/anular`, token, payload)
    assert.equal(response.status, 400)
    assert.equal(body.error, 'MOTIVO_REQUERIDO')
  }

  const sinVersion = await patchJson(harness, `${URL_EV_701}/anular`, token, { motivo: 'Error de registro', version: '1' })
  assert.equal(sinVersion.response.status, 400)
  assert.equal(sinVersion.body.error, 'VERSION_REQUERIDA')

  const ev = prismaMock.__db.hojaEvolucion.find(e => e.id === 701)
  assert.equal(ev.anulada, false)
  assert.equal(ev.version, 1)
})

test('Evolución anular: correcto marca anulada, quién y cuándo, incrementa versión, audita y sigue en las lecturas', async (t) => {
  const prismaMock = createHistoriasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())
  const token = generateToken(1, 10)

  const { response, body } = await patchJson(harness, `${URL_EV_701}/anular`, token, { motivo: 'Registrada en el paciente equivocado', version: 1 })

  assert.equal(response.status, 200)
  assert.equal(body.anulada, true)
  assert.equal(body.version, 2)
  assert.equal(body.anulada_por, 1)
  assert.equal(body.motivo_anulacion, 'Registrada en el paciente equivocado')
  assert.ok(body.anulada_en)
  assert.equal(body.procedimiento, 'Limpieza dental')   // el contenido clínico se conserva

  const audit = prismaMock.__db.auditoria.find(a => a.accion === 'ANULAR_EVOLUCION')
  assert.ok(audit)
  assert.equal(audit.metadata.motivo, 'Registrada en el paciente equivocado')

  const lista = await harness.request('/api/historias/101/evoluciones', { headers: { Authorization: `Bearer ${token}` } })
  assert.equal(lista.body.length, 1)
  assert.equal(lista.body[0].anulada, true)
  assert.equal(lista.body[0].procedimiento, 'Limpieza dental')

  const detalle = await harness.request('/api/historias/detalle/101', { headers: { Authorization: `Bearer ${token}` } })
  assert.equal(detalle.body.evoluciones[0].anulada, true)
  assert.equal(detalle.body.evoluciones[0].motivo_anulacion, 'Registrada en el paciente equivocado')
})

test('Evolución anular: anular dos veces responde 409 EVOLUCION_ANULADA y conserva el primer motivo', async (t) => {
  const prismaMock = createHistoriasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())
  const token = generateToken(1, 10)

  const primera = await patchJson(harness, `${URL_EV_701}/anular`, token, { motivo: 'Primer motivo', version: 1 })
  assert.equal(primera.response.status, 200)

  const segunda = await patchJson(harness, `${URL_EV_701}/anular`, token, { motivo: 'Segundo motivo', version: primera.body.version })
  assert.equal(segunda.response.status, 409)
  assert.equal(segunda.body.error, 'EVOLUCION_ANULADA')

  const ev = prismaMock.__db.hojaEvolucion.find(e => e.id === 701)
  assert.equal(ev.motivo_anulacion, 'Primer motivo')
  assert.equal(ev.version, 2)
})

test('Evolución anular: evolución inexistente responde 404', async (t) => {
  const harness = await startAppWithPrisma(createHistoriasPrismaMock())
  t.after(() => harness.close())
  const token = generateToken(1, 10)

  const { response } = await patchJson(harness, '/api/historias/101/evoluciones/999/anular', token, { motivo: 'X', version: 1 })
  assert.equal(response.status, 404)
})

test('Evolución POST: guarda creado_por con el usuario y creado_en con la hora actual', async (t) => {
  const prismaMock = createHistoriasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())
  const token = generateToken(1, 10)

  const antes = Date.now()
  const { response, body } = await harness.request('/api/historias/101/evoluciones', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ procedimiento: 'Resina' })
  })

  assert.equal(response.status, 201)
  const ev = prismaMock.__db.hojaEvolucion.find(e => e.id === body.id)
  assert.equal(ev.creado_por, 1)
  assert.ok(ev.creado_en instanceof Date)
  assert.ok(ev.creado_en.getTime() >= antes && ev.creado_en.getTime() <= Date.now())
})

test('Evolución (regresión A/B): la edición de B sobrevive aunque A guarde con la vista vieja', async (t) => {
  const prismaMock = createHistoriasPrismaMock()
  prismaMock.__db.usuario.push({ id: 3, consultorio_id: 10, email: 'asistente@oralyn.test', password_hash: 'hash', nombre: 'Asistente', rol: 'ASISTENTE_ODONTOLOGO', activo: true, token_version: 0 })
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())
  const tokenA = generateToken(1, 10)   // odontóloga
  const tokenB = generateToken(3, 10)   // asistente

  const cargar = async (token) => (await harness.request('/api/historias/101/evoluciones', { headers: { Authorization: `Bearer ${token}` } })).body[0]
  const vistaA = await cargar(tokenA)
  const vistaB = await cargar(tokenB)
  assert.equal(vistaA.version, 1)
  assert.equal(vistaB.version, 1)

  // B corrige las observaciones y guarda
  const guardadoB = await putJson(harness, URL_EV_701, tokenB, { version: vistaB.version, procedimiento: vistaB.procedimiento, observaciones: 'Sangrado leve (B)' })
  assert.equal(guardadoB.response.status, 200)

  // A, con su vista de antes, cambia el procedimiento: debe ser rechazado
  const guardadoA = await putJson(harness, URL_EV_701, tokenA, { version: vistaA.version, procedimiento: 'Profilaxis (A)', observaciones: vistaA.observaciones })
  assert.equal(guardadoA.response.status, 409)
  assert.equal(guardadoA.body.error, 'CONFLICTO_VERSION')
  assert.equal(prismaMock.__db.hojaEvolucion.find(e => e.id === 701).observaciones, 'Sangrado leve (B)')

  // A recarga y vuelve a guardar: quedan los dos cambios
  const recargadaA = await cargar(tokenA)
  assert.equal(recargadaA.version, 2)
  const reintentoA = await putJson(harness, URL_EV_701, tokenA, { version: recargadaA.version, procedimiento: 'Profilaxis (A)', observaciones: recargadaA.observaciones })
  assert.equal(reintentoA.response.status, 200)
  assert.equal(reintentoA.body.version, 3)
  const ev = prismaMock.__db.hojaEvolucion.find(e => e.id === 701)
  assert.equal(ev.procedimiento, 'Profilaxis (A)')
  assert.equal(ev.observaciones, 'Sangrado leve (B)')
})

// ── Nombre de quien anuló (anulada_por_nombre) ──

test('Evolución anulada: PATCH, listado y detalle devuelven anulada_por_nombre', async (t) => {
  const prismaMock = createHistoriasPrismaMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())
  const token = generateToken(1, 10)
  const auth = { headers: { Authorization: `Bearer ${token}` } }

  const anular = await patchJson(harness, `${URL_EV_701}/anular`, token, { motivo: 'Duplicada', version: 1 })
  assert.equal(anular.response.status, 200)
  assert.equal(anular.body.anulada_por, 1)
  assert.equal(anular.body.anulada_por_nombre, 'Dra. Test')

  const lista = await harness.request('/api/historias/101/evoluciones', auth)
  assert.equal(lista.body[0].anulada_por_nombre, 'Dra. Test')

  const detalle = await harness.request('/api/historias/detalle/101', auth)
  assert.equal(detalle.body.evoluciones[0].anulada_por_nombre, 'Dra. Test')
})

test('Evolución anulada: los nombres se resuelven con una sola consulta { id: { in } } y solo del mismo consultorio', async (t) => {
  const prismaMock = createHistoriasPrismaMock()
  prismaMock.__db.usuario.push({ id: 3, consultorio_id: 10, email: 'asistente@oralyn.test', password_hash: 'hash', nombre: 'Asistente', rol: 'ASISTENTE_ODONTOLOGO', activo: true, token_version: 0 })
  prismaMock.__db.hojaEvolucion.push(
    { id: 703, historia_id: 101, fecha: new Date('2026-08-03T10:00:00Z'), procedimiento: 'Resina', version: 2, anulada: true, anulada_por: 3, motivo_anulacion: 'Error' },
    // anulada_por apunta a un usuario de otro consultorio: no se debe filtrar su nombre
    { id: 704, historia_id: 101, fecha: new Date('2026-08-04T10:00:00Z'), procedimiento: 'Sellante', version: 2, anulada: true, anulada_por: 2, motivo_anulacion: 'Error' }
  )
  Object.assign(prismaMock.__db.hojaEvolucion.find(e => e.id === 701), { anulada: true, anulada_por: 1, version: 2 })

  const consultasIn = []
  const findManyOriginal = prismaMock.usuario.findMany
  prismaMock.usuario.findMany = async (args) => {
    if (args?.where?.id?.in) consultasIn.push(args)
    return findManyOriginal(args)
  }

  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())
  const token = generateToken(1, 10)

  const { response, body } = await harness.request('/api/historias/101/evoluciones', { headers: { Authorization: `Bearer ${token}` } })

  assert.equal(response.status, 200)
  const nombre = (id) => body.find(e => e.id === id).anulada_por_nombre
  assert.equal(nombre(701), 'Dra. Test')
  assert.equal(nombre(703), 'Asistente')
  assert.equal(nombre(704), null)

  assert.equal(consultasIn.length, 1)
  assert.deepEqual([...consultasIn[0].where.id.in].sort(), [1, 2, 3])
  assert.equal(consultasIn[0].where.consultorio_id, 10)
})

test('Evolución no anulada: anulada_por_nombre es null y no se consulta Usuario', async (t) => {
  const prismaMock = createHistoriasPrismaMock()
  let consultasIn = 0
  const findManyOriginal = prismaMock.usuario.findMany
  prismaMock.usuario.findMany = async (args) => {
    if (args?.where?.id?.in) consultasIn += 1
    return findManyOriginal(args)
  }
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())
  const token = generateToken(1, 10)

  const { body } = await harness.request('/api/historias/101/evoluciones', { headers: { Authorization: `Bearer ${token}` } })
  assert.equal(body[0].anulada_por_nombre, null)
  assert.equal(consultasIn, 0)
})
