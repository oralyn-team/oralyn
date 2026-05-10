const express = require('express')
const router = express.Router()

const generarPDFTest = require('../pdf/generators/generarPDFTest')
const generarHistoriaPDF = require('../pdf/generators/generarHistoriaPDF')

const verificarToken = require('../middlewares/auth')
//router.use(verificarToken)

router.get('/test', async (req, res) => {

  try {

    const pdf = await generarPDFTest({
      nombre: 'Valentina'
    })

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename=test.pdf'
    })

    res.send(pdf)

  } catch (error) {

    console.error(error)

    res.status(500).json({
      error: 'Error generando PDF'
    })
  }

})

const prisma = require('../lib/prisma')
const generarPacientePDF = require('../pdf/generators/generarPacientePDF')

router.get('/paciente/:id', async (req, res) => {

  try {

    const { id } = req.params

    // buscar paciente
    const paciente = await prisma.paciente.findUnique({
      where: {
        id: Number(id)
      }
    })

    if (!paciente) {
      return res.status(404).json({
        error: 'Paciente no encontrado'
      })
    }

    // generar pdf
    const pdf = await generarPacientePDF(paciente)

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename=paciente-${id}.pdf`
    })

    res.send(pdf)

  } catch (error) {

    console.error(error)

    res.status(500).json({
      error: 'Error generando PDF'
    })
  }

})

router.get('/historia/:id', async (req, res) => {

  try {

    const { id } = req.params

    const historia = await prisma.historiaClinica.findUnique({
      where: {
        id: Number(id)
      },

      include: {
        paciente: true,
        antecedentes: true,
        examen: true,
        odontogramas: true,
        evoluciones: true
      }
    })

    if (!historia) {
      return res.status(404).json({
        error: 'Historia no encontrada'
      })
    }

    const pdf = await generarHistoriaPDF(historia)

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename=historia-${id}.pdf`
    })

    res.send(pdf)

  } catch (error) {

    console.error(error)

    res.status(500).json({
      error: 'Error generando PDF'
    })
  }

})

const generarCotizacionPDF = require('../pdf/generators/generarCotizacionPDF')

router.get('/cotizacion/:id', async (req, res) => {
  try {
    const { id } = req.params
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: Number(id) },
      include: {
        paciente: {
          select: {
            nombres: true,
            primer_apellido: true,
            segundo_apellido: true,
            tipo_documento: true,
            numero_documento: true,
            telefono: true
          }
        },
        items: true
      }
    })

    if (!cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' })
    }

    const pdf = await generarCotizacionPDF(cotizacion)

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename=cotizacion-${id}.pdf`
    })

    res.send(pdf)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error generando PDF' })
  }
})

module.exports = router