const express = require('express')
const prisma = require('../lib/prisma')
const verificarToken = require('../middlewares/auth')

const router = express.Router()
router.use(verificarToken)

// GET /api/catalogo-cie10 — Buscar en el Catálogo Oficial CIE-10
router.get('/', async (req, res) => {
  const { q, categoria, page = 1, limit = 100 } = req.query

  const pageNum = Math.max(1, parseInt(page) || 1)
  const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 100))
  const skip = (pageNum - 1) * limitNum

  try {
    const where = { activo: true }

    if (categoria && categoria.trim() !== '' && categoria !== 'Todas') {
      where.categoria = { equals: categoria.trim(), mode: 'insensitive' }
    }

    if (q && q.trim() !== '') {
      const queryStr = q.trim()
      where.OR = [
        { codigo_cie10: { contains: queryStr, mode: 'insensitive' } },
        { nombre_oficial: { contains: queryStr, mode: 'insensitive' } }
      ]
    }

    const [total, items] = await Promise.all([
      prisma.catalogoOficialCie10.count({ where }),
      prisma.catalogoOficialCie10.findMany({
        where,
        orderBy: [
          { codigo_cie10: 'asc' }
        ],
        skip,
        take: limitNum
      })
    ])

    const mappedItems = items.map(item => ({
      id: item.id,
      codigo: item.codigo_cie10,
      codigo_cie10: item.codigo_cie10,
      nombreOficial: item.nombre_oficial,
      nombre_oficial: item.nombre_oficial,
      categoria: item.categoria,
      descripcion: item.descripcion,
      activo: item.activo
    }))

    res.json(mappedItems)
  } catch (error) {
    console.error('Error al obtener catálogo CIE-10:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

module.exports = router
