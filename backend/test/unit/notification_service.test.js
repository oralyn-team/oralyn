const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('path')

// Mocks para testing aislado de notification.service.js
let mockNotificaciones = []
let mockCitas = []
let mockPacientes = []

const mockPrisma = {
  cita: {
    findFirst: async ({ where }) => {
      const c = mockCitas.find(item => item.id === where.id && item.consultorio_id === where.consultorio_id)
      if (!c) return null
      const paciente = mockPacientes.find(p => p.id === c.paciente_id)
      return {
        ...c,
        paciente,
        consultorio: { id: c.consultorio_id, nombre_consultorio: 'Consultorio Test', direccion: 'Calle 123', telefono: '3001112233' },
        profesional: c.profesional_id ? { id: c.profesional_id, nombre_completo: 'Dr. Test' } : null
      }
    },
    findMany: async ({ where }) => {
      return mockCitas.filter(c => {
        if (where.estado && where.estado.not && c.estado === where.estado.not) return false
        if (where.fecha_hora) {
          const f = new Date(c.fecha_hora).getTime()
          if (where.fecha_hora.gte && f < new Date(where.fecha_hora.gte).getTime()) return false
          if (where.fecha_hora.lte && f > new Date(where.fecha_hora.lte).getTime()) return false
        }
        return true
      }).map(c => {
        const paciente = mockPacientes.find(p => p.id === c.paciente_id)
        const notifs = mockNotificaciones.filter(n => n.cita_id === c.id)
        return {
          ...c,
          paciente,
          consultorio: { id: c.consultorio_id, nombre_consultorio: 'Consultorio Test', direccion: 'Calle 123', telefono: '3001112233' },
          profesional: c.profesional_id ? { id: c.profesional_id, nombre_completo: 'Dr. Test' } : null,
          notificaciones: notifs
        }
      })
    }
  },
  notificacion: {
    findUnique: async ({ where }) => {
      if (where.cita_id_tipo_canal) {
        return mockNotificaciones.find(n =>
          n.cita_id === where.cita_id_tipo_canal.cita_id &&
          n.tipo === where.cita_id_tipo_canal.tipo &&
          n.canal === where.cita_id_tipo_canal.canal
        ) || null
      }
      return null
    },
    create: async ({ data }) => {
      const existe = mockNotificaciones.find(n => n.cita_id === data.cita_id && n.tipo === data.tipo && n.canal === data.canal)
      if (existe) {
        const err = new Error('Unique constraint failed')
        err.code = 'P2002'
        throw err
      }
      const item = {
        id: `notif-${mockNotificaciones.length + 1}`,
        ...data,
        creado_en: new Date()
      }
      mockNotificaciones.push(item)
      return item
    },
    update: async ({ where, data }) => {
      const item = mockNotificaciones.find(n => n.id === where.id)
      if (item) {
        Object.assign(item, data)
      }
      return item
    },
    deleteMany: async ({ where }) => {
      const countBefore = mockNotificaciones.length
      mockNotificaciones = mockNotificaciones.filter(n => !(n.cita_id === where.cita_id && n.tipo === where.tipo && n.canal === where.canal))
      return { count: countBefore - mockNotificaciones.length }
    }
  }
}

// Inyectar mockPrisma en require cache
const prismaPath = path.resolve(__dirname, '..', '..', 'src', 'lib', 'prisma.js')
require.cache[prismaPath] = {
  id: prismaPath,
  filename: prismaPath,
  loaded: true,
  exports: mockPrisma
}

const {
  enviarNotificacionConfirmacionCita,
  procesarRecordatoriosProximos,
  resetearRecordatorioPorReprogramacion
} = require('../../src/services/notification.service')

test('Notification Service: confirmación de cita para paciente con email habilitado', async () => {
  mockNotificaciones = []
  mockPacientes = [{ id: 1, nombres: 'Ana', primer_apellido: 'García', correo: 'ana@example.com', notificaciones_email: true }]
  mockCitas = [{ id: 10, consultorio_id: 1, paciente_id: 1, fecha_hora: new Date('2026-10-20T10:00:00Z'), estado: 'pendiente', doctor: 'Dr. Test' }]

  const res = await enviarNotificacionConfirmacionCita(10, 1)
  assert.equal(res.status, 'enviado')

  const notif = mockNotificaciones.find(n => n.cita_id === 10 && n.tipo === 'confirmacion_cita')
  assert.ok(notif)
  assert.equal(notif.estado, 'enviado')
})

test('Notification Service: omite confirmación si paciente no tiene email o desactivó notificaciones', async () => {
  mockNotificaciones = []
  mockPacientes = [
    { id: 2, nombres: 'Carlos', primer_apellido: 'López', correo: null, notificaciones_email: true },
    { id: 3, nombres: 'María', primer_apellido: 'Rojas', correo: 'maria@example.com', notificaciones_email: false }
  ]
  mockCitas = [
    { id: 11, consultorio_id: 1, paciente_id: 2, fecha_hora: new Date(), estado: 'pendiente' },
    { id: 12, consultorio_id: 1, paciente_id: 3, fecha_hora: new Date(), estado: 'pendiente' }
  ]

  const res1 = await enviarNotificacionConfirmacionCita(11, 1)
  assert.equal(res1.status, 'skipped')

  const res2 = await enviarNotificacionConfirmacionCita(12, 1)
  assert.equal(res2.status, 'skipped')
  assert.equal(mockNotificaciones.length, 0)
})

test('Notification Service: recordatorio a ~24h y prevención estricta de duplicados', async () => {
  mockNotificaciones = []
  const ahora = new Date('2026-09-30T10:00:00Z')
  const fechaCita24h = new Date(ahora.getTime() + 24 * 60 * 60 * 1000)

  mockPacientes = [{ id: 4, nombres: 'Juan', primer_apellido: 'Pérez', correo: 'juan@example.com', notificaciones_email: true }]
  mockCitas = [{ id: 20, consultorio_id: 1, paciente_id: 4, fecha_hora: fechaCita24h, estado: 'pendiente' }]

  // Primera corrida del scheduler
  const stats1 = await procesarRecordatoriosProximos({ ahora })
  assert.equal(stats1.procesadas, 1)
  assert.equal(stats1.enviadas, 1)

  // Verificar que quedó guardado en BD como 'enviado'
  const notif = mockNotificaciones.find(n => n.cita_id === 20 && n.tipo === 'recordatorio_cita')
  assert.ok(notif)
  assert.equal(notif.estado, 'enviado')

  // Segunda corrida inmediata (misma cita) -> debe ignorar por idenpotencia
  const stats2 = await procesarRecordatoriosProximos({ ahora })
  assert.equal(stats2.procesadas, 1)
  assert.equal(stats2.enviadas, 0)
  assert.equal(stats2.omitidas, 1)
})

test('Notification Service: ignora citas canceladas en recordatorios', async () => {
  mockNotificaciones = []
  const ahora = new Date('2026-09-30T10:00:00Z')
  const fechaCita24h = new Date(ahora.getTime() + 24 * 60 * 60 * 1000)

  mockPacientes = [{ id: 5, nombres: 'Luis', primer_apellido: 'Mendoza', correo: 'luis@example.com', notificaciones_email: true }]
  mockCitas = [{ id: 21, consultorio_id: 1, paciente_id: 5, fecha_hora: fechaCita24h, estado: 'cancelada' }]

  const stats = await procesarRecordatoriosProximos({ ahora })
  assert.equal(stats.enviadas, 0)
})

test('Notification Service: reprogramación de cita invalida recordatorio previo', async () => {
  mockNotificaciones = [
    { id: 'n1', consultorio_id: 1, paciente_id: 6, cita_id: 30, tipo: 'recordatorio_cita', canal: 'email', estado: 'enviado' }
  ]

  assert.equal(mockNotificaciones.length, 1)
  await resetearRecordatorioPorReprogramacion(30)
  assert.equal(mockNotificaciones.length, 0)
})
