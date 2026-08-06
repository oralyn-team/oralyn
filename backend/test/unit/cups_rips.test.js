const test = require('node:test')
const assert = require('node:assert')
const prisma = require('../../src/lib/prisma')
const { validarRips } = require('../../src/services/ripsValidator.service')
const { construirRips } = require('../../src/services/ripsBuilder.service')

test('Catálogo Oficial CUPS contiene procedimientos frecuentes', async () => {
  const frecuentes = await prisma.catalogoOficialCups.findMany({
    where: { es_frecuente: true }
  })
  assert.ok(frecuentes.length > 0, 'Debe haber procedimientos marcados como frecuentes')
})

test('Procedimientos del Consultorio puede listar procedimientos para consultorio 1', async () => {
  let procs = await prisma.procedimientoConsultorio.findMany({
    where: { consultorio_id: 1 },
    include: { catalogo_oficial: true }
  })

  if (procs.length === 0) {
    const oficial = await prisma.catalogoOficialCups.findFirst()
    if (oficial) {
      await prisma.procedimientoConsultorio.create({
        data: {
          consultorio_id: 1,
          catalogo_oficial_id: oficial.id,
          nombre_visible: 'Procedimiento Prueba',
          precio: 50000,
          activo: true
        }
      })
      procs = await prisma.procedimientoConsultorio.findMany({
        where: { consultorio_id: 1 },
        include: { catalogo_oficial: true }
      })
    }
  }

  assert.ok(procs.length > 0, 'Debe haber procedimientos configurados para el consultorio 1')
  assert.ok(procs[0].catalogo_oficial.codigo_cups, 'Cada procedimiento debe tener su FK a catalogo_oficial')
})

test('RIPS Validator detecta periodo sin atenciones o valida correctamente', async () => {
  const inicio = new Date('2020-01-01')
  const fin = new Date('2020-01-02')

  const res = await validarRips(1, inicio, fin)
  assert.strictEqual(typeof res.valido, 'boolean')
  assert.ok(Array.isArray(res.errores))
})

test('RIPS Builder construye estructura de objeto RIPS', async () => {
  const inicio = new Date('2026-01-01')
  const fin = new Date('2026-12-31')

  const ripsJson = await construirRips(1, inicio, fin)
  assert.ok(ripsJson.prestador, 'RIPS debe incluir información del prestador')
  assert.ok(Array.isArray(ripsJson.pacientes), 'RIPS debe incluir lista de pacientes')
  assert.ok(Array.isArray(ripsJson.procedimientos), 'RIPS debe incluir lista de procedimientos')
})
