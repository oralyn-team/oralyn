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
    // Campos adicionales
    departamento,
    estado_civil,
    direccion,
    ocupacion,
    acudiente,
    parentesco,
    eps,
    tipo_afiliacion,
    tipo_sangre,
    rh,
    alergias,
    // Nested
    antecedentes,
    examen,
    odontograma,
  } = req.body

  if (!motivo_consulta || !diagnostico) {
    return res.status(400).json({ error: 'Motivo de consulta y diagnóstico son obligatorios' })
  }

  try {
    const paciente = await prisma.paciente.findUnique({ where: { id: pacienteId } })
    if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' })

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
          firma_paciente,
          departamento,
          estado_civil,
          direccion,
          ocupacion,
          acudiente,
          parentesco,
          eps,
          tipo_afiliacion,
          tipo_sangre,
          rh,
          alergias,
        }
      })

      if (antecedentes && Object.keys(antecedentes).length > 0) {
        await tx.hcAntecedentes.create({
          data: { historia_id: h.id, ...antecedentes }
        })
      }

      if (examen) {
        await tx.hcExamenEstomatologico.create({
          data: {
            historia_id:      h.id,
            estructuras_json: examen.estructuras_json ?? examen,
            observaciones:    examen.observaciones ?? null,
          }
        })
      }

      if (odontograma) {
        await tx.hcOdontograma.create({
          data: {
            historia_id:   h.id,
            dientes_json:  odontograma.dientes_json,
            observaciones: odontograma.observaciones,
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
        paciente_id: true,
        fecha_atencion: true,
        motivo_consulta: true,
        diagnostico: true,
        tratamiento_realizado: true,
        medicamentos_actuales: true,
        antecedentes_odontologicos: true,
        evento_adverso: true,
        evento_adverso_obs: true,
        habitos_json: true,
        habitos_observaciones: true,
        observaciones: true,
        recomendaciones: true,
        firma_doctor: true,
        firma_paciente: true,
        departamento: true,
        estado_civil: true,
        direccion: true,
        ocupacion: true,
        acudiente: true,
        parentesco: true,
        eps: true,
        tipo_afiliacion: true,
        tipo_sangre: true,
        rh: true,
        alergias: true,
      }
    })

    res.json(historias)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/historias/detalle/:id — ver historia completa con nested
router.get('/detalle/:id', async (req, res) => {
  const id = parseInt(req.params.id)

  try {
    const historia = await prisma.historiaClinica.findUnique({
      where: { id },
<<<<<<< HEAD
      include: {
        antecedentes: true,
        examen: true,
        odontogramas: { orderBy: { creado_en: 'desc' } },
        evoluciones:  { orderBy: { fecha: 'desc' } },
        adjuntos: { orderBy: { creado_en: 'desc' } },

      }
=======
     include: {
  paciente: true,
  antecedentes: true,
  examen: true,
  odontogramas: {
    orderBy: { creado_en: 'desc' }
  },
  evoluciones: {
    orderBy: { fecha: 'desc' }
  }
}
>>>>>>> e53c12b13befe55b9a46716617d0eaada26d8941
    })

    if (!historia) return res.status(404).json({ error: 'Historia clínica no encontrada' })

    res.json(historia)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// PUT /api/historias/:id — editar historia completa
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  const { antecedentes, examen, ...datos } = req.body

  try {
    const historia = await prisma.$transaction(async (tx) => {

      const h = await tx.historiaClinica.update({
        where: { id },
        data: {
          motivo_consulta:            datos.motivo_consulta,
          medicamentos_actuales:      datos.medicamentos_actuales,
          antecedentes_odontologicos: datos.antecedentes_odontologicos,
          evento_adverso:             datos.evento_adverso,
          evento_adverso_obs:         datos.evento_adverso_obs,
          habitos_json:               datos.habitos_json,
          habitos_observaciones:      datos.habitos_observaciones,
          diagnostico:                datos.diagnostico,
          tratamiento_realizado:      datos.tratamiento_realizado,
          observaciones:              datos.observaciones,
          recomendaciones:            datos.recomendaciones,
          firma_doctor:               datos.firma_doctor,
          firma_paciente:             datos.firma_paciente,
          departamento:               datos.departamento    ?? null,
          estado_civil:               datos.estado_civil    ?? null,
          direccion:                  datos.direccion       ?? null,
          ocupacion:                  datos.ocupacion       ?? null,
          acudiente:                  datos.acudiente       ?? null,
          parentesco:                 datos.parentesco      ?? null,
          eps:                        datos.eps             ?? null,
          tipo_afiliacion:            datos.tipo_afiliacion ?? null,
          tipo_sangre:                datos.tipo_sangre     ?? null,
          rh:                         datos.rh              ?? null,
          alergias:                   datos.alergias        ?? null,
        }
      })

      if (antecedentes && Object.keys(antecedentes).length > 0) {
        await tx.hcAntecedentes.upsert({
  where: {
    historia_id: id
  },
  update: {
    tratamiento_medicacion: false,
    problemas_coagulacion: false,
    irradiaciones: false,
    tension_arterial: false,
    sinusitis: false,
    enf_respiratorias: false,
    cardiopatias: false,
    diabetes: false,
    fiebre_reumatica: true,
    hepatitis: true,
    vih: false,
    trastornos_emocionales: false
  },
  create: {
    historia_id: 1,
    tratamiento_medicacion: false,
    problemas_coagulacion: false,
    irradiaciones: false,
    tension_arterial: false,
    sinusitis: false,
    enf_respiratorias: false,
    cardiopatias: false,
    diabetes: false,
    fiebre_reumatica: true,
    hepatitis: true,
    vih: false,
    trastornos_emocionales: false
  }
})
      }

      if (examen) {
        await tx.hcExamenEstomatologico.upsert({
          where:  { historia_id: id },
          update: {
            estructuras_json: examen.estructuras_json,
            observaciones:    examen.observaciones,
          },
          create: {
            historia_id:      id,
            estructuras_json: examen.estructuras_json,
            observaciones:    examen.observaciones,
          },
        })
      }

      return h
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

// POST /api/historias/:historiaId/evoluciones
// FIX: campos actualizados para coincidir con el modelo HojaEvolucion del schema
router.post('/:historiaId/evoluciones', async (req, res) => {
  const historiaId = parseInt(req.params.historiaId)
  const {
    fecha,
    doctor,
    motivo,
    diagnostico,
    procedimiento,
    piezas_tratadas,
    tratamiento,
    estado_clinico,
    recomendaciones,
    proximo_control,
    observaciones,
  } = req.body

  // FIX: el campo obligatorio real es 'procedimiento', no 'procedimiento_realizado'
  if (!procedimiento) {
    return res.status(400).json({ error: 'El procedimiento es obligatorio' })
  }

  try {
    const historia = await prisma.historiaClinica.findUnique({ where: { id: historiaId } })
    if (!historia) return res.status(404).json({ error: 'Historia no encontrada' })

    const evolucion = await prisma.hojaEvolucion.create({
      data: {
        historia_id:    historiaId,
        fecha:          fecha ? new Date(fecha) : new Date(),
        doctor:         doctor         ?? null,
        motivo:         motivo         ?? null,
        diagnostico:    diagnostico    ?? null,
        procedimiento,
        piezas_tratadas: piezas_tratadas ?? null,
        tratamiento:    tratamiento    ?? null,
        estado_clinico: estado_clinico ?? null,
        recomendaciones: recomendaciones ?? null,
        proximo_control: proximo_control ? new Date(proximo_control) : null,
        observaciones:  observaciones  ?? null,
      }
    })

    res.status(201).json(evolucion)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/historias/:historiaId/evoluciones
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

// PUT /api/historias/:historiaId/odontograma
router.put('/:historiaId/odontograma', async (req, res) => {
  const historiaId = parseInt(req.params.historiaId)
  const { dientes_json, observaciones } = req.body

  if (!dientes_json) {
    return res.status(400).json({ error: 'dientes_json es obligatorio' })
  }

  try {
    const historia = await prisma.historiaClinica.findUnique({ where: { id: historiaId } })
    if (!historia) return res.status(404).json({ error: 'Historia no encontrada' })

    const existente = await prisma.hcOdontograma.findFirst({
      where: { historia_id: historiaId },
      orderBy: { creado_en: 'desc' }
    })

    const odontograma = existente
      ? await prisma.hcOdontograma.update({
          where: { id: existente.id },
          data: { dientes_json, observaciones }
        })
      : await prisma.hcOdontograma.create({
          data: { historia_id: historiaId, dientes_json, observaciones }
        })

    res.json(odontograma)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// PUT /api/historias/:historiaId/evoluciones/:evolucionId — editar evolución
router.put('/:historiaId/evoluciones/:evolucionId', async (req, res) => {
  const historiaId = parseInt(req.params.historiaId)
  const evolucionId = parseInt(req.params.evolucionId)

  const {
    fecha,
    doctor,
    motivo,
    diagnostico,
    procedimiento,
    piezas_tratadas,
    tratamiento,
    estado_clinico,
    recomendaciones,
    proximo_control,
    observaciones,
  } = req.body

  if (isNaN(historiaId) || isNaN(evolucionId)) {
    return res.status(400).json({ error: 'ID inválido' })
  }

  if (!procedimiento) {
    return res.status(400).json({ error: 'El procedimiento es obligatorio' })
  }

  try {
    const evolucion = await prisma.hojaEvolucion.update({
      where: { id: evolucionId },
      data: {
        fecha: fecha ? new Date(fecha) : new Date(),
        doctor: doctor ?? null,
        motivo: motivo ?? null,
        diagnostico: diagnostico ?? null,
        procedimiento,
        piezas_tratadas: piezas_tratadas ?? null,
        tratamiento: tratamiento ?? null,
        estado_clinico: estado_clinico ?? null,
        recomendaciones: recomendaciones ?? null,
        proximo_control: proximo_control ? new Date(proximo_control) : null,
        observaciones: observaciones ?? null,
      }
    })

    if (evolucion.historia_id !== historiaId) {
      return res.status(400).json({ error: 'La evolución no pertenece a esta historia' })
    }

    res.json(evolucion)
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Evolución no encontrada' })
    }
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// DELETE /api/historias/:historiaId/evoluciones/:evolucionId
router.delete('/:historiaId/evoluciones/:evolucionId', async (req, res) => {
  const historiaId = parseInt(req.params.historiaId)
  const evolucionId = parseInt(req.params.evolucionId)

  if (isNaN(historiaId) || isNaN(evolucionId)) {
    return res.status(400).json({ error: 'ID inválido' })
  }

  try {
    const evolucion = await prisma.hojaEvolucion.findUnique({
      where: { id: evolucionId }
    })

    if (!evolucion) {
      return res.status(404).json({ error: 'Evolución no encontrada' })
    }

    if (evolucion.historia_id !== historiaId) {
      return res.status(400).json({ error: 'La evolución no pertenece a esta historia' })
    }

    await prisma.hojaEvolucion.delete({ where: { id: evolucionId } })

    res.status(204).send()
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/historias/:historiaId/adjuntos
router.get('/:historiaId/adjuntos', async (req, res) => {
  const historiaId = parseInt(req.params.historiaId)

  if (isNaN(historiaId)) {
    return res.status(400).json({ error: 'ID de historia inválido' })
  }

  try {
    const adjuntos = await prisma.hcAdjunto.findMany({
      where: { historia_id: historiaId },
      orderBy: { creado_en: 'desc' }
    })

    res.json(adjuntos)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// POST /api/historias/:historiaId/adjuntos
router.post('/:historiaId/adjuntos', async (req, res) => {
  const historiaId = parseInt(req.params.historiaId)

  const {
    nombre,
    nombre_archivo,
    tipo,
    mime_type,
    tamano_bytes,
    contenido_base64,
    url,
  } = req.body

  if (isNaN(historiaId)) {
    return res.status(400).json({ error: 'ID de historia inválido' })
  }

  if (!nombre_archivo && !nombre) {
    return res.status(400).json({ error: 'El nombre del archivo es obligatorio' })
  }

  try {
    const historia = await prisma.historiaClinica.findUnique({
      where: { id: historiaId }
    })

    if (!historia) {
      return res.status(404).json({ error: 'Historia no encontrada' })
    }

    const adjunto = await prisma.hcAdjunto.create({
      data: {
        historia_id: historiaId,
        nombre_archivo: nombre_archivo ?? nombre,
        tipo: tipo ?? null,
        mime_type: mime_type ?? null,
        tamano_bytes: tamano_bytes ? Number(tamano_bytes) : null,
        contenido_base64: contenido_base64 ?? null,
        url: url ?? null,
      }
    })

    res.status(201).json(adjunto)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// DELETE /api/historias/:historiaId/adjuntos/:adjuntoId
router.delete('/:historiaId/adjuntos/:adjuntoId', async (req, res) => {
  const historiaId = parseInt(req.params.historiaId)
  const adjuntoId = parseInt(req.params.adjuntoId)

  if (isNaN(historiaId) || isNaN(adjuntoId)) {
    return res.status(400).json({ error: 'ID inválido' })
  }

  try {
    const adjunto = await prisma.hcAdjunto.findUnique({
      where: { id: adjuntoId }
    })

    if (!adjunto) {
      return res.status(404).json({ error: 'Adjunto no encontrado' })
    }

    if (adjunto.historia_id !== historiaId) {
      return res.status(400).json({ error: 'El adjunto no pertenece a esta historia' })
    }

    await prisma.hcAdjunto.delete({ where: { id: adjuntoId } })

    res.status(204).send()
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})


module.exports = router