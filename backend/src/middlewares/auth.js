const jwt = require('jsonwebtoken')
const prisma = require('../lib/prisma')

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
      return res.status(401).json({ error: 'Usuario no encontrado' })
    }

    if (usuario.activo === false) {
      return res.status(403).json({ error: 'Cuenta de usuario desactivada' })
    }

    const payloadTv = payload.tv !== undefined ? payload.tv : 0
    if (payloadTv !== usuario.token_version) {
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
    return res.status(403).json({ error: 'Token inválido o expirado' })
  }
}

module.exports = verificarToken