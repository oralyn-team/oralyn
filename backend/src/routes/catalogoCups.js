const express = require('express')
const prisma = require('../lib/prisma')
const verificarToken = require('../middlewares/auth')

const router = express.Router()
router.use(verificarToken)

// GET /api/catalogo-cups — Buscar en el Catálogo Oficial CUPS
router.get('/', async (req, res) => {
  const { q, categoria, frecuentes, page = 1, limit = 100 } = req.query

  const pageNum = Math.max(1, parseInt(page) || 1)
  const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 100))
  const skip = (pageNum - 1) * limitNum

  try {
    const where = { activo: true }

    if (frecuentes === 'true' || frecuentes === true) {
      where.es_frecuente = true
    }

    if (categoria && categoria.trim() !== '' && categoria !== 'Todas') {
      where.categoria = { equals: categoria.trim(), mode: 'insensitive' }
    }

    if (q && q.trim() !== '') {
      const queryStr = q.trim()
      where.OR = [
        { codigo_cups: { contains: queryStr, mode: 'insensitive' } },
        { nombre_oficial: { contains: queryStr, mode: 'insensitive' } }
      ]
    }

    const [total, items] = await Promise.all([
      prisma.catalogoOficialCups.count({ where }),
      prisma.catalogoOficialCups.findMany({
        where,
        orderBy: [
          { es_frecuente: 'desc' },
          { codigo_cups: 'asc' }
        ],
        skip,
        take: limitNum
      })
    ])

    const mappedItems = items.map(item => ({
      id: item.id,
      codigo: item.codigo_cups,
      codigo_cups: item.codigo_cups,
      nombreOficial: item.nombre_oficial,
      nombre_oficial: item.nombre_oficial,
      categoria: item.categoria,
      descripcion: item.descripcion,
      frecuente: item.es_frecuente,
      es_frecuente: item.es_frecuente,
      activo: item.activo
    }))

    // Retorna tanto el formato paginado como el array directo por compatibilidad con el frontend si fuera un array
    res.json(mappedItems)
  } catch (error) {
    console.error('Error al obtener catálogo CUPS:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

module.exports = router
