const generarPDF = require('../helpers/generarPDF')

const TEMPLATES = {
  anestesia:           'consentimiento-anestesia',
  cirugia_oral:        'consentimiento-cirugia-oral',
  retiro_poste_corona: 'consentimiento-retiro-poste-corona',
  rehabilitacion:      'consentimiento-rehabilitacion',
  higiene_oral:        'consentimiento-higiene-oral'
}

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

async function generarConsentimientoPDF(consentimiento) {
  const p = consentimiento.paciente
  const nombreCompleto = p
    ? `${p.nombres} ${p.primer_apellido} ${p.segundo_apellido ?? ''}`.trim()
    : consentimiento.nombre_paciente_declarado || 'No registrado'

  const fechaStr = consentimiento.fecha.toISOString().split('T')[0]
  const [anio, mesNum, dia] = fechaStr.split('-')
  const mes = MESES[parseInt(mesNum) - 1]

  const campos = consentimiento.campos_especificos || {}

  const data = {
    nombre_paciente: nombreCompleto,
    cc_paciente: consentimiento.cc_paciente_declarado || p?.numero_documento || '',
    cc_profesional: consentimiento.cc_profesional || '',
    ciudad: consentimiento.ciudad || 'Villavicencio',
    fecha: `${dia} de ${mes} de ${anio}`,
    dia, mes, anio,
    firma_paciente: consentimiento.firma_paciente || null,
    firma_doctor: consentimiento.firma_doctor || null,
    // campos específicos rehabilitación
    protesis_removible: campos.protesis_removible || false,
    protesis_total:     campos.protesis_total || false,
    sobredentadura:     campos.sobredentadura || false,
    diente_unico:       campos.diente_unico || false,
    protesis_fija:      campos.protesis_fija || false,
    protesis_hibrida:   campos.protesis_hibrida || false,
    // campos específicos retiro poste
    pieza_dental:  campos.pieza_dental || '___',
    diagnostico:   campos.diagnostico || '___'
  }

  const template = TEMPLATES[consentimiento.tipo]
  if (!template) {
    throw new Error(`Tipo de consentimiento no válido: ${consentimiento.tipo}`)
  }

  return await generarPDF({ template, data })
}

module.exports = generarConsentimientoPDF