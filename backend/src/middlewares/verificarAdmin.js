const jwt = require('jsonwebtoken')
const prisma = require('../lib/prisma')
const { getAdminSecret } = require('../lib/adminSecret')

const verificarAdmin = async (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' })
  }

  try {
    const secret = getAdminSecret()

    // Si por alguna razón no hay secret (en dev/prod si falla el bypass o algo), jwt.verify fallará.
    const payload = jwt.verify(token, secret)

    if (payload.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado: Se requiere rol de administrador' })
    }

    // Consultar el administrador en base de datos para validar estado activo y existencia
    const admin = await prisma.administrador.findUnique({
      where: { id: payload.id }
    })

    if (!admin) {
      return res.status(401).json({ error: 'Administrador no encontrado' })
    }

    if (!admin.activo) {
      return res.status(403).json({ error: 'Acceso no autorizado: Administrador inactivo' })
    }

    // Adjuntar la información a req.admin
    req.admin = {
      id: admin.id,
      email: admin.email,
      nombre: admin.nombre
    }

    next()
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' })
  }
}

module.exports = verificarAdmin