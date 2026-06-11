const generarPDF = require('../helpers/generarPDF')

async function generarHistoriaPDF(historia, consultorio_id) {
  const p = historia.paciente

  const nombreCompleto = p
    ? `${p.nombres} ${p.primer_apellido} ${p.segundo_apellido ?? ''}`.trim()
    : 'No registrado'

  const fechaAtencion = historia.fecha_atencion
    ? new Date(historia.fecha_atencion).toLocaleDateString('es-CO')
    : ''

  return await generarPDF({
    template: 'historia-clinica',
    consultorio_id,
    data: {
      paciente: {
        nombre_completo: nombreCompleto,
        tipo_documento: p?.tipo_documento || '',
        numero_documento: p?.numero_documento || '',
        fecha_nacimiento: p?.fecha_nacimiento
          ? new Date(p.fecha_nacimiento).toLocaleDateString('es-CO')
          : '',
        sexo: p?.sexo || '',
        municipio_ciudad: p?.municipio_ciudad || ''
      },
      fecha_atencion: fechaAtencion,
      motivo_consulta: historia.motivo_consulta || '',
      medicamentos_actuales: historia.medicamentos_actuales,
      antecedentes_odontologicos: historia.antecedentes_odontologicos,
      evento_adverso: historia.evento_adverso ? 'Sí' : 'No',
      diagnostico: historia.diagnostico || '',
      tratamiento_realizado: historia.tratamiento_realizado,
      observaciones: historia.observaciones,
      recomendaciones: historia.recomendaciones,
      firma_doctor: historia.firma_doctor,
      firma_paciente: historia.firma_paciente,
      antecedentes: historia.antecedentes
    }
  })
}

module.exports = generarHistoriaPDF