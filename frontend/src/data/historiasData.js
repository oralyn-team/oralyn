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

export const historiasIniciales = [];