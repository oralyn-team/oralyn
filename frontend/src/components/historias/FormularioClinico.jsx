// src/components/historias/FormularioClinico.jsx
import { ANTECEDENTES_MEDICOS, HABITOS_ORALES, ESTRUCTURAS_ESTOMATOLOGICAS, TIPOS_SANGRE } from '../../data/historiasData';

const TIPOS_AFILIACION = ['Contributivo', 'Subsidiado', 'Particular'];

const inputBase = [
  'w-full px-2.5 py-1.5 border border-teal-border rounded-lg',
  'text-[12px] font-sans text-[#1a3a3a] bg-[#FAFEFE]',
  'outline-none transition-colors focus:border-teal focus:bg-white placeholder:text-teal-light',
].join(' ');

function Label({ text, opcional }) {
  return (
    <p className="text-[10px] font-medium text-teal-muted uppercase tracking-[0.7px] mb-1 flex items-center gap-1">
      {text}
      {opcional && <span className="text-[9px] normal-case tracking-normal text-teal-light font-normal">(opcional)</span>}
    </p>
  );
}

function SectionTitle({ number, text }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0">
        {number}
      </div>
      <h4 className="text-[12px] font-semibold text-primary uppercase tracking-[0.5px]">{text}</h4>
    </div>
  );
}

function InfoField({ label, value }) {
  return (
    <div>
      <Label text={label} />
      <div className="px-2.5 py-1.5 border border-teal-soft rounded-lg bg-[#F7FDFD] text-[12px] text-[#1a3a3a] min-h-[32px]">
        {value || <span className="text-teal-light">—</span>}
      </div>
    </div>
  );
}

function CheckSiNo({ label, value, onChange, disabled }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-teal-soft last:border-0">
      <span className="text-[12px] text-[#1a3a3a] flex-1 pr-2">{label}</span>
      <div className="flex items-center gap-3 flex-shrink-0">
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="radio" name={`ant-${label}`} disabled={disabled}
            checked={value === true} onChange={() => onChange(true)}
            className="accent-primary w-3.5 h-3.5" />
          <span className="text-[11px]">Sí</span>
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="radio" name={`ant-${label}`} disabled={disabled}
            checked={value === false} onChange={() => onChange(false)}
            className="accent-status-red w-3.5 h-3.5" />
          <span className="text-[11px]">No</span>
        </label>
      </div>
    </div>
  );
}

function CheckHabito({ label, checked, onChange, disabled }) {
  return (
    <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors cursor-pointer ${checked ? 'border-primary bg-teal-soft' : 'border-teal-border bg-white hover:bg-teal-panel'}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        disabled={disabled} className="accent-primary w-3.5 h-3.5" />
      <span className="text-[12px] text-[#1a3a3a]">{label}</span>
    </label>
  );
}

// ── Sección I ─────────────────────────────────────────────────────────────
function SeccionIdentificacion({ form, onChange, editable }) {
  function field(name) {
    return (e) => onChange({ ...form, [name]: e.target.value });
  }

  // Calcular edad a partir de fecha de nacimiento
  function calcularEdad(fechaNac) {
    if (!fechaNac) return '';
    const hoy   = new Date();
    const nac   = new Date(fechaNac);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m  = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad >= 0 ? `${edad} años` : '';
  }

  const edad = calcularEdad(form.fechaNacimiento);

  return (
    <div className="bg-white border border-teal-border rounded-xl p-4 mb-4">
      <SectionTitle number="I" text="Identificación del paciente" />

      {/* Bloque de solo lectura — datos del módulo Pacientes */}
      <div className="bg-teal-panel border border-teal-border rounded-xl p-3 mb-4">
        <p className="text-[10px] font-semibold text-teal uppercase tracking-[0.8px] mb-2.5 flex items-center gap-1.5">
          <span>🔗</span> Datos sincronizados desde el módulo Pacientes
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-3">
            <InfoField label="Nombre completo"     value={form.pacienteNombre} />
          </div>
          <InfoField label="Tipo de documento"     value={form.tipoDocumento} />
          <InfoField label="Número de documento"   value={form.cedula} />
          <InfoField label="Edad"                  value={edad} />
          <InfoField label="Fecha de nacimiento"   value={form.fechaNacimiento} />
          <InfoField label="Sexo"                  value={form.sexo} />
          <InfoField label="Teléfono"              value={form.telefono} />
          <div className="col-span-2">
            <InfoField label="Correo"              value={form.correo} />
          </div>
          <InfoField label="Municipio / ciudad"    value={form.municipioCiudad} />
        </div>
      </div>

      {/* Motivo de consulta */}
      <div className="mb-3">
        <Label text="Motivo de consulta" />
        {editable
          ? <textarea value={form.motivoConsulta || ''} onChange={field('motivoConsulta')}
              rows={2} placeholder="Describa el motivo de la consulta..."
              className={`${inputBase} resize-none`} />
          : <p className="text-[12px] text-[#1a3a3a] px-2.5 py-1.5">{form.motivoConsulta || '—'}</p>}
      </div>

      {/* Campos exclusivos de la historia */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label text="Departamento" />
          {editable
            ? <input type="text" value={form.departamento || ''} onChange={field('departamento')}
                placeholder="Ej: Meta" className={inputBase} />
            : <p className="text-[12px] text-[#1a3a3a] px-2.5 py-1.5">{form.departamento || '—'}</p>}
        </div>
        <div>
          <Label text="Estado civil" />
          {editable
            ? <select value={form.estadoCivil || ''} onChange={field('estadoCivil')} className={`${inputBase} cursor-pointer`}>
                <option value="">Seleccionar...</option>
                {['Soltero/a','Casado/a','Unión libre','Divorciado/a','Viudo/a'].map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            : <p className="text-[12px] text-[#1a3a3a] px-2.5 py-1.5">{form.estadoCivil || '—'}</p>}
        </div>

        <div>
          <Label text="Dirección de residencia" />
          {editable
            ? <input type="text" value={form.direccion || ''} onChange={field('direccion')}
                placeholder="Barrio, calle, carrera..." className={inputBase} />
            : <p className="text-[12px] text-[#1a3a3a] px-2.5 py-1.5">{form.direccion || '—'}</p>}
        </div>
        <div>
          <Label text="Ocupación" />
          {editable
            ? <input type="text" value={form.ocupacion || ''} onChange={field('ocupacion')}
                placeholder="Ej: Docente" className={inputBase} />
            : <p className="text-[12px] text-[#1a3a3a] px-2.5 py-1.5">{form.ocupacion || '—'}</p>}
        </div>

        {/* Acudiente */}
        <div>
          <Label text="Acudiente / acompañante" opcional />
          {editable
            ? <input type="text" value={form.acudiente || ''} onChange={field('acudiente')}
                placeholder="Nombre completo" className={inputBase} />
            : <p className="text-[12px] text-[#1a3a3a] px-2.5 py-1.5">{form.acudiente || '—'}</p>}
        </div>
        <div>
          <Label text="Parentesco" opcional />
          {editable
            ? <input type="text" value={form.parentesco || ''} onChange={field('parentesco')}
                placeholder="Ej: Madre, Padre, Cónyuge..." className={inputBase} />
            : <p className="text-[12px] text-[#1a3a3a] px-2.5 py-1.5">{form.parentesco || '—'}</p>}
        </div>

        {/* EPS y afiliación */}
        <div>
          <Label text="EPS / Aseguradora" />
          {editable
            ? <input type="text" value={form.eps || ''} onChange={field('eps')}
                placeholder="Ej: Sura, Compensar, Famisanar..." className={inputBase} />
            : <p className="text-[12px] text-[#1a3a3a] px-2.5 py-1.5">{form.eps || '—'}</p>}
        </div>
        <div>
          <Label text="Tipo de afiliación" />
          {editable
            ? <select value={form.tipoAfiliacion || ''} onChange={field('tipoAfiliacion')} className={`${inputBase} cursor-pointer`}>
                <option value="">Seleccionar...</option>
                {TIPOS_AFILIACION.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            : <p className="text-[12px] text-[#1a3a3a] px-2.5 py-1.5">{form.tipoAfiliacion || '—'}</p>}
        </div>

        {/* Sangre */}
        <div>
          <Label text="Tipo de sangre" />
          {editable
            ? <select value={form.tipoSangre || ''} onChange={field('tipoSangre')} className={`${inputBase} cursor-pointer`}>
                <option value="">Seleccionar...</option>
                {TIPOS_SANGRE.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            : <p className="text-[12px] text-[#1a3a3a] px-2.5 py-1.5">{form.tipoSangre || '—'}</p>}
        </div>
        <div>
          <Label text="RH" />
          {editable
            ? <select value={form.rh || ''} onChange={field('rh')} className={`${inputBase} cursor-pointer`}>
                <option value="">Seleccionar...</option>
                <option value="+">Positivo (+)</option>
                <option value="-">Negativo (−)</option>
              </select>
            : <p className="text-[12px] text-[#1a3a3a] px-2.5 py-1.5">{form.rh ? (form.rh === '+' ? 'Positivo (+)' : 'Negativo (−)') : '—'}</p>}
        </div>

        <div className="col-span-2">
          <Label text="Alergias conocidas" />
          {editable
            ? <input type="text" value={form.alergias || ''} onChange={field('alergias')}
                placeholder="Ej: Penicilina, Látex..." className={inputBase} />
            : <p className="text-[12px] text-[#1a3a3a] px-2.5 py-1.5">{form.alergias || '—'}</p>}
        </div>
        <div className="col-span-2">
          <Label text="Medicamentos actuales" />
          {editable
            ? <input type="text" value={form.medicamentos || ''} onChange={field('medicamentos')}
                placeholder="Ej: Losartán 50mg..." className={inputBase} />
            : <p className="text-[12px] text-[#1a3a3a] px-2.5 py-1.5">{form.medicamentos || '—'}</p>}
        </div>
        <div className="col-span-2">
          <Label text="Antecedentes odontológicos" />
          {editable
            ? <textarea value={form.antOdontologicos || ''} onChange={field('antOdontologicos')}
                rows={2} placeholder="Tratamientos previos, extracciones, ortodoncia..."
                className={`${inputBase} resize-none`} />
            : <p className="text-[12px] text-[#1a3a3a] px-2.5 py-1.5">{form.antOdontologicos || '—'}</p>}
        </div>
      </div>

      {/* Evento adverso */}
      <div className="mt-3 border border-teal-border rounded-lg p-3 bg-teal-panel">
        <div className="flex items-center gap-4 mb-2">
          <span className="text-[11px] font-medium text-primary uppercase tracking-wide">Evento adverso</span>
          {['true','false'].map((v) => (
            <label key={v} className="flex items-center gap-1 cursor-pointer">
              <input type="radio" name="eventoAdverso" disabled={!editable}
                checked={String(form.eventoAdverso) === v}
                onChange={() => onChange({ ...form, eventoAdverso: v === 'true' })}
                className="accent-primary w-3.5 h-3.5" />
              <span className="text-[11px]">{v === 'true' ? 'Sí' : 'No'}</span>
            </label>
          ))}
        </div>
        {(form.eventoAdverso || editable) && (
          <>
            <Label text="Observaciones del evento" />
            {editable
              ? <textarea value={form.eventoAdversoObs || ''} rows={2}
                  onChange={(e) => onChange({ ...form, eventoAdversoObs: e.target.value })}
                  placeholder="Describa el evento adverso..." className={`${inputBase} resize-none`} />
              : <p className="text-[12px] text-[#1a3a3a] px-2.5 py-1.5">{form.eventoAdversoObs || '—'}</p>}
          </>
        )}
      </div>
    </div>
  );
}

// ── Sección II ────────────────────────────────────────────────────────────
function SeccionAntecedentes({ antecedentes, onChange, editable }) {
  const mitad = Math.ceil(ANTECEDENTES_MEDICOS.length / 2);
  const col1  = ANTECEDENTES_MEDICOS.slice(0, mitad);
  const col2  = ANTECEDENTES_MEDICOS.slice(mitad);
  return (
    <div className="bg-white border border-teal-border rounded-xl p-4 mb-4">
      <SectionTitle number="II" text="Antecedentes médicos" />
      <div className="grid grid-cols-2 gap-x-6">
        <div>{col1.map((item) => (
          <CheckSiNo key={item} label={item} value={antecedentes[item]}
            onChange={(v) => onChange({ ...antecedentes, [item]: v })} disabled={!editable} />
        ))}</div>
        <div>{col2.map((item) => (
          <CheckSiNo key={item} label={item} value={antecedentes[item]}
            onChange={(v) => onChange({ ...antecedentes, [item]: v })} disabled={!editable} />
        ))}</div>
      </div>
    </div>
  );
}

// ── Sección III ───────────────────────────────────────────────────────────
function SeccionHabitos({ habitos, habitosObs, onChange, onObsChange, editable }) {
  return (
    <div className="bg-white border border-teal-border rounded-xl p-4 mb-4">
      <SectionTitle number="III" text="Hábitos orales nocivos" />
      <div className="flex flex-wrap gap-2 mb-3">
        {HABITOS_ORALES.map((h) => (
          <CheckHabito key={h} label={h} checked={habitos[h] || false}
            onChange={(v) => onChange({ ...habitos, [h]: v })} disabled={!editable} />
        ))}
      </div>
      <Label text="Observaciones" />
      {editable
        ? <textarea value={habitosObs || ''} onChange={(e) => onObsChange(e.target.value)}
            rows={2} placeholder="Observaciones sobre hábitos orales..."
            className={`${inputBase} resize-none`} />
        : <p className="text-[12px] text-[#1a3a3a] px-2.5 py-1.5">{habitosObs || '—'}</p>}
    </div>
  );
}

// ── Sección IV ────────────────────────────────────────────────────────────
function SeccionEstomatologico({ estomatologico, estomatologicoObs, onChange, onObsChange, editable }) {
  const porColumna = Math.ceil(ESTRUCTURAS_ESTOMATOLOGICAS.length / 4);
  const cols = [0,1,2,3].map((i) => ESTRUCTURAS_ESTOMATOLOGICAS.slice(i*porColumna, (i+1)*porColumna));
  return (
    <div className="bg-white border border-teal-border rounded-xl p-4 mb-4">
      <SectionTitle number="IV" text="Examen estomatológico" />
      <p className="text-[11px] text-teal-muted mb-3">Registrar Sí o No en cada estructura explorada</p>
      <div className="grid grid-cols-4 gap-3 mb-3">
        {cols.map((col, ci) => (
          <div key={ci}>
            <div className="flex justify-between items-center px-1 mb-1">
              <span className="text-[10px] font-medium text-primary uppercase tracking-wide flex-1">Estructura</span>
              <span className="text-[10px] font-medium text-teal-muted w-6 text-center">Sí</span>
              <span className="text-[10px] font-medium text-teal-muted w-6 text-center">No</span>
            </div>
            {col.map((estructura) => (
              <div key={estructura} className="flex items-center justify-between py-1 border-b border-teal-soft last:border-0">
                <span className="text-[11px] text-[#1a3a3a] flex-1 truncate pr-1">{estructura}</span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {[true, false].map((val) => (
                    <label key={String(val)} className="w-6 flex justify-center cursor-pointer">
                      <input type="radio" name={`esto-${estructura}`} disabled={!editable}
                        checked={estomatologico[estructura] === val}
                        onChange={() => onChange({ ...estomatologico, [estructura]: val })}
                        className="accent-primary w-3 h-3" />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <Label text="Observaciones generales" />
      {editable
        ? <textarea value={estomatologicoObs || ''} onChange={(e) => onObsChange(e.target.value)}
            rows={2} placeholder="Observaciones del examen..." className={`${inputBase} resize-none`} />
        : <p className="text-[12px] text-[#1a3a3a] px-2.5 py-1.5">{estomatologicoObs || '—'}</p>}
    </div>
  );
}

// ── Exportado ─────────────────────────────────────────────────────────────
export default function FormularioClinico({ form, editable, onChange }) {
  function update(partial) { onChange({ ...form, ...partial }); }
  return (
    <div>
      <SeccionIdentificacion form={form} editable={editable} onChange={onChange} />
      <SeccionAntecedentes
        antecedentes={form.antecedentes || {}} editable={editable}
        onChange={(v) => update({ antecedentes: v })} />
      <SeccionHabitos
        habitos={form.habitosOrales || {}} habitosObs={form.habitosObs} editable={editable}
        onChange={(v) => update({ habitosOrales: v })}
        onObsChange={(v) => update({ habitosObs: v })} />
      <SeccionEstomatologico
        estomatologico={form.estomatologico || {}} estomatologicoObs={form.estomatologicoObs} editable={editable}
        onChange={(v) => update({ estomatologico: v })}
        onObsChange={(v) => update({ estomatologicoObs: v })} />
    </div>
  );
}