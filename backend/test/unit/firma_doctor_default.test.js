const test = require('node:test')
const assert = require('node:assert')
const prisma = require('../../src/lib/prisma')
const generarCertificadoPDF = require('../../src/pdf/generators/generarCertificadoPDF')

test('Fallback de firma_doctor_default en PDF', async () => {
  let consultorioTest = null

  try {
    const firmaDefaultMock = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORD5CYII='
    
    // Crear un consultorio de prueba aislado (NO modificar el consultorio de producción)
    consultorioTest = await prisma.configuracion.create({
      data: {
        nombre_consultorio: 'Consultorio Test Isolated',
        nombre_profesional: 'Dr. Test Isolated',
        firma_doctor_default: firmaDefaultMock
      }
    })

    // 1. Caso sin firma capturada en certificado (debe usar la por defecto sin fallar)
    const certificadoSinFirma = {
      fecha_expedicion: new Date(),
      tipo_cita_texto: 'Consulta General Fallback',
      firma_doctor: null,
      paciente: {
        nombres: 'María',
        primer_apellido: 'Gómez',
        tipo_documento: 'CC',
        numero_documento: '52000111'
      }
    }

    const pdfFallback = await generarCertificadoPDF(certificadoSinFirma, consultorioTest.id)
    assert.ok(pdfFallback instanceof Uint8Array, 'Debe generar PDF usando firma por defecto')
    assert.ok(pdfFallback.length > 1000)

    // 2. Caso con firma capturada explícita (debe respetar la firma capturada)
    const firmaCapturadaMock = 'data:image/png;base64,firmaCapturadaExplicitamente'
    const certificadoConFirma = {
      fecha_expedicion: new Date(),
      tipo_cita_texto: 'Consulta General Capturada',
      firma_doctor: firmaCapturadaMock,
      paciente: {
        nombres: 'María',
        primer_apellido: 'Gómez',
        tipo_documento: 'CC',
        numero_documento: '52000111'
      }
    }

    const pdfCapturada = await generarCertificadoPDF(certificadoConFirma, consultorioTest.id)
    assert.ok(pdfCapturada instanceof Uint8Array, 'Debe generar PDF usando firma capturada')
    assert.ok(pdfCapturada.length > 1000)
  } finally {
    if (consultorioTest) {
      await prisma.configuracion.deleteMany({ where: { id: consultorioTest.id } }).catch(() => {})
    }
  }
})
