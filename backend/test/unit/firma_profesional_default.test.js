const test = require('node:test')
const assert = require('node:assert')
const prisma = require('../../src/lib/prisma')
const generarCertificadoPDF = require('../../src/pdf/generators/generarCertificadoPDF')
const { resolverFirmaDoctor } = require('../../src/pdf/helpers/generarPDF')

test('Verificación de fallback de firma por profesional_default sobre titular_default', async () => {
  let consultorioOriginal = await prisma.configuracion.findFirst()
  const firmaOriginal = consultorioOriginal?.firma_doctor_default || null

  try {
    // 1. Configurar consultorio con firma_doctor_default del titular
    const firmaTitularMock = 'data:image/png;base64,FIRMA_TITULAR_Y'
    if (!consultorioOriginal) {
      consultorioOriginal = await prisma.configuracion.create({
        data: {
          nombre_consultorio: 'Consultorio Test Firma Prof',
          nombre_profesional: 'Dra. Titular',
          firma_doctor_default: firmaTitularMock
        }
      })
    } else {
      await prisma.configuracion.update({
        where: { id: consultorioOriginal.id },
        data: { firma_doctor_default: firmaTitularMock }
      })
    }

    // 2. Crear o actualizar un Profesional con firma_default reconocible 'FIRMA_PROF_X'
    const firmaProfMock = 'data:image/png;base64,FIRMA_PROF_X'
    const profesionalTest = await prisma.profesional.upsert({
      where: { id: 9999 },
      update: {
        nombre_completo: 'Dr. Profesional Test Especial',
        cedula_profesional: '99999999',
        firma_default: firmaProfMock,
        activo: true
      },
      create: {
        id: 9999,
        consultorio_id: consultorioOriginal.id,
        nombre_completo: 'Dr. Profesional Test Especial',
        cedula_profesional: '99999999',
        firma_default: firmaProfMock,
        activo: true
      }
    })

    // 3. Crear certificado apuntando al profesional_id SIN firma_doctor capturada
    const certificadoSinFirmaDoctor = {
      fecha_expedicion: new Date(),
      tipo_cita_texto: 'Certificado Odontológico Test',
      firma_doctor: null,
      profesional_id: profesionalTest.id,
      profesional: profesionalTest,
      paciente: {
        nombres: 'Carlos',
        primer_apellido: 'Pérez',
        tipo_documento: 'CC',
        numero_documento: '12345678'
      }
    }

    // 4. Probar resolución directa con resolverFirmaDoctor
    const resolucion = await resolverFirmaDoctor(certificadoSinFirmaDoctor, consultorioOriginal)
    
    assert.equal(
      resolucion.firmaDoctorFinal,
      firmaProfMock,
      `Debe usar '${firmaProfMock}' y NO la firma del titular '${firmaTitularMock}'`
    )
    assert.equal(
      resolucion.firmaDoctorOrigen,
      'profesional_default',
      "El origen debe ser 'profesional_default' y NO 'titular_default'"
    )

    // 5. Generar PDF de certificado para confirmar que se procesa sin errores
    const pdfBuffer = await generarCertificadoPDF(certificadoSinFirmaDoctor, consultorioOriginal.id)
    assert.ok(pdfBuffer instanceof Uint8Array, 'Debe generar el PDF correctamente como Uint8Array/Buffer')
    assert.ok(pdfBuffer.length > 1000, 'El PDF generado debe tener un tamaño razonable')
  } finally {
    // Limpieza estricta post-test para no dejar basura en BD real
    if (consultorioOriginal) {
      await prisma.configuracion.update({
        where: { id: consultorioOriginal.id },
        data: { firma_doctor_default: firmaOriginal }
      }).catch(() => {})
    }
    await prisma.profesional.deleteMany({ where: { id: 9999 } }).catch(() => {})
  }
})
