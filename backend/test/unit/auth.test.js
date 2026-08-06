const test = require('node:test')
const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')

process.env.JWT_SECRET = 'unit-test-secret'

const verificarToken = require('../../src/middlewares/auth')

function runMiddleware(headers = {}) {
  const req = { headers }
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.body = payload
      return this
    }
  }

  let nextCalled = false
  verificarToken(req, res, () => {
    nextCalled = true
  })

  return { req, res, nextCalled }
}

test('verificarToken responde 401 cuando no hay token', () => {
  const { res, nextCalled } = runMiddleware()

  assert.equal(res.statusCode, 401)
  assert.equal(res.body.error, 'Token requerido')
  assert.equal(nextCalled, false)
})

test('verificarToken responde 403 cuando el token es inválido', () => {
  const { res, nextCalled } = runMiddleware({ authorization: 'Bearer token-invalido' })

  assert.equal(res.statusCode, 403)
  assert.equal(res.body.error, 'Token inválido o expirado')
  assert.equal(nextCalled, false)
})

test('verificarToken agrega el usuario decodificado y llama next con token válido', () => {
  const token = jwt.sign({ id: 7, consultorio_id: 10, email: 'demo@oralyn.test' }, process.env.JWT_SECRET)
  const { req, res, nextCalled } = runMiddleware({ authorization: `Bearer ${token}` })

  assert.equal(res.statusCode, 200)
  assert.equal(nextCalled, true)
  assert.equal(req.usuario.id, 7)
  assert.equal(req.usuario.consultorio_id, 10)
})
