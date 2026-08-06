const verificarAdmin = (req, res, next) => {
  const adminSecret = req.headers['x-admin-secret']

  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Acceso no autorizado' })
  }

  next()
}

module.exports = verificarAdmin