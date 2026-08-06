const MAPA_ANTECEDENTES = {
  'Tratamiento médico con medicación':            'tratamiento_medicacion',
  'Reacciones alérgicas':                          'reacciones_alergicas',
  'Problemas de coagulación':                      'problemas_coagulacion',
  'Irradiaciones':                                 'irradiaciones',
  'Trastorno de tensión arterial':                 'tension_arterial',
  'Sinusitis':                                     'sinusitis',
  'Enfermedades respiratorias':                    'enf_respiratorias',
  'Cardiopatías':                                  'cardiopatias',
  'Diabetes':                                      'diabetes',
  'Fiebre reumática':                              'fiebre_reumatica',
  'Hepatitis':                                     'hepatitis',
  'Síndrome de inmunodeficiencia adquirida (VIH)': 'vih',
  'Trastornos emocionales':                        'trastornos_emocionales',
}

// Campos que ya vienen en snake_case (por si el front manda alguno directo)
const CAMPOS_VALIDOS = new Set([
  'tratamiento_medicacion', 'tratamiento_med_obs',
  'reacciones_alergicas', 'alergias_obs',
  'problemas_coagulacion', 'coagulacion_obs',
  'irradiaciones', 'irradiaciones_obs',
  'tension_arterial', 'tension_obs',
  'sinusitis', 'sinusitis_obs',
  'enf_respiratorias', 'respiratorias_obs',
  'cardiopatias', 'cardiopatias_obs',
  'diabetes', 'diabetes_obs',
  'fiebre_reumatica', 'fiebre_obs',
  'hepatitis', 'hepatitis_obs',
  'vih', 'vih_obs',
  'trastornos_emocionales', 'emocionales_obs',
  'observaciones_generales',
])

function normalizarAntecedentes(antecedentes = {}) {
  const normalizado = {}
  for (const [clave, valor] of Object.entries(antecedentes)) {
    const campo = MAPA_ANTECEDENTES[clave] || clave
    if (CAMPOS_VALIDOS.has(campo)) {
      normalizado[campo] = valor
    }
    // si no matchea nada, se descarta silenciosamente en vez de romper el upsert
  }
  return normalizado
}

module.exports = { normalizarAntecedentes }