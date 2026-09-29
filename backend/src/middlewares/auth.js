const jwt = require('jsonwebtoken')
const prisma = require('../lib/prisma')
const { registrarAuditoria } = require('../services/audit.service')

const verificarToken = async (req, res, next) => {
  let token = req.cookies ? req.cookies.token : null

  // Fallback a Authorization header si no hay cookie (modo legado)
  if (!token) {
    const authHeader = req.headers['authorization']
    token = authHeader && authHeader.split(' ')[1]
  }

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)

    // Consultar el usuario en base de datos para validar existencia y token_version
    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.id }
    })

    if (!usuario) {
      registrarAuditoria({
        req,
        accion: 'TOKEN_RECHAZADO',
        modulo: 'Autenticación',
        detalles: `Token válido para un usuario inexistente (id=${payload.id}) en ${req.originalUrl}`,
        estado: 'FALLIDO'
      })
      return res.status(401).json({ error: 'Usuario no encontrado' })
    }

    if (usuario.activo === false) {
      registrarAuditoria({
        req,
        usuario_id: usuario.id,
        usuario_nombre: usuario.nombre,
        usuario_rol: usuario.rol,
        consultorio_id: usuario.consultorio_id,
        accion: 'TOKEN_RECHAZADO',
        modulo: 'Autenticación',
        detalles: `Intento de acceso con cuenta desactivada en ${req.originalUrl}`,
        estado: 'FALLIDO'
      })
      return res.status(403).json({ error: 'Cuenta de usuario desactivada' })
    }

    const payloadTv = payload.tv !== undefined ? payload.tv : 0
    if (payloadTv !== usuario.token_version) {
      registrarAuditoria({
        req,
        usuario_id: usuario.id,
        usuario_nombre: usuario.nombre,
        usuario_rol: usuario.rol,
        consultorio_id: usuario.consultorio_id,
        accion: 'TOKEN_RECHAZADO',
        modulo: 'Autenticación',
        detalles: `Token revocado (sesión invalidada por cambio de contraseña u otro logout global) reutilizado en ${req.originalUrl}`,
        estado: 'FALLIDO'
      })
      return res.status(401).json({ error: 'Sesión inválida, por favor inicia sesión de nuevo' })
    }

    req.usuario = {
      id: usuario.id,
      consultorio_id: usuario.consultorio_id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol || 'DUENO',
      activo: usuario.activo !== false
    }

    next()
  } catch (error) {
    // Un token expirado es el flujo normal de la sesión de 8h, no un intento de intrusión: no se audita.
    if (error.name !== 'TokenExpiredError') {
      registrarAuditoria({
        req,
        accion: 'TOKEN_RECHAZADO',
        modulo: 'Autenticación',
        detalles: `Token inválido o alterado en ${req.originalUrl} (${error.name})`,
        estado: 'FALLIDO'
      })
    }
    return res.status(403).json({ error: 'Token inválido o expirado' })
  }
}

// Variante opcional: nunca responde 401/403. Si el token es válido deja
// req.usuario poblado; si falta o es inválido continúa con req.usuario undefined.
const verificarTokenOpcional = async (req, res, next) => {
  let token = req.cookies ? req.cookies.token : null
  if (!token) {
    const authHeader = req.headers['authorization']
    token = authHeader && authHeader.split(' ')[1]
  }

  if (!token) return next()

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.id }
    })

    const payloadTv = payload.tv !== undefined ? payload.tv : 0
    if (usuario && usuario.activo !== false && payloadTv === usuario.token_version) {
      req.usuario = {
        id: usuario.id,
        consultorio_id: usuario.consultorio_id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol || 'DUENO',
        activo: true
      }
    }
  } catch {
    // Token inválido o expirado: se continúa sin usuario
  }

  next()
}

module.exports = verificarToken
module.exports.verificarTokenOpcional = verificarTokenOpcional