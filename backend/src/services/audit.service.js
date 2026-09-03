const prisma = require('../lib/prisma')

/**
 * Registra una acción en la tabla inmutable de auditoría.
 * Se ejecuta de forma asíncrona sin bloquear la petición principal.
 */
async function registrarAuditoria({
  req,
  usuario_id,
  usuario_nombre,
  usuario_rol,
  consultorio_id,
  accion,
  modulo,
  recurso_id,
  detalles,
  estado = 'EXITOSO',
  metadata = null
}) {
  try {
    const uid = usuario_id ?? req?.usuario?.id
    const unombre = usuario_nombre ?? req?.usuario?.nombre
    const urol = usuario_rol ?? req?.usuario?.rol
    const cid = consultorio_id ?? req?.usuario?.consultorio_id

    const ip_address = req
      ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip)
      : null
    const user_agent = req ? req.headers['user-agent'] : null

    await prisma.auditoria.create({
      data: {
        usuario_id: uid ? Number(uid) : null,
        usuario_nombre: unombre || null,
        usuario_rol: urol ? String(urol) : null,
        consultorio_id: cid ? Number(cid) : null,
        accion,
        modulo,
        recurso_id: recurso_id ? String(recurso_id) : null,
        detalles: detalles || null,
        estado,
        ip_address,
        user_agent,
        metadata: metadata || null
      }
    })
  } catch (error) {
    console.error('Error al registrar auditoría:', error)
  }
}

/**
 * Helper para calcular diferencias Anteriores vs Nuevos entre dos objetos
 */
function calcularDiferencias(antiguo = {}, nuevo = {}, camposInteres = []) {
  const diferencias = []
  const llaves = camposInteres.length > 0 ? camposInteres : Object.keys(nuevo)

  for (const key of llaves) {
    if (antiguo[key] !== undefined && nuevo[key] !== undefined) {
      if (JSON.stringify(antiguo[key]) !== JSON.stringify(nuevo[key])) {
        diferencias.push({
          campo: key,
          oldValue: antiguo[key],
          newValue: nuevo[key]
        })
      }
    }
  }
  return diferencias
}

module.exports = {
  registrarAuditoria,
  calcularDiferencias
}
