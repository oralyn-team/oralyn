// src/components/historias/HistoriaDetalle.jsx
import { useState } from 'react';
import { ArrowLeft, Pencil, Plus, Save, X, ChevronDown, ChevronUp, Trash2, ClipboardList, CalendarDays, Paperclip } from 'lucide-react';
import OdontogramaModal from './OdontogramaModal';
import EvolucionForm    from './EvolucionForm';
import AdjuntosPanel    from './AdjuntosPanel';
import FormularioClinico from './FormularioClinico';

// ── Helpers ────────────────────────────────────────────────────────────────
function SeccionLabel({ text }) {
  return <p className="text-[10px] font-medium text-teal-muted uppercase tracking-[0.8px] mb-1">{text}</p>;
}

function EvolucionCard({ ev, onEditar, onEliminar }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="bg-white border border-teal-border rounded-xl overflow-hidden mb-2">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-teal-panel transition-colors"
        onClick={() => setAbierto((v) => !v)}>
        <div className="w-2 h-2 rounded-full bg-teal flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-primary">{ev.motivo}</p>
          <p className="text-[11px] text-teal-muted">{ev.fecha} · {ev.doctor}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={(e) => { e.stopPropagation(); onEditar(ev); }}
            className="p-1.5 rounded-lg border border-teal-border bg-white hover:bg-teal-soft text-primary transition-colors cursor-pointer">
            <Pencil size={12} />
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onEliminar(ev.id); }}
            className="p-1.5 rounded-lg bg-status-redBg text-status-red border border-status-redBg hover:bg-red-100 transition-colors cursor-pointer">
            <Trash2 size={12} />
          </button>
          {abierto ? <ChevronUp size={14} className="text-teal-muted" /> : <ChevronDown size={14} className="text-teal-muted" />}
        </div>
      </div>
      {abierto && (
        <div className="px-4 pb-4 grid grid-cols-2 gap-4 border-t border-teal-soft pt-3 bg-teal-panel">
          <div>
            <SeccionLabel text="Diagnóstico" />
            <p className="text-[12px] text-[#1a3a3a] leading-snug">{ev.diagnostico}</p>
          </div>
          <div>
            <SeccionLabel text="Tratamiento realizado" />
            <p className="text-[12px] text-[#1a3a3a] leading-snug">{ev.tratamiento}</p>
          </div>
          {ev.observaciones && (
            <div className="col-span-2">
              <SeccionLabel text="Observaciones" />
              <p className="text-[12px] text-[#1a3a3a] leading-snug">{ev.observaciones}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'clinica',     label: 'Historia clínica',  icon: ClipboardList },
  { id: 'evoluciones', label: 'Evoluciones',        icon: CalendarDays  },
  { id: 'adjuntos',    label: 'Adjuntos',           icon: Paperclip     },
];

// ── Componente principal ──────────────────────────────────────────────────
export default function HistoriaDetalle({ historia, onVolver, onActualizar }) {
  const [editando, setEditando]         = useState(false);
  const [form, setForm]                 = useState(historia);
  const [tab, setTab]                   = useState('clinica');
  const [modalEv, setModalEv]           = useState(false);
  const [evEditar, setEvEditar]         = useState(null);
  const [modalOdonto, setModalOdonto]   = useState(false);  // ✅ nuevo

  function guardarDatos() {
    onActualizar(form);
    setEditando(false);
  }

  function cancelar() {
    setForm(historia);
    setEditando(false);
  }

  function guardarEvolucion(ev) {
    const nuevas = evEditar
      ? form.evoluciones.map((e) => e.id === ev.id ? ev : e)
      : [ev, ...form.evoluciones];
    const actualizada = { ...form, evoluciones: nuevas };
    setForm(actualizada);
    onActualizar(actualizada);
    setModalEv(false);
    setEvEditar(null);
  }

  function eliminarEvolucion(id) {
    const actualizada = { ...form, evoluciones: form.evoluciones.filter((e) => e.id !== id) };
    setForm(actualizada);
    onActualizar(actualizada);
  }

  function actualizarOdontograma(nuevo) {
    const actualizada = { ...form, odontograma: nuevo };
    setForm(actualizada);
    onActualizar(actualizada);
  }

  function actualizarAdjuntos(nuevos) {
    const actualizada = { ...form, adjuntos: nuevos };
    setForm(actualizada);
    onActualizar(actualizada);
  }

  // Contar dientes con condición para el badge del botón
  const dientesConCondicion = Object.values(form.odontograma || {}).filter(
    (d) => d?.estado && d.estado !== 'sano'
  ).length;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onVolver}
            className="p-2 rounded-lg border border-teal-border bg-white hover:bg-teal-soft transition-colors cursor-pointer">
            <ArrowLeft size={15} className="text-primary" />
          </button>
          <div>
            <h2 className="text-[15px] font-medium text-primary">{form.pacienteNombre}</h2>
            <p className="text-[11px] text-teal-muted">
              Cédula {form.cedula} · Historia desde {form.fechaCreacion}
              {form.tipoSangre && ` · ${form.tipoSangre}${form.rh || ''}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {editando ? (
            <>
              <button type="button" onClick={cancelar}
                className="flex items-center gap-1.5 px-3 py-2 text-[12px] text-primary font-sans bg-white border border-teal-border rounded-lg cursor-pointer hover:bg-teal-info transition-colors">
                <X size={13} /> Cancelar
              </button>
              <button type="button" onClick={guardarDatos}
                className="flex items-center gap-1.5 px-3 py-2 text-[12px] text-white font-medium font-sans bg-primary rounded-lg border-none cursor-pointer hover:bg-primary-light transition-colors">
                <Save size={13} /> Guardar
              </button>
            </>
          ) : (
            <button type="button" onClick={() => { setEditando(true); setTab('clinica'); }}
              className="flex items-center gap-1.5 px-3 py-2 text-[12px] text-primary font-sans bg-white border border-teal-border rounded-lg cursor-pointer hover:bg-teal-soft transition-colors">
              <Pencil size={13} /> Editar historia
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 bg-white border border-teal-border rounded-xl p-1 mb-4 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => setTab(id)}
            className={[
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium font-sans border-none cursor-pointer transition-colors',
              tab === id ? 'bg-primary text-white' : 'text-teal-muted hover:bg-teal-soft',
            ].join(' ')}>
            <Icon size={13} />
            {label}
            {id === 'evoluciones' && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${tab === id ? 'bg-white/20 text-white' : 'bg-teal-soft text-teal-muted'}`}>
                {form.evoluciones.length}
              </span>
            )}
            {id === 'adjuntos' && form.adjuntos.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${tab === id ? 'bg-white/20 text-white' : 'bg-teal-soft text-teal-muted'}`}>
                {form.adjuntos.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Historia clínica ── */}
      {tab === 'clinica' && (
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <FormularioClinico
              form={form}
              editable={editando}
              onChange={setForm}
            />
          </div>

          {/* Columna derecha — botón odontograma */}
          <div className="col-span-1">
            <div className="bg-white border border-teal-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-teal-soft">
                <h3 className="text-[13px] font-medium text-primary">Odontograma</h3>
                <p className="text-[11px] text-teal-muted mt-0.5">Esquema dental del paciente</p>
              </div>
              <div className="px-4 py-5 flex flex-col items-center gap-4">
                {/* Preview de dientes con condición */}
                {dientesConCondicion > 0 ? (
                  <div className="w-full bg-teal-panel border border-teal-border rounded-xl p-3 text-center">
                    <p className="text-[22px] font-bold text-primary">{dientesConCondicion}</p>
                    <p className="text-[11px] text-teal-muted">
                      diente{dientesConCondicion !== 1 ? 's' : ''} con condición registrada
                    </p>
                    <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                      {Object.entries(form.odontograma || {})
                        .filter(([, v]) => v?.estado && v.estado !== 'sano')
                        .slice(0, 6)
                        .map(([num, val]) => (
                          <span key={num}
                            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: {
                                caries:'#FAEEDA', restauracion:'#EAF3DE', ausente:'#FDECEA',
                                endodoncia:'#FBEAF0', corona:'#E6F1FB', implante:'#EEEDFE',
                              }[val.estado] || '#EAF6F6',
                              color: {
                                caries:'#854F0B', restauracion:'#3B6D11', ausente:'#A32D2D',
                                endodoncia:'#993556', corona:'#185FA5', implante:'#3C3489',
                              }[val.estado] || '#0B4F5E',
                            }}>
                            D{num}
                          </span>
                        ))}
                      {dientesConCondicion > 6 && (
                        <span className="text-[10px] text-teal-muted">+{dientesConCondicion - 6} más</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="w-full bg-teal-panel border border-dashed border-teal-border rounded-xl p-4 text-center">
                    <p className="text-[28px] mb-1">🦷</p>
                    <p className="text-[12px] text-teal-muted">Sin condiciones registradas</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setModalOdonto(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-[12px] text-white font-semibold font-sans bg-primary rounded-xl border-none cursor-pointer hover:bg-primary-light transition-colors"
                >
                  🦷 Abrir odontograma
                </button>
                <p className="text-[10px] text-teal-muted text-center">
                  Haz clic para ver e interactuar con el esquema dental completo
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Evoluciones ── */}
      {tab === 'evoluciones' && (
        <div className="bg-white border border-teal-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-teal-soft">
            <h3 className="text-[13px] font-medium text-primary">
              Evoluciones del paciente
            </h3>
            <button type="button" onClick={() => { setEvEditar(null); setModalEv(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-white font-medium font-sans bg-primary rounded-lg border-none cursor-pointer hover:bg-primary-light transition-colors">
              <Plus size={13} /> Nueva evolución
            </button>
          </div>
          <div className="p-4">
            {form.evoluciones.length === 0 ? (
              <p className="text-center text-[12px] text-teal-muted py-8">
                Sin evoluciones registradas
              </p>
            ) : (
              form.evoluciones
                .slice()
                .sort((a, b) => b.fecha.localeCompare(a.fecha))
                .map((ev) => (
                  <EvolucionCard
                    key={ev.id}
                    ev={ev}
                    onEditar={(e) => { setEvEditar(e); setModalEv(true); }}
                    onEliminar={eliminarEvolucion}
                  />
                ))
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Adjuntos ── */}
      {tab === 'adjuntos' && (
        <AdjuntosPanel
          adjuntos={form.adjuntos}
          editable
          onChange={actualizarAdjuntos}
        />
      )}

      {/* Modal evolución */}
      {modalEv && (
        <EvolucionForm
          onGuardar={guardarEvolucion}
          onClose={() => { setModalEv(false); setEvEditar(null); }}
          evolucionEditar={evEditar}
        />
      )}

      {/* ✅ Modal odontograma */}
      <OdontogramaModal
        isOpen={modalOdonto}
        onClose={() => setModalOdonto(false)}
        odontograma={form.odontograma || {}}
        onGuardar={actualizarOdontograma}
        nombrePaciente={form.pacienteNombre}
      />
    </div>
  );
}