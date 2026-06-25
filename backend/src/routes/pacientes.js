const express = require('express')
const prisma = require('../lib/prisma')
const verificarToken = require('../middlewares/auth')

const router = express.Router()
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
    const existe = await prisma.paciente.findFirst({
      where: {
        consultorio_id: req.usuario.consultorio_id,
        numero_documento
      }
    })

    if (existe) {
      return res.status(400).json({ error: 'Ya existe un paciente con ese documento' })
    }

    // ✅ Fix 1: transacción limpia con consultorio_id incluido, sin el create duplicado de abajo
    const paciente = await prisma.$transaction(async (tx) => {
      const nuevoPaciente = await tx.paciente.create({
        data: {
          consultorio_id: req.usuario.consultorio_id, // ✅ Fix 2: campo agregado
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
    const ahora = new Date()

    const pacientes = await prisma.paciente.findMany({
      where: { consultorio_id: req.usuario.consultorio_id },
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
    })

    const resultado = pacientes.map(p => {
      const citasPasadas = p.citas.filter(c => new Date(c.fecha_hora) <= ahora)
      const citasFuturas = p.citas.filter(c => new Date(c.fecha_hora) > ahora && c.estado === 'pendiente')

      const tieneCitasPasadas = citasPasadas.length > 0

      // Saldo pendiente: suma de saldos de todas las cotizaciones no canceladas
      const totalSaldoPendiente = p.cotizaciones.reduce((sum, c) => sum + Number(c.saldo ?? 0), 0)
      const tieneSaldo = totalSaldoPendiente > 0

      // Tratamientos pendientes de pago (cotizaciones activas con saldo > 0)
      const tratamientosPendientes = p.cotizaciones.filter(c => Number(c.saldo ?? 0) > 0).length

      let estado = 'Nuevo'
      if (tieneCitasPasadas && tieneSaldo) estado = 'Pendiente'
      else if (tieneCitasPasadas && !tieneSaldo) estado = 'Al día'

      // Última cita pasada
      const ultimaCitaPasada = citasPasadas[0]
      const ultimaVisita = ultimaCitaPasada?.fecha_hora
        ? new Date(ultimaCitaPasada.fecha_hora).toISOString().split('T')[0]
        : null

      // Próxima cita futura pendiente
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
          ? p.fecha_nacimiento.toISOString().split('T')[0]
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
        consultorio_id: req.usuario.consultorio_id,
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
    const paciente = await prisma.paciente.findFirst({
      where: { id, consultorio_id: req.usuario.consultorio_id },
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
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  const { historias, citas, creado_en, id: bodyId, ...datos } = req.body

  if (datos.fecha_nacimiento) {
    datos.fecha_nacimiento = new Date(datos.fecha_nacimiento)
  }

  try {
    const existe = await prisma.paciente.findFirst({
      where: { id, consultorio_id: req.usuario.consultorio_id }
    })

    if (!existe) {
      return res.status(404).json({ error: 'Paciente no encontrado' })
    }

    delete datos.consultorio_id // ✅ evita que el cliente cambie el consultorio

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
    const existe = await prisma.paciente.findFirst({
      where: { id, consultorio_id: req.usuario.consultorio_id }
    })

    if (!existe) {
      return res.status(404).json({ error: 'Paciente no encontrado' })
    }

    await prisma.$transaction(async (tx) => {
      // 1. Obtener todas las historias clínicas del paciente
      const historias = await tx.historiaClinica.findMany({
        where: { paciente_id: id },
        select: { id: true }
      })
      const historiaIds = historias.map(h => h.id)

      if (historiaIds.length > 0) {
        // Eliminar registros secundarios de la historia
        await tx.hcAntecedentes.deleteMany({ where: { historia_id: { in: historiaIds } } })
        await tx.hcExamenEstomatologico.deleteMany({ where: { historia_id: { in: historiaIds } } })
        await tx.hcOdontograma.deleteMany({ where: { historia_id: { in: historiaIds } } })
        await tx.hojaEvolucion.deleteMany({ where: { historia_id: { in: historiaIds } } })
        await tx.recomendacionPostQx.deleteMany({ where: { historia_id: { in: historiaIds } } })
        await tx.hcAdjunto.deleteMany({ where: { historia_id: { in: historiaIds } } })
        
        // Eliminar Historias Clínicas
        await tx.historiaClinica.deleteMany({ where: { id: { in: historiaIds } } })
      }

      // 2. Eliminar Pagos
      await tx.pago.deleteMany({ where: { paciente_id: id } })

      // 3. Eliminar Cotizaciones y sus Procedimientos
      const cotizaciones = await tx.cotizacion.findMany({
        where: { paciente_id: id },
        select: { id: true }
      })
      const cotizacionIds = cotizaciones.map(c => c.id)
      if (cotizacionIds.length > 0) {
        await tx.procedimientoCotizacion.deleteMany({ where: { cotizacion_id: { in: cotizacionIds } } })
        await tx.cotizacion.deleteMany({ where: { id: { in: cotizacionIds } } })
      }

      // 4. Eliminar Certificados Dentales
      await tx.certificadoDental.deleteMany({ where: { paciente_id: id } })

      // 5. Eliminar Citas
      await tx.cita.deleteMany({ where: { paciente_id: id } })

      // 6. Eliminar Consentimientos
      await tx.consentimiento.deleteMany({ where: { paciente_id: id } })

      // 7. Finalmente, eliminar al Paciente
      await tx.paciente.delete({ where: { id } })
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