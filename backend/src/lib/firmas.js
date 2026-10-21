// firmas.js - Utilidades para validar firmas y congelar (snapshot) la firma del doctor
// en documentos legales (consentimientos y certificados).

const PREFIJO_PNG = 'data:image/png;base64,'
// ~700 KB de base64 es más que suficiente para una firma dibujada en canvas
const MAX_LONGITUD_FIRMA = 700 * 1024
const BASE64_REGEX = /^[A-Za-z0-9+/]+={0,2}$/

/**
 * Valida que la firma sea un PNG en base64 (data URL) de tamaño razonable.
 * Evita URLs externas (SSRF en Puppeteer) y payloads gigantes.
 */
function esFirmaValida(firma) {
  if (typeof firma !== 'string') return false
  if (!firma.startsWith(PREFIJO_PNG)) return false
  if (firma.length > MAX_LONGITUD_FIRMA) return false
  const datos = firma.slice(PREFIJO_PNG.length)
  return datos.length > 0 && BASE64_REGEX.test(datos)
}

/**
 * Valida que el profesional pertenezca al consultorio y esté activo.
 * Devuelve el profesional o null.
 */
async function obtenerProfesionalDelConsultorio(prisma, profesionalId, consultorioId) {
  if (!profesionalId) return null
  const id = Number(profesionalId)
  if (!Number.isInteger(id) || id <= 0) return null
  return prisma.profesional.findFirst({
    where: { id, consultorio_id: consultorioId, activo: true }
  })
}

/**
 * Resuelve la firma del doctor que quedará congelada en el documento:
 * 1. firma por defecto del profesional
 * 2. firma por defecto del titular del consultorio
 */
async function resolverFirmaDoctorSnapshot(prisma, profesional, consultorioId) {
  if (profesional?.firma_default && esFirmaValida(profesional.firma_default)) {
    return profesional.firma_default
  }
  const config = await prisma.configuracion.findUnique({ where: { id: consultorioId } })
  if (config?.firma_doctor_default && esFirmaValida(config.firma_doctor_default)) {
    return config.firma_doctor_default
  }
  return null
}

module.exports = {
  esFirmaValida,
  obtenerProfesionalDelConsultorio,
  resolverFirmaDoctorSnapshot,
  MAX_LONGITUD_FIRMA
}
