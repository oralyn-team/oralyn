const express = require('express')
const prisma = require('../lib/prisma')
const verificarToken = require('../middlewares/auth')
const { ROLES } = require('../lib/permissions')

const router = express.Router()

router.use(verificarToken)

// GET /api/auditoria — Consultar logs de auditoría
router.get('/', async (req, res) => {
  const { rol: userRole, consultorio_id: userConsultorioId } = req.usuario

  // Solo SUPERADMIN y DUEÑO pueden consultar auditoría
  if (userRole !== ROLES.SUPERADMIN && userRole !== ROLES.DUENO) {
    return res.status(403).json({ error: 'Acceso denegado: No tiene permisos para consultar auditoría' })
  }

  try {
    const {
      consultorio_id,
      usuario_id,
      rol,
      modulo,
      accion,
      estado,
      fecha_inicio,
      fecha_fin,
      busqueda,
      page = 1,
      limit = 20
    } = req.query

    const where = {}

    // Filtro de alcance por tenant
    if (userRole === ROLES.SUPERADMIN) {
      if (consultorio_id) {
        where.consultorio_id = Number(consultorio_id)
      }
    } else {
      // El DUEÑO sólo puede consultar auditoría de su propio consultorio
      where.consultorio_id = userConsultorioId
    }

    if (usuario_id) {
      where.usuario_id = Number(usuario_id)
    }

    if (rol) {
      where.usuario_rol = String(rol)
    }

    if (modulo) {
      where.modulo = { contains: String(modulo), mode: 'insensitive' }
    }

    if (accion) {
      where.accion = { contains: String(accion), mode: 'insensitive' }
    }

    if (estado) {
      where.estado = String(estado)
    }

    if (fecha_inicio || fecha_fin) {
      where.creado_en = {}
      if (fecha_inicio) {
        where.creado_en.gte = new Date(fecha_inicio)
      }
      if (fecha_fin) {
        const fin = new Date(fecha_fin)
        fin.setHours(23, 59, 59, 999)
        where.creado_en.lte = fin
      }
    }

    if (busqueda) {
      where.OR = [
        { detalles: { contains: String(busqueda), mode: 'insensitive' } },
        { usuario_nombre: { contains: String(busqueda), mode: 'insensitive' } },
        { recurso_id: { contains: String(busqueda), mode: 'insensitive' } }
      ]
    }

    const pageNum = Math.max(Number(page) || 1, 1)
    const limitNum = Math.min(Math.max(Number(limit) || 20, 1), 100)
    const skip = (pageNum - 1) * limitNum

    const [total, registros] = await Promise.all([
      prisma.auditoria.count({ where }),
      prisma.auditoria.findMany({
        where,
        orderBy: { creado_en: 'desc' },
        skip,
        take: limitNum,
        include: {
          consultorio: {
            select: { id: true, nombre_consultorio: true }
          }
        }
      })
    ])

    res.json({
      data: registros,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    })
  } catch (error) {
    console.error('Error al consultar auditoría:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/auditoria/exportar — Exportar logs de auditoría a CSV (sin paginación, max 10,000)
router.get('/exportar', async (req, res) => {
  const { rol: userRole, consultorio_id: userConsultorioId } = req.usuario

  // Solo SUPERADMIN y DUEÑO pueden exportar auditoría
  if (userRole !== ROLES.SUPERADMIN && userRole !== ROLES.DUENO) {
    return res.status(403).json({ error: 'Acceso denegado: No tiene permisos para exportar auditoría' })
  }

  try {
    const {
      consultorio_id,
      usuario_id,
      rol,
      modulo,
      accion,
      estado,
      fecha_inicio,
      fecha_fin,
      busqueda
    } = req.query

    const where = {}

    // Filtro de alcance por tenant
    if (userRole === ROLES.SUPERADMIN) {
      if (consultorio_id) {
        where.consultorio_id = Number(consultorio_id)
      }
    } else {
      where.consultorio_id = userConsultorioId
    }

    if (usuario_id) {
      where.usuario_id = Number(usuario_id)
    }

    if (rol) {
      where.usuario_rol = String(rol)
    }

    if (modulo) {
      where.modulo = { contains: String(modulo), mode: 'insensitive' }
    }

    if (accion) {
      where.accion = { contains: String(accion), mode: 'insensitive' }
    }

    if (estado) {
      where.estado = String(estado)
    }

    if (fecha_inicio || fecha_fin) {
      where.creado_en = {}
      if (fecha_inicio) {
        where.creado_en.gte = new Date(fecha_inicio)
      }
      if (fecha_fin) {
        const fin = new Date(fecha_fin)
        fin.setHours(23, 59, 59, 999)
        where.creado_en.lte = fin
      }
    }

    if (busqueda) {
      where.OR = [
        { detalles: { contains: String(busqueda), mode: 'insensitive' } },
        { usuario_nombre: { contains: String(busqueda), mode: 'insensitive' } },
        { recurso_id: { contains: String(busqueda), mode: 'insensitive' } }
      ]
    }

    // Límite razonable para prevenir consumo excesivo de memoria (max 10,000 registros)
    const registros = await prisma.auditoria.findMany({
      where,
      orderBy: { creado_en: 'desc' },
      take: 10000,
      include: {
        consultorio: {
          select: { nombre_consultorio: true }
        }
      }
    })

    const escapeCsvField = (val) => {
      if (val === null || val === undefined) return '""'
      const str = String(val).replace(/"/g, '""')
      return `"${str}"`
    }

    const headers = [
      'Fecha y Hora',
      'Usuario',
      'Rol',
      'Consultorio',
      'Módulo',
      'Acción',
      'Recurso ID',
      'Estado',
      'IP Address'
    ]

    const rows = [headers.map(escapeCsvField).join(',')]

    for (const log of registros) {
      const fechaStr = log.creado_en ? new Date(log.creado_en).toLocaleString('es-CO') : ''
      const usuarioStr = log.usuario_nombre || 'Sistema'
      const rolStr = log.usuario_rol || 'Sistema'
      const consultorioStr = log.consultorio?.nombre_consultorio || 'Plataforma'
      const moduloStr = log.modulo || ''
      const accionStr = log.accion || ''
      const recursoStr = log.recurso_id || ''
      const estadoStr = log.estado || ''
      const ipStr = log.ip_address || ''

      rows.push([
        escapeCsvField(fechaStr),
        escapeCsvField(usuarioStr),
        escapeCsvField(rolStr),
        escapeCsvField(consultorioStr),
        escapeCsvField(moduloStr),
        escapeCsvField(accionStr),
        escapeCsvField(recursoStr),
        escapeCsvField(estadoStr),
        escapeCsvField(ipStr)
      ].join(','))
    }

    const csvContent = '\uFEFF' + rows.join('\r\n')
    const hoy = new Date().toISOString().split('T')[0]

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="auditoria-${hoy}.csv"`)
    return res.send(csvContent)
  } catch (error) {
    console.error('Error al exportar auditoría:', error)
    res.status(500).json({ error: 'Error interno del servidor al exportar auditoría' })
  }
})

module.exports = router

