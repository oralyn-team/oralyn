const errorHandler = (err, req, res, next) => {
  console.error('Error no manejado:', err)

  // Error específico de payload demasiado grande (body supera el límite de express.json)
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({
      error: 'El archivo es demasiado grande. El tamaño máximo permitido es 20 MB.'
    })
  }

  res.status(500).json({
    error: 'Error interno del servidor',
    mensaje: process.env.NODE_ENV === 'development' ? err.message : undefined
  })
}

module.exports = errorHandler