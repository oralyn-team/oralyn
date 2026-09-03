const express = require('express')
const prisma = require('../lib/prisma')
const verificarToken = require('../middlewares/auth')
const { requirePermission, restrictSuperadminClinicalAccess } = require('../middlewares/rbac')
const { PERMISSIONS } = require('../lib/permissions')
const { registrarAuditoria, calcularDiferencias } = require('../services/audit.service')

const router = express.Router()
router.use(verificarToken)
router.use(restrictSuperadminClinicalAccess) // Restringe a SUPERADMIN de ver/modificar citas

// POST /api/citas — crear cita
router.post('/', requirePermission(PERMISSIONS.APPOINTMENTS_CREATE), async (req, res) => {
  const {
    paciente_id,
    fecha_hora,
    doctor,
    procedimiento,
    procedimiento_consultorio_id,
    procedimiento_cotizacion_id,
    codigo_cups,
    codigo_cie10,
    valor_cobrado,
    observaciones,
    causas_no_atencion
  } = req.body

  if (!paciente_id || !fecha_hora || !procedimiento) {
    return res.status(400).json({ error: 'Paciente, fecha y procedimiento son obligatorios' })
  }

  if (valor_cobrado !== undefined && valor_cobrado !== null && valor_cobrado !== '') {
    const val = Number(valor_cobrado)
    if (isNaN(val) || val < 0) {
      return res.status(400).json({ error: 'El valor cobrado debe ser un número mayor o igual a 0' })
    }
  }

  try {
    const paciente = await prisma.paciente.findFirst({
      where: { id: paciente_id, consultorio_id: req.usuario.consultorio_id, activo: true }
    })
    if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' })

    let procConsultorio = null
    let codigoCupsDerivado = codigo_cups ?? null
    if (procedimiento_consultorio_id !== undefined && procedimiento_consultorio_id !== null && procedimiento_consultorio_id !== '') {
      const procId = parseInt(procedimiento_consultorio_id)
      if (isNaN(procId)) {
        return res.status(400).json({ error: 'procedimiento_consultorio_id debe ser un número válido' })
      }
      procConsultorio = await prisma.procedimientoConsultorio.findFirst({
        where: { id: procId, consultorio_id: req.usuario.consultorio_id },
        include: { catalogo_oficial: true }
      })
      if (!procConsultorio) {
        return res.status(400).json({ error: 'El procedimiento seleccionado no existe o pertenece a otro consultorio' })
      }
      if (!codigoCupsDerivado && procConsultorio.catalogo_oficial?.codigo_cups) {
        codigoCupsDerivado = procConsultorio.catalogo_oficial.codigo_cups
      }
    }

    let procCot = null
    if (procedimiento_cotizacion_id !== undefined && procedimiento_cotizacion_id !== null && procedimiento_cotizacion_id !== '') {
      const procCotId = parseInt(procedimiento_cotizacion_id)
      if (isNaN(procCotId)) {
        return res.status(400).json({ error: 'procedimiento_cotizacion_id debe ser un número válido' })
      }
      procCot = await prisma.procedimientoCotizacion.findFirst({
        where: {
          id: procCotId,
          cotizacion: { consultorio_id: req.usuario.consultorio_id, paciente_id }
        }
      })
      if (!procCot) {
        return res.status(400).json({ error: 'El procedimiento cotizado no existe o pertenece a otro paciente/consultorio' })
      }
    }

    let valorCobradoFinal = null
    if (valor_cobrado !== undefined && valor_cobrado !== null && valor_cobrado !== '') {
      valorCobradoFinal = Number(valor_cobrado)
    } else if (procCot) {
      valorCobradoFinal = Number(procCot.subtotal)
    }

    const cita = await prisma.cita.create({
      data: {
        consultorio_id: req.usuario.consultorio_id,
        paciente_id,
        fecha_hora: new Date(fecha_hora),
        doctor:              doctor              ?? null,
        procedimiento,
        procedimiento_consultorio_id: procConsultorio ? procConsultorio.id : null,
        procedimiento_cotizacion_id:  procCot ? procCot.id : null,
        codigo_cups:         codigoCupsDerivado,
        codigo_cie10:        (codigo_cie10 && typeof codigo_cie10 === 'string' && codigo_cie10.trim()) || 'Z012',
        valor_cobrado:       valorCobradoFinal,
        observaciones:       observaciones       ?? null,
        causas_no_atencion:  causas_no_atencion  ?? null,
      }
    })

    await registrarAuditoria({
      req,
      accion: 'CREAR_CITA',
      modulo: 'Citas',
      recurso_id: cita.id,
      detalles: `Cita programada para el paciente #${paciente_id} el ${cita.fecha_hora}`
    })

    res.status(201).json(cita)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/citas — listar citas (excluye canceladas por defecto)
router.get('/', requirePermission(PERMISSIONS.APPOINTMENTS_READ), async (req, res) => {
  const { fecha, incluir_canceladas } = req.query
  try {
    let where = { consultorio_id: req.usuario.consultorio_id }

    if (!incluir_canceladas) {
      where.estado = { not: 'cancelada' }
    }

    if (fecha) {
      const baseDate = new Date(fecha)
      if (isNaN(baseDate.getTime())) {
        return res.status(400).json({ error: 'Fecha no válida' })
      }
      const y = baseDate.getUTCFullYear()
      const m = baseDate.getUTCMonth()
      const d = baseDate.getUTCDate()

      const inicio = new Date(Date.UTC(y, m, d, 0, 0, 0, 0))
      const fin = new Date(Date.UTC(y, m, d, 23, 59, 59, 999))
      where.fecha_hora = { gte: inicio, lte: fin }
    }

    const citas = await prisma.cita.findMany({
      where,
      orderBy: { fecha_hora: 'asc' },
      include: {
        paciente: {
          select: { id: true, nombres: true, primer_apellido: true, segundo_apellido: true, numero_documento: true, telefono: true }
        }
      }
    })
    res.json(citas)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/citas/paciente/:pacienteId — citas de un paciente
router.get('/paciente/:pacienteId', requirePermission(PERMISSIONS.APPOINTMENTS_READ), async (req, res) => {
  const pacienteId = parseInt(req.params.pacienteId)
  const { incluir_canceladas } = req.query
  try {
    let where = {
      paciente_id: pacienteId,
      consultorio_id: req.usuario.consultorio_id
    }

    if (!incluir_canceladas) {
      where.estado = { not: 'cancelada' }
    }

    const citas = await prisma.cita.findMany({
      where,
      orderBy: { fecha_hora: 'desc' }
    })
    res.json(citas)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/citas/:id — detalle de una cita
router.get('/:id', requirePermission(PERMISSIONS.APPOINTMENTS_READ), async (req, res) => {
  const id = parseInt(req.params.id)
  try {
    const cita = await prisma.cita.findFirst({
      where: { id, consultorio_id: req.usuario.consultorio_id },
      include: {
        paciente: {
          select: { id: true, nombres: true, primer_apellido: true, segundo_apellido: true, numero_documento: true, telefono: true, municipio_ciudad: true }
        }
      }
    })
    if (!cita) return res.status(404).json({ error: 'Cita no encontrada' })
    res.json(cita)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// PATCH /api/citas/:id/estado — cambiar estado
router.patch('/:id/estado', requirePermission(PERMISSIONS.APPOINTMENTS_UPDATE), async (req, res) => {
  const id = parseInt(req.params.id)
  const { estado } = req.body

  const estadosValidos = ['pendiente', 'asistio', 'no_asistio', 'cancelada']
  if (!estado || !estadosValidos.includes(estado)) {
    return res.status(400).json({ error: 'Estado no válido' })
  }

  try {
    const existe = await prisma.cita.findFirst({
      where: { id, consultorio_id: req.usuario.consultorio_id }
    })
    if (!existe) return res.status(404).json({ error: 'Cita no encontrada' })

    const cita = await prisma.cita.update({ where: { id }, data: { estado } })

    if (estado === 'asistio' && existe.procedimiento_cotizacion_id) {
      await prisma.procedimientoCotizacion.update({
        where: { id: existe.procedimiento_cotizacion_id },
        data: { estado: 'realizado' }
      })
    }

    const diferencias = calcularDiferencias({ estado: existe.estado }, { estado: cita.estado }, ['estado'])

    await registrarAuditoria({
      req,
      accion: 'CAMBIAR_ESTADO_CITA',
      modulo: 'Citas',
      recurso_id: cita.id,
      detalles: `Estado de cita #${id} cambiado de ${existe.estado} a ${cita.estado}`,
      metadata: { cambios: diferencias }
    })

    res.json(cita)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// PUT /api/citas/:id — actualizar cita
router.put('/:id', requirePermission(PERMISSIONS.APPOINTMENTS_UPDATE), async (req, res) => {
  const id = parseInt(req.params.id)
  const datos = { ...req.body }

  if (datos.fecha_hora) datos.fecha_hora = new Date(datos.fecha_hora)
  delete datos.consultorio_id

  if (datos.valor_cobrado !== undefined && datos.valor_cobrado !== null && datos.valor_cobrado !== '') {
    const val = Number(datos.valor_cobrado)
    if (isNaN(val) || val < 0) {
      return res.status(400).json({ error: 'El valor cobrado debe ser un número mayor o igual a 0' })
    }
    datos.valor_cobrado = val
  }

  try {
    const existe = await prisma.cita.findFirst({
      where: { id, consultorio_id: req.usuario.consultorio_id }
    })
    if (!existe) return res.status(404).json({ error: 'Cita no encontrada' })

    if (datos.procedimiento_consultorio_id !== undefined && datos.procedimiento_consultorio_id !== null && datos.procedimiento_consultorio_id !== '') {
      const procId = parseInt(datos.procedimiento_consultorio_id)
      if (isNaN(procId)) {
        return res.status(400).json({ error: 'procedimiento_consultorio_id debe ser un número válido' })
      }
      const procConsultorio = await prisma.procedimientoConsultorio.findFirst({
        where: { id: procId, consultorio_id: req.usuario.consultorio_id },
        include: { catalogo_oficial: true }
      })
      if (!procConsultorio) {
        return res.status(400).json({ error: 'El procedimiento seleccionado no existe o pertenece a otro consultorio' })
      }
      datos.procedimiento_consultorio_id = procConsultorio.id
      if (!datos.codigo_cups && procConsultorio.catalogo_oficial?.codigo_cups) {
        datos.codigo_cups = procConsultorio.catalogo_oficial.codigo_cups
      }
    }

    let procCot = null
    if (datos.procedimiento_cotizacion_id !== undefined && datos.procedimiento_cotizacion_id !== null && datos.procedimiento_cotizacion_id !== '') {
      const procCotId = parseInt(datos.procedimiento_cotizacion_id)
      if (isNaN(procCotId)) {
        return res.status(400).json({ error: 'procedimiento_cotizacion_id debe ser un número válido' })
      }
      const pacId = datos.paciente_id || existe.paciente_id
      procCot = await prisma.procedimientoCotizacion.findFirst({
        where: {
          id: procCotId,
          cotizacion: { consultorio_id: req.usuario.consultorio_id, paciente_id: pacId }
        }
      })
      if (!procCot) {
        return res.status(400).json({ error: 'El procedimiento cotizado no existe o pertenece a otro paciente/consultorio' })
      }
      datos.procedimiento_cotizacion_id = procCot.id
      if (datos.valor_cobrado === undefined || datos.valor_cobrado === null || datos.valor_cobrado === '') {
        datos.valor_cobrado = Number(procCot.subtotal)
      }
    } else if (datos.procedimiento_cotizacion_id === null || datos.procedimiento_cotizacion_id === '') {
      datos.procedimiento_cotizacion_id = null
    }

    const cita = await prisma.cita.update({ where: { id }, data: datos })

    const finalProcCotId = cita.procedimiento_cotizacion_id || existe.procedimiento_cotizacion_id
    if (cita.estado === 'asistio' && finalProcCotId) {
      await prisma.procedimientoCotizacion.update({
        where: { id: finalProcCotId },
        data: { estado: 'realizado' }
      })
    }

    const diferencias = calcularDiferencias(existe, cita, ['fecha_hora', 'procedimiento', 'doctor', 'estado', 'valor_cobrado'])

    await registrarAuditoria({
      req,
      accion: 'ACTUALIZAR_CITA',
      modulo: 'Citas',
      recurso_id: cita.id,
      detalles: `Cita #${cita.id} actualizada`,
      metadata: { cambios: diferencias }
    })

    res.json(cita)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// DELETE /api/citas/:id — soft delete (marca como cancelada)
router.delete('/:id', requirePermission(PERMISSIONS.APPOINTMENTS_CANCEL), async (req, res) => {
  const id = parseInt(req.params.id)
  try {
    const existe = await prisma.cita.findFirst({
      where: { id, consultorio_id: req.usuario.consultorio_id }
    })
    if (!existe) return res.status(404).json({ error: 'Cita no encontrada' })

    await prisma.cita.update({ where: { id }, data: { estado: 'cancelada' } })

    await registrarAuditoria({
      req,
      accion: 'CANCELAR_CITA',
      modulo: 'Citas',
      recurso_id: id,
      detalles: `Cita #${id} cancelada`
    })

    res.status(200).json({ message: 'Cita cancelada correctamente' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

module.exports = router