const express = require('express')
const bcrypt = require('bcryptjs')
const prisma = require('../lib/prisma')
const verificarToken = require('../middlewares/auth')
const { requirePermission } = require('../middlewares/rbac')
const { PERMISSIONS, ROLES } = require('../lib/permissions')
const { registrarAuditoria, calcularDiferencias } = require('../services/audit.service')

const router = express.Router()
router.use(verificarToken)

// GET /api/usuarios — Listar los usuarios/profesionales del consultorio autenticado
router.get('/', requirePermission(PERMISSIONS.USERS_READ), async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: { consultorio_id: req.usuario.consultorio_id },
      select: {
        id: true,
        nombre: true,
        email: true,
        registro: true,
        rol: true,
        activo: true,
        creado_en: true
      },
      orderBy: { nombre: 'asc' }
    })
    res.json(usuarios)
  } catch (error) {
    console.error('Error al listar usuarios:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// POST /api/usuarios — Crear un nuevo usuario dentro del consultorio
router.post('/', requirePermission(PERMISSIONS.USERS_CREATE), async (req, res) => {
  const { email, password, nombre, registro, rol } = req.body

  if (!email || !password || !nombre) {
    return res.status(400).json({ error: 'Correo, contraseña y nombre son requeridos' })
  }

  const rolAsignar = rol || ROLES.ASISTENTE_ODONTOLOGO

  // RESTRICCIÓN DE SEGURIDAD: Un administrador/dueño de consultorio NUNCA puede crear ni asignar un SUPERADMIN
  if (rolAsignar === ROLES.SUPERADMIN && req.usuario.rol !== ROLES.SUPERADMIN) {
    return res.status(403).json({ error: 'Acceso denegado: No está autorizado para asignar el rol SUPERADMIN' })
  }

  try {
    const existe = await prisma.usuario.findUnique({ where: { email } })
    if (existe) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado' })
    }

    const password_hash = await bcrypt.hash(password, 10)

    const nuevoUsuario = await prisma.usuario.create({
      data: {
        consultorio_id: req.usuario.consultorio_id,
        email,
        password_hash,
        nombre,
        registro: registro || null,
        rol: rolAsignar,
        activo: true,
        token_version: 0
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        registro: true,
        rol: true,
        activo: true,
        creado_en: true
      }
    })

    await registrarAuditoria({
      req,
      accion: 'CREAR_USUARIO',
      modulo: 'Usuarios',
      recurso_id: nuevoUsuario.id,
      detalles: `Usuario ${nuevoUsuario.email} creado con rol ${nuevoUsuario.rol}`,
      metadata: { email: nuevoUsuario.email, nombre: nuevoUsuario.nombre, rol: nuevoUsuario.rol }
    })

    res.status(201).json(nuevoUsuario)
  } catch (error) {
    console.error('Error al crear usuario:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// PATCH /api/usuarios/:id/status — Activar o desactivar usuario del consultorio
router.patch('/:id/status', requirePermission(PERMISSIONS.USERS_DISABLE), async (req, res) => {
  const { id } = req.params
  const { activo } = req.body

  if (typeof activo !== 'boolean') {
    return res.status(400).json({ error: 'El campo activo debe ser booleano' })
  }

  try {
    const usuarioObjetivo = await prisma.usuario.findUnique({
      where: { id: Number(id) }
    })

    if (!usuarioObjetivo) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    if (usuarioObjetivo.consultorio_id !== req.usuario.consultorio_id) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    if (usuarioObjetivo.id === req.usuario.id) {
      return res.status(400).json({ error: 'No puede desactivar su propio usuario' })
    }

    const usuarioActualizado = await prisma.usuario.update({
      where: { id: usuarioObjetivo.id },
      data: {
        activo,
        token_version: activo ? usuarioObjetivo.token_version : usuarioObjetivo.token_version + 1
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true
      }
    })

    const accion = activo ? 'REACTIVAR_USUARIO' : 'DESACTIVAR_USUARIO'
    const diferencias = calcularDiferencias(
      { activo: usuarioObjetivo.activo },
      { activo: usuarioActualizado.activo },
      ['activo']
    )

    await registrarAuditoria({
      req,
      accion,
      modulo: 'Usuarios',
      recurso_id: usuarioActualizado.id,
      detalles: `Usuario ${usuarioActualizado.email} ${activo ? 'reactivado' : 'desactivado'}`,
      metadata: { cambios: diferencias }
    })

    res.json(usuarioActualizado)
  } catch (error) {
    console.error('Error al cambiar estado del usuario:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// PATCH /api/usuarios/:id/role — Cambiar rol de usuario del consultorio
router.patch('/:id/role', requirePermission(PERMISSIONS.USERS_UPDATE), async (req, res) => {
  const { id } = req.params
  const { rol } = req.body

  if (!rol) {
    return res.status(400).json({ error: 'El rol es requerido' })
  }

  // RESTRICCIÓN DE SEGURIDAD: Un dueño/admin de consultorio NUNCA puede asignar el rol SUPERADMIN
  if (rol === ROLES.SUPERADMIN && req.usuario.rol !== ROLES.SUPERADMIN) {
    return res.status(403).json({ error: 'Acceso denegado: No está autorizado para asignar el rol SUPERADMIN' })
  }

  try {
    const usuarioObjetivo = await prisma.usuario.findUnique({
      where: { id: Number(id) }
    })

    if (!usuarioObjetivo) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    if (usuarioObjetivo.consultorio_id !== req.usuario.consultorio_id) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    const usuarioActualizado = await prisma.usuario.update({
      where: { id: usuarioObjetivo.id },
      data: {
        rol,
        token_version: usuarioObjetivo.token_version + 1
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true
      }
    })

    const diferencias = calcularDiferencias(
      { rol: usuarioObjetivo.rol },
      { rol: usuarioActualizado.rol },
      ['rol']
    )

    await registrarAuditoria({
      req,
      accion: 'CAMBIAR_ROL_USUARIO',
      modulo: 'Usuarios',
      recurso_id: usuarioActualizado.id,
      detalles: `Rol del usuario ${usuarioActualizado.email} cambiado de ${usuarioObjetivo.rol} a ${usuarioActualizado.rol}`,
      metadata: { cambios: diferencias }
    })

    res.json(usuarioActualizado)
  } catch (error) {
    console.error('Error al cambiar rol del usuario:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

module.exports = router
