const generarPDF = require('../helpers/generarPDF')

const KEYS = {
  detartraje_curetraje: 'detartraje',
  superficie_retina: 'superficie',
  incrustaciones: 'incrustaciones',
  carillas: 'carillas',
  tratamiento_conducto: 'conducto',
  exodoncia: 'exodoncia',
  cirugia: 'cirugia',
  nucleo: 'nucleo',
  corona: 'corona',
  blanqueamiento_dental: 'blanqueamiento'
}

async function generarCotizacionPDF(cotizacion, consultorio_id) {
  const p = cotizacion.paciente
  const nombreCompleto = p ? `${p.nombres} ${p.primer_apellido} ${p.segundo_apellido ?? ''}`.trim() : 'No registrado'

  const fecha = new Date(cotizacion.fecha)
  const dia = fecha.getDate().toString().padStart(2, '0')
  const mes = fecha.toLocaleString('es-CO', { month: 'long' })
  const anio = fecha.getFullYear()

  const data = {
    nombre_completo: nombreCompleto,
    doctor: '',
    dia, mes, anio,
    subtotal: Number(cotizacion.subtotal).toLocaleString('es-CO'),
    descuento: Number(cotizacion.descuento).toLocaleString('es-CO'),
  }

  Object.values(KEYS).forEach(k => {
    data[`${k}_num`] = ''
    data[`${k}_val`] = ''
  })

  cotizacion.items.forEach(item => {
    const key = KEYS[item.tipo_item]
    if (key) {
      data[`${key}_num`] = item.numero
      data[`${key}_val`] = Number(item.valor).toLocaleString('es-CO')
    }
  })

  return await generarPDF({ template: 'cotizacion', consultorio_id, data })
}

module.exports = generarCotizacionPDF