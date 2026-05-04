// src/components/historias/EvolucionForm.jsx
import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { DOCTORES } from '../../data/citasData';

const VACIO = {
  fecha: '', motivo: '', diagnostico: '', tratamiento: '', doctor: '', observaciones: '',
};

function getFechaHoy() {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,'0')}-${String(h.getDate()).padStart(2,'0')}`;
}

const inputBase = [
  'w-full px-2.5 py-2 border border-teal-border rounded-lg',
  'text-[13px] font-sans text-[#1a3a3a] bg-[#FAFEFE]',
  'outline-none transition-colors duration-150',
  'focus:border-teal focus:bg-white placeholder:text-teal-light',
].join(' ');

function Field({ label, error, children }) {
  return (
    <div className="mb-3.5">
      <label className="block text-[11px] font-medium text-teal-muted uppercase tracking-[0.7px] mb-1.5">
        {label}
      </label>
      {children}
      {error && <p role="alert" className="text-[11px] text-status-red mt-1">{error}</p>}
    </div>
  );
}

/**
 * @param {function}    props.onGuardar    - Callback con los datos de la evolución
 * @param {function}    props.onClose
 * @param {object|null} props.evolucionEditar
 */
export default function EvolucionForm({ onGuardar, onClose, evolucionEditar }) {
  const [form, setForm] = useState(VACIO);
  const [errs, setErrs] = useState({});
  const esEdicion = Boolean(evolucionEditar);

  useEffect(() => {
    if (evolucionEditar) setForm(evolucionEditar);
    else setForm({ ...VACIO, fecha: getFechaHoy() });
  }, [evolucionEditar]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errs[name]) setErrs((prev) => ({ ...prev, [name]: '' }));
  }

  function validar() {
    const e = {};
    if (!form.fecha)       e.fecha       = 'La fecha es obligatoria.';
    if (!form.motivo.trim())      e.motivo      = 'El motivo es obligatorio.';
    if (!form.diagnostico.trim()) e.diagnostico = 'El diagnóstico es obligatorio.';
    if (!form.tratamiento.trim()) e.tratamiento = 'El tratamiento es obligatorio.';
    if (!form.doctor)      e.doctor      = 'Selecciona un doctor.';
    return e;
  }

  function handleSubmit() {
    const errores = validar();
    if (Object.keys(errores).length) { setErrs(errores); return; }
    onGuardar({ ...form, id: evolucionEditar?.id || Date.now() });
  }

  return (
    <div className="fixed inset-0 bg-primary/40 flex items-center justify-center z-30"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-[500px] max-h-[90vh] border border-teal-border overflow-hidden flex flex-col shadow-xl">

        <div className="flex items-center justify-between px-5 py-4 bg-primary flex-shrink-0">
          <h2 className="text-[14px] font-medium text-white">
            {esEdicion ? '✏ Editar evolución' : '+ Nueva evolución'}
          </h2>
          <button type="button" onClick={onClose}
            className="w-6 h-6 rounded-full bg-white/15 text-white flex items-center justify-center border-none cursor-pointer hover:bg-white/25 transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="px-5 py-5 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha" error={errs.fecha}>
              <input type="date" name="fecha" value={form.fecha} onChange={handleChange}
                className={`${inputBase} ${errs.fecha ? 'border-status-red' : ''}`} />
            </Field>
            <Field label="Doctor" error={errs.doctor}>
              <select name="doctor" value={form.doctor} onChange={handleChange}
                className={`${inputBase} ${errs.doctor ? 'border-status-red' : ''}`}>
                <option value="">Seleccionar...</option>
                {DOCTORES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Motivo de consulta" error={errs.motivo}>
            <input type="text" name="motivo" value={form.motivo} onChange={handleChange}
              placeholder="Ej: Limpieza dental, Urgencia, Control..."
              className={`${inputBase} ${errs.motivo ? 'border-status-red' : ''}`} />
          </Field>

          <Field label="Diagnóstico" error={errs.diagnostico}>
            <textarea name="diagnostico" value={form.diagnostico} onChange={handleChange}
              rows={3} placeholder="Describe el diagnóstico clínico..."
              className={`${inputBase} resize-none ${errs.diagnostico ? 'border-status-red' : ''}`} />
          </Field>

          <Field label="Tratamiento realizado" error={errs.tratamiento}>
            <textarea name="tratamiento" value={form.tratamiento} onChange={handleChange}
              rows={3} placeholder="Describe el tratamiento realizado..."
              className={`${inputBase} resize-none ${errs.tratamiento ? 'border-status-red' : ''}`} />
          </Field>

          <Field label="Observaciones (opcional)">
            <textarea name="observaciones" value={form.observaciones} onChange={handleChange}
              rows={2} placeholder="Notas adicionales, recomendaciones..."
              className={`${inputBase} resize-none`} />
          </Field>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-teal-soft flex-shrink-0">
          <button type="button" onClick={onClose}
            className="px-3 py-[7px] text-[12px] text-primary font-sans bg-white border border-teal-border rounded-lg cursor-pointer hover:bg-teal-info transition-colors">
            Cancelar
          </button>
          <button type="button" onClick={handleSubmit}
            className="flex items-center gap-1.5 px-3.5 py-[7px] text-[12px] text-white font-medium font-sans bg-primary rounded-lg border-none cursor-pointer hover:bg-primary-light transition-colors">
            <Save size={13} />
            {esEdicion ? 'Guardar cambios' : 'Agregar evolución'}
          </button>
        </div>
      </div>
    </div>
  );
}