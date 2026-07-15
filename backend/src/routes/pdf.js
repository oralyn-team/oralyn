// pdf.js - Rutas para generar PDFs de historias clínicas, cotizaciones, certificados, etc.
const express = require('express')
const router = express.Router()
const prisma = require('../lib/prisma')
const verificarToken = require('../middlewares/auth')

router.use(verificarToken)

const generarPacientePDF = require('../pdf/generators/generarPacientePDF')
const generarHistoriaPDF = require('../pdf/generators/generarHistoriaPDF')
const generarCotizacionPDF = require('../pdf/generators/generarCotizacionPDF')
const generarCertificadoPDF = require('../pdf/generators/generarCertificadoPDF')
const generarRecomendacionesPDF = require('../pdf/generators/generarRecomendacionesPDF')
const generarConsentimientoPDF = require('../pdf/generators/generarConsentimientoPDF')

router.get('/paciente/:id', async (req, res) => {
  try {
    const paciente = await prisma.paciente.findFirst({
      where: { id: Number(req.params.id), consultorio_id: req.usuario.consultorio_id }
    })
    if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' })

    const pdf = await generarPacientePDF(paciente, req.usuario.consultorio_id)
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename=paciente-${req.params.id}.pdf` })
    res.send(pdf)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error generando PDF' })
  }
})

router.get('/historia/:id', async (req, res) => {
  try {
    const historia = await prisma.historiaClinica.findUnique({
      where: { id: Number(req.params.id) },
      include: { paciente: true, antecedentes: true, examen: true, odontogramas: true, evoluciones: true }
    })
    if (!historia) return res.status(404).json({ error: 'Historia no encontrada' })
    if (historia.paciente.consultorio_id !== req.usuario.consultorio_id) {
      return res.status(403).json({ error: 'No autorizado' })
    }

    const pdf = await generarHistoriaPDF(historia, req.usuario.consultorio_id)
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename=historia-${req.params.id}.pdf` })
    res.send(pdf)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error generando PDF' })
  }
})

router.get('/cotizacion/:id', async (req, res) => {
  try {
    const cotizacion = await prisma.cotizacion.findFirst({
      where: { id: Number(req.params.id), consultorio_id: req.usuario.consultorio_id },
      include: {
        paciente: { select: { nombres: true, primer_apellido: true, segundo_apellido: true, tipo_documento: true, numero_documento: true, telefono: true } },
        procedimientos: { orderBy: { orden: 'asc' } },
        pagos: { orderBy: { fecha: 'desc' } }
      }
    })
    if (!cotizacion) return res.status(404).json({ error: 'Cotización no encontrada' })

    const pdf = await generarCotizacionPDF(cotizacion, req.usuario.consultorio_id)
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename=cotizacion-${req.params.id}.pdf` })
    res.send(pdf)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error generando PDF' })
  }
})

router.get('/certificado/:id', async (req, res) => {
  try {
    const certificado = await prisma.certificadoDental.findFirst({
      where: { id: Number(req.params.id), consultorio_id: req.usuario.consultorio_id },
      include: {
        paciente: { select: { nombres: true, primer_apellido: true, segundo_apellido: true, tipo_documento: true, numero_documento: true } }
      }
    })
    if (!certificado) return res.status(404).json({ error: 'Certificado no encontrado' })

    const pdf = await generarCertificadoPDF(certificado, req.usuario.consultorio_id)
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename=certificado-${req.params.id}.pdf` })
    res.send(pdf)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error generando PDF' })
  }
})

router.get('/recomendaciones', async (req, res) => {
  try {
    const pdf = await generarRecomendacionesPDF(req.usuario.consultorio_id)
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename=recomendaciones-postqx.pdf' })
    res.send(pdf)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error generando PDF' })
  }
})

router.get('/consentimiento/:id', async (req, res) => {
  try {
    const consultorio_id = req.usuario?.consultorio_id || 1
    const consentimiento = await prisma.consentimiento.findFirst({
      where: { id: Number(req.params.id), consultorio_id },
      include: {
        paciente: { select: { nombres: true, primer_apellido: true, segundo_apellido: true, tipo_documento: true, numero_documento: true } }
      }
    })
    if (!consentimiento) return res.status(404).json({ error: 'Consentimiento no encontrado' })

    const pdf = await generarConsentimientoPDF(consentimiento, consultorio_id)
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename=consentimiento-${consentimiento.tipo}-${req.params.id}.pdf` })
    res.send(pdf)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error generando PDF' })
  }
})

module.exports = router
