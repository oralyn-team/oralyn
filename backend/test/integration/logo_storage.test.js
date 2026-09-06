const test = require('node:test')
const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')
const { startAppWithPrisma } = require('../helpers/appHarness')
const { createUnifiedPrismaMock } = require('../helpers/mockPrisma')

process.env.JWT_SECRET = 'integration-test-secret'
process.env.NODE_ENV = 'test'

function generateToken(userId, consultorioId) {
  return jwt.sign({ id: userId, consultorio_id: consultorioId, email: 'doctor@oralyn.test' }, process.env.JWT_SECRET)
}

function createConfiguracionMock() {
  return createUnifiedPrismaMock({
    configuracion: [
      { id: 10, nombre_consultorio: 'Consultorio Test Storage', nombre_profesional: 'Dr. Storage' }
    ],
    usuario: [
      { id: 1, consultorio_id: 10, email: 'doctorA@oralyn.test', password_hash: 'hash', nombre: 'Dra. A' }
    ]
  })
}

test('POST /api/configuracion/logo — Validación de payload base64', async (t) => {
  const prismaMock = createConfiguracionMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const tokenA = generateToken(1, 10)

  const { response, body } = await harness.request('/api/configuracion/logo', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  })

  assert.equal(response.status, 400)
  assert.match(body.error, /Se requiere una imagen en formato base64/)
})
