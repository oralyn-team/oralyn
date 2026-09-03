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
    const consultorioId = Number(req.usuario?.consultorio_id)
    if (!consultorioId || isNaN(consultorioId)) {
      return res.status(400).json({ error: 'El usuario no pertenece a un consultorio válido' })
    }

    const config = await prisma.configuracion.findUnique({
      where: { id: consultorioId }
    })

    if (!config) {
      return res.status(404).json({ error: 'Configuración no encontrada' })
    }

    res.json(sanitizarConfiguracion(config))
  } catch (error) {
    console.error('Error obteniendo configuración:', error)
    res.status(500).json({ error: 'Error interno del servidor al consultar configuración', detalle: error.message })
  }
})

// POST — crear configuración (solo si no existe para ese consultorio)
router.post('/', async (req, res) => {
  const consultorioId = Number(req.usuario?.consultorio_id)
  if (!consultorioId || isNaN(consultorioId)) {
    return res.status(400).json({ error: 'El usuario no pertenece a un consultorio válido' })
  }

  const { nombre_consultorio, nombre_profesional, registro_profesional,
          nit, direccion, telefono, ciudad, email } = req.body

  if (!nombre_consultorio || !nombre_profesional) {
    return res.status(400).json({ error: 'Nombre del consultorio y profesional son obligatorios' })
  }

  try {
    const existe = await prisma.configuracion.findUnique({
      where: { id: consultorioId }
    })
    if (existe) {
      return res.status(400).json({ error: 'Ya existe una configuración. Usa PUT para actualizarla.' })
    }

    const config = await prisma.configuracion.create({
      data: {
        id: consultorioId,
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
    console.error('Error creando configuración:', error)
    res.status(500).json({ error: 'Error interno del servidor al crear configuración', detalle: error.message })
  }
})

// PUT — actualizar configuración del consultorio del usuario logueado
router.put('/', async (req, res) => {
  try {
    const consultorioId = Number(req.usuario?.consultorio_id)
    if (!consultorioId || isNaN(consultorioId)) {
      return res.status(400).json({ error: 'El usuario no pertenece a un consultorio válido' })
    }

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

    // Filtrar únicamente los campos que existen en la tabla Configuracion
    const camposPermitidos = [
      'nombre_consultorio', 'nombre_profesional', 'registro_profesional', 'nit',
      'direccion', 'telefono', 'ciudad', 'email', 'logo_url',
      'razon_social', 'nit_dv', 'municipio_code', 'factus_numbering_range_id',
      'factus_client_id', 'factus_client_secret', 'factus_username', 'factus_password',
      'facturacion_habilitada'
    ]

    const dataToUpdate = {}
    for (const key of camposPermitidos) {
      if (updateData[key] !== undefined) {
        if (key === 'factus_numbering_range_id') {
          dataToUpdate[key] = updateData[key] ? Number(updateData[key]) : null
        } else if (key === 'facturacion_habilitada') {
          dataToUpdate[key] = Boolean(updateData[key])
        } else {
          dataToUpdate[key] = updateData[key]
        }
      }
    }

    const config = await prisma.configuracion.update({
      where: { id: consultorioId },
      data: dataToUpdate
    })

    res.json(sanitizarConfiguracion(config))
  } catch (error) {
    console.error('Error actualizando configuración:', error)
    res.status(500).json({ error: 'Error interno del servidor al actualizar configuración', detalle: error.message })
  }
})

module.exports = router