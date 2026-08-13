// src/pages/Citas.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, List } from 'lucide-react';

import Sidebar        from '../components/layout/Sidebar';
import Topbar         from '../components/layout/Topbar';
import StatCard       from '../components/StatCard';
import CitaTabla      from '../components/citas/CitaTabla';
import CitaCalendario from '../components/citas/CitaCalendario';
import CitaForm       from '../components/citas/CitaForm';

import { api } from '../api';
import { useApp } from '../context/Appcontext';

const ESTADO_API_TO_UI = {
  pendiente: 'Pendiente',
  asistio: 'Asistio',
  no_asistio: 'No asistio',
  cancelada: 'Cancelada',
};

const ESTADO_UI_TO_API = {
  Pendiente: 'pendiente',
  Asistio: 'asistio',
  'No asistio': 'no_asistio',
  Cancelada: 'cancelada',
};

function nombreCompletoPaciente(paciente) {
  if (!paciente) return '';
  return [paciente.nombres, paciente.primer_apellido, paciente.segundo_apellido]
    .filter(Boolean)
    .join(' ');
}

function normalizeCita(cita, pacientes = []) {
  const fecha = cita.fecha_hora ? new Date(cita.fecha_hora) : null;
  const paciente = cita.paciente || pacientes.find((p) => p.id === cita.paciente_id);

  return {
    ...cita,
    pacienteId: cita.paciente_id,
    pacienteNombre: paciente ? nombreCompletoPaciente(paciente) : cita.pacienteNombre || '',
    fecha: fecha ? fecha.toISOString().slice(0, 10) : '',
    hora: fecha ? fecha.toTimeString().slice(0, 5) : '',
    motivo: cita.procedimiento || '',
    estado: ESTADO_API_TO_UI[cita.estado] || 'Pendiente',
  };
}

function citaToApi(cita) {
  return {
    paciente_id: Number(cita.paciente_id ?? cita.pacienteId),
    fecha_hora: cita.fecha_hora,
    procedimiento: cita.procedimiento || cita.motivo,
    doctor: cita.doctor || null,
    estado: ESTADO_UI_TO_API[cita.estado] || 'pendiente',
    observaciones: cita.observaciones || null,
  };
}

function buildStats(citas) {
  const hoy = new Date().toISOString().slice(0, 10);
  return [
    { label: 'Total citas', value: citas.length, sub: 'registradas', accentColor: '#3ECFCF' },
    { label: 'Hoy', value: citas.filter((c) => c.fecha === hoy).length, sub: 'programadas hoy', accentColor: '#85B7EB' },
    { label: 'Pendientes', value: citas.filter((c) => c.estado === 'Pendiente').length, sub: 'por confirmar', accentColor: '#EF9F27' },
    { label: 'Asistieron', value: citas.filter((c) => c.estado === 'Asistio').length, sub: 'este mes', accentColor: '#5DC2A4' },
  ];
}

export default function Citas() {
  const { pacientes, recargarPacientes } = useApp();
  const [citas, setCitas] = useState([]);
  const [vista, setVista] = useState('tabla');
  const [modalOpen, setModalOpen] = useState(false);
  const [citaEditar, setCitaEditar] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const pacientesParaSelector = useMemo(() => (
    pacientes.map((p) => ({ id: p.id, nombre: nombreCompletoPaciente(p) }))
  ), [pacientes]);

  const pacientesRef = useRef(pacientes);
  useEffect(() => { pacientesRef.current = pacientes; }, [pacientes]);

  useEffect(() => {
    let activo = true;

    async function cargarCitas() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getCitas();
        if (activo) setCitas((data || []).map((cita) => normalizeCita(cita, pacientesRef.current)));
      } catch (err) {
        console.error('Error cargando citas:', err);
        if (activo) setError(err.error || 'No se pudieron cargar las citas.');
      } finally {
        if (activo) setLoading(false);
      }
    }

    cargarCitas();
    return () => { activo = false; };
  }, []);

  const toastTimerRef = useRef(null);
  function mostrarToast(msg, duracion = 2200) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => setToast(null), duracion);
  }

  function abrirCrear() {
    setCitaEditar(null);
    setModalOpen(true);
  }

  function abrirEditar(cita) {
    setCitaEditar(cita);
    setModalOpen(true);
  }

  async function guardarCita(datos) {
    try {
      const guardada = citaEditar
        ? await api.actualizarCita(citaEditar.id, citaToApi(datos))
        : await api.crearCita(citaToApi(datos));
      const normalizada = normalizeCita(guardada, pacientes);

      setCitas((prev) => (
        citaEditar
          ? prev.map((c) => c.id === normalizada.id ? normalizada : c)
          : [normalizada, ...prev]
      ));

      mostrarToast(citaEditar ? 'Cita actualizada correctamente' : 'Cita creada correctamente');
      setModalOpen(false);
      setCitaEditar(null);
      recargarPacientes();
    } catch (err) {
      console.error('Error guardando cita:', err);
      mostrarToast(err.error || 'No se pudo guardar la cita');
    }
  }

  async function eliminarCita(id) {
    try {
      await api.eliminarCita(id);
      setCitas((prev) => prev.filter((c) => c.id !== id));
      mostrarToast('Cita eliminada');
      recargarPacientes();
    } catch (err) {
      console.error('Error eliminando cita:', err);
      mostrarToast(err.error || 'No se pudo eliminar la cita');
    }
  }

  async function cambiarEstado(id, nuevoEstado) {
    try {
      const citaOriginal = citas.find((c) => c.id === id);
      const actualizada = await api.cambiarEstadoCita(id, ESTADO_UI_TO_API[nuevoEstado]);
      setCitas((prev) => prev.map((c) => c.id === id ? normalizeCita(actualizada, pacientes) : c));

      const cie10Actual = citaOriginal?.codigo_cie10 ?? citaOriginal?.codigoCie10;
      if (nuevoEstado === 'Asistio' && (cie10Actual === 'Z012' || !cie10Actual)) {
        mostrarToast('Cita marcada como atendida. Diagnóstico actual: Examen odontológico — revísalo si ya tienes un hallazgo confirmado.', 4500);
      } else {
        mostrarToast(`Estado actualizado: ${nuevoEstado}`);
      }
      recargarPacientes();
    } catch (err) {
      console.error('Error cambiando estado:', err);
      mostrarToast(err.error || 'No se pudo actualizar el estado');
    }
  }

  const stats = buildStats(citas);

  return (
    <div className="flex min-h-screen bg-teal-bg dark:bg-dark-bg font-sans relative">
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar onToggleMobileMenu={() => setMobileMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-5 custom-scrollbar">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
            {stats.map((s) => <StatCard key={s.label} {...s} />)}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-[15px] font-semibold text-primary dark:text-dark-text">Gestión de Citas</h2>
              <p className="text-[11px] text-teal dark:text-teal-light font-medium mt-0.5">
                {loading ? 'Cargando citas...' : `${citas.length} citas registradas`}
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="flex items-center bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-xl overflow-hidden p-0.5 shadow-soft-sm">
                <button
                  type="button"
                  onClick={() => setVista('tabla')}
                  className={[
                    'flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium font-sans border-none cursor-pointer rounded-lg transition-colors touch-target',
                    vista === 'tabla' ? 'bg-primary text-white dark:bg-teal dark:text-slate-900' : 'bg-transparent text-teal-muted dark:text-slate-400 hover:text-primary dark:hover:text-white',
                  ].join(' ')}
                >
                  <List size={14} /> Lista
                </button>
                <button
                  type="button"
                  onClick={() => setVista('calendario')}
                  className={[
                    'flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium font-sans border-none cursor-pointer rounded-lg transition-colors touch-target',
                    vista === 'calendario' ? 'bg-primary text-white dark:bg-teal dark:text-slate-900' : 'bg-transparent text-teal-muted dark:text-slate-400 hover:text-primary dark:hover:text-white',
                  ].join(' ')}
                >
                  <CalendarDays size={14} /> Calendario
                </button>
              </div>

              <button
                type="button"
                onClick={abrirCrear}
                className="flex items-center gap-1.5 px-4 py-2 text-[12px] text-white font-medium bg-primary dark:bg-teal dark:text-slate-900 rounded-xl hover:opacity-90 transition-opacity touch-target cursor-pointer shadow-soft-sm whitespace-nowrap"
              >
                + Nueva cita
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/40 p-3 text-[12px] text-status-red dark:text-red-400 font-medium">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-[13px] text-teal-muted dark:text-slate-400 px-1 py-8 text-center">Cargando citas...</p>
          ) : vista === 'tabla' ? (
            <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl overflow-hidden shadow-soft-sm">
              <CitaTabla
                citas={citas}
                onEditar={abrirEditar}
                onEliminar={eliminarCita}
                onCambiarEstado={cambiarEstado}
              />
            </div>
          ) : (
            <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl p-4 sm:p-5 shadow-soft-sm">
              <CitaCalendario citas={citas} />
            </div>
          )}
        </main>
      </div>

      {modalOpen && (
        <CitaForm
          onGuardar={guardarCita}
          onClose={() => { setModalOpen(false); setCitaEditar(null); }}
          citaEditar={citaEditar}
          pacientes={pacientesParaSelector}
        />
      )}

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-primary dark:bg-slate-800 text-white text-[12px] px-4 py-2.5 rounded-full whitespace-nowrap z-50 animate-toast border border-white/10 shadow-soft-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

