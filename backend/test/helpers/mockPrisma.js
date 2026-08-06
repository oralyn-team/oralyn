function createCotizacionesPrismaMock() {
  const db = {
    pacientes: [
      {
        id: 1,
        consultorio_id: 10,
        nombres: 'Ana',
        primer_apellido: 'Paz',
        segundo_apellido: null,
        tipo_documento: 'CC',
        numero_documento: '123',
        telefono: '3001234567'
      },
      {
        id: 2,
        consultorio_id: 99,
        nombres: 'Luis',
        primer_apellido: 'Roa',
        segundo_apellido: null,
        tipo_documento: 'CC',
        numero_documento: '999',
        telefono: null
      }
    ],
    cotizaciones: [],
    procedimientos: [],
    pagos: [],
    nextCotizacionId: 1,
    nextProcedimientoId: 1,
    nextPagoId: 1
  }

  function matchesWhere(row, where = {}) {
    return Object.entries(where).every(([key, expected]) => {
      if (expected && typeof expected === 'object' && 'not' in expected) {
        return row[key] !== expected.not
      }
      if (expected && typeof expected === 'object' && 'in' in expected) {
        return expected.in.includes(row[key])
      }
      return row[key] === expected
    })
  }

  function applySelect(row, select) {
    if (!row || !select) return row
    return Object.fromEntries(Object.keys(select).map((key) => [key, row[key]]))
  }

  function includeCotizacion(cotizacion, include) {
    if (!cotizacion) return null

    const result = { ...cotizacion }

    if (include?.paciente) {
      result.paciente = db.pacientes.find((p) => p.id === cotizacion.paciente_id) || null
    }

    if (include?.procedimientos) {
      result.procedimientos = db.procedimientos
        .filter((p) => p.cotizacion_id === cotizacion.id)
        .sort((a, b) => (a.orden || 0) - (b.orden || 0))
    }

    if (include?.pagos) {
      result.pagos = db.pagos
        .filter((p) => p.cotizacion_id === cotizacion.id)
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    }

    return result
  }

  function createProcedimientos(cotizacionId, procedimientos = []) {
    procedimientos.forEach((p) => {
      db.procedimientos.push({
        id: db.nextProcedimientoId++,
        cotizacion_id: cotizacionId,
        ...p
      })
    })
  }

  const prisma = {
    __db: db,
    paciente: {
      findFirst: async ({ where }) => db.pacientes.find((p) => matchesWhere(p, where)) || null
    },
    cotizacion: {
      create: async ({ data, include }) => {
        const { procedimientos, pagos, ...cotizacionData } = data
        const cotizacion = {
          id: db.nextCotizacionId++,
          fecha: new Date('2026-07-02T12:00:00.000Z'),
          creado_en: new Date('2026-07-02T12:00:00.000Z'),
          actualizado_en: new Date('2026-07-02T12:00:00.000Z'),
          ...cotizacionData
        }

        db.cotizaciones.push(cotizacion)
        createProcedimientos(cotizacion.id, procedimientos?.create)
        if (pagos?.create) {
          pagos.create.forEach((p) => db.pagos.push({ id: db.nextPagoId++, cotizacion_id: cotizacion.id, ...p }))
        }

        return includeCotizacion(cotizacion, include)
      },
      findMany: async ({ where, include, orderBy, select } = {}) => {
        let rows = db.cotizaciones.filter((c) => matchesWhere(c, where))
        if (orderBy?.fecha === 'desc') rows = rows.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        return rows.map((c) => applySelect(includeCotizacion(c, include), select))
      },
      findFirst: async ({ where, include, select } = {}) => {
        const row = db.cotizaciones.find((c) => matchesWhere(c, where))
        return applySelect(includeCotizacion(row, include), select)
      },
      findUnique: async ({ where, include, select } = {}) => {
        const row = db.cotizaciones.find((c) => c.id === where.id)
        return applySelect(includeCotizacion(row, include), select)
      },
      update: async ({ where, data }) => {
        const index = db.cotizaciones.findIndex((c) => c.id === where.id)
        if (index < 0) {
          const error = new Error('Record not found')
          error.code = 'P2025'
          throw error
        }

        const { procedimientos, ...cotizacionData } = data
        db.cotizaciones[index] = {
          ...db.cotizaciones[index],
          ...cotizacionData,
          actualizado_en: new Date('2026-07-02T12:30:00.000Z')
        }
        createProcedimientos(where.id, procedimientos?.create)
        return includeCotizacion(db.cotizaciones[index], undefined)
      },
      delete: async ({ where }) => {
        const index = db.cotizaciones.findIndex((c) => c.id === where.id)
        if (index < 0) throw new Error('Record not found')
        const [deleted] = db.cotizaciones.splice(index, 1)
        db.procedimientos = db.procedimientos.filter((p) => p.cotizacion_id !== where.id)
        db.pagos = db.pagos.filter((p) => p.cotizacion_id !== where.id)
        return deleted
      }
    },
    procedimientoCotizacion: {
      deleteMany: async ({ where }) => {
        const before = db.procedimientos.length
        db.procedimientos = db.procedimientos.filter((p) => p.cotizacion_id !== where.cotizacion_id)
        return { count: before - db.procedimientos.length }
      }
    },
    pago: {
      create: async ({ data }) => {
        const pago = {
          id: db.nextPagoId++,
          fecha: new Date('2026-07-02T13:00:00.000Z'),
          creado_en: new Date('2026-07-02T13:00:00.000Z'),
          ...data
        }
        db.pagos.push(pago)
        return pago
      },
      findMany: async ({ where, select } = {}) => {
        const rows = db.pagos.filter((p) => matchesWhere(p, where))
        if (!select) return rows
        return rows.map((row) => Object.fromEntries(Object.keys(select).map((key) => [key, row[key]])))
      },
      createMany: async ({ data }) => {
        data.forEach((p) => db.pagos.push({ id: db.nextPagoId++, ...p }))
        return { count: data.length }
      },
      deleteMany: async ({ where }) => {
        const before = db.pagos.length
        db.pagos = db.pagos.filter((p) => !matchesWhere(p, where))
        return { count: before - db.pagos.length }
      }
    },
    $transaction: async (callback) => callback(prisma)
  }

  return prisma
}

module.exports = { createCotizacionesPrismaMock }
