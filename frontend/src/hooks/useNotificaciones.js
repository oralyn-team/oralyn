// src/hooks/useNotificaciones.js
import { useMemo } from 'react';

const DIAS_SIN_VISITA = 30; // alerta si lleva más de 30 días sin visitar

function diasDesde(fechaStr) {
  const hoy    = new Date();
  const fecha  = new Date(fechaStr);
  const diff   = hoy - fecha;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function useNotificaciones(pacientes) {
  const notificaciones = useMemo(() => {
    const resultado = [];

    pacientes.forEach((p) => {
      const dias = diasDesde(p.ultimaVisita);

      // Paciente sin visita hace más de 30 días
      if (dias > DIAS_SIN_VISITA) {
        resultado.push({
          id:     `sin-visita-${p.id}`,
          tipo:   'advertencia',
          icono:  'clock',
          titulo: 'Sin visita reciente',
          mensaje: `${p.nombre} lleva ${dias} días sin visitar.`,
          fecha:  p.ultimaVisita,
        });
      }

      // Paciente con estado Pendiente
      if (p.estado === 'Pendiente') {
        resultado.push({
          id:     `pendiente-${p.id}`,
          tipo:   'pendiente',
          icono:  'alert',
          titulo: 'Tratamiento pendiente',
          mensaje: `${p.nombre} tiene atención pendiente.`,
          fecha:  p.ultimaVisita,
        });
      }

      // Paciente nuevo sin seguimiento (nuevo y lleva más de 7 días)
      if (p.estado === 'Nuevo' && dias > 7) {
        resultado.push({
          id:     `nuevo-sin-seguimiento-${p.id}`,
          tipo:   'info',
          icono:  'user',
          titulo: 'Nuevo sin seguimiento',
          mensaje: `${p.nombre} se registró hace ${dias} días y no ha vuelto.`,
          fecha:  p.ultimaVisita,
        });
      }
    });

    // Las más recientes (más días = más urgente) primero
    return resultado.sort((a, b) => diasDesde(a.fecha) - diasDesde(b.fecha)).reverse();
  }, [pacientes]);

  return notificaciones;
}