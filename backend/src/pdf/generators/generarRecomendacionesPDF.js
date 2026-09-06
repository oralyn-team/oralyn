const generarPDF = require('../helpers/generarPDF')

async function generarRecomendacionesPDF(dataOrConsultorioId, consultorioId) {
  let consultorio_id = consultorioId
  let data = {}
  if (typeof dataOrConsultorioId === 'object' && dataOrConsultorioId !== null) {
    data = dataOrConsultorioId
  } else {
    consultorio_id = dataOrConsultorioId
  }
  return await generarPDF({
    template: 'recomendaciones',
    consultorio_id,
    data: {
      profesional_id: data.profesional_id || null,
      profesional: data.profesional || null,
      ...data
    }
  })
}

module.exports = generarRecomendacionesPDF