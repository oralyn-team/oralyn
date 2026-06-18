// src/helpers/generarCotizacionPDF.js
const generarPDF = require('../helpers/generarPDF')

/**
 * Formatea un número como pesos colombianos
 */
function fmtCOP(n) {
  return Number(n || 0).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

/**
 * Formatea una fecha ISO a "dd de mes de yyyy"
 */
function fmtFecha(value) {
  const fecha = value ? new Date(value) : new Date()
  const dia   = fecha.getDate().toString().padStart(2, '0')
  const mes   = fecha.toLocaleString('es-CO', { month: 'long' })
  const anio  = fecha.getFullYear()
  return { dia, mes, anio, completa: `${dia} de ${mes} de ${anio}` }
}

/**
 * Convierte el enum metodo_pago → label legible
 */
function labelMetodo(metodo = '') {
  const map = {
    efectivo:               'Efectivo',
    transferencia_bancaria: 'Transferencia bancaria',
    tarjeta_debito:         'Tarjeta débito',
    tarjeta_credito:        'Tarjeta crédito',
    nequi:                  'Nequi',
    daviplata:              'Daviplata',
    otro:                   'Otro',
  }
  return map[metodo] ?? metodo
}

/**
 * Convierte el enum aplica_en + dientes/cuadrante → texto legible
 */
function labelAplicacion(proc) {
  switch (proc.aplica_en) {
    case 'dientes':
      if (proc.dientes?.length) return `Dientes: ${proc.dientes.join(', ')}`
      return 'Dientes'
    case 'cuadrante':
      return proc.cuadrante ? `Cuadrante ${proc.cuadrante}` : 'Cuadrante'
    default:
      return 'General'
  }
}

/**
 * Convierte el enum estado → label con color para la plantilla
 */
function labelEstado(estado) {
  const map = {
    borrador:    { label: 'Borrador',    color: '#6b7280' },
    pendiente:   { label: 'Pendiente',   color: '#d97706' },
    aprobado:    { label: 'Aprobado',    color: '#059669' },
    en_proceso:  { label: 'En proceso',  color: '#2563eb' },
    finalizado:  { label: 'Finalizado',  color: '#7c3aed' },
    cancelado:   { label: 'Cancelado',   color: '#dc2626' },
  }
  return map[estado] ?? { label: estado, color: '#6b7280' }
}

/**
 * Genera el PDF de una cotización/plan de tratamiento.
 *
 * @param {object} cotizacion  — registro completo de Prisma con include: { procedimientos, pagos, paciente }
 * @param {number} consultorio_id
 * @returns {Buffer} PDF generado
 */
async function generarCotizacionPDF(cotizacion, consultorio_id) {
  const p = cotizacion.paciente
  const nombreCompleto = p
    ? `${p.nombres} ${p.primer_apellido} ${p.segundo_apellido ?? ''}`.trim()
    : 'No registrado'

  const { dia, mes, anio } = fmtFecha(cotizacion.fecha)
  const estado = labelEstado(cotizacion.estado)

  // Procedimientos enriquecidos para la plantilla
  const procedimientos = (cotizacion.procedimientos || [])
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    .map((proc) => {
      const valorUnitario = Number(proc.valor_unitario)
      const cantidad      = Number(proc.cantidad)
      const descuento     = Number(proc.descuento) || 0
      const subtotal      = Number(proc.subtotal ?? (valorUnitario * cantidad * (1 - descuento / 100)))
      return {
        procedimiento:  proc.procedimiento,
        descripcion:    proc.descripcion || '',
        aplicacion:     labelAplicacion(proc),
        cantidad,
        valorUnitario:  fmtCOP(valorUnitario),
        descuento:      descuento > 0 ? `${descuento}%` : '—',
        tieneDescuento: descuento > 0,
        subtotal:       fmtCOP(subtotal),
        estado:         proc.estado ?? 'pendiente',
      }
    })

  // Pagos enriquecidos
  const pagos = (cotizacion.pagos || []).map((pago) => ({
    fecha:   fmtFecha(pago.fecha).completa,
    metodo:  labelMetodo(pago.metodo_pago),
    monto:   fmtCOP(pago.monto),
    referencia: pago.referencia || '—',
  }))

  const total       = Number(cotizacion.total       || 0)
  const totalPagado = Number(cotizacion.total_pagado || 0)
  const saldo       = Number(cotizacion.saldo        || Math.max(total - totalPagado, 0))
  const porcentajePagado = total > 0 ? Math.min(Math.round((totalPagado / total) * 100), 100) : 0

  const data = {
    // Paciente
    nombre_completo:   nombreCompleto,
    documento:         p?.numero_documento ?? '',
    telefono_paciente: p?.telefono         ?? '',

    // Cotización
    cotizacion_id:   cotizacion.id,
    dia, mes, anio,
    tipo_tratamiento: cotizacion.tipo_tratamiento ?? '',
    prioridad:        cotizacion.prioridad        ?? '',
    motivo:           cotizacion.motivo           ?? '',
    observaciones:    cotizacion.observaciones    ?? '',
    estado_label:     estado.label,
    estado_color:     estado.color,

    // Procedimientos
    procedimientos,
    num_procedimientos: procedimientos.length,

    // Financiero
    total:            fmtCOP(total),
    total_pagado:     fmtCOP(totalPagado),
    saldo:            fmtCOP(saldo),
    porcentaje_pagado: porcentajePagado,
    pagado_completo:  saldo <= 0 && total > 0,

    // Pagos
    pagos,
    tiene_pagos: pagos.length > 0,
  }

  return await generarPDF({ template: 'cotizacion', consultorio_id, data })
}

module.exports = generarCotizacionPDF