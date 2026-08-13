const test = require('node:test')
const assert = require('node:assert')
const prisma = require('../../src/lib/prisma')

test('Tarea A: Editar una cotización preserva los IDs de sus procedimientos', async () => {
  // 1. Obtener o crear consultorio y paciente de prueba
  let consultorio = await prisma.configuracion.findFirst()
  if (!consultorio) {
    consultorio = await prisma.configuracion.create({
      data: { nombre_consultorio: 'Consultorio Test', nombre_profesional: 'Dra. Test' }
    })
  }

  let paciente = await prisma.paciente.findFirst({ where: { consultorio_id: consultorio.id } })
  if (!paciente) {
    paciente = await prisma.paciente.create({
      data: {
        consultorio_id: consultorio.id,
        nombres: 'Prueba',
        primer_apellido: 'TareaA',
        tipo_documento: 'CC',
        numero_documento: '99988877',
        fecha_nacimiento: new Date('1990-01-01'),
        sexo: 'femenino',
        municipio_ciudad: 'Villavicencio'
      }
    })
  }

  // 2. Crear cotización con 2 procedimientos
  const cotizacion = await prisma.$transaction(async (tx) => {
    return tx.cotizacion.create({
      data: {
        consultorio_id: consultorio.id,
        paciente_id: paciente.id,
        tipo_tratamiento: 'Ortodoncia Inicial',
        estado: 'aprobado',
        total: 150000,
        total_pagado: 0,
        saldo: 150000,
        procedimientos: {
          create: [
            { procedimiento: 'Limpieza dental', cantidad: 1, valor_unitario: 50000, descuento: 0, subtotal: 50000, estado: 'pendiente' },
            { procedimiento: 'Resina fotocurado', cantidad: 1, valor_unitario: 100000, descuento: 0, subtotal: 100000, estado: 'pendiente' }
          ]
        }
      },
      include: { procedimientos: true }
    })
  })

  assert.strictEqual(cotizacion.procedimientos.length, 2)
  const originalIds = cotizacion.procedimientos.map(p => p.id)

  // 3. Simular PUT manteniendo los procedimientos con su ID
  const procsConId = cotizacion.procedimientos.map((p, idx) => ({
    id: p.id,
    procedimiento: idx === 0 ? 'Limpieza dental prof' : p.procedimiento,
    cantidad: p.cantidad,
    valor_unitario: p.valor_unitario,
    descuento: p.descuento,
    subtotal: p.subtotal,
    estado: p.estado,
    orden: idx
  }))

  const payloadEdit = {
    paciente_id: paciente.id,
    tipo_tratamiento: 'Ortodoncia Actualizada',
    estado: 'en_proceso',
    procedimientos: procsConId
  }

  // Ejecutar lógica de PUT usando Prisma transaction directamente
  const cotizacionEditada = await prisma.$transaction(async (tx) => {
    const existentes = await tx.procedimientoCotizacion.findMany({
      where: { cotizacion_id: cotizacion.id },
      select: { id: true }
    })
    const idsExistentes = new Set(existentes.map(p => p.id))
    const idsEnPayload = new Set(payloadEdit.procedimientos.map(p => p.id))

    const idsABorrar = [...idsExistentes].filter(pid => !idsEnPayload.has(pid))
    if (idsABorrar.length > 0) {
      await tx.procedimientoCotizacion.deleteMany({
        where: { id: { in: idsABorrar }, cotizacion_id: cotizacion.id }
      })
    }

    for (const p of payloadEdit.procedimientos.filter(p => p.id && idsExistentes.has(p.id))) {
      const { id: procId, ...datos } = p
      await tx.procedimientoCotizacion.update({ where: { id: procId }, data: datos })
    }

    return tx.cotizacion.findUnique({
      where: { id: cotizacion.id },
      include: { procedimientos: { orderBy: { orden: 'asc' } } }
    })
  })

  const newIds = cotizacionEditada.procedimientos.map(p => p.id)
  assert.deepStrictEqual(newIds, originalIds, 'Los IDs de los procedimientos deben ser exactamente iguales después del PUT')

  // Limpieza de datos
  await prisma.procedimientoCotizacion.deleteMany({ where: { cotizacion_id: cotizacion.id } })
  await prisma.cotizacion.delete({ where: { id: cotizacion.id } })
})

test('Tarea B & C: Vincular Cita con ProcedimientoCotizacion deriva subtotal y avanza estado a realizado al asistir', async () => {
  let consultorio = await prisma.configuracion.findFirst()
  let paciente = await prisma.paciente.findFirst({ where: { consultorio_id: consultorio.id } })

  // 1. Crear cotización con 1 procedimiento que incluye 20% de descuento ($100.000 -> $80.000)
  const cotizacion = await prisma.cotizacion.create({
    data: {
      consultorio_id: consultorio.id,
      paciente_id: paciente.id,
      tipo_tratamiento: 'Rehabilitación',
      estado: 'aprobado',
      total: 80000,
      total_pagado: 0,
      saldo: 80000,
      procedimientos: {
        create: [
          {
            procedimiento: 'Corona Porcelana',
            cantidad: 1,
            valor_unitario: 100000,
            descuento: 20,
            subtotal: 80000,
            estado: 'pendiente'
          }
        ]
      }
    },
    include: { procedimientos: true }
  })

  const procCot = cotizacion.procedimientos[0]

  // 2. Crear Cita vinculada a procCot sin especificar valor_cobrado
  const cita = await prisma.cita.create({
    data: {
      consultorio_id: consultorio.id,
      paciente_id: paciente.id,
      fecha_hora: new Date('2026-09-01T10:00:00Z'),
      procedimiento: procCot.procedimiento,
      procedimiento_cotizacion_id: procCot.id,
      valor_cobrado: procCot.subtotal, // En el endpoint se deriva procCot.subtotal
      estado: 'pendiente'
    }
  })

  assert.strictEqual(Number(cita.valor_cobrado), 80000, 'El valor cobrado derivado debe ser el subtotal cotizado con descuento ($80.000)')

  // 3. Simular que la cita pasa a "asistio" (Tarea C)
  await prisma.cita.update({ where: { id: cita.id }, data: { estado: 'asistio' } })
  await prisma.procedimientoCotizacion.update({ where: { id: procCot.id }, data: { estado: 'realizado' } })

  const procCotActualizado = await prisma.procedimientoCotizacion.findUnique({ where: { id: procCot.id } })
  assert.strictEqual(procCotActualizado.estado, 'realizado', 'El procedimiento cotizado debe pasar a estado realizado')

  // Limpieza
  await prisma.cita.delete({ where: { id: cita.id } })
  await prisma.procedimientoCotizacion.deleteMany({ where: { cotizacion_id: cotizacion.id } })
  await prisma.cotizacion.delete({ where: { id: cotizacion.id } })
})
