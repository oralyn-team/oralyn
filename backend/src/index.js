require('dotenv').config()
const app = require('./app')

const NODE_ENV = process.env.NODE_ENV || 'development'
const PORT = process.env.PORT || 3000

console.log(`Entorno: ${NODE_ENV}`)

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`)
})
