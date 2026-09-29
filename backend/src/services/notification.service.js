const prisma = require('../lib/prisma')
const { enviarConfirmacionCita, enviarRecordatorioCita } = require('./email.service')

/**
 * Procesa y envía la notificación de confirmación de cita.
 * Garantiza la idempotencia mediante la tabla de notificaciones.
 * Nunca lanza excepciones para no interrumpir el flujo principal HTTP.
 */
async function enviarNotificacionConfirmacionCita(citaId, consultorioId) {
  try {
    const cita = await prisma.cita.findFirst({
      where: { id: citaId, consultorio_id: consultorioId },
      include: {
        paciente: true,
        consultorio: true,
        profesional: true
      }
    })

    if (!cita) {
      return { status: 'skipped', reason: 'Cita no encontrada' }
    }

    if (cita.estado === 'cancelada') {
      return { status: 'skipped', reason: 'Cita cancelada' }
    }

    const { paciente, consultorio, profesional } = cita

    if (!paciente || !paciente.correo || !paciente.correo.trim()) {
      return { status: 'skipped', reason: 'Paciente sin correo' }
    }

    if (paciente.notificaciones_email === false) {
      return { status: 'skipped', reason: 'Paciente tiene notificaciones por email desactivadas' }
    }

    const emailDestino = paciente.correo.trim()

    // Buscar o crear registro de notificación para controlar duplicados
    let notificacion = await prisma.notificacion.findUnique({
      where: {
        cita_id_tipo_canal: {
          cita_id: cita.id,
          tipo: 'confirmacion_cita',
          canal: 'email'
        }
      }
    })

    if (notificacion && notificacion.estado === 'enviado') {
      return { status: 'already_sent', notificacionId: notificacion.id }
    }

    if (!notificacion) {
      try {
        notificacion = await prisma.notificacion.create({
          data: {
            consultorio_id: consultorio.id,
            paciente_id: paciente.id,
            cita_id: cita.id,
            tipo: 'confirmacion_cita',
            canal: 'email',
            estado: 'pendiente'
          }
        })
      } catch (errDb) {
        // En caso de concurrencia donde se haya creado en paralelo
        notificacion = await prisma.notificacion.findUnique({
          where: {
            cita_id_tipo_canal: {
              cita_id: cita.id,
              tipo: 'confirmacion_cita',
              canal: 'email'
            }
          }
        })
      }
    }

    if (!notificacion) {
      return { status: 'error', reason: 'No se pudo crear el registro de notificación' }
    }

    // Intentar envío por correo
    try {
      const resultEmail = await enviarConfirmacionCita({
        email: emailDestino,
        nombrePaciente: `${paciente.nombres} ${paciente.primer_apellido}`,
        fechaHora: cita.fecha_hora,
        nombreConsultorio: consultorio.nombre_consultorio,
        profesional: profesional?.nombre_completo || cita.doctor || null,
        direccionConsultorio: consultorio.direccion || null,
        telefonoConsultorio: consultorio.telefono || null
      })

      const actualizada = await prisma.notificacion.update({
        where: { id: notificacion.id },
        data: {
          estado: 'enviado',
          enviado_at: new Date(),
          error: null
        }
      })

      return { status: 'enviado', notificacionId: actualizada.id, resultEmail }
    } catch (errEmail) {
      const mensajeError = errEmail.message || String(errEmail)
      await prisma.notificacion.update({
        where: { id: notificacion.id },
        data: {
          estado: 'error',
          error: mensajeError
        }
      }).catch(() => {})

      return { status: 'error', error: mensajeError, notificacionId: notificacion.id }
    }
  } catch (error) {
    console.error(`[NotificationService] Error enviando confirmación para cita #${citaId}:`, error)
    return { status: 'error', error: error.message }
  }
}

/**
 * Busca citas próximas (por defecto ~24h antes) y envía los recordatorios correspondientes.
 * Ignora citas canceladas, pacientes sin email o con notificaciones desactivadas,
 * y citas que ya cuentan con un recordatorio enviado correctamente.
 */
async function procesarRecordatoriosProximos(options = {}) {
  const ahora = options.ahora ? new Date(options.ahora) : new Date()

  // Por defecto, buscar citas cuya fecha_hora esté entre 23 y 25 horas a partir de 'ahora'
  const horasMin = options.horasMin !== undefined ? options.horasMin : 23
  const horasMax = options.horasMax !== undefined ? options.horasMax : 25

  const ventanaInicio = new Date(ahora.getTime() + horasMin * 60 * 60 * 1000)
  const ventanaFin = new Date(ahora.getTime() + horasMax * 60 * 60 * 1000)

  const stats = { procesadas: 0, enviadas: 0, omitidas: 0, errores: 0 }

  try {
    const citasProximas = await prisma.cita.findMany({
      where: {
        fecha_hora: {
          gte: ventanaInicio,
          lte: ventanaFin
        },
        estado: { not: 'cancelada' }
      },
      include: {
        paciente: true,
        consultorio: true,
        profesional: true,
        notificaciones: {
          where: {
            tipo: 'recordatorio_cita',
            canal: 'email'
          }
        }
      }
    })

    for (const cita of citasProximas) {
      stats.procesadas++

      // Verificar que la cita no siga estando cancelada en tiempo real
      if (cita.estado === 'cancelada') {
        stats.omitidas++
        continue
      }

      const { paciente, consultorio, profesional, notificaciones } = cita

      if (!paciente || !paciente.correo || !paciente.correo.trim()) {
        stats.omitidas++
        continue
      }

      if (paciente.notificaciones_email === false) {
        stats.omitidas++
        continue
      }

      // Evitar duplicados: verificar si ya existe una notificación enviada correctamente
      const notifEnviada = notificaciones.find(n => n.estado === 'enviado')
      if (notifEnviada) {
        stats.omitidas++
        continue
      }

      let notificacion = notificaciones.find(n => n.estado === 'pendiente' || n.estado === 'error')

      if (!notificacion) {
        try {
          notificacion = await prisma.notificacion.create({
            data: {
              consultorio_id: consultorio.id,
              paciente_id: paciente.id,
              cita_id: cita.id,
              tipo: 'recordatorio_cita',
              canal: 'email',
              estado: 'pendiente'
            }
          })
        } catch (errDb) {
          // Si hubo una colisión de restricción única
          notificacion = await prisma.notificacion.findUnique({
            where: {
              cita_id_tipo_canal: {
                cita_id: cita.id,
                tipo: 'recordatorio_cita',
                canal: 'email'
              }
            }
          })
        }
      }

      if (!notificacion || notificacion.estado === 'enviado') {
        stats.omitidas++
        continue
      }

      // Enviar correo de recordatorio
      try {
        await enviarRecordatorioCita({
          email: paciente.correo.trim(),
          nombrePaciente: `${paciente.nombres} ${paciente.primer_apellido}`,
          fechaHora: cita.fecha_hora,
          nombreConsultorio: consultorio.nombre_consultorio,
          profesional: profesional?.nombre_completo || cita.doctor || null,
          direccionConsultorio: consultorio.direccion || null,
          telefonoConsultorio: consultorio.telefono || null
        })

        await prisma.notificacion.update({
          where: { id: notificacion.id },
          data: {
            estado: 'enviado',
            enviado_at: new Date(),
            error: null
          }
        })

        stats.enviadas++
      } catch (errEmail) {
        const mensajeError = errEmail.message || String(errEmail)
        await prisma.notificacion.update({
          where: { id: notificacion.id },
          data: {
            estado: 'error',
            error: mensajeError
          }
        }).catch(() => {})

        stats.errores++
      }
    }

    return stats
  } catch (error) {
    console.error('[NotificationService] Error procesando recordatorios de citas:', error)
    return stats
  }
}

/**
 * Resetea o elimina el recordatorio de una cita en caso de reprogramación (cambio de fecha/hora).
 * Esto permite que cuando llegue la nueva ventana de 24h a la nueva fecha, se genere el nuevo recordatorio.
 */
async function resetearRecordatorioPorReprogramacion(citaId) {
  try {
    await prisma.notificacion.deleteMany({
      where: {
        cita_id: citaId,
        tipo: 'recordatorio_cita',
        canal: 'email'
      }
    })
  } catch (error) {
    console.error(`[NotificationService] Error reseteando recordatorio para cita #${citaId}:`, error)
  }
}

module.exports = {
  enviarNotificacionConfirmacionCita,
  procesarRecordatoriosProximos,
  resetearRecordatorioPorReprogramacion
}
