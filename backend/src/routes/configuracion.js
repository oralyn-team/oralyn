const express = require('express')
const prisma = require('../lib/prisma')
const verificarToken = require('../middlewares/auth')

const router = express.Router()

router.use(verificarToken)

// Helper para limpiar campos sensibles antes de enviar al frontend
function sanitizarConfiguracion(config) {
  if (!config) return null
  const { factus_client_secret, factus_password, ...resto } = config
  return {
    ...resto,
    has_factus_secret: Boolean(factus_client_secret),
    has_factus_password: Boolean(factus_password),
  }
}

// GET — obtener configuración del consultorio del usuario logueado
router.get('/', async (req, res) => {
  try {
    const config = await prisma.configuracion.findUnique({
      where: { id: req.usuario.consultorio_id }
    })

    if (!config) {
      return res.status(404).json({ error: 'Configuración no encontrada' })
    }

    res.json(sanitizarConfiguracion(config))
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
        id: req.usuario.consultorio_id,
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

    res.status(201).json(sanitizarConfiguracion(config))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// PUT — actualizar configuración del consultorio del usuario logueado
router.put('/', async (req, res) => {
  try {
    const updateData = { ...req.body }

    // Evitar sobreescribir la clave con los enmascarados del frontend (••••••••)
    if (updateData.factus_client_secret === '••••••••' || updateData.factus_client_secret === '') {
      delete updateData.factus_client_secret
    }
    if (updateData.factus_password === '••••••••' || updateData.factus_password === '') {
      delete updateData.factus_password
    }

    // No permitir cambiar id de consultorio por req.body
    delete updateData.id

    const config = await prisma.configuracion.update({
      where: { id: req.usuario.consultorio_id },
      data: updateData
    })

    res.json(sanitizarConfiguracion(config))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

module.exports = router