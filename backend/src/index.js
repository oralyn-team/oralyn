const express = require('express')
const cors = require('cors')
require('dotenv').config()

const authRoutes = require('./routes/auth')
const pacientesRoutes = require('./routes/pacientes')
const historiasRoutes = require('./routes/historias')
const citasRoutes = require('./routes/citas')
const pagosRoutes = require('./routes/pagos')
const cotizacionesRoutes = require('./routes/cotizaciones')
const consentimientosRoutes = require('./routes/consentimientos')
const dashboardRoutes = require('./routes/dashboard')
const pdfRoutes = require('./routes/pdf')
const certificadosRoutes = require('./routes/certificados')


const app = express()

// CORS
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(express.json())

// Rutas
app.use('/api/auth', authRoutes)
app.use('/api/pacientes', pacientesRoutes)
app.use('/api/historias', historiasRoutes)
app.use('/api/citas', citasRoutes)
app.use('/api/pagos', pagosRoutes)
app.use('/api/cotizaciones', cotizacionesRoutes)
app.use('/api/consentimientos', consentimientosRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/pdf', pdfRoutes)
app.use('/api/certificados', certificadosRoutes)

app.get('/', (req, res) => {
  res.json({ mensaje: 'Oralyn API funcionando' })
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`)
})
const errorHandler = require('./middlewares/errorHandler')
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`)
})

