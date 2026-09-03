const { hasPermission, ROLES } = require('../lib/permissions')
const prisma = require('../lib/prisma')

/**
 * Middleware para requerir uno o más roles específicos
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'No autenticado' })
    }

    if (!req.usuario.rol || !allowedRoles.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'Acceso denegado: rol no autorizado' })
    }

    next()
  }
}

/**
 * Middleware para requerir permisos específicos (módulo.acción)
 */
function requirePermission(...requiredPermissions) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'No autenticado' })
    }

    const userRole = req.usuario.rol

    for (const perm of requiredPermissions) {
      if (!hasPermission(userRole, perm)) {
        return res.status(403).json({ error: 'Acceso denegado: permiso insuficiente' })
      }
    }

    next()
  }
}

/**
 * Middleware para restringir explícitamente al SUPERADMIN de acceder o modificar información clínica de pacientes
 */
function restrictSuperadminClinicalAccess(req, res, next) {
  if (req.usuario && req.usuario.rol === ROLES.SUPERADMIN) {
    return res.status(403).json({
      error: 'Acceso denegado: El rol SUPERADMIN no tiene permitido consultar ni modificar información clínica de pacientes.'
    })
  }
  next()
}

/**
 * Middleware para verificar aislamiento Multi-tenant por consultorio
 */
function verifyTenantAccess(modelName, paramName = 'id') {
  return async (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'No autenticado' })
    }

    // SUPERADMIN no debe acceder a recursos clínicos ni de consultorios ajenos
    if (req.usuario.rol === ROLES.SUPERADMIN) {
      if (['paciente', 'historiaClinica', 'cita', 'cotizacion', 'pago', 'factura'].includes(modelName)) {
        return res.status(403).json({
          error: 'Acceso denegado: El rol SUPERADMIN no tiene permitido acceder a recursos clínicos.'
        })
      }
    }

    const resourceId = req.params[paramName] || req.body[paramName] || req.query[paramName]

    if (!resourceId) {
      return next()
    }

    try {
      const idParsed = Number(resourceId)
      if (isNaN(idParsed)) {
        return res.status(400).json({ error: 'ID de recurso inválido' })
      }

      const resource = await prisma[modelName].findUnique({
        where: { id: idParsed },
        select: { consultorio_id: true }
      })

      if (!resource) {
        return res.status(404).json({ error: 'Recurso no encontrado' })
      }

      if (resource.consultorio_id !== req.usuario.consultorio_id) {
        // Responder 404 o 403 sin revelar información entre consultorios
        return res.status(404).json({ error: 'Recurso no encontrado' })
      }

      req.tenantResource = resource
      next()
    } catch (error) {
      console.error(`Error en verifyTenantAccess (${modelName}):`, error)
      res.status(500).json({ error: 'Error interno del servidor al verificar autorización' })
    }
  }
}

module.exports = {
  requireRole,
  requirePermission,
  restrictSuperadminClinicalAccess,
  verifyTenantAccess
}
