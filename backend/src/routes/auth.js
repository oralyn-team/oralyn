const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { rateLimit } = require('express-rate-limit')
const prisma = require('../lib/prisma')
const verificarToken = require('../middlewares/auth')

const router = express.Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 intentos por IP en la ventana
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en unos minutos.' }
})

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
        registro,
        token_version: 0
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
router.post('/login', loginLimiter, async (req, res) => {
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
        nombre: usuario.nombre,
        tv: usuario.token_version
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    )

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 8 * 60 * 60 * 1000 // 8 horas
    })

    res.json({
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

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  })
  res.json({ mensaje: 'Sesión cerrada correctamente' })
})

// GET /api/auth/me
router.get('/me', verificarToken, (req, res) => {
  res.json({ usuario: req.usuario })
})

// POST /api/auth/change-password
router.post('/change-password', verificarToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'La contraseña actual y la nueva son obligatorias' })
  }

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario.id }
    })

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    const passwordValida = await bcrypt.compare(currentPassword, usuario.password_hash)
    if (!passwordValida) {
      return res.status(400).json({ error: 'Contraseña actual incorrecta' })
    }

    const password_hash = await bcrypt.hash(newPassword, 10)

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        password_hash,
        token_version: { increment: 1 }
      }
    })

    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    })

    res.json({ mensaje: 'Contraseña cambiada con éxito' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

module.exports = router