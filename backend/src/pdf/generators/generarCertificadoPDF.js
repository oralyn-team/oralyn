const generarPDF = require('../helpers/generarPDF')

async function generarCertificadoPDF(certificado, consultorio_id) {
  const p = certificado.paciente
  const nombreCompleto = p ? `${p.nombres} ${p.primer_apellido} ${p.segundo_apellido ?? ''}`.trim() : 'No registrado'

  const fechaStr = certificado.fecha_expedicion.toISOString().split('T')[0]
  const [anio, mesNum, dia] = fechaStr.split('-')
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  const mes = meses[parseInt(mesNum) - 1]

  return await generarPDF({
    template: 'certificado-dental',
    consultorio_id,
    data: {
      nombre_completo: nombreCompleto,
      tipo_documento: p?.tipo_documento || '',
      numero_documento: p?.numero_documento || '',
      tipo_cita: certificado.tipo_cita_texto,
      dia, mes, anio,
      firma_doctor: certificado.firma_doctor || null
    }
  })
}

module.exports = generarCertificadoPDF