const test = require('node:test')
const assert = require('node:assert')
const prisma = require('../../src/lib/prisma')
const generarCertificadoPDF = require('../../src/pdf/generators/generarCertificadoPDF')
const { resolverFirmaDoctor } = require('../../src/pdf/helpers/generarPDF')

test('Verificación de fallback de firma por profesional_default sobre titular_default', async () => {
  let consultorioTest = null
  let profesionalTest = null

  try {
    const firmaTitularMock = 'data:image/png;base64,FIRMA_TITULAR_Y'
    const firmaProfMock = 'data:image/png;base64,FIRMA_PROF_X'

    // 1. Crear un consultorio de prueba aislado con firma_doctor_default del titular
    consultorioTest = await prisma.configuracion.create({
      data: {
        nombre_consultorio: 'Consultorio Test Prof Isolated',
        nombre_profesional: 'Dra. Titular Isolated',
        firma_doctor_default: firmaTitularMock
      }
    })

    // 2. Crear un Profesional aislado vinculado a ese consultorio de prueba
    profesionalTest = await prisma.profesional.create({
      data: {
        id: 9999,
        consultorio_id: consultorioTest.id,
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
    const resolucion = await resolverFirmaDoctor(certificadoSinFirmaDoctor, consultorioTest)
    
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
    const pdfBuffer = await generarCertificadoPDF(certificadoSinFirmaDoctor, consultorioTest.id)
    assert.ok(pdfBuffer instanceof Uint8Array, 'Debe generar el PDF correctamente como Uint8Array/Buffer')
    assert.ok(pdfBuffer.length > 1000, 'El PDF generado debe tener un tamaño razonable')
  } finally {
    // Limpieza estricta post-test
    if (profesionalTest) {
      await prisma.profesional.deleteMany({ where: { id: profesionalTest.id } }).catch(() => {})
    }
    if (consultorioTest) {
      await prisma.configuracion.deleteMany({ where: { id: consultorioTest.id } }).catch(() => {})
    }
  }
})
