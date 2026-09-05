const test = require('node:test')
const assert = require('node:assert')
const prisma = require('../../src/lib/prisma')
const generarCertificadoPDF = require('../../src/pdf/generators/generarCertificadoPDF')

test('Fallback de firma_doctor_default en PDF', async () => {
  // Configurar consultorio con firma por defecto
  const firmaDefaultMock = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
  
  let consultorio = await prisma.configuracion.findFirst()
  if (!consultorio) {
    consultorio = await prisma.configuracion.create({
      data: {
        nombre_consultorio: 'Consultorio Test Fallback',
        nombre_profesional: 'Dr. Test Fallback',
        firma_doctor_default: firmaDefaultMock
      }
    })
  } else {
    await prisma.configuracion.update({
      where: { id: consultorio.id },
      data: { firma_doctor_default: firmaDefaultMock }
    })
  }

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

  const pdfFallback = await generarCertificadoPDF(certificadoSinFirma, consultorio.id)
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

  const pdfCapturada = await generarCertificadoPDF(certificadoConFirma, consultorio.id)
  assert.ok(pdfCapturada instanceof Uint8Array, 'Debe generar PDF usando firma capturada')
  assert.ok(pdfCapturada.length > 1000)
})
