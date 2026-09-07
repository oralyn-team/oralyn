const test = require('node:test')
const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')
const { startAppWithPrisma } = require('../helpers/appHarness')
const { createUnifiedPrismaMock } = require('../helpers/mockPrisma')

process.env.JWT_SECRET = 'integration-test-secret'
process.env.NODE_ENV = 'test'
process.env.SUPABASE_URL = 'https://mock.supabase.co'
process.env.SUPABASE_SERVICE_KEY = 'mock-service-key'

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

test('POST /api/configuracion/logo — Subida exitosa con campo "logo" y reflejo en GET /api/configuracion', async (t) => {
  const prismaMock = createConfiguracionMock()
  const harness = await startAppWithPrisma(prismaMock)
  t.after(() => harness.close())

  const supabaseLib = require('../../src/lib/supabase')
  const originalSupabase = supabaseLib.supabase

  supabaseLib.supabase = {
    storage: {
      from: (bucket) => {
        assert.equal(bucket, 'logos')
        return {
          upload: async (fileName, buffer, options) => {
            assert.match(fileName, /^logo-consultorio-10\.png$/)
            assert.equal(options.contentType, 'image/png')
            return { error: null }
          },
          getPublicUrl: (fileName) => {
            return { data: { publicUrl: `https://supabase.mock/storage/v1/object/public/logos/${fileName}` } }
          }
        }
      }
    }
  }

  t.after(() => {
    supabaseLib.supabase = originalSupabase
  })

  const tokenA = generateToken(1, 10)
  const base64Sample = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

  // 1. POST /api/configuracion/logo enviando { logo: base64Sample }
  const { response, body } = await harness.request('/api/configuracion/logo', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ logo: base64Sample })
  })

  if (response.status !== 200) console.log('Error response body:', body)
  assert.equal(response.status, 200)
  assert.equal(body.logo_url, 'https://supabase.mock/storage/v1/object/public/logos/logo-consultorio-10.png')

  // 2. GET /api/configuracion para verificar que refleja logo_url
  const getRes = await harness.request('/api/configuracion', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${tokenA}`
    }
  })

  assert.equal(getRes.response.status, 200)
  assert.equal(getRes.body.logo_url, 'https://supabase.mock/storage/v1/object/public/logos/logo-consultorio-10.png')
})
