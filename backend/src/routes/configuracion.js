const express = require('express')
const prisma = require('../lib/prisma')
const verificarToken = require('../middlewares/auth')

const router = express.Router()

//router.use(verificarToken)

// GET /api/configuracion — obtener configuración
router.get('/', async (req, res) => {
  try {
    const config = await prisma.configuracion.findFirst()

    if (!config) {
      return res.status(404).json({ error: 'Configuración no encontrada' })
    }

    res.json(config)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// POST /api/configuracion — crear configuración inicial
router.post('/', async (req, res) => {
  const {
    nombre_consultorio,
    nombre_profesional,
    registro_profesional,
    nit,
    direccion,
    telefono,
    ciudad,
    email
  } = req.body

  if (!nombre_consultorio || !nombre_profesional) {
    return res.status(400).json({ error: 'Nombre del consultorio y profesional son obligatorios' })
  }

  try {
    const existe = await prisma.configuracion.findFirst()
    if (existe) {
      return res.status(400).json({ error: 'Ya existe una configuración. Usa PUT para actualizarla.' })
    }

    const config = await prisma.configuracion.create({
      data: {
        nombre_consultorio,
        nombre_profesional,
        registro_profesional,
        nit,
        direccion,
        telefono,
        ciudad: ciudad || 'Villavicencio',
        email
      }
    })

    res.status(201).json(config)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// PUT /api/configuracion — actualizar configuración
router.put('/', async (req, res) => {
  const datos = req.body

  try {
    const existe = await prisma.configuracion.findFirst()
    if (!existe) {
      return res.status(404).json({ error: 'No existe configuración. Usa POST para crearla.' })
    }

    const config = await prisma.configuracion.update({
      where: { id: existe.id },
      data: datos
    })

    res.json(config)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

module.exports = router