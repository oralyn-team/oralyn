// src/components/facturacion/CreditNoteModal.jsx
import React, { useState } from 'react';
import {
  FileDiff,
  AlertTriangle,
  X,
  Loader2,
  CheckCircle,
  FileText,
  DollarSign
} from 'lucide-react';

const REASONS = [
  'Anulación de factura',
  'Devolución',
  'Descuento',
  'Corrección',
  'Otro'
];

function fmtCOP(val) {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
}

export default function CreditNoteModal({ invoice, onClose, onConfirm }) {
  const [reason, setReason] = useState(REASONS[0]);
  const [amount, setAmount] = useState(invoice?.total || 0);
  const [observations, setObservations] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setError('Ingresa un valor válido para la Nota Crédito.');
      return;
    }

    if (Number(amount) > (invoice?.total || 0)) {
      setError('El valor de la Nota Crédito no puede exceder el total de la factura.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onConfirm({
        reason,
        amount: Number(amount),
        observations
      });
      onClose();
    } catch (err) {
      console.error('Error generando Nota Crédito:', err);
      setError(err.message || 'Ocurrió un error al generar la Nota Crédito.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-primary/45 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
    >
      <div className="bg-white dark:bg-dark-card rounded-2xl w-full max-w-md shadow-soft-lg border border-teal-border dark:border-dark-border flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-teal-soft dark:border-dark-border bg-primary dark:bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
              <FileDiff size={18} className="text-teal-light" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-white">Generar Nota Crédito</h3>
              <p className="text-[11px] text-teal-light dark:text-slate-400 mt-0.5">Documento de ajuste electrónico</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer touch-target flex items-center justify-center disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-primary dark:text-dark-text">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-status-red dark:text-red-400 text-[11.5px] flex items-center gap-2">
              <AlertTriangle size={15} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Advertencia */}
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl text-amber-800 dark:text-amber-300 text-[11.5px] flex items-start gap-2.5">
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div className="space-y-1">
              <p className="font-bold">Advertencia antes de confirmar</p>
              <p className="leading-snug">
                La emisión de una Nota Crédito genera un ajuste contable ante la DIAN y afectará el saldo de la factura <strong className="font-mono font-semibold text-primary dark:text-dark-text">{invoice?.number}</strong>.
              </p>
            </div>
          </div>

          {/* Factura Relacionada */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-teal-muted dark:text-slate-400 mb-1">
              Factura Relacionada
            </label>
            <div className="p-2.5 bg-teal-panel dark:bg-slate-800/60 border border-teal-border dark:border-dark-border rounded-xl text-[12px] flex items-center justify-between">
              <span className="font-mono font-semibold text-primary dark:text-dark-text">{invoice?.number}</span>
              <span className="text-teal-muted dark:text-slate-400">Total factura: <strong className="text-primary dark:text-dark-text">{fmtCOP(invoice?.total)}</strong></span>
            </div>
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-teal-muted dark:text-slate-400 mb-1">
              Motivo *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-[12px] bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl px-3 py-2.5 outline-none focus:border-primary dark:focus:border-teal text-primary dark:text-dark-text min-h-[38px] cursor-pointer"
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Valor */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-teal-muted dark:text-slate-400 mb-1">
              Valor a acreditar (COP) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-muted dark:text-slate-400 text-[12px] font-bold">$</span>
              <input
                type="number"
                min="1"
                max={invoice?.total || 999999999}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-7 pr-3 py-2.5 text-[12px] border border-teal-border dark:border-dark-border rounded-xl bg-white dark:bg-dark-input text-primary dark:text-dark-text outline-none focus:border-primary dark:focus:border-teal min-h-[38px]"
              />
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-teal-muted dark:text-slate-400 mb-1">
              Observaciones
            </label>
            <textarea
              rows={2}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Detalle o justificación de la nota crédito..."
              className="w-full px-3 py-2 text-[12px] border border-teal-border dark:border-dark-border rounded-xl bg-white dark:bg-dark-input text-primary dark:text-dark-text outline-none focus:border-primary dark:focus:border-teal resize-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-teal-soft dark:border-dark-border">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-[12px] text-primary dark:text-slate-300 font-medium rounded-xl border border-teal-border dark:border-dark-border bg-white dark:bg-dark-input hover:bg-teal-soft dark:hover:bg-slate-700 cursor-pointer touch-target disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 text-[12px] text-white font-medium bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors cursor-pointer shadow-soft-sm touch-target disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <FileDiff size={14} />}
              {loading ? 'Generando...' : 'Emitir Nota Crédito'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
