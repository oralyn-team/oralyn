const express = require('express')
const cors = require('cors')
require('dotenv').config()

const authRoutes = require('./routes/auth')
const pacientesRoutes = require('./routes/pacientes')

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json())

// Rutas
app.use('/api/auth', authRoutes)
app.use('/api/pacientes', pacientesRoutes)

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ mensaje: 'Oralyn API funcionando' })
})

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`)
})