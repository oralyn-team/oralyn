// src/hooks/useNotificaciones.js
import { useMemo } from 'react';

const DIAS_SIN_VISITA = 30; // alerta si lleva más de 30 días sin visitar

function diasDesde(fechaStr) {
  if (!fechaStr) return null;
  const hoy    = new Date();
  const fecha  = new Date(fechaStr);
  if (isNaN(fecha.getTime())) return null;
  const diff   = hoy - fecha;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function useNotificaciones(pacientes) {
  const notificaciones = useMemo(() => {
    const resultado = [];

    pacientes.forEach((p) => {
      const nombre = [p.nombres, p.primer_apellido, p.segundo_apellido].filter(Boolean).join(' ');

      // 1. Paciente sin visita reciente
      if (p.ultimaVisita) {
        const diasVisita = diasDesde(p.ultimaVisita);
        if (diasVisita !== null && diasVisita > DIAS_SIN_VISITA) {
          resultado.push({
            id:     `sin-visita-${p.id}`,
            tipo:   'advertencia',
            icono:  'clock',
            titulo: 'Sin visita reciente',
            mensaje: `${nombre} lleva ${diasVisita} días sin visitar.`,
            fecha:  p.ultimaVisita,
          });
        }
      }

      // 2. Paciente con estado Pendiente (citas y saldo pendiente)
      if (p.estado === 'Pendiente') {
        resultado.push({
          id:     `pendiente-${p.id}`,
          tipo:   'pendiente',
          icono:  'alert',
          titulo: 'Tratamiento pendiente',
          mensaje: `${nombre} tiene tratamientos y saldos pendientes por atender.`,
          fecha:  p.ultimaVisita || p.creado_en,
        });
      }

      // 3. Paciente nuevo sin seguimiento (registrado hace más de 7 días y no tiene visitas)
      if (p.estado === 'Nuevo') {
        const diasCreado = diasDesde(p.creado_en);
        if (diasCreado !== null && diasCreado > 7) {
          resultado.push({
            id:     `nuevo-sin-seguimiento-${p.id}`,
            tipo:   'info',
            icono:  'user',
            titulo: 'Nuevo sin seguimiento',
            mensaje: `${nombre} se registró hace ${diasCreado} días y no registra visitas.`,
            fecha:  p.creado_en,
          });
        }
      }
    });

    // Las más urgentes primero (las que tienen mayor cantidad de días desde la última interacción)
    return resultado.sort((a, b) => {
      const diasA = diasDesde(a.fecha) || 0;
      const diasB = diasDesde(b.fecha) || 0;
      return diasB - diasA;
    });
  }, [pacientes]);

  return notificaciones;
}