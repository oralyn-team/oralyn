// src/components/tratamientos/ProcedureCard.jsx
import { useState, useRef, useEffect } from 'react';
import { Trash2, Copy, ChevronDown, ChevronUp, Percent, AlertCircle } from 'lucide-react';
import { PROCEDIMIENTOS_CAT, CUADRANTES, ESTADOS_PROC, TIPOS_APLICACION } from './constants';
import { calcSubtotalProc, fmt, resumirAplicacion } from './helpers';

// ─── Estilos base ─────────────────────────────────────────────────────────────

const input = [
  'w-full px-2.5 py-[7px] border border-teal-border rounded-lg',
  'text-[12.5px] text-[#1a3a3a] bg-[#FAFEFE]',
  'outline-none transition-colors focus:border-teal focus:bg-white',
  'placeholder:text-teal-light',
].join(' ');

const inputErr = 'border-status-red bg-red-50/30';

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function SelectBox({ children, value, onChange, error, className = '' }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className={`${input} appearance-none pr-7 ${error ? inputErr : ''} ${className}`}
      >
        {children}
      </select>
      <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-teal-muted pointer-events-none" />
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <span className="block text-[10px] font-semibold text-teal-muted uppercase tracking-[0.65px] mb-1">
      {children}
    </span>
  );
}

function ErrMsg({ msg }) {
  if (!msg) return null;
  return (
    <p className="text-[10.5px] text-status-red mt-1 flex items-center gap-1">
      <AlertCircle size={10} /> {msg}
    </p>
  );
}

// ─── Selector de dientes múltiple ─────────────────────────────────────────────

function TeethPicker({ selected = [], onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  function toggle(diente) {
    const next = selected.includes(diente)
      ? selected.filter((d) => d !== diente)
      : [...selected, diente];
    onChange(next);
  }

  function toggleCuadrante(dientes) {
    const todosSeleccionados = dientes.every((d) => selected.includes(d));
    if (todosSeleccionados) {
      onChange(selected.filter((d) => !dientes.includes(d)));
    } else {
      const nuevos = dientes.filter((d) => !selected.includes(d));
      onChange([...selected, ...nuevos]);
    }
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={[
          'w-full min-h-[34px] px-2.5 py-1.5 border rounded-lg text-left',
          'flex flex-wrap items-center gap-1 transition-colors',
          open ? 'border-teal bg-white' : 'border-teal-border bg-[#FAFEFE] hover:border-teal/50',
        ].join(' ')}
      >
        {selected.length === 0 ? (
          <span className="text-[12px] text-teal-light">Seleccionar dientes...</span>
        ) : (
          selected.sort((a, b) => a - b).map((d) => (
            <span
              key={d}
              className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-medium"
            >
              {d}
            </span>
          ))
        )}
        <ChevronDown
          size={11}
          className={`ml-auto text-teal-muted flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-20 left-0 mt-1.5 w-full bg-white border border-teal-border rounded-xl shadow-lg p-3">
          <div className="grid grid-cols-2 gap-3">
            {CUADRANTES.map((cuad) => {
              const todosCuad = cuad.dientes.every((d) => selected.includes(d));
              return (
                <div key={cuad.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-semibold text-teal-muted uppercase tracking-[0.5px]">
                      {cuad.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleCuadrante(cuad.dientes)}
                      className={[
                        'text-[9px] font-medium px-1.5 py-0.5 rounded transition-colors',
                        todosCuad
                          ? 'bg-primary/15 text-primary'
                          : 'bg-teal-soft text-teal-muted hover:bg-primary/10 hover:text-primary',
                      ].join(' ')}
                    >
                      {todosCuad ? 'Quitar todos' : 'Todos'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {cuad.dientes.map((d) => {
                      const sel = selected.includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => toggle(d)}
                          className={[
                            'w-7 h-7 rounded-md text-[11px] font-medium transition-all',
                            sel
                              ? 'bg-primary text-white shadow-sm'
                              : 'bg-teal-soft text-[#1a3a3a] hover:bg-primary/10 hover:text-primary',
                          ].join(' ')}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          {selected.length > 0 && (
            <div className="mt-2.5 pt-2 border-t border-teal-soft flex items-center justify-between">
              <span className="text-[10.5px] text-teal-muted">{selected.length} diente{selected.length > 1 ? 's' : ''} seleccionado{selected.length > 1 ? 's' : ''}</span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[10px] text-red-400 hover:text-red-600 transition-colors"
              >
                Limpiar selección
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ProcedureCard({ proc, index, onChange, onDelete, onDuplicate, error = {} }) {
  const [expanded, setExpanded] = useState(true);
  const subtotal = calcSubtotalProc(proc);
  const hasError = Object.keys(error).length > 0;
  const aplicResumen = resumirAplicacion(proc);

  // Helpers de cambio
  const set = (field, value) => onChange(proc.id, field, value);

  // Resetear selección dental al cambiar tipo
  function handleAplicaEn(val) {
    set('aplicaEn', val);
    set('dientes', []);
    set('cuadrante', '');
    if (val !== 'dientes') set('cantidad', 1);
}

  return (
    <div
      className={[
        'rounded-xl border transition-all duration-200',
        hasError
          ? 'border-red-200 bg-red-50/10'
          : 'border-teal-border bg-white hover:border-teal/40',
      ].join(' ')}
    >
      {/* ── Cabecera compacta ─────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={() => setExpanded((e) => !e)}
      >
        {/* Número */}
        <span className="w-5 h-5 rounded-md bg-primary/12 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0">
          {index + 1}
        </span>

        {/* Info principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold text-[#1a3a3a] truncate">
              {proc.procedimiento || <span className="text-teal-light font-normal">Sin procedimiento</span>}
            </span>
            {/* Aplica en badge */}
            <span className="text-[10.5px] text-teal-muted bg-teal-soft px-2 py-0.5 rounded-full flex-shrink-0">
              {aplicResumen}
            </span>
            {/* Estado badge */}
            {proc.estado && (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${ESTADOS_PROC[proc.estado]?.cls} flex-shrink-0`}>
                {ESTADOS_PROC[proc.estado]?.label}
              </span>
            )}
          </div>
        </div>

        {/* Total */}
        <span className="text-[13px] font-bold text-primary flex-shrink-0 tabular-nums">
          {fmt(subtotal)}
        </span>

        {/* Acciones */}
        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onDuplicate(proc.id)}
            className="w-6 h-6 rounded-md text-teal-muted flex items-center justify-center hover:bg-teal-soft hover:text-primary transition-colors"
            title="Duplicar"
          >
            <Copy size={11} />
          </button>
          <button
            onClick={() => onDelete(proc.id)}
            className="w-6 h-6 rounded-md text-teal-muted flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors"
            title="Eliminar"
          >
            <Trash2 size={11} />
          </button>
          {expanded ? (
            <ChevronUp size={13} className="text-teal-muted ml-0.5" />
          ) : (
            <ChevronDown size={13} className="text-teal-muted ml-0.5" />
          )}
        </div>
      </div>

      {/* ── Panel expandible ──────────────────────────────────────────── */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-teal-soft/60">
          <div className="pt-3 grid gap-3">

            {/* Fila 1: Procedimiento + Estado */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <FieldLabel>Procedimiento</FieldLabel>
                <SelectBox
                  value={proc.procedimiento}
                  onChange={(e) => set('procedimiento', e.target.value)}
                  error={error.procedimiento}
                >
                  <option value="">Seleccionar...</option>
                  {PROCEDIMIENTOS_CAT.map((cat) => (
                    <optgroup key={cat.grupo} label={cat.grupo}>
                      {cat.items.map((p) => <option key={p} value={p}>{p}</option>)}
                    </optgroup>
                  ))}
                </SelectBox>
                <ErrMsg msg={error.procedimiento} />
              </div>
              <div>
                <FieldLabel>Estado</FieldLabel>
                <SelectBox value={proc.estado} onChange={(e) => set('estado', e.target.value)}>
                  {Object.entries(ESTADOS_PROC).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </SelectBox>
              </div>
            </div>

            {/* Fila 2: Aplica en + Selector dental */}
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <FieldLabel>Aplica en</FieldLabel>
                <SelectBox value={proc.aplicaEn} onChange={(e) => handleAplicaEn(e.target.value)}>
                  {TIPOS_APLICACION.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </SelectBox>
              </div>

              {/* Selector condicional */}
              {proc.aplicaEn === 'dientes' && (
                <div className="col-span-2">
                  <FieldLabel>Dientes tratados</FieldLabel>
                  <TeethPicker
                    selected={proc.dientes || []}
                    onChange={(val) => {
                      set('dientes', val);
                      set('cantidad', val.length || 1);
                      }}
                  />
                </div>
              )}
              {proc.aplicaEn === 'cuadrante' && (
                <div className="col-span-2">
                  <FieldLabel>Cuadrante</FieldLabel>
                  <SelectBox
                    value={proc.cuadrante}
                    onChange={(e) => set('cuadrante', e.target.value)}
                  >
                    <option value="">Seleccionar cuadrante...</option>
                    {CUADRANTES.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </SelectBox>
                </div>
              )}
              {proc.aplicaEn === 'general' && (
                <div className="col-span-2 flex items-end pb-[7px]">
                  <p className="text-[11.5px] text-teal-muted italic">
                    Aplica de forma general, sin diente específico.
                  </p>
                </div>
              )}
            </div>

            {/* Fila 3: Descripción clínica */}
            <div>
              <FieldLabel>Descripción clínica <span className="normal-case tracking-normal font-normal text-[9.5px]">(opcional)</span></FieldLabel>
              <input
                type="text"
                value={proc.descripcion}
                onChange={(e) => set('descripcion', e.target.value)}
                placeholder="Materiales usados, técnica, hallazgos relevantes..."
                className={input}
              />
            </div>

            {/* Fila 4: Financiero */}
            <div className="grid grid-cols-4 gap-2.5 items-end">
              <div>
                <FieldLabel>Cantidad</FieldLabel>
                <input
                  type="number"
                  min="1"
                  value={proc.cantidad}
                  onChange={(e) => set('cantidad', e.target.value)}
                  readOnly={proc.aplicaEn === 'dientes'}
                  className={`${input} text-center ${error.cantidad ? inputErr : ''} 
                  ${proc.aplicaEn === 'dientes' ? 'bg-teal-soft text-teal-muted cursor-default' : ''}`}
                  />
                <ErrMsg msg={error.cantidad} />
                {proc.aplicaEn === 'dientes' && (
                  <p className="text-[10px] text-teal-muted mt-0.5">Auto · {proc.dientes?.length || 0} diente(s)</p>
                  )}
              </div>

              <div>
                <FieldLabel>Valor unitario</FieldLabel>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-teal-muted text-[11px]">$</span>
                  <input
                    type="number"
                    min="0"
                    value={proc.valorUnitario}
                    onChange={(e) => set('valorUnitario', e.target.value)}
                    placeholder="0"
                    className={`${input} pl-5 ${error.valorUnitario ? inputErr : ''}`}
                  />
                </div>
                <ErrMsg msg={error.valorUnitario} />
              </div>

              <div>
                <FieldLabel>Descuento %</FieldLabel>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={proc.descuento}
                    onChange={(e) => set('descuento', e.target.value)}
                    className={`${input} pr-6`}
                  />
                  <Percent size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-teal-muted pointer-events-none" />
                </div>
              </div>

              {/* Subtotal */}
              <div>
                <FieldLabel>Total</FieldLabel>
                <div className="px-2.5 py-[7px] rounded-lg bg-primary/8 border border-primary/20 text-[13px] font-bold text-primary text-right tabular-nums">
                  {fmt(subtotal)}
                </div>
              </div>
            </div>

            {/* Fila 5: Observaciones */}
            <div>
              <FieldLabel>Observaciones <span className="normal-case tracking-normal font-normal text-[9.5px]">(opcional)</span></FieldLabel>
              <input
                type="text"
                value={proc.observaciones}
                onChange={(e) => set('observaciones', e.target.value)}
                placeholder="Notas internas del procedimiento..."
                className={input}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}