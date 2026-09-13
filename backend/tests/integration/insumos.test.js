const { describe, it, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const { resetStore, store, prisma } = require('../helpers/mockPrisma')
const { generarToken, startServer, request } = require('../helpers/appHarness')

describe('Suite de pruebas de integración - Módulo de Insumos', () => {
  let serverInfo
  let baseURL
  let tokenConsultorioA
  let tokenConsultorioB

  before(async () => {
    serverInfo = await startServer()
    baseURL = serverInfo.baseURL
    tokenConsultorioA = generarToken({ consultorio_id: 1, id: 10, email: 'doctoraA@oralyn.com' })
    tokenConsultorioB = generarToken({ consultorio_id: 2, id: 20, email: 'doctoraB@oralyn.com' })
  })

  after(() => {
    if (serverInfo && serverInfo.server) {
      serverInfo.server.close()
    }
  })

  beforeEach(() => {
    resetStore()
  })

  describe('POST /api/insumos — Crear insumo', () => {
    it('crea un insumo correctamente con consultorio_id del token', async () => {
      const payload = {
        nombre: 'Resina Compuesta A2',
        unidad_medida: 'Jeringa',
        cantidad_actual: 20,
        stock_minimo: 5,
        categoria: 'Restauración',
        fecha_vencimiento: '2027-12-31'
      }

      const res = await request(baseURL, 'POST', '/api/insumos', payload, tokenConsultorioA)
      assert.equal(res.status, 201)
      assert.equal(res.body.nombre, 'Resina Compuesta A2')
      assert.equal(res.body.consultorio_id, 1)
      assert.equal(res.body.color_stock, 'verde')
      assert.equal(res.body.color_vencimiento, 'verde')
    })

    it('rechaza la creación si faltan campos obligatorios', async () => {
      const payloadIncompleto = {
        nombre: 'Guantes de Nitrilo'
        // Faltan unidad_medida, cantidad_actual, stock_minimo
      }

      const res = await request(baseURL, 'POST', '/api/insumos', payloadIncompleto, tokenConsultorioA)
      assert.equal(res.status, 400)
      assert.equal(res.body.error, 'Faltan campos obligatorios o los valores numéricos son inválidos')
    })

    it('rechaza la creación con valores numéricos inválidos', async () => {
      const payloadInvalido = {
        nombre: 'Agujas Cortas',
        unidad_medida: 'Caja',
        cantidad_actual: 'diez',
        stock_minimo: 5
      }

      const res = await request(baseURL, 'POST', '/api/insumos', payloadInvalido, tokenConsultorioA)
      assert.equal(res.status, 400)
      assert.equal(res.body.error, 'Faltan campos obligatorios o los valores numéricos son inválidos')
    })
  })

  describe('GET /api/insumos — Listar insumos y aislamiento multiconsultorio', () => {
    it('solo devuelve insumos del consultorio autenticado (aislamiento A/B)', async () => {
      // Insumos creados en Consultorio A (id: 1)
      await request(baseURL, 'POST', '/api/insumos', {
        nombre: 'Insumo A1', unidad_medida: 'Unidad', cantidad_actual: 10, stock_minimo: 2
      }, tokenConsultorioA)

      await request(baseURL, 'POST', '/api/insumos', {
        nombre: 'Insumo A2', unidad_medida: 'Unidad', cantidad_actual: 15, stock_minimo: 3
      }, tokenConsultorioA)

      // Insumo creado en Consultorio B (id: 2)
      await request(baseURL, 'POST', '/api/insumos', {
        nombre: 'Insumo B1', unidad_medida: 'Unidad', cantidad_actual: 30, stock_minimo: 5
      }, tokenConsultorioB)

      // Usuario A consulta insumos
      const resA = await request(baseURL, 'GET', '/api/insumos', null, tokenConsultorioA)
      assert.equal(resA.status, 200)
      assert.equal(resA.body.length, 2)
      const nombresA = resA.body.map(i => i.nombre)
      assert.ok(nombresA.includes('Insumo A1'))
      assert.ok(nombresA.includes('Insumo A2'))
      assert.ok(!nombresA.includes('Insumo B1'))

      // Usuario B consulta insumos
      const resB = await request(baseURL, 'GET', '/api/insumos', null, tokenConsultorioB)
      assert.equal(resB.status, 200)
      assert.equal(resB.body.length, 1)
      assert.equal(resB.body[0].nombre, 'Insumo B1')
    })
  })

  describe('GET /api/insumos/:id — Detalle y pertenencia a consultorio', () => {
    it('devuelve el detalle del insumo si pertenece al consultorio autenticado', async () => {
      const creado = await request(baseURL, 'POST', '/api/insumos', {
        nombre: 'Alginato', unidad_medida: 'Bolsa', cantidad_actual: 10, stock_minimo: 2
      }, tokenConsultorioA)

      const res = await request(baseURL, 'GET', `/api/insumos/${creado.body.id}`, null, tokenConsultorioA)
      assert.equal(res.status, 200)
      assert.equal(res.body.id, creado.body.id)
      assert.ok(Array.isArray(res.body.movimientos))
    })

    it('retorna 404 si el insumo no existe o pertenece a otro consultorio', async () => {
      const creadoB = await request(baseURL, 'POST', '/api/insumos', {
        nombre: 'Insumo Privado B', unidad_medida: 'Caja', cantidad_actual: 50, stock_minimo: 10
      }, tokenConsultorioB)

      // Intento de acceso desde Consultorio A
      const res404 = await request(baseURL, 'GET', `/api/insumos/${creadoB.body.id}`, null, tokenConsultorioA)
      assert.equal(res404.status, 404)
      assert.equal(res404.body.error, 'Insumo no encontrado')
    })
  })

  describe('PUT /api/insumos/:id — Editar insumo y restricciones de auditoría', () => {
    it('permite editar campos base autorizados', async () => {
      const creado = await request(baseURL, 'POST', '/api/insumos', {
        nombre: 'Alcohol Antiséptico 70%', unidad_medida: 'Litro', cantidad_actual: 8, stock_minimo: 2
      }, tokenConsultorioA)

      const updatePayload = {
        nombre: 'Alcohol Antiséptico 96%',
        ubicacion: 'Estante B2',
        stock_minimo: 3
      }

      const res = await request(baseURL, 'PUT', `/api/insumos/${creado.body.id}`, updatePayload, tokenConsultorioA)
      assert.equal(res.status, 200)
      assert.equal(res.body.nombre, 'Alcohol Antiséptico 96%')
      assert.equal(res.body.ubicacion, 'Estante B2')
      assert.equal(res.body.stock_minimo, 3)
    })

    it('rechaza con 400 si el body de PUT incluye cantidad_actual (Opción A)', async () => {
      const creado = await request(baseURL, 'POST', '/api/insumos', {
        nombre: 'Barriadas Desechables', unidad_medida: 'Paquete', cantidad_actual: 20, stock_minimo: 5
      }, tokenConsultorioA)

      const updatePayloadInvalido = {
        cantidad_actual: 50
      }

      const res = await request(baseURL, 'PUT', `/api/insumos/${creado.body.id}`, updatePayloadInvalido, tokenConsultorioA)
      assert.equal(res.status, 400)
      assert.equal(
        res.body.error,
        'No se puede modificar cantidad_actual directamente. Use POST /insumos/:id/movimiento para registrar cambios de inventario.'
      )
    })

    it('rechaza stock_minimo no numérico', async () => {
      const creado = await request(baseURL, 'POST', '/api/insumos', {
        nombre: 'Gasas Estériles', unidad_medida: 'Caja', cantidad_actual: 100, stock_minimo: 10
      }, tokenConsultorioA)

      const res = await request(baseURL, 'PUT', `/api/insumos/${creado.body.id}`, { stock_minimo: 'invalido' }, tokenConsultorioA)
      assert.equal(res.status, 400)
      assert.equal(res.body.error, 'El valor de stock_minimo debe ser un número válido')
    })
  })

  describe('POST /api/insumos/:id/movimiento — Registrar entrada, salida, ajuste y atomicidad', () => {
    it('procesa entrada (suma), salida (resta) y ajuste (reemplaza) creando MovimientoInsumo', async () => {
      const creado = await request(baseURL, 'POST', '/api/insumos', {
        nombre: 'Anestesia Cartuchos', unidad_medida: 'Caja', cantidad_actual: 50, stock_minimo: 10
      }, tokenConsultorioA)

      const id = creado.body.id

      // 1. Entrada de 20
      const resEntrada = await request(baseURL, 'POST', `/api/insumos/${id}/movimiento`, {
        tipo: 'entrada', cantidad: 20, motivo: 'Compra mensual'
      }, tokenConsultorioA)

      assert.equal(resEntrada.status, 201)
      assert.equal(resEntrada.body.tipo, 'entrada')
      assert.equal(resEntrada.body.cantidad, 20)
      assert.equal(resEntrada.body.insumo.cantidad_actual, 70)

      // 2. Salida de 15
      const resSalida = await request(baseURL, 'POST', `/api/insumos/${id}/movimiento`, {
        tipo: 'salida', cantidad: 15, motivo: 'Uso clínico'
      }, tokenConsultorioA)

      assert.equal(resSalida.status, 201)
      assert.equal(resSalida.body.insumo.cantidad_actual, 55)

      // 3. Ajuste a 40
      const resAjuste = await request(baseURL, 'POST', `/api/insumos/${id}/movimiento`, {
        tipo: 'ajuste', cantidad: 40, motivo: 'Inventario físico'
      }, tokenConsultorioA)

      assert.equal(resAjuste.status, 201)
      assert.equal(resAjuste.body.insumo.cantidad_actual, 40)
    })

    it('rechaza una salida que supere el stock disponible (evita stock negativo)', async () => {
      const creado = await request(baseURL, 'POST', '/api/insumos', {
        nombre: 'Cánulas de Succión', unidad_medida: 'Caja', cantidad_actual: 10, stock_minimo: 2
      }, tokenConsultorioA)

      const res = await request(baseURL, 'POST', `/api/insumos/${creado.body.id}/movimiento`, {
        tipo: 'salida', cantidad: 15, motivo: 'Intento de sobre-salida'
      }, tokenConsultorioA)

      assert.equal(res.status, 400)
      assert.equal(res.body.error, 'Cantidad insuficiente en inventario')
    })

    it('mantiene la atomicidad de la transacción (no deja movimientos huérfanos si la transacción falla)', async () => {
      const creado = await request(baseURL, 'POST', '/api/insumos', {
        nombre: 'Ácido Grabador', unidad_medida: 'Jeringa', cantidad_actual: 5, stock_minimo: 1
      }, tokenConsultorioA)

      // Intento de movimiento de salida inválido que provocará falla en la transacción
      await request(baseURL, 'POST', `/api/insumos/${creado.body.id}/movimiento`, {
        tipo: 'salida', cantidad: 100, motivo: 'Falla simulada'
      }, tokenConsultorioA)

      // Verificar que el insumo conserva su cantidad original y no se creó ningún movimiento
      const detalle = await request(baseURL, 'GET', `/api/insumos/${creado.body.id}`, null, tokenConsultorioA)
      assert.equal(detalle.body.cantidad_actual, 5)
      assert.equal(detalle.body.movimientos.length, 0)
    })
  })

  describe('DELETE /api/insumos/:id — Eliminación lógica', () => {
    it('marca activo=false y oculta el insumo en el listado general GET /api/insumos', async () => {
      const creado = await request(baseURL, 'POST', '/api/insumos', {
        nombre: 'Obsoleto Insumo', unidad_medida: 'Unidad', cantidad_actual: 0, stock_minimo: 1
      }, tokenConsultorioA)

      const resDelete = await request(baseURL, 'DELETE', `/api/insumos/${creado.body.id}`, null, tokenConsultorioA)
      assert.equal(resDelete.status, 200)
      assert.equal(resDelete.body.mensaje, 'Insumo desactivado correctamente')

      // Verificar que no aparece en GET /api/insumos
      const resList = await request(baseURL, 'GET', '/api/insumos', null, tokenConsultorioA)
      const ids = resList.body.map(i => i.id)
      assert.ok(!ids.includes(creado.body.id))
    })
  })

  describe('GET /api/insumos/alertas — Filtrado de semáforos', () => {
    it('solo retorna insumos que están en amarillo o rojo en cualquiera de los dos ejes', async () => {
      // 1. Insumo en VERDE total (stock alto, sin vencer)
      await request(baseURL, 'POST', '/api/insumos', {
        nombre: 'Insumo Verde', unidad_medida: 'Caja', cantidad_actual: 100, stock_minimo: 10, fecha_vencimiento: '2028-01-01'
      }, tokenConsultorioA)

      // 2. Insumo en ROJO de stock (cantidad_actual <= stock_minimo)
      await request(baseURL, 'POST', '/api/insumos', {
        nombre: 'Insumo Rojo Stock', unidad_medida: 'Caja', cantidad_actual: 5, stock_minimo: 10, fecha_vencimiento: '2028-01-01'
      }, tokenConsultorioA)

      // 3. Insumo en AMARILLO de vencimiento (vence en ~4 meses desde 2026-09-13 => ~2027-01-15)
      await request(baseURL, 'POST', '/api/insumos', {
        nombre: 'Insumo Amarillo Vencimiento', unidad_medida: 'Caja', cantidad_actual: 100, stock_minimo: 10, fecha_vencimiento: '2027-01-15'
      }, tokenConsultorioA)

      const resAlertas = await request(baseURL, 'GET', '/api/insumos/alertas', null, tokenConsultorioA)
      assert.equal(resAlertas.status, 200)
      assert.equal(resAlertas.body.length, 2)

      const nombres = resAlertas.body.map(i => i.nombre)
      assert.ok(nombres.includes('Insumo Rojo Stock'))
      assert.ok(nombres.includes('Insumo Amarillo Vencimiento'))
      assert.ok(!nombres.includes('Insumo Verde'))
    })
  })
})
