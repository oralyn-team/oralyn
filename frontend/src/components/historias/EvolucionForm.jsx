// src/components/historias/EvolucionForm.jsx
import { useState } from 'react';
import { X, Save, Stethoscope, ClipboardList, Wrench, CalendarCheck, ChevronDown } from 'lucide-react';
import { DOCTORES } from '../../data/citasData';


// ─── Constantes clínicas ──────────────────────────────────────────────────────
const PROCEDIMIENTOS = [
  'Valoración inicial',
  'Control periódico',
  'Profilaxis / Limpieza dental',
  'Blanqueamiento dental',
  'Resina compuesta',
  'Incrustación (Inlay / Onlay)',
  'Corona dental',
  'Endodoncia',
  'Exodoncia simple',
  'Exodoncia quirúrgica',
  'Cirugía oral',
  'Ortodoncia - Revisión',
  'Instalación de aparatología',
  'Ajuste de brackets',
  'Implante dental',
  'Prótesis removible',
  'Prótesis fija',
  'Periodoncia',
  'Urgencia odontológica',
  'Otro',
];

const ESTADOS_CLINICOS = [
  { value: 'en_tratamiento', label: 'En tratamiento', color: 'text-amber-600' },
  { value: 'finalizado',     label: 'Finalizado',      color: 'text-emerald-600' },
  { value: 'requiere_control', label: 'Requiere control', color: 'text-blue-600' },
  { value: 'remitido',       label: 'Remitido',         color: 'text-purple-600' },
];

const VACIO = {
  fecha: '',
  doctor: '',
  motivo: '',
  diagnostico: '',
  procedimiento: '',
  piezasTratadas: '',
  tratamiento: '',
  estadoClinico: '',
  recomendaciones: '',
  proximoControl: '',
  observaciones: '',
};

// ─── Utilidades ───────────────────────────────────────────────────────────────

function getFechaHoy() {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`;
}

function validarPiezas(val) {
  if (!val.trim()) return true; // opcional
  const piezas = val.split(',').map((p) => p.trim());
  return piezas.every((p) => /^\d{2}$/.test(p) && Number(p) >= 11 && Number(p) <= 48);
}

// ─── Estilos compartidos ─────────────────────────────────────────────────────

const inputBase = [
  'w-full px-2.5 py-2 border border-teal-border rounded-lg',
  'text-[13px] font-sans text-[#1a3a3a] bg-[#FAFEFE]',
  'outline-none transition-colors duration-150',
  'focus:border-teal focus:bg-white placeholder:text-teal-light',
].join(' ');

const inputError = 'border-status-red';

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function Field({ label, error, children, optional = false }) {
  return (
    <div className="mb-3.5">
      <label className="flex items-center gap-1.5 text-[11px] font-medium text-teal-muted uppercase tracking-[0.7px] mb-1.5">
        {label}
        {optional && (
          <span className="normal-case tracking-normal font-normal text-[10px] text-teal-light bg-teal-soft px-1.5 py-0.5 rounded-full">
            opcional
          </span>
        )}
      </label>
      {children}
      {error && (
        <p role="alert" className="text-[11px] text-status-red mt-1 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}

function SectionDivider({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 mt-5 mb-4 pb-2 border-b border-teal-soft">
      <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon size={11} className="text-primary" />
      </div>
      <span className="text-[10.5px] font-semibold text-primary/70 uppercase tracking-[0.9px]">
        {title}
      </span>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

/**
 * @param {function}    props.onGuardar        - Callback con los datos de la evolución
 * @param {function}    props.onClose
 * @param {object|null} props.evolucionEditar
 * @param {function}    [props.onVerOdontograma] - Handler para abrir odontograma
 */
export default function EvolucionForm({ onGuardar, onClose, evolucionEditar}) {
  const [form, setForm]   = useState(() => (
    evolucionEditar || { ...VACIO, fecha: getFechaHoy() }
  ));
  const [errs, setErrs]   = useState({});
  const esEdicion         = Boolean(evolucionEditar);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errs[name]) setErrs((prev) => ({ ...prev, [name]: '' }));
  }

  // ── Validaciones ─────────────────────────────────────────────────────────────

  function validar() {
    const e = {};
    if (!form.fecha)                  e.fecha         = 'La fecha es obligatoria.';
    if (!form.doctor)                 e.doctor        = 'Selecciona un doctor.';
    if (!form.motivo.trim())          e.motivo        = 'El motivo es obligatorio.';
    if (!form.diagnostico.trim())     e.diagnostico   = 'El diagnóstico es obligatorio.';
    if (!form.procedimiento)          e.procedimiento = 'Selecciona el procedimiento realizado.';
    if (!form.tratamiento.trim())     e.tratamiento   = 'Describe el tratamiento realizado.';
    if (!form.estadoClinico)          e.estadoClinico = 'Selecciona el estado clínico.';
    if (form.piezasTratadas && !validarPiezas(form.piezasTratadas)) {
      e.piezasTratadas = 'Formato inválido. Usa números de 2 dígitos separados por coma. Ej: 11, 21, 36';
    }
    return e;
  }

  function handleSubmit() {
    const errores = validar();
    if (Object.keys(errores).length) { setErrs(errores); return; }
    onGuardar({ ...form, id: evolucionEditar?.id || Date.now() });
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 bg-primary/40 flex items-center justify-center z-30 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-[520px] max-h-[92vh] border border-teal-border overflow-hidden flex flex-col shadow-xl">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 bg-primary flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center">
              <ClipboardList size={14} className="text-white" />
            </div>
            <div>
              <h2 className="text-[13.5px] font-semibold text-white leading-none">
                {esEdicion ? 'Editar evolución clínica' : 'Nueva evolución clínica'}
              </h2>
              <p className="text-[10px] text-white/60 mt-0.5">Historia odontológica del paciente</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded-full bg-white/15 text-white flex items-center justify-center border-none cursor-pointer hover:bg-white/30 transition-colors"
          >
            <X size={13} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="px-5 py-4 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-teal-soft">

          {/* ── SECCIÓN 1: Información general ── */}
          <SectionDivider icon={CalendarCheck} title="Información general" />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha de consulta" error={errs.fecha}>
              <input
                type="date"
                name="fecha"
                value={form.fecha}
                onChange={handleChange}
                className={`${inputBase} ${errs.fecha ? inputError : ''}`}
              />
            </Field>
            <Field label="Doctor tratante" error={errs.doctor}>
              <div className="relative">
                <select
                  name="doctor"
                  value={form.doctor}
                  onChange={handleChange}
                  className={`${inputBase} appearance-none pr-7 ${errs.doctor ? inputError : ''}`}
                >
                  <option value="">Seleccionar...</option>
                  {DOCTORES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-teal-muted pointer-events-none" />
              </div>
            </Field>
          </div>

          {/* ── SECCIÓN 2: Evaluación clínica ── */}
          <SectionDivider icon={Stethoscope} title="Evaluación clínica" />

          <Field label="Motivo de consulta" error={errs.motivo}>
            <input
              type="text"
              name="motivo"
              value={form.motivo}
              onChange={handleChange}
              placeholder="Ej: Dolor agudo en molar, control de rutina, urgencia por fractura..."
              className={`${inputBase} ${errs.motivo ? inputError : ''}`}
            />
          </Field>

          <Field label="Diagnóstico clínico" error={errs.diagnostico}>
            <textarea
              name="diagnostico"
              value={form.diagnostico}
              onChange={handleChange}
              rows={3}
              placeholder="Describe el diagnóstico: tipo de lesión, severidad, piezas afectadas, hallazgos clínicos relevantes..."
              className={`${inputBase} resize-none ${errs.diagnostico ? inputError : ''}`}
            />
          </Field>

          {/* ── SECCIÓN 3: Tratamiento ── */}
          <SectionDivider icon={Wrench} title="Tratamiento realizado" />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Procedimiento" error={errs.procedimiento}>
              <div className="relative">
                <select
                  name="procedimiento"
                  value={form.procedimiento}
                  onChange={handleChange}
                  className={`${inputBase} appearance-none pr-7 ${errs.procedimiento ? inputError : ''}`}
                >
                  <option value="">Seleccionar...</option>
                  {PROCEDIMIENTOS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-teal-muted pointer-events-none" />
              </div>
            </Field>
            <Field label="Piezas tratadas" error={errs.piezasTratadas} optional>
              <input
                type="text"
                name="piezasTratadas"
                value={form.piezasTratadas}
                onChange={handleChange}
                placeholder="Ej: 11, 16, 21, 36"
                className={`${inputBase} ${errs.piezasTratadas ? inputError : ''}`}
              />
            </Field>
          </div>

          {/* Chips de piezas: vista previa */}
          {form.piezasTratadas && validarPiezas(form.piezasTratadas) && (
            <div className="flex flex-wrap gap-1.5 mb-3.5 -mt-1">
              {form.piezasTratadas.split(',').map((p) => p.trim()).filter(Boolean).map((pieza) => (
                <span
                  key={pieza}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20"
                >
                  🦷 {pieza}
                </span>
              ))}
            </div>
          )}

          <Field label="Descripción del tratamiento" error={errs.tratamiento}>
            <textarea
              name="tratamiento"
              value={form.tratamiento}
              onChange={handleChange}
              rows={3}
              placeholder="Describe paso a paso el procedimiento: materiales usados, técnica aplicada, anestesia, complicaciones..."
              className={`${inputBase} resize-none ${errs.tratamiento ? inputError : ''}`}
            />
          </Field>

          {/* ── SECCIÓN 4: Seguimiento ── */}
          <SectionDivider icon={CalendarCheck} title="Seguimiento y recomendaciones" />

          <Field label="Estado clínico" error={errs.estadoClinico}>
            <div className="grid grid-cols-2 gap-2">
              {ESTADOS_CLINICOS.map(({ value, label, color }) => (
                <label
                  key={value}
                  className={[
                    'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-[12px]',
                    form.estadoClinico === value
                      ? 'border-primary bg-primary/8 font-medium text-primary'
                      : 'border-teal-border bg-[#FAFEFE] text-[#1a3a3a] hover:border-teal hover:bg-teal-info',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="estadoClinico"
                    value={value}
                    checked={form.estadoClinico === value}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <span className={[
                    'w-2 h-2 rounded-full flex-shrink-0',
                    form.estadoClinico === value ? 'bg-primary' : 'bg-teal-border',
                  ].join(' ')} />
                  <span className={form.estadoClinico === value ? 'text-primary' : color}>
                    {label}
                  </span>
                </label>
              ))}
            </div>
            {errs.estadoClinico && (
              <p role="alert" className="text-[11px] text-status-red mt-1 flex items-center gap-1">
                <span>⚠</span> {errs.estadoClinico}
              </p>
            )}
          </Field>

          <Field label="Recomendaciones al paciente" optional>
            <textarea
              name="recomendaciones"
              value={form.recomendaciones}
              onChange={handleChange}
              rows={2}
              placeholder="Ej: Evitar bebidas frías por 24h, no comer por 2h, control en 15 días, usar analgésico si hay dolor..."
              className={inputBase}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Próximo control" optional>
              <input
                type="date"
                name="proximoControl"
                value={form.proximoControl}
                onChange={handleChange}
                className={inputBase}
              />
            </Field>
            <Field label="Observaciones clínicas" optional>
              <input
                type="text"
                name="observaciones"
                value={form.observaciones}
                onChange={handleChange}
                placeholder="Notas internas del profesional..."
                className={inputBase}
              />
            </Field>
          </div>

        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-teal-soft flex-shrink-0 bg-[#FAFEFE]">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-[7px] text-[12px] text-primary font-sans bg-white border border-teal-border rounded-lg cursor-pointer hover:bg-teal-info transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="flex items-center gap-1.5 px-3.5 py-[7px] text-[12px] text-white font-medium font-sans bg-primary rounded-lg border-none cursor-pointer hover:bg-primary-light transition-colors"
            >
              <Save size={13} />
              {esEdicion ? 'Guardar cambios' : 'Agregar evolución'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
