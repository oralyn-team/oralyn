const test = require('node:test')
const assert = require('node:assert/strict')
const { ROLES, PERMISSIONS, hasPermission } = require('../../src/lib/permissions')

test('USERS_TRANSFER_OWNERSHIP permission assignment', () => {
  assert.equal(hasPermission(ROLES.DUENO, PERMISSIONS.USERS_TRANSFER_OWNERSHIP), true)
  assert.equal(hasPermission(ROLES.ASISTENTE_ODONTOLOGO, PERMISSIONS.USERS_TRANSFER_OWNERSHIP), false)
  assert.equal(hasPermission(ROLES.RECEPCIONISTA, PERMISSIONS.USERS_TRANSFER_OWNERSHIP), false)
  assert.equal(hasPermission(ROLES.SUPERADMIN, PERMISSIONS.USERS_TRANSFER_OWNERSHIP), false)
})

test('Superadmin cannot possess clinical permissions', () => {
  assert.equal(hasPermission(ROLES.SUPERADMIN, PERMISSIONS.PATIENTS_READ), false)
  assert.equal(hasPermission(ROLES.SUPERADMIN, PERMISSIONS.CLINICAL_RECORDS_READ), false)
  assert.equal(hasPermission(ROLES.SUPERADMIN, PERMISSIONS.ODONTOGRAM_READ), false)
})
