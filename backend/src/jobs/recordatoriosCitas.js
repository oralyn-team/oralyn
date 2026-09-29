const { procesarRecordatoriosProximos } = require('../services/notification.service')

let timerId = null
let estaEjecutando = false

/**
 * Ejecuta el proceso de recordatorios controlando colisiones de ejecución.
 */
async function ejecutarCicloRecordatorios() {
  if (estaEjecutando) {
    return
  }
  estaEjecutando = true
  try {
    const stats = await procesarRecordatoriosProximos()
    if (stats.enviadas > 0 || stats.errores > 0) {
      console.log(`[JobRecordatorios] Citas procesadas: ${stats.procesadas} | Enviadas: ${stats.enviadas} | Omitidas: ${stats.omitidas} | Errores: ${stats.errores}`)
    }
  } catch (error) {
    console.error('[JobRecordatorios] Error en el ciclo de ejecución:', error)
  } finally {
    estaEjecutando = false
  }
}

/**
 * Inicia el temporizador periódico para enviar recordatorios de citas.
 * Intervalo por defecto: 10 minutos (600,000 ms).
 */
function iniciarJobRecordatorios(intervaloMs = 10 * 60 * 1000) {
  if (process.env.NODE_ENV === 'test') {
    return null
  }

  if (timerId) {
    return timerId
  }

  // Ejecución inicial ligera tras 15 segundos del arranque del servidor
  setTimeout(() => {
    ejecutarCicloRecordatorios()
  }, 15000)

  timerId = setInterval(() => {
    ejecutarCicloRecordatorios()
  }, intervaloMs)

  console.log('[JobRecordatorios] Servicio de recordatorios automáticos de citas iniciado.')
  return timerId
}

/**
 * Detiene el temporizador (útil para pruebas o apagar el servidor).
 */
function detenerJobRecordatorios() {
  if (timerId) {
    clearInterval(timerId)
    timerId = null
    console.log('[JobRecordatorios] Servicio de recordatorios detenido.')
  }
}

module.exports = {
  iniciarJobRecordatorios,
  detenerJobRecordatorios,
  ejecutarCicloRecordatorios
}
