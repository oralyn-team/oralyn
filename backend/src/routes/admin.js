const express = require('express')
const prisma = require('../lib/prisma')
const bcrypt = require('bcryptjs')
const verificarAdmin = require('../middlewares/verificarAdmin')

const router = express.Router()

router.use(verificarAdmin)

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
    // datos del primer usuario admin del consultorio
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
      // Crear consultorio
      const consultorio = await tx.configuracion.create({
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

      // Crear usuario admin del consultorio
      const password_hash = await bcrypt.hash(usuario_password, 10)
      const usuario = await tx.usuario.create({
        data: {
          consultorio_id: consultorio.id,
          email: usuario_email,
          password_hash,
          nombre: usuario_nombre,
          registro: usuario_registro
        }
      })

      return { consultorio, usuario }
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
          select: { pacientes: true, usuarios: true }
        }
      }
    })
    res.json(consultorios)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

module.exports = router