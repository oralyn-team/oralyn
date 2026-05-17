const express = require('express')
const prisma = require('../lib/prisma')
const verificarToken = require('../middlewares/auth')

const router = express.Router()

router.use(verificarToken)

router.post('/', async (req, res) => {
  const { paciente_id, cita_id, tipo_cita_texto, fecha_expedicion, ciudad } = req.body

  if (!paciente_id || !tipo_cita_texto || !fecha_expedicion) {
    return res.status(400).json({ error: 'Paciente, tipo de cita y fecha son obligatorios' })
  }

  try {
    const certificado = await prisma.certificadoDental.create({
      data: {
        paciente_id,
        cita_id: cita_id || null,
        tipo_cita_texto,
        fecha_expedicion: new Date(fecha_expedicion),
        ciudad: ciudad || 'Villavicencio'
      }
    })
    res.status(201).json(certificado)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

router.get('/paciente/:pacienteId', async (req, res) => {
  const pacienteId = parseInt(req.params.pacienteId)
  try {
    const certificados = await prisma.certificadoDental.findMany({
      where: { paciente_id: pacienteId },
      orderBy: { fecha_expedicion: 'desc' }
    })
    res.json(certificados)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

module.exports = router