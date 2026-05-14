// src/data/citasData.js
import { pacientesIniciales } from './pacientesData';

export const ESTADOS_CITA = ['Pendiente', 'Asistio', 'No asistio', 'Cancelada'];

export const MOTIVOS = [
  'Consulta general',
  'Limpieza dental',
  'Extraccion',
  'Ortodoncia',
  'Endodoncia',
  'Blanqueamiento',
  'Revision de tratamiento',
  'Urgencia',
];

export const DOCTORES = [
  'Dr. Rivera',
  'Dra. Salcedo',
  'Dr. Mendez',
];

export const ESTADO_ESTILOS = {
  Pendiente: { badge: 'bg-status-amberBg text-status-amber', dot: 'bg-status-amberMid', border: 'border-l-status-amberMid' },
  Asistio: { badge: 'bg-status-greenBg text-status-green', dot: 'bg-[#3B6D11]', border: 'border-l-[#5DC2A4]' },
  'No asistio': { badge: 'bg-[#F3F3F3] text-[#666]', dot: 'bg-[#999]', border: 'border-l-[#999]' },
  Cancelada: { badge: 'bg-status-redBg text-status-red', dot: 'bg-status-red', border: 'border-l-status-red' },
};

export const citasIniciales = [];

export const pacientesParaSelector = pacientesIniciales.map((p) => ({
  id: p.id,
  nombre: p.nombre,
}));
