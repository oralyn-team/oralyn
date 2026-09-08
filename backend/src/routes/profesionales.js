const express = require('express')
const prisma = require('../lib/prisma')
const verificarToken = require('../middlewares/auth')
const { requirePermission } = require('../middlewares/rbac')
const { PERMISSIONS } = require('../lib/permissions')
const { registrarAuditoria, calcularDiferencias } = require('../services/audit.service')

const router = express.Router()

router.use(verificarToken)

// GET /profesionales — listar profesionales activos del consultorio
router.get('/', requirePermission(PERMISSIONS.SETTINGS_READ), async (req, res) => {
  if (req.usuario.rol === 'SUPERADMIN') {
    return res.status(403).json({ error: 'Acceso denegado: El SUPERADMIN administra la plataforma a través de /api/admin.' })
  }

  try {
    const consultorioId = Number(req.usuario?.consultorio_id)
    if (!consultorioId || isNaN(consultorioId)) {
      return res.status(400).json({ error: 'El usuario no pertenece a un consultorio válido' })
    }

    const profesionales = await prisma.profesional.findMany({
      where: {
        consultorio_id: consultorioId,
        activo: true
      },
      orderBy: { creado_en: 'asc' }
    })

    res.json(profesionales)
  } catch (error) {
    console.error('Error al listar profesionales:', error)
    res.status(500).json({ error: 'Error interno del servidor al listar profesionales', detalle: error.message })
  }
})

// POST /profesionales — crear profesional
router.post('/', requirePermission(PERMISSIONS.SETTINGS_UPDATE), async (req, res) => {
  if (req.usuario.rol === 'SUPERADMIN') {
    return res.status(403).json({ error: 'Acceso denegado: El SUPERADMIN administra la plataforma a través de /api/admin.' })
  }

  try {
    const consultorioId = Number(req.usuario?.consultorio_id)
    if (!consultorioId || isNaN(consultorioId)) {
      return res.status(400).json({ error: 'El usuario no pertenece a un consultorio válido' })
    }

    const { nombre_completo, cedula_profesional, firma_default } = req.body

    if (!nombre_completo || typeof nombre_completo !== 'string' || !nombre_completo.trim()) {
      return res.status(400).json({ error: 'El nombre completo del profesional es obligatorio' })
    }

    const nuevo = await prisma.profesional.create({
      data: {
        consultorio_id: consultorioId,
        nombre_completo: nombre_completo.trim(),
        cedula_profesional: cedula_profesional ? String(cedula_profesional).trim() : null,
        firma_default: firma_default || null,
        activo: true
      }
    })

    registrarAuditoria({
      req,
      accion: 'CREAR_PROFESIONAL',
      modulo: 'Profesionales',
      recurso_id: nuevo.id,
      detalles: `Profesional ${nuevo.nombre_completo} creado`
    })

    res.status(201).json(nuevo)
  } catch (error) {
    console.error('Error al crear profesional:', error)
    res.status(500).json({ error: 'Error interno del servidor al crear profesional', detalle: error.message })
  }
})

// PUT /profesionales/:id/firma-default — subir/actualizar firma default del profesional
router.put('/:id/firma-default', requirePermission(PERMISSIONS.SETTINGS_UPDATE), async (req, res) => {
  if (req.usuario.rol === 'SUPERADMIN') {
    return res.status(403).json({ error: 'Acceso denegado: El SUPERADMIN administra la plataforma a través de /api/admin.' })
  }

  try {
    const consultorioId = Number(req.usuario?.consultorio_id)
    const id = Number(req.params.id)
    if (!consultorioId || isNaN(consultorioId) || !id || isNaN(id)) {
      return res.status(400).json({ error: 'Parámetros inválidos' })
    }

    const previo = await prisma.profesional.findFirst({
      where: { id, consultorio_id: consultorioId }
    })

    if (!previo) {
      return res.status(404).json({ error: 'Profesional no encontrado' })
    }

    const { firma_default } = req.body

    const actualizado = await prisma.profesional.update({
      where: { id },
      data: {
        firma_default: firma_default || null
      }
    })

    const diferencias = calcularDiferencias(previo, actualizado, ['firma_default'])

    registrarAuditoria({
      req,
      accion: 'ACTUALIZAR_FIRMA_PROFESIONAL',
      modulo: 'Profesionales',
      recurso_id: id,
      detalles: `Firma por defecto actualizada para profesional ${previo.nombre_completo}`,
      metadata: { cambios: diferencias }
    })

    res.json(actualizado)
  } catch (error) {
    console.error('Error al actualizar firma de profesional:', error)
    res.status(500).json({ error: 'Error interno del servidor al actualizar firma del profesional', detalle: error.message })
  }
})

// PUT /profesionales/:id — editar datos, desactivar (activo: false)
router.put('/:id', requirePermission(PERMISSIONS.SETTINGS_UPDATE), async (req, res) => {
  if (req.usuario.rol === 'SUPERADMIN') {
    return res.status(403).json({ error: 'Acceso denegado: El SUPERADMIN administra la plataforma a través de /api/admin.' })
  }

  try {
    const consultorioId = Number(req.usuario?.consultorio_id)
    const id = Number(req.params.id)
    if (!consultorioId || isNaN(consultorioId) || !id || isNaN(id)) {
      return res.status(400).json({ error: 'Parámetros inválidos' })
    }

    const previo = await prisma.profesional.findFirst({
      where: { id, consultorio_id: consultorioId }
    })

    if (!previo) {
      return res.status(404).json({ error: 'Profesional no encontrado' })
    }

    const { nombre_completo, cedula_profesional, activo } = req.body

    const dataToUpdate = {}
    if (nombre_completo !== undefined) {
      if (!nombre_completo || typeof nombre_completo !== 'string' || !nombre_completo.trim()) {
        return res.status(400).json({ error: 'El nombre completo no puede estar vacío' })
      }
      dataToUpdate.nombre_completo = nombre_completo.trim()
    }
    if (cedula_profesional !== undefined) {
      dataToUpdate.cedula_profesional = cedula_profesional ? String(cedula_profesional).trim() : null
    }
    if (activo !== undefined) {
      dataToUpdate.activo = Boolean(activo)
    }

    const actualizado = await prisma.profesional.update({
      where: { id },
      data: dataToUpdate
    })

    const diferencias = calcularDiferencias(previo, actualizado, ['nombre_completo', 'cedula_profesional', 'activo'])

    registrarAuditoria({
      req,
      accion: 'ACTUALIZAR_PROFESIONAL',
      modulo: 'Profesionales',
      recurso_id: id,
      detalles: `Profesional ${previo.nombre_completo} actualizado`,
      metadata: { cambios: diferencias }
    })

    res.json(actualizado)
  } catch (error) {
    console.error('Error al actualizar profesional:', error)
    res.status(500).json({ error: 'Error interno del servidor al actualizar profesional', detalle: error.message })
  }
})

module.exports = router
