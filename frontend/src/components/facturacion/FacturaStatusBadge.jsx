// src/components/facturacion/FacturaStatusBadge.jsx
import React from 'react';
import {
  FileEdit,
  Clock,
  Send,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  XCircle
} from 'lucide-react';

const STATUS_CONFIG = {
  Borrador: {
    label: 'Borrador',
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-300 dark:border-slate-700',
    icon: FileEdit
  },
  Pendiente: {
    label: 'Pendiente',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-900/50',
    icon: Clock
  },
  Enviada: {
    label: 'Enviada',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-900/50',
    icon: Send
  },
  Validada: {
    label: 'Validada',
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-200 dark:border-teal-900/50',
    icon: ShieldCheck
  },
  Aceptada: {
    label: 'Aceptada',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-900/50',
    icon: CheckCircle
  },
  Rechazada: {
    label: 'Rechazada',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-900/50',
    icon: AlertTriangle
  },
  Anulada: {
    label: 'Anulada',
    bg: 'bg-red-50 dark:bg-red-950/40',
    text: 'text-status-red dark:text-red-300',
    border: 'border-red-200 dark:border-red-900/50',
    icon: XCircle
  }
};

export default function FacturaStatusBadge({ estado }) {
  const cfg = STATUS_CONFIG[estado] || STATUS_CONFIG.Borrador;
  const Icon = cfg.icon;

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border shadow-2xs transition-colors',
        cfg.bg,
        cfg.text,
        cfg.border
      ].join(' ')}
    >
      <Icon size={12} className="flex-shrink-0" />
      <span>{cfg.label}</span>
    </span>
  );
}
