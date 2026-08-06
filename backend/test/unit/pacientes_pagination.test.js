const test = require('node:test')
const assert = require('node:assert/strict')

test('Estructura y cálculo de paginación de pacientes', () => {
  const pageNum = 2
  const limitNum = 10
  const total = 25
  const totalPages = Math.ceil(total / limitNum)

  assert.equal(totalPages, 3)
  assert.equal((pageNum - 1) * limitNum, 10)
})
