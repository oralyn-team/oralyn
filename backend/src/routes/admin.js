const express = require('express')
const prisma = require('../lib/prisma')
const bcrypt = require('bcryptjs')
const verificarToken = require('../middlewares/auth')
const { requireRole } = require('../middlewares/rbac')
const { ROLES } = require('../lib/permissions')
const { registrarAuditoria } = require('../services/audit.service')

const router = express.Router()

// Middleware de autenticación y autorización para Superadministradores
router.use(verificarToken, requireRole(ROLES.SUPERADMIN))

// POST /api/admin/consultorio — crear consultorio nuevo
router.post('/consultorio', async (req, res) => {
  const {
    nombre_consultorio,
    nombre_profesional,
    registro_profesional,
    nit,
    direccion,
    telefono,
    ciudad,
    email,
    usuario_email,
    usuario_password,
    usuario_nombre,
    usuario_registro
  } = req.body

  if (!nombre_consultorio || !nombre_profesional || !usuario_email || !usuario_password || !usuario_nombre) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' })
  }

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const consultorio = await tx.configuracion.create({
        data: {
          nombre_consultorio,
          nombre_profesional,
          registro_profesional,
          nit,
          direccion,
          telefono,
          ciudad: ciudad || 'Villavicencio',
          email,
          activo: true
        }
      })

      const password_hash = await bcrypt.hash(usuario_password, 10)
      const usuario = await tx.usuario.create({
        data: {
          consultorio_id: consultorio.id,
          email: usuario_email,
          password_hash,
          nombre: usuario_nombre,
          registro: usuario_registro,
          rol: ROLES.DUENO,
          activo: true
        }
      })

      return { consultorio, usuario }
    })

    await registrarAuditoria({
      req,
      accion: 'CREAR_CONSULTORIO',
      modulo: 'Superadmin',
      recurso_id: resultado.consultorio.id,
      detalles: `Consultorio ${resultado.consultorio.nombre_consultorio} creado con dueño ${resultado.usuario.email}`
    })

    res.status(201).json({
      mensaje: 'Consultorio creado correctamente',
      consultorio_id: resultado.consultorio.id,
      nombre_consultorio: resultado.consultorio.nombre_consultorio,
      usuario_email: resultado.usuario.email
    })
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'El correo del usuario ya está registrado' })
    }
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/admin/consultorios — listar todos los consultorios
router.get('/consultorios', async (req, res) => {
  try {
    const consultorios = await prisma.configuracion.findMany({
      orderBy: { creado_en: 'asc' },
      include: {
        _count: {
          select: { pacientes: true, usuarios: true, citas: true }
        }
      }
    })
    res.json(consultorios)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// PATCH /api/admin/consultorios/:id/status — Activar o desactivar consultorio
router.patch('/consultorios/:id/status', async (req, res) => {
  const { id } = req.params
  const { activo } = req.body

  if (typeof activo !== 'boolean') {
    return res.status(400).json({ error: 'El campo activo debe ser booleano' })
  }

  try {
    const consultorio = await prisma.configuracion.findUnique({
      where: { id: Number(id) }
    })

    if (!consultorio) {
      return res.status(404).json({ error: 'Consultorio no encontrado' })
    }

    const consultorioActualizado = await prisma.configuracion.update({
      where: { id: consultorio.id },
      data: { activo }
    })

    await registrarAuditoria({
      req,
      accion: activo ? 'ACTIVAR_CONSULTORIO' : 'DESACTIVAR_CONSULTORIO',
      modulo: 'Superadmin',
      recurso_id: consultorioActualizado.id,
      detalles: `Consultorio ${consultorioActualizado.nombre_consultorio} ${activo ? 'activado' : 'desactivado'}`
    })

    res.json(consultorioActualizado)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/admin/stats — Obtener estadísticas globales para Superadmin
router.get('/stats', async (req, res) => {
  try {
    const [totalConsultorios, totalUsuarios, totalPacientes, totalCitas] = await Promise.all([
      prisma.configuracion.count(),
      prisma.usuario.count(),
      prisma.paciente.count(),
      prisma.cita.count()
    ])

    res.json({
      totalConsultorios,
      totalUsuarios,
      totalPacientes,
      totalCitas
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

module.exports = router