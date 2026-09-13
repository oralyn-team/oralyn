const http = require('http')
const jwt = require('jsonwebtoken')
const express = require('express')
const insumosRoutes = require('../../src/routes/insumos')

const JWT_SECRET = process.env.JWT_SECRET || 'DannaKelly04oralyn_test_secret'

function generarToken(payload = { consultorio_id: 1, id: 10, email: 'doctora@oralyn.com' }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' })
}

function crearTestApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/insumos', insumosRoutes)
  return app
}

function startServer() {
  return new Promise((resolve, reject) => {
    const app = crearTestApp()
    const server = http.createServer(app)
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port
      const baseURL = `http://127.0.0.1:${port}`
      resolve({ server, baseURL, port })
    })
    server.on('error', reject)
  })
}

function request(baseURL, method, path, body = null, token = null) {
  const url = new URL(path, baseURL)
  const headers = { 'Content-Type': 'application/json' }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const options = {
    method: method.toUpperCase(),
    headers
  }

  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        let bodyParsed = null
        try {
          bodyParsed = JSON.parse(data)
        } catch {
          bodyParsed = data
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: bodyParsed
        })
      })
    })

    req.on('error', reject)

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      req.write(JSON.stringify(body))
    }
    req.end()
  })
}

module.exports = {
  generarToken,
  startServer,
  request
}
