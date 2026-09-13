const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { esNumeroValido } = require('../../src/utils/validacion')

describe('Pruebas unitarias de Validación (validacion.js)', () => {
  it('retorna true para números >= 0 válidos (numéricos y strings convertibles)', () => {
    assert.equal(esNumeroValido(10), true)
    assert.equal(esNumeroValido(0), true)
    assert.equal(esNumeroValido('15.5'), true)
    assert.equal(esNumeroValido('0'), true)
  })

  it('retorna false para números negativos', () => {
    assert.equal(esNumeroValido(-1), false)
    assert.equal(esNumeroValido('-10'), false)
  })

  it('retorna false para valores no numéricos, NaN, null y undefined', () => {
    assert.equal(esNumeroValido('abc'), false)
    assert.equal(esNumeroValido(NaN), false)
    assert.equal(esNumeroValido(null), false)
    assert.equal(esNumeroValido(undefined), false)
    assert.equal(esNumeroValido({}), false)
  })
})
