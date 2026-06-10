// src/components/historias/HistoriaDetalle.jsx
import { useEffect, useState } from 'react';
import { ArrowLeft, Pencil, Plus, Save, X, ChevronDown, ChevronUp, Trash2, ClipboardList, CalendarDays, Paperclip, Activity, Wallet} from 'lucide-react';
import OdontogramaModal  from './OdontogramaModal';
import TratamientosCotizacionesForm from './tratamientos/TratamientoCotizacionForm';
import EvolucionForm     from './EvolucionForm';
import AdjuntosPanel     from './AdjuntosPanel';
import FormularioClinico from './FormularioClinico';
import { api }           from '../../api';
import { antecedentesFormToDb } from '../../data/historiasData';
import { useApp } from '../../context/Appcontext';

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function normalizeAdjunto(adj) {
  return {
    id: adj.id,
    nombre: adj.nombre || adj.nombre_archivo || '',
    tipo: adj.tipo || (adj.mime_type?.startsWith('image/') ? 'imagen' : 'pdf'),
    fecha: adj.creado_en?.split('T')[0] || adj.fecha?.split('T')[0] || '',
    url: adj.url || adj.ruta || null,
    mimeType: adj.mime_type || null,
  };
}

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

const TABS = [
  {
    id: 'clinica',
    label: 'Historia clínica',
    icon: ClipboardList
  },

  {
    id: 'odontograma',
    label: 'Odontograma',
    icon: Activity
  },

  {
    id: 'evoluciones',
    label: 'Evoluciones',
    icon: CalendarDays
  },

  {
    id: 'tratamientos',
    label: 'Tratamientos',
    icon: Wallet
  },

  {
    id: 'adjuntos',
    label: 'Adjuntos',
    icon: Paperclip
  },
];

export default function HistoriaDetalle({ historia, onVolver, onActualizar }) {
  const [editando, setEditando]         = useState(false);
  const [tab, setTab]                   = useState('clinica');
  const [modalEv, setModalEv]           = useState(false);
  const [evEditar, setEvEditar]         = useState(null);
  const [modalOdonto, setModalOdonto]   = useState(false);
  const [guardando, setGuardando]       = useState(false);
  const [errorGuardar, setErrorGuardar] = useState(null);
  const [modalTratamiento, setModalTratamiento] = useState(false);
  const [tratamientoEditar, setTratamientoEditar] = useState(null);
  const [cargandoTratamientos, setCargandoTratamientos] = useState(false);
  const [eliminandoTratamientoId, setEliminandoTratamientoId] = useState(null);

  const {
  guardarTratamiento: guardarTratamientoApp,
  getCotizacionesPaciente,
  eliminarCotizacion,
  crearEvolucion: crearEvolucionApp,
} = useApp();
  

  const [form, setForm] = useState({
    ...historia,
    odontograma: historia.odontograma ?? {},
    tratamientos: historia.tratamientos ?? [],
  });

  useEffect(() => {
    let activo = true;

    async function cargarTratamientos() {
      if (!historia.paciente_id) return;

      setCargandoTratamientos(true);
      try {
        const cotizaciones = await getCotizacionesPaciente(historia.paciente_id);
        if (!activo) return;
        setForm((prev) => ({
          ...prev,
          tratamientos: cotizaciones,
        }));
      } catch (err) {
        console.error('Error cargando tratamientos:', err);
        if (activo) setErrorGuardar('No se pudieron cargar los tratamientos del paciente.');
      } finally {
        if (activo) setCargandoTratamientos(false);
      }
    }

    cargarTratamientos();
    return () => { activo = false; };
  }, [historia.paciente_id, getCotizacionesPaciente]);

  // ── Guardar historia completa ──────────────────────────────────────────
  async function guardarDatos() {
    setGuardando(true);
    setErrorGuardar(null);
    try {
      await api.actualizarHistoria(historia.id, {
        // Campos principales
        motivo_consulta:            form.motivoConsulta            || '',
        diagnostico:                form.diagnostico               || '',
        tratamiento_realizado:      form.tratamiento               || '',
        medicamentos_actuales:      form.medicamentos              || '',
        antecedentes_odontologicos: form.antOdontologicos          || '',
        evento_adverso:             form.eventoAdverso             ?? false,
        evento_adverso_obs:         form.eventoAdversoObs          || '',
        habitos_json:               form.habitosOrales             || {},
        habitos_observaciones:      form.habitosObs                || '',

        // Campos adicionales
        departamento:               form.departamento    || null,
        estado_civil:               form.estadoCivil     || null,
        direccion:                  form.direccion       || null,
        ocupacion:                  form.ocupacion       || null,
        acudiente:                  form.acudiente       || null,
        parentesco:                 form.parentesco      || null,
        eps:                        form.eps             || null,
        tipo_afiliacion:            form.tipoAfiliacion  || null,
        tipo_sangre:                form.tipoSangre      || null,
        rh:                         form.rh              || null,
        alergias:                   form.alergias        || null,

        // Antecedentes: convierte { 'Hepatitis': true } → { hepatitis: true }
        antecedentes: antecedentesFormToDb(form.antecedentes),

        // Examen estomatológico: se guarda como JSON en estructuras_json
        examen: {
          estructuras_json: form.estomatologico    || {},
          observaciones:    form.estomatologicoObs || '',
        },
      });

      onActualizar(form);
      setEditando(false);
    } catch (err) {
      console.error('Error guardando historia:', err);
      setErrorGuardar('No se pudieron guardar los cambios. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  function cancelar() {
    setForm({ ...historia, odontograma: historia.odontograma ?? {} });
    setEditando(false);
    setErrorGuardar(null);
  }

  async function guardarEvolucion(ev) {
    setErrorGuardar(null);

    if (evEditar) {
      setErrorGuardar('La edición de evoluciones aún necesita endpoint PUT en backend.');
      return;
    }

    try {
      const nueva = await crearEvolucionApp(historia.id, ev);
      const nuevas = [nueva, ...(form.evoluciones || [])];
      const actualizada = { ...form, evoluciones: nuevas };

      setForm(actualizada);
      onActualizar(actualizada);
      setModalEv(false);
      setEvEditar(null);
    } catch (err) {
      console.error('Error guardando evolución:', err);
      setErrorGuardar(err.error || 'No se pudo guardar la evolución.');
    }
  }

async function handleGuardarTratamiento(data) {
  await guardarTratamientoApp(data, historia.paciente_id);

  const cotizaciones = await getCotizacionesPaciente(historia.paciente_id);

  const actualizada = {
    ...form,
    tratamientos: cotizaciones,
  };

  setForm((prev) => ({
    ...prev,
    tratamientos: cotizaciones,
  }));
  onActualizar(actualizada);

  setModalTratamiento(false);
  setTratamientoEditar(null);
}

async function handleEliminarTratamiento(tratamiento) {
  const confirmado = window.confirm(
    '¿Eliminar este tratamiento? Esta acción no se puede deshacer.'
  );

  if (!confirmado) return;

  setEliminandoTratamientoId(tratamiento.id);
  setErrorGuardar(null);
  try {
    await eliminarCotizacion(tratamiento.id);
    const cotizaciones = await getCotizacionesPaciente(historia.paciente_id);
    const actualizada = {
      ...form,
      tratamientos: cotizaciones,
    };

    setForm(actualizada);
    onActualizar(actualizada);
  } catch (err) {
    console.error('Error eliminando tratamiento:', err);
    setErrorGuardar(err.error || 'No se pudo eliminar el tratamiento.');
  } finally {
    setEliminandoTratamientoId(null);
  }
}

  function eliminarEvolucion(id) {
    console.warn('Eliminar evolución requiere endpoint DELETE en backend:', id);
    setErrorGuardar('Eliminar evoluciones aún necesita endpoint DELETE en backend.');
  }

  async function actualizarOdontograma(nuevo) {
    await api.actualizarOdontograma(historia.id, { dientes_json: nuevo, observaciones: null });
    const actualizada = { ...form, odontograma: nuevo };
    setForm(actualizada);
    onActualizar(actualizada);
  }

  function actualizarAdjuntos(nuevos) {
    const actualizada = { ...form, adjuntos: nuevos };
    setForm(actualizada);
    onActualizar(actualizada);
  }

  async function agregarAdjuntos(files) {
    const nuevos = await Promise.all(files.map(async (file) => {
      const creado = await api.crearAdjunto(historia.id, {
        nombre: file.name,
        nombre_archivo: file.name,
        tipo: file.type.startsWith('image/') ? 'imagen' : 'pdf',
        mime_type: file.type,
        tamano_bytes: file.size,
        contenido_base64: await fileToBase64(file),
      });

      return normalizeAdjunto(creado);
    }));

    actualizarAdjuntos([...(form.adjuntos || []), ...nuevos]);
  }

  async function eliminarAdjuntoHistoria(adjuntoId) {
    await api.eliminarAdjunto(historia.id, adjuntoId);
    actualizarAdjuntos((form.adjuntos || []).filter((adj) => adj.id !== adjuntoId));
  }

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
              Cédula {form.cedula} · Historia desde{' '}
              {new Date(form.fechaCreacion).toLocaleDateString('es-CO')}
              {form.tipoSangre && ` · ${form.tipoSangre}${form.rh || ''}`}
              </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {errorGuardar && (
            <span className="text-[11px] text-status-red bg-status-redBg px-3 py-1.5 rounded-lg border border-red-200">
              {errorGuardar}
            </span>
          )}
          {editando ? (
            <>
              <button type="button" onClick={cancelar} disabled={guardando}
                className="flex items-center gap-1.5 px-3 py-2 text-[12px] text-primary font-sans bg-white border border-teal-border rounded-lg cursor-pointer hover:bg-teal-info transition-colors disabled:opacity-50">
                <X size={13} /> Cancelar
              </button>
              <button type="button" onClick={guardarDatos} disabled={guardando}
                className="flex items-center gap-1.5 px-3 py-2 text-[12px] text-white font-medium font-sans bg-primary rounded-lg border-none cursor-pointer hover:bg-primary-light transition-colors disabled:opacity-70 disabled:cursor-not-allowed">
                <Save size={13} />
                {guardando ? 'Guardando…' : 'Guardar'}
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
                {form.evoluciones?.length ?? 0}
              </span>
            )}
            {id === 'adjuntos' && (form.adjuntos?.length > 0) && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${tab === id ? 'bg-white/20 text-white' : 'bg-teal-soft text-teal-muted'}`}>
                {form.adjuntos.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Historia clínica ── */}
      {tab === 'clinica' && (
        <div>
          <div>
            <FormularioClinico form={form} editable={editando} onChange={setForm} />
          </div>
        </div>
      )}

      {/* ── Tab: Odontograma ── */}
{tab === 'odontograma' && (
  <div className="bg-white border border-teal-border rounded-xl overflow-hidden">

    <div className="flex items-center justify-between px-4 py-3 border-b border-teal-soft">
      <div>
        <h3 className="text-[13px] font-medium text-primary">
          Odontograma del paciente
        </h3>

        <p className="text-[11px] text-teal-muted mt-0.5">
          Estado dental y tratamientos registrados
        </p>
      </div>

      <button
        type="button"
        onClick={() => setModalOdonto(true)}
        className="flex items-center gap-2 px-3 py-2 text-[12px] text-white font-semibold font-sans bg-primary rounded-lg border-none cursor-pointer hover:bg-primary-light transition-colors"
      >
        <Activity size={14} />
        Abrir odontograma
      </button>
    </div>

    <div className="p-5">

      {dientesConCondicion > 0 ? (
        <div className="bg-teal-panel border border-teal-border rounded-xl p-4">

          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[26px] font-bold text-primary">
                {dientesConCondicion}
              </p>

              <p className="text-[12px] text-teal-muted">
                dientes con condición registrada
              </p>
            </div>

            <div className="text-[40px]">
              🦷
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {Object.entries(form.odontograma || {})
              .filter(([, v]) => v?.estado && v.estado !== 'sano')
              .map(([num, val]) => (
                <span
                  key={num}
                  className="text-[11px] px-2.5 py-1 rounded-full font-medium"
                  style={{
                    backgroundColor: {
                      caries:'#FAEEDA',
                      restauracion:'#EAF3DE',
                      ausente:'#FDECEA',
                      endodoncia:'#FBEAF0',
                      corona:'#E6F1FB',
                      implante:'#EEEDFE'
                    }[val.estado] || '#EAF6F6',

                    color: {
                      caries:'#854F0B',
                      restauracion:'#3B6D11',
                      ausente:'#A32D2D',
                      endodoncia:'#993556',
                      corona:'#185FA5',
                      implante:'#3C3489'
                    }[val.estado] || '#0B4F5E',
                  }}
                >
                  D{num} · {val.estado}
                </span>
              ))}
          </div>

        </div>
      ) : (
        <div className="bg-teal-panel border border-dashed border-teal-border rounded-xl p-8 text-center">
          <p className="text-[40px] mb-2">🦷</p>

          <p className="text-[13px] text-primary font-medium">
            No hay condiciones registradas
          </p>

          <p className="text-[11px] text-teal-muted mt-1">
            Abre el odontograma para comenzar
          </p>
        </div>
      )}

    </div>
  </div>
)}

      {/* ── Tab: Evoluciones ── */}
      {tab === 'evoluciones' && (
        <div className="bg-white border border-teal-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-teal-soft">
            <h3 className="text-[13px] font-medium text-primary">Evoluciones del paciente</h3>
            <button type="button" onClick={() => { setEvEditar(null); setModalEv(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-white font-medium font-sans bg-primary rounded-lg border-none cursor-pointer hover:bg-primary-light transition-colors">
              <Plus size={13} /> Nueva evolución
            </button>
          </div>
          <div className="p-4">
            {!form.evoluciones?.length ? (
              <p className="text-center text-[12px] text-teal-muted py-8">Sin evoluciones registradas</p>
            ) : (
              form.evoluciones
                .slice()
                .sort((a, b) => b.fecha.localeCompare(a.fecha))
                .map((ev) => (
                  <EvolucionCard key={ev.id} ev={ev}
                    onEditar={(e) => { setEvEditar(e); setModalEv(true); }}
                    onEliminar={eliminarEvolucion} />
                ))
            )}
          </div>
        </div>
      )}

     {/* ── Tab: Tratamientos ── */}
{tab === 'tratamientos' && (
  <div className="bg-white border border-teal-border rounded-xl overflow-hidden">
    <div className="flex items-center justify-between px-4 py-3 border-b border-teal-soft">
      <div>
        <h3 className="text-[13px] font-medium text-primary">
          Planes de tratamiento y cotizaciones
        </h3>
        <p className="text-[11px] text-teal-muted mt-0.5">
          Presupuestos y tratamientos odontológicos del paciente
        </p>
      </div>
      <button
        type="button"
        onClick={() => { setTratamientoEditar(null); setModalTratamiento(true); }}
        className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-white font-medium font-sans bg-primary rounded-lg border-none cursor-pointer hover:bg-primary-light transition-colors"
      >
        <Plus size={13} /> Nuevo tratamiento
      </button>
    </div>

    <div className="p-6">
      {cargandoTratamientos ? (
        <p className="text-center text-[12px] text-teal-muted py-8">Cargando tratamientos...</p>
      ) : !form.tratamientos?.length ? (
        <div className="text-center py-10">
          <div className="text-[42px] mb-2">📋</div>
          <p className="text-[13px] font-medium text-primary">No hay tratamientos registrados</p>
          <p className="text-[11px] text-teal-muted mt-1">
            Agrega cotizaciones y planes de tratamiento
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {form.tratamientos.map((t) => {
            // El objeto viene de TratamientoCotizacionForm con esta estructura:
            // { id, info: { tipo, fecha, doctor, estado, prioridad, motivo },
            //   procedimientos: [], pagos: [], totales: { total, totalPagado, saldo } }
            const info  = t.info  || {};
            const tots  = t.totales || {};
            const procs = t.procedimientos || [];
            const saldo = Number(tots.saldo || 0);

            const ESTADO_STYLES = {
              borrador:   'bg-slate-100 text-slate-600',
              pendiente:  'bg-amber-50  text-amber-700',
              aprobado:   'bg-blue-50   text-blue-700',
              en_proceso: 'bg-violet-50 text-violet-700',
              finalizado: 'bg-emerald-50 text-emerald-700',
              cancelado:  'bg-red-50    text-red-600',
            };
            const ESTADO_LABELS = {
              borrador: 'Borrador', pendiente: 'Pendiente', aprobado: 'Aprobado',
              en_proceso: 'En proceso', finalizado: 'Finalizado', cancelado: 'Cancelado',
            };

            return (
              <div key={t.id} className="border border-teal-border rounded-xl p-4 hover:border-teal/40 transition-colors">
                <div className="flex items-start justify-between gap-4">

                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="text-[13px] font-semibold text-primary truncate">
                        {info.tipo || 'Tratamiento sin tipo'}
                      </h4>
                      {info.estado && (
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${ESTADO_STYLES[info.estado] || ESTADO_STYLES.borrador}`}>
                          {ESTADO_LABELS[info.estado] || info.estado}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      {info.fecha && (
                        <span className="text-[11px] text-teal-muted">{info.fecha}</span>
                      )}
                      {info.doctor && (
                        <span className="text-[11px] text-teal-muted">· {info.doctor}</span>
                      )}
                      {procs.length > 0 && (
                        <span className="text-[11px] text-teal-muted">
                          · {procs.length} procedimiento{procs.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {info.motivo && (
                      <p className="text-[11px] text-teal-muted mt-1 truncate">{info.motivo}</p>
                    )}
                  </div>

                  {/* Info financiera + acciones */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-[14px] font-bold text-primary tabular-nums">
                      ${Number(tots.total || 0).toLocaleString('es-CO')}
                    </span>

                    {saldo > 0 && (
                      <span className="text-[10.5px] text-amber-600 font-medium tabular-nums">
                        Saldo: ${saldo.toLocaleString('es-CO')}
                      </span>
                    )}
                    {saldo === 0 && Number(tots.total) > 0 && (
                      <span className="text-[10.5px] text-emerald-600 font-medium">✓ Pagado</span>
                    )}

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => { setTratamientoEditar(t); setModalTratamiento(true); }}
                        className="px-2.5 py-1 text-[11px] font-medium text-primary rounded-lg border border-teal-border hover:bg-teal-soft transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEliminarTratamiento(t)}
                        disabled={eliminandoTratamientoId === t.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-status-red rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-60"
                      >
                        <Trash2 size={11} />
                        {eliminandoTratamientoId === t.id ? 'Eliminando...' : 'Eliminar'}
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
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
          onAgregarArchivos={agregarAdjuntos}
          onEliminarAdjunto={eliminarAdjuntoHistoria}
        />
      )}

      {modalEv && (
        <EvolucionForm
          onGuardar={guardarEvolucion}
          onClose={() => { setModalEv(false); setEvEditar(null); }}
          evolucionEditar={evEditar}
        />
      )}

      {modalTratamiento && (
        <TratamientosCotizacionesForm
        onClose={() => {
          setModalTratamiento(false);
          setTratamientoEditar(null);
        }}
        onGuardar={handleGuardarTratamiento}
        tratamientoEditar={tratamientoEditar}
        />
        )}

      <OdontogramaModal
        isOpen={modalOdonto}
        onClose={() => setModalOdonto(false)}
        odontograma={form.odontograma}
        onGuardar={actualizarOdontograma}
        nombrePaciente={form.pacienteNombre}
      />
    </div>
  );
}
