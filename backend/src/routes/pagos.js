const express = require('express')
const prisma = require('../lib/prisma')
const verificarToken = require('../middlewares/auth')

const router = express.Router()

router.use(verificarToken)

const METODOS_VALIDOS = [
  'efectivo',
  'transferencia_bancaria',
  'tarjeta_debito',
  'tarjeta_credito',
  'nequi',
  'daviplata',
  'otro',
]

const ESTADOS_CON_SALDO = ['aprobado', 'en_proceso', 'finalizado']

// ─── POST /api/pagos — registrar pago ────────────────────────────────────────

router.post('/', async (req, res) => {
  const paciente_id   = parseInt(req.body.paciente_id)
  const cotizacion_id = req.body.cotizacion_id ? parseInt(req.body.cotizacion_id) : null
  const monto         = Number(req.body.monto)
  const { metodo_pago, referencia, concepto } = req.body

  // ── Validaciones ────────────────────────────────────────────────────────────

  if (isNaN(paciente_id)) {
    return res.status(400).json({ error: 'ID de paciente inválido' })
  }

  if (!metodo_pago) {
    return res.status(400).json({ error: 'Paciente, monto y método de pago son obligatorios' })
  }

  if (isNaN(monto) || monto <= 0) {
    return res.status(400).json({ error: 'El monto debe ser un número mayor a 0' })
  }

  if (!METODOS_VALIDOS.includes(metodo_pago)) {
    return res.status(400).json({
      error: `Método de pago no válido. Valores aceptados: ${METODOS_VALIDOS.join(', ')}`
    })
  }

  try {
    // ── Verificar paciente ───────────────────────────────────────────────────

    const paciente = await prisma.paciente.findUnique({ where: { id: paciente_id } })
    if (!paciente) {
      return res.status(404).json({ error: 'Paciente no encontrado' })
    }

    // ── Verificar cotización si viene ────────────────────────────────────────

    if (cotizacion_id) {
      const cotizacion = await prisma.cotizacion.findUnique({ where: { id: cotizacion_id } })
      if (!cotizacion) {
        return res.status(404).json({ error: 'Cotización no encontrada' })
      }
    }

    // ── Transacción: crear pago + actualizar saldo ───────────────────────────

    const pago = await prisma.$transaction(async (tx) => {
      const nuevoPago = await tx.pago.create({
        data: {
          paciente_id,
          cotizacion_id: cotizacion_id ?? null,
          monto,
          metodo_pago,
          referencia: referencia ?? null,
          concepto:   concepto   ?? null,
        }
      })

      if (cotizacion_id) {
        const agregado = await tx.pago.aggregate({
          where: { cotizacion_id },
          _sum:  { monto: true }
        })

        const totalPagado = Number(agregado._sum.monto) || 0

        const cotizacion = await tx.cotizacion.findUnique({
          where:  { id: cotizacion_id },
          select: { total: true }
        })

        await tx.cotizacion.update({
          where: { id: cotizacion_id },
          data: {
            total_pagado: totalPagado,
            saldo:        Math.max(0, Number(cotizacion.total) - totalPagado)
          }
        })
      }

      return nuevoPago
    })

    res.status(201).json(pago)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// ─── GET /api/pagos/paciente/:pacienteId — historial y resumen ───────────────

router.get('/paciente/:pacienteId', async (req, res) => {
  const pacienteId = parseInt(req.params.pacienteId)

  if (isNaN(pacienteId)) {
    return res.status(400).json({ error: 'ID de paciente inválido' })
  }

  try {
    // ── Verificar paciente ───────────────────────────────────────────────────

    const paciente = await prisma.paciente.findUnique({ where: { id: pacienteId } })
    if (!paciente) {
      return res.status(404).json({ error: 'Paciente no encontrado' })
    }

    // ── Pagos e historial ────────────────────────────────────────────────────

    const pagos = await prisma.pago.findMany({
      where:   { paciente_id: pacienteId },
      orderBy: { fecha: 'desc' }
    })

    // Incluye aprobado, en_proceso y finalizado (todos pueden tener saldo)
    const cotizaciones = await prisma.cotizacion.findMany({
      where:  { paciente_id: pacienteId, estado: { in: ESTADOS_CON_SALDO } },
      select: { total: true }
    })

    const totalCotizado  = cotizaciones.reduce((sum, c) => sum + Number(c.total), 0)
    const totalPagado    = pagos.reduce((sum, p) => sum + Number(p.monto), 0)
    const saldoPendiente = Math.max(0, totalCotizado - totalPagado)

    res.json({
      pagos,
      resumen: {
        total_cotizado:  totalCotizado,
        total_pagado:    totalPagado,
        saldo_pendiente: saldoPendiente
      }
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

module.exports = router