const express = require('express')
const prisma = require('../lib/prisma')
const verificarToken = require('../middlewares/auth')

const router = express.Router()

router.use(verificarToken)

// POST /api/consentimientos — crear consentimiento
router.post('/', async (req, res) => {
  const {
    paciente_id,
    tipo,
    ciudad,
    campos_especificos,
    nombre_paciente_declarado,
    cc_paciente_declarado,
    firma_paciente,
    cc_profesional,
    firma_doctor
  } = req.body

  if (!paciente_id || !tipo) {
    return res.status(400).json({ error: 'Paciente y tipo de consentimiento son obligatorios' })
  }

  const tiposValidos = ['anestesia', 'cirugia_oral', 'retiro_poste_corona', 'rehabilitacion', 'higiene_oral']
  if (!tiposValidos.includes(tipo)) {
    return res.status(400).json({ error: 'Tipo no válido. Valores aceptados: anestesia, cirugia_oral, retiro_poste_corona, rehabilitacion, higiene_oral' })
  }

  try {
    const paciente = await prisma.paciente.findUnique({ where: { id: paciente_id } })
    if (!paciente) {
      return res.status(404).json({ error: 'Paciente no encontrado' })
    }

    const consentimiento = await prisma.consentimiento.create({
      data: {
        paciente_id,
        tipo,
        ciudad: ciudad || 'Villavicencio',
        campos_especificos,
        nombre_paciente_declarado,
        cc_paciente_declarado,
        firma_paciente,
        cc_profesional,
        firma_doctor
      }
    })

    res.status(201).json(consentimiento)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/consentimientos/paciente/:pacienteId — listar consentimientos
router.get('/paciente/:pacienteId', async (req, res) => {
  const pacienteId = parseInt(req.params.pacienteId)

  try {
    const consentimientos = await prisma.consentimiento.findMany({
      where: { paciente_id: pacienteId },
      orderBy: { fecha: 'desc' }
    })
    res.json(consentimientos)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/consentimientos/:id — ver consentimiento completo
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id)

  try {
    const consentimiento = await prisma.consentimiento.findUnique({
      where: { id },
      include: {
        paciente: {
          select: {
            id: true,
            nombres: true,
            primer_apellido: true,
            segundo_apellido: true,
            numero_documento: true,
            tipo_documento: true,
            fecha_nacimiento: true,
            municipio_ciudad: true
          }
        }
      }
    })

    if (!consentimiento) {
      return res.status(404).json({ error: 'Consentimiento no encontrado' })
    }

    res.json(consentimiento)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// PATCH /api/consentimientos/:id/firmas — agregar firmas
router.patch('/:id/firmas', async (req, res) => {
  const id = parseInt(req.params.id)
  const {
    firma_paciente,
    nombre_paciente_declarado,
    cc_paciente_declarado,
    firma_doctor,
    cc_profesional
  } = req.body

  try {
    const consentimiento = await prisma.consentimiento.update({
      where: { id },
      data: {
        firma_paciente,
        nombre_paciente_declarado,
        cc_paciente_declarado,
        firma_doctor,
        cc_profesional,
        pdf_generado_en: new Date()
      }
    })
    res.json(consentimiento)
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Consentimiento no encontrado' })
    }
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

module.exports = router
