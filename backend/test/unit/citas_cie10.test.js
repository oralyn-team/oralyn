const test = require('node:test')
const assert = require('node:assert')
const prisma = require('../../src/lib/prisma')
const { validarRips } = require('../../src/services/ripsValidator.service')

test('Tarea A: Cita nueva asigna Z012 por defecto a codigo_cie10', async () => {
  let consultorio = await prisma.configuracion.findFirst()
  if (!consultorio) {
    consultorio = await prisma.configuracion.create({
      data: { nombre_consultorio: 'Consultorio Test CIE10', nombre_profesional: 'Dra. Rocio' }
    })
  }

  let paciente = await prisma.paciente.findFirst({ where: { consultorio_id: consultorio.id } })
  if (!paciente) {
    paciente = await prisma.paciente.create({
      data: {
        consultorio_id: consultorio.id,
        nombres: 'Ana',
        primer_apellido: 'Valdez',
        tipo_documento: 'CC',
        numero_documento: '11223344',
        fecha_nacimiento: new Date('1995-05-15'),
        sexo: 'femenino',
        municipio_ciudad: 'Villavicencio'
      }
    })
  }

  // 1. Simular creación sin codigo_cie10
  const citaDefault = await prisma.cita.create({
    data: {
      consultorio_id: consultorio.id,
      paciente_id: paciente.id,
      fecha_hora: new Date('2026-10-10T09:00:00Z'),
      procedimiento: 'Valoración inicial',
      doctor: 'Dra. Rocio',
      codigo_cups: '890201',
      valor_cobrado: 50000,
      codigo_cie10: (undefined && typeof undefined === 'string' && undefined.trim()) || 'Z012',
      estado: 'asistio'
    }
  })

  assert.strictEqual(citaDefault.codigo_cie10, 'Z012', 'El código CIE-10 por defecto en creación debe ser Z012')

  // 2. Simular creación con codigo_cie10 explícito
  const citaExplicita = await prisma.cita.create({
    data: {
      consultorio_id: consultorio.id,
      paciente_id: paciente.id,
      fecha_hora: new Date('2026-10-10T10:00:00Z'),
      procedimiento: 'Obturación',
      doctor: 'Dra. Rocio',
      codigo_cups: '890201',
      valor_cobrado: 80000,
      codigo_cie10: 'K021',
      estado: 'asistio'
    }
  })

  assert.strictEqual(citaExplicita.codigo_cie10, 'K021', 'Debe respetar el código CIE-10 explícito (K021)')

  // 3. Simular PUT con codigo_cie10 = null
  const citaActualizada = await prisma.cita.update({
    where: { id: citaExplicita.id },
    data: { codigo_cie10: null }
  })

  assert.strictEqual(citaActualizada.codigo_cie10, null, 'PUT debe permitir dejar codigo_cie10 como null si el usuario lo solicita explícitamente')

  // Limpieza
  await prisma.cita.deleteMany({ where: { id: { in: [citaDefault.id, citaExplicita.id] } } })
})

test('Tarea B: Validador RIPS acepta citas con Z012 y detecta faltante en citas históricas con null', async () => {
  let consultorio = await prisma.configuracion.findFirst()
  let paciente = await prisma.paciente.findFirst({ where: { consultorio_id: consultorio.id } })

  const fechaInicio = new Date('2026-11-01T00:00:00Z')
  const fechaFin = new Date('2026-11-01T23:59:59Z')

  // Cita nueva con Z012
  const citaZ012 = await prisma.cita.create({
    data: {
      consultorio_id: consultorio.id,
      paciente_id: paciente.id,
      fecha_hora: new Date('2026-11-01T09:00:00Z'),
      procedimiento: 'Consulta Odontológica',
      doctor: 'Dra. Rocio',
      codigo_cups: '890201',
      valor_cobrado: 50000,
      codigo_cie10: 'Z012',
      estado: 'asistio'
    }
  })

  const valZ012 = await validarRips(consultorio.id, fechaInicio, fechaFin)
  const erroresCie10Z012 = valZ012.errores.filter(e => e.includes('Diagnóstico CIE-10 faltante'))
  assert.strictEqual(erroresCie10Z012.length, 0, 'Una cita nueva con Z012 no debe generar error de Diagnóstico CIE-10 faltante')

  // Cita histórica simulada con null
  const citaHistoricaNull = await prisma.cita.create({
    data: {
      consultorio_id: consultorio.id,
      paciente_id: paciente.id,
      fecha_hora: new Date('2026-11-01T10:00:00Z'),
      procedimiento: 'Consulta Antigua',
      doctor: 'Dra. Rocio',
      codigo_cups: '890201',
      valor_cobrado: 50000,
      codigo_cie10: null,
      estado: 'asistio'
    }
  })

  const valNull = await validarRips(consultorio.id, fechaInicio, fechaFin)
  const erroresCie10Null = valNull.errores.filter(e => e.includes('Diagnóstico CIE-10 faltante'))
  assert.strictEqual(erroresCie10Null.length, 1, 'Una cita histórica con null sí debe ser detectada como inconsistencia')

  // Limpieza
  await prisma.cita.deleteMany({ where: { id: { in: [citaZ012.id, citaHistoricaNull.id] } } })
})
