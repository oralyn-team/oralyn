const test = require('node:test')
const assert = require('node:assert')
const prisma = require('../../src/lib/prisma')
const generarConsentimientoPDF = require('../../src/pdf/generators/generarConsentimientoPDF')
const generarHistoriaPDF = require('../../src/pdf/generators/generarHistoriaPDF')
const generarRecomendacionesPDF = require('../../src/pdf/generators/generarRecomendacionesPDF')
const generarCotizacionPDF = require('../../src/pdf/generators/generarCotizacionPDF')
const generarCertificadoPDF = require('../../src/pdf/generators/generarCertificadoPDF')

test('Generación de todos los PDFs del sistema (historias, consentimientos, cotizaciones, certificados)', async () => {
  // Asegurar que exista al menos un consultorio (Configuracion)
  let consultorio = await prisma.configuracion.findFirst()
  if (!consultorio) {
    consultorio = await prisma.configuracion.create({
      data: {
        nombre_consultorio: 'Consultorio Test PDF',
        nombre_profesional: 'Dra. Rocio Test',
        registro_profesional: 'REG-TEST-123',
        nit: '900-TEST',
        direccion: 'Calle Test 123',
        telefono: '3000000000',
        ciudad: 'Villavicencio',
        email: 'test@oralyn.com'
      }
    })
  }

  // 1. Consentimientos
  const tipos = ['anestesia', 'cirugia_oral', 'retiro_poste_corona', 'rehabilitacion', 'higiene_oral']

  for (const tipo of tipos) {
    const consentimiento = {
      paciente: {
        nombres: 'Juan Carlos',
        primer_apellido: 'Pérez',
        segundo_apellido: 'Rodriguez',
        numero_documento: '1015432123'
      },
      tipo,
      fecha: new Date(),
      campos_especificos: {
        protesis_removible: true,
        protesis_total: false,
        sobredentadura: false,
        diente_unico: true,
        protesis_fija: false,
        protesis_hibrida: false,
        pieza_dental: '14, 15',
        diagnostico: 'Carie penetrante'
      },
      ciudad: 'Villavicencio',
      cc_paciente_declarado: '1015432123',
      cc_profesional: '1121987654',
      firma_paciente: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      firma_doctor: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
    }

    const pdfBuffer = await generarConsentimientoPDF(consentimiento, consultorio.id)
    assert.ok(pdfBuffer instanceof Uint8Array, `El PDF para tipo ${tipo} debe ser un Uint8Array/Buffer`)
    assert.ok(pdfBuffer.length > 1000, `El PDF para tipo ${tipo} debe tener un tamaño razonable (generado: ${pdfBuffer.length} bytes)`)
  }

  // 2. Historia Clínica
  const historia = {
    id: 1,
    paciente: {
      nombres: 'Juan Carlos',
      primer_apellido: 'Pérez',
      segundo_apellido: 'Rodriguez',
      numero_documento: '1015432123',
      fecha_nacimiento: new Date('1990-01-01'),
      sexo: 'masculino',
      municipio_ciudad: 'Villavicencio'
    },
    fecha_atencion: new Date(),
    motivo_consulta: 'Dolor en molar inferior',
    medicamentos_actuales: 'Ninguno',
    antecedentes_odontologicos: 'Calzas previas',
    evento_adverso: false,
    evento_adverso_obs: '',
    departamento: 'Meta',
    estado_civil: 'Soltero',
    direccion: 'Calle 123',
    ocupacion: 'Ingeniero',
    acudiente: '',
    parentesco: '',
    eps: 'Sanitas',
    tipo_afiliacion: 'Cotizante',
    tipo_sangre: 'O',
    rh: '+',
    alergias: 'Ninguna',
    habitos_json: JSON.stringify({ fumar: true, alcohol: false }),
    habitos_observaciones: 'Fuma socialmente',
    diagnostico: 'Caries penetrante',
    tratamiento_realizado: 'Endodoncia y corona',
    observaciones: 'Paciente colaborador',
    recomendaciones: 'Evitar alimentos duros',
    firma_doctor: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    firma_paciente: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    antecedentes: {
      tratamiento_medicacion: false,
      reacciones_alergicas: false,
      problemas_coagulacion: false,
      irradiaciones: false,
      tension_arterial: false,
      sinusitis: false,
      enf_respiratorias: false,
      cardiopatias: false,
      diabetes: false,
      fiebre_reumatica: false,
      hepatitis: false,
      vih: false,
      trastornos_emocionales: false
    },
    examen: {
      estructuras_json: JSON.stringify({ labios: true, lengua: false }),
      examen_pulpar_json: JSON.stringify({ vitalidad: true }),
      pulpar_obs: 'Normal',
      tejidos_json: JSON.stringify({ esmalte: true }),
      tejidos_obs: 'Normal',
      periodontal_json: JSON.stringify({
        movilidad: { 18: '1', 17: '0' },
        bolsa: { 18: '2', 17: '1' }
      }),
      dx_periodontal: 'Gingivitis inducida por placa',
      periodontal_obs: 'Leve sangrado al sondaje',
      observaciones: 'Buena higiene en general'
    },
    odontogramas: []
  }

  const pdfHistoria = await generarHistoriaPDF(historia, consultorio.id)
  assert.ok(pdfHistoria instanceof Uint8Array, 'El PDF de historia clínica debe ser un Uint8Array/Buffer')
  assert.ok(pdfHistoria.length > 1000, 'El PDF de historia clínica debe tener un tamaño razonable')

  // 3. Recomendaciones Post-Quirúrgicas
  const pdfRecomendaciones = await generarRecomendacionesPDF(consultorio.id)
  assert.ok(pdfRecomendaciones instanceof Uint8Array, 'El PDF de recomendaciones debe ser un Uint8Array/Buffer')
  assert.ok(pdfRecomendaciones.length > 1000, 'El PDF de recomendaciones debe tener un tamaño razonable')

  // 4. Cotización
  const cotizacion = {
    id: 123,
    paciente: {
      nombres: 'Juan Carlos',
      primer_apellido: 'Pérez',
      segundo_apellido: 'Rodriguez',
      numero_documento: '1015432123',
      telefono: '3001234567'
    },
    fecha: new Date(),
    estado: 'aprobado',
    tipo_tratamiento: 'Ortodoncia',
    prioridad: 'media',
    motivo: 'Estética',
    observaciones: 'Ninguna',
    total: 1500000,
    total_pagado: 500000,
    saldo: 1000000,
    procedimientos: [
      {
        orden: 1,
        procedimiento: 'Limpieza Dental',
        descripcion: 'Detartraje y profilaxis',
        aplica_en: 'general',
        cantidad: 1,
        valor_unitario: 100000,
        descuento: 10,
        subtotal: 90000,
        estado: 'realizado'
      }
    ],
    pagos: [
      {
        fecha: new Date(),
        metodo_pago: 'efectivo',
        monto: 500000,
        referencia: 'NEQ-123456'
      }
    ]
  }

  const pdfCotizacion = await generarCotizacionPDF(cotizacion, consultorio.id)
  assert.ok(pdfCotizacion instanceof Uint8Array, 'El PDF de cotización debe ser un Uint8Array/Buffer')
  assert.ok(pdfCotizacion.length > 1000, 'El PDF de cotización debe tener un tamaño razonable')

  // 5. Certificado Dental
  const certificado = {
    fecha_expedicion: new Date(),
    tipo_cita_texto: 'Consulta Odontológica General',
    firma_doctor: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    paciente: {
      nombres: 'Juan Carlos',
      primer_apellido: 'Pérez',
      segundo_apellido: 'Rodriguez',
      tipo_documento: 'CC',
      numero_documento: '1015432123'
    }
  }

  const pdfCertificado = await generarCertificadoPDF(certificado, consultorio.id)
  assert.ok(pdfCertificado instanceof Uint8Array, 'El PDF de certificado dental debe ser un Uint8Array/Buffer')
  assert.ok(pdfCertificado.length > 1000, 'El PDF de certificado dental debe tener un tamaño razonable')
})
