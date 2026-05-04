// src/components/citas/CitaForm.jsx
import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { ESTADOS_CITA, MOTIVOS, DOCTORES } from '../../data/citasData';

const VACIO = {
  pacienteId: '', pacienteNombre: '', fecha: '', hora: '',
  motivo: '', doctor: '', estado: 'Pendiente', observaciones: '',
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

export default function CitaForm({ onGuardar, onClose, citaEditar, pacientes }) {
  const [form, setForm] = useState(VACIO);
  const [errs, setErrs] = useState({});
  const esEdicion = Boolean(citaEditar);

  useEffect(() => {
    if (citaEditar) setForm(citaEditar);
    else setForm({ ...VACIO, fecha: getFechaHoy() });
  }, [citaEditar]);

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === 'pacienteId') {
      const pac = pacientes.find((p) => String(p.id) === value);
      setForm((prev) => ({ ...prev, pacienteId: value, pacienteNombre: pac?.nombre || '' }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
    if (errs[name]) setErrs((prev) => ({ ...prev, [name]: '' }));
  }

  function validar() {
    const e = {};
    if (!form.pacienteId) e.pacienteId = 'Selecciona un paciente.';
    if (!form.fecha)      e.fecha      = 'La fecha es obligatoria.';
    if (!form.hora)       e.hora       = 'La hora es obligatoria.';
    if (!form.motivo)     e.motivo     = 'Selecciona un motivo.';
    if (!form.doctor)     e.doctor     = 'Selecciona un doctor.';
    return e;
  }

  function handleSubmit() {
    const errores = validar();
    if (Object.keys(errores).length) { setErrs(errores); return; }
    onGuardar({ ...form, pacienteId: Number(form.pacienteId) });
  }

  return (
    <div className="fixed inset-0 bg-primary/40 flex items-center justify-center z-20"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-[480px] max-h-[90vh] border border-teal-border overflow-hidden flex flex-col shadow-xl">

        <div className="flex items-center justify-between px-5 py-4 bg-primary flex-shrink-0">
          <h2 className="text-[14px] font-medium text-white">
            {esEdicion ? '✏ Editar cita' : '+ Nueva cita'}
          </h2>
          <button type="button" onClick={onClose}
            className="w-6 h-6 rounded-full bg-white/15 text-white flex items-center justify-center border-none cursor-pointer hover:bg-white/25 transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="px-5 py-5 overflow-y-auto flex-1">
          <Field label="Paciente" error={errs.pacienteId}>
            <select name="pacienteId" value={form.pacienteId} onChange={handleChange}
              className={`${inputBase} ${errs.pacienteId ? 'border-status-red' : ''}`}>
              <option value="">Seleccionar paciente...</option>
              {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha" error={errs.fecha}>
              <input type="date" name="fecha" value={form.fecha} onChange={handleChange}
                className={`${inputBase} ${errs.fecha ? 'border-status-red' : ''}`} />
            </Field>
            <Field label="Hora" error={errs.hora}>
              <input type="time" name="hora" value={form.hora} onChange={handleChange}
                className={`${inputBase} ${errs.hora ? 'border-status-red' : ''}`} />
            </Field>
          </div>

          <Field label="Motivo de la cita" error={errs.motivo}>
            <select name="motivo" value={form.motivo} onChange={handleChange}
              className={`${inputBase} ${errs.motivo ? 'border-status-red' : ''}`}>
              <option value="">Seleccionar motivo...</option>
              {MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>

          <Field label="Doctor asignado" error={errs.doctor}>
            <select name="doctor" value={form.doctor} onChange={handleChange}
              className={`${inputBase} ${errs.doctor ? 'border-status-red' : ''}`}>
              <option value="">Seleccionar doctor...</option>
              {DOCTORES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>

          <Field label="Estado">
            <select name="estado" value={form.estado} onChange={handleChange} className={inputBase}>
              {ESTADOS_CITA.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </Field>

          <Field label="Observaciones (opcional)">
            <textarea name="observaciones" value={form.observaciones} onChange={handleChange}
              rows={3} placeholder="Notas adicionales sobre la cita..."
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
            {esEdicion ? 'Guardar cambios' : 'Crear cita'}
          </button>
        </div>
      </div>
    </div>
  );
}