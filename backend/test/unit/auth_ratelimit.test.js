const test = require('node:test')
const assert = require('node:assert/strict')
const express = require('express')
const authRouter = require('../../src/routes/auth')

test('Rate limiting en POST /api/auth/login responde 429 tras superar el límite de intentos', async () => {
  const app = express()
  app.use(express.json())
  app.use('/api/auth', authRouter)

  // Simular peticiones secuenciales desde la misma IP
  let lastStatus = 200
  let lastBody = null

  for (let i = 1; i <= 11; i++) {
    const reqMock = {
      method: 'POST',
      url: '/api/auth/login',
      headers: { 'content-type': 'application/json' },
      ip: '127.0.0.1',
      body: { email: `test${i}@oralyn.test`, password: 'badpassword' }
    }

    // Mock supertest-like simple handler dispatcher
    await new Promise((resolve) => {
      const resMock = {
        statusCode: 200,
        headers: {},
        setHeader(k, v) { this.headers[k.toLowerCase()] = v },
        getHeader(k) { return this.headers[k.toLowerCase()] },
        status(code) { this.statusCode = code; return this },
        send(payload) {
          lastStatus = this.statusCode
          lastBody = payload
          resolve()
        },
        json(payload) {
          lastStatus = this.statusCode
          lastBody = payload
          resolve()
        }
      }
      app(reqMock, resMock)
    })

    if (i <= 10) {
      // Intentos 1-10: deben responder 400 u 401 pero NO 429
      assert.notEqual(lastStatus, 429, `Intento ${i} no debería dar 429`)
    } else {
      // Intento 11: debe responder 429
      assert.equal(lastStatus, 429, 'Intento 11 debe ser bloqueado con 429')
      assert.equal(lastBody.error, 'Demasiados intentos de inicio de sesión. Intenta de nuevo en unos minutos.')
    }
  }
})
