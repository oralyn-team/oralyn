const express = require('express')
const prisma = require('../lib/prisma')
const verificarToken = require('../middlewares/auth')

const router = express.Router()
router.use(verificarToken)

const metodosValidos = ['efectivo', 'transferencia_bancaria', 'tarjeta_debito', 'tarjeta_credito', 'nequi', 'daviplata', 'otro']
const estadosConSaldo = ['aprobado', 'en_proceso', 'finalizado']

function parseId(value) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

function parseMonto(value) {
  const monto = Number(value)
  return Number.isFinite(monto) && monto > 0 ? monto : null
}

async function recalcularSaldoCotizacion(tx, cotizacionId, consultorioId) {
  const cotizacion = await tx.cotizacion.findFirst({
    where: { id: cotizacionId, consultorio_id: consultorioId },
    select: { total: true }
  })

  if (!cotizacion) {
    return
  }

  const pagos = await tx.pago.findMany({
    where: { cotizacion_id: cotizacionId, consultorio_id: consultorioId },
    select: { monto: true }
  })

  const totalPagado = pagos.reduce((sum, pago) => sum + Number(pago.monto), 0)

  await tx.cotizacion.update({
    where: { id: cotizacionId },
    data: {
      total_pagado: totalPagado,
      saldo: Math.max(Number(cotizacion.total) - totalPagado, 0)
    }
  })
}

router.post('/', async (req, res) => {
  const pacienteId = parseId(req.body.paciente_id)
  const cotizacionId = req.body.cotizacion_id ? parseId(req.body.cotizacion_id) : null
  const monto = parseMonto(req.body.monto)
  const { metodo_pago, concepto, referencia } = req.body

  if (!pacienteId || !monto || !metodo_pago) {
    return res.status(400).json({ error: 'Paciente, monto y método de pago son obligatorios' })
  }

  if (!metodosValidos.includes(metodo_pago)) {
    return res.status(400).json({ error: `Método de pago no válido. Valores aceptados: ${metodosValidos.join(', ')}` })
  }

  if (req.body.cotizacion_id && !cotizacionId) {
    return res.status(400).json({ error: 'ID de cotización inválido' })
  }

  try {
    const paciente = await prisma.paciente.findFirst({
      where: { id: pacienteId, consultorio_id: req.usuario.consultorio_id }
    })
    if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' })

    if (cotizacionId) {
      const cotizacion = await prisma.cotizacion.findFirst({
        where: {
          id: cotizacionId,
          paciente_id: pacienteId,
          consultorio_id: req.usuario.consultorio_id
        }
      })

      if (!cotizacion) return res.status(404).json({ error: 'Cotización no encontrada' })
    }

    const pago = await prisma.$transaction(async (tx) => {
      const nuevoPago = await tx.pago.create({
        data: {
          consultorio_id: req.usuario.consultorio_id,
          paciente_id: pacienteId,
          cotizacion_id: cotizacionId,
          monto,
          metodo_pago,
          concepto: concepto ?? null,
          referencia: referencia ?? null
        }
      })

      if (cotizacionId) {
        await recalcularSaldoCotizacion(tx, cotizacionId, req.usuario.consultorio_id)
      }

      return nuevoPago
    })

    res.status(201).json(pago)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

router.get('/paciente/:pacienteId', async (req, res) => {
  const pacienteId = parseId(req.params.pacienteId)
  if (!pacienteId) return res.status(400).json({ error: 'ID de paciente inválido' })

  try {
    const paciente = await prisma.paciente.findFirst({
      where: { id: pacienteId, consultorio_id: req.usuario.consultorio_id }
    })
    if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' })

    const pagos = await prisma.pago.findMany({
      where: { paciente_id: pacienteId, consultorio_id: req.usuario.consultorio_id },
      orderBy: { fecha: 'desc' }
    })

    const cotizaciones = await prisma.cotizacion.findMany({
      where: {
        paciente_id: pacienteId,
        consultorio_id: req.usuario.consultorio_id,
        estado: { in: estadosConSaldo }
      },
      select: { total: true }
    })

    const totalCotizado = cotizaciones.reduce((sum, c) => sum + Number(c.total), 0)
    const totalPagado = pagos.reduce((sum, p) => sum + Number(p.monto), 0)
    const saldoPendiente = Math.max(totalCotizado - totalPagado, 0)

    res.json({
      pagos,
      resumen: {
        total_cotizado: totalCotizado,
        total_pagado: totalPagado,
        saldo_pendiente: saldoPendiente
      }
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

module.exports = router
