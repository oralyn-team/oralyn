// src/components/tratamientos/PaymentRow.jsx
import { Trash2, ChevronDown, AlertCircle } from 'lucide-react';
import { METODOS_PAGO } from './constants';
import { fmt } from './helpers';

const input = [
  'w-full px-2.5 py-[7px] border border-teal-border rounded-lg',
  'text-[12.5px] text-[#1a3a3a] bg-[#FAFEFE]',
  'outline-none transition-colors focus:border-teal focus:bg-white',
  'placeholder:text-teal-light',
].join(' ');

function SelectBox({ value, onChange, children }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className={`${input} appearance-none pr-7`}
      >
        {children}
      </select>
      <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-teal-muted pointer-events-none" />
    </div>
  );
}

export default function PaymentRow({ pago, onChange, onDelete, error = {} }) {
  const set = (field, value) => onChange(pago.id, field, value);

  return (
    <div className="flex items-start gap-2.5 p-3 rounded-xl border border-teal-border bg-white hover:border-teal/40 transition-colors">

      {/* Fecha */}
      <div className="flex flex-col gap-1 w-32 flex-shrink-0">
        <span className="text-[9.5px] font-semibold text-teal-muted uppercase tracking-[0.6px]">Fecha</span>
        <input
          type="date"
          value={pago.fecha}
          onChange={(e) => set('fecha', e.target.value)}
          className={input}
        />
      </div>

      {/* Monto */}
      <div className="flex flex-col gap-1 w-36 flex-shrink-0">
        <span className="text-[9.5px] font-semibold text-teal-muted uppercase tracking-[0.6px]">Monto</span>
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-teal-muted text-[11px]">$</span>
          <input
            type="number"
            min="0"
            value={pago.monto}
            onChange={(e) => set('monto', e.target.value)}
            placeholder="0"
            className={`${input} pl-5 ${error.monto ? 'border-status-red bg-red-50/30' : ''}`}
          />
        </div>
        {error.monto && (
          <span className="text-[10px] text-status-red flex items-center gap-1">
            <AlertCircle size={9} /> {error.monto}
          </span>
        )}
      </div>

      {/* Método */}
      <div className="flex flex-col gap-1 flex-1">
        <span className="text-[9.5px] font-semibold text-teal-muted uppercase tracking-[0.6px]">Método</span>
        <SelectBox value={pago.metodo} onChange={(e) => set('metodo', e.target.value)}>
          {METODOS_PAGO.map((m) => <option key={m} value={m}>{m}</option>)}
        </SelectBox>
      </div>

      {/* Referencia */}
      <div className="flex flex-col gap-1 flex-1">
        <span className="text-[9.5px] font-semibold text-teal-muted uppercase tracking-[0.6px]">
          Referencia <span className="font-normal normal-case">(opcional)</span>
        </span>
        <input
          type="text"
          value={pago.referencia}
          onChange={(e) => set('referencia', e.target.value)}
          placeholder="# transacción, recibo..."
          className={input}
        />
      </div>

      {/* Monto formateado + eliminar */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0 pt-5">
        {Number(pago.monto) > 0 && (
          <span className="text-[11.5px] font-semibold text-emerald-600 tabular-nums">
            {fmt(pago.monto)}
          </span>
        )}
        <button
          type="button"
          onClick={() => onDelete(pago.id)}
          className="w-7 h-[34px] rounded-lg border border-teal-border text-teal-muted flex items-center justify-center hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-colors"
          title="Eliminar pago"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}