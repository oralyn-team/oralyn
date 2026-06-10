// src/components/tratamientos/helpers.js
import { CUADRANTES } from './constants';

// ─── Formateo ─────────────────────────────────────────────────────────────────

/** Formatea un número como pesos colombianos sin decimales */
export function fmt(n) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n || 0);
}

/** Formatea un número abreviado (ej: 1.200.000 → $1,2M) */
export function fmtCorto(n) {
  if (!n) return '$0';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return fmt(n);
}

// ─── Fechas ───────────────────────────────────────────────────────────────────

export function getToday() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

// ─── IDs ──────────────────────────────────────────────────────────────────────

export const newProcId = () => `proc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
export const newPagoId = () => `pago_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

// ─── Cálculos ────────────────────────────────────────────────────────────────

/** Subtotal de un procedimiento individual (cantidad × valor - descuento%) */
export function calcSubtotalProc(proc) {
  const base = (Number(proc.cantidad) || 0) * (Number(proc.valorUnitario) || 0);
  const desc = base * ((Number(proc.descuento) || 0) / 100);
  return Math.max(base - desc, 0);
}

/**
 * Totales consolidados del tratamiento.
 * @param {object[]} procedimientos
 * @param {object[]} pagos
 * @returns {{ total, totalPagado, saldo }}
 */
export function calcTotales(procedimientos, pagos) {
  const total      = procedimientos.reduce((s, p) => s + calcSubtotalProc(p), 0);
  const totalPagado = pagos.reduce((s, p) => s + (Number(p.monto) || 0), 0);
  const saldo      = Math.max(total - totalPagado, 0);
  return { total, totalPagado, saldo };
}

// ─── Dental ──────────────────────────────────────────────────────────────────

/** Devuelve el label de cuadrante a partir del id */
export function labelCuadrante(id) {
  return CUADRANTES.find((c) => c.id === id)?.label || id;
}

/** Resume la selección dental de un procedimiento en texto corto */
export function resumirAplicacion(proc) {
  switch (proc.aplicaEn) {
    case 'general':
      return 'General';
    case 'cuadrante':
      return proc.cuadrante ? labelCuadrante(proc.cuadrante) : 'Cuadrante';
    case 'dientes':
      if (!proc.dientes?.length) return 'Sin dientes';
      return proc.dientes.length <= 4
        ? proc.dientes.join(', ')
        : `${proc.dientes.slice(0, 3).join(', ')} +${proc.dientes.length - 3}`;
    default:
      return '—';
  }
}

// ─── Estado vacío ─────────────────────────────────────────────────────────────

export const PROC_VACIO = (id = newProcId()) => ({
  id,
  aplicaEn:    'general',
  dientes:     [],
  cuadrante:   '',
  procedimiento: '',
  descripcion: '',
  cantidad:    1,
  valorUnitario: '',
  descuento:   0,
  estado:      'pendiente',
  observaciones: '',
});

export const PAGO_VACIO = (id = newPagoId()) => ({
  id,
  fecha:       getToday(),
  monto:       '',
  metodo:      'Efectivo',
  referencia:  '',
});

export const FORM_VACIO = {
  fecha:     '',
  doctor:    '',
  tipo:      '',
  estado:    'borrador',
  prioridad: 'media',
  motivo:    '',
  observaciones: '',
};