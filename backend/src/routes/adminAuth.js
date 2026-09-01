const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { rateLimit } = require('express-rate-limit')
const prisma = require('../lib/prisma')
const { getAdminSecret } = require('../lib/adminSecret')

const router = express.Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 intentos por IP en la ventana
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en unos minutos.' }
})

// POST /api/admin/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Correo y contraseña son obligatorios' })
  }

  try {
    const admin = await prisma.administrador.findUnique({
      where: { email }
    })

    // Mensaje de error genérico para no dar pistas sobre si el correo existe
    const errorGenerico = 'Credenciales incorrectas'

    if (!admin) {
      return res.status(401).json({ error: errorGenerico })
    }

    if (!admin.activo) {
      return res.status(401).json({ error: errorGenerico })
    }

    const passwordValida = await bcrypt.compare(password, admin.password_hash)
    if (!passwordValida) {
      return res.status(401).json({ error: errorGenerico })
    }

    // Actualizar último login
    await prisma.administrador.update({
      where: { id: admin.id },
      data: { ultimo_login: new Date() }
    })

    const secret = getAdminSecret()

    // Generar token JWT con rol admin
    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        nombre: admin.nombre,
        role: 'admin'
      },
      secret,
      { expiresIn: '2h' }
    )

    res.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        nombre: admin.nombre
      }
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

module.exports = router
