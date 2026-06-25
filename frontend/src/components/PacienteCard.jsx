// src/components/PacienteCard.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTagEstado } from '../data/pacientesData';
import { FileText, IdCard, Phone, Trash2, Pencil, X } from 'lucide-react';
import { api } from '../api';

function getInitiales(p) {
  const n = p.nombres?.trim().charAt(0) || '';
  const a = p.primer_apellido?.trim().charAt(0) || '';
  return (n + a).toUpperCase() || '?';
}

const COLORES = [
  { bg: 'bg-[#E1F5EE]', text: 'text-[#0F6E56]' },
  { bg: 'bg-[#E6F1FB]', text: 'text-[#185FA5]' },
  { bg: 'bg-[#FAEEDA]', text: 'text-[#854F0B]' },
  { bg: 'bg-[#FBEAF0]', text: 'text-[#993556]' },
  { bg: 'bg-[#EEEDFE]', text: 'text-[#3C3489]' },
  { bg: 'bg-[#EAF3DE]', text: 'text-[#3B6D11]' },
];

function getColor(id) { return COLORES[id % COLORES.length]; }

// Campos del formulario de edición agrupados por sección
const CAMPOS = [
  { section: 'Datos personales', fields: [
    { name: 'nombres',            label: 'Nombres',         type: 'text' },
    { name: 'primer_apellido',    label: 'Primer apellido', type: 'text' },
    { name: 'segundo_apellido',   label: 'Segundo apellido',type: 'text' },
    { name: 'fecha_nacimiento',   label: 'Fecha nacimiento',type: 'date' },
    { name: 'sexo',               label: 'Sexo',            type: 'select',
      options: ['Masculino','Femenino','Otro'] },
  ]},
  { section: 'Documento', fields: [
    { name: 'tipo_documento',  label: 'Tipo documento', type: 'select',
      options: ['CC','TI','CE','PP','RC'] },
    { name: 'numero_documento', label: 'Número documento', type: 'text' },
  ]},
  { section: 'Contacto', fields: [
    { name: 'telefono',             label: 'Teléfono',     type: 'text' },
    { name: 'correo',               label: 'Correo',       type: 'email' },
    { name: 'municipio_ciudad',     label: 'Municipio',    type: 'text' },
  ]},
  { section: 'Estado', fields: [
    { name: 'estado', label: 'Estado paciente', type: 'select',
      options: ['Al día','Pendiente','Nuevo'] },
  ]},
];

export default function PacienteCard({ paciente, onEliminar, onEditar }) {
  const { id, nombres, primer_apellido, segundo_apellido, numero_documento, telefono, ultimaVisita, estado } = paciente;
  const nombreCompleto = `${nombres} ${primer_apellido}${segundo_apellido ? ' ' + segundo_apellido : ''}`;
  const av  = getColor(id);
  const tag = getTagEstado(estado);
  const navigate = useNavigate();

  const [confirmar, setConfirmar]   = useState(false);
  const [editando, setEditando]     = useState(false);
  const [form, setForm]             = useState(null);
  const [cargando, setCargando]     = useState(false);
  const [guardando, setGuardando]   = useState(false);
  const [error, setError]           = useState('');

  // Abre el modal y carga los datos completos del paciente
async function abrirEditar() {
  setCargando(true);
  setError('');
  setEditando(true);
  try {
    const data = await api.getPaciente(id);
    if (data.fecha_nacimiento) {
      data.fecha_nacimiento = data.fecha_nacimiento.split('T')[0];
    }
    setForm(data);
  } catch (e) {
    setError('Error al cargar los datos del paciente');
  } finally {
    setCargando(false);
  }
}

async function handleGuardar() {
  setGuardando(true);
  setError('');

  try {
    await api.actualizarPaciente(id, form);
    setEditando(false);
    onEditar?.();
  } catch (e) {
    setError(e.message || 'Error al guardar');
  } finally {
    setGuardando(false);
  }
}

function handleChange(e) {
  const { name, value } = e.target;

  setForm((prev) => ({
    ...prev,
    [name]: value,
  }));
}

  return (
    <>
      {/* ── Tarjeta ── */}
      <article className="flex items-start gap-3 p-4 border-b border-teal-soft transition-colors duration-150 hover:bg-teal-panel">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-medium flex-shrink-0 ${av.bg} ${av.text}`}>
          {getInitiales(paciente)}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-primary truncate">{nombreCompleto}</p>
          <div className="flex flex-wrap gap-2 mt-0.5">
            <span className="text-[11px] text-teal-muted"><IdCard size={12} className="inline-block mr-1"/>{numero_documento}</span>
            {telefono && <span className="text-[11px] text-teal-muted"><Phone size={12} className="inline-block mr-1"/>{telefono}</span>}
          </div>

          <div className="flex items-center justify-between mt-2.5">
            <span>
              {ultimaVisita && <>
                <span className="text-[10px] text-teal-light">Última visita </span>
                <span className="text-[11px] font-medium text-primary">{ultimaVisita}</span>
              </>}
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${tag}`}>{estado}</span>

              {/* ── Botón editar ── */}
              <button type="button" onClick={abrirEditar}
                className="text-[11px] text-[#185FA5] border border-[#C4DCF5] rounded-md px-2.5 py-[3px] bg-[#E6F1FB] hover:bg-[#cce2f7] transition-colors font-sans cursor-pointer">
                <Pencil className="w-4 h-4" />
              </button>

              <button type="button" onClick={() => navigate(`/historias?pacienteId=${id}`)}
                className="text-[11px] text-primary border border-teal-border rounded-md px-2.5 py-[3px] bg-transparent hover:bg-teal-soft transition-colors font-sans cursor-pointer">
                <FileText className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setConfirmar(true)}
                className="text-[11px] text-status-red border border-status-redBg rounded-md px-2.5 py-[3px] bg-status-redBg hover:bg-red-100 transition-colors font-sans cursor-pointer">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </article>

      {/* ── Modal Editar ── */}
      {editando && (
        <div className="fixed inset-0 bg-primary/40 flex items-center justify-center z-20"
          onClick={(e) => e.target === e.currentTarget && setEditando(false)}>
          <div className="bg-white rounded-2xl w-[520px] max-h-[85vh] flex flex-col border border-teal-border shadow-lg overflow-hidden">

            {/* Header */}
            <div className="px-5 py-4 border-b border-teal-soft flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#E6F1FB] flex items-center justify-center flex-shrink-0">
                  <Pencil className="w-4 h-4 text-[#185FA5]" />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-primary">Editar paciente</p>
                  <p className="text-[11px] text-teal-muted mt-0.5">{nombreCompleto}</p>
                </div>
              </div>
              <button onClick={() => setEditando(false)} className="text-teal-muted hover:text-primary transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cuerpo scrollable */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
              {cargando && (
                <p className="text-[12px] text-teal-muted text-center py-6">Cargando datos...</p>
              )}

              {!cargando && form && CAMPOS.map(({ section, fields }) => (
                <div key={section}>
                  <p className="text-[10px] font-semibold text-teal-muted uppercase tracking-wide mb-2">{section}</p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                    {fields.map(({ name, label, type, options }) => (
                      <label key={name} className="flex flex-col gap-0.5">
                        <span className="text-[11px] text-teal-muted">{label}</span>
                        {type === 'select' ? (
                          <select name={name} value={form[name] ?? ''} onChange={handleChange}
                            className="text-[12px] text-primary border border-teal-border rounded-lg px-2.5 py-[6px] bg-white focus:outline-none focus:border-[#185FA5] transition-colors">
                            <option value=''>— seleccionar —</option>
                            {options.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input type={type} name={name} value={form[name] ?? ''} onChange={handleChange}
                            className="text-[12px] text-primary border border-teal-border rounded-lg px-2.5 py-[6px] focus:outline-none focus:border-[#185FA5] transition-colors" />
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              {error && <p className="text-[11px] text-status-red">{error}</p>}
            </div>

            {/* Footer */}
            <div className="flex gap-2 px-5 py-3 border-t border-teal-soft justify-end flex-shrink-0">
              <button type="button" onClick={() => setEditando(false)}
                className="px-3.5 py-[7px] text-[12px] text-primary font-sans bg-white border border-teal-border rounded-lg cursor-pointer hover:bg-teal-info transition-colors">
                Cancelar
              </button>
              <button type="button" onClick={handleGuardar} disabled={guardando || cargando}
                className="px-3.5 py-[7px] text-[12px] text-white font-medium font-sans bg-[#185FA5] rounded-lg border-none cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50">
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Confirmar eliminar (sin cambios) ── */}
      {confirmar && (
        <div className="fixed inset-0 bg-primary/40 flex items-center justify-center z-20"
          onClick={(e) => e.target === e.currentTarget && setConfirmar(false)}>
          <div className="bg-white rounded-2xl w-[320px] border border-teal-border overflow-hidden shadow-lg">
            <div className="px-5 py-4 border-b border-teal-soft flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-status-redBg flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-primary">¿Eliminar paciente?</p>
                <p className="text-[11px] text-teal-muted mt-0.5">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <div className="px-5 py-4">
              <p className="text-[12px] text-teal-muted mb-1">Vas a eliminar a:</p>
              <p className="text-[14px] font-medium text-primary">{nombreCompleto}</p>
              <p className="text-[12px] text-teal-muted mt-0.5">Doc: {numero_documento}</p>
            </div>
            <div className="flex gap-2 px-5 py-3 border-t border-teal-soft justify-end">
              <button type="button" onClick={() => setConfirmar(false)}
                className="px-3.5 py-[7px] text-[12px] text-primary font-sans bg-white border border-teal-border rounded-lg cursor-pointer hover:bg-teal-info transition-colors">
                Cancelar
              </button>
              <button type="button" onClick={() => { onEliminar(id); setConfirmar(false); }}
                className="px-3.5 py-[7px] text-[12px] text-white font-medium font-sans bg-status-red rounded-lg border-none cursor-pointer hover:opacity-90 transition-opacity">
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}