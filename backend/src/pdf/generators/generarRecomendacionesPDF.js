const generarPDF = require('../helpers/generarPDF')

async function generarRecomendacionesPDF(consultorio_id) {
  return await generarPDF({
    template: 'recomendaciones',
    consultorio_id,
    data: {}
  })
}

module.exports = generarRecomendacionesPDF