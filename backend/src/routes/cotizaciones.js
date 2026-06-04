const express = require('express')
const prisma = require('../lib/prisma')
const verificarToken = require('../middlewares/auth')

const router = express.Router()
router.use(verificarToken)

router.post('/', async (req, res) => {
  const { paciente_id, items, descuento, observaciones } = req.body

  if (!paciente_id || !items || items.length === 0) {
    return res.status(400).json({ error: 'Paciente e ítems son obligatorios' })
  }

  try {
    const paciente = await prisma.paciente.findFirst({
      where: { id: paciente_id, consultorio_id: req.usuario.consultorio_id }
    })
    if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' })

    const subtotal = items.reduce((sum, item) => sum + Number(item.valor), 0)
    const descuentoValor = Number(descuento) || 0
    const total = subtotal - descuentoValor

    const cotizacion = await prisma.cotizacion.create({
      data: {
        consultorio_id: req.usuario.consultorio_id,
        paciente_id,
        subtotal,
        descuento: descuentoValor,
        total,
        observaciones,
        items: {
          create: items.map(item => ({
            tipo_item: item.tipo_item,
            descripcion_otro: item.descripcion_otro,
            numero: item.numero || 1,
            valor: item.valor
          }))
        }
      },
      include: { items: true }
    })
    res.status(201).json(cotizacion)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

router.get('/paciente/:pacienteId', async (req, res) => {
  const pacienteId = parseInt(req.params.pacienteId)
  try {
    const cotizaciones = await prisma.cotizacion.findMany({
      where: { paciente_id: pacienteId, consultorio_id: req.usuario.consultorio_id },
      orderBy: { fecha: 'desc' },
      include: { items: true }
    })
    res.json(cotizaciones)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

router.patch('/:id/estado', async (req, res) => {
  const id = parseInt(req.params.id)
  const { estado } = req.body

  const estadosValidos = ['borrador', 'aprobada', 'rechazada', 'pagada']
  if (!estado || !estadosValidos.includes(estado)) {
    return res.status(400).json({ error: 'Estado no válido' })
  }

  try {
    const existe = await prisma.cotizacion.findFirst({
      where: { id, consultorio_id: req.usuario.consultorio_id }
    })
    if (!existe) return res.status(404).json({ error: 'Cotización no encontrada' })

    const cotizacion = await prisma.cotizacion.update({ where: { id }, data: { estado } })
    res.json(cotizacion)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

module.exports = router