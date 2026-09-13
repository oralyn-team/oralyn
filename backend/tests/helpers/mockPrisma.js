const prisma = require('../../src/lib/prisma')

const store = {
  insumos: [],
  movimientos: []
}

function resetStore() {
  store.insumos = []
  store.movimientos = []
}

prisma.insumo = {
  async create({ data }) {
    const newInsumo = {
      id: 'cuid_' + Math.random().toString(36).substr(2, 9),
      activo: data.activo !== undefined ? Boolean(data.activo) : true,
      creado_en: new Date(),
      actualizado_en: new Date(),
      ...data,
      cantidad_actual: Number(data.cantidad_actual),
      stock_minimo: Number(data.stock_minimo)
    }
    store.insumos.push(newInsumo)
    return { ...newInsumo }
  },

  async findMany({ where = {}, orderBy = {} } = {}) {
    let result = store.insumos.filter(item => {
      if (where.consultorio_id !== undefined && item.consultorio_id !== where.consultorio_id) return false
      if (where.activo !== undefined && item.activo !== where.activo) return false
      if (where.id !== undefined && item.id !== where.id) return false
      return true
    })

    if (orderBy.nombre === 'asc') {
      result.sort((a, b) => a.nombre.localeCompare(b.nombre))
    }
    return result.map(i => ({ ...i }))
  },

  async findFirst({ where = {}, include = {} } = {}) {
    const item = store.insumos.find(i => {
      if (where.id !== undefined && i.id !== where.id) return false
      if (where.consultorio_id !== undefined && i.consultorio_id !== where.consultorio_id) return false
      if (where.activo !== undefined && i.activo !== where.activo) return false
      return true
    })

    if (!item) return null
    const clone = { ...item }

    if (include.movimientos) {
      let movs = store.movimientos.filter(m => m.insumo_id === item.id)
      if (include.movimientos.orderBy && include.movimientos.orderBy.fecha === 'desc') {
        movs.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      }
      clone.movimientos = movs.map(m => ({ ...m }))
    }

    return clone
  },

  async update({ where, data }) {
    const idx = store.insumos.findIndex(i => i.id === where.id)
    if (idx === -1) {
      const err = new Error('Record not found')
      err.code = 'P2025'
      throw err
    }
    const updated = {
      ...store.insumos[idx],
      ...data,
      actualizado_en: new Date()
    }
    store.insumos[idx] = updated
    return { ...updated }
  }
}

prisma.movimientoInsumo = {
  async create({ data }) {
    const newMov = {
      id: 'mov_' + Math.random().toString(36).substr(2, 9),
      fecha: new Date(),
      ...data,
      cantidad: Number(data.cantidad)
    }
    store.movimientos.push(newMov)
    return { ...newMov }
  }
}

prisma.$transaction = async (callback) => {
  const snapshotInsumos = JSON.parse(JSON.stringify(store.insumos))
  const snapshotMovimientos = JSON.parse(JSON.stringify(store.movimientos))

  try {
    const result = await callback(prisma)
    return result
  } catch (err) {
    store.insumos = snapshotInsumos.map(i => ({
      ...i,
      fecha_vencimiento: i.fecha_vencimiento ? new Date(i.fecha_vencimiento) : null,
      fecha_apertura: i.fecha_apertura ? new Date(i.fecha_apertura) : null,
      creado_en: new Date(i.creado_en),
      actualizado_en: new Date(i.actualizado_en)
    }))
    store.movimientos = snapshotMovimientos.map(m => ({ ...m, fecha: new Date(m.fecha) }))
    throw err
  }
}

module.exports = {
  prisma,
  store,
  resetStore
}
