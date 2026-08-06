// src/components/citas/CitaForm.jsx
import { useState, useEffect } from 'react';
import { X, Save, Stethoscope, FileText, DollarSign } from 'lucide-react';
import { useApp } from '../../context/Appcontext';
import { api } from '../../api';

import {
  ESTADOS_CITA,
} from '../../data/citasData';


const VACIO = {
  pacienteId: '',
  pacienteNombre: '',

  fecha: '',
  hora: '',

  procedimiento: '',
  procedimiento_consultorio_id: '',
  codigo_cups: '',
  codigo_cie10: '',
  valor_cobrado: '',

  doctor: '',

  estado: 'Pendiente',

  observaciones: '',
};

function getFechaHoy() {
  const h = new Date();

  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`;
}

const inputBase = [
  'w-full px-3 py-2.5 border border-teal-border dark:border-dark-border rounded-lg',
  'text-[13px] font-sans text-primary dark:text-dark-text bg-white dark:bg-dark-input',
  'outline-none transition-colors duration-150 min-h-[40px]',
  'focus:border-primary dark:focus:border-teal placeholder:text-teal-muted/60 dark:placeholder:text-slate-500',
].join(' ');


function Field({ label, error, children }) {
  return (
    <div className="mb-3.5">
      <label className="block text-[11px] font-medium text-teal-muted uppercase tracking-[0.7px] mb-1.5">
        {label}
      </label>

      {children}

      {error && (
        <p
          role="alert"
          className="text-[11px] text-status-red mt-1"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export default function CitaForm({ onGuardar, onClose, citaEditar, pacientes }) {
  const { configuracion, procedimientosCatalog, usuariosConsultorio = [] } = useApp();

  const [catalogoCie10, setCatalogoCie10] = useState([]);
  const [loadingCie10, setLoadingCie10] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoadingCie10(true);
    api.getCatalogoCie10()
      .then((data) => {
        if (isMounted) {
          setCatalogoCie10(data || []);
          setLoadingCie10(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoadingCie10(false);
      });
    return () => { isMounted = false; };
  }, []);

  function calcDoctorDefault() {
    if (usuariosConsultorio.length === 1) {
      return usuariosConsultorio[0].nombre;
    }
    if (usuariosConsultorio.length > 1) {
      return '';
    }
    return configuracion?.nombre_profesional || '';
  }

  const [form, setForm] = useState(() => (
    citaEditar
      ? {
          ...VACIO,
          ...citaEditar,
          pacienteId: citaEditar.pacienteId ?? citaEditar.paciente_id ?? '',
          pacienteNombre: citaEditar.pacienteNombre ?? '',
          fecha: citaEditar.fecha ? String(citaEditar.fecha).split('T')[0] : (citaEditar.fecha_hora ? String(citaEditar.fecha_hora).split('T')[0] : ''),
          hora: citaEditar.hora ? citaEditar.hora : (citaEditar.fecha_hora ? String(citaEditar.fecha_hora).split('T')[1]?.slice(0, 5) : ''),
          procedimiento: citaEditar.procedimiento ?? citaEditar.motivo ?? '',
          procedimiento_consultorio_id: citaEditar.procedimiento_consultorio_id ?? citaEditar.procedimientoConsultorioId ?? '',
          codigo_cups: citaEditar.codigo_cups ?? citaEditar.codigoCups ?? '',
          codigo_cie10: citaEditar.codigo_cie10 ?? citaEditar.codigoCie10 ?? '',
          valor_cobrado: citaEditar.valor_cobrado ?? citaEditar.valorCobrado ?? '',
          estado: citaEditar.estado || 'Pendiente',
        }
      : { ...VACIO, fecha: getFechaHoy(), doctor: calcDoctorDefault() }
  ));
  const [errs, setErrs] = useState({});
  const esEdicion = Boolean(citaEditar);

  useEffect(() => {
    if (!esEdicion && !form.doctor) {
      const def = calcDoctorDefault();
      if (def) {
        setForm((prev) => ({ ...prev, doctor: def }));
      }
    }
  }, [usuariosConsultorio, configuracion]);

  function handleChange(e) {
    const { name, value } = e.target;

    if (name === 'pacienteId') {
      const pac = pacientes.find(
        (p) => String(p.id) === value
      );

      setForm((prev) => ({
        ...prev,
        pacienteId: value,
        pacienteNombre: pac?.nombre || '',
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    if (errs[name]) {
      setErrs((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  }

  function handleSelectProcedimiento(e) {
    const val = e.target.value;
    if (!val) {
      setForm((prev) => ({
        ...prev,
        procedimiento_consultorio_id: '',
        procedimiento: '',
        codigo_cups: '',
      }));
      return;
    }

    const item = procedimientosCatalog.find(p => String(p.id) === String(val));
    if (item) {
      const precioItem = item.precio !== undefined && item.precio !== null ? item.precio : item.valorBase;
      setForm((prev) => ({
        ...prev,
        procedimiento_consultorio_id: item.id,
        procedimiento: item.nombre || item.nombre_visible,
        codigo_cups: item.codigo || item.codigo_cups || '',
        valor_cobrado: prev.valor_cobrado || (precioItem ? String(precioItem) : ''),
      }));
    }

    if (errs.procedimiento) {
      setErrs((prev) => ({ ...prev, procedimiento: '' }));
    }
  }

  function validar() {
    const e = {};

    if (!form.pacienteId)
      e.pacienteId = 'Selecciona un paciente.';

    if (!form.fecha)
      e.fecha = 'La fecha es obligatoria.';
    else if (!esEdicion && form.fecha < getFechaHoy())
      e.fecha = 'No se pueden crear citas en fechas anteriores a la actual.';

    if (!form.hora)
      e.hora = 'La hora es obligatoria.';

    if (!form.procedimiento)
      e.procedimiento = 'Selecciona un procedimiento.';

    if (form.valor_cobrado !== '' && form.valor_cobrado !== null && (isNaN(Number(form.valor_cobrado)) || Number(form.valor_cobrado) < 0)) {
      e.valor_cobrado = 'El valor cobrado debe ser un número ≥ 0.';
    }

    return e;
  }

  function handleSubmit() {
    const errores = validar();

    if (Object.keys(errores).length) {
      setErrs(errores);
      return;
    }

    onGuardar({
      id: citaEditar?.id,
      pacienteId: Number(form.pacienteId),
      paciente_id: Number(form.pacienteId),

      fecha_hora: `${form.fecha}T${form.hora}:00`,

      procedimiento: form.procedimiento,
      procedimiento_consultorio_id: form.procedimiento_consultorio_id ? Number(form.procedimiento_consultorio_id) : null,
      codigo_cups: form.codigo_cups || null,
      codigo_cie10: form.codigo_cie10 || null,
      valor_cobrado: form.valor_cobrado !== '' && form.valor_cobrado !== null ? Number(form.valor_cobrado) : null,

      doctor: form.doctor,

      estado: form.estado,

      observaciones: form.observaciones,
    });
  }

  return (
    <div
      className="fixed inset-0 bg-primary/40 dark:bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in"
      onClick={(e) =>
        e.target === e.currentTarget && onClose()
      }
    >
      <div className="bg-white dark:bg-dark-card rounded-t-2xl sm:rounded-2xl w-full max-w-[520px] max-h-[90vh] border border-teal-border dark:border-dark-border overflow-hidden flex flex-col shadow-soft-lg">

        {/* HEADER */}

        <div className="flex items-center justify-between px-5 py-4 bg-primary dark:bg-slate-900 text-white flex-shrink-0">
          <h2 className="text-[14px] font-semibold text-white">
            {esEdicion
              ? '✏ Editar cita'
              : '+ Nueva cita'}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/10 text-white flex items-center justify-center border-none cursor-pointer hover:bg-white/20 transition-colors touch-target"
          >
            <X size={16} />
          </button>
        </div>


        {/* BODY */}

        <div className="px-5 py-5 overflow-y-auto flex-1">

          <Field
            label="Paciente"
            error={errs.pacienteId}
          >
            <select
              name="pacienteId"
              value={form.pacienteId}
              onChange={handleChange}
              className={`${inputBase} ${
                errs.pacienteId
                  ? 'border-status-red'
                  : ''
              }`}
            >
              <option value="">
                Seleccionar paciente...
              </option>

              {pacientes.map((p) => (
                <option
                  key={p.id}
                  value={p.id}
                >
                  {p.nombre}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">

            <Field
              label="Fecha"
              error={errs.fecha}
            >
              <input
                type="date"
                name="fecha"
                value={form.fecha}
                min={esEdicion ? undefined : getFechaHoy()}
                onChange={handleChange}
                className={`${inputBase} ${
                  errs.fecha
                    ? 'border-status-red'
                    : ''
                }`}
              />
            </Field>

            <Field
              label="Hora"
              error={errs.hora}
            >
              <input
                type="time"
                name="hora"
                value={form.hora}
                onChange={handleChange}
                className={`${inputBase} ${
                  errs.hora
                    ? 'border-status-red'
                    : ''
                }`}
              />
            </Field>
          </div>

          <Field
            label="Procedimiento"
            error={errs.procedimiento}
          >
            <select
              name="procedimiento_consultorio_id"
              value={form.procedimiento_consultorio_id}
              onChange={handleSelectProcedimiento}
              className={`${inputBase} ${
                errs.procedimiento
                  ? 'border-status-red'
                  : ''
              }`}
            >
              <option value="">
                Seleccionar procedimiento del catálogo...
              </option>

              {procedimientosCatalog.map((proc) => (
                <option
                  key={proc.id}
                  value={proc.id}
                >
                  {proc.nombre || proc.nombre_visible} {!proc.activo ? '(inactivo)' : ''}
                </option>
              ))}
            </select>

            {form.codigo_cups && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-teal-muted dark:text-teal bg-teal-soft/80 dark:bg-slate-800 px-2 py-0.5 rounded font-semibold border border-teal-border/60 dark:border-dark-border">
                  CUPS: {form.codigo_cups}
                </span>
                <span className="text-[11px] text-teal-muted dark:text-slate-400">
                  ({form.procedimiento})
                </span>
              </div>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Diagnóstico CIE-10"
            >
              <select
                name="codigo_cie10"
                value={form.codigo_cie10}
                onChange={handleChange}
                className={inputBase}
              >
                <option value="">
                  {loadingCie10 ? 'Cargando diagnósticos...' : 'Seleccionar CIE-10...'}
                </option>
                {catalogoCie10.map((c) => (
                  <option key={c.codigo_cie10 || c.codigo} value={c.codigo_cie10 || c.codigo}>
                    {c.codigo_cie10 || c.codigo} - {c.nombre_oficial || c.nombreOficial}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Valor cobrado (COP)"
              error={errs.valor_cobrado}
            >
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-muted text-[12px] font-bold">$</span>
                <input
                  type="number"
                  name="valor_cobrado"
                  min="0"
                  step="1000"
                  value={form.valor_cobrado}
                  onChange={handleChange}
                  placeholder="0"
                  className={`${inputBase} pl-7 ${
                    errs.valor_cobrado ? 'border-status-red' : ''
                  }`}
                />
              </div>
            </Field>
          </div>

          <Field label="Doctor">
            <input
              type="text"
              name="doctor"
              list="doctores-lista-cita"
              value={form.doctor}
              onChange={handleChange}
              placeholder="Nombre del doctor..."
              className={inputBase}
            />
            <datalist id="doctores-lista-cita">
              {usuariosConsultorio.map((u) => <option key={u.id} value={u.nombre} />)}
            </datalist>
          </Field>

          <Field label="Estado">
            <select
              name="estado"
              value={form.estado}
              onChange={handleChange}
              className={inputBase}
            >
              {ESTADOS_CITA.map((e) => (
                <option
                  key={e}
                  value={e}
                >
                  {e}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Observaciones">
            <textarea
              name="observaciones"
              value={form.observaciones}
              onChange={handleChange}
              rows={3}
              placeholder="Notas adicionales..."
              className={`${inputBase} resize-none`}
            />
          </Field>

        </div>

        {/* FOOTER */}

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-teal-soft flex-shrink-0">

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

            {esEdicion
              ? 'Guardar cambios'
              : 'Crear cita'}
          </button>

        </div>
      </div>
    </div>
  );
}

