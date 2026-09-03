const express = require('express')
const prisma = require('../lib/prisma')
const verificarToken = require('../middlewares/auth')
const { requirePermission, restrictSuperadminClinicalAccess } = require('../middlewares/rbac')
const { PERMISSIONS } = require('../lib/permissions')
const { registrarAuditoria, calcularDiferencias } = require('../services/audit.service')

const router = express.Router()
router.use(verificarToken)
router.use(restrictSuperadminClinicalAccess) // Restringe al SUPERADMIN de acceder a datos de pacientes

// POST /api/pacientes — crear paciente
router.post('/', requirePermission(PERMISSIONS.PATIENTS_CREATE), async (req, res) => {
  const {
    primer_apellido, segundo_apellido, nombres,
    tipo_documento, numero_documento, fecha_nacimiento,
    sexo, estado_civil, direccion_residencia, telefono,
    correo, departamento, municipio_ciudad, ocupacion,
    rh, clase_seguro, asegurador, rango_salarial,
    tipo_vinculacion, nombre_empresa,
    acudiente_nombre, acudiente_parentesco, acudiente_telefono
  } = req.body

  const trimmedDoc = numero_documento ? String(numero_documento).trim() : ''
  const trimmedApellido = primer_apellido ? String(primer_apellido).trim() : ''
  const trimmedNombres = nombres ? String(nombres).trim() : ''
  const trimmedTipoDoc = tipo_documento ? String(tipo_documento).trim() : ''
  const trimmedSexo = sexo ? String(sexo).trim() : ''
  const trimmedMunicipio = municipio_ciudad ? String(municipio_ciudad).trim() : ''

  if (!trimmedApellido || !trimmedNombres || !trimmedTipoDoc || !trimmedDoc || !fecha_nacimiento || !trimmedSexo || !trimmedMunicipio) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' })
  }

  const tiposValidos = ['CC', 'CE', 'TI', 'RC', 'PEP', 'PPT', 'PAS']
  if (!tiposValidos.includes(trimmedTipoDoc)) {
    return res.status(400).json({ error: 'Tipo de documento no válido' })
  }

  const fechaParsed = new Date(fecha_nacimiento)
  if (isNaN(fechaParsed.getTime())) {
    return res.status(400).json({ error: 'Fecha de nacimiento inválida' })
  }

  try {
    const existe = await prisma.paciente.findFirst({
      where: {
        consultorio_id: req.usuario.consultorio_id,
        numero_documento: trimmedDoc
      }
    })

    if (existe) {
      return res.status(400).json({ error: 'Ya existe un paciente con ese documento' })
    }

    const paciente = await prisma.$transaction(async (tx) => {
      const nuevoPaciente = await tx.paciente.create({
        data: {
          consultorio_id: req.usuario.consultorio_id,
          primer_apellido: trimmedApellido,
          segundo_apellido,
          nombres: trimmedNombres,
          tipo_documento: trimmedTipoDoc,
          numero_documento: trimmedDoc,
          fecha_nacimiento: new Date(fecha_nacimiento),
          sexo,
          estado_civil,
          direccion_residencia,
          telefono,
          correo,
          departamento,
          municipio_ciudad: trimmedMunicipio,
          ocupacion,
          rh,
          clase_seguro,
          asegurador,
          rango_salarial,
          tipo_vinculacion,
          nombre_empresa,
          acudiente_nombre,
          acudiente_parentesco,
          acudiente_telefono,
          activo: true
        }
      })

      await tx.historiaClinica.create({
        data: {
          paciente_id: nuevoPaciente.id,
          motivo_consulta: 'Valoración inicial',
          diagnostico: 'Pendiente por registrar',
          tratamiento_realizado: null,
          medicamentos_actuales: null,
          antecedentes_odontologicos: null,
          evento_adverso: false,
          evento_adverso_obs: null,
          habitos_json: null,
          habitos_observaciones: null,
          observaciones: null,
          recomendaciones: null,
          firma_doctor: null,
          firma_paciente: null
        }
      })

      return nuevoPaciente
    })

    await registrarAuditoria({
      req,
      accion: 'CREAR_PACIENTE',
      modulo: 'Pacientes',
      recurso_id: paciente.id,
      detalles: `Paciente ${paciente.nombres} ${paciente.primer_apellido} (${paciente.tipo_documento} ${paciente.numero_documento}) creado`
    })

    res.status(201).json(paciente)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

function mapPacienteSummary(p, ahora = new Date()) {
  const citasPasadas = (p.citas || []).filter(c => new Date(c.fecha_hora) <= ahora)
  const citasFuturas = (p.citas || []).filter(c => new Date(c.fecha_hora) > ahora && c.estado === 'pendiente')

  const tieneCitasPasadas = citasPasadas.length > 0
  const totalSaldoPendiente = (p.cotizaciones || []).reduce((sum, c) => sum + Number(c.saldo ?? 0), 0)
  const tieneSaldo = totalSaldoPendiente > 0
  const tratamientosPendientes = (p.cotizaciones || []).filter(c => Number(c.saldo ?? 0) > 0).length

  let estado = 'Nuevo'
  if (tieneCitasPasadas && tieneSaldo) estado = 'Pendiente'
  else if (tieneCitasPasadas && !tieneSaldo) estado = 'Al día'

  const ultimaCitaPasada = citasPasadas[0]
  const ultimaVisita = ultimaCitaPasada?.fecha_hora
    ? new Date(ultimaCitaPasada.fecha_hora).toISOString().split('T')[0]
    : null

  const proximaCitaObj = citasFuturas.sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora))[0]
  const proximaCita = proximaCitaObj?.fecha_hora
    ? new Date(proximaCitaObj.fecha_hora).toISOString()
    : null

  return {
    id: p.id,
    primer_apellido: p.primer_apellido,
    segundo_apellido: p.segundo_apellido,
    nombres: p.nombres,
    tipo_documento: p.tipo_documento,
    numero_documento: p.numero_documento,
    fecha_nacimiento: p.fecha_nacimiento
      ? new Date(p.fecha_nacimiento).toISOString().split('T')[0]
      : null,
    sexo: p.sexo,
    telefono: p.telefono,
    correo: p.correo,
    municipio_ciudad: p.municipio_ciudad,
    creado_en: p.creado_en,
    ultimaVisita,
    estado,
    saldoPendiente: totalSaldoPendiente,
    tratamientosPendientes,
    citasPendientes: citasFuturas.length,
    proximaCita,
  }
}

// GET /api/pacientes — listar (con paginación opcional)
router.get('/', requirePermission(PERMISSIONS.PATIENTS_READ), async (req, res) => {
  try {
    const { page, limit, q } = req.query
    const ahora = new Date()
    const where = { consultorio_id: req.usuario.consultorio_id, activo: true }

    if (q && q.trim()) {
      where.OR = [
        { nombres: { contains: q.trim(), mode: 'insensitive' } },
        { primer_apellido: { contains: q.trim(), mode: 'insensitive' } },
        { numero_documento: { contains: q.trim(), mode: 'insensitive' } },
      ]
    }

    const select = {
      id: true,
      primer_apellido: true,
      segundo_apellido: true,
      nombres: true,
      tipo_documento: true,
      numero_documento: true,
      fecha_nacimiento: true,
      sexo: true,
      telefono: true,
      correo: true,
      municipio_ciudad: true,
      creado_en: true,
      citas: {
        select: { id: true, fecha_hora: true, estado: true },
        orderBy: { fecha_hora: 'desc' },
      },
      cotizaciones: {
        where: { estado: { not: 'cancelado' } },
        select: { id: true, total: true, saldo: true, estado: true }
      },
      pagos: {
        select: { monto: true }
      }
    }

    if (page || limit) {
      const pageNum = Math.max(1, parseInt(page) || 1)
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20))

      const [total, items] = await Promise.all([
        prisma.paciente.count({ where }),
        prisma.paciente.findMany({
          where,
          orderBy: { primer_apellido: 'asc' },
          select,
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
        })
      ])

      const resultado = items.map(p => mapPacienteSummary(p, ahora))
      return res.json({
        data: resultado,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      })
    }

    const pacientes = await prisma.paciente.findMany({
      where,
      orderBy: { primer_apellido: 'asc' },
      select
    })

    const resultado = pacientes.map(p => mapPacienteSummary(p, ahora))
    res.json(resultado)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/pacientes/buscar?q= — buscar por nombre o documento
router.get('/buscar', requirePermission(PERMISSIONS.PATIENTS_READ), async (req, res) => {
  const { q } = req.query

  if (!q || q.trim() === '') {
    return res.status(400).json({ error: 'Escribe algo para buscar' })
  }

  try {
    const pacientes = await prisma.paciente.findMany({
      where: {
        consultorio_id: req.usuario.consultorio_id,
        activo: true,
        OR: [
          { nombres: { contains: q, mode: 'insensitive' } },
          { primer_apellido: { contains: q, mode: 'insensitive' } },
          { numero_documento: { contains: q, mode: 'insensitive' } }
        ]
      },
      orderBy: { primer_apellido: 'asc' },
      select: {
        id: true,
        primer_apellido: true,
        segundo_apellido: true,
        nombres: true,
        tipo_documento: true,
        numero_documento: true,
        telefono: true,
        municipio_ciudad: true
      }
    })

    res.json(pacientes)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/pacientes/:id — ver uno completo
router.get('/:id', requirePermission(PERMISSIONS.PATIENTS_READ), async (req, res) => {
  const id = parseInt(req.params.id)

  try {
    const paciente = await prisma.paciente.findFirst({
      where: { id, consultorio_id: req.usuario.consultorio_id, activo: true },
      include: {
        historias: { orderBy: { fecha_atencion: 'desc' }, take: 5 },
        citas:     { orderBy: { fecha_hora: 'desc' },     take: 5 }
      }
    })

    if (!paciente) {
      return res.status(404).json({ error: 'Paciente no encontrado' })
    }

    res.json(paciente)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// PUT /api/pacientes/:id — editar
router.put('/:id', requirePermission(PERMISSIONS.PATIENTS_UPDATE), async (req, res) => {
  const id = parseInt(req.params.id)
  const { historias, citas, creado_en, id: bodyId, ...datos } = req.body

  if (datos.fecha_nacimiento) {
    datos.fecha_nacimiento = new Date(datos.fecha_nacimiento)
  }

  try {
    const pacienteExistente = await prisma.paciente.findFirst({
      where: { id, consultorio_id: req.usuario.consultorio_id, activo: true }
    })

    if (!pacienteExistente) {
      return res.status(404).json({ error: 'Paciente no encontrado' })
    }

    delete datos.consultorio_id

    const paciente = await prisma.paciente.update({
      where: { id },
      data: datos
    })

    const diferencias = calcularDiferencias(pacienteExistente, paciente, [
      'nombres', 'primer_apellido', 'segundo_apellido', 'telefono', 'correo', 'direccion_residencia'
    ])

    await registrarAuditoria({
      req,
      accion: 'ACTUALIZAR_PACIENTE',
      modulo: 'Pacientes',
      recurso_id: paciente.id,
      detalles: `Paciente ${paciente.nombres} ${paciente.primer_apellido} actualizado`,
      metadata: { cambios: diferencias }
    })

    res.json(paciente)
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Paciente no encontrado' })
    }
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// DELETE /api/pacientes/:id — eliminación lógica de paciente
router.delete('/:id', requirePermission(PERMISSIONS.PATIENTS_DELETE), async (req, res) => {
  const id = parseInt(req.params.id)

  try {
    const paciente = await prisma.paciente.findFirst({
      where: { id, consultorio_id: req.usuario.consultorio_id, activo: true }
    })

    if (!paciente) {
      return res.status(404).json({ error: 'Paciente no encontrado' })
    }

    // Preferir eliminación lógica para no comprometer la trazabilidad histórica de citas/facturas
    await prisma.paciente.update({
      where: { id },
      data: { activo: false }
    })

    await registrarAuditoria({
      req,
      accion: 'ELIMINAR_PACIENTE',
      modulo: 'Pacientes',
      recurso_id: paciente.id,
      detalles: `Desactivación / eliminación lógica del paciente ${paciente.nombres} ${paciente.primer_apellido}`
    })

    res.status(200).json({ message: 'Paciente eliminado correctamente' })
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Paciente no encontrado' })
    }
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

module.exports = router