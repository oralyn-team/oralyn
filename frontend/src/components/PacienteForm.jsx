import { useState } from 'react';

const ESTADO_INICIAL = {
  primer_apellido: '',
  segundo_apellido: '',
  nombres: '',
  tipo_documento: 'CC',
  numero_documento: '',
  fecha_nacimiento: '',
  sexo: '',
  telefono: '',
  correo: '',
  municipio_ciudad: '',
  estado: 'Nuevo',
};

function Field({ name, label, placeholder, type = 'text', value, onChange, error }) {
  const inputBase = [
    'w-full px-2.5 py-2 border border-teal-border rounded-lg',
    'text-[13px] font-sans text-[#1a3a3a] bg-[#FAFEFE]',
    'outline-none transition-colors duration-150',
    'focus:border-teal focus:bg-white placeholder:text-teal-light',
  ].join(' ');

  return (
    <div className="mb-3.5">
      <label className="block text-[11px] font-medium text-teal-muted uppercase tracking-[0.7px] mb-1.5">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`${inputBase} ${error ? 'border-status-red' : ''}`}
      />
      {error && (
        <p role="alert" className="text-[11px] text-status-red mt-1">
          {error}
        </p>
      )}
    </div>
  );
}

function SelectField({ name, label, value, onChange, error, children }) {
  const selectBase = [
    'w-full px-2.5 py-2 border border-teal-border rounded-lg',
    'text-[13px] font-sans text-[#1a3a3a] bg-[#FAFEFE]',
    'outline-none transition-colors duration-150',
    'focus:border-teal focus:bg-white cursor-pointer',
  ].join(' ');

  return (
    <div className="mb-3.5">
      <label className="block text-[11px] font-medium text-teal-muted uppercase tracking-[0.7px] mb-1.5">
        {label}
      </label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className={`${selectBase} ${error ? 'border-status-red' : ''}`}
      >
        {children}
      </select>
      {error && (
        <p role="alert" className="text-[11px] text-status-red mt-1">
          {error}
        </p>
      )}
    </div>
  );
}

export default function PacienteForm({ onAgregar, onClose }) {
  const [form, setForm] = useState(ESTADO_INICIAL);
  const [errs, setErrs] = useState({});

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errs[name]) setErrs((prev) => ({ ...prev, [name]: '' }));
  }

  function validar() {
    const e = {};

    if (!form.primer_apellido.trim()) e.primer_apellido = 'Campo obligatorio';
    if (!form.nombres.trim()) e.nombres = 'Campo obligatorio';
    if (!form.tipo_documento.trim()) e.tipo_documento = 'Campo obligatorio';
    if (!form.numero_documento.trim()) e.numero_documento = 'Campo obligatorio';
    if (!form.fecha_nacimiento) e.fecha_nacimiento = 'Campo obligatorio';
    if (!form.sexo) e.sexo = 'Campo obligatorio';
    if (!form.municipio_ciudad.trim()) e.municipio_ciudad = 'Campo obligatorio';

    return e;
  }

  function handleSubmit() {
    const errores = validar();
    if (Object.keys(errores).length) {
      setErrs(errores);
      return;
    }

    const payload = {
      primer_apellido: form.primer_apellido.trim(),
      segundo_apellido: form.segundo_apellido.trim() || null,
      nombres: form.nombres.trim(),
      tipo_documento: form.tipo_documento,
      numero_documento: form.numero_documento.trim(),
      fecha_nacimiento: form.fecha_nacimiento,
      sexo: form.sexo,
      telefono: form.telefono.trim() || null,
      correo: form.correo.trim() || null,
      municipio_ciudad: form.municipio_ciudad.trim(),
      estado: form.estado,
    };

    onAgregar(payload);
    setForm(ESTADO_INICIAL);
    setErrs({});
  }

  return (
    <div
      className="absolute inset-0 bg-primary/35 flex items-center justify-center z-10"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-[14px] w-[380px] max-h-[92vh] border border-teal-border overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 bg-primary">
          <h2 className="text-[14px] font-medium text-white">+ Nuevo paciente</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded-full bg-white/15 text-white text-[14px] flex items-center justify-center border-none cursor-pointer hover:bg-white/25 transition-colors"
          >
            x
          </button>
        </div>

        <div className="px-5 py-5 overflow-y-auto">
          <Field
            name="nombres"
            label="Nombres"
            placeholder="Ej: María"
            value={form.nombres}
            onChange={handleChange}
            error={errs.nombres}
          />
          <Field
            name="primer_apellido"
            label="Primer apellido"
            placeholder="Ej: González"
            value={form.primer_apellido}
            onChange={handleChange}
            error={errs.primer_apellido}
          />
          <Field
            name="segundo_apellido"
            label="Segundo apellido"
            placeholder="Ej: Pérez"
            value={form.segundo_apellido}
            onChange={handleChange}
          />

          <SelectField
            name="tipo_documento"
            label="Tipo de documento"
            value={form.tipo_documento}
            onChange={handleChange}
            error={errs.tipo_documento}
          >
            <option value="CC">CC</option>
            <option value="TI">TI</option>
            <option value="CE">CE</option>
            <option value="PA">Pasaporte</option>
            <option value="RC">Registro civil</option>
          </SelectField>

          <Field
            name="numero_documento"
            label="Número de documento"
            placeholder="Ej: 1234567890"
            value={form.numero_documento}
            onChange={handleChange}
            error={errs.numero_documento}
          />
          <Field
            name="fecha_nacimiento"
            label="Fecha de nacimiento"
            type="date"
            value={form.fecha_nacimiento}
            onChange={handleChange}
            error={errs.fecha_nacimiento}
          />

          <SelectField
            name="sexo"
            label="Sexo"
            value={form.sexo}
            onChange={handleChange}
            error={errs.sexo}
          >
            <option value="" disabled>Selecciona una opción</option>
            <option value="femenino">Femenino</option>
            <option value="masculino">Masculino</option>
            <option value="otro">Otro</option>
          </SelectField>

          <Field
            name="telefono"
            label="Teléfono"
            placeholder="Ej: 3001234567"
            type="tel"
            value={form.telefono}
            onChange={handleChange}
          />
          <Field
            name="correo"
            label="Correo"
            placeholder="Ej: maria@email.com"
            type="email"
            value={form.correo}
            onChange={handleChange}
          />
          <Field
            name="municipio_ciudad"
            label="Municipio / ciudad"
            placeholder="Ej: Villavicencio"
            value={form.municipio_ciudad}
            onChange={handleChange}
            error={errs.municipio_ciudad}
          />

          <SelectField name="estado" label="Estado" value={form.estado} onChange={handleChange}>
            <option value="" disabled>Selecciona una opción</option>
            <option value="Nuevo">Nuevo</option>
            <option value="Al día">Al día</option>
            <option value="Pendiente">Pendiente</option>
          </SelectField>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-teal-soft">
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
            className="px-3.5 py-[7px] text-[12px] text-white font-medium font-sans bg-primary rounded-lg border-none cursor-pointer hover:bg-primary-light transition-colors"
          >
            Guardar paciente
          </button>
        </div>
      </div>
    </div>
  );
}