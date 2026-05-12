const express = require('express')
const prisma = require('../lib/prisma')
const verificarToken = require('../middlewares/auth')

const router = express.Router()

// Todas las rutas requieren token
router.use(verificarToken)

// POST /api/pacientes — crear paciente
router.post('/', async (req, res) => {
  const {
    primer_apellido, segundo_apellido, nombres,
    tipo_documento, numero_documento, fecha_nacimiento,
    sexo, estado_civil, direccion_residencia, telefono,
    correo, departamento, municipio_ciudad, ocupacion,
    rh, clase_seguro, asegurador, rango_salarial,
    tipo_vinculacion, nombre_empresa,
    acudiente_nombre, acudiente_parentesco, acudiente_telefono
  } = req.body

  if (!primer_apellido || !nombres || !tipo_documento || !numero_documento || !fecha_nacimiento || !sexo || !municipio_ciudad) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' })
  }

  try {
    const existe = await prisma.paciente.findUnique({
      where: { numero_documento }
    })

    if (existe) {
      return res.status(400).json({ error: 'Ya existe un paciente con ese documento' })
    }

    const paciente = await prisma.$transaction(async (tx) => {
      const nuevoPaciente = await tx.paciente.create({
        data: {
          primer_apellido,
          segundo_apellido,
          nombres,
          tipo_documento,
          numero_documento,
          fecha_nacimiento: new Date(fecha_nacimiento),
          sexo,
          estado_civil,
          direccion_residencia,
          telefono,
          correo,
          departamento,
          municipio_ciudad,
          ocupacion,
          rh,
          clase_seguro,
          asegurador,
          rango_salarial,
          tipo_vinculacion,
          nombre_empresa,
          acudiente_nombre,
          acudiente_parentesco,
          acudiente_telefono
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

    res.status(201).json(paciente)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/pacientes — listar todos
router.get('/', async (req, res) => {
  try {
    const pacientes = await prisma.paciente.findMany({
      orderBy: { primer_apellido: 'asc' },
      select: {
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
          select: { id: true, fecha_hora: true },
          orderBy: { fecha_hora: 'desc' },
          take: 1
        },
        cotizaciones: {
          // FIX: el enum EstadoCotizacion es 'aprobado', no 'aprobada'
          where: { estado: 'aprobado' },
          select: { total: true }
        },
        pagos: {
          select: { monto: true }
        }
      }
    })

    const resultado = pacientes.map(p => {
      const tieneCitas = p.citas.length > 0
      const totalCotizado = p.cotizaciones.reduce((sum, c) => sum + Number(c.total), 0)
      const totalPagado = p.pagos.reduce((sum, pg) => sum + Number(pg.monto), 0)
      const tieneSaldo = totalCotizado - totalPagado > 0

      let estado = 'Nuevo'
      if (tieneCitas && tieneSaldo) estado = 'Pendiente'
      else if (tieneCitas && !tieneSaldo) estado = 'Al día'

      const ultimaVisita = p.citas[0]?.fecha_hora
        ? p.citas[0].fecha_hora.toISOString().split('T')[0]
        : null

      return {
        id: p.id,
        primer_apellido: p.primer_apellido,
        segundo_apellido: p.segundo_apellido,
        nombres: p.nombres,
        tipo_documento: p.tipo_documento,
        numero_documento: p.numero_documento,
        fecha_nacimiento: p.fecha_nacimiento
          ? p.fecha_nacimiento.toISOString().split('T')[0]
          : null,
        sexo: p.sexo,
        telefono: p.telefono,
        correo: p.correo,
        municipio_ciudad: p.municipio_ciudad,
        creado_en: p.creado_en,
        ultimaVisita,
        estado
      }
    })

    res.json(resultado)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/pacientes/buscar?q= — buscar por nombre o documento
router.get('/buscar', async (req, res) => {
  const { q } = req.query

  if (!q || q.trim() === '') {
    return res.status(400).json({ error: 'Escribe algo para buscar' })
  }

  try {
    const pacientes = await prisma.paciente.findMany({
      where: {
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
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id)

  try {
    const paciente = await prisma.paciente.findUnique({
      where: { id },
      include: {
        historias: {
          orderBy: { fecha_atencion: 'desc' },
          take: 5
        },
        citas: {
          orderBy: { fecha_hora: 'desc' },
          take: 5
        }
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
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  const {
    historias,
    citas,
    creado_en,
    id: bodyId,
    ...datos
  } = req.body

  if (datos.fecha_nacimiento) {
    datos.fecha_nacimiento = new Date(datos.fecha_nacimiento)
  }

  try {
    const paciente = await prisma.paciente.update({
      where: { id },
      data: datos
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

// DELETE /api/pacientes/:id — eliminar paciente
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id)

  try {
    await prisma.paciente.delete({
      where: { id }
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