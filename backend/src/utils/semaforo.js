/**
 * Utilidades para cálculo de semaforización de insumos (Vencimiento y Stock)
 */

function calcularSemaforoVencimiento(fechaVencimiento, fechaReferencia = new Date()) {
  if (!fechaVencimiento) return 'gris'
  const fechaVenc = new Date(fechaVencimiento)
  if (isNaN(fechaVenc.getTime())) return 'gris'

  const ref = new Date(fechaReferencia)

  const limite3Meses = new Date(ref)
  limite3Meses.setMonth(limite3Meses.getMonth() + 3)

  const limite6Meses = new Date(ref)
  limite6Meses.setMonth(limite6Meses.getMonth() + 6)

  if (fechaVenc <= limite3Meses) {
    return 'rojo'
  } else if (fechaVenc <= limite6Meses) {
    return 'amarillo'
  } else {
    return 'verde'
  }
}

function calcularSemaforoStock(cantidadActual, stockMinimo) {
  const cant = Number(cantidadActual)
  const min = Number(stockMinimo)

  if (isNaN(cant) || isNaN(min)) return 'gris'

  if (cant <= min) {
    return 'rojo'
  } else if (cant <= min * 1.5) {
    return 'amarillo'
  } else {
    return 'verde'
  }
}

function calcularSemaforoInsumo(insumo) {
  if (!insumo) return null
  const color_vencimiento = calcularSemaforoVencimiento(insumo.fecha_vencimiento)
  const color_stock = calcularSemaforoStock(insumo.cantidad_actual, insumo.stock_minimo)

  return {
    ...insumo,
    color_vencimiento,
    color_stock
  }
}

module.exports = {
  calcularSemaforoVencimiento,
  calcularSemaforoStock,
  calcularSemaforoInsumo
}
