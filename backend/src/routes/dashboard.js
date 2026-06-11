const express = require('express')
const prisma = require('../lib/prisma')
const verificarToken = require('../middlewares/auth')

const router = express.Router()
router.use(verificarToken)

router.get('/', async (req, res) => {
  const consultorioId = req.usuario.consultorio_id

  try {
    const hoy = new Date()
    const inicioDia = new Date(hoy)
    inicioDia.setHours(0, 0, 0, 0)
    const finDia = new Date(hoy)
    finDia.setHours(23, 59, 59, 999)

    const citasHoy = await prisma.cita.findMany({
      where: {
        consultorio_id: consultorioId,
        fecha_hora: { gte: inicioDia, lte: finDia }
      },
      orderBy: { fecha_hora: 'asc' },
      include: {
        paciente: {
          select: { id: true, nombres: true, primer_apellido: true, segundo_apellido: true, telefono: true }
        }
      }
    })

    const totalPacientes = await prisma.paciente.count({
      where: { consultorio_id: consultorioId }
    })

    const cotizacionesAprobadas = await prisma.cotizacion.findMany({
      where: { consultorio_id: consultorioId, estado: 'aprobada' },
      select: { paciente_id: true, total: true }
    })

    const pagos = await prisma.pago.findMany({
      where: { consultorio_id: consultorioId },
      select: { paciente_id: true, monto: true }
    })

    const saldosPorPaciente = {}
    cotizacionesAprobadas.forEach(c => {
      saldosPorPaciente[c.paciente_id] = (saldosPorPaciente[c.paciente_id] || 0) + Number(c.total)
    })
    pagos.forEach(p => {
      saldosPorPaciente[p.paciente_id] = (saldosPorPaciente[p.paciente_id] || 0) - Number(p.monto)
    })

    const pacientesConDeuda = Object.entries(saldosPorPaciente)
      .filter(([_, saldo]) => saldo > 0).length

    const pendientes = citasHoy.filter(c => c.estado === 'pendiente').length
    const atendidas  = citasHoy.filter(c => c.estado === 'asistio').length
    const canceladas = citasHoy.filter(c => c.estado === 'cancelada').length

    res.json({
      fecha_hoy: hoy.toISOString().split('T')[0],
      citas_hoy: citasHoy,
      resumen: {
        total_citas_hoy: citasHoy.length,
        citas_pendientes: pendientes,
        citas_atendidas: atendidas,
        citas_canceladas: canceladas,
        total_pacientes: totalPacientes,
        pacientes_con_deuda: pacientesConDeuda
      }
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

module.exports = router