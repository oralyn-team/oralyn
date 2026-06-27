const errorHandler = (err, req, res, next) => {
  console.error('Error no manejado:', err)
  res.status(500).json({
    error: 'Error interno del servidor',
    mensaje: process.env.NODE_ENV === 'development' ? err.message : undefined
  })
}

module.exports = errorHandler