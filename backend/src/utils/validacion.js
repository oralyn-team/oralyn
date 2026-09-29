function esNumeroValido(valor) {
  return valor !== undefined && valor !== null && !isNaN(Number(valor)) && Number(valor) >= 0
}

const LONGITUD_MINIMA_PASSWORD = 10
const REGEX_MAYUSCULA = /[A-ZÁÉÍÓÚÑ]/
const REGEX_MINUSCULA = /[a-záéíóúñ]/
const REGEX_NUMERO = /[0-9]/
const REGEX_ESPECIAL = /[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9]/

/**
 * Valida la complejidad de una contraseña (GAP-005): longitud mínima y combinación
 * de mayúsculas, minúsculas, números y al menos un carácter especial.
 * Devuelve { valida: boolean, errores: string[] }.
 */
function validarComplejidadPassword(password) {
  const errores = []

  if (typeof password !== 'string' || password.length < LONGITUD_MINIMA_PASSWORD) {
    errores.push(`Debe tener al menos ${LONGITUD_MINIMA_PASSWORD} caracteres`)
  }
  if (typeof password !== 'string' || !REGEX_MAYUSCULA.test(password)) {
    errores.push('Debe incluir al menos una letra mayúscula')
  }
  if (typeof password !== 'string' || !REGEX_MINUSCULA.test(password)) {
    errores.push('Debe incluir al menos una letra minúscula')
  }
  if (typeof password !== 'string' || !REGEX_NUMERO.test(password)) {
    errores.push('Debe incluir al menos un número')
  }
  if (typeof password !== 'string' || !REGEX_ESPECIAL.test(password)) {
    errores.push('Debe incluir al menos un carácter especial (ej. !@#$%&*)')
  }

  return { valida: errores.length === 0, errores }
}

module.exports = { esNumeroValido, validarComplejidadPassword, LONGITUD_MINIMA_PASSWORD }
