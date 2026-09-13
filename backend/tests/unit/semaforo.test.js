const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const {
  calcularSemaforoVencimiento,
  calcularSemaforoStock,
  calcularSemaforoInsumo
} = require('../../src/utils/semaforo')

describe('Pruebas unitarias de Semaforización (semaforo.js)', () => {
  const ref = new Date('2026-09-13T00:00:00Z')

  describe('calcularSemaforoVencimiento', () => {
    it('retorna "gris" cuando fechaVencimiento es null o undefined', () => {
      assert.equal(calcularSemaforoVencimiento(null, ref), 'gris')
      assert.equal(calcularSemaforoVencimiento(undefined, ref), 'gris')
      assert.equal(calcularSemaforoVencimiento('', ref), 'gris')
    })

    it('retorna "verde" cuando la fecha es mayor a 6 meses restantes', () => {
      assert.equal(calcularSemaforoVencimiento('2027-05-01', ref), 'verde')
    })

    it('retorna "amarillo" cuando la fecha está entre 3 y 6 meses restantes', () => {
      assert.equal(calcularSemaforoVencimiento('2027-01-15', ref), 'amarillo')
    })

    it('retorna "rojo" cuando la fecha es menor a 3 meses o ya vencida', () => {
      assert.equal(calcularSemaforoVencimiento('2026-11-01', ref), 'rojo')
      assert.equal(calcularSemaforoVencimiento('2026-05-01', ref), 'rojo')
    })
  })

  describe('calcularSemaforoStock', () => {
    it('retorna "rojo" si cantidad_actual <= stock_minimo', () => {
      assert.equal(calcularSemaforoStock(10, 10), 'rojo')
      assert.equal(calcularSemaforoStock(5, 10), 'rojo')
      assert.equal(calcularSemaforoStock(0, 10), 'rojo')
    })

    it('retorna "amarillo" si cantidad_actual está entre stock_minimo y stock_minimo * 1.5', () => {
      assert.equal(calcularSemaforoStock(12, 10), 'amarillo')
      assert.equal(calcularSemaforoStock(15, 10), 'amarillo')
    })

    it('retorna "verde" si cantidad_actual > stock_minimo * 1.5', () => {
      assert.equal(calcularSemaforoStock(16, 10), 'verde')
      assert.equal(calcularSemaforoStock(50, 10), 'verde')
    })

    it('retorna "gris" si los valores no son numéricos', () => {
      assert.equal(calcularSemaforoStock(NaN, 10), 'gris')
      assert.equal(calcularSemaforoStock(10, 'invalido'), 'gris')
    })
  })

  describe('calcularSemaforoInsumo', () => {
    it('asigna correctamente ambos ejes al objeto insumo', () => {
      const insumo = {
        id: '1',
        nombre: 'Anestesia Lidocaína',
        cantidad_actual: 5,
        stock_minimo: 10,
        fecha_vencimiento: '2027-08-01'
      }

      const res = calcularSemaforoInsumo(insumo)
      assert.equal(res.color_stock, 'rojo')
      assert.equal(res.color_vencimiento, 'verde')
    })

    it('retorna null si el insumo es null o undefined', () => {
      assert.equal(calcularSemaforoInsumo(null), null)
    })
  })
})
