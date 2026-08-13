// src/components/PacienteCard.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTagEstado } from '../data/pacientesData';
import { FileText, IdCard, Phone, Trash2, Pencil, X } from 'lucide-react';
import { api } from '../api';
import { OPCIONES_SEXO, OPCIONES_TIPO_DOCUMENTO } from '../data/pacienteOpciones';

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
      options: OPCIONES_SEXO },
  ]},
  { section: 'Documento', fields: [
    { name: 'tipo_documento',  label: 'Tipo documento', type: 'select',
      options: OPCIONES_TIPO_DOCUMENTO },
    { name: 'numero_documento', label: 'Número documento', type: 'text' },
  ]},
  { section: 'Contacto', fields: [
    { name: 'telefono',             label: 'Teléfono',     type: 'text' },
    { name: 'correo',               label: 'Correo',       type: 'email' },
    { name: 'municipio_ciudad',     label: 'Municipio',    type: 'text' },
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
      <article className="flex flex-col sm:flex-row items-start gap-3 p-4 border-b border-teal-soft dark:border-dark-border transition-colors duration-150 hover:bg-teal-panel dark:hover:bg-slate-800/40">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0 shadow-xs ${av.bg} ${av.text}`}>
          {getInitiales(paciente)}
        </div>

        <div className="flex-1 min-w-0 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <p className="text-[13px] font-semibold text-primary dark:text-dark-text truncate">{nombreCompleto}</p>
            <span className={`self-start sm:self-auto text-[10px] font-medium px-2 py-0.5 rounded-full ${tag}`}>{estado}</span>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
            <span className="text-[11px] text-teal-muted dark:text-slate-400 flex items-center gap-1">
              <IdCard size={13} className="text-teal" />
              {numero_documento}
            </span>
            {telefono && (
              <span className="text-[11px] text-teal-muted dark:text-slate-400 flex items-center gap-1">
                <Phone size={13} className="text-teal" />
                {telefono}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 border-t border-teal-soft/60 dark:border-dark-border/60">
            <span>
              {ultimaVisita && (
                <>
                  <span className="text-[10px] text-teal-light dark:text-slate-400">Última visita: </span>
                  <span className="text-[11px] font-medium text-primary dark:text-dark-text">{ultimaVisita}</span>
                </>
              )}
            </span>
            <div className="flex items-center gap-2 ml-auto">
              {/* ── Botón editar ── */}
              <button 
                type="button" 
                onClick={abrirEditar}
                title="Editar paciente"
                className="text-[11px] text-primary dark:text-teal border border-teal-border dark:border-dark-border rounded-lg px-2.5 py-1.5 bg-white dark:bg-dark-input hover:bg-teal-info dark:hover:bg-slate-700 transition-colors font-sans cursor-pointer flex items-center gap-1 touch-target"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Editar</span>
              </button>

              <button 
                type="button" 
                onClick={() => navigate(`/historias?pacienteId=${id}`)}
                title="Ver Historia Clínica"
                className="text-[11px] text-white bg-primary dark:bg-teal dark:text-slate-900 rounded-lg px-2.5 py-1.5 hover:opacity-90 transition-opacity font-sans cursor-pointer flex items-center gap-1 touch-target shadow-soft-sm"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Historia</span>
              </button>
              
              <button 
                type="button" 
                onClick={() => setConfirmar(true)}
                title="Eliminar paciente"
                className="text-[11px] text-status-red border border-status-red/20 rounded-lg px-2.5 py-1.5 bg-status-redBg dark:bg-red-950/40 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors font-sans cursor-pointer flex items-center justify-center touch-target"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </article>

      {/* ── Modal Editar ── */}
      {editando && (
        <div 
          className="fixed inset-0 bg-primary/40 dark:bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in"
          onClick={(e) => e.target === e.currentTarget && setEditando(false)}
        >
          <div className="bg-white dark:bg-dark-card rounded-t-2xl sm:rounded-2xl w-full max-w-[540px] max-h-[90vh] flex flex-col border border-teal-border dark:border-dark-border shadow-soft-lg overflow-hidden">

            {/* Header */}
            <div className="px-5 py-4 border-b border-teal-soft dark:border-dark-border bg-primary dark:bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Pencil className="w-4 h-4 text-teal-light" />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-white truncate">Editar paciente</p>
                  <p className="text-[11px] text-teal-light dark:text-slate-400 truncate">{nombreCompleto}</p>
                </div>
              </div>
              <button 
                onClick={() => setEditando(false)} 
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer touch-target flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cuerpo scrollable */}
            <div className="overflow-y-auto custom-scrollbar flex-1 px-5 py-5 space-y-5 bg-white dark:bg-dark-card text-primary dark:text-dark-text">
              {cargando && (
                <p className="text-[12px] text-teal-muted dark:text-slate-400 text-center py-6">Cargando datos...</p>
              )}

              {!cargando && form && (
                <>
                  {CAMPOS.map(({ section, fields }) => (
                    <div key={section} className="space-y-2">
                      <p className="text-[10px] font-bold text-teal-muted dark:text-dark-muted uppercase tracking-wider">{section}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {fields.map(({ name, label, type, options }) => (
                          <label key={name} className="flex flex-col gap-1">
                            <span className="text-[11px] font-medium text-teal-muted dark:text-slate-300">{label}</span>
                            {type === 'select' ? (
                              <select 
                                name={name} 
                                value={form[name] ?? ''} 
                                onChange={handleChange}
                                className="text-[12px] text-primary dark:text-dark-text border border-teal-border dark:border-dark-border rounded-lg px-3 py-2 bg-white dark:bg-dark-input focus:outline-none focus:border-primary dark:focus:border-teal transition-colors min-h-[38px] cursor-pointer"
                              >
                                <option value=''>— seleccionar —</option>
                                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                            ) : (
                              <input 
                                type={type} 
                                name={name} 
                                value={form[name] ?? ''} 
                                onChange={handleChange}
                                className="text-[12px] text-primary dark:text-dark-text border border-teal-border dark:border-dark-border rounded-lg px-3 py-2 bg-white dark:bg-dark-input focus:outline-none focus:border-primary dark:focus:border-teal transition-colors min-h-[38px]" 
                              />
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="text-[12px] text-teal-muted pt-2 border-t border-teal-soft dark:border-dark-border/60">
                    Estado actual: <span className="font-semibold text-primary dark:text-dark-text">{paciente.estado}</span>
                    <span className="block text-[10px] text-teal-light mt-0.5">
                      Se calcula automáticamente según citas y pagos, no se edita manualmente.
                    </span>
                  </div>
                </>
              )}

              {error && <p className="text-[11px] text-status-red dark:text-red-400 font-medium">{error}</p>}
            </div>

            {/* Footer */}
            <div className="flex gap-2.5 px-5 py-3.5 border-t border-teal-soft dark:border-dark-border bg-teal-panel/40 dark:bg-slate-800/40 justify-end flex-shrink-0">
              <button 
                type="button" 
                onClick={() => setEditando(false)}
                className="px-4 py-2 text-[12px] text-primary dark:text-slate-300 font-medium bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-lg cursor-pointer hover:bg-teal-info dark:hover:bg-slate-700 transition-colors touch-target"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={handleGuardar} 
                disabled={guardando || cargando}
                className="px-4 py-2 text-[12px] text-white font-medium bg-primary dark:bg-teal dark:text-slate-900 rounded-lg cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50 touch-target shadow-soft-sm"
              >
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Confirmar eliminar ── */}
      {confirmar && (
        <div 
          className="fixed inset-0 bg-primary/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={(e) => e.target === e.currentTarget && setConfirmar(false)}
        >
          <div className="bg-white dark:bg-dark-card rounded-2xl w-full max-w-[360px] border border-teal-border dark:border-dark-border overflow-hidden shadow-soft-lg">
            <div className="px-5 py-4 border-b border-teal-soft dark:border-dark-border flex items-center gap-3 bg-status-redBg dark:bg-red-950/40">
              <div className="w-9 h-9 rounded-xl bg-status-red/10 flex items-center justify-center flex-shrink-0 text-status-red dark:text-red-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-status-red dark:text-red-400">¿Eliminar paciente?</p>
                <p className="text-[11px] text-teal-muted dark:text-slate-400">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <div className="px-5 py-4 text-primary dark:text-dark-text">
              <p className="text-[12px] text-teal-muted dark:text-slate-400 mb-1">Vas a eliminar a:</p>
              <p className="text-[14px] font-bold">{nombreCompleto}</p>
              <p className="text-[12px] text-teal-muted dark:text-slate-400 mt-0.5 font-mono">Doc: {numero_documento}</p>
            </div>
            <div className="flex gap-2.5 px-5 py-3.5 border-t border-teal-soft dark:border-dark-border bg-teal-panel/40 dark:bg-slate-800/40 justify-end">
              <button 
                type="button" 
                onClick={() => setConfirmar(false)}
                className="px-4 py-2 text-[12px] text-primary dark:text-slate-300 font-medium bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-lg cursor-pointer hover:bg-teal-info dark:hover:bg-slate-700 transition-colors touch-target"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={() => { onEliminar(id); setConfirmar(false); }}
                className="px-4 py-2 text-[12px] text-white font-medium bg-status-red hover:bg-red-700 rounded-lg cursor-pointer transition-colors touch-target shadow-soft-sm"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}