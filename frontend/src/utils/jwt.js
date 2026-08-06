export function tokenExpirado(token) {
  if (!token) return true
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (!payload.exp) return false // si no hay exp, no lo tratamos como expirado
    return Date.now() >= payload.exp * 1000
  } catch {
    return true // token malformado = tratarlo como inválido
  }
}
