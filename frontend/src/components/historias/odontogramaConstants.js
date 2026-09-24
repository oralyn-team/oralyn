// src/components/historias/odontogramaConstants.js

// Aparatología seleccionable por diente (multi-selección, no excluyente)
export const APARATOLOGIA = [
  { key: 'bracket',      label: 'Bracket' },
  { key: 'banda',        label: 'Banda' },
  { key: 'tubo',         label: 'Tubo' },
  { key: 'boton',        label: 'Botón' },
  { key: 'miniImplante', label: 'Mini implante' },
  { key: 'ligadura',     label: 'Ligadura' },
  { key: 'retenedor',    label: 'Retenedor' },
];
export const APARATOLOGIA_LABELS = Object.fromEntries(APARATOLOGIA.map((a) => [a.key, a.label]));

// Configuraciones de elásticos intermaxilares (diente → diente)
export const TIPOS_ELASTICO = [
  { key: 'clase-i',   label: 'Clase I' },
  { key: 'clase-ii',  label: 'Clase II' },
  { key: 'clase-iii', label: 'Clase III' },
  { key: 'cruzado',   label: 'Cruzado' },
  { key: 'vertical',  label: 'Vertical' },
  { key: 'triangulo', label: 'Triángulo' },
];
export const COLOR_ELASTICO = {
  'clase-i':   '#0EA5A5',
  'clase-ii':  '#D97706',
  'clase-iii': '#DC2626',
  cruzado:     '#7C3AED',
  vertical:    '#2563EB',
  triangulo:   '#DB2777',
};
