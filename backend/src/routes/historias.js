const express = require('express')
const prisma = require('../lib/prisma')
const verificarToken = require('../middlewares/auth')

const router = express.Router()

router.use(verificarToken)

// POST /api/historias/:pacienteId — crear historia completa
router.post('/:pacienteId', async (req, res) => {
  const pacienteId = parseInt(req.params.pacienteId)
  const {
    motivo_consulta,
    medicamentos_actuales,
    antecedentes_odontologicos,
    evento_adverso,
    evento_adverso_obs,
    habitos_json,
    habitos_observaciones,
    diagnostico,
    tratamiento_realizado,
    observaciones,
    recomendaciones,
    firma_doctor,
    firma_paciente,
    antecedentes,
    examen,
    odontograma
  } = req.body

  if (!motivo_consulta || !diagnostico) {
    return res.status(400).json({ error: 'Motivo de consulta y diagnóstico son obligatorios' })
  }

  try {
    const paciente = await prisma.paciente.findUnique({ where: { id: pacienteId } })
    if (!paciente) {
      return res.status(404).json({ error: 'Paciente no encontrado' })
    }

    const historia = await prisma.$transaction(async (tx) => {
      const h = await tx.historiaClinica.create({
        data: {
          paciente_id: pacienteId,
          motivo_consulta,
          medicamentos_actuales,
          antecedentes_odontologicos,
          evento_adverso: evento_adverso ?? false,
          evento_adverso_obs,
          habitos_json,
          habitos_observaciones,
          diagnostico,
          tratamiento_realizado,
          observaciones,
          recomendaciones,
          firma_doctor,
          firma_paciente
        }
      })

      if (antecedentes) {
        await tx.hcAntecedentes.create({
          data: { historia_id: h.id, ...antecedentes }
        })
      }

      if (examen) {
        await tx.hcExamenEstomatologico.create({
          data: { historia_id: h.id, ...examen }
        })
      }

      if (odontograma) {
        await tx.hcOdontograma.create({
          data: {
            historia_id: h.id,
            dientes_json: odontograma.dientes_json,
            observaciones: odontograma.observaciones
          }
        })
      }

      return h
    })

    res.status(201).json(historia)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/historias/:pacienteId — listar historias de un paciente
router.get('/:pacienteId', async (req, res) => {
  const pacienteId = parseInt(req.params.pacienteId)

  try {
    const historias = await prisma.historiaClinica.findMany({
      where: { paciente_id: pacienteId },
      orderBy: { fecha_atencion: 'desc' },
      select: {
        id: true,
        fecha_atencion: true,
        motivo_consulta: true,
        diagnostico: true,
        tratamiento_realizado: true
      }
    })
    res.json(historias)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/historias/detalle/:id — ver historia completa
router.get('/detalle/:id', async (req, res) => {
  const id = parseInt(req.params.id)

  try {
    const historia = await prisma.historiaClinica.findUnique({
      where: { id },
      include: {
        antecedentes: true,
        examen: true,
        odontogramas: { orderBy: { creado_en: 'desc' } },
        evoluciones: { orderBy: { fecha: 'desc' } }
      }
    })

    if (!historia) {
      return res.status(404).json({ error: 'Historia clínica no encontrada' })
    }

    res.json(historia)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// PUT /api/historias/:id — editar historia
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  const datos = req.body

  try {
    const historia = await prisma.historiaClinica.update({
      where: { id },
      data: {
        motivo_consulta: datos.motivo_consulta,
        medicamentos_actuales: datos.medicamentos_actuales,
        antecedentes_odontologicos: datos.antecedentes_odontologicos,
        evento_adverso: datos.evento_adverso,
        evento_adverso_obs: datos.evento_adverso_obs,
        habitos_json: datos.habitos_json,
        habitos_observaciones: datos.habitos_observaciones,
        diagnostico: datos.diagnostico,
        tratamiento_realizado: datos.tratamiento_realizado,
        observaciones: datos.observaciones,
        recomendaciones: datos.recomendaciones,
        firma_doctor: datos.firma_doctor,
        firma_paciente: datos.firma_paciente
      }
    })
    res.json(historia)
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Historia no encontrada' })
    }
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// POST /api/historias/:historiaId/evoluciones — agregar evolución
router.post('/:historiaId/evoluciones', async (req, res) => {
  const historiaId = parseInt(req.params.historiaId)
  const {
    fecha,
    diente,
    cavidad,
    tipo_consulta,
    procedimiento_realizado,
    firma_odontologo,
    firma_paciente
  } = req.body

  if (!procedimiento_realizado) {
    return res.status(400).json({ error: 'El procedimiento realizado es obligatorio' })
  }

  try {
    const historia = await prisma.historiaClinica.findUnique({
      where: { id: historiaId }
    })
    if (!historia) {
      return res.status(404).json({ error: 'Historia no encontrada' })
    }

    const evolucion = await prisma.hojaEvolucion.create({
      data: {
        historia_id: historiaId,
        fecha: fecha ? new Date(fecha) : new Date(),
        diente,
        cavidad,
        tipo_consulta,
        procedimiento_realizado,
        firma_odontologo,
        firma_paciente
      }
    })

    res.status(201).json(evolucion)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/historias/:historiaId/evoluciones — listar evoluciones
router.get('/:historiaId/evoluciones', async (req, res) => {
  const historiaId = parseInt(req.params.historiaId)

  try {
    const evoluciones = await prisma.hojaEvolucion.findMany({
      where: { historia_id: historiaId },
      orderBy: { fecha: 'desc' }
    })
    res.json(evoluciones)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

module.exports = router