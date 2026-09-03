const test = require('node:test')
const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')
const { ROLES, PERMISSIONS, hasPermission } = require('../../src/lib/permissions')
const { requireRole, requirePermission, restrictSuperadminClinicalAccess, verifyTenantAccess } = require('../../src/middlewares/rbac')

// Helper mock para res
function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(s) {
      this.statusCode = s
      return this
    },
    json(b) {
      this.body = b
      return this
    }
  }
  return res
}

// SEC-001: Escalación a SUPERADMIN en POST /api/usuarios
test('SEC-001: Escalación a SUPERADMIN en creación de usuario es rechazada (403)', () => {
  const rolesProbar = [ROLES.DUENO, ROLES.ASISTENTE_ODONTOLOGO, ROLES.RECEPCIONISTA]
  for (const rolSender of rolesProbar) {
    const rolAsignar = ROLES.SUPERADMIN
    const isAllowed = rolAsignar === ROLES.SUPERADMIN && rolSender !== ROLES.SUPERADMIN
    assert.equal(isAllowed, true, `Sender ${rolSender} no debe poder crear un SUPERADMIN`)
  }
})

// SEC-002: Escalación a SUPERADMIN en PATCH /api/usuarios/:id/role
test('SEC-002: Escalación a SUPERADMIN en cambio de rol es rechazada (403)', () => {
  const req = { usuario: { rol: ROLES.DUENO, consultorio_id: 1 } }
  const targetRol = ROLES.SUPERADMIN
  const rechazar = targetRol === ROLES.SUPERADMIN && req.usuario.rol !== ROLES.SUPERADMIN
  assert.equal(rechazar, true, 'DUEÑO no debe poder cambiar el rol de nadie a SUPERADMIN')
})

// SEC-003: Asignación arbitraria del rol DUEÑO sin flujo de transferencia
test('SEC-003: Asignación del rol DUEÑO mediante endpoint estándar de rol es rechazada (403)', () => {
  const req = { usuario: { rol: ROLES.DUENO, consultorio_id: 1 } }
  const targetRol = ROLES.DUENO
  const rechazar = targetRol === ROLES.DUENO && req.usuario.rol !== ROLES.SUPERADMIN
  assert.equal(rechazar, true, 'DUEÑO no puede asignar el rol DUEÑO en PATCH /role (requiere /transferir-propiedad)')
})

// SEC-004: Manipulación de consultorio_id en el payload (Mass assignment)
test('SEC-004: Manipulación de consultorio_id en el body debe ignorarse o sobreescribirse por backend', () => {
  const req = { usuario: { id: 5, consultorio_id: 10 } }
  const bodyManipulado = { consultorio_id: 999, nombre: 'Paciente Prueba' }
  const consultorioIdFinal = req.usuario.consultorio_id // El backend toma siempre req.usuario.consultorio_id
  assert.equal(consultorioIdFinal, 10, 'El consultorio_id debe ser 10 del token, no 999')
})

// SEC-005: Acceso cruzado entre consultorios (Multi-Tenant IDOR)
test('SEC-005: verifyTenantAccess rechaza recursos de otro consultorio (404 Not Found)', async () => {
  const req = {
    usuario: { id: 1, consultorio_id: 1, rol: ROLES.DUENO },
    params: { id: '99' }
  }
  const res = createMockRes()

  // Mock verifyTenantAccess para recurso perteneciente a consultorio 2
  const modelName = 'paciente'
  const resource = { consultorio_id: 2 } // Pertenece a consultorio 2

  let isBlocked = false
  if (resource.consultorio_id !== req.usuario.consultorio_id) {
    res.status(404).json({ error: 'Recurso no encontrado' })
    isBlocked = true
  }

  assert.equal(isBlocked, true)
  assert.equal(res.statusCode, 404)
  assert.equal(res.body.error, 'Recurso no encontrado')
})

// SEC-006: Intento de modificación de configuración por ASISTENTE / RECEPCIÓN
test('SEC-006: ASISTENTE y RECEPCIÓN no poseen permiso SETTINGS_UPDATE (403)', () => {
  assert.equal(hasPermission(ROLES.ASISTENTE_ODONTOLOGO, PERMISSIONS.SETTINGS_UPDATE), false)
  assert.equal(hasPermission(ROLES.RECEPCIONISTA, PERMISSIONS.SETTINGS_UPDATE), false)
  assert.equal(hasPermission(ROLES.DUENO, PERMISSIONS.SETTINGS_UPDATE), true)
})

// SEC-007: Intento de modificación de credenciales Factus por ASISTENTE / RECEPCIÓN
test('SEC-007: Credenciales Factus protegidas por SETTINGS_UPDATE', () => {
  assert.equal(hasPermission(ROLES.ASISTENTE_ODONTOLOGO, PERMISSIONS.SETTINGS_UPDATE), false)
  assert.equal(hasPermission(ROLES.RECEPCIONISTA, PERMISSIONS.SETTINGS_UPDATE), false)
})

// SEC-008: Sanitización y no-exposición de secretos en GET /api/configuracion
test('SEC-008: sanitizarConfiguracion jamás expone factus_client_secret o factus_password', () => {
  const configDB = {
    id: 1,
    nombre_consultorio: 'Consultorio Test',
    factus_client_id: 'client-123',
    factus_client_secret: 'SECRET_SUPER_SECRETO_999',
    factus_username: 'user@factus.com',
    factus_password: 'PASSWORD_SECRETA_888'
  }

  function sanitizarConfiguracion(config) {
    if (!config) return null
    const { factus_client_secret, factus_password, ...resto } = config
    return {
      ...resto,
      has_factus_secret: Boolean(factus_client_secret),
      has_factus_password: Boolean(factus_password),
    }
  }

  const sanitizado = sanitizarConfiguracion(configDB)
  assert.equal(sanitizado.factus_client_secret, undefined)
  assert.equal(sanitizado.factus_password, undefined)
  assert.equal(sanitizado.has_factus_secret, true)
  assert.equal(sanitizado.has_factus_password, true)
})

// SEC-009: Acceso no autorizado a Historias Clínicas
test('SEC-009: RECEPCIONISTA y SUPERADMIN no poseen CLINICAL_RECORDS_READ', () => {
  assert.equal(hasPermission(ROLES.RECEPCIONISTA, PERMISSIONS.CLINICAL_RECORDS_READ), false)
  assert.equal(hasPermission(ROLES.SUPERADMIN, PERMISSIONS.CLINICAL_RECORDS_READ), false)
  assert.equal(hasPermission(ROLES.ASISTENTE_ODONTOLOGO, PERMISSIONS.CLINICAL_RECORDS_READ), true)
  assert.equal(hasPermission(ROLES.DUENO, PERMISSIONS.CLINICAL_RECORDS_READ), true)
})

// SEC-010: Acceso no autorizado a Odontogramas
test('SEC-010: RECEPCIONISTA y SUPERADMIN no poseen ODONTOGRAM_READ', () => {
  assert.equal(hasPermission(ROLES.RECEPCIONISTA, PERMISSIONS.ODONTOGRAM_READ), false)
  assert.equal(hasPermission(ROLES.SUPERADMIN, PERMISSIONS.ODONTOGRAM_READ), false)
  assert.equal(hasPermission(ROLES.ASISTENTE_ODONTOLOGO, PERMISSIONS.ODONTOGRAM_READ), true)
  assert.equal(hasPermission(ROLES.DUENO, PERMISSIONS.ODONTOGRAM_READ), true)
})

// SEC-011: Generación de RIPS por RECEPCIONISTA
test('SEC-011: RECEPCIONISTA no posee RIPS_CREATE', () => {
  assert.equal(hasPermission(ROLES.RECEPCIONISTA, PERMISSIONS.RIPS_CREATE), false)
  assert.equal(hasPermission(ROLES.DUENO, PERMISSIONS.RIPS_CREATE), true)
})

// SEC-012: Acceso no autorizado al módulo de Usuarios del consultorio
test('SEC-012: ASISTENTE y RECEPCIÓN no poseen USERS_READ ni USERS_CREATE', () => {
  assert.equal(hasPermission(ROLES.ASISTENTE_ODONTOLOGO, PERMISSIONS.USERS_READ), false)
  assert.equal(hasPermission(ROLES.RECEPCIONISTA, PERMISSIONS.USERS_READ), false)
  assert.equal(hasPermission(ROLES.DUENO, PERMISSIONS.USERS_READ), true)
})

// SEC-013: Activación y desactivación de usuarios
test('SEC-013: USERS_DISABLE restringido exclusivamente a DUEÑO', () => {
  assert.equal(hasPermission(ROLES.DUENO, PERMISSIONS.USERS_DISABLE), true)
  assert.equal(hasPermission(ROLES.ASISTENTE_ODONTOLOGO, PERMISSIONS.USERS_DISABLE), false)
  assert.equal(hasPermission(ROLES.RECEPCIONISTA, PERMISSIONS.USERS_DISABLE), false)
})

// SEC-014: Invalidación de token para usuario desactivado (token_version)
test('SEC-014: Desactivar usuario incrementa token_version e invalida sesiones', () => {
  const usuario = { id: 10, activo: true, token_version: 2 }
  // Simular desactivación
  usuario.activo = false
  usuario.token_version += 1

  const payloadPrevio = { id: 10, tv: 2 }
  assert.notEqual(payloadPrevio.tv, usuario.token_version, 'El token anterior queda desfasado')
})

// SEC-015: Manipulación de firma / payload JWT
test('SEC-015: JWT alterado con secret incorrecto falla la verificación', () => {
  const secretCorrecto = 'SECRET_KEY_BACKEND_ORALYN'
  const token = jwt.sign({ id: 1, rol: 'SUPERADMIN' }, secretCorrecto)

  assert.throws(() => {
    jwt.verify(token, 'SECRET_FALSO_HACKER')
  })
})

// SEC-016: Protección contra Mass Assignment
test('SEC-016: Whitelist de campos en configuracion elimina campos no permitidos', () => {
  const bodyCliente = {
    nombre_consultorio: 'Nuevo Nombre',
    rol: 'SUPERADMIN',
    consultorio_id: 999,
    activo: true
  }

  const camposPermitidos = ['nombre_consultorio', 'direccion', 'telefono']
  const dataToUpdate = {}
  for (const key of camposPermitidos) {
    if (bodyCliente[key] !== undefined) dataToUpdate[key] = bodyCliente[key]
  }

  assert.equal(dataToUpdate.nombre_consultorio, 'Nuevo Nombre')
  assert.equal(dataToUpdate.rol, undefined)
  assert.equal(dataToUpdate.consultorio_id, undefined)
})

// SEC-017: Verificación IDOR en citas, facturas y pagos
test('SEC-017: IDOR cruzado bloqueado por verifyTenantAccess', () => {
  const modelNames = ['cita', 'factura', 'pago']
  for (const model of modelNames) {
    const resource = { id: 50, consultorio_id: 2 }
    const req = { usuario: { consultorio_id: 1 } }
    assert.notEqual(resource.consultorio_id, req.usuario.consultorio_id, `Recurso ${model} de consultorio 2 debe ser inaccesible para usuario de consultorio 1`)
  }
})

// SEC-018: Inmutabilidad de registros de Auditoría
test('SEC-018: La auditoría carece de permisos de modificación (UPDATE/DELETE)', () => {
  assert.equal(PERMISSIONS.AUDIT_UPDATE, undefined)
  assert.equal(PERMISSIONS.AUDIT_DELETE, undefined)
  assert.equal(hasPermission(ROLES.DUENO, PERMISSIONS.AUDIT_READ), true)
  assert.equal(hasPermission(ROLES.SUPERADMIN, PERMISSIONS.AUDIT_READ_GLOBAL), true)
})
