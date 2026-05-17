const generarPDF = require('../helpers/generarPDF')

async function generarRecomendacionesPDF() {
  return await generarPDF({
    template: 'recomendaciones',
    data: {}
  })
}

module.exports = generarRecomendacionesPDF