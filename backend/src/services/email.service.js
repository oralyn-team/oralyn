const { Resend } = require('resend')

const resendApiKey = process.env.RESEND_API_KEY
const resend = resendApiKey ? new Resend(resendApiKey) : null

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
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded-xl: 12px;">
          <h2 style="color: #0f766e; margin-bottom: 16px;">Restablecimiento de Contraseña</h2>
          <p>Hola <strong>${nombre}</strong>,</p>
          <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>Oralyn</strong>.</p>
          <p>Haz clic en el siguiente botón para continuar. Este enlace expirará en 30 minutos:</p>
          <div style="margin: 24px 0;">
            <a href="${link}" style="background-color: #0f766e; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Restablecer contraseña
            </a>
          </div>
          <p style="font-size: 13px; color: #64748b;">Si no puedes hacer clic en el botón, copia y pega el siguiente enlace en tu navegador:</p>
          <p style="font-size: 12px; color: #0f766e; word-break: break-all;">${link}</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura.</p>
        </div>
      `
    })
    return data
  } catch (error) {
    console.error('Error enviando correo de recuperación con Resend:', error)
    throw error
  }
}

module.exports = {
  enviarCorreoRecuperacion
}
