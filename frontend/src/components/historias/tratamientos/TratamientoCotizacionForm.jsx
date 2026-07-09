import { useState, useMemo, useCallback } from 'react';
import {
  X, Save, Plus, FileText, Stethoscope,
  Activity, CreditCard, Download, ChevronDown, AlertCircle,
} from 'lucide-react';

import { DOCTORES, TIPOS_TRATAMIENTO, PRIORIDADES, ESTADOS_TRATAMIENTO } from './constants';
import {
  fmt, getToday,
  calcTotales, PROC_VACIO, PAGO_VACIO, FORM_VACIO,
} from './helpers';
import ProcedureCard  from './ProcedureCard';
import PaymentRow     from './PaymentRow';
import FinancialPanel from './FinancialPanel';


const BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function getToken() {
  return localStorage.getItem('token');
}

// ─── Estilos compartidos ──────────────────────────────────────────────────────

const input = [
  'w-full px-2.5 py-[7px] border border-teal-border rounded-lg',
  'text-[12.5px] text-[#1a3a3a] bg-[#FAFEFE]',
  'outline-none transition-colors focus:border-teal focus:bg-white',
  'placeholder:text-teal-light',
].join(' ');

const inputErr = 'border-status-red bg-red-50/30';

// ─── Sub-componentes locales ──────────────────────────────────────────────────

function Field({ label, error, optional, children, className = '' }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="flex items-center gap-1.5 text-[10px] font-semibold text-teal-muted uppercase tracking-[0.65px]">
        {label}
        {optional && (
          <span className="normal-case tracking-normal font-normal text-[9.5px] text-teal-light bg-teal-soft px-1.5 py-0.5 rounded-full">
            opcional
          </span>
        )}
      </label>
      {children}
      {error && (
        <p className="text-[10.5px] text-status-red flex items-center gap-1">
          <AlertCircle size={10} /> {error}
        </p>
      )}
    </div>
  );
}

function SelectBox({ children, value, onChange, error }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className={`${input} appearance-none pr-7 ${error ? inputErr : ''}`}
      >
        {children}
      </select>
      <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-teal-muted pointer-events-none" />
    </div>
  );
}

function SectionTitle({ icon: Icon, title, action }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon size={13} className="text-primary" />
        </div>
        <span className="text-[12.5px] font-semibold text-[#1a3a3a]">{title}</span>
      </div>
      {action}
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-teal-soft my-5" />;
}

function StatusBadge({ estado }) {
  const s = ESTADOS_TRATAMIENTO[estado] || ESTADOS_TRATAMIENTO.borrador;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.5px] ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

/**
 * @param {function}    props.onGuardar
 * @param {function}    props.onClose
 * @param {object|null} props.tratamientoEditar
 */
export default function TratamientoCotizacionForm({ onGuardar, onClose, tratamientoEditar }) {
  const esEdicion = Boolean(tratamientoEditar);

  const [form,   setForm]   = useState(() => ({
    ...FORM_VACIO,
    fecha: getToday(),
    ...(tratamientoEditar?.info || {}),
  }));
  const [procs,  setProcs]  = useState(() => tratamientoEditar?.procedimientos || [PROC_VACIO()]);
  const [pagos,  setPagos]  = useState(() => tratamientoEditar?.pagos          || []);
  const [errs,   setErrs]   = useState({});
  const [pErrs,  setPErrs]  = useState({});
  const [paErrs, setPaErrs] = useState({});
  const [saving, setSaving] = useState(false);
  const [descargandoPDF, setDescargandoPDF] = useState(false);

  // ── Cálculos ──────────────────────────────────────────────────────────────

  const totales = useMemo(() => calcTotales(procs, pagos), [procs, pagos]);

  // ── Handlers form ─────────────────────────────────────────────────────────

  const handleForm = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errs[name]) setErrs((prev) => ({ ...prev, [name]: '' }));
  };

  // ── Handlers procedimientos ───────────────────────────────────────────────

  const addProc = () => setProcs((prev) => [...prev, PROC_VACIO()]);

  const deleteProc = useCallback((id) => {
    setProcs((prev) => prev.filter((p) => p.id !== id));
    setPErrs((prev) => { const n = { ...prev }; delete n[id]; return n; });
  }, []);

  const duplicateProc = useCallback((id) => {
    setProcs((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      next.splice(idx + 1, 0, { ...prev[idx], id: `proc_${Date.now()}` });
      return next;
    });
  }, []);

  const changeProc = useCallback((id, field, value) => {
    setProcs((prev) => prev.map((p) => p.id === id ? { ...p, [field]: value } : p));
    if (pErrs[id]?.[field]) {
      setPErrs((prev) => ({ ...prev, [id]: { ...prev[id], [field]: '' } }));
    }
  }, [pErrs]);

  // ── Handlers pagos ────────────────────────────────────────────────────────

  const addPago = () => setPagos((prev) => [...prev, PAGO_VACIO()]);

  const deletePago = useCallback((id) => {
    setPagos((prev) => prev.filter((p) => p.id !== id));
    setPaErrs((prev) => { const n = { ...prev }; delete n[id]; return n; });
  }, []);

  const changePago = useCallback((id, field, value) => {
    setPagos((prev) => prev.map((p) => p.id === id ? { ...p, [field]: value } : p));
    if (paErrs[id]?.[field]) {
      setPaErrs((prev) => ({ ...prev, [id]: { ...prev[id], [field]: '' } }));
    }
  }, [paErrs]);

  // ── Validación ────────────────────────────────────────────────────────────

  function validar() {
    const e = {};
    if (!form.fecha)  e.fecha  = 'La fecha es obligatoria';
    if (!form.doctor) e.doctor = 'Selecciona un doctor';
    if (!form.tipo)   e.tipo   = 'Selecciona el tipo de tratamiento';

    const pe = {};
    procs.forEach((p) => {
      const err = {};
      if (!p.procedimiento)               err.procedimiento = 'Selecciona un procedimiento';
      if (!(Number(p.valorUnitario) > 0)) err.valorUnitario = 'Valor mayor a 0';
      if (!(Number(p.cantidad)      > 0)) err.cantidad      = 'Mínimo 1';
      if (Object.keys(err).length) pe[p.id] = err;
    });

    const pae = {};
    pagos.forEach((p) => {
      if (!(Number(p.monto) > 0)) pae[p.id] = { monto: 'Ingresa un monto válido' };
    });

    return { e, pe, pae };
  }

  async function handleSubmit(accion) {
    const { e, pe, pae } = validar();
    setErrs(e);
    setPErrs(pe);
    setPaErrs(pae);

    const hayErrores =
      Object.keys(e).length   > 0 ||
      Object.keys(pe).length  > 0 ||
      Object.keys(pae).length > 0;
    if (hayErrores) return;

    setSaving(true);
    try {
      await onGuardar?.({
        id:             tratamientoEditar?.id || null,
        accion,
        info:           { ...form },
        procedimientos: procs,   
        pagos,                   
        totales,
      });
    } catch (err) {
      console.error('Error guardando tratamiento:', err);
      setErrs((prev) => ({ ...prev, _global: err.error || 'Error al guardar' }));
    } finally {
      setSaving(false);
    }
  }

  async function handleDescargarPDF() {
    if (!tratamientoEditar?.id) return;

    setDescargandoPDF(true);
    setErrs((prev) => ({ ...prev, _global: '' }));

    try {
      const res = await fetch(`${BASE_URL}/cotizaciones/${tratamientoEditar.id}/pdf`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (!res.ok) {
        throw new Error('No se pudo generar el PDF');
      }

      const blob = await res.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `cotizacion-${tratamientoEditar.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error descargando PDF:', err);
      setErrs((prev) => ({ ...prev, _global: 'No se pudo descargar el PDF de la cotización' }));
    } finally {
      setDescargandoPDF(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 bg-primary/45 backdrop-blur-[2px] flex items-center justify-center z-40 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-[1050px] max-h-[93vh] border border-teal-border shadow-2xl flex flex-col overflow-hidden">

        {/* ══ HEADER ══════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-primary flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
              <Stethoscope size={15} className="text-white" />
            </div>
            <div>
              <h2 className="text-[13.5px] font-semibold text-white leading-none">
                {esEdicion ? 'Editar plan de tratamiento' : 'Nuevo plan de tratamiento'}
              </h2>
              <p className="text-[10px] text-white/55 mt-0.5">Plan odontológico y cotización</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <StatusBadge estado={form.estado} />
            <button
              onClick={onClose}
              className="w-6 h-6 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* ══ BODY ════════════════════════════════════════════════════════ */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* ─ LEFT: contenido principal ─────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-6 py-5 min-w-0">

            {/* ── 1. Información general ──────────────────────────────── */}
            <SectionTitle icon={FileText} title="Información general" />

            <div className="grid grid-cols-3 gap-3 mb-3">
              <Field label="Fecha" error={errs.fecha}>
                <input type="date" name="fecha" value={form.fecha} onChange={handleForm}
                  className={`${input} ${errs.fecha ? inputErr : ''}`} />
              </Field>
              <Field label="Doctor" error={errs.doctor}>
                <SelectBox
                  value={form.doctor}
                  onChange={(e) => handleForm({ target: { name: 'doctor', value: e.target.value } })}
                  error={errs.doctor}
                >
                  <option value="">Seleccionar...</option>
                  {DOCTORES.map((d) => <option key={d} value={d}>{d}</option>)}
                </SelectBox>
              </Field>
              <Field label="Tipo de tratamiento" error={errs.tipo}>
                <SelectBox
                  value={form.tipo}
                  onChange={(e) => handleForm({ target: { name: 'tipo', value: e.target.value } })}
                  error={errs.tipo}
                >
                  <option value="">Seleccionar...</option>
                  {TIPOS_TRATAMIENTO.map((t) => <option key={t} value={t}>{t}</option>)}
                </SelectBox>
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3">
              <Field label="Estado">
                <SelectBox
                  value={form.estado}
                  onChange={(e) => handleForm({ target: { name: 'estado', value: e.target.value } })}
                >
                  {Object.entries(ESTADOS_TRATAMIENTO).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </SelectBox>
              </Field>
              <Field label="Prioridad">
                <SelectBox
                  value={form.prioridad}
                  onChange={(e) => handleForm({ target: { name: 'prioridad', value: e.target.value } })}
                >
                  {PRIORIDADES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </SelectBox>
              </Field>
              <Field label="Motivo" optional>
                <input type="text" name="motivo" value={form.motivo} onChange={handleForm}
                  placeholder="Ej: Rehabilitación por caries múltiple..."
                  className={input} />
              </Field>
            </div>

            <Field label="Observaciones generales" optional>
              <textarea name="observaciones" value={form.observaciones} onChange={handleForm}
                rows={2} placeholder="Notas clínicas o indicaciones generales del tratamiento..."
                className={`${input} resize-none`} />
            </Field>

            <Divider />

            {/* ── 2. Procedimientos ───────────────────────────────────── */}
            <SectionTitle
              icon={Activity}
              title={`Procedimientos${procs.length ? ` (${procs.length})` : ''}`}
              action={
                <button
                  onClick={addProc}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-semibold text-white bg-primary rounded-lg hover:bg-primary-light transition-colors"
                >
                  <Plus size={12} /> Agregar
                </button>
              }
            />

            <div className="flex flex-col gap-2.5">
              {procs.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-teal-border py-8 flex flex-col items-center gap-2.5">
                  <Activity size={22} className="text-teal-border" />
                  <p className="text-[12px] text-teal-muted">Sin procedimientos. Agrega el primero.</p>
                  <button
                    onClick={addProc}
                    className="text-[11.5px] font-medium text-primary border border-primary/30 bg-primary/5 px-3.5 py-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                  >
                    + Agregar procedimiento
                  </button>
                </div>
              ) : (
                procs.map((p, i) => (
                  <ProcedureCard
                    key={p.id}
                    proc={p}
                    index={i}
                    onChange={changeProc}
                    onDelete={deleteProc}
                    onDuplicate={duplicateProc}
                    error={pErrs[p.id] || {}}
                  />
                ))
              )}
            </div>

            <Divider />

            {/* ── 3. Pagos ────────────────────────────────────────────── */}
            <SectionTitle
              icon={CreditCard}
              title={`Pagos${pagos.length ? ` (${pagos.length})` : ''}`}
              action={
                <button
                  onClick={addPago}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-medium text-primary border border-primary/25 bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors"
                >
                  <Plus size={12} /> Registrar pago
                </button>
              }
            />

            <div className="flex flex-col gap-2">
              {pagos.length === 0 ? (
                <p className="text-[11.5px] text-teal-muted text-center py-4 border border-dashed border-teal-border rounded-xl">
                  Sin pagos registrados aún.
                </p>
              ) : (
                pagos.map((p) => (
                  <PaymentRow
                    key={p.id}
                    pago={p}
                    onChange={changePago}
                    onDelete={deletePago}
                    error={paErrs[p.id] || {}}
                  />
                ))
              )}
            </div>

            {/* Error global */}
            {errs._global && (
              <div className="mt-3 flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-red-50 border border-red-200">
                <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
                <p className="text-[11.5px] text-red-600">{errs._global}</p>
              </div>
            )}

            {/* Espacio inferior */}
            <div className="h-5" />
          </div>

          {/* ─ RIGHT: panel financiero ───────────────────────────────── */}
          <div className="w-[248px] flex-shrink-0 border-l border-teal-soft bg-[#FAFEFE] overflow-y-auto p-4">
            <p className="text-[10px] font-semibold text-teal-muted uppercase tracking-[0.65px] mb-3">
              Resumen financiero
            </p>
            <FinancialPanel
              totales={totales}
              pagos={pagos}
              numProcedimientos={procs.length}
            />
          </div>
        </div>

        {/* ══ FOOTER ══════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-teal-soft bg-[#FAFEFE] flex-shrink-0">
          <p className="text-[10.5px] text-teal-muted tabular-nums">
            {procs.length} procedimiento{procs.length !== 1 ? 's' : ''} ·{' '}
            Total: <span className="font-semibold text-primary">{fmt(totales.total)}</span>
            {totales.saldo > 0 && (
              <> · Saldo: <span className="font-semibold text-amber-600">{fmt(totales.saldo)}</span></>
            )}
          </p>

          <div className="flex items-center gap-2">
            {esEdicion && (
              <button
                onClick={handleDescargarPDF}
                disabled={descargandoPDF || saving}
                className="flex items-center gap-1.5 px-3.5 py-[7px] text-[12px] font-medium text-primary bg-white border border-teal-border rounded-lg hover:bg-teal-info transition-colors disabled:opacity-50"
              >
                <Download size={12} />
                {descargandoPDF ? 'Generando...' : 'Descargar PDF'}
              </button>
            )}

            <button
              onClick={onClose}
              disabled={saving}
              className="px-3.5 py-[7px] text-[12px] font-medium text-primary bg-white border border-teal-border rounded-lg hover:bg-teal-info transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              onClick={() => handleSubmit('borrador')}
              disabled={saving}
              className="flex items-center gap-1.5 px-3.5 py-[7px] text-[12px] font-medium text-teal-muted bg-white border border-teal-border rounded-lg hover:bg-teal-info transition-colors disabled:opacity-50"
            >
              <FileText size={12} />
              {saving ? 'Guardando...' : 'Borrador'}
            </button>

            <button
              onClick={() => handleSubmit('guardar')}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-[7px] text-[12px] font-semibold text-white bg-primary rounded-lg hover:bg-primary-light transition-colors shadow-sm disabled:opacity-60"
            >
              <Save size={12} />
              {saving ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear tratamiento'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}