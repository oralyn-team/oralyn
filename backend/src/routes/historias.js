const express = require('express')
const prisma = require('../lib/prisma')
const verificarToken = require('../middlewares/auth')
const {
  TIPO_DEFAULT,
  extraerDatosOdontograma,
  obtenerHistoriaAutorizada,
  listarOdontogramas,
  obtenerOdontograma,
  guardarOdontograma,
  ordenarOdontogramas,
  normalizarTipoOdontograma,
} = require('../services/odontogramas')
const { normalizarAntecedentes } = require('../services/antecedentes')



const router = express.Router()
router.use(verificarToken)

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
    antecedentes,
    examen,
    odontograma,
  } = req.body

  if (!motivo_consulta || !diagnostico) {
    return res.status(400).json({ error: 'Motivo de consulta y diagnóstico son obligatorios' })
  }

  try {
    const paciente = await prisma.paciente.findFirst({
      where: { id: pacienteId, consultorio_id: req.usuario.consultorio_id }
    })
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
          data: { historia_id: h.id, ...normalizarAntecedentes(antecedentes) },
        })
      }

      if (examen) {
        await tx.hcExamenEstomatologico.create({
          data: {
            historia_id:        h.id,
            estructuras_json:   examen.estructuras_json ?? null,
            observaciones:      examen.observaciones ?? null,
            examen_pulpar_json: examen.examen_pulpar_json ?? null,
            pulpar_obs:         examen.pulpar_obs ?? null,
            tejidos_json:       examen.tejidos_json ?? null,
            tejidos_obs:        examen.tejidos_obs ?? null,
            periodontal_json:   examen.periodontal_json ?? null,
            dx_periodontal:     examen.dx_periodontal ?? null,
            periodontal_obs:    examen.periodontal_obs ?? null,
          }
        })
      }

      if (odontograma) {
        const tipo = normalizarTipoOdontograma(odontograma.tipo)
        const datosOdontograma = extraerDatosOdontograma(odontograma)

        if (!datosOdontograma.dientes_json) {
          throw new Error('dientes_json es obligatorio para crear el odontograma')
        }

        await tx.hcOdontograma.create({
          data: {
            historia_id:   h.id,
            tipo,
            ...datosOdontograma,
          }
        })
      }

      return h
    })

    res.status(201).json(historia)
  } catch (error) {
  if (error.statusCode) return res.status(error.statusCode).json({ error: error.message })
  console.error(error)
  res.status(500).json({ error: 'Error interno del servidor' })
  }
})

router.get('/:pacienteId', async (req, res) => {
  const pacienteId = parseInt(req.params.pacienteId)
  try {
    const paciente = await prisma.paciente.findFirst({
      where: { id: pacienteId, consultorio_id: req.usuario.consultorio_id }
    })
    if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' })

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
      include: {
        paciente:     true,
        antecedentes: true,
        examen:       true,
        odontogramas: true,
        evoluciones:  { orderBy: { fecha: 'desc' } },
        adjuntos:     { orderBy: { creado_en: 'desc' } },
      }
    })

    if (!historia) return res.status(404).json({ error: 'Historia clínica no encontrada' })

    if (historia.paciente.consultorio_id !== req.usuario.consultorio_id) {
      return res.status(403).json({ error: 'No autorizado' })
    }

    res.json({
      ...historia,
      odontogramas: ordenarOdontogramas(historia.odontogramas),
    })
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
        const antecedentesNormalizados = normalizarAntecedentes(antecedentes)
        await tx.hcAntecedentes.upsert({
          where:  { historia_id: id },
          update: antecedentesNormalizados,
          create: { historia_id: id, ...antecedentesNormalizados },
        })
      }

      if (examen) {
        await tx.hcExamenEstomatologico.upsert({
          where:  { historia_id: id },
          update: {
            estructuras_json:   examen.estructuras_json,
            observaciones:      examen.observaciones,
            examen_pulpar_json: examen.examen_pulpar_json,
            pulpar_obs:         examen.pulpar_obs,
            tejidos_json:       examen.tejidos_json,
            tejidos_obs:        examen.tejidos_obs,
            periodontal_json:   examen.periodontal_json,
            dx_periodontal:     examen.dx_periodontal,
            periodontal_obs:    examen.periodontal_obs,
          },
          create: {
            historia_id:        id,
            estructuras_json:   examen.estructuras_json,
            observaciones:      examen.observaciones,
            examen_pulpar_json: examen.examen_pulpar_json,
            pulpar_obs:         examen.pulpar_obs,
            tejidos_json:       examen.tejidos_json,
            tejidos_obs:        examen.tejidos_obs,
            periodontal_json:   examen.periodontal_json,
            dx_periodontal:     examen.dx_periodontal,
            periodontal_obs:    examen.periodontal_obs,
          },
        })
      }

      return h
    })

    res.json(historia) 
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message })
      console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// POST /api/historias/:historiaId/evoluciones
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

  if (!procedimiento) {
    return res.status(400).json({ error: 'El procedimiento es obligatorio' })
  }

  try {
    const historia = await prisma.historiaClinica.findUnique({ where: { id: historiaId } })
    if (!historia) return res.status(404).json({ error: 'Historia no encontrada' })

    const evolucion = await prisma.hojaEvolucion.create({
      data: {
        historia_id:     historiaId,
        fecha:           fecha ? new Date(fecha) : new Date(),
        doctor:          doctor          ?? null,
        motivo:          motivo          ?? null,
        diagnostico:     diagnostico     ?? null,
        procedimiento,
        piezas_tratadas: piezas_tratadas ?? null,
        tratamiento:     tratamiento     ?? null,
        estado_clinico:  estado_clinico  ?? null,
        recomendaciones: recomendaciones ?? null,
        proximo_control: proximo_control ? new Date(proximo_control) : null,
        observaciones:   observaciones   ?? null,
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
    const historia = await prisma.historiaClinica.findUnique({
      where:   { id: historiaId },
      include: { paciente: { select: { consultorio_id: true } } }
    })

    if (!historia || historia.paciente.consultorio_id !== req.usuario.consultorio_id) {
      return res.status(404).json({ error: 'Historia no encontrada' })
    }

    const evoluciones = await prisma.hojaEvolucion.findMany({
      where:   { historia_id: historiaId },
      orderBy: { fecha: 'desc' }
    })
    res.json(evoluciones)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/historias/:historiaId/odontogramas
router.get('/:historiaId/odontogramas', async (req, res) => {
  const historiaId = parseInt(req.params.historiaId)

  if (isNaN(historiaId)) {
    return res.status(400).json({ error: 'ID de historia invalido' })
  }

  try {
    const historia = await obtenerHistoriaAutorizada(prisma, historiaId, req.usuario.consultorio_id)
    if (!historia) return res.status(404).json({ error: 'Historia no encontrada' })

    const odontogramas = await listarOdontogramas(prisma, historiaId)
    res.json(odontogramas)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/historias/:historiaId/odontograma/:tipo
router.get('/:historiaId/odontograma/:tipo', async (req, res) => {
  const historiaId = parseInt(req.params.historiaId)

  if (isNaN(historiaId)) {
    return res.status(400).json({ error: 'ID de historia invalido' })
  }

  try {
    const historia = await obtenerHistoriaAutorizada(prisma, historiaId, req.usuario.consultorio_id)
    if (!historia) return res.status(404).json({ error: 'Historia no encontrada' })

    const odontograma = await obtenerOdontograma(prisma, historiaId, req.params.tipo)
    if (!odontograma) return res.status(404).json({ error: 'Odontograma no encontrado' })

    res.json(odontograma)
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message })
    }
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// PUT /api/historias/:historiaId/odontograma/:tipo
router.put('/:historiaId/odontograma/:tipo', async (req, res) => {
  const historiaId = parseInt(req.params.historiaId)
  const { dientes_json, observaciones } = extraerDatosOdontograma(req.body)

  if (isNaN(historiaId)) {
    return res.status(400).json({ error: 'ID de historia invalido' })
  }

  if (!dientes_json) {
    return res.status(400).json({ error: 'dientes_json es obligatorio' })
  }

  try {
    const historia = await obtenerHistoriaAutorizada(prisma, historiaId, req.usuario.consultorio_id)
    if (!historia) return res.status(404).json({ error: 'Historia no encontrada' })

    const odontograma = await guardarOdontograma(prisma, historiaId, req.params.tipo, {
      dientes_json,
      observaciones,
    })

    res.json(odontograma)
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message })
    }
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})


// PUT /api/historias/:historiaId/evoluciones/:evolucionId
router.put('/:historiaId/evoluciones/:evolucionId', async (req, res) => {
  const historiaId  = parseInt(req.params.historiaId)
  const evolucionId = parseInt(req.params.evolucionId)

  const {
    fecha, doctor, motivo, diagnostico, procedimiento,
    piezas_tratadas, tratamiento, estado_clinico,
    recomendaciones, proximo_control, observaciones,
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
        fecha:           fecha ? new Date(fecha) : new Date(),
        doctor:          doctor          ?? null,
        motivo:          motivo          ?? null,
        diagnostico:     diagnostico     ?? null,
        procedimiento,
        piezas_tratadas: piezas_tratadas ?? null,
        tratamiento:     tratamiento     ?? null,
        estado_clinico:  estado_clinico  ?? null,
        recomendaciones: recomendaciones ?? null,
        proximo_control: proximo_control ? new Date(proximo_control) : null,
        observaciones:   observaciones   ?? null,
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
  const historiaId  = parseInt(req.params.historiaId)
  const evolucionId = parseInt(req.params.evolucionId)

  if (isNaN(historiaId) || isNaN(evolucionId)) {
    return res.status(400).json({ error: 'ID inválido' })
  }

  try {
    const evolucion = await prisma.hojaEvolucion.findUnique({ where: { id: evolucionId } })

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
      where:   { historia_id: historiaId },
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
  const { nombre, nombre_archivo, tipo, mime_type, tamano_bytes, contenido_base64, url } = req.body

  if (isNaN(historiaId)) {
    return res.status(400).json({ error: 'ID de historia inválido' })
  }

  if (!nombre_archivo && !nombre) {
    return res.status(400).json({ error: 'El nombre del archivo es obligatorio' })
  }

  try {
    const historia = await prisma.historiaClinica.findUnique({ where: { id: historiaId } })
    if (!historia) return res.status(404).json({ error: 'Historia no encontrada' })

    const adjunto = await prisma.hcAdjunto.create({
      data: {
        historia_id:      historiaId,
        nombre_archivo:   nombre_archivo ?? nombre,
        tipo:             tipo           ?? null,
        mime_type:        mime_type      ?? null,
        tamano_bytes:     tamano_bytes   ? Number(tamano_bytes) : null,
        contenido_base64: contenido_base64 ?? null,
        url:              url            ?? null,
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
  const adjuntoId  = parseInt(req.params.adjuntoId)

  if (isNaN(historiaId) || isNaN(adjuntoId)) {
    return res.status(400).json({ error: 'ID inválido' })
  }

  try {
    const adjunto = await prisma.hcAdjunto.findUnique({ where: { id: adjuntoId } })

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
const generarHistoriaPDF = require('../pdf/generators/generarHistoriaPDF');

router.get('/:id/pdf', async (req, res) => {
  const id = parseInt(req.params.id)
  try {
    const historia = await prisma.historiaClinica.findUnique({
      where: { id },
      include: {
        paciente: true,
        antecedentes: true,
        examen: true,
        odontogramas: true,
        evoluciones: { orderBy: { fecha: 'desc' } },
      }
    })

    if (!historia) return res.status(404).json({ error: 'Historia no encontrada' })

    if (historia.paciente.consultorio_id !== req.usuario.consultorio_id) {
      return res.status(403).json({ error: 'No autorizado' })
    }

    const pdf = await generarHistoriaPDF({
      ...historia,
      odontogramas: ordenarOdontogramas(historia.odontogramas),
    }, req.usuario.consultorio_id)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename=historia-${id}.pdf`)
    res.send(pdf)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error generando PDF' })
  }
})
module.exports = router
