const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main() {
  // Crear o actualizar configuración del consultorio
  const config = await prisma.configuracion.upsert({
    where: { id: 1 },
    update: {},
    create: {
      nombre_consultorio: 'RM Dientes Felices',
      nombre_profesional: 'Rocío Murillo',
      registro_profesional: '3989',
      nit: '39579364-3',
      direccion: 'Calle 32 #38-81 Barzal Alto',
      telefono: '322 947 8820',
      ciudad: 'Villavicencio'
    }
  })

  console.log('Consultorio listo:', config.id)

  // Crear o actualizar usuario doctora (DUEÑO)
  const password_hash = await bcrypt.hash('123456', 10)
  const usuario = await prisma.usuario.upsert({
    where: { email: 'doctora@oralyn.com' },
    update: { rol: 'DUENO' },
    create: {
      consultorio_id: config.id,
      email: 'doctora@oralyn.com',
      password_hash,
      nombre: 'Rocío Murillo',
      registro: '3989',
      rol: 'DUENO',
      activo: true
    }
  })

  console.log('Usuario listo:', usuario.email, usuario.rol)

  // Crear o actualizar usuario SUPERADMIN de plataforma
  const superadminHash = await bcrypt.hash('admin123', 10)
  const superadmin = await prisma.usuario.upsert({
    where: { email: 'superadmin@oralyn.com' },
    update: { rol: 'SUPERADMIN' },
    create: {
      consultorio_id: null,
      email: 'superadmin@oralyn.com',
      password_hash: superadminHash,
      nombre: 'Administrador Plataforma',
      rol: 'SUPERADMIN',
      activo: true
    }
  })

  console.log('Superadmin listo:', superadmin.email, superadmin.rol)

  // Crear o actualizar usuario ASISTENTE / ODONTÓLOGO
  const asistente = await prisma.usuario.upsert({
    where: { email: 'asistente@oralyn.com' },
    update: { rol: 'ASISTENTE_ODONTOLOGO' },
    create: {
      consultorio_id: config.id,
      email: 'asistente@oralyn.com',
      password_hash,
      nombre: 'Dr. Carlos Mendoza',
      registro: '7741',
      rol: 'ASISTENTE_ODONTOLOGO',
      activo: true
    }
  })

  console.log('Asistente listo:', asistente.email, asistente.rol)

  // Crear o actualizar usuario RECEPCIONISTA
  const recepcionista = await prisma.usuario.upsert({
    where: { email: 'recepcion@oralyn.com' },
    update: { rol: 'RECEPCIONISTA' },
    create: {
      consultorio_id: config.id,
      email: 'recepcion@oralyn.com',
      password_hash,
      nombre: 'Sofía Benítez',
      registro: null,
      rol: 'RECEPCIONISTA',
      activo: true
    }
  })

  console.log('Recepcionista listo:', recepcionista.email, recepcionista.rol)

  // Catálogo Oficial CUPS
  const cupsList = [
    // Endodoncia
    { codigo_cups: '235100', nombre_oficial: 'REIMPLANTE DE DIENTE SOD', categoria: 'Endodoncia', es_frecuente: true },
    { codigo_cups: '237100', nombre_oficial: 'PULPOTOMIA SOD', categoria: 'Endodoncia', es_frecuente: true },
    { codigo_cups: '237101', nombre_oficial: 'PULPOTOMÍA NCOC', categoria: 'Endodoncia', es_frecuente: true },
    { codigo_cups: '237102', nombre_oficial: 'PULPOTOMIA CON PULPECTOMIA', categoria: 'Endodoncia', es_frecuente: true },
    { codigo_cups: '237200', nombre_oficial: 'APEXIFICACIÓN O APEXOGENESIS', categoria: 'Endodoncia', es_frecuente: true },
    { codigo_cups: '237300', nombre_oficial: 'TERAPIA DE CONDUCTO RADICULAR SOD', categoria: 'Endodoncia', es_frecuente: true },
    { codigo_cups: '237301', nombre_oficial: 'TERAPIA DE CONDUCTO RADICULAR EN DIENTES UNIRRADICULARES PERMANENTES', categoria: 'Endodoncia', es_frecuente: true },
    { codigo_cups: '237302', nombre_oficial: 'TERAPIA DE CONDUCTO RADICULAR EN DIENTES BIRRADICULARES PERMANENTES', categoria: 'Endodoncia', es_frecuente: true },
    { codigo_cups: '237303', nombre_oficial: 'TERAPIA DE CONDUCTO RADICULAR EN DIENTES MULTIRRADICULARES PERMANENTES', categoria: 'Endodoncia', es_frecuente: true },
    { codigo_cups: '237304', nombre_oficial: 'TERAPIA DE CONDUCTO RADICULAR EN DIENTES TEMPORALES, UNIRRADICULARES', categoria: 'Endodoncia', es_frecuente: true },
    { codigo_cups: '237305', nombre_oficial: 'TERAPIA DE CONDUCTO RADICULAR EN DIENTES TEMPORALES, MULTIRRADICULARES', categoria: 'Endodoncia', es_frecuente: true },
    { codigo_cups: '237501', nombre_oficial: 'PROCEDIMIENTO CORRECTIVO EN RESORCION RADICULAR (INTERNA Y EXTERNA)', categoria: 'Endodoncia', es_frecuente: true },
    { codigo_cups: '237503', nombre_oficial: 'RECUBRIMIENTO PULPAR DIRECTO', categoria: 'Endodoncia', es_frecuente: true },
    { codigo_cups: '237504', nombre_oficial: 'RECUBRIMIENTO PULPAR INDIRECTO', categoria: 'Endodoncia', es_frecuente: true },
    { codigo_cups: '237505', nombre_oficial: 'PRUEBAS DE VITALIDAD PULPAR', categoria: 'Endodoncia', es_frecuente: true },
    { codigo_cups: '237600', nombre_oficial: 'FISTULIZACION ENDODONTICA SOD', categoria: 'Endodoncia', es_frecuente: true },
    { codigo_cups: '237601', nombre_oficial: 'FISTULIZACION ENDODONTICA POR TREPANACION Y DRENAJE', categoria: 'Endodoncia', es_frecuente: true },
    { codigo_cups: '237602', nombre_oficial: 'FISTULIZACION ENDODONTICA POR INCISION', categoria: 'Endodoncia', es_frecuente: true },

    // Operatoria / Restaurador
    { codigo_cups: '232101', nombre_oficial: 'OBTURACIÓN DENTAL POR SUPERFICIE, CON AMALGAMA', categoria: 'Restaurador', es_frecuente: true },
    { codigo_cups: '232102', nombre_oficial: 'OBTURACIÓN DENTAL POR SUPERFICIE, CON RESINA DE FOTOCURADO', categoria: 'Restaurador', es_frecuente: true },
    { codigo_cups: '232103', nombre_oficial: 'OBTURACIÓN DENTAL POR SUPERFICIE, CON IONÓMERO DE VIDRIO', categoria: 'Restaurador', es_frecuente: true },
    { codigo_cups: '232200', nombre_oficial: 'OBTURACION TEMPORAL POR DIENTE', categoria: 'Restaurador', es_frecuente: true },
    { codigo_cups: '232300', nombre_oficial: 'COLOCACIÓN DE PIN MILIMÉTRICO', categoria: 'Restaurador', es_frecuente: true },
    { codigo_cups: '232401', nombre_oficial: 'RECONSTRUCCIÓN DE ÁNGULO INCISAL, CON RESINA DE FOTOCURADO', categoria: 'Restaurador', es_frecuente: true },
    { codigo_cups: '232402', nombre_oficial: 'RECONSTRUCCIÓN TERCIO INCISAL, CON RESINA DE FOTOCURADO', categoria: 'Restaurador', es_frecuente: true },
    { codigo_cups: '233100', nombre_oficial: 'RESTAURACION DE DIENTES MEDIANTE INCRUSTACION METALICA', categoria: 'Restaurador', es_frecuente: true },
    { codigo_cups: '233200', nombre_oficial: 'RESTAURACION DE DIENTES MEDIANTE INCRUSTACION NO METALICA', categoria: 'Restaurador', es_frecuente: true },
    { codigo_cups: '234101', nombre_oficial: 'COLOCACION O APLICACIÓN DE CORONA EN ACERO INOXIDABLE (PARA DIENTES TEMPORALES)', categoria: 'Restaurador', es_frecuente: true },
    { codigo_cups: '234102', nombre_oficial: 'COLOCACION O APLICACIÓN DE CORONA EN POLICARBOXILATO (PARA DIENTES TEMPORALES)', categoria: 'Restaurador', es_frecuente: true },
    { codigo_cups: '234103', nombre_oficial: 'COLOCACION O APLICACIÓN DE CORONA EN FORMA PLÁSTICA', categoria: 'Restaurador', es_frecuente: true },
    { codigo_cups: '234104', nombre_oficial: 'COLOCACION O APLICACIÓN DE CORONA ACRÍLICA TERMOCURADA', categoria: 'Restaurador', es_frecuente: true },
    { codigo_cups: '237901', nombre_oficial: 'BLANQUEAMIENTO DENTAL [INTRINSECO] POR CAUSAS ENDODONTICAS (POR DIENTE)', categoria: 'Estético', es_frecuente: true },

    // Promoción y Prevención
    { codigo_cups: '990103', nombre_oficial: 'EDUCACIÓN GRUPAL POR ODONTOLOGÍA', categoria: 'Preventivo', es_frecuente: true },
    { codigo_cups: '990112', nombre_oficial: 'EDUCACION GRUPAL EN SALUD, POR HIGIENE ORAL', categoria: 'Preventivo', es_frecuente: true },
    { codigo_cups: '990203', nombre_oficial: 'EDUCACION INDIVIDUAL EN SALUD, POR ODONTOLOGÍA', categoria: 'Preventivo', es_frecuente: true },
    { codigo_cups: '990212', nombre_oficial: 'EDUCACION INDIVIDUAL EN SALUD, POR HIGIENE ORAL', categoria: 'Preventivo', es_frecuente: true },
    { codigo_cups: '997101', nombre_oficial: 'APLICACIÓN DE SELLANTES DE AUTOCURADO', categoria: 'Preventivo', es_frecuente: true },
    { codigo_cups: '997102', nombre_oficial: 'APLICACIÓN DE SELLANTES DE FOTOCURADO', categoria: 'Preventivo', es_frecuente: true },
    { codigo_cups: '997103', nombre_oficial: 'TOPICACION DE FLUOR EN GEL', categoria: 'Preventivo', es_frecuente: true },
    { codigo_cups: '997104', nombre_oficial: 'TOPICACION DE FLUOR EN SOLUCION', categoria: 'Preventivo', es_frecuente: true },
    { codigo_cups: '997105', nombre_oficial: 'APLICACIÓN DE RESINA PREVENTIVA', categoria: 'Preventivo', es_frecuente: true },
    { codigo_cups: '997106', nombre_oficial: 'APLICACIÓN DE RESINA PREVENTIVA MÁS SELLANTE', categoria: 'Preventivo', es_frecuente: true },
    { codigo_cups: '997300', nombre_oficial: 'DETARTRAJE SUPRAGINGIVAL', categoria: 'Preventivo', es_frecuente: true },
    { codigo_cups: '997310', nombre_oficial: 'CONTROL DE PLACA DENTAL NCOC', categoria: 'Preventivo', es_frecuente: true },
    { codigo_cups: '997500', nombre_oficial: 'PROFILAXIS DENTAL', categoria: 'Preventivo', es_frecuente: true },

    // Ortodoncia / Ortopedia
    { codigo_cups: '247100', nombre_oficial: 'COLOCACIÓN DE APARATOLOGÍA FIJA PARA ORTODONCIA (ARCADA)', categoria: 'Ortodoncia', es_frecuente: true },
    { codigo_cups: '247201', nombre_oficial: 'COLOCACIÓN DE APARATOLOGÍA REMOVIBLE INTRAORAL PARA ORTODONCIA (ARCADA)', categoria: 'Ortodoncia', es_frecuente: true },
    { codigo_cups: '247202', nombre_oficial: 'COLOCACIÓN DE APARATOLOGÍA REMOVIBLE EXTRAORAL PARA ORTODONCIA (ARCADA)', categoria: 'Ortodoncia', es_frecuente: true },
    { codigo_cups: '247300', nombre_oficial: 'COLOCACION DE APARATOS DE RETENCION', categoria: 'Ortodoncia', es_frecuente: true },
    { codigo_cups: '248100', nombre_oficial: 'CIERRE DE DIASTEMA (ALVEOLAR, DENTAL)', categoria: 'Ortodoncia', es_frecuente: true },
    { codigo_cups: '248200', nombre_oficial: 'AJUSTAMIENTO OCLUSAL', categoria: 'Ortodoncia', es_frecuente: true },
    { codigo_cups: '248400', nombre_oficial: 'REPARACIÓN DE APARATOLOGÍA FIJA O REMOVIBLE', categoria: 'Ortodoncia', es_frecuente: true },
    { codigo_cups: '248800', nombre_oficial: 'MASCARA FACIAL TERAPEUTICA NCOC', categoria: 'Ortodoncia', es_frecuente: true },
    { codigo_cups: '893103', nombre_oficial: 'EVALUACIÓN Y MEDICION ORTODONTICA Y ORTOPEDICA ORAL', categoria: 'Ortodoncia', es_frecuente: true },
    { codigo_cups: '893104', nombre_oficial: 'ESTUDIO DE OCLUSION Y ARTICULACION TEMPOROMANDIBULAR', categoria: 'Ortodoncia', es_frecuente: true },
    { codigo_cups: '893106', nombre_oficial: 'CONTROL DE ORTODONCIA FIJA, REMOVIBLE O TRATAMIENTO ORTOPÉDICO FUNCIONAL Y MECÁNICO', categoria: 'Ortodoncia', es_frecuente: true },
    { codigo_cups: '893107', nombre_oficial: 'ELABORACIÓN Y ADAPTACIÓN DE APARATO ORTOPEDICO', categoria: 'Ortodoncia', es_frecuente: true },
    { codigo_cups: '893108', nombre_oficial: 'SESION DE CONTROL DE CRECIMIENTO Y DESARROLLO DENTO-MAXILOFACIAL', categoria: 'Ortodoncia', es_frecuente: true },
    { codigo_cups: '935500', nombre_oficial: 'APLICACIÓN DE ALAMBRE DENTAL', categoria: 'Ortodoncia', es_frecuente: true },
    { codigo_cups: '961200', nombre_oficial: 'INSERCION ADAPTACION DE APARATO ORTOPEDICO ORAL SOD', categoria: 'Ortodoncia', es_frecuente: true },
    { codigo_cups: '973400', nombre_oficial: 'EXTRACCION DE APARATOLOGIA ORTODONTICA FIJA', categoria: 'Ortodoncia', es_frecuente: true },
    { codigo_cups: '893101', nombre_oficial: 'IMPRESION DE ARCO DENTARIO SUPERIOR O INFERIOR, CON MODELO DE ESTUDIO Y CONCEPTO', categoria: 'Ortodoncia', es_frecuente: true },
    { codigo_cups: '893102', nombre_oficial: 'FOTOGRAFIA CLINICA EXTRAORAL, INTRAORAL, FRONTAL O LATERAL', categoria: 'Ortodoncia', es_frecuente: true },
    { codigo_cups: '893105', nombre_oficial: 'MASCARA FACIAL DIAGNOSTICA', categoria: 'Ortodoncia', es_frecuente: true },

    // Odontopediatría
    { codigo_cups: '230200', nombre_oficial: 'EXODONCIA DE DIENTES TEMPORALES SOD', categoria: 'Cirugía', es_frecuente: true },
    { codigo_cups: '230201', nombre_oficial: 'EXODONCIA DE DIENTES TEMPORALES UNIRRADICULARES', categoria: 'Cirugía', es_frecuente: true },
    { codigo_cups: '230202', nombre_oficial: 'EXODONCIA DE DIENTES TEMPORALES MULTIRRADICULARES', categoria: 'Cirugía', es_frecuente: true },

    // Rehabilitación Oral / Prótesis
    { codigo_cups: '234201', nombre_oficial: 'COLOCACION O INSERCIÓN DE PRÓTESIS FIJA CADA UNIDAD (PILAR Y PÓNTICOS)', categoria: 'Prótesis', es_frecuente: true },
    { codigo_cups: '234202', nombre_oficial: 'RECONSTRUCCIÓN DE MUÑONES', categoria: 'Prótesis', es_frecuente: true },
    { codigo_cups: '234203', nombre_oficial: 'PERNO O PATRÓN DE NÚCLEO', categoria: 'Prótesis', es_frecuente: true },
    { codigo_cups: '234204', nombre_oficial: 'REPARACION DE PROTESIS FIJA', categoria: 'Prótesis', es_frecuente: true },
    { codigo_cups: '234301', nombre_oficial: 'COLOCACION O INSERCIÓN DE PRÓTESIS REMOVIBLE (SUPERIOR O INFERIOR) MUCOSOPORTADA', categoria: 'Prótesis', es_frecuente: true },
    { codigo_cups: '234302', nombre_oficial: 'COLOCACION O INSERCIÓN DE PRÓTESIS REMOVIBLE (SUPERIOR O INFERIOR) DENTOMUCOSOPORTADA', categoria: 'Prótesis', es_frecuente: true },
    { codigo_cups: '234303', nombre_oficial: 'REPARACION DE PROTESIS REMOVIBLE', categoria: 'Prótesis', es_frecuente: true },
    { codigo_cups: '234401', nombre_oficial: 'COLOCACION O INSERCIÓN DE PRÓTESIS TOTAL MEDIO CASO (SUPERIOR O INFERIOR)', categoria: 'Prótesis', es_frecuente: true },
    { codigo_cups: '234402', nombre_oficial: 'COLOCACION O INSERCIÓN DE PRÓTESIS TOTAL (SUPERIOR E INFERIOR)', categoria: 'Prótesis', es_frecuente: true },
    { codigo_cups: '973500', nombre_oficial: 'EXTRACCION DE PROTESIS DENTAL', categoria: 'Prótesis', es_frecuente: true },

    // Periodoncia, Cirugía Oral y Maxilofacial
    { codigo_cups: '227101', nombre_oficial: 'REPARACION DE FISTULA OROANTRAL Y/U ORONASAL', categoria: 'Cirugía', es_frecuente: true },
    { codigo_cups: '227200', nombre_oficial: 'ELEVACION DEL PISO DEL SENO MAXILAR', categoria: 'Cirugía', es_frecuente: true },
    { codigo_cups: '230100', nombre_oficial: 'EXODONCIA DE DIENTES PERMANENTES SOD', categoria: 'Cirugía', es_frecuente: true },
    { codigo_cups: '230101', nombre_oficial: 'EXODONCIA DE DIENTES PERMANENTES UNIRRADICULARES', categoria: 'Cirugía', es_frecuente: true },
    { codigo_cups: '230102', nombre_oficial: 'EXODONCIA DE DIENTES PERMANENTES MULTIRRADICULARES', categoria: 'Cirugía', es_frecuente: true },
    { codigo_cups: '231100', nombre_oficial: 'EXODONCIA QUIRURGICA UNIRRADICULAR', categoria: 'Cirugía', es_frecuente: true },
    { codigo_cups: '231200', nombre_oficial: 'EXODONCIA QUIRURGICA MULTIRRADICULAR', categoria: 'Cirugía', es_frecuente: true },
    { codigo_cups: '231300', nombre_oficial: 'EXODONCIA DE DIENTE INCLUIDO SOD', categoria: 'Cirugía', es_frecuente: true },
    { codigo_cups: '231301', nombre_oficial: 'EXODONCIA DE DIENTE INCLUIDO', categoria: 'Cirugía', es_frecuente: true },
    { codigo_cups: '231302', nombre_oficial: 'EXODONCIA DE INCLUIDOS EN POSICIÓN ECTÓPICA CON ABORDAJE INTRAORAL (POR DIENTE)', categoria: 'Cirugía', es_frecuente: true },
    { codigo_cups: '231303', nombre_oficial: 'EXODONCIA DE INCLUIDOS EN POSICIÓN ECTÓPICA CON ABORDAJE EXTRAORAL (POR DIENTE)', categoria: 'Cirugía', es_frecuente: true },
    { codigo_cups: '231400', nombre_oficial: 'EXODONCIAS MÚLTIPLES CON ALVEOLOPLASTIA, POR CUADRANTE', categoria: 'Cirugía', es_frecuente: true },
    { codigo_cups: '231500', nombre_oficial: 'COLGAJO DESPLAZADO PARA ABORDAJE DE DIENTE RETENIDO (VENTANA QUIRURGICA)', categoria: 'Cirugía', es_frecuente: true },
    { codigo_cups: '235200', nombre_oficial: 'TRANSPLANTE DE DIENTE (INTENCIONAL)', categoria: 'Cirugía', es_frecuente: true },
    { codigo_cups: '236300', nombre_oficial: 'IMPLANTE DENTAL ALOPLASTICO (OSEOINTEGRACION)', categoria: 'Prótesis', es_frecuente: true },
    { codigo_cups: '237401', nombre_oficial: 'CURETAJE APICAL CON APICECTOMIA Y OBTURACION RETROGADA [CIRUGIA PERIRRADICULAR]', categoria: 'Cirugía', es_frecuente: true },
    { codigo_cups: '237701', nombre_oficial: 'RADECTOMIA (AMPUTACIÓN RADICULAR) UNICA', categoria: 'Cirugía', es_frecuente: true },
    { codigo_cups: '237702', nombre_oficial: 'RADECTOMIA (AMPUTACIÓN RADICULAR) MULTIPLE', categoria: 'Cirugía', es_frecuente: true },
    { codigo_cups: '237800', nombre_oficial: 'HEMISECCION DEL DIENTE', categoria: 'Cirugía', es_frecuente: true },
    { codigo_cups: '237902', nombre_oficial: 'EXPLORACION Y MOVILIZACION DE NERVIO DENTARIO INFERIOR', categoria: 'Cirugía', es_frecuente: true },
    { codigo_cups: '240100', nombre_oficial: 'OPERCULECTOMÍA NCOC', categoria: 'Cirugía', es_frecuente: true },
    { codigo_cups: '240200', nombre_oficial: 'DETARTRAJE SUBGINGIVAL (POR CUADRANTE)', categoria: 'Periodoncia', es_frecuente: true },
    { codigo_cups: '240300', nombre_oficial: 'ALISADO RADICULAR, CAMPO CERRADO (POR SEXTANTE)', categoria: 'Periodoncia', es_frecuente: true },
    { codigo_cups: '240400', nombre_oficial: 'DRENAJE DE COLECCION PERIODONTAL (CERRADO CON ALISADO RADICULAR SOD)', categoria: 'Periodoncia', es_frecuente: true },
    { codigo_cups: '240600', nombre_oficial: 'DRENAJE DE ABSCESOS PERIODONTALES', categoria: 'Periodoncia', es_frecuente: true },
    { codigo_cups: '241100', nombre_oficial: 'BIOPSIA DE ENCÍA SOD', categoria: 'Cirugía', es_frecuente: true },
    { codigo_cups: '241101', nombre_oficial: 'BIOPSIA INCISIONAL DE ENCÍA', categoria: 'Cirugía', es_frecuente: true },
    { codigo_cups: '241102', nombre_oficial: 'BIOPSIA ESCISIONAL DE ENCÍA CON CIERRE PRIMARIO', categoria: 'Cirugía', es_frecuente: true },
    { codigo_cups: '241103', nombre_oficial: 'BIOPSIA ESCISIONAL DE ENCÍA Y RECUBRIMIENTO CON COLGAJO O INJERTO', categoria: 'Cirugía', es_frecuente: true },
    { codigo_cups: '241200', nombre_oficial: 'BIOPSIA DE PARED ALVEOLAR SOD', categoria: 'Cirugía', es_frecuente: true },
    { codigo_cups: '242101', nombre_oficial: 'PLASTIA MUCOGINGIVAL CON INJERTOS PEDICULADOS (COLGAJOS PEDICULADOS)', categoria: 'Periodoncia', es_frecuente: true },
    { codigo_cups: '242102', nombre_oficial: 'PLASTIA MUCOGINGIVAL CON INJERTO GINGIVAL LIBRE (CADA DIENTE)', categoria: 'Periodoncia', es_frecuente: true },
    { codigo_cups: '242201', nombre_oficial: 'CURETAJE A CAMPO ABIERTO POR SEXTANTE', categoria: 'Periodoncia', es_frecuente: true },
    { codigo_cups: '242202', nombre_oficial: 'CIRUGIA A COLGAJO CON RESECCION RADICULAR (AMPUTACION, HEMISECCION)', categoria: 'Periodoncia', es_frecuente: true },
    { codigo_cups: '242204', nombre_oficial: 'AUMENTO DE REBORDE PARCIALMENTE EDENTULO (SIN MATERIAL)', categoria: 'Periodoncia', es_frecuente: true },
    { codigo_cups: '242205', nombre_oficial: 'AUMENTO DE REBORDE PARCIALMENTE EDENTULO (CON MATERIAL)', categoria: 'Periodoncia', es_frecuente: true },
    { codigo_cups: '242300', nombre_oficial: 'PLASTIAS PREPROTESICAS (AUMENTO DE CORONA CLINICA)', categoria: 'Periodoncia', es_frecuente: true },

    // Adicionales estándar del frontend
    { codigo_cups: '890201', nombre_oficial: 'CONSULTA DE PRIMERA VEZ POR ODONTOLOGÍA GENERAL', categoria: 'Preventivo', es_frecuente: true },
    { codigo_cups: '890202', nombre_oficial: 'CONTROL DE PRIMERA VEZ POR ODONTOLOGÍA GENERAL', categoria: 'Preventivo', es_frecuente: true },
    { codigo_cups: '890203', nombre_oficial: 'PROFILAXIS DENTAL Y CONTROL DE PLACA', categoria: 'Preventivo', es_frecuente: true },
    { codigo_cups: '890204', nombre_oficial: 'APLICACIÓN TÓPICA DE FLÚOR EN GEL O BARNIZ', categoria: 'Preventivo', es_frecuente: true },
    { codigo_cups: '890205', nombre_oficial: 'APLICACIÓN DE SELLANTES DE FOSAS Y FISURAS', categoria: 'Preventivo', es_frecuente: true },
    { codigo_cups: '890206', nombre_oficial: 'RADIOGRAFÍA PERIAPICAL O CORONAL', categoria: 'Preventivo', es_frecuente: false },
    { codigo_cups: '890301', nombre_oficial: 'RESTAURACIÓN DENTAL CON RESINA DE FOTOCURADO', categoria: 'Restaurador', es_frecuente: true },
    { codigo_cups: '890302', nombre_oficial: 'RESTAURACIÓN ODONTOLÓGICA CON AMALGAMA', categoria: 'Restaurador', es_frecuente: false },
    { codigo_cups: '890303', nombre_oficial: 'INCRUSTACIÓN METÁLICA O ESTÉTICA (INLAY/ONLAY)', categoria: 'Restaurador', es_frecuente: false },
    { codigo_cups: '890304', nombre_oficial: 'RECONSTRUCCIÓN DE MUÑÓN CON NÚCLEO PREFABRICADO', categoria: 'Restaurador', es_frecuente: true },
    { codigo_cups: '890401', nombre_oficial: 'TRATAMIENTO DE CONDUCTOS EN DENTICIÓN PERMANENTE UNIRRADICULAR', categoria: 'Endodoncia', es_frecuente: true },
    { codigo_cups: '890402', nombre_oficial: 'TRATAMIENTO DE CONDUCTOS EN DENTICIÓN PERMANENTE BIRRADICULAR', categoria: 'Endodoncia', es_frecuente: true },
    { codigo_cups: '890403', nombre_oficial: 'TRATAMIENTO DE CONDUCTOS EN DENTICIÓN PERMANENTE MULTIRRADICULAR', categoria: 'Endodoncia', es_frecuente: false },
    { codigo_cups: '890404', nombre_oficial: 'RETRATAMIENTO ENDODÓNTICO EN DIENTE UNIRRADICULAR O MULTIRRADICULAR', categoria: 'Endodoncia', es_frecuente: false },
    { codigo_cups: '890701', nombre_oficial: 'INSTALACIÓN DE APARATOLOGÍA FIJA DE ORTODONCIA (BRACKETS)', categoria: 'Ortodoncia', es_frecuente: true },
    { codigo_cups: '890702', nombre_oficial: 'CONTROL MENSUAL DE TRATAMIENTO DE ORTODONCIA', categoria: 'Ortodoncia', es_frecuente: true },
    { codigo_cups: '890703', nombre_oficial: 'ELABORACIÓN E INSTALACIÓN DE RETENEDORES DE ORTODONCIA', categoria: 'Ortodoncia', es_frecuente: false },
    { codigo_cups: '890501', nombre_oficial: 'EXODONCIA DE DIENTE PERMANENTE UNIRRADICULAR O MULTIRRADICULAR', categoria: 'Cirugía', es_frecuente: true },
    { codigo_cups: '890502', nombre_oficial: 'EXODONCIA QUIRÚRGICA DE TERCER MOLAR RETENIDO O INCLUIDO', categoria: 'Cirugía', es_frecuente: true },
    { codigo_cups: '890503', nombre_oficial: 'FRENECTOMÍA LABIAL O LINGUAL', categoria: 'Cirugía', es_frecuente: false },
    { codigo_cups: '890801', nombre_oficial: 'COLOCACIÓN DE CORONA COMPLETA INDIVIDUAL EN METAL-CERÁMICA O ZIRCONIO', categoria: 'Prótesis', es_frecuente: true },
    { codigo_cups: '890802', nombre_oficial: 'PRÓTESIS PARCIAL REMOVIBLE ACRÍLICA O METÁLICA', categoria: 'Prótesis', es_frecuente: false },
    { codigo_cups: '890803', nombre_oficial: 'PRÓTESIS TOTAL SUPERIOR E INFERIOR ACRÍLICA', categoria: 'Prótesis', es_frecuente: false },
    { codigo_cups: '890804', nombre_oficial: 'IMPLANTE DENTAL OSEOINTEGRADO INDIVIDUAL', categoria: 'Prótesis', es_frecuente: true }
  ]

  console.log(`Poblando catálogo oficial CUPS (${cupsList.length} registros)...`)
  for (const item of cupsList) {
    await prisma.catalogoOficialCups.upsert({
      where: { codigo_cups: item.codigo_cups },
      update: {
        nombre_oficial: item.nombre_oficial,
        categoria: item.categoria,
        es_frecuente: item.es_frecuente
      },
      create: item
    })
  }

  // Poblar procedimientos iniciales para el consultorio 1 tomados del catálogo oficial
  const procsSemillaConsultorio = [
    { codigo_cups: '890201', nombre_visible: 'Valoración inicial', precio: 50000 },
    { codigo_cups: '997500', nombre_visible: 'Profilaxis dental', precio: 60000 },
    { codigo_cups: '232102', nombre_visible: 'Resina compuesta', precio: 120000 },
    { codigo_cups: '237301', nombre_visible: 'Endodoncia unirradicular', precio: 400000 },
    { codigo_cups: '230101', nombre_visible: 'Exodoncia simple', precio: 80000 },
    { codigo_cups: '231301', nombre_visible: 'Cirugía de terceros molares', precio: 350000 },
    { codigo_cups: '893106', nombre_visible: 'Control de ortodoncia', precio: 80000 },
    { codigo_cups: '234201', nombre_visible: 'Corona dental', precio: 800000 },
    { codigo_cups: '236300', nombre_visible: 'Implante dental', precio: 2500000 }
  ]

  for (const p of procsSemillaConsultorio) {
    const oficial = await prisma.catalogoOficialCups.findUnique({
      where: { codigo_cups: p.codigo_cups }
    })

    if (oficial) {
      await prisma.procedimientoConsultorio.upsert({
        where: {
          consultorio_id_catalogo_oficial_id: {
            consultorio_id: config.id,
            catalogo_oficial_id: oficial.id
          }
        },
        update: {
          nombre_visible: p.nombre_visible,
          precio: p.precio
        },
        create: {
          consultorio_id: config.id,
          catalogo_oficial_id: oficial.id,
          nombre_visible: p.nombre_visible,
          precio: p.precio,
          activo: true
        }
      })
    }
  }

  console.log('✅ Seed completado con éxito')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())