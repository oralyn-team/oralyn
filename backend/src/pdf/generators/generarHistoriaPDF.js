const generarPDF = require('../helpers/generarPDF')
const prisma = require('../../lib/prisma')
const { TIPO_DEFAULT, ordenarOdontogramas } = require('../../services/odontogramas')

const ESTADOS_LABEL = {
  sano:         'Sano',
  caries:       'Caries',
  restauracion: 'Restauración',
  ausente:      'Ausente',
  endodoncia:   'Endodoncia',
  corona:       'Corona',
  implante:     'Implante',
}

function procesarOdontograma(dientesJson) {
  if (!dientesJson) return null

  let dientes
  try {
    dientes = typeof dientesJson === 'string' ? JSON.parse(dientesJson) : dientesJson
  } catch {
    return null
  }

  // Filtrar solo los dientes con estado distinto de sano (o con notas)
  const filas = Object.entries(dientes)
    .filter(([, datos]) =>(datos?.estado && datos.estado !== 'sano') ||datos?.notas)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([numero, datos]) => ({
      numero,
      estado: ESTADOS_LABEL[datos.estado] ?? datos.estado ?? '—',
      notas:  datos.notas || '',
    }))

  // Conteo por condición para el resumen visual
  const conteo = {}
  Object.values(dientes).forEach(({ estado }) => {
    if (!estado || estado === 'sano') return
    conteo[estado] = (conteo[estado] || 0) + 1
  })

  const resumen = Object.entries(conteo).map(([estado, total]) => ({
    estado: ESTADOS_LABEL[estado] ?? estado,
    total,
  }))

  return {
    filas,
    resumen,
    tiene_hallazgos: filas.length > 0,
  }
}

function siNo(valor) {
  if (valor === true) return 'Sí'
  if (valor === false) return 'No'
  return ''
}

function procesarHabitos(habitos) {
  if (!habitos) return []

  try {
    const datos =
      typeof habitos === 'string'
        ? JSON.parse(habitos)
        : habitos

    return Object.entries(datos)
      .filter(([, valor]) => valor === true)
      .map(([clave]) =>
        clave
          .replace(/_/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase())
      )
  } catch (error) {
    console.error('Error procesando hábitos:', error)
    return []
  }
}

function procesarExamen(examen) {
  if (!examen) return null

  const resultado = {}

  // Mantener compatibilidad con examen estomatológico
  if (examen.estructuras_json) {
    try {
      const datos = typeof examen.estructuras_json === 'string' ? JSON.parse(examen.estructuras_json) : examen.estructuras_json
      resultado.estructuras_json = Object.entries(datos)
        .filter(([, valor]) => valor === true)
        .map(([clave]) => clave)
    } catch {
      resultado.estructuras_json = []
    }
  }

  // Examen Pulpar
  if (examen.examen_pulpar_json) {
    try {
      const datos = typeof examen.examen_pulpar_json === 'string' ? JSON.parse(examen.examen_pulpar_json) : examen.examen_pulpar_json
      resultado.examen_pulpar = Object.entries(datos).map(([key, val]) => ({
        nombre: key,
        resultado: val === true ? 'Sí' : val === false ? 'No' : '—'
      }))
    } catch {
      resultado.examen_pulpar = []
    }
  }
  resultado.pulpar_obs = examen.pulpar_obs || ''

  // Tejidos Dentarios y Oclusión
  if (examen.tejidos_json) {
    try {
      const datos = typeof examen.tejidos_json === 'string' ? JSON.parse(examen.tejidos_json) : examen.tejidos_json
      resultado.tejidos = Object.entries(datos).map(([key, val]) => ({
        nombre: key,
        resultado: val === true ? 'Sí' : val === false ? 'No' : '—'
      }))
    } catch {
      resultado.tejidos = []
    }
  }
  resultado.tejidos_obs = examen.tejidos_obs || ''

  // Alteraciones Periodontales
  if (examen.periodontal_json) {
    try {
      const datos = typeof examen.periodontal_json === 'string' ? JSON.parse(examen.periodontal_json) : examen.periodontal_json
      
      resultado.periodontal_signos = Object.entries(datos)
        .filter(([key]) => key !== 'movilidad' && key !== 'bolsa')
        .map(([key, val]) => ({
          nombre: key,
          resultado: val === true ? 'Sí' : val === false ? 'No' : '—'
        }))

      const dientesSup = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
      const dientesInf = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];

      const movilidad = datos.movilidad || {};
      const bolsa = datos.bolsa || {};

      resultado.movilidad_sup = dientesSup.map(d => ({ numero: d, valor: movilidad[d] || '—' }));
      resultado.bolsa_sup = dientesSup.map(d => ({ numero: d, valor: bolsa[d] || '—' }));
      resultado.movilidad_inf = dientesInf.map(d => ({ numero: d, valor: movilidad[d] || '—' }));
      resultado.bolsa_inf = dientesInf.map(d => ({ numero: d, valor: bolsa[d] || '—' }));
      resultado.tiene_grid_periodontal = Object.keys(movilidad).length > 0 || Object.keys(bolsa).length > 0;
    } catch {
      resultado.periodontal_signos = []
      resultado.tiene_grid_periodontal = false
    }
  }
  
  resultado.dx_periodontal = examen.dx_periodontal || ''
  resultado.periodontal_obs = examen.periodontal_obs || ''
  resultado.observaciones = examen.observaciones || ''

  return resultado
}


async function generarHistoriaPDF(historia, consultorio_id) {
  const p = historia.paciente

  const nombreCompleto = p
    ? `${p.nombres} ${p.primer_apellido} ${p.segundo_apellido ?? ''}`.trim()
    : 'No registrado'

  const fechaAtencion = historia.fecha_atencion
    ? new Date(historia.fecha_atencion).toLocaleDateString('es-CO')
    : ''

  const odontogramaReg = Array.isArray(historia.odontogramas)
    ? ordenarOdontogramas(historia.odontogramas).find((item) => item.tipo === TIPO_DEFAULT) || null
    : await prisma.hcOdontograma.findFirst({
        where: { historia_id: historia.id, tipo: TIPO_DEFAULT },
        orderBy: [{ actualizado_en: 'desc' }, { creado_en: 'desc' }],
      })

  const odontograma = odontogramaReg
    ? procesarOdontograma(odontogramaReg.dientes_json)
    : null

  const antecedentes = historia.antecedentes
    ? {
        ...historia.antecedentes,

        tratamiento_medicacion: siNo(historia.antecedentes.tratamiento_medicacion),
        reacciones_alergicas: siNo(historia.antecedentes.reacciones_alergicas),
        problemas_coagulacion: siNo(historia.antecedentes.problemas_coagulacion),
        irradiaciones: siNo(historia.antecedentes.irradiaciones),
        tension_arterial: siNo(historia.antecedentes.tension_arterial),
        sinusitis: siNo(historia.antecedentes.sinusitis),
        enf_respiratorias: siNo(historia.antecedentes.enf_respiratorias),
        cardiopatias: siNo(historia.antecedentes.cardiopatias),
        diabetes: siNo(historia.antecedentes.diabetes),
        fiebre_reumatica: siNo(historia.antecedentes.fiebre_reumatica),
        hepatitis: siNo(historia.antecedentes.hepatitis),
        vih: siNo(historia.antecedentes.vih),
        trastornos_emocionales: siNo(historia.antecedentes.trastornos_emocionales),
      }
    : null

  const habitos = procesarHabitos(historia.habitos_json)
  const examen = procesarExamen(historia.examen)

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
        municipio_ciudad: p?.municipio_ciudad || '',
      },

      fecha_atencion: fechaAtencion,

      motivo_consulta: historia.motivo_consulta || '',

      medicamentos_actuales: historia.medicamentos_actuales || '',
      antecedentes_odontologicos: historia.antecedentes_odontologicos || '',

      evento_adverso: historia.evento_adverso ? 'Sí' : 'No',
      evento_adverso_obs: historia.evento_adverso_obs || '',

      departamento: historia.departamento || '',
      estado_civil: historia.estado_civil || '',
      direccion: historia.direccion || '',
      ocupacion: historia.ocupacion || '',
      acudiente: historia.acudiente || '',
      parentesco: historia.parentesco || '',

      eps: historia.eps || '',
      tipo_afiliacion: historia.tipo_afiliacion || '',
      tipo_sangre: historia.tipo_sangre || '',
      rh: historia.rh || '',
      alergias: historia.alergias || '',

      habitos,
      habitos_observaciones: historia.habitos_observaciones || '',

      diagnostico: historia.diagnostico || '',
      tratamiento_realizado: historia.tratamiento_realizado || '',
      observaciones: historia.observaciones || '',
      recomendaciones: historia.recomendaciones || '',

      firma_doctor: historia.firma_doctor,
      firma_paciente: historia.firma_paciente,

      antecedentes,

      examen,

      odontograma,
      odontograma_observaciones:
        odontogramaReg?.observaciones || '',
    },
  })
}

module.exports = generarHistoriaPDF
