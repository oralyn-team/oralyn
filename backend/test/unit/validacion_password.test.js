const test = require('node:test')
const assert = require('node:assert/strict')
const { validarComplejidadPassword, LONGITUD_MINIMA_PASSWORD } = require('../../src/utils/validacion')

test('validarComplejidadPassword acepta una contraseña que cumple todos los requisitos', () => {
  const { valida, errores } = validarComplejidadPassword('Segura123!')
  assert.equal(valida, true)
  assert.deepEqual(errores, [])
})

test('validarComplejidadPassword rechaza una contraseña demasiado corta', () => {
  const { valida, errores } = validarComplejidadPassword('Ab1!')
  assert.equal(valida, false)
  assert.ok(errores.some((e) => e.includes(`${LONGITUD_MINIMA_PASSWORD} caracteres`)))
})

test('validarComplejidadPassword rechaza sin mayúsculas', () => {
  const { valida, errores } = validarComplejidadPassword('segura123!')
  assert.equal(valida, false)
  assert.ok(errores.some((e) => e.includes('mayúscula')))
})

test('validarComplejidadPassword rechaza sin minúsculas', () => {
  const { valida, errores } = validarComplejidadPassword('SEGURA123!')
  assert.equal(valida, false)
  assert.ok(errores.some((e) => e.includes('minúscula')))
})

test('validarComplejidadPassword rechaza sin números', () => {
  const { valida, errores } = validarComplejidadPassword('SeguraSegura!')
  assert.equal(valida, false)
  assert.ok(errores.some((e) => e.includes('número')))
})

test('validarComplejidadPassword rechaza sin caracteres especiales', () => {
  const { valida, errores } = validarComplejidadPassword('Segura12345')
  assert.equal(valida, false)
  assert.ok(errores.some((e) => e.includes('especial')))
})

test('validarComplejidadPassword acumula todos los errores aplicables a la vez', () => {
  const { valida, errores } = validarComplejidadPassword('abc')
  assert.equal(valida, false)
  assert.equal(errores.length, 4) // corta, sin mayúscula, sin número, sin especial (sí tiene minúscula)
})

test('validarComplejidadPassword rechaza valores no-string (undefined, null, número)', () => {
  assert.equal(validarComplejidadPassword(undefined).valida, false)
  assert.equal(validarComplejidadPassword(null).valida, false)
  assert.equal(validarComplejidadPassword(12345678901).valida, false)
})

test('validarComplejidadPassword acepta acentos y ñ como letras válidas', () => {
  const { valida } = validarComplejidadPassword('Contraseña123!')
  assert.equal(valida, true)
})
