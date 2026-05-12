const express = require('express')
const prisma = require('../lib/prisma')
const verificarToken = require('../middlewares/auth')

const router = express.Router()

router.use(verificarToken)

// POST /api/pagos — registrar abono
router.post('/', async (req, res) => {
  const { paciente_id, monto, metodo_pago, concepto } = req.body

  if (!paciente_id || !monto || !metodo_pago) {
    return res.status(400).json({ error: 'Paciente, monto y método de pago son obligatorios' })
  }

  const metodosValidos = ['efectivo', 'transferencia', 'tarjeta']
  if (!metodosValidos.includes(metodo_pago)) {
    return res.status(400).json({ error: 'Método de pago no válido. Valores aceptados: efectivo, transferencia, tarjeta' })
  }

  try {
    const paciente = await prisma.paciente.findUnique({ where: { id: paciente_id } })
    if (!paciente) {
      return res.status(404).json({ error: 'Paciente no encontrado' })
    }

    const pago = await prisma.pago.create({
      data: { paciente_id, monto, metodo_pago, concepto }
    })

    res.status(201).json(pago)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/pagos/paciente/:pacienteId — historial y saldo
router.get('/paciente/:pacienteId', async (req, res) => {
  const pacienteId = parseInt(req.params.pacienteId)

  try {
    const pagos = await prisma.pago.findMany({
      where: { paciente_id: pacienteId },
      orderBy: { fecha: 'desc' }
    })

    const cotizaciones = await prisma.cotizacion.findMany({
      where: { paciente_id: pacienteId, estado: 'aprobada' },
      select: { total: true }
    })

    const totalCotizado = cotizaciones.reduce((sum, c) => sum + Number(c.total), 0)
    const totalPagado = pagos.reduce((sum, p) => sum + Number(p.monto), 0)
    const saldoPendiente = totalCotizado - totalPagado

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