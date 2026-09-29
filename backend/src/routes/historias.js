const express = require('express')
const prisma = require('../lib/prisma')
const verificarToken = require('../middlewares/auth')
const { requirePermission, restrictSuperadminClinicalAccess } = require('../middlewares/rbac')
const { PERMISSIONS } = require('../lib/permissions')
const { registrarAuditoria, calcularDiferencias } = require('../services/audit.service')
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

// anulada_por es un id sin relación Prisma con Usuario: los nombres se resuelven con una sola
// consulta para todas las evoluciones a devolver, limitada al consultorio del usuario.
async function adjuntarNombreAnulador(evoluciones, consultorioId) {
  const ids = [...new Set(evoluciones.map((e) => e.anulada_por).filter((id) => id != null))]
  if (ids.length === 0) return evoluciones.map((e) => ({ ...e, anulada_por_nombre: null }))

  const usuarios = await prisma.usuario.findMany({
    where:  { id: { in: ids }, consultorio_id: consultorioId },
    select: { id: true, nombre: true },
  })
  const nombres = new Map(usuarios.map((u) => [u.id, u.nombre]))
  return evoluciones.map((e) => ({ ...e, anulada_por_nombre: nombres.get(e.anulada_por) ?? null }))
}

const router = express.Router()
router.use(verificarToken)
router.use(restrictSuperadminClinicalAccess) // Restringe al SUPERADMIN de acceder a historias clínicas

// POST /api/historias/:pacienteId — Crear nueva historia clínica
router.post('/:pacienteId', requirePermission(PERMISSIONS.CLINICAL_RECORDS_CREATE), async (req, res) => {
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
    profesional_id,
  } = req.body

  const trimmedMotivo = motivo_consulta ? String(motivo_consulta).trim() : ''
  const trimmedDx = diagnostico ? String(diagnostico).trim() : ''

  if (!trimmedMotivo || !trimmedDx) {
    return res.status(400).json({ error: 'Motivo de consulta y diagnóstico son obligatorios' })
  }

  try {
    const paciente = await prisma.paciente.findFirst({
      where: { id: pacienteId, consultorio_id: req.usuario.consultorio_id, activo: true }
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
          profesional_id: profesional_id ? Number(profesional_id) : null,
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

    registrarAuditoria({
      req,
      accion: 'CREAR_HISTORIA_CLINICA',
      modulo: 'Historia Clínica',
      recurso_id: historia.id,
      detalles: `Historia clínica creada para el paciente #${pacienteId}`,
      metadata: { motivo_consulta, diagnostico }
    })

    res.status(201).json(historia)
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message })
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/historias/:pacienteId — listar historias de un paciente
router.get('/:pacienteId', requirePermission(PERMISSIONS.CLINICAL_RECORDS_READ), async (req, res) => {
  const pacienteId = parseInt(req.params.pacienteId)
  try {
    const paciente = await prisma.paciente.findFirst({
      where: { id: pacienteId, consultorio_id: req.usuario.consultorio_id, activo: true }
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
        version: true,
      }
    })

    res.json(historias)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/historias/detalle/:id — ver historia completa con relaciones
router.get('/detalle/:id', requirePermission(PERMISSIONS.CLINICAL_RECORDS_READ), async (req, res) => {
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

    registrarAuditoria({
      req,
      accion: 'CONSULTAR_HISTORIA_CLINICA',
      modulo: 'Historia Clínica',
      recurso_id: historia.id,
      detalles: `Consulta de detalle de historia clínica #${historia.id} del paciente #${historia.paciente_id}`
    })

    res.json({
      ...historia,
      odontogramas: ordenarOdontogramas(historia.odontogramas),
      evoluciones: await adjuntarNombreAnulador(historia.evoluciones, req.usuario.consultorio_id),
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// PUT /api/historias/:id — editar historia completa
router.put('/:id', requirePermission(PERMISSIONS.CLINICAL_RECORDS_UPDATE), async (req, res) => {
  const id = parseInt(req.params.id)
  const { antecedentes, examen, version, ...datos } = req.body

  // Control de concurrencia optimista: el cliente debe enviar la versión que cargó, como número JSON.
  // Sin versión no se puede detectar si otro usuario guardó antes, así que se rechaza.
  // Estricto: no se aceptan strings ("3"), booleanos ni valores convertibles.
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return res.status(400).json({
      error: 'VERSION_REQUERIDA',
      mensaje: 'Falta la versión de la historia clínica. Recarga la página e intenta de nuevo.'
    })
  }

  try {
    const historiaExistente = await prisma.historiaClinica.findUnique({
      where: { id },
      include: { paciente: { select: { consultorio_id: true } } }
    })

    if (!historiaExistente) {
      return res.status(404).json({ error: 'Historia clínica no encontrada' })
    }

    if (historiaExistente.paciente.consultorio_id !== req.usuario.consultorio_id) {
      return res.status(403).json({ error: 'No autorizado' })
    }

    const historia = await prisma.$transaction(async (tx) => {
      // Solo actualiza si la versión en BD sigue siendo la que el cliente cargó (comprobación atómica)
      const { count } = await tx.historiaClinica.updateMany({
        where: { id, version },
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
          // Sin `?? null`: un campo ausente del body (undefined) no se toca, igual que los de arriba.
          // Un null explícito sí se guarda como null.
          departamento:               datos.departamento,
          estado_civil:               datos.estado_civil,
          direccion:                  datos.direccion,
          ocupacion:                  datos.ocupacion,
          acudiente:                  datos.acudiente,
          parentesco:                 datos.parentesco,
          eps:                        datos.eps,
          tipo_afiliacion:            datos.tipo_afiliacion,
          tipo_sangre:                datos.tipo_sangre,
          rh:                         datos.rh,
          alergias:                   datos.alergias,
          profesional_id:             datos.profesional_id !== undefined ? (datos.profesional_id ? Number(datos.profesional_id) : null) : undefined,
          version:                    { increment: 1 },
        }
      })

      // Nadie coincidió: otro usuario guardó antes (la versión cambió). Lanzar aborta la transacción,
      // así que los upserts de antecedentes/examen de abajo no se ejecutan.
      if (count === 0) {
        const conflicto = new Error('CONFLICTO_VERSION')
        conflicto.conflictoVersion = true
        throw conflicto
      }

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

      // updateMany no devuelve la fila: se relee dentro de la misma transacción (ya con la versión nueva)
      return tx.historiaClinica.findUnique({ where: { id } })
    })

    const diferencias = calcularDiferencias(historiaExistente, historia, [
      'motivo_consulta', 'diagnostico', 'tratamiento_realizado', 'observaciones', 'recomendaciones'
    ])

    registrarAuditoria({
      req,
      accion: 'ACTUALIZAR_HISTORIA_CLINICA',
      modulo: 'Historia Clínica',
      recurso_id: historia.id,
      detalles: `Modificación de la historia clínica #${historia.id}`,
      metadata: { cambios: diferencias }
    })

    res.json(historia)
  } catch (error) {
    if (error.conflictoVersion) {
      return res.status(409).json({
        error: 'CONFLICTO_VERSION',
        mensaje: 'Otro usuario guardó cambios en esta historia. Recarga para ver los cambios más recientes.'
      })
    }
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message })
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// POST /api/historias/:historiaId/evoluciones
router.post('/:historiaId/evoluciones', requirePermission(PERMISSIONS.CLINICAL_RECORDS_UPDATE), async (req, res) => {
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
    profesional_id,
  } = req.body

  if (!procedimiento) {
    return res.status(400).json({ error: 'El procedimiento es obligatorio' })
  }

  try {
    const historia = await prisma.historiaClinica.findUnique({
      where: { id: historiaId },
      include: { paciente: { select: { consultorio_id: true } } }
    })
    if (!historia) return res.status(404).json({ error: 'Historia no encontrada' })
    if (historia.paciente.consultorio_id !== req.usuario.consultorio_id) {
      return res.status(403).json({ error: 'No autorizado' })
    }

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
        profesional_id:   profesional_id  ? Number(profesional_id) : null,
        creado_en:       new Date(),
        creado_por:      req.usuario.id,
      }
    })

    registrarAuditoria({
      req,
      accion: 'CREAR_EVOLUCION',
      modulo: 'Historia Clínica',
      recurso_id: evolucion.id,
      detalles: `Evolución agregada a la historia #${historiaId}: ${procedimiento}`
    })

    res.status(201).json(evolucion)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/historias/:historiaId/evoluciones
router.get('/:historiaId/evoluciones', requirePermission(PERMISSIONS.CLINICAL_RECORDS_READ), async (req, res) => {
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
    res.json(await adjuntarNombreAnulador(evoluciones, req.usuario.consultorio_id))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/historias/:historiaId/odontogramas
router.get('/:historiaId/odontogramas', requirePermission(PERMISSIONS.ODONTOGRAM_READ), async (req, res) => {
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
router.get('/:historiaId/odontograma/:tipo', requirePermission(PERMISSIONS.ODONTOGRAM_READ), async (req, res) => {
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
router.put('/:historiaId/odontograma/:tipo', requirePermission(PERMISSIONS.ODONTOGRAM_UPDATE), async (req, res) => {
  const historiaId = parseInt(req.params.historiaId)
  const { dientes_json, observaciones } = extraerDatosOdontograma(req.body)

  if (isNaN(historiaId)) {
    return res.status(400).json({ error: 'ID de historia invalido' })
  }

  if (!dientes_json) {
    return res.status(400).json({ error: 'dientes_json es obligatorio' })
  }

  // Control de concurrencia optimista: `version` es la de la fila que cargó el cliente.
  // Primer guardado de ese tipo (la fila no existe): el cliente DEBE enviar version: 0.
  // Omitirla no es válido (anularía la protección), igual que en PUT /historias/:id.
  // Estricto: debe ser un número JSON entero; no se aceptan strings ("0"), booleanos ni null.
  const { version } = req.body
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 0) {
    return res.status(400).json({
      error: 'VERSION_REQUERIDA',
      mensaje: 'Falta la versión del odontograma (usa 0 si aún no existe). Recarga la página e intenta de nuevo.'
    })
  }

  try {
    const historia = await obtenerHistoriaAutorizada(prisma, historiaId, req.usuario.consultorio_id)
    if (!historia) return res.status(404).json({ error: 'Historia no encontrada' })

    const odontograma = await guardarOdontograma(prisma, historiaId, req.params.tipo, {
      dientes_json,
      observaciones,
    }, version)

    registrarAuditoria({
      req,
      accion: 'ACTUALIZAR_ODONTOGRAMA',
      modulo: 'Odontograma',
      recurso_id: odontograma.id,
      detalles: `Odontograma de tipo ${req.params.tipo} actualizado para la historia #${historiaId}`
    })

    res.json(odontograma)
  } catch (error) {
    if (error.conflictoVersion) {
      return res.status(409).json({
        error: 'CONFLICTO_VERSION',
        mensaje: 'Otro usuario guardó cambios en este odontograma. Recarga para ver los cambios más recientes.'
      })
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message })
    }
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// Campos clínicos de una evolución que se auditan al editarla
const CAMPOS_CLINICOS_EVOLUCION = [
  'fecha', 'doctor', 'profesional_id', 'motivo', 'diagnostico', 'procedimiento',
  'piezas_tratadas', 'tratamiento', 'estado_clinico', 'recomendaciones',
  'proximo_control', 'observaciones',
]

// Misma regla que la versión de la historia: número JSON entero ≥ 1, sin conversiones
function versionValida(version) {
  return typeof version === 'number' && Number.isInteger(version) && version >= 1
}

// undefined = no tocar; null o '' = borrar; cualquier otro valor se convierte a Date
function fechaOpcional(valor) {
  if (valor === undefined) return undefined
  if (valor === null || valor === '') return null
  return new Date(valor)
}

// Carga la evolución y comprueba consultorio y pertenencia a la historia.
// Devuelve { evolucion } o { status, error } para responder tal cual.
async function obtenerEvolucionAutorizada(evolucionId, historiaId, consultorioId) {
  const evolucion = await prisma.hojaEvolucion.findUnique({
    where: { id: evolucionId },
    include: { historia: { include: { paciente: true } } }
  })
  if (!evolucion) return { status: 404, error: 'Evolución no encontrada' }
  if (evolucion.historia.paciente.consultorio_id !== consultorioId) {
    return { status: 403, error: 'No autorizado' }
  }
  if (evolucion.historia_id !== historiaId) {
    return { status: 400, error: 'La evolución no pertenece a esta historia' }
  }
  return { evolucion }
}

// updateMany no coincidió: se relee para distinguir borrada, anulada o versión desfasada
async function responderSinCoincidencia(res, evolucionId) {
  const actual = await prisma.hojaEvolucion.findUnique({ where: { id: evolucionId } })
  if (!actual) return res.status(404).json({ error: 'Evolución no encontrada' })
  if (actual.anulada) {
    return res.status(409).json({
      error: 'EVOLUCION_ANULADA',
      mensaje: 'Esta evolución está anulada y ya no se puede modificar.'
    })
  }
  return res.status(409).json({
    error: 'CONFLICTO_VERSION',
    mensaje: 'Otro usuario guardó cambios en esta evolución. Recarga para ver los cambios más recientes.'
  })
}

// PUT /api/historias/:historiaId/evoluciones/:evolucionId
router.put('/:historiaId/evoluciones/:evolucionId', requirePermission(PERMISSIONS.CLINICAL_RECORDS_UPDATE), async (req, res) => {
  const historiaId  = parseInt(req.params.historiaId)
  const evolucionId = parseInt(req.params.evolucionId)

  const {
    fecha, doctor, motivo, diagnostico, procedimiento,
    piezas_tratadas, tratamiento, estado_clinico,
    recomendaciones, proximo_control, observaciones,
    profesional_id, version,
  } = req.body

  if (isNaN(historiaId) || isNaN(evolucionId)) {
    return res.status(400).json({ error: 'ID inválido' })
  }

  if (!versionValida(version)) {
    return res.status(400).json({
      error: 'VERSION_REQUERIDA',
      mensaje: 'Falta la versión de la evolución. Recarga la página e intenta de nuevo.'
    })
  }

  if (!procedimiento) {
    return res.status(400).json({ error: 'El procedimiento es obligatorio' })
  }

  // La columna fecha es obligatoria: se puede omitir (no se toca), pero no vaciar
  if (fecha === null || fecha === '') {
    return res.status(400).json({ error: 'La fecha de la evolución no puede quedar vacía' })
  }

  try {
    const { evolucion: existente, status, error } = await obtenerEvolucionAutorizada(evolucionId, historiaId, req.usuario.consultorio_id)
    if (!existente) return res.status(status).json({ error })

    // Sin `?? null`: un campo ausente (undefined) no se toca; un null explícito sí se guarda como null
    const { count } = await prisma.hojaEvolucion.updateMany({
      where: { id: evolucionId, historia_id: historiaId, version, anulada: false },
      data: {
        fecha:           fechaOpcional(fecha),
        doctor,
        motivo,
        diagnostico,
        procedimiento,
        piezas_tratadas,
        tratamiento,
        estado_clinico,
        recomendaciones,
        proximo_control: fechaOpcional(proximo_control),
        observaciones,
        profesional_id:  profesional_id !== undefined ? (profesional_id ? Number(profesional_id) : null) : undefined,
        version:         { increment: 1 },
      }
    })

    if (count === 0) return responderSinCoincidencia(res, evolucionId)

    // updateMany no devuelve la fila: se relee ya con la versión nueva
    const evolucion = await prisma.hojaEvolucion.findUnique({ where: { id: evolucionId } })

    registrarAuditoria({
      req,
      accion: 'ACTUALIZAR_EVOLUCION',
      modulo: 'Historia Clínica',
      recurso_id: evolucion.id,
      detalles: `Evolución #${evolucionId} actualizada`,
      metadata: { cambios: calcularDiferencias(existente, evolucion, CAMPOS_CLINICOS_EVOLUCION) }
    })

    res.json(evolucion)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// PATCH /api/historias/:historiaId/evoluciones/:evolucionId/anular
// Las evoluciones no se borran: se marcan como anuladas y siguen visibles en las lecturas.
router.patch('/:historiaId/evoluciones/:evolucionId/anular', requirePermission(PERMISSIONS.CLINICAL_RECORDS_UPDATE), async (req, res) => {
  const historiaId  = parseInt(req.params.historiaId)
  const evolucionId = parseInt(req.params.evolucionId)
  const { motivo, version } = req.body

  if (isNaN(historiaId) || isNaN(evolucionId)) {
    return res.status(400).json({ error: 'ID inválido' })
  }

  const motivoLimpio = typeof motivo === 'string' ? motivo.trim() : ''
  if (!motivoLimpio) {
    return res.status(400).json({
      error: 'MOTIVO_REQUERIDO',
      mensaje: 'Indica el motivo de la anulación.'
    })
  }

  if (!versionValida(version)) {
    return res.status(400).json({
      error: 'VERSION_REQUERIDA',
      mensaje: 'Falta la versión de la evolución. Recarga la página e intenta de nuevo.'
    })
  }

  try {
    const { evolucion: existente, status, error } = await obtenerEvolucionAutorizada(evolucionId, historiaId, req.usuario.consultorio_id)
    if (!existente) return res.status(status).json({ error })

    const { count } = await prisma.hojaEvolucion.updateMany({
      where: { id: evolucionId, historia_id: historiaId, version, anulada: false },
      data: {
        anulada:          true,
        anulada_en:       new Date(),
        anulada_por:      req.usuario.id,
        motivo_anulacion: motivoLimpio,
        version:          { increment: 1 },
      }
    })

    if (count === 0) return responderSinCoincidencia(res, evolucionId)

    const fila = await prisma.hojaEvolucion.findUnique({ where: { id: evolucionId } })
    const [evolucion] = await adjuntarNombreAnulador([fila], req.usuario.consultorio_id)

    registrarAuditoria({
      req,
      accion: 'ANULAR_EVOLUCION',
      modulo: 'Historia Clínica',
      recurso_id: evolucionId,
      detalles: `Evolución #${evolucionId} anulada en la historia #${historiaId}: ${motivoLimpio}`,
      metadata: { motivo: motivoLimpio }
    })

    res.json(evolucion)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// DELETE /api/historias/:historiaId/evoluciones/:evolucionId
// Deshabilitado: una evolución es parte del registro clínico y no se elimina (ver PATCH .../anular)
router.delete('/:historiaId/evoluciones/:evolucionId', requirePermission(PERMISSIONS.CLINICAL_RECORDS_UPDATE), (req, res) => {
  res.status(405).json({
    error: 'METODO_NO_PERMITIDO',
    mensaje: 'Las evoluciones no se eliminan; usa la anulación.'
  })
})

// GET /api/historias/:historiaId/adjuntos
router.get('/:historiaId/adjuntos', requirePermission(PERMISSIONS.ATTACHMENTS_READ), async (req, res) => {
  const historiaId = parseInt(req.params.historiaId)

  if (isNaN(historiaId)) {
    return res.status(400).json({ error: 'ID de historia inválido' })
  }

  try {
    const historia = await prisma.historiaClinica.findUnique({
      where: { id: historiaId },
      include: { paciente: true }
    })
    if (!historia) return res.status(404).json({ error: 'Historia no encontrada' })
    if (historia.paciente.consultorio_id !== req.usuario.consultorio_id) {
      return res.status(403).json({ error: 'No autorizado' })
    }

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
router.post('/:historiaId/adjuntos', requirePermission(PERMISSIONS.ATTACHMENTS_CREATE), async (req, res) => {
  const historiaId = parseInt(req.params.historiaId)
  const { nombre, nombre_archivo, tipo, mime_type, tamano_bytes, contenido_base64, url } = req.body

  if (isNaN(historiaId)) {
    return res.status(400).json({ error: 'ID de historia inválido' })
  }

  if (!nombre_archivo && !nombre) {
    return res.status(400).json({ error: 'El nombre del archivo es obligatorio' })
  }

  try {
    const historia = await prisma.historiaClinica.findUnique({
      where: { id: historiaId },
      include: { paciente: true }
    })
    if (!historia) return res.status(404).json({ error: 'Historia no encontrada' })
    if (historia.paciente.consultorio_id !== req.usuario.consultorio_id) {
      return res.status(403).json({ error: 'No autorizado' })
    }

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

    registrarAuditoria({
      req,
      accion: 'AGREGAR_ADJUNTO',
      modulo: 'Adjuntos',
      recurso_id: adjunto.id,
      detalles: `Adjunto ${adjunto.nombre_archivo} agregado a la historia #${historiaId}`
    })

    res.status(201).json(adjunto)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// DELETE /api/historias/:historiaId/adjuntos/:adjuntoId
router.delete('/:historiaId/adjuntos/:adjuntoId', requirePermission(PERMISSIONS.ATTACHMENTS_CREATE), async (req, res) => {
  const historiaId = parseInt(req.params.historiaId)
  const adjuntoId  = parseInt(req.params.adjuntoId)

  if (isNaN(historiaId) || isNaN(adjuntoId)) {
    return res.status(400).json({ error: 'ID inválido' })
  }

  try {
    const adjunto = await prisma.hcAdjunto.findUnique({
      where: { id: adjuntoId },
      include: { historia: { include: { paciente: true } } }
    })

    if (!adjunto) {
      return res.status(404).json({ error: 'Adjunto no encontrado' })
    }

    if (adjunto.historia.paciente.consultorio_id !== req.usuario.consultorio_id) {
      return res.status(403).json({ error: 'No autorizado' })
    }

    if (adjunto.historia_id !== historiaId) {
      return res.status(400).json({ error: 'El adjunto no pertenece a esta historia' })
    }

    await prisma.hcAdjunto.delete({ where: { id: adjuntoId } })

    registrarAuditoria({
      req,
      accion: 'ELIMINAR_ADJUNTO',
      modulo: 'Adjuntos',
      recurso_id: adjuntoId,
      detalles: `Adjunto #${adjuntoId} eliminado de la historia #${historiaId}`
    })

    res.status(204).send()
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

const generarHistoriaPDF = require('../pdf/generators/generarHistoriaPDF');

router.get('/:id/pdf', requirePermission(PERMISSIONS.CLINICAL_RECORDS_READ), async (req, res) => {
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
        profesional: true,
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
