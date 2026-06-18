// src/components/tratamientos/constants.js

export const DOCTORES = [
  'Dr. Andrés Molina',
  'Dra. Carolina Vargas',
  'Dr. Felipe Torres',
  'Dra. Marcela Ríos',
  'Dr. Sebastián Peña',
  'Dra. Laura Mendoza',
];

export const PROCEDIMIENTOS_CAT = [
  {
    grupo: 'Preventivo',
    items: ['Valoración inicial', 'Profilaxis', 'Limpieza dental', 'Radiografía periapical', 'Radiografía panorámica'],
  },
  {
    grupo: 'Restaurador',
    items: ['Resina compuesta', 'Restauración', 'Incrustación (Inlay)', 'Corona dental', 'Sellante de fisuras'],
  },
  {
    grupo: 'Endodoncia',
    items: ['Endodoncia unirradicular', 'Endodoncia birradicular', 'Endodoncia trirradicular', 'Retratamiento endodóntico'],
  },
  {
    grupo: 'Cirugía',
    items: ['Exodoncia simple', 'Exodoncia quirúrgica', 'Cirugía de terceros molares', 'Implante dental', 'Frenectomía'],
  },
  {
    grupo: 'Estético',
    items: ['Blanqueamiento dental', 'Carillas de resina', 'Carillas de porcelana', 'Diseño de sonrisa'],
  },
  {
    grupo: 'Ortodoncia',
    items: ['Ortodoncia fija (inicio)', 'Control de ortodoncia', 'Ortodoncia invisible', 'Retenedores'],
  },
  {
    grupo: 'Prótesis',
    items: ['Prótesis parcial removible', 'Prótesis total', 'Prótesis fija (puente)', 'Provisional acrílico'],
  },
  {
    grupo: 'Periodoncia',
    items: ['Curetaje', 'Raspado y alisado radicular', 'Gingivoplastia', 'Control periodontal'],
  },
];

/** Cuadrantes con sus dientes (numeración FDI) */
export const CUADRANTES = [
  { id: 'sd', label: 'Superior derecho', dientes: [18, 17, 16, 15, 14, 13, 12, 11] },
  { id: 'si', label: 'Superior izquierdo', dientes: [21, 22, 23, 24, 25, 26, 27, 28] },
  { id: 'ii', label: 'Inferior izquierdo', dientes: [31, 32, 33, 34, 35, 36, 37, 38] },
  { id: 'id', label: 'Inferior derecho', dientes: [48, 47, 46, 45, 44, 43, 42, 41] },
];

export const TODOS_DIENTES = CUADRANTES.flatMap((c) => c.dientes);

/** Tipos de aplicación del procedimiento */
export const TIPOS_APLICACION = [
  { value: 'general',   label: 'General',   desc: 'No requiere selección dental' },
  { value: 'dientes',   label: 'Dientes',   desc: 'Uno o varios dientes específicos' },
  { value: 'cuadrante', label: 'Cuadrante', desc: 'Un cuadrante completo' },
];

/** Estados del tratamiento completo */
export const ESTADOS_TRATAMIENTO = {
  borrador:   { label: 'Borrador',   bg: 'bg-slate-100',  text: 'text-slate-600',  dot: 'bg-slate-400'   },
  pendiente:  { label: 'Pendiente',  bg: 'bg-amber-50',   text: 'text-amber-700',  dot: 'bg-amber-400'   },
  aprobado:   { label: 'Aprobado',   bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-500'    },
  en_proceso: { label: 'En proceso', bg: 'bg-violet-50',  text: 'text-violet-700', dot: 'bg-violet-500'  },
  finalizado: { label: 'Finalizado', bg: 'bg-emerald-50', text: 'text-emerald-700',dot: 'bg-emerald-500' },
  cancelado:  { label: 'Cancelado',  bg: 'bg-red-50',     text: 'text-red-600',    dot: 'bg-red-400'     },
};

/** Estados por procedimiento individual */
export const ESTADOS_PROC = {
  pendiente:  { label: 'Pendiente',  cls: 'bg-amber-50  text-amber-700  border-amber-200'   },
  en_proceso: { label: 'En proceso', cls: 'bg-violet-50 text-violet-700 border-violet-200'  },
  realizado:  { label: 'Realizado',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelado:  { label: 'Cancelado',  cls: 'bg-red-50    text-red-600    border-red-200'     },
};

export const METODOS_PAGO = [
  'Efectivo',
  'Transferencia bancaria',
  'Tarjeta débito',
  'Tarjeta crédito',
  'Nequi',
  'Daviplata',
  'Otro',
];

export const TIPOS_TRATAMIENTO = [
  'Tratamiento integral',
  'Rehabilitación oral',
  'Tratamiento estético',
  'Urgencia odontológica',
  'Ortodoncia',
  'Implantología',
  'Control y mantenimiento',
];

export const PRIORIDADES = [
  { value: 'baja',  label: 'Baja',  color: 'text-slate-500' },
  { value: 'media', label: 'Media', color: 'text-amber-600' },
  { value: 'alta',  label: 'Alta',  color: 'text-red-600'   },
];