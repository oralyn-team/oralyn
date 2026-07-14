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
const configuracionRoutes = require('./routes/configuracion')
const adminRoutes = require('./routes/admin')
const errorHandler = require('./middlewares/errorHandler')

const app = express()

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'https://oralyn.vercel.app'
]

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-secret']
}))

app.use(express.json())

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
app.use('/api/configuracion', configuracionRoutes)
app.use('/api/admin', adminRoutes)

app.get('/', (req, res) => {
  res.json({ mensaje: 'Oralyn API funcionando' })
})

app.use(errorHandler)

module.exports = app
