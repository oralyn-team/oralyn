const test = require('node:test')
const assert = require('node:assert/strict')
const { hasPermission, PERMISSIONS, ROLES } = require('../../src/lib/permissions')
const { requireRole, requirePermission, restrictSuperadminClinicalAccess } = require('../../src/middlewares/rbac')

test('hasPermission evalúa permisos correctamente por rol', () => {
  const rolSuperadmin = ROLES.SUPERADMIN
  const rolDueno = ROLES.DUENO
  const rolRecepcion = ROLES.RECEPCIONISTA
  const rolAsistente = ROLES.ASISTENTE_ODONTOLOGO

  // SUPERADMIN
  assert.equal(hasPermission(rolSuperadmin, PERMISSIONS.SUPERADMIN_MANAGE_CONSULTORIOS), true)
  assert.equal(hasPermission(rolSuperadmin, PERMISSIONS.AUDIT_READ_GLOBAL), true)
  assert.equal(hasPermission(rolSuperadmin, PERMISSIONS.PATIENTS_READ), false) // Bloqueado de pacientes
  assert.equal(hasPermission(rolSuperadmin, PERMISSIONS.CLINICAL_RECORDS_READ), false) // Bloqueado de historias

  // DUEÑO
  assert.equal(hasPermission(rolDueno, PERMISSIONS.PATIENTS_READ), true)
  assert.equal(hasPermission(rolDueno, PERMISSIONS.USERS_CREATE), true)
  assert.equal(hasPermission(rolDueno, PERMISSIONS.AUDIT_READ), true)
  assert.equal(hasPermission(rolDueno, PERMISSIONS.SUPERADMIN_MANAGE_CONSULTORIOS), false)

  // RECEPCIONISTA
  assert.equal(hasPermission(rolRecepcion, PERMISSIONS.PATIENTS_READ), true)
  assert.equal(hasPermission(rolRecepcion, PERMISSIONS.APPOINTMENTS_CREATE), true)
  assert.equal(hasPermission(rolRecepcion, PERMISSIONS.PAYMENTS_CREATE), true)
  assert.equal(hasPermission(rolRecepcion, PERMISSIONS.USERS_CREATE), false) // No administra usuarios
  assert.equal(hasPermission(rolRecepcion, PERMISSIONS.CLINICAL_RECORDS_CREATE), false) // No edita historias

  // ASISTENTE / ODONTÓLOGO
  assert.equal(hasPermission(rolAsistente, PERMISSIONS.CLINICAL_RECORDS_CREATE), true)
  assert.equal(hasPermission(rolAsistente, PERMISSIONS.ODONTOGRAM_UPDATE), true)
  assert.equal(hasPermission(rolAsistente, PERMISSIONS.USERS_CREATE), false)
})

test('requireRole middleware bloquea usuarios con rol no permitido', async () => {
  const middleware = requireRole('DUENO', 'SUPERADMIN')

  const req = { usuario: { rol: 'RECEPCIONISTA' } }
  let statusCode = null
  let jsonBody = null
  let nextCalled = false

  const res = {
    status(code) { statusCode = code; return this },
    json(body) { jsonBody = body; return this }
  }

  middleware(req, res, () => { nextCalled = true })

  assert.equal(statusCode, 403)
  assert.equal(jsonBody.error, 'Acceso denegado: rol no autorizado')
  assert.equal(nextCalled, false)
})

test('requirePermission middleware permite acceso cuando se posee el permiso', async () => {
  const middleware = requirePermission(PERMISSIONS.PATIENTS_READ)

  const req = { usuario: { rol: 'DUENO' } }
  let nextCalled = false

  const res = {
    status(code) { return this },
    json(body) { return this }
  }

  middleware(req, res, () => { nextCalled = true })

  assert.equal(nextCalled, true)
})

test('restrictSuperadminClinicalAccess bloquea estrictamente a SUPERADMIN en rutas clínicas', async () => {
  const req = { usuario: { rol: 'SUPERADMIN' } }
  let statusCode = null
  let jsonBody = null
  let nextCalled = false

  const res = {
    status(code) { statusCode = code; return this },
    json(body) { jsonBody = body; return this }
  }

  restrictSuperadminClinicalAccess(req, res, () => { nextCalled = true })

  assert.equal(statusCode, 403)
  assert.equal(jsonBody.error, 'Acceso denegado: El rol SUPERADMIN no tiene permitido consultar ni modificar información clínica de pacientes.')
  assert.equal(nextCalled, false)
})
