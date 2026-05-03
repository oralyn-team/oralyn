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

    const paciente = await prisma.paciente.create({
      data: {
        primer_apellido, segundo_apellido, nombres,
        tipo_documento, numero_documento,
        fecha_nacimiento: new Date(fecha_nacimiento),
        sexo, estado_civil, direccion_residencia, telefono,
        correo, departamento, municipio_ciudad, ocupacion,
        rh, clase_seguro, asegurador, rango_salarial,
        tipo_vinculacion, nombre_empresa,
        acudiente_nombre, acudiente_parentesco, acudiente_telefono
      }
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
        telefono: true,
        correo: true,
        municipio_ciudad: true,
        creado_en: true
      }
    })
    res.json(pacientes)
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
  const datos = req.body

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

module.exports = router