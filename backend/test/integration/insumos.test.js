const test = require('node:test')
const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')

const { startAppWithPrisma } = require('../helpers/appHarness')
const { createUnifiedPrismaMock } = require('../helpers/mockPrisma')

process.env.JWT_SECRET = 'integration-test-secret'
process.env.NODE_ENV = 'test'

function generateToken(userId, consultorioId) {
  return jwt.sign({ id: userId, consultorio_id: consultorioId, email: `doctor${consultorioId}@oralyn.test` }, process.env.JWT_SECRET)
}

function createInsumosMock() {
  const today = new Date()
  const fechaVencimientoProxima = new Date(today)
  fechaVencimientoProxima.setDate(today.getDate() + 10) // < 30 días -> amarillo

  const fechaVencimientoLejana = new Date(today)
  fechaVencimientoLejana.setDate(today.getDate() + 365) // verde (> 6 meses)

  return createUnifiedPrismaMock({
    configuracion: [
      { id: 10, nombre_consultorio: 'Consultorio A', nombre_profesional: 'Dr. A' },
      { id: 99, nombre_consultorio: 'Consultorio B', nombre_profesional: 'Dr. B' }
    ],
    usuario: [
      { id: 1, consultorio_id: 10, email: 'doctorA@oralyn.test', password_hash: 'hash', nombre: 'Dra. A', rol: 'DUENO' },
      { id: 2, consultorio_id: 99, email: 'doctorB@oralyn.test', password_hash: 'hash', nombre: 'Dr. B', rol: 'DUENO' }
    ],
    insumo: [
      {
        id: 'insumo_101',
        consultorio_id: 10,
        nombre: 'Guantes de Nitrilo M',
        categoria: 'Protección',
        unidad_medida: 'Caja',
        cantidad_actual: 50,
        stock_minimo: 10,
        fecha_vencimiento: fechaVencimientoLejana,
        activo: true
      },
      {
        id: 'insumo_102',
        consultorio_id: 10,
        nombre: 'Anestesia Lidocaína 2%',
        categoria: 'Anestesia',
        unidad_medida: 'Caja',
        cantidad_actual: 2,
        stock_minimo: 5,
        fecha_vencimiento: fechaVencimientoProxima,
        activo: true
      },
      {
        id: 'insumo_991',
        consultorio_id: 99,
        nombre: 'Gazas Estériles',
        categoria: 'Desechables',
        unidad_medida: 'Paquete',
        cantidad_actual: 100,
        stock_minimo: 20,
        fecha_vencimiento: fechaVencimientoLejana,
        activo: true
      }
    ],
    movimientoInsumo: [
      {
        id: 'mov_101_1',
        insumo_id: 'insumo_101',
        tipo: 'entrada',
        cantidad: 50,
        motivo: 'Inventario inicial',
        usuario_id: '1',
        fecha: new Date('2026-08-01T10:00:00Z')
      }
    ]
  })
}

// ─────────────────────────────────────────────────────────────
// 1. POST /api/insumos
// ─────────────────────────────────────────────────────────────

test('POST /api/insumos — crea correctamente con consultorio_id del token', async (t) => {
  const prismaMock = createInsumosMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    nombre: 'Resina A2',
    categoria: 'Restauración',
    unidad_medida: 'Jeringa',
    cantidad_actual: 10,
    stock_minimo: 3,
    lote: 'L1234',
    ubicacion: 'Estante B'
  }

  const { response, body } = await harness.request('/api/insumos', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 201)
  assert.equal(body.nombre, 'Resina A2')
  assert.equal(body.consultorio_id, 10)
  assert.equal(body.cantidad_actual, 10)
  assert.equal(body.stock_minimo, 3)

  const dbInsumo = prismaMock.__db.insumo.find(i => i.id === body.id)
  assert.ok(dbInsumo)
  assert.equal(dbInsumo.consultorio_id, 10)
})

test('POST /api/insumos — rechaza campos obligatorios faltantes', async (t) => {
  const harness = await startAppWithPrisma(createInsumosMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    categoria: 'Restauración'
    // falta nombre, unidad_medida, cantidad_actual, stock_minimo
  }

  const { response, body } = await harness.request('/api/insumos', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 400)
  assert.ok(body.error)
})

test('POST /api/insumos — rechaza valores numéricos inválidos', async (t) => {
  const harness = await startAppWithPrisma(createInsumosMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    nombre: 'Agujas Cortas',
    unidad_medida: 'Caja',
    cantidad_actual: -5, // inválido (menor a 0)
    stock_minimo: 'abc' // inválido (no numérico)
  }

  const { response, body } = await harness.request('/api/insumos', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 400)
  assert.ok(body.error)
})

// ─────────────────────────────────────────────────────────────
// 2. GET /api/insumos (Aislamiento Multi-Tenant)
// ─────────────────────────────────────────────────────────────

test('GET /api/insumos — aislamiento explícito entre consultorio 10 y 99', async (t) => {
  const harness = await startAppWithPrisma(createInsumosMock())
  t.after(() => harness.close())

  const token10 = generateToken(1, 10)
  const res10 = await harness.request('/api/insumos', {
    headers: { Authorization: `Bearer ${token10}` }
  })
  assert.equal(res10.response.status, 200)
  assert.equal(res10.body.length, 2)
  assert.ok(res10.body.every(i => i.consultorio_id === 10))

  const token99 = generateToken(2, 99)
  const res99 = await harness.request('/api/insumos', {
    headers: { Authorization: `Bearer ${token99}` }
  })
  assert.equal(res99.response.status, 200)
  assert.equal(res99.body.length, 1)
  assert.equal(res99.body[0].id, 'insumo_991')
})

// ─────────────────────────────────────────────────────────────
// 3. GET /api/insumos/:id
// ─────────────────────────────────────────────────────────────

test('GET /api/insumos/:id — incluye movimientos', async (t) => {
  const harness = await startAppWithPrisma(createInsumosMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const { response, body } = await harness.request('/api/insumos/insumo_101', {
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 200)
  assert.equal(body.id, 'insumo_101')
  assert.ok(Array.isArray(body.movimientos))
  assert.equal(body.movimientos.length, 1)
  assert.equal(body.movimientos[0].id, 'mov_101_1')
})

test('GET /api/insumos/:id — 404 si es de otro consultorio', async (t) => {
  const harness = await startAppWithPrisma(createInsumosMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10) // consultorio 10 solicita insumo de consultorio 99
  const { response } = await harness.request('/api/insumos/insumo_991', {
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 404)
})

// ─────────────────────────────────────────────────────────────
// 4. PUT /api/insumos/:id
// ─────────────────────────────────────────────────────────────

test('PUT /api/insumos/:id — edita campos permitidos', async (t) => {
  const harness = await startAppWithPrisma(createInsumosMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    nombre: 'Guantes Nitrilo L',
    stock_minimo: 15,
    ubicacion: 'Cajón 2'
  }

  const { response, body } = await harness.request('/api/insumos/insumo_101', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 200)
  assert.equal(body.nombre, 'Guantes Nitrilo L')
  assert.equal(body.stock_minimo, 15)
  assert.equal(body.ubicacion, 'Cajón 2')
})

test('PUT /api/insumos/:id — rechaza con 400 si el body incluye cantidad_actual (Opción A)', async (t) => {
  const harness = await startAppWithPrisma(createInsumosMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    cantidad_actual: 100
  }

  const { response, body } = await harness.request('/api/insumos/insumo_101', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 400)
  assert.ok(body.error.includes('cantidad_actual'))
})

test('PUT /api/insumos/:id — rechaza stock_minimo no numérico', async (t) => {
  const harness = await startAppWithPrisma(createInsumosMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const payload = {
    stock_minimo: 'invalido'
  }

  const { response, body } = await harness.request('/api/insumos/insumo_101', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 400)
  assert.ok(body.error)
})

// ─────────────────────────────────────────────────────────────
// 5. POST /api/insumos/:id/movimiento
// ─────────────────────────────────────────────────────────────

test('POST /api/insumos/:id/movimiento — entrada suma, salida resta, ajuste reemplaza; rechaza salida que deje negativo', async (t) => {
  const prismaMock = createInsumosMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  // 1. Entrada de 10 unidades (inicial: 50 -> 60)
  const resEntrada = await harness.request('/api/insumos/insumo_101/movimiento', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ tipo: 'entrada', cantidad: 10, motivo: 'Compra mensual' })
  })
  assert.equal(resEntrada.response.status, 201)
  assert.equal(resEntrada.body.insumo.cantidad_actual, 60)

  // 2. Salida de 20 unidades (60 -> 40)
  const resSalida = await harness.request('/api/insumos/insumo_101/movimiento', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ tipo: 'salida', cantidad: 20, motivo: 'Uso en clínica' })
  })
  assert.equal(resSalida.response.status, 201)
  assert.equal(resSalida.body.insumo.cantidad_actual, 40)

  // 3. Ajuste a 15 unidades (40 -> 15)
  const resAjuste = await harness.request('/api/insumos/insumo_101/movimiento', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ tipo: 'ajuste', cantidad: 15, motivo: 'Conteo físico' })
  })
  assert.equal(resAjuste.response.status, 201)
  assert.equal(resAjuste.body.insumo.cantidad_actual, 15)

  // 4. Salida excesiva (intenta sacar 100 cuando solo hay 15) -> debe fallar con 400
  const resExcess = await harness.request('/api/insumos/insumo_101/movimiento', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ tipo: 'salida', cantidad: 100, motivo: 'Error' })
  })
  assert.equal(resExcess.response.status, 400)
  assert.ok(resExcess.body.error.includes('insuficiente'))

  // Confirmar que el rechazo no dejó rastro: ni cambió la cantidad, ni creó un movimiento fantasma
  const detalleFinal = await harness.request('/api/insumos/insumo_101', {
    headers: { Authorization: `Bearer ${token}` }
  })
  assert.equal(detalleFinal.body.cantidad_actual, 15) // sigue en 15, no se tocó
  assert.equal(detalleFinal.body.movimientos.length, 4) // 1 inicial + entrada + salida + ajuste (nada por el intento fallido)
})

// ─────────────────────────────────────────────────────────────
// 6. DELETE /api/insumos/:id
// ─────────────────────────────────────────────────────────────

test('DELETE /api/insumos/:id — baja lógica, no aparece en GET /api/insumos', async (t) => {
  const harness = await startAppWithPrisma(createInsumosMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)

  const resDel = await harness.request('/api/insumos/insumo_101', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  })
  assert.equal(resDel.response.status, 200)
  assert.ok(resDel.body.mensaje)

  const resGet = await harness.request('/api/insumos', {
    headers: { Authorization: `Bearer ${token}` }
  })
  assert.equal(resGet.response.status, 200)
  assert.equal(resGet.body.length, 1)
  assert.equal(resGet.body[0].id, 'insumo_102')
})

// ─────────────────────────────────────────────────────────────
// 7. GET /api/insumos/alertas
// ─────────────────────────────────────────────────────────────

test('GET /api/insumos/alertas — solo amarillo/rojo en cualquier eje', async (t) => {
  const harness = await startAppWithPrisma(createInsumosMock())
  t.after(() => harness.close())

  const token = generateToken(1, 10)
  const { response, body } = await harness.request('/api/insumos/alertas', {
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(response.status, 200)
  assert.equal(body.length, 1) // solo insumo_102 está en alerta (stock bajo y vencimiento próximo)
  assert.equal(body[0].id, 'insumo_102')
  assert.ok(body[0].color_stock === 'rojo' || body[0].color_vencimiento === 'amarillo')
})
