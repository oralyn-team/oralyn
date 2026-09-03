// backend/src/routes/facturas.js
const express = require('express')
const prisma = require('../lib/prisma')
const verificarToken = require('../middlewares/auth')
const { requirePermission, restrictSuperadminClinicalAccess } = require('../middlewares/rbac')
const { PERMISSIONS } = require('../lib/permissions')
const { registrarAuditoria } = require('../services/audit.service')
const facturaProvider = require('../services/facturaProvider.service')

const router = express.Router()
router.use(verificarToken)
router.use(restrictSuperadminClinicalAccess) // Restringe a SUPERADMIN de ver o emitir facturas clínicas

const ESTADO_A_ELECTRONIC_STATUS = {
  pendiente: 'Pendiente',
  validada: 'Validada',
  rechazada: 'Rechazada',
  anulada: 'Anulada',
}

function serializarFactura(factura, paciente, configuracion) {
  if (!factura) return null

  let codigoRechazo = null
  let mensajeRechazo = null
  if (factura.errores) {
    if (typeof factura.errores === 'object') {
      codigoRechazo = factura.errores.code || factura.errores.codigo || (Array.isArray(factura.errores.errors) ? factura.errores.errors[0]?.code : null) || 'ERR-VAL-001'
      mensajeRechazo = factura.errores.message || factura.errores.mensaje || (Array.isArray(factura.errores.errors) ? factura.errores.errors[0]?.message : null) || JSON.stringify(factura.errores)
    } else {
      mensajeRechazo = String(factura.errores)
    }
  }

  const statusMapped = ESTADO_A_ELECTRONIC_STATUS[factura.estado] || 'Pendiente'
  const p = paciente || {}
  const c = configuracion || {}

  const pNombre = p.nombres
    ? `${p.nombres} ${p.primer_apellido || ''} ${p.segundo_apellido || ''}`.trim()
    : 'Paciente'

  return {
    id: String(factura.id),
    number: factura.numero || null,
    prefix: factura.prefijo || null,
    patientId: String(factura.paciente_id),
    patient: {
      nombre: pNombre,
      tipoDocumento: p.tipo_documento || 'CC',
      documento: p.numero_documento || '',
      email: p.correo || '',
      telefono: p.telefono || '',
      direccion: p.direccion_residencia || '',
    },
    consultorio: {
      razonSocial: c.razon_social || c.nombre_consultorio || 'Consultorio',
      nit: c.nit || '',
      direccion: c.direccion || '',
      telefono: c.telefono || '',
      email: c.email || '',
    },
    issueDate: factura.fecha_emision ? new Date(factura.fecha_emision).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    dueDate: factura.fecha_emision ? new Date(factura.fecha_emision).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    subtotal: Number(factura.subtotal || 0),
    tax: Number(factura.impuestos || 0),
    discount: 0,
    total: Number(factura.total || 0),
    electronicStatus: statusMapped,
    dianStatus: statusMapped,
    cufe: factura.cufe || null,
    dianResponse: {
      mensaje: mensajeRechazo,
      codigoRechazo: codigoRechazo || (factura.estado === 'rechazada' ? 'ERR-VAL-001' : null),
      mensajeRechazo: mensajeRechazo || 'Detalle no disponible',
      fechaValidacion: factura.fecha_validacion ? new Date(factura.fecha_validacion).toISOString() : null,
      fechaIntento: factura.actualizado_en ? new Date(factura.actualizado_en).toISOString() : (factura.creado_en ? new Date(factura.creado_en).toISOString() : null),
    },
    environment: process.env.FACTUS_ENV === 'production' ? 'Producción' : 'Pruebas',
    provider: 'Factus',
    items: Array.isArray(factura.items_json) ? factura.items_json : [],
    creditNotes: (Array.isArray(factura.notas_credito) ? factura.notas_credito : []).map((nc, index) => ({
      id: nc.id || nc.reference_code || String(index + 1),
      number: nc.number || (nc.cufe ? nc.cufe.slice(0, 14) : `NC-${index + 1}`),
      reason: nc.reason || nc.motivo || 'Nota Crédito',
      observations: nc.observations || nc.observacion || '',
      amount: Number(nc.amount ?? nc.monto ?? 0),
      date: nc.date || nc.fecha,
    })),
    createdAt: factura.creado_en ? new Date(factura.creado_en).toISOString() : null,
    updatedAt: factura.actualizado_en ? new Date(factura.actualizado_en).toISOString() : null,
  }
}

async function obtenerConfiguracion(consultorioId) {
  const configuracion = await prisma.configuracion.findUnique({ where: { id: consultorioId } })
  if (!configuracion) {
    const err = new Error('Consultorio no encontrado')
    err.status = 404
    throw err
  }
  if (!configuracion.facturacion_habilitada) {
    const err = new Error('La facturación electrónica no está habilitada para este consultorio. Configúrala en Ajustes.')
    err.status = 422
    throw err
  }
  return configuracion
}

// GET /api/facturas — listado de facturas
router.get('/', requirePermission(PERMISSIONS.INVOICES_READ), async (req, res) => {
  try {
    const { estado, fechaInicio, fechaFin, search } = req.query
    const consultorioId = Number(req.usuario?.consultorio_id)

    if (!consultorioId) {
      return res.status(400).json({ error: 'Usuario no asociado a un consultorio válido' })
    }

    const where = { consultorio_id: consultorioId }

    if (estado && estado !== 'Todos') {
      const estadoDb = Object.entries(ESTADO_A_ELECTRONIC_STATUS).find(([, v]) => v === estado)?.[0]
      if (estadoDb) where.estado = estadoDb
    }
    if (fechaInicio || fechaFin) {
      where.fecha_emision = {}
      if (fechaInicio) where.fecha_emision.gte = new Date(fechaInicio)
      if (fechaFin) where.fecha_emision.lte = new Date(fechaFin)
    }
    if (search) {
      where.OR = [
        { numero: { contains: search, mode: 'insensitive' } },
        { cufe: { contains: search, mode: 'insensitive' } },
      ]
    }

    const facturas = await prisma.factura.findMany({
      where,
      include: { paciente: true, consultorio: true },
      orderBy: { fecha_emision: 'desc' },
    }).catch(() => [])

    const resultado = facturas
      .map((f) => serializarFactura(f, f.paciente, f.consultorio))
      .filter(Boolean)

    res.json(resultado)
  } catch (error) {
    console.error('Error listando facturas:', error)
    res.json([])
  }
})

// GET /api/facturas/:id
router.get('/:id', requirePermission(PERMISSIONS.INVOICES_READ), async (req, res) => {
  try {
    const facturaId = Number(req.params.id)
    if (!facturaId || isNaN(facturaId)) return res.status(400).json({ error: 'ID de factura inválido' })

    const factura = await prisma.factura.findFirst({
      where: { id: facturaId, consultorio_id: Number(req.usuario?.consultorio_id) },
      include: { paciente: true, consultorio: true },
    })
    if (!factura) return res.status(404).json({ error: 'Factura no encontrada' })
    res.json(serializarFactura(factura, factura.paciente, factura.consultorio))
  } catch (error) {
    console.error('Error obteniendo factura:', error)
    res.status(500).json({ error: 'Error obteniendo la factura' })
  }
})

// POST /api/facturas — crea y valida una factura ante la DIAN vía Factus
router.post('/', requirePermission(PERMISSIONS.INVOICES_CREATE), async (req, res) => {
  try {
    const configuracion = await obtenerConfiguracion(req.usuario.consultorio_id)
    const { pacienteId, cotizacionId, pagoId, items, pagos, observacion } = req.body

    if (!pacienteId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'pacienteId e items son obligatorios' })
    }

    const paciente = await prisma.paciente.findFirst({
      where: { id: Number(pacienteId), consultorio_id: req.usuario.consultorio_id, activo: true },
    })
    if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' })

    const referenceCode = `ORALYN-${req.usuario.consultorio_id}-${Date.now()}`

    const payload = facturaProvider.construirPayloadFactura({
      paciente,
      items,
      pagos: (pagos || []).map((p) => ({ ...p, metodoPagoCode: facturaProvider.mapMetodoPago(p.metodoPago) })),
      referenceCode,
      observacion,
    })

    const facturaLocal = await prisma.factura.create({
      data: {
        consultorio_id: req.usuario.consultorio_id,
        paciente_id: paciente.id,
        cotizacion_id: cotizacionId ? Number(cotizacionId) : undefined,
        pago_id: pagoId ? Number(pagoId) : undefined,
        reference_code: referenceCode,
        items_json: items,
        subtotal: items.reduce((acc, i) => acc + Number(i.valorUnitario || i.unitPrice || 0) * Number(i.cantidad || i.quantity || 1), 0),
        total: items.reduce((acc, i) => acc + Number(i.valorUnitario || i.unitPrice || 0) * Number(i.cantidad || i.quantity || 1), 0),
        estado: 'pendiente',
      },
    })

    let respuestaFactus
    try {
      respuestaFactus = await facturaProvider.crearYValidarFactura(configuracion, payload)
    } catch (errorFactus) {
      await prisma.factura.update({
        where: { id: facturaLocal.id },
        data: { estado: 'rechazada', errores: errorFactus.detalle || { mensaje: errorFactus.message } },
      })

      await registrarAuditoria({
        req,
        accion: 'FACTURA_RECHAZADA_FACTUS',
        modulo: 'Facturación',
        recurso_id: facturaLocal.id,
        detalles: `Rechazo de factura electrónica ante la DIAN/Factus`,
        estado: 'FALLIDO',
        metadata: { error: errorFactus.detalle || errorFactus.message }
      })

      return res.status(errorFactus.status || 502).json({
        error: 'La DIAN (vía Factus) rechazó la factura.',
        detalle: errorFactus.detalle || errorFactus.message,
      })
    }

    const data = respuestaFactus.data
    const facturaActualizada = await prisma.factura.update({
      where: { id: facturaLocal.id },
      data: {
        numero: data.number,
        prefijo: data.numbering_range?.prefix,
        cufe: data.cufe,
        estado: data.is_validated ? 'validada' : 'pendiente',
        errores: data.errors && Object.keys(data.errors).length ? data.errors : undefined,
        qr_url: data.links?.qr,
        public_url: data.links?.public_url,
        subtotal: Number(data.totals?.taxable_amount || 0),
        impuestos: Number(data.totals?.tax_amount || 0),
        total: Number(data.totals?.total || 0),
        fecha_validacion: data.validated_at ? new Date(data.validated_at) : undefined,
      },
      include: { paciente: true, consultorio: true },
    })

    await registrarAuditoria({
      req,
      accion: 'EMITIR_FACTURA_ELECTRONICA',
      modulo: 'Facturación',
      recurso_id: facturaActualizada.id,
      detalles: `Factura ${facturaActualizada.numero || referenceCode} validada exitosamente ante la DIAN`,
      metadata: { numero: facturaActualizada.numero, cufe: facturaActualizada.cufe, total: facturaActualizada.total }
    })

    res.status(201).json(serializarFactura(facturaActualizada, facturaActualizada.paciente, facturaActualizada.consultorio))
  } catch (error) {
    console.error('Error creando factura:', error)
    res.status(error.status || 500).json({ error: error.message || 'Error creando la factura' })
  }
})

// POST /api/facturas/:id/reintentar
router.post('/:id/reintentar', requirePermission(PERMISSIONS.INVOICES_CREATE), async (req, res) => {
  try {
    const configuracion = await obtenerConfiguracion(req.usuario.consultorio_id)
    const facturaLocal = await prisma.factura.findFirst({
      where: { id: Number(req.params.id), consultorio_id: req.usuario.consultorio_id },
      include: { paciente: true },
    })
    if (!facturaLocal) return res.status(404).json({ error: 'Factura no encontrada' })

    const payload = facturaProvider.construirPayloadFactura({
      paciente: facturaLocal.paciente,
      items: facturaLocal.items_json,
      pagos: [],
      referenceCode: facturaLocal.reference_code,
    })

    const respuestaFactus = await facturaProvider.crearYValidarFactura(configuracion, payload)
    const data = respuestaFactus.data

    const facturaActualizada = await prisma.factura.update({
      where: { id: facturaLocal.id },
      data: {
        numero: data.number,
        cufe: data.cufe,
        estado: data.is_validated ? 'validada' : 'pendiente',
        errores: data.errors && Object.keys(data.errors).length ? data.errors : null,
        fecha_validacion: data.validated_at ? new Date(data.validated_at) : undefined,
      },
      include: { paciente: true, consultorio: true },
    })

    await registrarAuditoria({
      req,
      accion: 'REINTENTAR_FACTURA_ELECTRONICA',
      modulo: 'Facturación',
      recurso_id: facturaActualizada.id,
      detalles: `Reintento de validación de factura #${facturaActualizada.id}`
    })

    res.json(serializarFactura(facturaActualizada, facturaActualizada.paciente, facturaActualizada.consultorio))
  } catch (error) {
    console.error('Error reintentando factura:', error)
    res.status(error.status || 500).json({ error: error.message || 'Error reintentando la factura' })
  }
})

// GET /api/facturas/:id/pdf
router.get('/:id/pdf', requirePermission(PERMISSIONS.INVOICES_READ), async (req, res) => {
  try {
    const configuracion = await obtenerConfiguracion(req.usuario.consultorio_id)
    const factura = await prisma.factura.findFirst({
      where: { id: Number(req.params.id), consultorio_id: req.usuario.consultorio_id },
    })
    if (!factura?.numero) return res.status(404).json({ error: 'Factura no encontrada o aún no validada' })

    const respuestaFactus = await facturaProvider.descargarPdf(configuracion, factura.numero)
    const buffer = Buffer.from(await respuestaFactus.arrayBuffer())
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${factura.numero}.pdf"`)
    res.send(buffer)
  } catch (error) {
    console.error('Error descargando PDF de factura:', error)
    res.status(500).json({ error: 'Error descargando el PDF' })
  }
})

// GET /api/facturas/:id/xml
router.get('/:id/xml', requirePermission(PERMISSIONS.INVOICES_READ), async (req, res) => {
  try {
    const configuracion = await obtenerConfiguracion(req.usuario.consultorio_id)
    const factura = await prisma.factura.findFirst({
      where: { id: Number(req.params.id), consultorio_id: req.usuario.consultorio_id },
    })
    if (!factura?.numero) return res.status(404).json({ error: 'Factura no encontrada o aún no validada' })

    const respuestaFactus = await facturaProvider.descargarXml(configuracion, factura.numero)
    const buffer = Buffer.from(await respuestaFactus.arrayBuffer())
    res.setHeader('Content-Type', 'application/xml')
    res.setHeader('Content-Disposition', `attachment; filename="${factura.numero}.xml"`)
    res.send(buffer)
  } catch (error) {
    console.error('Error descargando XML de factura:', error)
    res.status(500).json({ error: 'Error descargando el XML' })
  }
})

// POST /api/facturas/:id/notas-credito
router.post('/:id/notas-credito', requirePermission(PERMISSIONS.INVOICES_UPDATE), async (req, res) => {
  try {
    const configuracion = await obtenerConfiguracion(req.usuario.consultorio_id)
    const factura = await prisma.factura.findFirst({
      where: { id: Number(req.params.id), consultorio_id: req.usuario.consultorio_id },
      include: { paciente: true },
    })
    if (!factura?.numero) return res.status(404).json({ error: 'Factura no encontrada o aún no validada' })

    const { motivo, correctionCode, items, observations } = req.body
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items es obligatorio' })
    }

    const referenceCodeNota = `${factura.reference_code}-NC-${Date.now()}`
    const payloadBase = facturaProvider.construirPayloadFactura({
      paciente: factura.paciente,
      items,
      pagos: [],
      referenceCode: referenceCodeNota,
      observacion: observations || motivo,
    })

    const payloadNota = {
      ...payloadBase,
      billing_reference: { number: factura.numero },
      correction: { code: correctionCode || '2' },
    }

    const respuestaFactus = await facturaProvider.crearNotaCredito(configuracion, payloadNota)
    const data = respuestaFactus.data

    const nuevaNota = {
      reference_code: referenceCodeNota,
      number: data.number || referenceCodeNota,
      cufe: data.cufe,
      reason: motivo,
      motivo: motivo,
      observations: observations || '',
      amount: Number(data.totals?.total || items.reduce((acc, i) => acc + Number(i.valorUnitario || 0) * Number(i.cantidad || 1), 0)),
      monto: Number(data.totals?.total || items.reduce((acc, i) => acc + Number(i.valorUnitario || 0) * Number(i.cantidad || 1), 0)),
      fecha: new Date().toISOString(),
    }

    const facturaActualizada = await prisma.factura.update({
      where: { id: factura.id },
      data: { notas_credito: [...(factura.notas_credito || []), nuevaNota] },
      include: { paciente: true, consultorio: true },
    })

    await registrarAuditoria({
      req,
      accion: 'CREAR_NOTA_CREDITO_FACTURA',
      modulo: 'Facturación',
      recurso_id: factura.id,
      detalles: `Nota crédito creada para la factura ${factura.numero}`
    })

    res.status(201).json(serializarFactura(facturaActualizada, facturaActualizada.paciente, facturaActualizada.consultorio))
  } catch (error) {
    console.error('Error creando nota crédito:', error)
    res.status(error.status || 500).json({ error: error.message || 'Error creando la nota crédito' })
  }
})

module.exports = router
