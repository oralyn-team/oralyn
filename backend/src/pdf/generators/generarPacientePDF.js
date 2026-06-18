const generarPDF = require('../helpers/generarPDF')

async function generarPacientePDF(paciente, consultorio_id) {
  const nombreCompleto = `${paciente.nombres} ${paciente.primer_apellido} ${paciente.segundo_apellido ?? ''}`.trim()

  return await generarPDF({
    template: 'paciente',
    consultorio_id,
    data: {
      nombre_completo: nombreCompleto,
      tipo_documento: paciente.tipo_documento,
      numero_documento: paciente.numero_documento,
      fecha_nacimiento: paciente.fecha_nacimiento ? new Date(paciente.fecha_nacimiento).toLocaleDateString('es-CO') : '',
      sexo: paciente.sexo,
      estado_civil: paciente.estado_civil || '',
      telefono: paciente.telefono || '',
      correo: paciente.correo || '',
      municipio_ciudad: paciente.municipio_ciudad,
      direccion_residencia: paciente.direccion_residencia || '',
      asegurador: paciente.asegurador || '',
      rh: paciente.rh || '',
      acudiente_nombre: paciente.acudiente_nombre,
      acudiente_parentesco: paciente.acudiente_parentesco,
      acudiente_telefono: paciente.acudiente_telefono
    }
  })
}

module.exports = generarPacientePDF