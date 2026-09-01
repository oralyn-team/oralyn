function getAdminSecret() {
  const secret = process.env.JWT_ADMIN_SECRET
  if (process.env.NODE_ENV === 'test' && !secret) {
    return 'test-admin-jwt-secret'
  }
  return secret
}

module.exports = { getAdminSecret }
