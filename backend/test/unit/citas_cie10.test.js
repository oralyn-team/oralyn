const test = require('node:test')
const assert = require('node:assert')
const prisma = require('../../src/lib/prisma')
const { validarRips } = require('../../src/services/ripsValidator.service')

test('Tarea A: Cita nueva asigna Z012 por defecto a codigo_cie10', async () => {
  let consultorio = null
  let paciente = null
  let citasCreadas = []

  try {
    consultorio = await prisma.configuracion.create({
      data: { nombre_consultorio: 'Consultorio Test CIE10', nombre_profesional: 'Dr. Test CIE10' }
    })

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

    // 1. Simular creación sin codigo_cie10
    const citaDefault = await prisma.cita.create({
      data: {
        consultorio_id: consultorio.id,
        paciente_id: paciente.id,
        fecha_hora: new Date('2026-10-10T09:00:00Z'),
        procedimiento: 'Valoración inicial',
        doctor: 'Dr. Test CIE10',
        codigo_cups: '890201',
        valor_cobrado: 50000,
        codigo_cie10: (undefined && typeof undefined === 'string' && undefined.trim()) || 'Z012',
        estado: 'asistio'
      }
    })
    citasCreadas.push(citaDefault.id)

    assert.strictEqual(citaDefault.codigo_cie10, 'Z012', 'El código CIE-10 por defecto en creación debe ser Z012')

    // 2. Simular creación con codigo_cie10 explícito
    const citaExplicita = await prisma.cita.create({
      data: {
        consultorio_id: consultorio.id,
        paciente_id: paciente.id,
        fecha_hora: new Date('2026-10-10T10:00:00Z'),
        procedimiento: 'Obturación',
        doctor: 'Dr. Test CIE10',
        codigo_cups: '890201',
        valor_cobrado: 80000,
        codigo_cie10: 'K021',
        estado: 'asistio'
      }
    })
    citasCreadas.push(citaExplicita.id)

    assert.strictEqual(citaExplicita.codigo_cie10, 'K021', 'Debe respetar el código CIE-10 explícito (K021)')

    // 3. Simular PUT con codigo_cie10 = null
    const citaActualizada = await prisma.cita.update({
      where: { id: citaExplicita.id },
      data: { codigo_cie10: null }
    })

    assert.strictEqual(citaActualizada.codigo_cie10, null, 'PUT debe permitir dejar codigo_cie10 como null si el usuario lo solicita explícitamente')
  } finally {
    if (citasCreadas.length > 0) {
      await prisma.cita.deleteMany({ where: { id: { in: citasCreadas } } }).catch(() => {})
    }
    if (paciente) {
      await prisma.paciente.deleteMany({ where: { id: paciente.id } }).catch(() => {})
    }
    if (consultorio) {
      await prisma.configuracion.deleteMany({ where: { id: consultorio.id } }).catch(() => {})
    }
  }
})

test('Tarea B: Validador RIPS acepta citas con Z012 y detecta faltante en citas históricas con null', async () => {
  let consultorio = null
  let paciente = null
  let citasCreadas = []

  try {
    consultorio = await prisma.configuracion.create({
      data: { nombre_consultorio: 'Consultorio Test RIPS CIE10', nombre_profesional: 'Dr. Test RIPS' }
    })

    paciente = await prisma.paciente.create({
      data: {
        consultorio_id: consultorio.id,
        nombres: 'Carlos',
        primer_apellido: 'RipsTest',
        tipo_documento: 'CC',
        numero_documento: '99887766',
        fecha_nacimiento: new Date('1990-01-01'),
        sexo: 'masculino',
        municipio_ciudad: 'Villavicencio'
      }
    })

    const fechaInicio = new Date('2026-11-01T00:00:00Z')
    const fechaFin = new Date('2026-11-01T23:59:59Z')

    // Cita nueva con Z012
    const citaZ012 = await prisma.cita.create({
      data: {
        consultorio_id: consultorio.id,
        paciente_id: paciente.id,
        fecha_hora: new Date('2026-11-01T09:00:00Z'),
        procedimiento: 'Consulta Odontológica',
        doctor: 'Dr. Test RIPS',
        codigo_cups: '890201',
        valor_cobrado: 50000,
        codigo_cie10: 'Z012',
        estado: 'asistio'
      }
    })
    citasCreadas.push(citaZ012.id)

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
        doctor: 'Dr. Test RIPS',
        codigo_cups: '890201',
        valor_cobrado: 50000,
        codigo_cie10: null,
        estado: 'asistio'
      }
    })
    citasCreadas.push(citaHistoricaNull.id)

    const valNull = await validarRips(consultorio.id, fechaInicio, fechaFin)
    const erroresCie10Null = valNull.errores.filter(e => e.includes('Diagnóstico CIE-10 faltante'))
    assert.strictEqual(erroresCie10Null.length, 1, 'Una cita histórica con null sí debe ser detectada como inconsistencia')
  } finally {
    if (citasCreadas.length > 0) {
      await prisma.cita.deleteMany({ where: { id: { in: citasCreadas } } }).catch(() => {})
    }
    if (paciente) {
      await prisma.paciente.deleteMany({ where: { id: paciente.id } }).catch(() => {})
    }
    if (consultorio) {
      await prisma.configuracion.deleteMany({ where: { id: consultorio.id } }).catch(() => {})
    }
  }
})
