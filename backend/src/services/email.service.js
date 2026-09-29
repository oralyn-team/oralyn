const { Resend } = require('resend')

const resendApiKey = process.env.RESEND_API_KEY
const resend = resendApiKey ? new Resend(resendApiKey) : null

/**
 * Formatea una fecha y hora en formato legible en español.
 */
function formatearFechaHora(fechaHora) {
  if (!fechaHora) return { fecha: '', hora: '' }
  const d = new Date(fechaHora)
  if (isNaN(d.getTime())) return { fecha: String(fechaHora), hora: '' }

  try {
    const opcionesFecha = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Bogota' }
    const opcionesHora = { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Bogota' }

    let fechaStr = d.toLocaleDateString('es-CO', opcionesFecha)
    if (fechaStr) {
      fechaStr = fechaStr.charAt(0).toUpperCase() + fechaStr.slice(1)
    }
    const horaStr = d.toLocaleTimeString('es-CO', opcionesHora)

    return { fecha: fechaStr, hora: horaStr }
  } catch (err) {
    // Fallback si ocurre algún problema con locale/timezone
    const iso = d.toISOString()
    return { fecha: iso.split('T')[0], hora: iso.split('T')[1]?.slice(0, 5) || '' }
  }
}

/**
 * Envía un correo transaccional para restablecimiento de contraseña.
 * Si no está configurada la variable RESEND_API_KEY (entorno local de desarrollo),
 * registra el enlace en consola para facilitar pruebas sin bloquear la ejecución.
 */
async function enviarCorreoRecuperacion(email, nombre, link) {
  const emailFrom = process.env.EMAIL_FROM || 'Oralyn <no-reply@oralyn.app>'

  if (!resend) {
    console.log('\n==================================================')
    console.log('[DESARROLLO LOCAL] Simulación de correo de recuperación:')
    console.log(`Para: ${email} (${nombre})`)
    console.log(`Enlace de recuperación: ${link}`)
    console.log('==================================================\n')
    return { id: 'dev-simulated-email' }
  }

  try {
    const data = await resend.emails.send({
      from: emailFrom,
      to: email,
      subject: 'Recupera tu contraseña - Oralyn',
      html: `
        <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #0f766e; margin-top: 0; margin-bottom: 16px;">Restablecimiento de Contraseña</h2>
          <p style="color: #334155; font-size: 15px; line-height: 1.5;">Hola <strong>${nombre}</strong>,</p>
          <p style="color: #334155; font-size: 15px; line-height: 1.5;">Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>Oralyn</strong>.</p>
          <p style="color: #334155; font-size: 15px; line-height: 1.5;">Haz clic en el siguiente botón para continuar. Este enlace expirará en 30 minutos:</p>
          <div style="margin: 24px 0;">
            <a href="${link}" style="background-color: #0f766e; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Restablecer contraseña
            </a>
          </div>
          <p style="font-size: 13px; color: #64748b;">Si no puedes hacer clic en el botón, copia y pega el siguiente enlace en tu navegador:</p>
          <p style="font-size: 12px; color: #0f766e; word-break: break-all;">${link}</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura.</p>
        </div>
      `
    })
    return data
  } catch (error) {
    console.error('Error enviando correo de recuperación con Resend:', error)
    throw error
  }
}

/**
 * Envía correo de confirmación de cita programada.
 */
async function enviarConfirmacionCita({ email, nombrePaciente, fechaHora, nombreConsultorio, profesional, direccionConsultorio, telefonoConsultorio }) {
  const emailFrom = process.env.EMAIL_FROM || 'Oralyn <no-reply@oralyn.app>'
  const { fecha, hora } = formatearFechaHora(fechaHora)
  const consultorioNombre = nombreConsultorio || 'Oralyn Consultorio Odontológico'

  if (!resend) {
    console.log('\n==================================================')
    console.log('[DESARROLLO LOCAL] Simulación de correo de CONFIRMACIÓN DE CITA:')
    console.log(`Para: ${email} (${nombrePaciente})`)
    console.log(`Consultorio: ${consultorioNombre}`)
    console.log(`Fecha: ${fecha} | Hora: ${hora}`)
    if (profesional) console.log(`Profesional: ${profesional}`)
    console.log('==================================================\n')
    return { id: 'dev-simulated-email' }
  }

  try {
    const data = await resend.emails.send({
      from: emailFrom,
      to: email,
      subject: `Confirmación de cita programada - ${consultorioNombre}`,
      html: `
        <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #0f766e; font-size: 22px; margin: 0; font-weight: 700;">${consultorioNombre}</h1>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Confirmación de Cita Odontológica</p>
          </div>

          <p style="color: #334155; font-size: 15px; line-height: 1.5;">Hola <strong>${nombrePaciente}</strong>,</p>
          <p style="color: #334155; font-size: 15px; line-height: 1.5;">Tu cita odontológica ha sido programada exitosamente. A continuación encuentras los detalles de la consulta:</p>

          <div style="background-color: #f0fdf4; border-left: 4px solid #0f766e; padding: 16px 20px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 6px 0; color: #1e293b; font-size: 14px;"><strong>📅 Fecha:</strong> ${fecha}</p>
            <p style="margin: 6px 0; color: #1e293b; font-size: 14px;"><strong>⏰ Hora:</strong> ${hora}</p>
            ${profesional ? `<p style="margin: 6px 0; color: #1e293b; font-size: 14px;"><strong>👨‍⚕️ Profesional:</strong> ${profesional}</p>` : ''}
            <p style="margin: 6px 0; color: #1e293b; font-size: 14px;"><strong>📍 Consultorio:</strong> ${consultorioNombre}</p>
            ${direccionConsultorio ? `<p style="margin: 6px 0; color: #1e293b; font-size: 14px;"><strong>🏢 Dirección:</strong> ${direccionConsultorio}</p>` : ''}
            ${telefonoConsultorio ? `<p style="margin: 6px 0; color: #1e293b; font-size: 14px;"><strong>📞 Teléfono:</strong> ${telefonoConsultorio}</p>` : ''}
          </div>

          <p style="color: #334155; font-size: 14px; line-height: 1.5;">Te recomendamos llegar 10 minutos antes de la hora estipulada. ¡Te esperamos!</p>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
            Oralyn — Sistema de Gestión Odontológica. Por favor no respondas a este mensaje automático.
          </p>
        </div>
      `
    })
    return data
  } catch (error) {
    console.error('Error enviando correo de confirmación de cita con Resend:', error)
    throw error
  }
}

/**
 * Envía correo de recordatorio de cita (aproximadamente 24h antes).
 */
async function enviarRecordatorioCita({ email, nombrePaciente, fechaHora, nombreConsultorio, profesional, direccionConsultorio, telefonoConsultorio }) {
  const emailFrom = process.env.EMAIL_FROM || 'Oralyn <no-reply@oralyn.app>'
  const { fecha, hora } = formatearFechaHora(fechaHora)
  const consultorioNombre = nombreConsultorio || 'Oralyn Consultorio Odontológico'

  if (!resend) {
    console.log('\n==================================================')
    console.log('[DESARROLLO LOCAL] Simulación de correo de RECORDATORIO DE CITA:')
    console.log(`Para: ${email} (${nombrePaciente})`)
    console.log(`Consultorio: ${consultorioNombre}`)
    console.log(`Fecha: ${fecha} | Hora: ${hora}`)
    if (profesional) console.log(`Profesional: ${profesional}`)
    console.log('==================================================\n')
    return { id: 'dev-simulated-email' }
  }

  try {
    const data = await resend.emails.send({
      from: emailFrom,
      to: email,
      subject: `Recordatorio de cita odontológica - ${consultorioNombre}`,
      html: `
        <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #0f766e; font-size: 22px; margin: 0; font-weight: 700;">${consultorioNombre}</h1>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Recordatorio de Cita Próxima</p>
          </div>

          <p style="color: #334155; font-size: 15px; line-height: 1.5;">Hola <strong>${nombrePaciente}</strong>,</p>
          <p style="color: #334155; font-size: 15px; line-height: 1.5;">Te recordamos que tienes una cita odontológica programada para las próximas 24 horas:</p>

          <div style="background-color: #f0fdf4; border-left: 4px solid #0f766e; padding: 16px 20px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 6px 0; color: #1e293b; font-size: 14px;"><strong>📅 Fecha:</strong> ${fecha}</p>
            <p style="margin: 6px 0; color: #1e293b; font-size: 14px;"><strong>⏰ Hora:</strong> ${hora}</p>
            ${profesional ? `<p style="margin: 6px 0; color: #1e293b; font-size: 14px;"><strong>👨‍⚕️ Profesional:</strong> ${profesional}</p>` : ''}
            <p style="margin: 6px 0; color: #1e293b; font-size: 14px;"><strong>📍 Consultorio:</strong> ${consultorioNombre}</p>
            ${direccionConsultorio ? `<p style="margin: 6px 0; color: #1e293b; font-size: 14px;"><strong>🏢 Dirección:</strong> ${direccionConsultorio}</p>` : ''}
            ${telefonoConsultorio ? `<p style="margin: 6px 0; color: #1e293b; font-size: 14px;"><strong>📞 Teléfono:</strong> ${telefonoConsultorio}</p>` : ''}
          </div>

          <p style="color: #334155; font-size: 14px; line-height: 1.5;">Por favor procura llegar puntualmente. Si necesitas reprogramar tu cita, comunícate a la brevedad con el consultorio.</p>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
            Oralyn — Sistema de Gestión Odontológica. Por favor no respondas a este mensaje automático.
          </p>
        </div>
      `
    })
    return data
  } catch (error) {
    console.error('Error enviando correo de recordatorio de cita con Resend:', error)
    throw error
  }
}

module.exports = {
  enviarCorreoRecuperacion,
  enviarConfirmacionCita,
  enviarRecordatorioCita
}
