// src/data/citasData.js
import { pacientesIniciales } from './pacientesData';

export const ESTADOS_CITA = ['Pendiente', 'Confirmada', 'Completada', 'Cancelada', 'No asistió'];

export const MOTIVOS = [
  'Consulta general',
  'Limpieza dental',
  'Extracción',
  'Ortodoncia',
  'Endodoncia',
  'Blanqueamiento',
  'Revisión de tratamiento',
  'Urgencia',
];

export const DOCTORES = [
  'Dr. Rivera',
  'Dra. Salcedo',
  'Dr. Méndez',
];

export const ESTADO_ESTILOS = {
  'Pendiente':  { badge: 'bg-status-amberBg text-status-amber',  dot: 'bg-status-amberMid', border: 'border-l-status-amberMid' },
  'Confirmada': { badge: 'bg-status-blueBg text-status-blue',    dot: 'bg-status-blueMid',  border: 'border-l-status-blueMid'  },
  'Completada': { badge: 'bg-status-greenBg text-status-green',  dot: 'bg-[#3B6D11]',       border: 'border-l-[#5DC2A4]'       },
  'Cancelada':  { badge: 'bg-status-redBg text-status-red',      dot: 'bg-status-red',      border: 'border-l-status-red'      },
  'No asistió': { badge: 'bg-[#F3F3F3] text-[#666]',            dot: 'bg-[#999]',          border: 'border-l-[#999]'          },
};

export const citasIniciales = [
  {
    id: 1, pacienteId: 1, pacienteNombre: 'Laura Martínez Gómez',
    fecha: '2025-05-05', hora: '09:00', motivo: 'Limpieza dental',
    doctor: 'Dr. Rivera', estado: 'Confirmada',
    observaciones: 'Paciente con sensibilidad en muela inferior derecha.',
  },
  {
    id: 2, pacienteId: 2, pacienteNombre: 'Carlos Herrera Ruiz',
    fecha: '2025-05-05', hora: '10:30', motivo: 'Extracción',
    doctor: 'Dra. Salcedo', estado: 'Pendiente', observaciones: '',
  },
  {
    id: 3, pacienteId: 3, pacienteNombre: 'Sofía Ramírez Torres',
    fecha: '2025-05-06', hora: '08:00', motivo: 'Ortodoncia',
    doctor: 'Dr. Rivera', estado: 'Confirmada',
    observaciones: 'Control mensual de brackets.',
  },
  {
    id: 4, pacienteId: 4, pacienteNombre: 'Andrés Castillo Vega',
    fecha: '2025-05-07', hora: '14:00', motivo: 'Consulta general',
    doctor: 'Dr. Méndez', estado: 'Pendiente', observaciones: '',
  },
  {
    id: 5, pacienteId: 5, pacienteNombre: 'Valentina Cruz Mora',
    fecha: '2025-05-08', hora: '11:00', motivo: 'Blanqueamiento',
    doctor: 'Dra. Salcedo', estado: 'Completada',
    observaciones: 'Tratamiento completado exitosamente.',
  },
  {
    id: 6, pacienteId: 6, pacienteNombre: 'Diego Vargas López',
    fecha: '2025-05-03', hora: '09:30', motivo: 'Endodoncia',
    doctor: 'Dr. Rivera', estado: 'No asistió',
    observaciones: 'No se presentó. Reagendar.',
  },
];

export const pacientesParaSelector = pacientesIniciales.map((p) => ({
  id: p.id, nombre: p.nombre,
}));