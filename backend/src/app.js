const express = require('express')
const cors = require('cors')
require('dotenv').config()

// Validar variables de entorno críticas en el arranque antes de cargar rutas
if (process.env.NODE_ENV !== 'test' && !process.env.JWT_ADMIN_SECRET) {
  console.error('FATAL: JWT_ADMIN_SECRET no está definida en las variables de entorno.')
  process.exit(1)
}

const authRoutes = require('./routes/auth')
const adminAuthRoutes = require('./routes/adminAuth')
const usuariosRoutes = require('./routes/usuarios')
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
const catalogoCupsRoutes = require('./routes/catalogoCups')
const catalogoCie10Routes = require('./routes/catalogoCie10')
const procedimientosRoutes = require('./routes/procedimientos')
const ripsRoutes = require('./routes/rips')
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
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json({ limit: '20mb' }))
app.use(express.urlencoded({ extended: true, limit: '20mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/usuarios', usuariosRoutes)
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
app.use('/api/admin/auth', adminAuthRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/catalogo-cups', catalogoCupsRoutes)
app.use('/api/catalogo-cie10', catalogoCie10Routes)
app.use('/api/procedimientos', procedimientosRoutes)
app.use('/api/rips', ripsRoutes)

app.get('/', (req, res) => {
  res.json({ mensaje: 'Oralyn API funcionando' })
})

app.use(errorHandler)

module.exports = app
