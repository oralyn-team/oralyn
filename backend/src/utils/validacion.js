function esNumeroValido(valor) {
  return valor !== undefined && valor !== null && !isNaN(Number(valor)) && Number(valor) >= 0
}

module.exports = { esNumeroValido }
