const express = require('express')
const cors = require('cors')
require('dotenv').config()

const authRoutes = require('./routes/auth')
const pacientesRoutes = require('./routes/pacientes')

const app = express()

// CORS (uno solo y bien configurado)
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(express.json())

// Rutas
app.use('/api/auth', authRoutes)
app.use('/api/pacientes', pacientesRoutes)

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ mensaje: 'Oralyn API funcionando' })
})

// 🔥 AQUÍ estaba el problema
const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`)
})

const historiasRoutes = require('./routes/historias')
app.use('/api/historias', historiasRoutes)