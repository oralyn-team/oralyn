//certificados.js - Rutas para gestionar certificados dentales
const express = require('express')
const prisma = require('../lib/prisma')
const verificarToken = require('../middlewares/auth')

const router = express.Router()

router.use(verificarToken)

router.post('/', async (req, res) => {
  const { paciente_id, cita_id, tipo_cita_texto, fecha_expedicion, ciudad } = req.body

  if (!paciente_id || !tipo_cita_texto || !fecha_expedicion) {
    return res.status(400).json({ error: 'Paciente, tipo de cita y fecha son obligatorios' })
  }

  try {
    const certificado = await prisma.certificadoDental.create({
      data: {
        paciente_id,
        cita_id: cita_id || null,
        tipo_cita_texto,
        fecha_expedicion: new Date(fecha_expedicion),
        ciudad: ciudad || 'Villavicencio'
      }
    })
    res.status(201).json(certificado)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

router.get('/paciente/:pacienteId', async (req, res) => {
  const pacienteId = parseInt(req.params.pacienteId)
  try {
    const certificados = await prisma.certificadoDental.findMany({
      where: { paciente_id: pacienteId },
      orderBy: { fecha_expedicion: 'desc' }
    })
    res.json(certificados)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

router.patch('/:id/anular', async (req, res) => {
  const id = parseInt(req.params.id)
  const { motivo_anulacion } = req.body

  if (!motivo_anulacion) {
    return res.status(400).json({ error: 'El motivo de anulación es obligatorio' })
  }

  try {
    const certificado = await prisma.certificadoDental.update({
      where: { id },
      data: {
        anulado: true,
        anulado_en: new Date(),
        motivo_anulacion
      }
    })

    res.json(certificado)
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Certificado no encontrado' })
    }
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id)

  try {
    const certificado = await prisma.certificadoDental.findUnique({ where: { id } })

    if (!certificado) {
      return res.status(404).json({ error: 'Certificado no encontrado' })
    }

    await prisma.certificadoDental.delete({ where: { id } })
    res.status(204).send()
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

const generarCertificadoPDF = require("../pdf/generators/generarCertificadoPDF");

router.get("/:id/pdf", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const certificado = await prisma.certificadoDental.findUnique({
      where: {
        id,
      },
      include: {
        paciente: true,
      },
    });

    if (!certificado) {
      return res.status(404).json({
        error: "Certificado no encontrado",
      });
    }

    const pdf = await generarCertificadoPDF(
      certificado,
      req.usuario.consultorio_id
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=certificado-${id}.pdf`
    );

    res.send(pdf);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Error generando PDF",
    });
  }
});

module.exports = router