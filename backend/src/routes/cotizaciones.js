const express = require('express')
const prisma = require('../lib/prisma')
const verificarToken = require('../middlewares/auth')
const { requirePermission, restrictSuperadminClinicalAccess } = require('../middlewares/rbac')
const { PERMISSIONS } = require('../lib/permissions')
const { registrarAuditoria, calcularDiferencias } = require('../services/audit.service')
const generarCotizacionPDF = require('../pdf/generators/generarCotizacionPDF')

const router = express.Router()
router.use(verificarToken)
router.use(restrictSuperadminClinicalAccess) // Restringe al SUPERADMIN de ver/modificar cotizaciones y tratamientos

const estadosValidos = ['borrador', 'pendiente', 'aprobado', 'en_proceso', 'finalizado', 'cancelado']
const prioridadesValidas = ['baja', 'media', 'alta']
const estadosProcedimientoValidos = ['pendiente', 'en_proceso', 'realizado', 'cancelado']
const aplicaEnValidos = ['general', 'dientes', 'cuadrante']
const metodosPagoValidos = ['efectivo', 'transferencia_bancaria', 'tarjeta_debito', 'tarjeta_credito', 'nequi', 'daviplata', 'otro']

class BadRequestError extends Error {
  constructor(message) {
    super(message)
    this.statusCode = 400
  }
}

function parseId(value) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

function calcularSubtotal(procedimiento = {}) {
  const cantidad = Number(procedimiento.cantidad ?? 1)
  const valorUnitario = Number(procedimiento.valor_unitario ?? 0)
  const descuento = Number(procedimiento.descuento ?? 0)

  if (!Number.isFinite(cantidad) || cantidad <= 0) return null
  if (!Number.isFinite(valorUnitario) || valorUnitario <= 0) return null
  if (!Number.isFinite(descuento) || descuento < 0 || descuento > 100) return null

  return Number((cantidad * valorUnitario * (1 - descuento / 100)).toFixed(2))
}

function prepararProcedimientos(procedimientos) {
  return procedimientos.map((p, i) => {
    const subtotal = calcularSubtotal(p)
    const aplica_en = p.aplica_en || 'general'
    const estado = p.estado || 'pendiente'

    if (!p.procedimiento) throw new BadRequestError('Cada procedimiento debe tener nombre')
    if (!aplicaEnValidos.includes(aplica_en)) throw new BadRequestError('Aplica en no válido')
    if (!estadosProcedimientoValidos.includes(estado)) throw new BadRequestError('Estado de procedimiento no válido')
    if (!Number.isFinite(subtotal)) throw new BadRequestError('Valores de procedimiento no válidos')

    const item = {
      procedimiento: p.procedimiento,
      descripcion: p.descripcion ?? null,
      aplica_en,
      dientes: Array.isArray(p.dientes) ? p.dientes : [],
      cuadrante: p.cuadrante ?? null,
      cantidad: Number(p.cantidad ?? 1),
      valor_unitario: Number(p.valor_unitario ?? 0),
      descuento: Number(p.descuento ?? 0),
      subtotal,
      estado,
      observaciones: p.observaciones ?? null,
      orden: Number.isInteger(Number(p.orden)) ? Number(p.orden) : i
    }

    if (p.id && Number.isInteger(Number(p.id)) && Number(p.id) > 0) {
      item.id = Number(p.id)
    }

    return item
  })
}

function prepararPagos(pagos = [], paciente_id, consultorio_id) {
  return pagos.map((p) => {
    const monto = Number(p.monto)
    const fecha = p.fecha ? new Date(p.fecha) : new Date()

    if (!Number.isFinite(monto) || monto <= 0) {
      throw new BadRequestError('Todos los pagos deben tener un monto mayor a 0')
    }

    if (!metodosPagoValidos.includes(p.metodo_pago)) {
      throw new BadRequestError('Método de pago no válido')
    }

    if (Number.isNaN(fecha.getTime())) {
      throw new BadRequestError('Fecha de pago no válida')
    }

    return {
      consultorio_id,
      paciente_id,
      fecha,
      monto,
      metodo_pago: p.metodo_pago,
      referencia: p.referencia ?? null,
      concepto: p.concepto ?? null
    }
  })
}

function validarCotizacion({ paciente_id, procedimientos, estado, prioridad }) {
  if (!paciente_id || !Array.isArray(procedimientos) || procedimientos.length === 0) {
    return 'Paciente y procedimientos son obligatorios'
  }

  if (estado && !estadosValidos.includes(estado)) {
    return `Estado no válido. Valores aceptados: ${estadosValidos.join(', ')}`
  }

  if (prioridad && !prioridadesValidas.includes(prioridad)) {
    return `Prioridad no válida. Valores aceptados: ${prioridadesValidas.join(', ')}`
  }

  return null
}

async function asegurarPaciente(paciente_id, consultorio_id) {
  return prisma.paciente.findFirst({
    where: { id: paciente_id, consultorio_id, activo: true }
  })
}

async function asegurarCotizacion(id, consultorio_id) {
  return prisma.cotizacion.findFirst({
    where: { id, consultorio_id }
  })
}

function includeCompleto() {
  return {
    paciente: {
      select: {
        nombres: true,
        primer_apellido: true,
        segundo_apellido: true,
        tipo_documento: true,
        numero_documento: true,
        telefono: true
      }
    },
    procedimientos: { orderBy: { orden: 'asc' } },
    pagos: { orderBy: { fecha: 'desc' } }
  }
}

// POST /api/cotizaciones — crear cotización / tratamiento
router.post('/', requirePermission(PERMISSIONS.TREATMENTS_CREATE), async (req, res) => {
  const {
    paciente_id,
    doctor,
    doctor_id,
    tipo_tratamiento,
    prioridad,
    motivo,
    observaciones,
    procedimientos,
    pagos = [],
    estado
  } = req.body

  const errorValidacion = validarCotizacion({ paciente_id, procedimientos, estado, prioridad })
  if (errorValidacion) return res.status(400).json({ error: errorValidacion })

  try {
    const paciente = await asegurarPaciente(paciente_id, req.usuario.consultorio_id)
    if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' })

    const procedimientosData = prepararProcedimientos(procedimientos)
    const total = procedimientosData.reduce((sum, p) => sum + Number(p.subtotal), 0)
    const pagosData = prepararPagos(pagos, paciente_id, req.usuario.consultorio_id)
    const totalPagado = pagosData.reduce((sum, p) => sum + Number(p.monto), 0)
    const saldo = Math.max(total - totalPagado, 0)

    const cotizacion = await prisma.$transaction(async (tx) => {
      const creada = await tx.cotizacion.create({
        data: {
          consultorio_id: req.usuario.consultorio_id,
          paciente_id,
          doctor:           doctor           ?? null,
          doctor_id:        doctor_id        ?? null,
          tipo_tratamiento: tipo_tratamiento ?? null,
          prioridad:        prioridad        || 'media',
          estado:           estado           || 'borrador',
          motivo:           motivo           ?? null,
          observaciones:    observaciones    ?? null,
          total,
          total_pagado: totalPagado,
          saldo,
          procedimientos: { create: procedimientosData }
        },
        include: { procedimientos: true, pagos: true }
      })

      if (pagosData.length > 0) {
        await tx.pago.createMany({
          data: pagosData.map((p) => ({ ...p, cotizacion_id: creada.id }))
        })
      }

      return tx.cotizacion.findUnique({
        where: { id: creada.id },
        include: includeCompleto()
      })
    })

    await registrarAuditoria({
      req,
      accion: 'CREAR_TRATAMIENTO',
      modulo: 'Tratamientos',
      recurso_id: cotizacion.id,
      detalles: `Tratamiento/Cotización #${cotizacion.id} creado para el paciente #${paciente_id} por valor de ${total}`
    })

    res.status(201).json(cotizacion)
  } catch (error) {
    if (error instanceof BadRequestError) return res.status(error.statusCode).json({ error: error.message })
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/cotizaciones/paciente/:pacienteId — cotizaciones de un paciente
router.get('/paciente/:pacienteId', requirePermission(PERMISSIONS.TREATMENTS_READ), async (req, res) => {
  const pacienteId = parseId(req.params.pacienteId)
  if (!pacienteId) return res.status(400).json({ error: 'ID inválido' })

  try {
    const cotizaciones = await prisma.cotizacion.findMany({
      where: { paciente_id: pacienteId, consultorio_id: req.usuario.consultorio_id },
      orderBy: { fecha: 'desc' },
      include: { procedimientos: true, pagos: true }
    })
    res.json(cotizaciones)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/cotizaciones/:id — ver una cotización
router.get('/:id', requirePermission(PERMISSIONS.TREATMENTS_READ), async (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'ID inválido' })

  try {
    const cotizacion = await prisma.cotizacion.findFirst({
      where: { id, consultorio_id: req.usuario.consultorio_id },
      include: includeCompleto()
    })

    if (!cotizacion) return res.status(404).json({ error: 'Cotización no encontrada' })
    res.json(cotizacion)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// PUT /api/cotizaciones/:id — actualizar cotización
router.put('/:id', requirePermission(PERMISSIONS.TREATMENTS_UPDATE), async (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'ID inválido' })

  const {
    paciente_id,
    doctor,
    doctor_id,
    tipo_tratamiento,
    prioridad,
    motivo,
    observaciones,
    procedimientos,
    pagos = [],
    estado
  } = req.body

  const errorValidacion = validarCotizacion({ paciente_id, procedimientos, estado, prioridad })
  if (errorValidacion) return res.status(400).json({ error: errorValidacion })

  try {
    const existe = await asegurarCotizacion(id, req.usuario.consultorio_id)
    if (!existe) return res.status(404).json({ error: 'Cotización no encontrada' })

    const paciente = await asegurarPaciente(paciente_id, req.usuario.consultorio_id)
    if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' })

    const procedimientosData = prepararProcedimientos(procedimientos)
    const total = procedimientosData.reduce((sum, p) => sum + Number(p.subtotal), 0)
    const pagosNuevos = pagos.filter((p) => {
      if (!p.id) return true
      if (typeof p.id === 'string' && p.id.startsWith('pago_')) return true
      const idNum = Number(p.id)
      return !Number.isInteger(idNum) || idNum <= 0
    })
    const pagosData = prepararPagos(pagosNuevos, paciente_id, req.usuario.consultorio_id)
    const pagosExistentes = await prisma.pago.findMany({
      where: { cotizacion_id: id, consultorio_id: req.usuario.consultorio_id },
      select: { monto: true }
    })
    const totalPagado = pagosExistentes.reduce((sum, p) => sum + Number(p.monto), 0) +
      pagosData.reduce((sum, p) => sum + Number(p.monto), 0)
    const saldo = Math.max(total - totalPagado, 0)

    const cotizacion = await prisma.$transaction(async (tx) => {
      const existentes = await tx.procedimientoCotizacion.findMany({
        where: { cotizacion_id: id },
        select: { id: true }
      })
      const idsExistentes = new Set(existentes.map(p => p.id))
      const idsEnPayload = new Set(
        procedimientosData.filter(p => p.id).map(p => p.id)
      )

      const idsABorrar = [...idsExistentes].filter(pid => !idsEnPayload.has(pid))
      if (idsABorrar.length > 0) {
        await tx.procedimientoCotizacion.deleteMany({
          where: { id: { in: idsABorrar }, cotizacion_id: id }
        })
      }

      for (const p of procedimientosData.filter(p => p.id && idsExistentes.has(p.id))) {
        const { id: procId, ...datos } = p
        await tx.procedimientoCotizacion.update({ where: { id: procId }, data: datos })
      }

      const nuevos = procedimientosData.filter(p => !p.id || !idsExistentes.has(p.id))
      if (nuevos.length > 0) {
        await tx.procedimientoCotizacion.createMany({
          data: nuevos.map(({ id: _ignorar, ...datos }) => ({ ...datos, cotizacion_id: id }))
        })
      }

      await tx.cotizacion.update({
        where: { id },
        data: {
          paciente_id,
          doctor: doctor ?? null,
          doctor_id: doctor_id ?? null,
          total,
          total_pagado: totalPagado,
          saldo,
          observaciones,
          motivo,
          tipo_tratamiento,
          prioridad: prioridad || 'media',
          estado: estado || 'borrador'
        }
      })

      if (pagosData.length > 0) {
        await tx.pago.createMany({
          data: pagosData.map((p) => ({ ...p, cotizacion_id: id }))
        })
      }

      return tx.cotizacion.findUnique({
        where: { id },
        include: includeCompleto()
      })
    })

    const diferencias = calcularDiferencias(existe, cotizacion, ['estado', 'total', 'saldo', 'prioridad'])

    await registrarAuditoria({
      req,
      accion: 'ACTUALIZAR_TRATAMIENTO',
      modulo: 'Tratamientos',
      recurso_id: cotizacion.id,
      detalles: `Tratamiento/Cotización #${cotizacion.id} actualizado`,
      metadata: { cambios: diferencias }
    })

    res.json(cotizacion)
  } catch (error) {
    if (error instanceof BadRequestError) return res.status(error.statusCode).json({ error: error.message })
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// PATCH /api/cotizaciones/:id/estado — cambiar estado
router.patch('/:id/estado', requirePermission(PERMISSIONS.TREATMENTS_UPDATE), async (req, res) => {
  const id = parseId(req.params.id)
  const { estado } = req.body

  if (!id) return res.status(400).json({ error: 'ID inválido' })
  if (!estado || !estadosValidos.includes(estado)) {
    return res.status(400).json({ error: `Estado no válido. Valores aceptados: ${estadosValidos.join(', ')}` })
  }

  try {
    const existe = await asegurarCotizacion(id, req.usuario.consultorio_id)
    if (!existe) return res.status(404).json({ error: 'Cotización no encontrada' })

    const cotizacion = await prisma.cotizacion.update({ where: { id }, data: { estado } })

    const diferencias = calcularDiferencias({ estado: existe.estado }, { estado: cotizacion.estado }, ['estado'])

    await registrarAuditoria({
      req,
      accion: 'CAMBIAR_ESTADO_TRATAMIENTO',
      modulo: 'Tratamientos',
      recurso_id: cotizacion.id,
      detalles: `Estado de cotización #${id} cambiado a ${estado}`,
      metadata: { cambios: diferencias }
    })

    res.json(cotizacion)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// DELETE /api/cotizaciones/:id — eliminar cotización
router.delete('/:id', requirePermission(PERMISSIONS.TREATMENTS_DELETE), async (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'ID inválido' })

  try {
    const existe = await asegurarCotizacion(id, req.usuario.consultorio_id)
    if (!existe) return res.status(404).json({ error: 'Cotización no encontrada' })

    await prisma.$transaction(async (tx) => {
      await tx.pago.deleteMany({ where: { cotizacion_id: id, consultorio_id: req.usuario.consultorio_id } })
      await tx.procedimientoCotizacion.deleteMany({ where: { cotizacion_id: id } })
      await tx.cotizacion.delete({ where: { id } })
    })

    await registrarAuditoria({
      req,
      accion: 'ELIMINAR_TRATAMIENTO',
      modulo: 'Tratamientos',
      recurso_id: id,
      detalles: `Cotización/Tratamiento #${id} eliminado`
    })

    res.status(204).send()
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/cotizaciones/:id/pdf — PDF de la cotización
router.get('/:id/pdf', requirePermission(PERMISSIONS.TREATMENTS_READ), async (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'ID inválido' })

  try {
    const cotizacion = await prisma.cotizacion.findFirst({
      where: { id, consultorio_id: req.usuario.consultorio_id },
      include: includeCompleto()
    })
    if (!cotizacion) return res.status(404).json({ error: 'Cotización no encontrada' })

    const pdf = await generarCotizacionPDF(cotizacion, req.usuario.consultorio_id)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename=cotizacion-${id}.pdf`)
    res.send(pdf)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error generando PDF' })
  }
})

module.exports = router
