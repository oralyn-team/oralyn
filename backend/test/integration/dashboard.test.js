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

function createDashboardMock() {
  const today = new Date()
  
  // Fechas dinámicas para asegurar consistencia
  const fechaHoyPendiente = new Date(today)
  fechaHoyPendiente.setHours(9, 0, 0, 0)

  const fechaHoyAsistio = new Date(today)
  fechaHoyAsistio.setHours(14, 0, 0, 0)

  const fechaManana = new Date(today)
  fechaManana.setDate(today.getDate() + 1)
  fechaManana.setHours(10, 0, 0, 0)

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
    cita: [
      {
        id: 201,
        consultorio_id: 10,
        paciente_id: 5,
        fecha_hora: fechaHoyPendiente,
        procedimiento: 'Cita hoy pendiente',
        estado: 'pendiente'
      },
      {
        id: 202,
        consultorio_id: 10,
        paciente_id: 5,
        fecha_hora: fechaHoyAsistio,
        procedimiento: 'Cita hoy asistió',
        estado: 'asistio'
      },
      {
        id: 203,
        consultorio_id: 10,
        paciente_id: 5,
        fecha_hora: fechaManana,
        procedimiento: 'Cita mañana',
        estado: 'pendiente'
      },
      {
        id: 204,
        consultorio_id: 99,
        paciente_id: 6,
        fecha_hora: fechaHoyPendiente,
        procedimiento: 'Cita ajena hoy',
        estado: 'pendiente'
      }
    ],
    cotizacion: [
      { id: 701, consultorio_id: 10, paciente_id: 5, total: 500000, estado: 'aprobado' },
      { id: 702, consultorio_id: 10, paciente_id: 5, total: 300000, estado: 'borrador' }, // No aprobada, no cuenta para deuda
      { id: 703, consultorio_id: 99, paciente_id: 6, total: 900000, estado: 'aprobado' }  // Ajena
    ],
    pago: [
      { id: 801, consultorio_id: 10, paciente_id: 5, monto: 200000, cotizacion_id: 701 } // Deuda neta = 500k - 200k = 300k (debe contar como paciente con deuda)
    ]
  })
}

// ─────────────────────────────────────────────────────────────
// 1. Métricas e Integridad del Dashboard
// ─────────────────────────────────────────────────────────────

test('Dashboard: Obtiene métricas correctas del consultorio autenticado', async (t) => {
  const harness = await startAppWithPrisma(createDashboardMock())
  t.after(() => harness.close())

  const tokenA = generateToken(1, 10)

  const { response, body } = await harness.request('/api/dashboard', {
    headers: { Authorization: `Bearer ${tokenA}` }
  })

  assert.equal(response.status, 200)
  assert.ok(body.resumen)
  
  // Total de citas hoy del consultorio 10: cita 201 y 202 (203 es mañana, 204 es consultorio 99)
  assert.equal(body.resumen.total_citas_hoy, 2)
  assert.equal(body.resumen.citas_pendientes, 1)
  assert.equal(body.resumen.citas_atendidas, 1)
  assert.equal(body.resumen.citas_canceladas, 0)

  // Total de pacientes del consultorio 10: 1 (paciente 5)
  assert.equal(body.resumen.total_pacientes, 1)

  // Pacientes con deuda del consultorio 10: 1 (paciente 5 tiene deuda neta de 300,000)
  assert.equal(body.resumen.pacientes_con_deuda, 1)

  // Estructura de citas de hoy
  assert.ok(Array.isArray(body.citas_hoy))
  assert.equal(body.citas_hoy.length, 2)
  assert.equal(body.citas_hoy[0].id, 201)
  assert.equal(body.citas_hoy[1].id, 202)
  assert.ok(body.citas_hoy[0].paciente)
  assert.equal(body.citas_hoy[0].paciente.nombres, 'Carlos')
})

test('Dashboard: Deuda saldada disminuye a cero el conteo de pacientes con deuda', async (t) => {
  const prismaMock = createDashboardMock()
  
  // Agregar otro pago de 300k para saldar la deuda de 500k
  prismaMock.__db.pago.push({
    id: 802,
    consultorio_id: 10,
    paciente_id: 5,
    monto: 300000,
    cotizacion_id: 701
  })

  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const tokenA = generateToken(1, 10)

  const { response, body } = await harness.request('/api/dashboard', {
    headers: { Authorization: `Bearer ${tokenA}` }
  })

  assert.equal(response.status, 200)
  // Deuda total = 500k - (200k + 300k) = 0. No cuenta como paciente con deuda.
  assert.equal(body.resumen.pacientes_con_deuda, 0)
})

// ─────────────────────────────────────────────────────────────
// 2. Aislamiento Cross-Tenant
// ─────────────────────────────────────────────────────────────

test('Aislamiento Dashboard: No mezcla citas, pacientes ni deudas de otros consultorios', async (t) => {
  const harness = await startAppWithPrisma(createDashboardMock())
  t.after(() => harness.close())

  const tokenB = generateToken(2, 99) // Usuario del consultorio 99

  const { response, body } = await harness.request('/api/dashboard', {
    headers: { Authorization: `Bearer ${tokenB}` }
  })

  assert.equal(response.status, 200)
  
  // Consultorio 99 solo tiene cita 204 hoy
  assert.equal(body.resumen.total_citas_hoy, 1)
  assert.equal(body.resumen.citas_pendientes, 1)
  assert.equal(body.resumen.total_pacientes, 1) // paciente 6

  // Paciente 6 tiene cotización de 900k y 0 pagos. Tiene deuda.
  assert.equal(body.resumen.pacientes_con_deuda, 1)

  assert.equal(body.citas_hoy.length, 1)
  assert.equal(body.citas_hoy[0].id, 204)
})
