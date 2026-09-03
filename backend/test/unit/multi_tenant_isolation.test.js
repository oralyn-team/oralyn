const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('path')

// Mock prisma findUnique before requiring rbac middleware
const prismaPath = path.resolve(__dirname, '..', '..', 'src', 'lib', 'prisma.js')
require.cache[prismaPath] = {
  id: prismaPath,
  filename: prismaPath,
  loaded: true,
  exports: {
    paciente: {
      findUnique: async ({ where }) => {
        if (where.id === 100) return { id: 100, consultorio_id: 1 }
        if (where.id === 200) return { id: 200, consultorio_id: 2 }
        return null
      }
    }
  }
}

const { verifyTenantAccess } = require('../../src/middlewares/rbac')

test('verifyTenantAccess bloquea al SUPERADMIN en recursos clínicos', async () => {
  const middleware = verifyTenantAccess('paciente')
  const req = { usuario: { rol: 'SUPERADMIN', consultorio_id: null }, params: { id: '100' } }
  let statusCode = null
  let jsonBody = null

  const res = {
    status(code) { statusCode = code; return this },
    json(body) { jsonBody = body; return this }
  }

  await middleware(req, res, () => {})

  assert.equal(statusCode, 403)
  assert.equal(jsonBody.error, 'Acceso denegado: El rol SUPERADMIN no tiene permitido acceder a recursos clínicos.')
})

test('verifyTenantAccess rechaza cuando se intenta consultar un recurso de otro consultorio', async () => {
  const middleware = verifyTenantAccess('paciente')
  const req = {
    usuario: { rol: 'DUENO', consultorio_id: 1 },
    params: { id: '200' } // ID 200 pertenece al consultorio_id: 2
  }
  let statusCode = null
  let jsonBody = null

  const res = {
    status(code) { statusCode = code; return this },
    json(body) { jsonBody = body; return this }
  }

  await middleware(req, res, () => {})

  assert.equal(statusCode, 404)
  assert.equal(jsonBody.error, 'Recurso no encontrado')
})

test('verifyTenantAccess permite acceso cuando el consultorio del recurso coincide', async () => {
  const middleware = verifyTenantAccess('paciente')
  const req = {
    usuario: { rol: 'DUENO', consultorio_id: 1 },
    params: { id: '100' } // ID 100 pertenece al consultorio_id: 1
  }
  let nextCalled = false

  const res = {
    status(code) { return this },
    json(body) { return this }
  }

  await middleware(req, res, () => { nextCalled = true })

  assert.equal(nextCalled, true)
  assert.equal(req.tenantResource.consultorio_id, 1)
})
