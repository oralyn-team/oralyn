const express = require('express')
const prisma = require('../lib/prisma')
const verificarToken = require('../middlewares/auth')
const { calcularSemaforoInsumo } = require('../utils/semaforo')

const router = express.Router()

// Todas las rutas requieren autenticación
router.use(verificarToken)

// GET /api/insumos/alertas — listar insumos en estado de alerta (amarillo o rojo en cualquier eje)
router.get('/alertas', async (req, res) => {
  try {
    const insumos = await prisma.insumo.findMany({
      where: {
        consultorio_id: req.usuario.consultorio_id,
        activo: true
      },
      orderBy: { nombre: 'asc' }
    })

    const insumosConSemaforo = insumos.map(calcularSemaforoInsumo)

    const alertas = insumosConSemaforo.filter(
      i =>
        i.color_vencimiento === 'amarillo' ||
        i.color_vencimiento === 'rojo' ||
        i.color_stock === 'amarillo' ||
        i.color_stock === 'rojo'
    )

    res.json(alertas)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// POST /api/insumos — crear insumo
router.post('/', async (req, res) => {
  const {
    nombre,
    categoria,
    unidad_medida,
    lote,
    registro_invima,
    fabricante,
    proveedor,
    cantidad_actual,
    stock_minimo,
    fecha_vencimiento,
    fecha_apertura,
    ubicacion,
    activo
  } = req.body

  if (
    !nombre ||
    !unidad_medida ||
    cantidad_actual === undefined ||
    stock_minimo === undefined ||
    isNaN(Number(cantidad_actual)) ||
    isNaN(Number(stock_minimo))
  ) {
    return res.status(400).json({ error: 'Faltan campos obligatorios o los valores numéricos son inválidos' })
  }

  try {
    const nuevoInsumo = await prisma.insumo.create({
      data: {
        consultorio_id: req.usuario.consultorio_id,
        nombre,
        categoria: categoria || null,
        unidad_medida,
        lote: lote || null,
        registro_invima: registro_invima || null,
        fabricante: fabricante || null,
        proveedor: proveedor || null,
        cantidad_actual: Number(cantidad_actual),
        stock_minimo: Number(stock_minimo),
        fecha_vencimiento: fecha_vencimiento ? new Date(fecha_vencimiento) : null,
        fecha_apertura: fecha_apertura ? new Date(fecha_apertura) : null,
        ubicacion: ubicacion || null,
        activo: activo !== undefined ? Boolean(activo) : true
      }
    })

    res.status(201).json(calcularSemaforoInsumo(nuevoInsumo))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/insumos — listar todos los insumos activos del consultorio
router.get('/', async (req, res) => {
  try {
    const insumos = await prisma.insumo.findMany({
      where: {
        consultorio_id: req.usuario.consultorio_id,
        activo: true
      },
      orderBy: { nombre: 'asc' }
    })

    const resultado = insumos.map(calcularSemaforoInsumo)
    res.json(resultado)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/insumos/:id — detalle de insumo con movimientos
router.get('/:id', async (req, res) => {
  const { id } = req.params

  try {
    const insumo = await prisma.insumo.findFirst({
      where: {
        id,
        consultorio_id: req.usuario.consultorio_id
      },
      include: {
        movimientos: {
          orderBy: { fecha: 'desc' }
        }
      }
    })

    if (!insumo) {
      return res.status(404).json({ error: 'Insumo no encontrado' })
    }

    res.json(calcularSemaforoInsumo(insumo))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// PUT /api/insumos/:id — editar insumo
router.put('/:id', async (req, res) => {
  const { id } = req.params
  const datos = { ...req.body }

  try {
    const existe = await prisma.insumo.findFirst({
      where: {
        id,
        consultorio_id: req.usuario.consultorio_id
      }
    })

    if (!existe) {
      return res.status(404).json({ error: 'Insumo no encontrado' })
    }

    delete datos.consultorio_id
    delete datos.id
    delete datos.creado_en
    delete datos.actualizado_en
    delete datos.movimientos
    delete datos.cantidad_actual // Opción A: los cambios de cantidad deben ir obligatoriamente por /movimiento

    if (datos.stock_minimo !== undefined) {
      if (isNaN(Number(datos.stock_minimo)) || Number(datos.stock_minimo) < 0) {
        return res.status(400).json({ error: 'El valor de stock_minimo debe ser un número válido' })
      }
      datos.stock_minimo = Number(datos.stock_minimo)
    }

    if (datos.fecha_vencimiento) datos.fecha_vencimiento = new Date(datos.fecha_vencimiento)
    if (datos.fecha_apertura) datos.fecha_apertura = new Date(datos.fecha_apertura)

    const insumoActualizado = await prisma.insumo.update({
      where: { id },
      data: datos
    })

    res.json(calcularSemaforoInsumo(insumoActualizado))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// POST /api/insumos/:id/movimiento — registrar movimiento (transaccional)
router.post('/:id/movimiento', async (req, res) => {
  const { id } = req.params
  const { tipo, cantidad, motivo, usuario_id } = req.body

  if (!tipo || cantidad === undefined || isNaN(Number(cantidad)) || Number(cantidad) < 0) {
    return res.status(400).json({ error: 'Tipo y cantidad válida son requeridos' })
  }

  const tiposValidos = ['entrada', 'salida', 'ajuste']
  if (!tiposValidos.includes(tipo)) {
    return res.status(400).json({ error: 'El tipo debe ser entrada, salida o ajuste' })
  }

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const insumo = await tx.insumo.findFirst({
        where: {
          id,
          consultorio_id: req.usuario.consultorio_id
        }
      })

      if (!insumo) {
        const err = new Error('Insumo no encontrado')
        err.statusCode = 404
        throw err
      }

      const cantMov = Number(cantidad)
      let nuevaCantidad = Number(insumo.cantidad_actual)

      if (tipo === 'entrada') {
        nuevaCantidad += cantMov
      } else if (tipo === 'salida') {
        if (nuevaCantidad < cantMov) {
          const err = new Error('Cantidad insuficiente en inventario')
          err.statusCode = 400
          throw err
        }
        nuevaCantidad -= cantMov
      } else if (tipo === 'ajuste') {
        nuevaCantidad = cantMov
      }

      const usuarioIdRegistro = req.usuario && req.usuario.id ? String(req.usuario.id) : (usuario_id || null)

      const movimiento = await tx.movimientoInsumo.create({
        data: {
          insumo_id: id,
          tipo,
          cantidad: cantMov,
          motivo: motivo || null,
          usuario_id: usuarioIdRegistro
        }
      })

      const insumoActualizado = await tx.insumo.update({
        where: { id },
        data: { cantidad_actual: nuevaCantidad }
      })

      return { insumo: insumoActualizado, movimiento }
    })

    res.status(201).json({
      ...resultado.movimiento,
      insumo: calcularSemaforoInsumo(resultado.insumo)
    })
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message })
    }
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// DELETE /api/insumos/:id — eliminación lógica (activo = false)
router.delete('/:id', async (req, res) => {
  const { id } = req.params

  try {
    const existe = await prisma.insumo.findFirst({
      where: {
        id,
        consultorio_id: req.usuario.consultorio_id
      }
    })

    if (!existe) {
      return res.status(404).json({ error: 'Insumo no encontrado' })
    }

    await prisma.insumo.update({
      where: { id },
      data: { activo: false }
    })

    res.json({ mensaje: 'Insumo desactivado correctamente' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

module.exports = router
