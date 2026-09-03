const test = require('node:test')
const assert = require('node:assert/strict')
const { restrictSuperadminClinicalAccess } = require('../../src/middlewares/rbac')

test('Superadmin no puede acceder a rutas protegidas por restrictSuperadminClinicalAccess', () => {
  const req = { usuario: { rol: 'SUPERADMIN', email: 'superadmin@oralyn.com' } }
  let status = null
  let body = null

  const res = {
    status(s) { status = s; return this },
    json(b) { body = b; return this }
  }

  let nextCalled = false
  restrictSuperadminClinicalAccess(req, res, () => { nextCalled = true })

  assert.equal(status, 403)
  assert.equal(nextCalled, false)
  assert.equal(body.error, 'Acceso denegado: El rol SUPERADMIN no tiene permitido consultar ni modificar información clínica de pacientes.')
})

test('Usuarios normadas (DUENO, ASISTENTE, RECEPCIONISTA) pasan la validación clínica', () => {
  const rolesPermitidos = ['DUENO', 'ASISTENTE_ODONTOLOGO', 'RECEPCIONISTA']

  for (const rol of rolesPermitidos) {
    const req = { usuario: { rol, consultorio_id: 1 } }
    let nextCalled = false

    const res = {
      status(s) { return this },
      json(b) { return this }
    }

    restrictSuperadminClinicalAccess(req, res, () => { nextCalled = true })

    assert.equal(nextCalled, true, `Rol ${rol} debería pasar restrictSuperadminClinicalAccess`)
  }
})
