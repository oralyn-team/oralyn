// consentimientos.js - Rutas para gestionar consentimientos informados
const express = require('express')
const prisma = require('../lib/prisma')
const verificarToken = require('../middlewares/auth')
const { requirePermission, restrictSuperadminClinicalAccess } = require('../middlewares/rbac')
const { PERMISSIONS } = require('../lib/permissions')
const { registrarAuditoria } = require('../services/audit.service')

const router = express.Router()
router.use(verificarToken)
router.use(restrictSuperadminClinicalAccess) // Restringe al SUPERADMIN de ver/modificar consentimientos

router.post('/', requirePermission(PERMISSIONS.CONSENTIMIENTOS_CREATE), async (req, res) => {
  const { paciente_id, tipo, ciudad, campos_especificos, nombre_paciente_declarado, cc_paciente_declarado, firma_paciente, cc_profesional, firma_doctor } = req.body

  if (!paciente_id || !tipo) {
    return res.status(400).json({ error: 'Paciente y tipo de consentimiento son obligatorios' })
  }

  const tiposValidos = ['anestesia', 'cirugia_oral', 'retiro_poste_corona', 'rehabilitacion', 'higiene_oral']
  if (!tiposValidos.includes(tipo)) {
    return res.status(400).json({ error: 'Tipo no válido' })
  }

  try {
    const paciente = await prisma.paciente.findFirst({
      where: { id: paciente_id, consultorio_id: req.usuario.consultorio_id, activo: true }
    })
    if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' })

    const consentimiento = await prisma.consentimiento.create({
      data: {
        consultorio_id: req.usuario.consultorio_id,
        paciente_id,
        tipo,
        ciudad: ciudad || 'Villavicencio',
        campos_especificos,
        nombre_paciente_declarado,
        cc_paciente_declarado,
        firma_paciente,
        cc_profesional,
        firma_doctor
      }
    })

    await registrarAuditoria({
      req,
      accion: 'CREAR_CONSENTIMIENTO',
      modulo: 'Consentimientos',
      recurso_id: consentimiento.id,
      detalles: `Consentimiento (${tipo}) registrado para el paciente #${paciente_id}`
    })

    res.status(201).json(consentimiento)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

router.get('/paciente/:pacienteId', requirePermission(PERMISSIONS.CONSENTIMIENTOS_READ), async (req, res) => {
  const pacienteId = parseInt(req.params.pacienteId)
  try {
    const consentimientos = await prisma.consentimiento.findMany({
      where: { paciente_id: pacienteId, consultorio_id: req.usuario.consultorio_id },
      orderBy: { fecha: 'desc' }
    })
    res.json(consentimientos)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

router.get('/:id', requirePermission(PERMISSIONS.CONSENTIMIENTOS_READ), async (req, res) => {
  const id = parseInt(req.params.id)
  try {
    const consentimiento = await prisma.consentimiento.findFirst({
      where: { id, consultorio_id: req.usuario.consultorio_id },
      include: {
        paciente: {
          select: { id: true, nombres: true, primer_apellido: true, segundo_apellido: true, numero_documento: true, tipo_documento: true, fecha_nacimiento: true, municipio_ciudad: true }
        }
      }
    })
    if (!consentimiento) return res.status(404).json({ error: 'Consentimiento no encontrado' })
    res.json(consentimiento)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

router.patch('/:id/firmas', requirePermission(PERMISSIONS.CONSENTIMIENTOS_CREATE), async (req, res) => {
  const id = parseInt(req.params.id)
  const { firma_paciente, nombre_paciente_declarado, cc_paciente_declarado, firma_doctor, cc_profesional } = req.body

  try {
    const existe = await prisma.consentimiento.findFirst({
      where: { id, consultorio_id: req.usuario.consultorio_id }
    })
    if (!existe) return res.status(404).json({ error: 'Consentimiento no encontrado' })

    const consentimiento = await prisma.consentimiento.update({
      where: { id },
      data: { firma_paciente, nombre_paciente_declarado, cc_paciente_declarado, firma_doctor, cc_profesional, pdf_generado_en: new Date() }
    })

    await registrarAuditoria({
      req,
      accion: 'FIRMAR_CONSENTIMIENTO',
      modulo: 'Consentimientos',
      recurso_id: consentimiento.id,
      detalles: `Consentimiento #${id} firmado`
    })

    res.json(consentimiento)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

router.patch('/:id/anular', requirePermission(PERMISSIONS.CONSENTIMIENTOS_CREATE), async (req, res) => {
  const id = parseInt(req.params.id)
  const { motivo_anulacion } = req.body

  if (!motivo_anulacion) {
    return res.status(400).json({ error: 'El motivo de anulación es obligatorio' })
  }

  try {
    const existe = await prisma.consentimiento.findUnique({
      where: { id }
    })
    if (!existe) return res.status(404).json({ error: 'Consentimiento no encontrado' })
    if (existe.consultorio_id !== req.usuario.consultorio_id) {
      return res.status(403).json({ error: 'No autorizado' })
    }

    const consentimiento = await prisma.consentimiento.update({
      where: { id },
      data: {
        anulado: true,
        anulado_en: new Date(),
        motivo_anulacion
      }
    })

    await registrarAuditoria({
      req,
      accion: 'ANULAR_CONSENTIMIENTO',
      modulo: 'Consentimientos',
      recurso_id: consentimiento.id,
      detalles: `Consentimiento #${id} anulado por: ${motivo_anulacion}`
    })

    res.json(consentimiento)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

router.delete('/:id', requirePermission(PERMISSIONS.CONSENTIMIENTOS_CREATE), async (req, res) => {
  const id = parseInt(req.params.id)

  try {
    const consentimiento = await prisma.consentimiento.findUnique({ where: { id } })

    if (!consentimiento) {
      return res.status(404).json({ error: 'Consentimiento no encontrado' })
    }

    if (consentimiento.consultorio_id !== req.usuario.consultorio_id) {
      return res.status(403).json({ error: 'No autorizado' })
    }

    await prisma.consentimiento.delete({ where: { id } })

    await registrarAuditoria({
      req,
      accion: 'ELIMINAR_CONSENTIMIENTO',
      modulo: 'Consentimientos',
      recurso_id: id,
      detalles: `Consentimiento #${id} eliminado`
    })

    res.status(204).send()
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

const generarConsentimientoPDF = require("../pdf/generators/generarConsentimientoPDF");

router.get("/:id/pdf", requirePermission(PERMISSIONS.CONSENTIMIENTOS_READ), async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const consentimiento = await prisma.consentimiento.findFirst({
      where: {
        id,
        consultorio_id: req.usuario.consultorio_id,
      },
      include: {
        paciente: true,
      },
    });

    if (!consentimiento) {
      return res.status(404).json({
        error: "Consentimiento no encontrado",
      });
    }

    const pdf = await generarConsentimientoPDF(
      consentimiento,
      req.usuario.consultorio_id
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=consentimiento-${id}.pdf`
    );

    res.send(pdf);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Error generando PDF",
    });
  }
});

module.exports = router
