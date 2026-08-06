const express = require('express')
const prisma = require('../lib/prisma')
const verificarToken = require('../middlewares/auth')

const router = express.Router()
router.use(verificarToken)

// GET /api/usuarios — Listar los profesionales/usuarios del consultorio autenticado
router.get('/', async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: { consultorio_id: req.usuario.consultorio_id },
      select: { id: true, nombre: true, registro: true },
      orderBy: { nombre: 'asc' }
    })
    res.json(usuarios)
  } catch (error) {
    console.error('Error al listar usuarios:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

module.exports = router
