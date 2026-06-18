// src/data/pacientesData.js

export const COLORES_AVATAR = [
  { bg: 'bg-[#E1F5EE]', text: 'text-[#0F6E56]' },
  { bg: 'bg-[#E6F1FB]', text: 'text-[#185FA5]' },
  { bg: 'bg-[#FAEEDA]', text: 'text-[#854F0B]' },
  { bg: 'bg-[#FBEAF0]', text: 'text-[#993556]' },
  { bg: 'bg-[#EEEDFE]', text: 'text-[#3C3489]' },
  { bg: 'bg-[#EAF3DE]', text: 'text-[#3B6D11]' },
];

export const pacientesIniciales = [
  {
    id: 1,
    nombre: 'Laura Martínez Gómez',
    cedula: '1020304050',
    telefono: '310 123 4567',
    ultimaVisita: '2024-04-10',
    estado: 'Al día',
  },
  {
    id: 2,
    nombre: 'Carlos Herrera Ruiz',
    cedula: '79856321',
    telefono: '320 987 6543',
    ultimaVisita: '2024-03-02',
    estado: 'Pendiente',
  },
  {
    id: 3,
    nombre: 'Sofía Ramírez Torres',
    cedula: '1013456789',
    telefono: '315 456 7890',
    ultimaVisita: '2024-04-20',
    estado: 'Al día',
  },
  {
    id: 4,
    nombre: 'Andrés Castillo Vega',
    cedula: '98765432',
    telefono: '300 654 3210',
    ultimaVisita: '2024-02-15',
    estado: 'Pendiente',
  },
  {
    id: 5,
    nombre: 'Valentina Cruz Mora',
    cedula: '1001234567',
    telefono: '312 345 6789',
    ultimaVisita: '2024-04-25',
    estado: 'Nuevo',
  },
  {
    id: 6,
    nombre: 'Diego Vargas López',
    cedula: '80234567',
    telefono: '316 789 0123',
    ultimaVisita: '2024-01-30',
    estado: 'Pendiente',
  },
];

// Helpers
export function getInitiales(nombre) {
  const partes = nombre.trim().split(' ');
  return (partes[0][0] + (partes[1] ? partes[1][0] : '')).toUpperCase();
}

export function getColorAvatar(id) {
  return COLORES_AVATAR[id % COLORES_AVATAR.length];
}

export function getTagEstado(estado) {
  switch (estado) {
    case 'Al día':
      return 'bg-status-greenBg text-status-green';
    case 'Nuevo':
      return 'bg-status-blueBg text-status-blue';
    default:
      return 'bg-status-amberBg text-status-amber';
  }
}