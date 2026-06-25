// src/hooks/useNotificaciones.js
import { useMemo } from 'react';

const DIAS_SIN_VISITA = 30; // alerta si lleva más de 30 días sin visitar

function diasDesde(fechaStr) {
  if (!fechaStr) return null;
  const hoy   = new Date();
  const fecha = new Date(fechaStr);
  if (isNaN(fecha.getTime())) return null;
  const diff  = hoy - fecha;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function formatFecha(fechaStr) {
  if (!fechaStr) return '';
  const fecha = new Date(fechaStr);
  if (isNaN(fecha.getTime())) return '';
  return fecha.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function useNotificaciones(pacientes) {
  const notificaciones = useMemo(() => {
    const resultado = [];

    pacientes.forEach((p) => {
      const nombre = [p.nombres, p.primer_apellido, p.segundo_apellido].filter(Boolean).join(' ');

      // 1. Paciente con saldo/pago pendiente (usa el campo saldoPendiente del backend)
      if (p.saldoPendiente > 0 || p.estado === 'Pendiente') {
        const cuantos = p.tratamientosPendientes || 1;
        resultado.push({
          id:      `pago-pendiente-${p.id}`,
          tipo:    'pendiente',
          icono:   'alert',
          titulo:  'Pago pendiente',
          mensaje: `${nombre} tiene ${cuantos > 1 ? `${cuantos} tratamientos` : 'un tratamiento'} con saldo por pagar.`,
          fecha:   p.ultimaVisita || p.creado_en,
        });
      }

      // 2. Cita próxima agendada (citas futuras pendientes)
      if (p.citasPendientes > 0 && p.proximaCita) {
        resultado.push({
          id:      `cita-proxima-${p.id}`,
          tipo:    'info',
          icono:   'calendar',
          titulo:  'Cita agendada',
          mensaje: `${nombre} tiene una cita el ${formatFecha(p.proximaCita)}.`,
          fecha:   p.proximaCita,
        });
      }

      // 3. Paciente sin visita reciente (más de 30 días desde su última cita pasada)
      if (p.ultimaVisita && !p.proximaCita) {
        const diasVisita = diasDesde(p.ultimaVisita);
        if (diasVisita !== null && diasVisita > DIAS_SIN_VISITA) {
          resultado.push({
            id:      `sin-visita-${p.id}`,
            tipo:    'advertencia',
            icono:   'clock',
            titulo:  'Sin visita reciente',
            mensaje: `${nombre} lleva ${diasVisita} días sin visitar.`,
            fecha:   p.ultimaVisita,
          });
        }
      }

      // 4. Paciente nuevo sin seguimiento (registrado hace más de 7 días y no tiene visitas ni citas)
      if (p.estado === 'Nuevo' && !p.proximaCita) {
        const diasCreado = diasDesde(p.creado_en);
        if (diasCreado !== null && diasCreado > 7) {
          resultado.push({
            id:      `nuevo-sin-seguimiento-${p.id}`,
            tipo:    'info',
            icono:   'user',
            titulo:  'Nuevo sin seguimiento',
            mensaje: `${nombre} se registró hace ${diasCreado} días y no registra visitas.`,
            fecha:   p.creado_en,
          });
        }
      }
    });

    // Las más urgentes primero
    return resultado.sort((a, b) => {
      // Pagos pendientes siempre primero
      if (a.tipo === 'pendiente' && b.tipo !== 'pendiente') return -1;
      if (b.tipo === 'pendiente' && a.tipo !== 'pendiente') return 1;
      // Luego por fecha más reciente/próxima
      return new Date(b.fecha) - new Date(a.fecha);
    });
  }, [pacientes]);

  return notificaciones;
}