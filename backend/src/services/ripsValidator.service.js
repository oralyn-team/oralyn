const prisma = require('../lib/prisma')

/**
 * Valida que los datos requeridos para la generación del RIPS estén completos.
 * @param {number} consultorioId
 * @param {Date} fechaInicio
 * @param {Date} fechaFin
 * @returns {Promise<{ valido: boolean, errores: string[], datos: object }>}
 */
async function validarRips(consultorioId, fechaInicio, fechaFin) {
  const errores = []

  // Consultar citas de atención en el periodo (asistio o realizadas)
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

  // Consultar historias clínicas atendidas en el periodo
  const historias = await prisma.historiaClinica.findMany({
    where: {
      paciente: { consultorio_id: consultorioId },
      fecha_atencion: { gte: fechaInicio, lte: fechaFin }
    },
    include: {
      paciente: true,
      evoluciones: {
        include: {
          procedimiento_consultorio: {
            include: { catalogo_oficial: true }
          }
        }
      }
    }
  })

  if (citas.length === 0 && historias.length === 0) {
    errores.push('No existen atenciones o citas registradas en el periodo seleccionado.')
    return { valido: false, errores, datos: { citas, historias } }
  }

  // Validaciones de Citas / Atenciones
  for (const cita of citas) {
    const p = cita.paciente
    const pNombre = p ? `${p.nombres} ${p.primer_apellido}` : `Cita #${cita.id}`

    // 1. Paciente y Documento
    if (!p) {
      errores.push(`Paciente no encontrado en cita #${cita.id}`)
      continue
    }

    if (!p.numero_documento || !p.tipo_documento) {
      errores.push(`Documento o tipo de documento incompleto para el paciente: ${pNombre}`)
    }

    // 2. Procedimiento y CUPS
    const cupsCodigo = cita.codigo_cups || cita.procedimiento_consultorio?.catalogo_oficial?.codigo_cups
    if (!cupsCodigo) {
      errores.push(`Procedimiento sin código CUPS configurado en la atención #${cita.id} (Paciente: ${pNombre})`)
    }

    // 3. Diagnóstico CIE-10
    if (!cita.codigo_cie10) {
      errores.push(`Diagnóstico CIE-10 faltante en la atención #${cita.id} (Paciente: ${pNombre})`)
    }

    // 4. Profesional
    if (!cita.doctor || !cita.doctor.trim()) {
      errores.push(`Profesional no asignado en la atención #${cita.id} (Paciente: ${pNombre})`)
    }

    // 5. Valor cobrado
    if (cita.valor_cobrado === null || cita.valor_cobrado === undefined) {
      errores.push(`Valor de la consulta/procedimiento no especificado en la atención #${cita.id} (Paciente: ${pNombre})`)
    }
  }

  return {
    valido: errores.length === 0,
    errores,
    datos: { citas, historias }
  }
}

module.exports = {
  validarRips
}
