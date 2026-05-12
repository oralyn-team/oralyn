const express = require('express')
const prisma = require('../lib/prisma')
const verificarToken = require('../middlewares/auth')

const router = express.Router()

router.use(verificarToken)

// POST /api/citas — crear cita
// FIX: agregados campos 'doctor' y 'observaciones' que existen en el modelo Cita
router.post('/', async (req, res) => {
  const {
    paciente_id,
    fecha_hora,
    doctor,
    procedimiento,
    codigo_cups,
    codigo_cie10,
    valor_cobrado,
    observaciones,
    causas_no_atencion
  } = req.body

  if (!paciente_id || !fecha_hora || !procedimiento) {
    return res.status(400).json({ error: 'Paciente, fecha y procedimiento son obligatorios' })
  }

  try {
    const paciente = await prisma.paciente.findUnique({ where: { id: paciente_id } })
    if (!paciente) {
      return res.status(404).json({ error: 'Paciente no encontrado' })
    }

    const cita = await prisma.cita.create({
      data: {
        paciente_id,
        fecha_hora: new Date(fecha_hora),
        doctor:              doctor              ?? null,
        procedimiento,
        codigo_cups:         codigo_cups         ?? null,
        codigo_cie10:        codigo_cie10        ?? null,
        valor_cobrado:       valor_cobrado       ?? null,
        observaciones:       observaciones       ?? null,
        causas_no_atencion:  causas_no_atencion  ?? null,
      }
    })

    res.status(201).json(cita)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/citas?fecha=YYYY-MM-DD — agenda del día
router.get('/', async (req, res) => {
  const { fecha } = req.query

  try {
    let where = {}

    if (fecha) {
      const inicio = new Date(fecha)
      inicio.setHours(0, 0, 0, 0)
      const fin = new Date(fecha)
      fin.setHours(23, 59, 59, 999)
      where.fecha_hora = { gte: inicio, lte: fin }
    }

    const citas = await prisma.cita.findMany({
      where,
      orderBy: { fecha_hora: 'asc' },
      include: {
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

    res.json(citas)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/citas/paciente/:pacienteId — citas de un paciente
router.get('/paciente/:pacienteId', async (req, res) => {
  const pacienteId = parseInt(req.params.pacienteId)

  try {
    const citas = await prisma.cita.findMany({
      where: { paciente_id: pacienteId },
      orderBy: { fecha_hora: 'desc' }
    })
    res.json(citas)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/citas/:id — ver cita completa
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id)

  try {
    const cita = await prisma.cita.findUnique({
      where: { id },
      include: {
        paciente: {
          select: {
            id: true,
            nombres: true,
            primer_apellido: true,
            segundo_apellido: true,
            numero_documento: true,
            telefono: true,
            municipio_ciudad: true
          }
        }
      }
    })

    if (!cita) {
      return res.status(404).json({ error: 'Cita no encontrada' })
    }

    res.json(cita)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// PATCH /api/citas/:id/estado — actualizar estado
router.patch('/:id/estado', async (req, res) => {
  const id = parseInt(req.params.id)
  const { estado } = req.body

  const estadosValidos = ['pendiente', 'asistio', 'no_asistio', 'cancelada']
  if (!estado || !estadosValidos.includes(estado)) {
    return res.status(400).json({ error: 'Estado no válido. Valores aceptados: pendiente, asistio, no_asistio, cancelada' })
  }

  try {
    const cita = await prisma.cita.update({
      where: { id },
      data: { estado }
    })
    res.json(cita)
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Cita no encontrada' })
    }
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// PUT /api/citas/:id — editar cita
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  const datos = req.body

  if (datos.fecha_hora) {
    datos.fecha_hora = new Date(datos.fecha_hora)
  }

  try {
    const cita = await prisma.cita.update({
      where: { id },
      data: datos
    })
    res.json(cita)
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Cita no encontrada' })
    }
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// DELETE /api/citas/:id — cancelar cita
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id)

  try {
    await prisma.cita.update({
      where: { id },
      data: { estado: 'cancelada' }
    })
    res.status(200).json({ message: 'Cita cancelada correctamente' })
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Cita no encontrada' })
    }
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

module.exports = router