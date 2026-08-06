const express = require('express')
const prisma = require('../lib/prisma')
const verificarToken = require('../middlewares/auth')
const { validarRips } = require('../services/ripsValidator.service')
const { construirRips } = require('../services/ripsBuilder.service')

const router = express.Router()
router.use(verificarToken)

function formatearPeriodo(inicioStr, finStr) {
  try {
    const dInicio = new Date(inicioStr)
    const dFin = new Date(finStr)
    const opcionesMes = { month: 'long', year: 'numeric' }
    const mesNom = dInicio.toLocaleDateString('es-CO', opcionesMes)
    const mesCap = mesNom.charAt(0).toUpperCase() + mesNom.slice(1)
    const f1 = dInicio.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const f2 = dFin.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
    return `${mesCap} (${f1} - ${f2})`
  } catch (e) {
    return `${inicioStr} - ${finStr}`
  }
}

function formatearFechaGeneracion(date) {
  if (!date) return '—'
  return new Date(date).toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

// GET /api/rips — Listar generaciones de RIPS (snapshots)
router.get('/', async (req, res) => {
  const consultorioId = req.usuario.consultorio_id
  const { fecha_inicio, fecha_fin, estado, profesional, page = 1, limit = 20 } = req.query

  const pageNum = Math.max(1, parseInt(page) || 1)
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20))
  const skip = (pageNum - 1) * limitNum

  try {
    const where = { consultorio_id: consultorioId }

    if (estado && estado !== 'Todos') {
      where.estado = estado
    }

    if (fecha_inicio) {
      where.fecha_inicio = { gte: new Date(fecha_inicio) }
    }

    if (fecha_fin) {
      where.fecha_fin = { lte: new Date(fecha_fin) }
    }

    const [total, items] = await Promise.all([
      prisma.ripsGeneracion.count({ where }),
      prisma.ripsGeneracion.findMany({
        where,
        orderBy: { creado_en: 'desc' },
        skip,
        take: limitNum
      })
    ])

    const mapped = items.map(gen => {
      const json = gen.json_generado || {}
      const fInicioStr = gen.fecha_inicio.toISOString().split('T')[0]
      const fFinStr = gen.fecha_fin.toISOString().split('T')[0]

      return {
        id: gen.id,
        consultorio_id: gen.consultorio_id,
        periodo: formatearPeriodo(fInicioStr, fFinStr),
        fechaInicial: fInicioStr,
        fechaFinal: fFinStr,
        fechaGeneracion: formatearFechaGeneracion(gen.creado_en),
        cantidadRegistros: gen.cantidad_registros,
        pacientesCount: json.resumen?.totalPacientes || 0,
        procedimientosCount: json.resumen?.totalProcedimientos || gen.cantidad_registros,
        profesionales: json.resumen?.profesionales || 'Sin profesional asignado',
        estado: gen.estado === 'generado' ? 'Generado' : gen.estado === 'con_errores' ? 'Con observaciones' : gen.estado,
        inconsistencias: json.inconsistencias || [],
        json_generado: json,
        createdAt: gen.creado_en
      }
    })

    // Si la query del profesional está especificada, filtrar
    let resultadoFinal = mapped
    if (profesional && profesional !== 'Todos') {
      resultadoFinal = mapped.filter(m => m.profesionales.toLowerCase().includes(profesional.toLowerCase()))
    }

    res.json(resultadoFinal)
  } catch (error) {
    console.error('Error al listar generaciones RIPS:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/rips/:id — Detalle de una generación RIPS (snapshot)
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  const consultorioId = req.usuario.consultorio_id

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: 'ID de generación no válido' })
  }

  try {
    const gen = await prisma.ripsGeneracion.findFirst({
      where: { id, consultorio_id: consultorioId }
    })

    if (!gen) {
      return res.status(404).json({ error: 'Generación RIPS no encontrada' })
    }

    const json = gen.json_generado || {}
    const fInicioStr = gen.fecha_inicio.toISOString().split('T')[0]
    const fFinStr = gen.fecha_fin.toISOString().split('T')[0]

    res.json({
      id: gen.id,
      consultorio_id: gen.consultorio_id,
      periodo: formatearPeriodo(fInicioStr, fFinStr),
      fechaInicial: fInicioStr,
      fechaFinal: fFinStr,
      fechaGeneracion: formatearFechaGeneracion(gen.creado_en),
      cantidadRegistros: gen.cantidad_registros,
      pacientesCount: json.resumen?.totalPacientes || 0,
      procedimientosCount: json.resumen?.totalProcedimientos || gen.cantidad_registros,
      profesionales: json.resumen?.profesionales || 'Sin profesional asignado',
      estado: gen.estado === 'generado' ? 'Generado' : gen.estado === 'con_errores' ? 'Con observaciones' : gen.estado,
      inconsistencias: json.inconsistencias || [],
      json_generado: json,
      createdAt: gen.creado_en
    })
  } catch (error) {
    console.error('Error al obtener detalle RIPS:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

function escapeCSV(val) {
  if (val === undefined || val === null) return '""'
  const str = String(val).replace(/"/g, '""')
  return `"${str}"`
}

// GET /api/rips/:id/descargar — Descargar archivo RIPS en JSON o CSV
router.get('/:id/descargar', async (req, res) => {
  const id = parseInt(req.params.id)
  const consultorioId = req.usuario.consultorio_id
  const formato = (req.query.formato || 'json').toLowerCase()

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: 'ID de generación no válido' })
  }

  try {
    const gen = await prisma.ripsGeneracion.findFirst({
      where: { id, consultorio_id: consultorioId }
    })

    if (!gen) {
      return res.status(404).json({ error: 'Generación RIPS no encontrada' })
    }

    if (gen.estado !== 'generado') {
      return res.status(400).json({ error: 'Esta generación tiene observaciones pendientes, corrígelas antes de descargar' })
    }

    const fInicioStr = gen.fecha_inicio.toISOString().split('T')[0]
    const fFinStr = gen.fecha_fin.toISOString().split('T')[0]
    const json = gen.json_generado || {}

    if (formato === 'csv') {
      const procs = json.procedimientos || []
      const headers = ['fecha', 'paciente', 'documento', 'codigoCups', 'nombreProcedimiento', 'codigoCie10', 'doctor', 'valorCobrado']
      const rows = [headers.map(escapeCSV).join(',')]

      for (const p of procs) {
        const fecha = p.fechaHora ? p.fechaHora.split('T')[0] : ''
        rows.push([
          escapeCSV(fecha),
          escapeCSV(p.pacienteNombre),
          escapeCSV(p.pacienteDocumento),
          escapeCSV(p.codigoCups),
          escapeCSV(p.nombreProcedimiento),
          escapeCSV(p.codigoCie10),
          escapeCSV(p.doctor),
          escapeCSV(p.valorCobrado)
        ].join(','))
      }

      const csvContent = '\uFEFF' + rows.join('\r\n')
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="rips_${gen.id}_${fInicioStr}_${fFinStr}.csv"`)
      return res.send(csvContent)
    }

    // Default: JSON
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="rips_${gen.id}_${fInicioStr}_${fFinStr}.json"`)
    return res.send(JSON.stringify(json, null, 2))
  } catch (error) {
    console.error('Error al descargar RIPS:', error)
    res.status(500).json({ error: 'Error interno del servidor al descargar RIPS' })
  }
})

// POST /api/rips/generar — Generar RIPS y snapshot
router.post('/generar', async (req, res) => {
  const consultorioId = req.usuario.consultorio_id
  const { fecha_inicio, fecha_fin, fechaInicial, fechaFinal } = req.body

  const startStr = fecha_inicio || fechaInicial
  const endStr = fecha_fin || fechaFinal

  if (!startStr || !endStr) {
    return res.status(400).json({ error: 'Fecha inicial y fecha final son obligatorias' })
  }

  const dInicio = new Date(startStr)
  dInicio.setHours(0, 0, 0, 0)
  const dFin = new Date(endStr)
  dFin.setHours(23, 59, 59, 999)

  if (isNaN(dInicio.getTime()) || isNaN(dFin.getTime())) {
    return res.status(400).json({ error: 'Fechas no válidas' })
  }

  try {
    // 1. Validar
    const resultadoValidacion = await validarRips(consultorioId, dInicio, dFin)

    if (!resultadoValidacion.valido) {
      // Si existen errores, devolvemos el informe de inconsistencias
      return res.status(200).json({
        valido: false,
        estado: 'Con observaciones',
        inconsistencias: resultadoValidacion.errores,
        cantidadInconsistencias: resultadoValidacion.errores.length
      })
    }

    // 2. Si no hay errores, construir el RIPS
    const ripsJson = await construirRips(consultorioId, dInicio, dFin)

    // 3. Guardar Snapshot en rips_generaciones
    const snapshot = await prisma.ripsGeneracion.create({
      data: {
        consultorio_id: consultorioId,
        fecha_inicio: dInicio,
        fecha_fin: dFin,
        cantidad_registros: ripsJson.procedimientos?.length || 0,
        estado: 'generado',
        json_generado: ripsJson
      }
    })

    const fInicioStr = snapshot.fecha_inicio.toISOString().split('T')[0]
    const fFinStr = snapshot.fecha_fin.toISOString().split('T')[0]

    // 4. Retornar el resultado
    res.status(201).json({
      valido: true,
      mensaje: 'RIPS generado exitosamente',
      generacion: {
        id: snapshot.id,
        periodo: formatearPeriodo(fInicioStr, fFinStr),
        fechaInicial: fInicioStr,
        fechaFinal: fFinStr,
        fechaGeneracion: formatearFechaGeneracion(snapshot.creado_en),
        cantidadRegistros: snapshot.cantidad_registros,
        pacientesCount: ripsJson.resumen?.totalPacientes || 0,
        procedimientosCount: ripsJson.resumen?.totalProcedimientos || 0,
        profesionales: ripsJson.resumen?.profesionales || '',
        estado: 'Generado',
        inconsistencias: [],
        json_generado: ripsJson
      }
    })
  } catch (error) {
    console.error('Error al generar RIPS:', error)
    res.status(500).json({ error: 'Error interno del servidor al generar RIPS' })
  }
})

module.exports = router
