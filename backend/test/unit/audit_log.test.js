const test = require('node:test')
const assert = require('node:assert/strict')
const { calcularDiferencias } = require('../../src/services/audit.service')

test('calcularDiferencias detecta cambios entre objeto previo y posterior', () => {
  const prev = {
    nombre: 'Ana Gómez',
    telefono: '3001234567',
    activo: true
  }

  const curr = {
    nombre: 'Ana Gómez Pérez',
    telefono: '3001234567',
    activo: false
  }

  const diffs = calcularDiferencias(prev, curr)

  assert.equal(diffs.length, 2)

  const diffNombre = diffs.find(d => d.campo === 'nombre')
  assert.ok(diffNombre)
  assert.equal(diffNombre.oldValue, 'Ana Gómez')
  assert.equal(diffNombre.newValue, 'Ana Gómez Pérez')

  const diffActivo = diffs.find(d => d.campo === 'activo')
  assert.ok(diffActivo)
  assert.equal(diffActivo.oldValue, true)
  assert.equal(diffActivo.newValue, false)
})

test('calcularDiferencias solo compara campos de interés especificados', () => {
  const prev = {
    id: 5,
    creado_en: '2026-01-01T00:00:00.000Z',
    nombre: 'Test'
  }

  const curr = {
    id: 5,
    creado_en: '2026-09-03T00:00:00.000Z',
    nombre: 'Test'
  }

  const diffs = calcularDiferencias(prev, curr, ['nombre'])
  assert.equal(diffs.length, 0)
})
