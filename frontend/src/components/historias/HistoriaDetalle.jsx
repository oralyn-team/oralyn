// src/components/historias/HistoriaDetalle.jsx
import { useEffect, useState } from 'react';
import { ArrowLeft, Pencil, Plus, Save, X, ChevronDown, FileText, ChevronUp, Trash2, ClipboardList, CalendarDays, Paperclip, Activity, Wallet, BriefcaseMedical, Ban } from 'lucide-react';
import OdontogramaModal from './OdontogramaModal';
import { TIPOS_ELASTICO, COLOR_ELASTICO } from './odontogramaConstants';
import TratamientosCotizacionesForm from './tratamientos/TratamientoCotizacionForm';
import EvolucionForm     from './EvolucionForm';
import AdjuntosPanel     from './AdjuntosPanel';
import FormularioClinico from './FormularioClinico';
import { api }           from '../../api';
import { antecedentesFormToDb } from '../../data/historiasData';
import { useApp } from '../../context/useApp';
import { hasPermission, PERMISSIONS } from '../../utils/rbac';

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
    contenido_base64: adj.contenido_base64 || null,
  };
}

function SeccionLabel({ text }) {
  return <p className="text-[10px] font-semibold text-teal-muted dark:text-slate-400 uppercase tracking-[0.8px] mb-1.5">{text}</p>;
}

function formatearFechaHora(valor) {
  if (!valor) return '';
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime())
    ? ''
    : fecha.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

// Una evolución anulada se muestra atenuada, con el aviso de anulación, y su contenido sigue legible (solo lectura)
function EvolucionCard({ ev, puedeModificar, onEditar, onAnular }) {
  const [abierto, setAbierto] = useState(false);
  const anulada = Boolean(ev.anulada);
  return (
    <div className={[
      'border rounded-xl overflow-hidden mb-2 shadow-soft-sm',
      anulada
        ? 'border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/10'
        : 'bg-white dark:bg-dark-card border-teal-border dark:border-dark-border',
    ].join(' ')}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-teal-panel dark:hover:bg-slate-800/40 transition-colors"
        onClick={() => setAbierto((v) => !v)}>
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${anulada ? 'bg-status-red' : 'bg-teal'}`} />
        <div className={`flex-1 min-w-0 ${anulada ? 'opacity-70' : ''}`}>
          <p className={`text-[13px] font-semibold text-primary dark:text-dark-text ${anulada ? 'line-through' : ''}`}>{ev.motivo}</p>
          <p className="text-[11px] text-teal-muted dark:text-slate-400 mt-0.5">{ev.fecha} · {ev.doctor}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {anulada && (
            <span className="text-[10px] font-medium px-2 py-1 rounded-full whitespace-nowrap bg-red-100 dark:bg-red-950/40 text-status-red dark:text-red-400">
              Anulada
            </span>
          )}
          {!anulada && puedeModificar && (
            <>
              <button type="button" title="Editar evolución" onClick={(e) => { e.stopPropagation(); onEditar(ev); }}
                className="p-1.5 rounded-lg border border-teal-border dark:border-dark-border bg-white dark:bg-dark-input hover:bg-teal-soft dark:hover:bg-slate-700 text-primary dark:text-teal transition-colors cursor-pointer touch-target">
                <Pencil size={13} />
              </button>
              <button type="button" title="Anular evolución" onClick={(e) => { e.stopPropagation(); onAnular(ev); }}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium bg-status-redBg dark:bg-red-950/40 text-status-red dark:text-red-400 border border-status-redBg dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors cursor-pointer touch-target">
                <Ban size={12} /> Anular
              </button>
            </>
          )}
          {abierto ? <ChevronUp size={15} className="text-teal-muted dark:text-slate-400" /> : <ChevronDown size={15} className="text-teal-muted dark:text-slate-400" />}
        </div>
      </div>
      {anulada && (
        <p className="px-4 pb-3 -mt-1 text-[11px] text-status-red dark:text-red-400 leading-snug">
          Anulada el {formatearFechaHora(ev.anuladaEn) || 'fecha desconocida'}
          {ev.anuladaPorNombre ? ` por ${ev.anuladaPorNombre}` : ''} — motivo: {ev.motivoAnulacion || 'sin motivo registrado'}
        </p>
      )}
      {abierto && (
        <div className={`px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-teal-soft dark:border-dark-border pt-3.5 bg-teal-panel/40 dark:bg-slate-800/40 ${anulada ? 'opacity-70' : ''}`}>
          <div>
            <SeccionLabel text="Diagnóstico" />
            <p className="text-[12px] text-primary dark:text-dark-text leading-relaxed">{ev.diagnostico}</p>
          </div>
          <div>
            <SeccionLabel text="Tratamiento realizado" />
            <p className="text-[12px] text-primary dark:text-dark-text leading-relaxed">{ev.tratamiento}</p>
          </div>
          {ev.observaciones && (
            <div className="sm:col-span-2">
              <SeccionLabel text="Observaciones" />
              <p className="text-[12px] text-primary dark:text-dark-text leading-relaxed">{ev.observaciones}</p>
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

// Respuestas del control de concurrencia optimista del backend (se compara el código, nunca se muestra)
const esConflictoVersion = (err) => err?.status === 409 && err?.error === 'CONFLICTO_VERSION';
const esVersionRequerida = (err) => err?.status === 400 && err?.error === 'VERSION_REQUERIDA';
// Solo en evoluciones: otro usuario ya la anuló, así que no admite más cambios
const esEvolucionAnulada = (err) => err?.status === 409 && err?.error === 'EVOLUCION_ANULADA';

export default function HistoriaDetalle({ historia, onVolver, onActualizar, onRecargar }) {
  const [editando, setEditando]         = useState(false);
  // Conflicto de versión pendiente de decisión del usuario: 'historia' | 'odontograma' | 'evolucion' | null
  const [conflicto, setConflicto]       = useState(null);
  const [recargando, setRecargando]     = useState(false);
  const [errorRecarga, setErrorRecarga] = useState(null);
  const [bundleDesactualizado, setBundleDesactualizado] = useState(false);
  // Cambia tras "Recargar datos actuales" para remontar el modal del odontograma con los datos nuevos
  const [odontoKey, setOdontoKey]       = useState(0);
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
  // Diálogo de anulación: evolución elegida (con la versión que se cargó) y motivo escrito
  const [evAnular, setEvAnular]         = useState(null);
  const [motivoAnular, setMotivoAnular] = useState('');
  const [anulando, setAnulando]         = useState(false);
  const [errorAnular, setErrorAnular]   = useState(null);

  const {
  usuario,
  guardarTratamiento: guardarTratamientoApp,
  getCotizacionesPaciente,
  eliminarCotizacion,
  crearEvolucion: crearEvolucionApp,
  actualizarEvolucion: actualizarEvolucionApp,
  anularEvolucion: anularEvolucionApp,
} = useApp();

  // Editar y anular usan el mismo permiso en el backend
  const puedeModificarEvoluciones = hasPermission(usuario, PERMISSIONS.CLINICAL_RECORDS_UPDATE);

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
      const guardada = await api.actualizarHistoria(historia.id, {
        // Versión que se cargó: si otro usuario guardó antes, el backend responde 409
        version:                    form.version,
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
          estructuras_json:   form.estomatologico    || {},
          observaciones:      form.estomatologicoObs || '',
          examen_pulpar_json: form.examenPulpar      || {},
          pulpar_obs:         form.pulparObs         || '',
          tejidos_json:       form.tejidos           || {},
          tejidos_obs:        form.tejidosObs        || '',
          periodontal_json:   form.periodontal       || {},
          dx_periodontal:     form.dxPeriodontal     || '',
          periodontal_obs:    form.periodontalObs    || '',
        },
      });

      // Guardado completo: se propaga lo que se acaba de enviar. `tratamientos` es solo de esta vista
      // eslint-disable-next-line no-unused-vars -- `_t` se descarta a propósito: tratamientos no forma parte del guardado
      const { tratamientos: _t, ...guardado } = form;
      // La versión nueva viene en la respuesta: sin ella, el siguiente guardado sería un falso conflicto
      setForm((prev) => ({ ...prev, version: guardada.version }));
      onActualizar(historia.id, { ...guardado, version: guardada.version });
      setEditando(false);
    } catch (err) {
      console.error('Error guardando historia:', err);
      if (esConflictoVersion(err)) {
        setConflicto('historia');        // no se descarta nada: el usuario decide
      } else if (esVersionRequerida(err)) {
        setBundleDesactualizado(true);
      } else {
        setErrorGuardar('No se pudieron guardar los cambios. Intenta de nuevo.');
      }
    } finally {
      setGuardando(false);
    }
  }

  function cancelar() {
    // Descarta la edición clínica pero conserva lo que no se edita aquí (tratamientos cargados aparte)
    setForm((prev) => ({ ...historia, odontograma: historia.odontograma ?? {}, tratamientos: prev.tratamientos }));
    setEditando(false);
    setErrorGuardar(null);
  }

  // Reemplaza una evolución por la que devolvió el backend (versión nueva incluida), en el form y en la lista
  function reemplazarEvolucion(actualizada) {
    const reemplazar = (lista) => (lista || []).map((e) => (e.id === actualizada.id ? actualizada : e));
    setForm((prev) => ({ ...prev, evoluciones: reemplazar(prev.evoluciones) }));
    onActualizar(historia.id, (h) => ({ evoluciones: reemplazar(h.evoluciones) }));
  }

  // Pide la historia al backend y solo actualiza las evoluciones del form (no toca una edición clínica en curso)
  async function recargarEvoluciones() {
    const fresca = await onRecargar(historia.id);
    setForm((prev) => ({ ...prev, evoluciones: fresca.evoluciones }));
    return fresca.evoluciones || [];
  }

  // Otro usuario anuló la evolución: se avisa y se recargan los datos para mostrarla anulada
  async function avisarEvolucionYaAnulada() {
    setErrorGuardar('Esta evolución ya fue anulada. Se recargaron los datos.');
    try {
      await recargarEvoluciones();
    } catch (err) {
      console.error('Error recargando evoluciones:', err);
      setErrorGuardar('Esta evolución ya fue anulada. Recarga la página para ver los datos actuales.');
    }
  }

  async function guardarEvolucion(ev) {
    setErrorGuardar(null);

    if (evEditar) {
      try {
        // Se envía la versión que se cargó al abrir el formulario, no la del objeto editado
        const actualizada = await actualizarEvolucionApp(historia.id, evEditar.id, ev, evEditar.version);
        reemplazarEvolucion(actualizada);
        setModalEv(false);
        setEvEditar(null);
      } catch (err) {
        console.error('Error actualizando evolución:', err);
        if (esEvolucionAnulada(err)) {
          setModalEv(false);
          setEvEditar(null);
          await avisarEvolucionYaAnulada();
        } else if (esConflictoVersion(err)) {
          setConflicto('evolucion');     // el formulario sigue abierto: el usuario decide
        } else if (esVersionRequerida(err)) {
          setBundleDesactualizado(true);
        } else {
          setErrorGuardar(err.error || 'No se pudo guardar la evolución.');
        }
      }
      return;
    }

    try {
      const nueva = await crearEvolucionApp(historia.id, ev);
      // Solo se propaga lo persistido, calculado sobre el estado más reciente (no sobre copias previas al await)
      setForm((prev) => ({ ...prev, evoluciones: [nueva, ...(prev.evoluciones || [])] }));
      onActualizar(historia.id, (h) => ({ evoluciones: [nueva, ...(h.evoluciones || [])] }));
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

  // `tratamientos` solo vive en esta vista: la lista de historias no lo usa, no se propaga
  setForm((prev) => ({
    ...prev,
    tratamientos: cotizaciones,
  }));

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
    // `tratamientos` solo vive en esta vista: la lista de historias no lo usa, no se propaga
    setForm((prev) => ({ ...prev, tratamientos: cotizaciones }));
  } catch (err) {
    console.error('Error eliminando tratamiento:', err);
    setErrorGuardar(err.error || 'No se pudo eliminar el tratamiento.');
  } finally {
    setEliminandoTratamientoId(null);
  }
}

  function abrirAnulacion(ev) {
    setEvAnular(ev);
    setMotivoAnular('');
    setErrorAnular(null);
  }

  function cerrarAnulacion() {
    setEvAnular(null);
    setMotivoAnular('');
    setErrorAnular(null);
  }

  async function anularEvolucion(evolucionId, motivo, version) {
    setAnulando(true);
    setErrorAnular(null);
    try {
      const anulada = await anularEvolucionApp(historia.id, evolucionId, motivo, version);
      reemplazarEvolucion(anulada);
      cerrarAnulacion();
    } catch (err) {
      console.error('Error anulando evolución:', err);
      if (esEvolucionAnulada(err)) {
        cerrarAnulacion();
        await avisarEvolucionYaAnulada();
      } else if (esConflictoVersion(err)) {
        // Otro usuario la editó: se recarga y el diálogo queda con la versión nueva y el motivo escrito
        try {
          const evoluciones = await recargarEvoluciones();
          const fresca = evoluciones.find((e) => e.id === evolucionId);
          if (!fresca || fresca.anulada) {
            cerrarAnulacion();
            if (fresca?.anulada) setErrorGuardar('Esta evolución ya fue anulada. Se recargaron los datos.');
          } else {
            setEvAnular(fresca);
            setErrorAnular('Otro usuario modificó esta evolución. Se recargaron los datos; revísala y confirma de nuevo.');
          }
        } catch (errRecarga) {
          console.error('Error recargando evoluciones:', errRecarga);
          setErrorAnular('Otro usuario modificó esta evolución. Recarga la página e intenta de nuevo.');
        }
      } else if (esVersionRequerida(err)) {
        cerrarAnulacion();
        setBundleDesactualizado(true);
      } else {
        setErrorAnular(err.mensaje || err.error || 'No se pudo anular la evolución.');
      }
    } finally {
      setAnulando(false);
    }
  }


async function actualizarOdontograma({ tipo, dientes_json }) {
  // Versión de la fila de ese tipo que se cargó; un tipo sin fila es 0 (primer guardado)
  const version = form.odontogramaVersiones?.[tipo] ?? 0;
  let guardado;
  try {
    guardado = await api.actualizarOdontograma(historia.id, tipo, { dientes_json, observaciones: null, version });
  } catch (err) {
    if (esConflictoVersion(err) || esVersionRequerida(err)) {
      if (esConflictoVersion(err)) setConflicto('odontograma');
      else setBundleDesactualizado(true);
      err.manejado = true;               // el modal sigue abierto con las marcas, sin su error genérico
    }
    throw err;
  }

  const versiones = (v) => ({ ...(v || {}), [tipo]: guardado.version });
  setForm((prev) => ({
    ...prev,
    odontograma: { ...prev.odontograma, [tipo]: dientes_json },
    odontogramaVersiones: versiones(prev.odontogramaVersiones),
  }));
  onActualizar(historia.id, (h) => ({
    odontograma: { ...h.odontograma, [tipo]: dientes_json },
    odontogramaVersiones: versiones(h.odontogramaVersiones),
  }));
}

  // "Recargar datos actuales" tras un conflicto: pide la historia al backend y actualiza form, lista y versiones
  async function recargarDatosActuales() {
    setRecargando(true);
    setErrorRecarga(null);
    try {
      const fresca = await onRecargar(historia.id);
      if (conflicto === 'evolucion') {
        // Se descarta la edición de la evolución (el usuario lo eligió); lo demás del form no se toca
        setForm((prev) => ({ ...prev, evoluciones: fresca.evoluciones }));
        setModalEv(false);
        setEvEditar(null);
      } else if (conflicto === 'historia') {
        // Se descarta la edición en curso (el usuario lo eligió); tratamientos se cargan aparte
        setForm((prev) => ({ ...fresca, odontograma: fresca.odontograma ?? {}, tratamientos: prev.tratamientos }));
        setEditando(false);
      } else {
        // Solo el odontograma: no se toca una posible edición clínica en curso
        setForm((prev) => ({
          ...prev,
          odontograma: fresca.odontograma ?? {},
          odontogramaVersiones: fresca.odontogramaVersiones ?? {},
        }));
        setOdontoKey((k) => k + 1);      // el modal sigue abierto, remontado con los datos actuales
      }
      setConflicto(null);
    } catch (err) {
      console.error('Error recargando historia:', err);
      setErrorRecarga('No se pudieron recargar los datos. Intenta de nuevo.');
    } finally {
      setRecargando(false);
    }
  }

  // Recibe una función (listaAnterior) => listaNueva, aplicada al estado más reciente del form y de la lista
  function actualizarAdjuntos(calcular) {
    setForm((prev) => ({ ...prev, adjuntos: calcular(prev.adjuntos || []) }));
    onActualizar(historia.id, (h) => ({ adjuntos: calcular(h.adjuntos || []) }));
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

    actualizarAdjuntos((lista) => [...lista, ...nuevos]);
  }

  async function eliminarAdjuntoHistoria(adjuntoId) {
    await api.eliminarAdjunto(historia.id, adjuntoId);
    actualizarAdjuntos((lista) => lista.filter((adj) => adj.id !== adjuntoId));
  }

  const TIPOS_ODONTOGRAMA_RESUMEN = [
    { key: 'general-adulto', label: 'General adulto' },
    { key: 'general-infantil', label: 'General infantil' },
    { key: 'ortodoncia', label: 'Ortodoncia' },
  ];

  function extraerCondicionesDeTipo(mapaTipo) {
    return Object.entries(mapaTipo || {})
      // 'arcos' y 'elasticos' son claves reservadas a nivel de odontograma, no dientes
      .filter(([key]) => key !== 'arcos' && key !== 'elasticos')
      .filter(([, v]) => v?.estado && v.estado !== 'sano');
  }

  const condicionesPorTipo = TIPOS_ODONTOGRAMA_RESUMEN.map(({ key, label }) => ({
    key,
    label,
    items: extraerCondicionesDeTipo(form.odontograma?.[key]),
  }));

  const dientesConCondicion = condicionesPorTipo.reduce((acc, t) => acc + t.items.length, 0);
  const elasticosActuales = form.odontograma?.['ortodoncia']?.elasticos || [];

  async function onVerPDF() {
  try {
    await api.verHistoriaPDF(historia.id);
  } catch (error) {
    console.error(error);
    setErrorGuardar('No se pudo generar el PDF de la historia clínica.');
  }
}

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-5 custom-scrollbar">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onVolver}
            className="p-2 rounded-xl border border-teal-border dark:border-dark-border bg-white dark:bg-dark-card hover:bg-teal-soft dark:hover:bg-slate-800 transition-colors cursor-pointer touch-target shadow-soft-sm">
            <ArrowLeft size={16} className="text-primary dark:text-teal" />
          </button>
          <button
            type="button"
            onClick={onVerPDF}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[12px] text-white font-medium bg-primary dark:bg-teal dark:text-slate-900 rounded-xl hover:opacity-90 transition-opacity touch-target cursor-pointer shadow-soft-sm"
          >
            <FileText size={14} />
            Ver PDF
          </button>
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold text-primary dark:text-dark-text truncate">{form.pacienteNombre}</h2>
            <p className="text-[11px] text-teal-muted dark:text-slate-400 truncate">
              Cédula {form.cedula} · Historia desde{' '}
              {new Date(form.fechaCreacion).toLocaleDateString('es-CO')}
              {form.tipoSangre && ` · ${form.tipoSangre}${form.rh || ''}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {errorGuardar && (
            <span className="text-[11px] text-status-red dark:text-red-400 bg-status-redBg dark:bg-red-950/40 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/50 font-medium">
              {errorGuardar}
            </span>
          )}
          {editando ? (
            <>
              <button type="button" onClick={cancelar} disabled={guardando}
                className="flex items-center gap-1.5 px-3.5 py-2 text-[12px] text-primary dark:text-slate-300 font-sans bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl cursor-pointer hover:bg-teal-soft dark:hover:bg-slate-700 transition-colors disabled:opacity-50 touch-target">
                <X size={14} /> Cancelar
              </button>
              <button type="button" onClick={guardarDatos} disabled={guardando}
                className="flex items-center gap-1.5 px-3.5 py-2 text-[12px] text-white font-semibold font-sans bg-primary dark:bg-teal dark:text-slate-900 rounded-xl border-none cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-70 disabled:cursor-not-allowed touch-target shadow-soft-sm">
                <Save size={14} />
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => { setEditando(true); setTab('clinica'); }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-[12px] text-primary dark:text-slate-300 font-medium font-sans bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl cursor-pointer hover:bg-teal-soft dark:hover:bg-slate-700 transition-colors touch-target shadow-soft-sm">
              <Pencil size={14} /> Editar historia
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-xl p-1 mb-4 w-full sm:w-fit overflow-x-auto custom-scrollbar shadow-soft-sm">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => setTab(id)}
            className={[
              'flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-medium font-sans border-none cursor-pointer transition-colors whitespace-nowrap touch-target',
              tab === id ? 'bg-primary dark:bg-teal text-white dark:text-slate-900 font-semibold shadow-soft-sm' : 'text-teal-muted dark:text-slate-400 hover:bg-teal-soft dark:hover:bg-slate-800/40 hover:text-primary dark:hover:text-dark-text',
            ].join(' ')}>
            <Icon size={14} />
            {label}
            {id === 'evoluciones' && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${tab === id ? 'bg-white/20 text-white dark:bg-slate-900/30 dark:text-slate-900' : 'bg-teal-soft dark:bg-slate-800 text-teal-muted dark:text-slate-300'}`}>
                {form.evoluciones?.length ?? 0}
              </span>
            )}
            {id === 'adjuntos' && (form.adjuntos?.length > 0) && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${tab === id ? 'bg-white/20 text-white dark:bg-slate-900/30 dark:text-slate-900' : 'bg-teal-soft dark:bg-slate-800 text-teal-muted dark:text-slate-300'}`}>
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

      {(dientesConCondicion > 0 || elasticosActuales.length > 0) ? (
        <div className="bg-teal-panel border border-teal-border rounded-xl p-4">

          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[26px] font-bold text-primary">
                {dientesConCondicion > 0 ? dientesConCondicion : elasticosActuales.length}
              </p>

              <p className="text-[12px] text-teal-muted">
                {dientesConCondicion > 0 ? 'dientes con condición registrada' : 'elásticos activos'}
              </p>
            </div>

            <div className="text-[40px]">
              🦷
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {condicionesPorTipo.flatMap(({ key: tipoKey, label: tipoLabel, items }) =>
              items.map(([num, val]) => {
                const colores = {
                  bg: {
                    caries: '#FAEEDA',
                    restauracion: '#EAF3DE',
                    ausente: '#FDECEA',
                    endodoncia: '#FBEAF0',
                    corona: '#E6F1FB',
                    implante: '#EEEDFE',
                  }[val.estado] || '#EAF6F6',
                  text: {
                    caries: '#854F0B',
                    restauracion: '#3B6D11',
                    ausente: '#A32D2D',
                    endodoncia: '#993556',
                    corona: '#185FA5',
                    implante: '#3C3489',
                  }[val.estado] || '#0B4F5E',
                };

                return (
                  <span
                    key={`${tipoKey}-${num}`}
                    className="text-[11px] px-2.5 py-1 rounded-full font-medium"
                    style={{ backgroundColor: colores.bg, color: colores.text }}
                    title={tipoLabel}
                  >
                    D{num} · {val.estado}
                    {tipoKey === 'ortodoncia' && <span className="opacity-60"> (Orto)</span>}
                  </span>
                );
              })
            )}
          </div>

          {elasticosActuales.length > 0 && (
            <div className="mt-4 pt-4 border-t border-teal-border">
              <p className="text-[11px] text-teal-muted uppercase tracking-wide font-medium mb-2">
                Elásticos activos
              </p>
              <div className="flex flex-wrap gap-2">
                {elasticosActuales.map((el) => {
                  const tipoInfo = TIPOS_ELASTICO.find((t) => t.key === el.tipo);
                  const color = COLOR_ELASTICO[el.tipo] || '#7C3AED';
                  return (
                    <span
                      key={el.id}
                      className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-white border"
                      style={{ borderColor: color, color }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                      {el.desde} → {el.hasta} · {tipoInfo?.label || el.tipo}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 border border-dashed border-teal-border dark:border-dark-border rounded-xl p-8 text-center bg-teal-panel/20 dark:bg-slate-800/10">
          <Activity size={36} className="text-teal-light dark:text-slate-500 mb-2 animate-pulse" />
          <p className="text-[13px] font-semibold text-primary dark:text-dark-text">
            No hay condiciones registradas
          </p>
          <p className="text-[11px] text-teal-muted dark:text-slate-400 mt-1">
            Abre el odontograma para comenzar
          </p>
        </div>
      )}

    </div>
  </div>
)}

      {/* ── Tab: Evoluciones ── */}
      {tab === 'evoluciones' && (
        <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-xl overflow-hidden shadow-soft-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 border-b border-teal-soft dark:border-dark-border bg-teal-panel/40 dark:bg-slate-800/40">
            <h3 className="text-[13px] font-bold text-primary dark:text-dark-text">Evoluciones del paciente</h3>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button type="button" onClick={() => api.verRecomendacionesPDF()}
                className="flex items-center gap-1.5 px-3 py-2 text-[12px] text-teal-dark dark:text-teal hover:text-teal-muted dark:hover:text-teal-light font-medium font-sans bg-teal-panel dark:bg-slate-800 border border-teal-border dark:border-dark-border rounded-xl cursor-pointer hover:bg-teal-soft dark:hover:bg-slate-700 transition-colors touch-target shadow-soft-sm">
                <FileText size={14} /> Recomendaciones Post-Qx
              </button>
              <button type="button" onClick={() => { setEvEditar(null); setModalEv(true); }}
                className="flex items-center gap-1.5 px-3 py-2 text-[12px] text-white font-medium font-sans bg-primary dark:bg-teal dark:text-slate-900 rounded-xl border-none cursor-pointer hover:opacity-90 transition-opacity touch-target shadow-soft-sm">
                <Plus size={14} /> Nueva evolución
              </button>
            </div>
          </div>
          <div className="p-4 bg-white dark:bg-dark-card">
            {!form.evoluciones?.length ? (
              <p className="text-center text-[12px] text-teal-muted dark:text-slate-400 py-8">Sin evoluciones registradas</p>
            ) : (
              form.evoluciones
                .slice()
                .sort((a, b) => b.fecha.localeCompare(a.fecha))
                .map((ev) => (
                  <EvolucionCard key={ev.id} ev={ev}
                    puedeModificar={puedeModificarEvoluciones}
                    onEditar={(e) => { setEvEditar(e); setModalEv(true); }}
                    onAnular={abrirAnulacion} />
                ))
            )}
          </div>
        </div>
      )}

     {/* ── Tab: Tratamientos ── */}
{tab === 'tratamientos' && (
  <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-xl overflow-hidden shadow-soft-sm">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 border-b border-teal-soft dark:border-dark-border bg-teal-panel/40 dark:bg-slate-800/40">
      <div>
        <h3 className="text-[13px] font-bold text-primary dark:text-dark-text">
          Planes de tratamiento y cotizaciones
        </h3>
        <p className="text-[11px] text-teal-muted dark:text-slate-400 mt-0.5 font-medium">
          Presupuestos y tratamientos odontológicos del paciente
        </p>
      </div>
      <button
        type="button"
        onClick={() => { setTratamientoEditar(null); setModalTratamiento(true); }}
        className="flex items-center gap-1.5 px-3.5 py-2 text-[12px] text-white font-medium font-sans bg-primary dark:bg-teal dark:text-slate-900 rounded-xl border-none cursor-pointer hover:opacity-90 transition-opacity touch-target shadow-soft-sm self-end sm:self-auto"
      >
        <Plus size={14} /> Nuevo tratamiento
      </button>
    </div>

    <div className="p-6">
      {cargandoTratamientos ? (
        <p className="text-center text-[12px] text-teal-muted py-8">Cargando tratamientos...</p>
      ) : !form.tratamientos?.length ? (
        <div className="flex flex-col items-center justify-center py-12 text-teal-muted dark:text-slate-400">
          <BriefcaseMedical size={36} className="text-teal-light dark:text-slate-500 mb-2" />
          <p className="text-[13px] font-semibold text-primary dark:text-dark-text">No hay tratamientos registrados</p>
          <p className="text-[11px] text-teal-muted dark:text-slate-400 mt-1">
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
                      onClick={() => api.verCotizacionPDF(t.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-teal-muted rounded-lg border border-teal-border hover:bg-teal-soft transition-colors"
                      >
                        <FileText size={11} />
                        PDF
                        </button>
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
          onChange={(lista) => actualizarAdjuntos(() => lista)}
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

      {/* Se desmonta al cerrar: cada apertura empieza con estado limpio y los odontogramas actuales */}
      {modalOdonto && (
        <OdontogramaModal
          key={odontoKey}
          isOpen={modalOdonto}
          onClose={() => setModalOdonto(false)}
          odontogramas={form.odontograma}
          onGuardar={actualizarOdontograma}
          nombrePaciente={form.pacienteNombre}
        />
      )}

      {/* Anulación de evolución: exige motivo; el contenido clínico no se borra */}
      {evAnular && (
        <div className="fixed inset-0 bg-primary/50 backdrop-blur-sm flex items-center justify-center p-4 z-[10001]" role="alertdialog" aria-modal="true" aria-labelledby="anular-ev-titulo">
          <form
            className="bg-white dark:bg-dark-card rounded-2xl shadow-soft-lg max-w-md w-full p-5 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (motivoAnular.trim() && !anulando) anularEvolucion(evAnular.id, motivoAnular.trim(), evAnular.version);
            }}
          >
            <h3 id="anular-ev-titulo" className="text-[14px] font-bold text-status-red dark:text-red-400">
              Anular evolución
            </h3>
            <p className="text-[12.5px] text-teal-muted dark:text-slate-300 leading-relaxed">
              {evAnular.fecha} · {evAnular.motivo || evAnular.procedimiento}
            </p>
            <p className="text-[12px] text-teal-muted dark:text-slate-400 leading-relaxed">
              La evolución no se borra: queda en la historia marcada como anulada, con su contenido original y el motivo que indiques. Esta acción no se puede deshacer.
            </p>
            <label className="block">
              <span className="text-[11px] font-semibold text-primary dark:text-dark-text">Motivo de la anulación</span>
              <textarea
                value={motivoAnular}
                onChange={(e) => setMotivoAnular(e.target.value)}
                rows={3}
                autoFocus
                disabled={anulando}
                placeholder="Ej.: registrada en el paciente equivocado"
                className="mt-1 w-full text-[12.5px] rounded-lg border border-teal-border dark:border-dark-border bg-white dark:bg-dark-input text-primary dark:text-dark-text px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:opacity-60"
              />
            </label>
            {errorAnular && <p className="text-[12px] text-red-600">{errorAnular}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={cerrarAnulacion} disabled={anulando}
                className="px-3 py-2 text-[12px] rounded-lg border border-teal-border text-primary dark:text-dark-text hover:bg-teal-soft cursor-pointer disabled:opacity-50">
                Cancelar
              </button>
              <button type="submit" disabled={!motivoAnular.trim() || anulando}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-[12px] rounded-lg bg-status-red text-white hover:opacity-90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                <Ban size={13} />
                {anulando ? 'Anulando…' : 'Anular evolución'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Conflicto de versión: otro usuario guardó antes. Nada se descarta hasta que el usuario elija. */}
      {conflicto && (
        <div className="fixed inset-0 bg-primary/50 backdrop-blur-sm flex items-center justify-center p-4 z-[10001]" role="alertdialog" aria-modal="true" aria-labelledby="conflicto-titulo">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft-lg max-w-md w-full p-5 space-y-3">
            <h3 id="conflicto-titulo" className="text-[14px] font-bold text-primary dark:text-dark-text">
              Otro usuario guardó cambios
            </h3>
            <p className="text-[12.5px] text-teal-muted dark:text-slate-300 leading-relaxed">
              Mientras trabajabas, otra persona guardó cambios en {{ odontograma: 'este odontograma', evolucion: 'esta evolución' }[conflicto] ?? 'esta historia clínica'}.
              {' '}<strong>Tus cambios no se han guardado.</strong>
            </p>
            <p className="text-[12px] text-teal-muted dark:text-slate-400 leading-relaxed">
              Puedes quedarte para copiar lo que escribiste, o recargar los datos actuales y volver a aplicar tus cambios.
            </p>
            {errorRecarga && <p className="text-[12px] text-red-600">{errorRecarga}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => { setConflicto(null); setErrorRecarga(null); }} disabled={recargando}
                className="px-3 py-2 text-[12px] rounded-lg border border-teal-border text-primary dark:text-dark-text hover:bg-teal-soft cursor-pointer disabled:opacity-50">
                Quedarme
              </button>
              <button type="button" onClick={recargarDatosActuales} disabled={recargando}
                className="px-3 py-2 text-[12px] rounded-lg bg-primary text-white hover:opacity-90 cursor-pointer disabled:opacity-50">
                {recargando ? 'Recargando…' : 'Recargar datos actuales'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* El backend exige `version` y este cliente no la envió: la app cargada es anterior al despliegue */}
      {bundleDesactualizado && (
        <div className="fixed inset-0 bg-primary/50 backdrop-blur-sm flex items-center justify-center p-4 z-[10001]" role="alertdialog" aria-modal="true" aria-labelledby="bundle-titulo">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft-lg max-w-md w-full p-5 space-y-3">
            <h3 id="bundle-titulo" className="text-[14px] font-bold text-primary dark:text-dark-text">
              La aplicación se actualizó
            </h3>
            <p className="text-[12.5px] text-teal-muted dark:text-slate-300 leading-relaxed">
              Hay una versión nueva de Oralyn. <strong>Tus cambios no se han guardado.</strong> Copia lo que necesites y recarga la página para continuar.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setBundleDesactualizado(false)}
                className="px-3 py-2 text-[12px] rounded-lg border border-teal-border text-primary dark:text-dark-text hover:bg-teal-soft cursor-pointer">
                Cerrar
              </button>
              <button type="button" onClick={() => window.location.reload()}
                className="px-3 py-2 text-[12px] rounded-lg bg-primary text-white hover:opacity-90 cursor-pointer">
                Recargar página
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}