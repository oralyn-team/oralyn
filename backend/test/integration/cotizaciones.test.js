const test = require('node:test')
const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')

const { startAppWithPrisma } = require('../helpers/appHarness')
const { createCotizacionesPrismaMock } = require('../helpers/mockPrisma')

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

function payloadBase(overrides = {}) {
  return {
    paciente_id: 1,
    tipo_tratamiento: 'rehabilitacion',
    prioridad: 'alta',
    estado: 'aprobado',
    motivo: 'Plan integral',
    observaciones: 'Primera fase',
    procedimientos: [
      {
        procedimiento: 'Corona',
        cantidad: 2,
        valor_unitario: 100000,
        descuento: 10,
        aplica_en: 'dientes',
        dientes: [11, 12]
      },
      {
        procedimiento: 'Limpieza',
        cantidad: 1,
        valor_unitario: 50000
      }
    ],
    pagos: [
      {
        monto: 80000,
        metodo_pago: 'efectivo',
        referencia: 'REC-1'
      }
    ],
    ...overrides
  }
}

test('cotizaciones rechaza solicitudes sin token', async (t) => {
  const harness = await startAppWithPrisma(createCotizacionesPrismaMock())
  t.after(() => harness.close())

  const { response, body } = await harness.request('/api/cotizaciones/paciente/1')

  assert.equal(response.status, 401)
  assert.equal(body.error, 'Token requerido')
})

test('cotizaciones crea tratamientos calculando subtotales, total, pago y saldo', async (t) => {
  const prisma = createCotizacionesPrismaMock()
  const harness = await startAppWithPrisma(prisma)
  t.after(() => harness.close())

  const { response, body } = await harness.request('/api/cotizaciones', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payloadBase())
  })

  assert.equal(response.status, 201)
  assert.equal(body.estado, 'aprobado')
  assert.equal(body.total, 230000)
  assert.equal(body.total_pagado, 80000)
  assert.equal(body.saldo, 150000)
  assert.equal(body.procedimientos.length, 2)
  assert.equal(body.procedimientos[0].subtotal, 180000)
  assert.equal(body.procedimientos[1].subtotal, 50000)
  assert.equal(body.pagos.length, 1)
  assert.equal(prisma.__db.cotizaciones.length, 1)
})

test('cotizaciones no permite crear tratamiento para paciente de otro consultorio', async (t) => {
  const harness = await startAppWithPrisma(createCotizacionesPrismaMock())
  t.after(() => harness.close())

  const { response, body } = await harness.request('/api/cotizaciones', {
    method: 'POST',
    headers: authHeaders(10),
    body: JSON.stringify(payloadBase({ paciente_id: 2 }))
  })

  assert.equal(response.status, 404)
  assert.equal(body.error, 'Paciente no encontrado')
})

test('cotizaciones permite leer, editar y eliminar por las rutas usadas por el frontend', async (t) => {
  const harness = await startAppWithPrisma(createCotizacionesPrismaMock())
  t.after(() => harness.close())

  const creada = await harness.request('/api/cotizaciones', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payloadBase())
  })

  const id = creada.body.id

  const detalle = await harness.request(`/api/cotizaciones/${id}`, {
    headers: authHeaders()
  })
  assert.equal(detalle.response.status, 200)
  assert.equal(detalle.body.id, id)

  const actualizada = await harness.request(`/api/cotizaciones/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payloadBase({
      estado: 'en_proceso',
      procedimientos: [
        {
          procedimiento: 'Carilla',
          cantidad: 1,
          valor_unitario: 120000
        }
      ],
      pagos: []
    }))
  })
  assert.equal(actualizada.response.status, 200)
  assert.equal(actualizada.body.estado, 'en_proceso')
  assert.equal(actualizada.body.total, 120000)
  assert.equal(actualizada.body.procedimientos.length, 1)

  const eliminada = await harness.request(`/api/cotizaciones/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  })
  assert.equal(eliminada.response.status, 204)

  const despues = await harness.request(`/api/cotizaciones/${id}`, {
    headers: authHeaders()
  })
  assert.equal(despues.response.status, 404)
})

test('pagos registra abonos contra una cotización y recalcula el saldo', async (t) => {
  const prisma = createCotizacionesPrismaMock()
  const harness = await startAppWithPrisma(prisma)
  t.after(() => harness.close())

  const creada = await harness.request('/api/cotizaciones', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payloadBase({ pagos: [] }))
  })

  const cotizacionId = creada.body.id

  const pago = await harness.request('/api/pagos', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      paciente_id: 1,
      cotizacion_id: cotizacionId,
      monto: 50000,
      metodo_pago: 'nequi',
      referencia: 'NQ-1'
    })
  })

  assert.equal(pago.response.status, 201)
  assert.equal(pago.body.monto, 50000)

  const cotizacion = prisma.__db.cotizaciones.find((c) => c.id === cotizacionId)
  assert.equal(cotizacion.total_pagado, 50000)
  assert.equal(cotizacion.saldo, 180000)
})
