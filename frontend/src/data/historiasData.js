// src/data/historiasData.js

export const ESTADOS_DIENTE = {
  sano:       { label: 'Sano',        color: '#3ECFCF', fill: '#E1F5EE', text: '#0F6E56' },
  caries:     { label: 'Caries',      color: '#EF9F27', fill: '#FAEEDA', text: '#854F0B' },
  extraido:   { label: 'Extraído',    color: '#A32D2D', fill: '#FDECEA', text: '#A32D2D' },
  corona:     { label: 'Corona',      color: '#185FA5', fill: '#E6F1FB', text: '#185FA5' },
  endodoncia: { label: 'Endodoncia',  color: '#993556', fill: '#FBEAF0', text: '#993556' },
  implante:   { label: 'Implante',    color: '#3C3489', fill: '#EEEDFE', text: '#3C3489' },
  obturado:   { label: 'Obturado',    color: '#3B6D11', fill: '#EAF3DE', text: '#3B6D11' },
};

export const DIENTES_SUPERIORES = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
export const DIENTES_INFERIORES = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];

export const TIPOS_SANGRE = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
export const SEXOS        = ['Masculino','Femenino','Otro'];
export const ESTADOS_CIVILES = ['Soltero/a','Casado/a','Unión libre','Divorciado/a','Viudo/a'];

// Antecedentes médicos — checkbox Sí/No
export const ANTECEDENTES_MEDICOS = [
  'Tratamiento médico con medicación',
  'Problemas de coagulación',
  'Irradiaciones',
  'Trastorno de tensión arterial',
  'Sinusitis',
  'Enfermedades respiratorias',
  'Cardiopatías',
  'Diabetes',
  'Fiebre reumática',
  'Hepatitis',
  'Síndrome de inmunodeficiencia adquirida (VIH)',
  'Trastornos emocionales',
];

// Hábitos orales nocivos — checkbox de presencia
export const HABITOS_ORALES = [
  'Mala higiene',
  'Respiración bucal',
  'Succión de dedo',
  'Queilofagia',
  'Lengua protráctil',
  'Otros',
];

// Examen estomatológico — estructura con Sí/No
export const ESTRUCTURAS_ESTOMATOLOGICAS = [
  // col 1
  'Labio inferior','Labio superior','Comisura','Mucosa oral',
  'Surcos vestibulares','Mejillas','Proceso alveolar',
  // col 2
  'Orofaringe','Paladar','Glándulas salivares','Piso de boca',
  'Dorso de lengua','Vientre de lengua',
  // col 3
  'Paladar blando','Paladar duro','Vientre de lengua','Parótidas',
  'G. salivales','Maxilares',
  // col 4
  'Ruidos','Desviación','Cambio de volumen','Bloqueo mandibular',
  'Limitación de apertura','Dolor articular','Dolor muscular',
];

// Estado inicial de antecedentes
function initAntecedentes() {
  return Object.fromEntries(ANTECEDENTES_MEDICOS.map((k) => [k, null])); // null = sin marcar, true = Sí, false = No
}

function initHabitos() {
  return Object.fromEntries(HABITOS_ORALES.map((k) => [k, false]));
}

function initEstomatologico() {
  return Object.fromEntries(ESTRUCTURAS_ESTOMATOLOGICAS.map((k) => [k, null]));
}

export const historiasIniciales = [
  {
    id: 1,
    pacienteId:       1,
    pacienteNombre:   'Laura Martínez Gómez',
    cedula:           '1020304050',
    fechaCreacion:    '2023-01-15',
    // Identificación extendida
    fechaNacimiento:  '1990-05-12',
    sexo:             'Femenino',
    estadoCivil:      'Casado/a',
    direccion:        'Calle 32 #18-45, Barzal',
    ocupacion:        'Docente',
    tipoSangre:       'O+',
    rh:               '+',
    // Antecedentes
    alergias:         'Penicilina, Ibuprofeno',
    medicamentos:     'Ninguno',
    antOdontologicos: 'Extracción molar inferior hace 2 años. Ortodoncia completada.',
    antecedentes:     { ...initAntecedentes(), 'Trastorno de tensión arterial': true, 'Trastorno de tensión arterial_obs': 'Hipertensión controlada' },
    habitosOrales:    { ...initHabitos(), 'Mala higiene': true },
    habitosObs:       '',
    estomatologico:   initEstomatologico(),
    estomatologicoObs:'',
    motivoConsulta:   'Control y limpieza dental',
    eventoAdverso:    false,
    eventoAdversoObs: '',
    // Odontograma
    odontograma: { 16: 'corona', 17: 'extraido', 46: 'caries', 36: 'obturado' },
    // Evoluciones
    evoluciones: [
      {
        id: 1,
        fecha: '2024-04-10', motivo: 'Limpieza dental',
        diagnostico: 'Cálculo dental moderado. Gingivitis leve.',
        tratamiento: 'Profilaxis y detartraje supragingival.',
        doctor: 'Dr. Rivera', observaciones: 'Se recomienda mejor técnica de cepillado.',
      },
    ],
    adjuntos: [
      { id: 1, nombre: 'Radiografia_panoramica.jpg', tipo: 'imagen', fecha: '2024-04-10' },
    ],
  },
  {
    id: 2,
    pacienteId:       2,
    pacienteNombre:   'Carlos Herrera Ruiz',
    cedula:           '79856321',
    fechaCreacion:    '2022-08-10',
    fechaNacimiento:  '1975-11-03',
    sexo:             'Masculino',
    estadoCivil:      'Casado/a',
    direccion:        'Barrio La Rosita, Cra 22 #10-15',
    ocupacion:        'Comerciante',
    tipoSangre:       'A+',
    rh:               '+',
    alergias:         'Ninguna conocida',
    medicamentos:     'Losartán 50mg',
    antOdontologicos: 'Sin tratamientos previos relevantes.',
    antecedentes:     { ...initAntecedentes(), 'Diabetes': true, 'Trastorno de tensión arterial': true },
    habitosOrales:    { ...initHabitos(), 'Respiración bucal': true },
    habitosObs:       '',
    estomatologico:   initEstomatologico(),
    estomatologicoObs:'',
    motivoConsulta:   'Dolor molar inferior',
    eventoAdverso:    false,
    eventoAdversoObs: '',
    odontograma: { 18: 'extraido', 28: 'extraido', 36: 'caries', 46: 'caries', 11: 'obturado' },
    evoluciones: [
      {
        id: 1,
        fecha: '2024-03-02', motivo: 'Extracción',
        diagnostico: 'Molar 36 con caries profunda, no restaurable.',
        tratamiento: 'Extracción simple molar 36.',
        doctor: 'Dra. Salcedo', observaciones: 'Paciente diabético — control glucémico previo confirmado.',
      },
    ],
    adjuntos: [
      { id: 1, nombre: 'RX_periapical_36.jpg', tipo: 'imagen', fecha: '2024-03-02' },
    ],
  },
  {
    id: 3,
    pacienteId:       3,
    pacienteNombre:   'Sofía Ramírez Torres',
    cedula:           '1013456789',
    fechaCreacion:    '2023-06-01',
    fechaNacimiento:  '2000-03-22',
    sexo:             'Femenino',
    estadoCivil:      'Soltero/a',
    direccion:        'Urbanización El Refugio',
    ocupacion:        'Estudiante',
    tipoSangre:       'B+',
    rh:               '+',
    alergias:         'Látex',
    medicamentos:     'Ninguno',
    antOdontologicos: 'Ortodoncia en curso desde 2022.',
    antecedentes:     initAntecedentes(),
    habitosOrales:    initHabitos(),
    habitosObs:       '',
    estomatologico:   initEstomatologico(),
    estomatologicoObs:'',
    motivoConsulta:   'Control ortodoncia',
    eventoAdverso:    false,
    eventoAdversoObs: '',
    odontograma:      {},
    evoluciones: [
      {
        id: 1,
        fecha: '2024-04-20', motivo: 'Control ortodoncia',
        diagnostico: 'Alineación en progreso. Buen avance.',
        tratamiento: 'Cambio de arco y ajuste de brackets.',
        doctor: 'Dr. Rivera', observaciones: 'Próximo control en 4 semanas.',
      },
    ],
    adjuntos: [],
  },
];