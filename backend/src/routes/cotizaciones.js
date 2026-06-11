const express = require('express')
const prisma = require('../lib/prisma')
const verificarToken = require('../middlewares/auth')
 
const router = express.Router()
 
router.use(verificarToken)
 
// POST /api/cotizaciones — crear cotización
router.post('/', async (req, res) => {
  const {
    paciente_id,
    doctor_id,
    tipo_tratamiento,
    prioridad,
    motivo,
    observaciones,
    procedimientos  // FIX: era 'items', la relación real se llama 'procedimientos'
  } = req.body
 
  if (!paciente_id || !procedimientos || procedimientos.length === 0) {
    return res.status(400).json({ error: 'Paciente y procedimientos son obligatorios' })
  }
 
  try {
    const paciente = await prisma.paciente.findUnique({ where: { id: paciente_id } })
    if (!paciente) {
      return res.status(404).json({ error: 'Paciente no encontrado' })
    }
 
    // FIX: el subtotal por procedimiento = valor_unitario * cantidad * (1 - descuento/100)
    // Cotizacion no tiene descuento/subtotal a nivel raíz; el descuento es por procedimiento (%)
    const procedimientosData = procedimientos.map((p, index) => {
      const cantidad      = p.cantidad      ?? 1
      const valorUnitario = Number(p.valor_unitario) || 0
      const descuento     = Number(p.descuento)      || 0
      const subtotal      = valorUnitario * cantidad * (1 - descuento / 100)
 
      return {
        procedimiento:  p.procedimiento,
        descripcion:    p.descripcion    ?? null,
        aplica_en:      p.aplica_en      ?? 'general',
        dientes:        p.dientes        ?? [],
        cuadrante:      p.cuadrante      ?? null,
        cantidad,
        valor_unitario: valorUnitario,
        descuento,
        subtotal,
        estado:         p.estado         ?? 'pendiente',
        observaciones:  p.observaciones  ?? null,
        orden:          p.orden          ?? index,
      }
    })
 
    const total = procedimientosData.reduce((sum, p) => sum + p.subtotal, 0)
 
    const cotizacion = await prisma.cotizacion.create({
      data: {
        consultorio_id: req.usuario.consultorio_id,
        paciente_id,
        doctor_id:       doctor_id       ?? null,
        tipo_tratamiento: tipo_tratamiento ?? null,
        prioridad:       prioridad       ?? 'media',
        motivo:          motivo          ?? null,
        observaciones:   observaciones   ?? null,
        total,
        total_pagado: 0,
        saldo:        total,
        // FIX: relación correcta es 'procedimientos', no 'items'
        procedimientos: {
          create: procedimientosData
        }
      },
      include: { procedimientos: true }  // FIX: era 'items'
    })
 
    res.status(201).json(cotizacion)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})
 
// GET /api/cotizaciones/paciente/:pacienteId — cotizaciones del paciente
router.get('/paciente/:pacienteId', async (req, res) => {
  const pacienteId = parseInt(req.params.pacienteId)

  if (isNaN(pacienteId)) {
    return res.status(400).json({ error: 'ID de paciente inválido' })
  }
 
  try {
    const paciente = await prisma.paciente.findUnique({ where: { id: pacienteId } })
    if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' })
      
    const cotizaciones = await prisma.cotizacion.findMany({
      where: { paciente_id: pacienteId },
      orderBy: { creado_en: 'desc' },  
      include: { procedimientos: true }  
    })
    res.json(cotizaciones)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})
 
// GET /api/cotizaciones/:id — ver cotización completa
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
 
  try {
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
      include: {
        procedimientos: true,
        pagos: true,
        paciente: {
          select: {
            id: true,
            nombres: true,
            primer_apellido: true,
            segundo_apellido: true,
            numero_documento: true,
            telefono: true
          }
        }
      }
    })
 
    if (!cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' })
    }
 
    res.json(cotizacion)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})
 
// PATCH /api/cotizaciones/:id/estado — cambiar estado
router.patch('/:id/estado', async (req, res) => {
  const id = parseInt(req.params.id)
  const { estado } = req.body
 
  // FIX: valores correctos del enum EstadoCotizacion
  const estadosValidos = ['borrador', 'pendiente', 'aprobado', 'en_proceso', 'finalizado', 'cancelado']
  if (!estado || !estadosValidos.includes(estado)) {
    return res.status(400).json({
      error: 'Estado no válido. Valores aceptados: borrador, pendiente, aprobado, en_proceso, finalizado, cancelado'
    })
  }
 
  try {
    const existe = await prisma.cotizacion.findFirst({
      where: { id, consultorio_id: req.usuario.consultorio_id }
    })
    if (!existe) return res.status(404).json({ error: 'Cotización no encontrada' })

    const cotizacion = await prisma.cotizacion.update({ where: { id }, data: { estado } })
    res.json(cotizacion)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// DELETE /api/cotizaciones/:id — eliminar cotización y sus pagos/procedimientos relacionados
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id)

  if (isNaN(id)) {
    return res.status(400).json({ error: 'ID de cotización inválido' })
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.pago.deleteMany({ where: { cotizacion_id: id } })
      await tx.procedimientoCotizacion.deleteMany({ where: { cotizacion_id: id } })
      await tx.cotizacion.delete({ where: { id } })
    })

    res.status(204).send()
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Cotización no encontrada' })
    }
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})


// PUT /api/cotizaciones/:id — editar cotización completa
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  const {
    doctor_id, tipo_tratamiento, prioridad,
    estado, motivo, observaciones, procedimientos
  } = req.body

  if (!procedimientos || procedimientos.length === 0) {
    return res.status(400).json({ error: 'Debe incluir al menos un procedimiento' })
  }

  try {
    const procedimientosData = procedimientos.map((p, index) => {
      const cantidad      = p.cantidad ?? 1
      const valorUnitario = Number(p.valor_unitario) || 0
      const descuento     = Number(p.descuento) || 0
      const subtotal      = valorUnitario * cantidad * (1 - descuento / 100)
      return {
        procedimiento: p.procedimiento,
        descripcion:   p.descripcion   ?? null,
        aplica_en:     p.aplica_en     ?? 'general',
        dientes:       p.dientes       ?? [],
        cuadrante:     p.cuadrante     ?? null,
        cantidad,
        valor_unitario: valorUnitario,
        descuento,
        subtotal,
        estado:        p.estado        ?? 'pendiente',
        observaciones: p.observaciones ?? null,
        orden:         p.orden         ?? index,
      }
    })

    const total = procedimientosData.reduce((sum, p) => sum + p.subtotal, 0)

    const cotizacion = await prisma.$transaction(async (tx) => {
      // Reemplazar procedimientos y recalcular total
      await tx.procedimientoCotizacion.deleteMany({ where: { cotizacion_id: id } })

      return tx.cotizacion.update({
        where: { id },
        data: {
          doctor_id:        doctor_id        ?? null,
          tipo_tratamiento: tipo_tratamiento ?? null,
          prioridad:        prioridad        ?? 'media',
          estado:           estado           ?? 'borrador',
          motivo:           motivo           ?? null,
          observaciones:    observaciones    ?? null,
          total,
          saldo: total, // se recalcula con los pagos existentes abajo
          procedimientos: { create: procedimientosData }
        },
        include: { procedimientos: true }
      })
    })

    // Recalcular saldo real con pagos existentes
    const agregado = await prisma.pago.aggregate({
      where: { cotizacion_id: id },
      _sum:  { monto: true }
    })
    const totalPagado = Number(agregado._sum.monto) || 0
    await prisma.cotizacion.update({
      where: { id },
      data: { total_pagado: totalPagado, saldo: Math.max(0, total - totalPagado) }
    })

    res.json(cotizacion)
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Cotización no encontrada' })
    }
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})
 
module.exports = router
