const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const prisma = require('../lib/prisma')

const router = express.Router()

// POST /api/auth/registro
router.post('/registro', async (req, res) => {
  const { email, password, nombre, registro, consultorio_id } = req.body

  if (!email || !password || !nombre) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' })
  }

  if (!consultorio_id) {
    return res.status(400).json({ error: 'El consultorio_id es obligatorio' })
  }

  try {
    const consultorio = await prisma.configuracion.findUnique({
      where: { id: consultorio_id }
    })
    if (!consultorio) {
      return res.status(404).json({ error: 'Consultorio no encontrado' })
    }

    const existe = await prisma.usuario.findUnique({ where: { email } })
    if (existe) {
      return res.status(400).json({ error: 'El correo ya está registrado' })
    }

    const password_hash = await bcrypt.hash(password, 10)

    const usuario = await prisma.usuario.create({
      data: {
        consultorio_id,
        email,
        password_hash,
        nombre,
        registro
      }
    })

    res.status(201).json({
      mensaje: 'Usuario creado correctamente',
      usuario: { id: usuario.id, email: usuario.email, nombre: usuario.nombre, consultorio_id: usuario.consultorio_id }
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Correo y contraseña son obligatorios' })
  }

  try {
    const usuario = await prisma.usuario.findUnique({ where: { email } })

    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }

    const passwordValida = await bcrypt.compare(password, usuario.password_hash)
    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        consultorio_id: usuario.consultorio_id,
        email: usuario.email,
        nombre: usuario.nombre
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    )

    res.json({
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        consultorio_id: usuario.consultorio_id
      }
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

module.exports = router