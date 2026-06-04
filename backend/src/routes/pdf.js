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

const generarCertificadoPDF = require('../pdf/generators/generarCertificadoPDF')

router.get('/certificado/:id', async (req, res) => {
  try {
    const { id } = req.params
    const certificado = await prisma.certificadoDental.findUnique({
      where: { id: Number(id) },
      include: {
        paciente: {
          select: {
            nombres: true,
            primer_apellido: true,
            segundo_apellido: true,
            tipo_documento: true,
            numero_documento: true
          }
        }
      }
    })

    if (!certificado) {
      return res.status(404).json({ error: 'Certificado no encontrado' })
    }

    const pdf = await generarCertificadoPDF(certificado)

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename=certificado-${id}.pdf`
    })

    res.send(pdf)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error generando PDF' })
  }
})

const generarRecomendacionesPDF = require('../pdf/generators/generarRecomendacionesPDF')

router.get('/recomendaciones', async (req, res) => {
  try {
    const pdf = await generarRecomendacionesPDF()
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename=recomendaciones-postqx.pdf'
    })
    res.send(pdf)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error generando PDF' })
  }
})

const generarConsentimientoPDF = require('../pdf/generators/generarConsentimientoPDF')

router.get('/consentimiento/:id', async (req, res) => {
  try {
    const { id } = req.params
    const consentimiento = await prisma.consentimiento.findUnique({
      where: { id: Number(id) },
      include: {
        paciente: {
          select: {
            nombres: true,
            primer_apellido: true,
            segundo_apellido: true,
            tipo_documento: true,
            numero_documento: true
          }
        }
      }
    })

    if (!consentimiento) {
      return res.status(404).json({ error: 'Consentimiento no encontrado' })
    }

    const pdf = await generarConsentimientoPDF(consentimiento)

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename=consentimiento-${consentimiento.tipo}-${id}.pdf`
    })

    res.send(pdf)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error generando PDF' })
  }
})

module.exports = router