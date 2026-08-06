const prisma = require('../lib/prisma')

/**
 * Construye la estructura JSON del RIPS a partir de las entidades del sistema.
 * @param {number} consultorioId
 * @param {Date} fechaInicio
 * @param {Date} fechaFin
 * @returns {Promise<object>}
 */
async function construirRips(consultorioId, fechaInicio, fechaFin) {
  // Configuración del consultorio prestador
  const consultorio = await prisma.configuracion.findUnique({
    where: { id: consultorioId }
  })

  // Consultar Citas
  const citas = await prisma.cita.findMany({
    where: {
      consultorio_id: consultorioId,
      fecha_hora: { gte: fechaInicio, lte: fechaFin },
      estado: { in: ['asistio', 'pendiente'] }
    },
    include: {
      paciente: true,
      procedimiento_consultorio: {
        include: { catalogo_oficial: true }
      }
    },
    orderBy: { fecha_hora: 'asc' }
  })

  // Agrupar pacientes únicos
  const pacientesMap = new Map()
  const profesionalesSet = new Set()
  const procedimientosList = []

  for (const cita of citas) {
    if (cita.doctor) profesionalesSet.add(cita.doctor)

    const p = cita.paciente
    if (p && !pacientesMap.has(p.id)) {
      pacientesMap.set(p.id, {
        id: p.id,
        tipoDocumento: p.tipo_documento,
        numeroDocumento: p.numero_documento,
        primerApellido: p.primer_apellido,
        segundoApellido: p.segundo_apellido || '',
        nombres: p.nombres,
        fechaNacimiento: p.fecha_nacimiento ? p.fecha_nacimiento.toISOString().split('T')[0] : '',
        sexo: p.sexo,
        municipioCiudad: p.municipio_ciudad,
        departamento: p.departamento || ''
      })
    }

    const codigoCups = cita.codigo_cups || cita.procedimiento_consultorio?.catalogo_oficial?.codigo_cups || '890201'
    const nombreProcedimiento = cita.procedimiento_consultorio?.nombre_visible || cita.procedimiento

    procedimientosList.push({
      citaId: cita.id,
      fechaHora: cita.fecha_hora.toISOString(),
      pacienteId: p?.id,
      pacienteDocumento: p?.numero_documento,
      pacienteNombre: p ? `${p.nombres} ${p.primer_apellido}` : '',
      codigoCups,
      nombreProcedimiento,
      codigoCie10: cita.codigo_cie10 || 'Z012',
      doctor: cita.doctor || null,
      valorCobrado: cita.valor_cobrado ? Number(cita.valor_cobrado) : 0,
      observaciones: cita.observaciones || ''
    })
  }

  const profesionalesArr = Array.from(profesionalesSet).filter(Boolean)

  return {
    prestador: {
      nit: consultorio?.nit || '',
      nombreConsultorio: consultorio?.nombre_consultorio || 'Consultorio Odontológico',
      nombreProfesional: consultorio?.nombre_profesional || '',
      registroProfesional: consultorio?.registro_profesional || '',
      ciudad: consultorio?.ciudad || 'Villavicencio',
      direccion: consultorio?.direccion || ''
    },
    periodo: {
      fechaInicio: fechaInicio.toISOString().split('T')[0],
      fechaFin: fechaFin.toISOString().split('T')[0]
    },
    resumen: {
      totalRegistros: procedimientosList.length,
      totalPacientes: pacientesMap.size,
      totalProcedimientos: procedimientosList.length,
      profesionales: profesionalesArr.join(', ')
    },
    pacientes: Array.from(pacientesMap.values()),
    procedimientos: procedimientosList,
    generadoEn: new Date().toISOString()
  }
}

module.exports = {
  construirRips
}
