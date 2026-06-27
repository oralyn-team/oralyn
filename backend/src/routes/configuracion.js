const express = require('express')
const prisma = require('../lib/prisma')
const verificarToken = require('../middlewares/auth')

const router = express.Router()

router.use(verificarToken) // ← descomenta esto

// GET — obtener configuración del consultorio del usuario logueado
router.get('/', async (req, res) => {
  try {
    const config = await prisma.configuracion.findUnique({
      where: { id: req.usuario.consultorio_id } // ← filtra por consultorio
    })

    if (!config) {
      return res.status(404).json({ error: 'Configuración no encontrada' })
    }

    res.json(config)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// POST — crear configuración (solo si no existe para ese consultorio)
router.post('/', async (req, res) => {
  const { nombre_consultorio, nombre_profesional, registro_profesional,
          nit, direccion, telefono, ciudad, email } = req.body

  if (!nombre_consultorio || !nombre_profesional) {
    return res.status(400).json({ error: 'Nombre del consultorio y profesional son obligatorios' })
  }

  try {
    const existe = await prisma.configuracion.findUnique({
      where: { id: req.usuario.consultorio_id }
    })
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

// PUT — actualizar configuración del consultorio del usuario logueado
router.put('/', async (req, res) => {
  try {
    const config = await prisma.configuracion.update({
      where: { id: req.usuario.consultorio_id }, // ← directo, sin findFirst
      data: req.body
    })

    res.json(config)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

module.exports = router