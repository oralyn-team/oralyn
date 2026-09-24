const test = require('node:test')
const assert = require('node:assert/strict')

const {
  calcularSemaforoVencimiento,
  calcularSemaforoStock,
  calcularSemaforoInsumo
} = require('../../src/utils/semaforo')

test('calcularSemaforoVencimiento — casos borde e nulos', () => {
  assert.equal(calcularSemaforoVencimiento(null), 'gris')
  assert.equal(calcularSemaforoVencimiento(undefined), 'gris')
  assert.equal(calcularSemaforoVencimiento('fecha-invalida'), 'gris')
})

test('calcularSemaforoVencimiento — umbrales (Rojo <1 mes, Amarillo 1-3 meses, Verde >3 meses)', () => {
  const ref = new Date('2026-09-23T00:00:00Z')

  // Ya vencido -> rojo
  const vencido = new Date('2026-09-10T00:00:00Z')
  assert.equal(calcularSemaforoVencimiento(vencido, ref), 'rojo')

  // Vence en 15 días (< 1 mes) -> rojo
  const vence15Dias = new Date('2026-10-08T00:00:00Z')
  assert.equal(calcularSemaforoVencimiento(vence15Dias, ref), 'rojo')

  // Vence en noviembre (2 meses desde septiembre, entre 1 y 3 meses) -> amarillo
  const venceNoviembre = new Date('2026-11-15T00:00:00Z')
  assert.equal(calcularSemaforoVencimiento(venceNoviembre, ref), 'amarillo')

  // Vence en 4 meses (> 3 meses) -> verde
  const vence4Meses = new Date('2027-01-25T00:00:00Z')
  assert.equal(calcularSemaforoVencimiento(vence4Meses, ref), 'verde')
})

test('calcularSemaforoStock — umbrales de stock', () => {
  assert.equal(calcularSemaforoStock(null, 10), 'gris')
  assert.equal(calcularSemaforoStock(5, 10), 'rojo')
  assert.equal(calcularSemaforoStock(10, 10), 'rojo')
  assert.equal(calcularSemaforoStock(12, 10), 'amarillo')
  assert.equal(calcularSemaforoStock(15, 10), 'amarillo')
  assert.equal(calcularSemaforoStock(20, 10), 'verde')
})

test('calcularSemaforoInsumo — combina vencimiento y stock', () => {
  const ref = new Date('2026-09-23T00:00:00Z')
  const insumo = {
    id: '1',
    cantidad_actual: 50,
    stock_minimo: 10,
    fecha_vencimiento: new Date('2026-11-15T00:00:00Z')
  }

  const res = calcularSemaforoInsumo(insumo)
  assert.equal(res.color_stock, 'verde')
  // Noviembre 2026 desde Sep 2026 es amarillo con los nuevos umbrales
  assert.equal(calcularSemaforoVencimiento(insumo.fecha_vencimiento, ref), 'amarillo')
})
