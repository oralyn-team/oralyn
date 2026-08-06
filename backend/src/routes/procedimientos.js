const express = require('express')
const prisma = require('../lib/prisma')
const verificarToken = require('../middlewares/auth')

const router = express.Router()
router.use(verificarToken)

// GET /api/procedimientos — Listar repertorio del consultorio
router.get('/', async (req, res) => {
  const consultorioId = req.usuario.consultorio_id
  const { q, categoria, activo, page, limit } = req.query

  try {
    const where = { consultorio_id: consultorioId }

    if (activo !== undefined && activo !== null && activo !== '') {
      where.activo = String(activo) === 'true'
    }

    if (categoria && categoria.trim() !== '' && categoria !== 'Todas') {
      where.catalogo_oficial = {
        categoria: { equals: categoria.trim(), mode: 'insensitive' }
      }
    }

    if (q && q.trim() !== '') {
      const queryStr = q.trim()
      where.OR = [
        { nombre_visible: { contains: queryStr, mode: 'insensitive' } },
        { catalogo_oficial: { codigo_cups: { contains: queryStr, mode: 'insensitive' } } },
        { catalogo_oficial: { nombre_oficial: { contains: queryStr, mode: 'insensitive' } } }
      ]
    }

    let items
    let paginationMeta = null

    if (page && limit) {
      const pageNum = Math.max(1, parseInt(page) || 1)
      const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 20))
      const skip = (pageNum - 1) * limitNum

      const [total, results] = await Promise.all([
        prisma.procedimientoConsultorio.count({ where }),
        prisma.procedimientoConsultorio.findMany({
          where,
          include: { catalogo_oficial: true },
          orderBy: { nombre_visible: 'asc' },
          skip,
          take: limitNum
        })
      ])

      items = results
      paginationMeta = {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    } else {
      items = await prisma.procedimientoConsultorio.findMany({
        where,
        include: { catalogo_oficial: true },
        orderBy: { nombre_visible: 'asc' }
      })
    }

    const mapped = items.map(p => ({
      id: p.id,
      consultorio_id: p.consultorio_id,
      catalogo_oficial_id: p.catalogo_oficial_id,
      codigo: p.catalogo_oficial?.codigo_cups || '',
      codigo_cups: p.catalogo_oficial?.codigo_cups || '',
      nombreOficial: p.catalogo_oficial?.nombre_oficial || '',
      nombre_oficial: p.catalogo_oficial?.nombre_oficial || '',
      nombre: p.nombre_visible,
      nombre_visible: p.nombre_visible,
      categoria: p.catalogo_oficial?.categoria || 'General',
      valorBase: p.precio ? Number(p.precio) : 0,
      precio: p.precio ? Number(p.precio) : 0,
      activo: p.activo,
      createdAt: p.creado_en,
      updatedAt: p.actualizado_en
    }))

    if (paginationMeta) {
      return res.json({ data: mapped, ...paginationMeta })
    }

    res.json(mapped)
  } catch (error) {
    console.error('Error al listar procedimientos:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// POST /api/procedimientos — Agregar procedimiento del catálogo oficial al consultorio
router.post('/', async (req, res) => {
  const consultorioId = req.usuario.consultorio_id
  const { catalogo_oficial_id, nombre_visible, nombre, precio, valorBase, activo } = req.body

  const oficialId = parseInt(catalogo_oficial_id)
  const nombreFinal = (nombre_visible || nombre || '').trim()

  if (!oficialId || isNaN(oficialId)) {
    return res.status(400).json({ error: 'Debe seleccionar un procedimiento del Catálogo Oficial CUPS.' })
  }

  if (!nombreFinal) {
    return res.status(400).json({ error: 'El nombre visible es obligatorio.' })
  }

  try {
    // Validar que el catálogo oficial existe
    const oficial = await prisma.catalogoOficialCups.findUnique({
      where: { id: oficialId }
    })
    if (!oficial) {
      return res.status(404).json({ error: 'Procedimiento del Catálogo Oficial no encontrado.' })
    }

    const valorNum = (precio !== undefined && precio !== null && precio !== '')
      ? Number(precio)
      : (valorBase !== undefined && valorBase !== null && valorBase !== '')
        ? Number(valorBase)
        : null

    // Validar si el consultorio ya registró este procedimiento oficial
    const existe = await prisma.procedimientoConsultorio.findUnique({
      where: {
        consultorio_id_catalogo_oficial_id: {
          consultorio_id: consultorioId,
          catalogo_oficial_id: oficialId
        }
      }
    })

    if (existe && existe.activo) {
      return res.status(400).json({ error: 'Este procedimiento del catálogo oficial ya se encuentra registrado y activo en el consultorio.' })
    }

    if (existe && !existe.activo) {
      // Reactivar en vez de crear uno nuevo
      const reactivado = await prisma.procedimientoConsultorio.update({
        where: { id: existe.id },
        data: {
          activo: true,
          nombre_visible: nombreFinal,
          precio: valorNum
        },
        include: { catalogo_oficial: true }
      })

      const respuesta = {
        id: reactivado.id,
        consultorio_id: reactivado.consultorio_id,
        catalogo_oficial_id: reactivado.catalogo_oficial_id,
        codigo: reactivado.catalogo_oficial?.codigo_cups || '',
        codigo_cups: reactivado.catalogo_oficial?.codigo_cups || '',
        nombreOficial: reactivado.catalogo_oficial?.nombre_oficial || '',
        nombre_oficial: reactivado.catalogo_oficial?.nombre_oficial || '',
        nombre: reactivado.nombre_visible,
        nombre_visible: reactivado.nombre_visible,
        categoria: reactivado.catalogo_oficial?.categoria || 'General',
        valorBase: reactivado.precio ? Number(reactivado.precio) : 0,
        precio: reactivado.precio ? Number(reactivado.precio) : 0,
        activo: reactivado.activo,
        createdAt: reactivado.creado_en,
        updatedAt: reactivado.actualizado_en,
        _reactivado: true
      }

      return res.status(200).json(respuesta)
    }

    const nuevo = await prisma.procedimientoConsultorio.create({
      data: {
        consultorio_id: consultorioId,
        catalogo_oficial_id: oficialId,
        nombre_visible: nombreFinal,
        precio: valorNum,
        activo: activo !== false
      },
      include: { catalogo_oficial: true }
    })

    const respuesta = {
      id: nuevo.id,
      consultorio_id: nuevo.consultorio_id,
      catalogo_oficial_id: nuevo.catalogo_oficial_id,
      codigo: nuevo.catalogo_oficial?.codigo_cups || '',
      codigo_cups: nuevo.catalogo_oficial?.codigo_cups || '',
      nombreOficial: nuevo.catalogo_oficial?.nombre_oficial || '',
      nombre_oficial: nuevo.catalogo_oficial?.nombre_oficial || '',
      nombre: nuevo.nombre_visible,
      nombre_visible: nuevo.nombre_visible,
      categoria: nuevo.catalogo_oficial?.categoria || 'General',
      valorBase: nuevo.precio ? Number(nuevo.precio) : 0,
      precio: nuevo.precio ? Number(nuevo.precio) : 0,
      activo: nuevo.activo,
      createdAt: nuevo.creado_en,
      updatedAt: nuevo.actualizado_en
    }

    res.status(201).json(respuesta)
  } catch (error) {
    console.error('Error al crear procedimiento:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// PUT /api/procedimientos/:id — Modificar configuración propia del consultorio
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  const consultorioId = req.usuario.consultorio_id
  const { nombre_visible, nombre, precio, valorBase, activo } = req.body

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: 'ID de procedimiento no válido' })
  }

  try {
    const existe = await prisma.procedimientoConsultorio.findFirst({
      where: { id, consultorio_id: consultorioId }
    })

    if (!existe) {
      return res.status(404).json({ error: 'Procedimiento no encontrado en el consultorio' })
    }

    const dataToUpdate = {}

    const nombreFinal = (nombre_visible || nombre)
    if (nombreFinal !== undefined && nombreFinal !== null) {
      if (!String(nombreFinal).trim()) {
        return res.status(400).json({ error: 'El nombre visible no puede estar vacío' })
      }
      dataToUpdate.nombre_visible = String(nombreFinal).trim()
    }

    const valorInput = precio !== undefined ? precio : valorBase
    if (valorInput !== undefined && valorInput !== null) {
      dataToUpdate.precio = valorInput !== '' ? Number(valorInput) : null
    }

    if (activo !== undefined && activo !== null) {
      dataToUpdate.activo = Boolean(activo)
    }

    const actualizado = await prisma.procedimientoConsultorio.update({
      where: { id },
      data: dataToUpdate,
      include: { catalogo_oficial: true }
    })

    const respuesta = {
      id: actualizado.id,
      consultorio_id: actualizado.consultorio_id,
      catalogo_oficial_id: actualizado.catalogo_oficial_id,
      codigo: actualizado.catalogo_oficial?.codigo_cups || '',
      codigo_cups: actualizado.catalogo_oficial?.codigo_cups || '',
      nombreOficial: actualizado.catalogo_oficial?.nombre_oficial || '',
      nombre_oficial: actualizado.catalogo_oficial?.nombre_oficial || '',
      nombre: actualizado.nombre_visible,
      nombre_visible: actualizado.nombre_visible,
      categoria: actualizado.catalogo_oficial?.categoria || 'General',
      valorBase: actualizado.precio ? Number(actualizado.precio) : 0,
      precio: actualizado.precio ? Number(actualizado.precio) : 0,
      activo: actualizado.activo,
      createdAt: actualizado.creado_en,
      updatedAt: actualizado.actualizado_en
    }

    res.json(respuesta)
  } catch (error) {
    console.error('Error al actualizar procedimiento:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// DELETE /api/procedimientos/:id — Eliminación lógica (desactivar)
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  const consultorioId = req.usuario.consultorio_id

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: 'ID de procedimiento no válido' })
  }

  try {
    const existe = await prisma.procedimientoConsultorio.findFirst({
      where: { id, consultorio_id: consultorioId }
    })

    if (!existe) {
      return res.status(404).json({ error: 'Procedimiento no encontrado' })
    }

    const citasFuturasPendientes = await prisma.cita.count({
      where: {
        procedimiento_consultorio_id: id,
        estado: 'pendiente',
        fecha_hora: { gte: new Date() }
      }
    })

    await prisma.procedimientoConsultorio.update({
      where: { id },
      data: { activo: false }
    })

    res.status(200).json({
      message: 'Procedimiento desactivado correctamente',
      advertencia: citasFuturasPendientes > 0
        ? `Este procedimiento tiene ${citasFuturasPendientes} cita(s) pendiente(s) que aún lo referencian.`
        : null
    })
  } catch (error) {
    console.error('Error al desactivar procedimiento:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

module.exports = router
