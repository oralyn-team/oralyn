const app = require('./app')

const NODE_ENV = process.env.NODE_ENV || 'development'
const PORT = process.env.PORT || 3000

console.log(`Entorno: ${NODE_ENV}`)

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
  console.log(`Servidor accesible en la red: http://192.168.1.37:${PORT}`)
})