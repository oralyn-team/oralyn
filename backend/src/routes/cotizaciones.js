const express = require('express')
const prisma = require('../lib/prisma')
const verificarToken = require('../middlewares/auth')
const generarCotizacionPDF = require('../pdf/generators/generarCotizacionPDF')

const router = express.Router()

router.use(verificarToken)

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapMetodoPago(label = '') {
  const map = {
    'Efectivo':               'efectivo',
    'Transferencia bancaria': 'transferencia_bancaria',
    'Tarjeta débito':         'tarjeta_debito',
    'Tarjeta crédito':        'tarjeta_credito',
    'Nequi':                  'nequi',
    'Daviplata':              'daviplata',
    'Otro':                   'otro',
  }
  return map[label] ?? label.toLowerCase().replace(/ /g, '_') ?? 'otro'
}

function mapProcedimientos(procedimientos) {
  return procedimientos.map((p, index) => {
    const cantidad      = Number(p.cantidad)                    || 1
    const valorUnitario = Number(p.valor_unitario ?? p.valorUnitario) || 0
    const descuento     = Number(p.descuento)                   || 0
    const subtotal      = valorUnitario * cantidad * (1 - descuento / 100)

    return {
      procedimiento:  p.procedimiento,
      descripcion:    p.descripcion          ?? null,
      aplica_en:      p.aplica_en ?? p.aplicaEn ?? 'general',
      dientes:        p.dientes              ?? [],
      cuadrante:      p.cuadrante            ?? null,
      cantidad,
      valor_unitario: valorUnitario,
      descuento,
      subtotal,
      estado:         p.estado               ?? 'pendiente',
      observaciones:  p.observaciones        ?? null,
      orden:          p.orden                ?? index,
    }
  })
}

function mapPagos(pagos, consultorio_id, paciente_id, cotizacion_id) {
  return pagos.map(p => ({
    consultorio_id,
    paciente_id,
    cotizacion_id,
    fecha:       p.fecha ? new Date(p.fecha) : new Date(),
    monto:       Number(p.monto),
    metodo_pago: p.metodo_pago ?? mapMetodoPago(p.metodo),
    referencia:  p.referencia ?? null,
    concepto:    p.concepto   ?? null,
  }))
}

// ─── POST /api/cotizaciones — crear cotización ────────────────────────────────

router.post('/', async (req, res) => {
  const {
    paciente_id,
    doctor_id,
    tipo_tratamiento,
    prioridad,
    motivo,
    observaciones,
    procedimientos,
    pagos = [],
  } = req.body

  if (!paciente_id || !procedimientos?.length) {
    return res.status(400).json({ error: 'Paciente y procedimientos son obligatorios' })
  }

  const pagosInvalidos = pagos.filter(p => !(Number(p.monto) > 0))
  if (pagosInvalidos.length) {
    return res.status(400).json({ error: 'Todos los pagos deben tener un monto válido' })
  }

  try {
    const paciente = await prisma.paciente.findUnique({ where: { id: paciente_id } })
    if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' })

    const procedimientosData = mapProcedimientos(procedimientos)
    const total       = procedimientosData.reduce((sum, p) => sum + p.subtotal, 0)
    const totalPagado = pagos.reduce((sum, p) => sum + Number(p.monto), 0)
    const saldo       = Math.max(0, total - totalPagado)

    const cotizacion = await prisma.$transaction(async (tx) => {
      const nueva = await tx.cotizacion.create({
        data: {
          consultorio_id:   req.usuario.consultorio_id,
          paciente_id,
          doctor_id:        doctor_id        ?? null,
          tipo_tratamiento: tipo_tratamiento ?? null,
          prioridad:        prioridad        ?? 'media',
          motivo:           motivo           ?? null,
          observaciones:    observaciones    ?? null,
          total,
          total_pagado: totalPagado,
          saldo,
          procedimientos: { create: procedimientosData },
        },
        include: { procedimientos: true },
      })

      if (pagos.length) {
        await tx.pago.createMany({
          data: mapPagos(pagos, req.usuario.consultorio_id, paciente_id, nueva.id),
        })
      }

      return tx.cotizacion.findUnique({
        where: { id: nueva.id },
        include: { procedimientos: true, pagos: true },
      })
    })

    res.status(201).json(cotizacion)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// ─── GET /api/cotizaciones/paciente/:pacienteId ───────────────────────────────

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
      include: { procedimientos: true, pagos: true },
    })

    res.json(cotizaciones)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// ─── GET /api/cotizaciones/:id/pdf ────────────────────────────────────────────

router.get('/:id/pdf', async (req, res) => {
  const id = parseInt(req.params.id)

  if (isNaN(id)) {
    return res.status(400).json({ error: 'ID de cotización inválido' })
  }

  try {
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
      include: {
        procedimientos: { orderBy: { orden: 'asc' } },
        pagos:          { orderBy: { fecha: 'asc'  } },
        paciente: {
          select: {
            nombres:          true,
            primer_apellido:  true,
            segundo_apellido: true,
            numero_documento: true,
            telefono:         true,
          },
        },
      },
    })

    if (!cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' })
    }

    // Verificar que pertenece al consultorio del usuario
    if (cotizacion.consultorio_id !== req.usuario.consultorio_id) {
      return res.status(403).json({ error: 'Sin acceso a esta cotización' })
    }

    const pdf = await generarCotizacionPDF(cotizacion, req.usuario.consultorio_id)

    const nombreArchivo = `cotizacion-${id}.pdf`
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`)
    res.setHeader('Content-Length', pdf.length)
    res.end(pdf)

  } catch (error) {
    console.error('Error generando PDF:', error)
    res.status(500).json({ error: 'Error generando el PDF' })
  }
})

// ─── GET /api/cotizaciones/:id — ver cotización completa ──────────────────────

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id)

  if (isNaN(id)) {
    return res.status(400).json({ error: 'ID de cotización inválido' })
  }

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
            telefono: true,
          },
        },
      },
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

// ─── PATCH /api/cotizaciones/:id/estado ──────────────────────────────────────

router.patch('/:id/estado', async (req, res) => {
  const id = parseInt(req.params.id)
  const { estado } = req.body

  const estadosValidos = ['borrador', 'pendiente', 'aprobado', 'en_proceso', 'finalizado', 'cancelado']
  if (!estado || !estadosValidos.includes(estado)) {
    return res.status(400).json({
      error: 'Estado no válido. Valores aceptados: borrador, pendiente, aprobado, en_proceso, finalizado, cancelado',
    })
  }

  try {
    const existe = await prisma.cotizacion.findFirst({
      where: { id, consultorio_id: req.usuario.consultorio_id },
    })
    if (!existe) return res.status(404).json({ error: 'Cotización no encontrada' })

    const cotizacion = await prisma.cotizacion.update({ where: { id }, data: { estado } })
    res.json(cotizacion)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// ─── PUT /api/cotizaciones/:id — editar cotización completa ──────────────────

router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  const {
    doctor_id,
    tipo_tratamiento,
    prioridad,
    estado,
    motivo,
    observaciones,
    procedimientos,
    pagos = [],
  } = req.body

  if (isNaN(id)) {
    return res.status(400).json({ error: 'ID de cotización inválido' })
  }

  if (!procedimientos?.length) {
    return res.status(400).json({ error: 'Debe incluir al menos un procedimiento' })
  }

  const pagosInvalidos = pagos.filter(p => !(Number(p.monto) > 0))
  if (pagosInvalidos.length) {
    return res.status(400).json({ error: 'Todos los pagos deben tener un monto válido' })
  }

  try {
    const existente = await prisma.cotizacion.findFirst({
      where: { id, consultorio_id: req.usuario.consultorio_id },
    })
    if (!existente) return res.status(404).json({ error: 'Cotización no encontrada' })

    const procedimientosData = mapProcedimientos(procedimientos)
    const total = procedimientosData.reduce((sum, p) => sum + p.subtotal, 0)

    const cotizacion = await prisma.$transaction(async (tx) => {
      // Reemplazar todos los procedimientos
      await tx.procedimientoCotizacion.deleteMany({ where: { cotizacion_id: id } })

      // Pagos nuevos = id temporal del frontend (string con 'pago_' o no numérico)
      const pagosNuevos = pagos.filter(p => !p.id || typeof p.id === 'string' || String(p.id).startsWith('pago_'))

      if (pagosNuevos.length) {
        await tx.pago.createMany({
          data: mapPagos(pagosNuevos, req.usuario.consultorio_id, existente.paciente_id, id),
        })
      }

      // Calcular total pagado real (pagos previos + nuevos)
      const agregado = await tx.pago.aggregate({
        where: { cotizacion_id: id },
        _sum:  { monto: true },
      })
      const totalPagado = Number(agregado._sum.monto) || 0

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
          total_pagado: totalPagado,
          saldo: Math.max(0, total - totalPagado),
          procedimientos: { create: procedimientosData },
        },
        include: { procedimientos: true, pagos: true },
      })
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

// ─── DELETE /api/cotizaciones/:id ─────────────────────────────────────────────

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


module.exports = router
