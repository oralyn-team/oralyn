// src/pages/Dashboard.jsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/Appcontext';
import { api } from '../api';

import Sidebar       from '../components/layout/Sidebar';
import Topbar        from '../components/layout/Topbar';
import StatCard      from '../components/StatCard';
import PacienteForm  from '../components/PacienteForm';
import CitaForm       from '../components/citas/CitaForm';

import { 
  Users, 
  CalendarDays, 
  AlertCircle, 
  TrendingUp, 
  Clock, 
  Phone, 
  Check, 
  UserPlus, 
  CalendarPlus, 
  Settings,
  ChevronRight,
  Loader2,
} from 'lucide-react';

function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function nombreCompleto(p) {
  if (!p) return '';
  return `${p.nombres} ${p.primer_apellido} ${p.segundo_apellido || ''}`.trim();
}

const ESTADOS_INFO = {
  pendiente: { label: 'Pendiente', bgClass: 'bg-status-amberBg text-status-amber', borderClass: 'border-status-amber/20' },
  asistio: { label: 'Asistió', bgClass: 'bg-status-greenBg text-status-green', borderClass: 'border-status-green/20' },
  no_asistio: { label: 'No asistió', bgClass: 'bg-status-redBg text-status-red', borderClass: 'border-status-red/20' },
  cancelada: { label: 'Cancelada', bgClass: 'bg-status-redBg text-status-red', borderClass: 'border-status-red/20' }
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { pacientes, agregarPaciente, recargarPacientes, configuracion } = useApp();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  

  // Modals status
  const [modalPaciente, setModalPaciente] = useState(false);
  const [modalCita, setModalCita] = useState(false);
  const [toast, setToast] = useState(null);
  const [updatingCitaId, setUpdatingCitaId] = useState(null);

  const pacientesParaSelector = useMemo(() => (
    pacientes.map((p) => ({ id: p.id, nombre: nombreCompleto(p) }))
  ), [pacientes]);

  async function loadDashboardData() {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getDashboard();
      setData(res);
    } catch (err) {
      console.error('Error cargando dashboard:', err);
      setError(err.error || 'No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  function mostrarToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function handleCambiarEstado(id, nuevoEstado) {
    setUpdatingCitaId(id);
    try {
      await api.cambiarEstadoCita(id, nuevoEstado);
      mostrarToast('Estado de cita actualizado correctamente');
      
      // Update local state directly to avoid full reload
      setData((prev) => {
        if (!prev) return null;
        const updatedCitas = prev.citas_hoy.map((c) => {
          if (c.id === id) return { ...c, estado: nuevoEstado };
          return c;
        });

        // Recalculate resumen metrics
        const pendientes = updatedCitas.filter((c) => c.estado === 'pendiente').length;
        const atendidas = updatedCitas.filter((c) => c.estado === 'asistio').length;
        const canceladas = updatedCitas.filter((c) => c.estado === 'cancelada').length;

        return {
          ...prev,
          citas_hoy: updatedCitas,
          resumen: {
            ...prev.resumen,
            citas_pendientes: pendientes,
            citas_atendidas: atendidas,
            citas_canceladas: canceladas
          }
        };
      });
    } catch (err) {
      console.error(err);
      mostrarToast(err.error || 'No se pudo actualizar el estado de la cita');
    } finally {
      setUpdatingCitaId(null);
    }
  }

  async function handleAgregarPaciente(datos) {
    try {
      await agregarPaciente(datos);
      setModalPaciente(false);
      mostrarToast('Paciente registrado correctamente');
      loadDashboardData(); // Refresh metrics
    } catch (err) {
      console.error(err);
      mostrarToast(err.error || 'No se pudo agregar el paciente');
    }
  }

  async function handleCrearCita(datos) {
    try {
      const payload = {
        paciente_id: Number(datos.paciente_id ?? datos.pacienteId),
        fecha_hora: datos.fecha_hora,
        procedimiento: datos.procedimiento || datos.motivo,
        doctor: datos.doctor || null,
        estado: 'pendiente',
        observaciones: datos.observaciones || null,
      };
      await api.crearCita(payload);
      setModalCita(false);
      mostrarToast('Cita agendada correctamente');
      loadDashboardData(); // Refresca métricas del dashboard
      recargarPacientes(); // Actualiza el sistema de notificaciones
    } catch (err) {
      console.error(err);
      mostrarToast(err.error || 'No se pudo agendar la cita');
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-teal-bg font-sans">
        <Sidebar />
        <div className="flex flex-col flex-1">
          <Topbar pacientes={pacientes} />
          <main className="flex-1 flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-[13px] text-teal-muted mt-2 font-medium">Cargando panel de control...</p>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-teal-bg font-sans">
        <Sidebar />
        <div className="flex flex-col flex-1">
          <Topbar pacientes={pacientes} />
          <main className="flex-1 px-6 py-5">
            <div className="bg-white border border-teal-border rounded-xl p-6 text-center max-w-md mx-auto mt-12">
              <AlertCircle className="w-10 h-10 text-status-red mx-auto mb-3" />
              <h3 className="text-[14px] font-medium text-primary mb-1">Error al cargar datos</h3>
              <p className="text-[11px] text-teal-muted mb-4">{error}</p>
              <button 
                type="button" 
                onClick={loadDashboardData}
                className="text-[12px] text-white font-medium px-4 py-2 bg-primary rounded-lg hover:bg-primary-light transition-colors"
              >
                Reintentar
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const resumen = data?.resumen || {};
  const citasHoy = data?.citas_hoy || [];

  const stats = [
    { label: 'Citas de hoy', value: resumen.total_citas_hoy || 0, sub: `${resumen.citas_pendientes || 0} pendientes hoy`, accentColor: '#85B7EB' },
    { label: 'Citas atendidas', value: resumen.citas_atendidas || 0, sub: 'registradas hoy', accentColor: '#5DC2A4' },
    { label: 'Pacientes totales', value: resumen.total_pacientes || 0, sub: 'historias registradas', accentColor: '#3ECFCF' },
    { label: 'Saldos pendientes', value: resumen.pacientes_con_deuda || 0, sub: 'pacientes con saldo', accentColor: '#EF9F27' },
  ];

  return (
    <div className="flex min-h-screen bg-teal-bg font-sans relative">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar pacientes={pacientes} />
        
        <main className="flex-1 overflow-y-auto px-6 py-5">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-primary to-primary-light rounded-xl p-5 text-white mb-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-[22px] tracking-wide">¡Hola, {configuracion?.nombre_profesional || 'Doctor'}!</h1>
              <p className="text-[11px] text-teal-light mt-0.5 max-w-lg">
                Este es el resumen de tu consultorio odontológico para el día de hoy. Puedes ver tus citas programadas y gestionar estados rápidamente.
              </p>
            </div>
            <div className="bg-white/10 px-3.5 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
              <Clock size={14} className="text-teal-light" />
              <span className="text-[12px] font-medium tabular-nums text-white/95">
                {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
            {stats.map((s) => <StatCard key={s.label} {...s} />)}
          </div>

          {/* Main Content Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            
            {/* Today's Appointments List (2/3 width) */}
            <div className="lg:col-span-2 bg-white border border-teal-border rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-teal-soft">
                <div>
                  <h2 className="text-[13px] font-medium text-primary">Citas de hoy ({citasHoy.length})</h2>
                  <p className="text-[10px] text-teal-muted mt-0.5">Listado ordenado por horario</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => navigate('/citas')}
                  className="text-[11px] text-primary hover:text-primary-light font-medium flex items-center gap-0.5 bg-transparent border-none cursor-pointer"
                >
                  Ver agenda completa <ChevronRight size={13} />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-teal-panel border-b border-teal-soft">
                      <th className="px-5 py-3 text-[11px] font-semibold text-teal-muted uppercase tracking-wider w-[100px]">Hora</th>
                      <th className="px-5 py-3 text-[11px] font-semibold text-teal-muted uppercase tracking-wider">Paciente</th>
                      <th className="px-5 py-3 text-[11px] font-semibold text-teal-muted uppercase tracking-wider w-[120px]">Teléfono</th>
                      <th className="px-5 py-3 text-[11px] font-semibold text-teal-muted uppercase tracking-wider">Procedimiento</th>
                      <th className="px-5 py-3 text-[11px] font-semibold text-teal-muted uppercase tracking-wider w-[110px]">Estado</th>
                      <th className="px-5 py-3 text-[11px] font-semibold text-teal-muted uppercase tracking-wider text-right w-[110px]">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-teal-soft">
                    {citasHoy.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center text-[12px] text-teal-muted">
                          <div className="flex justify-center mb-1.5">
                            <CalendarDays size={32} className="text-teal-muted" />
                          </div>
                          No tienes citas programadas para el día de hoy.
                        </td>
                      </tr>
                    ) : (
                      citasHoy.map((cita) => {
                        const est = ESTADOS_INFO[cita.estado] || { label: cita.estado, bgClass: 'bg-slate-50 text-slate-600', borderClass: 'border-slate-100' };
                        const paciente = cita.paciente || {};
                        const pNombre = nombreCompleto(paciente);
                        return (
                          <tr key={cita.id} className="hover:bg-teal-info/30 transition-colors">
                            <td className="px-5 py-3.5 text-[12px] font-medium text-primary tabular-nums">
                              {formatTime(cita.fecha_hora)}
                            </td>
                            <td className="px-5 py-3.5">
                              <p className="text-[12px] font-medium text-primary leading-tight">{pNombre}</p>
                            </td>
                            <td className="px-5 py-3.5 text-[11.5px] text-teal-muted font-mono whitespace-nowrap">
                              {paciente.telefono ? (
                                <span className="flex items-center gap-1">
                                  <Phone size={10} className="text-teal" />
                                  {paciente.telefono}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-[12px] text-[#1a3a3a] max-w-[150px] truncate" title={cita.procedimiento}>
                              {cita.procedimiento}
                            </td>
                            <td className="px-5 py-3.5">
                              {updatingCitaId === cita.id ? (
                                <Loader2 size={12} className="animate-spin text-teal" />
                              ) : (
                                <select
                                  value={cita.estado}
                                  onChange={(e) => handleCambiarEstado(cita.id, e.target.value)}
                                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${est.bgClass} ${est.borderClass} cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/40`}
                                >
                                  <option value="pendiente">Pendiente</option>
                                  <option value="asistio">Asistió</option>
                                  <option value="no_asistio">No asistió</option>
                                  <option value="cancelada">Cancelada</option>
                                </select>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => navigate(`/historias?pacienteId=${paciente.id}`)}
                                className="text-[11px] text-primary font-medium hover:underline bg-transparent border-none cursor-pointer flex items-center gap-0.5 justify-end ml-auto"
                              >
                                Ver Historia <ChevronRight size={12} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Actions & Short lists (1/3 width) */}
            <div className="flex flex-col gap-5">
              
              {/* Quick Actions Panel */}
              <div className="bg-white border border-teal-border rounded-xl p-5 shadow-sm">
                <h3 className="text-[13px] font-semibold text-primary mb-3 flex items-center gap-1.5">
                  <TrendingUp size={15} className="text-teal" /> Atajos Rápidos
                </h3>
                <div className="flex flex-col gap-2.5">
                  <button 
                    type="button" 
                    onClick={() => setModalCita(true)}
                    className="w-full flex items-center justify-between text-left text-[12px] font-medium text-primary hover:bg-teal-info/40 border border-teal-border p-2.5 rounded-lg cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <span className="p-1 bg-teal-soft text-primary rounded-md"><CalendarPlus size={14} /></span>
                      Agendar nueva cita
                    </span>
                    <ChevronRight size={13} className="text-teal-muted" />
                  </button>

                  <button 
                    type="button" 
                    onClick={() => setModalPaciente(true)}
                    className="w-full flex items-center justify-between text-left text-[12px] font-medium text-primary hover:bg-teal-info/40 border border-teal-border p-2.5 rounded-lg cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <span className="p-1 bg-teal-soft text-primary rounded-md"><UserPlus size={14} /></span>
                      Registrar nuevo paciente
                    </span>
                    <ChevronRight size={13} className="text-teal-muted" />
                  </button>

                  <button 
                    type="button" 
                    onClick={() => navigate('/configuracion')}
                    className="w-full flex items-center justify-between text-left text-[12px] font-medium text-primary hover:bg-teal-info/40 border border-teal-border p-2.5 rounded-lg cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <span className="p-1 bg-teal-soft text-primary rounded-md"><Settings size={14} /></span>
                      Ajustes del Consultorio
                    </span>
                    <ChevronRight size={13} className="text-teal-muted" />
                  </button>
                </div>
              </div>

              {/* Status Breakdown Panel */}
              <div className="bg-white border border-teal-border rounded-xl p-5 shadow-sm flex-1">
                <h3 className="text-[13px] font-semibold text-primary mb-3">Distribución de Citas</h3>
                {citasHoy.length === 0 ? (
                  <p className="text-[11px] text-teal-muted py-2">Sin datos de citas para graficar.</p>
                ) : (
                  <div className="space-y-3 pt-1">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-teal-muted">Asistieron</span>
                        <span className="font-semibold text-primary">{resumen.citas_atendidas || 0} / {resumen.total_citas_hoy || 0}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-status-green h-full" 
                          style={{ width: `${((resumen.citas_atendidas || 0) / (resumen.total_citas_hoy || 1)) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-teal-muted">Pendientes</span>
                        <span className="font-semibold text-primary">{resumen.citas_pendientes || 0} / {resumen.total_citas_hoy || 0}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-status-amberMid h-full" 
                          style={{ width: `${((resumen.citas_pendientes || 0) / (resumen.total_citas_hoy || 1)) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-teal-muted">Canceladas o No Asistió</span>
                        <span className="font-semibold text-primary">{(resumen.citas_canceladas || 0) + (citasHoy.filter(c => c.estado === 'no_asistio').length) || 0} / {resumen.total_citas_hoy || 0}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-status-red h-full" 
                          style={{ width: `${(((resumen.citas_canceladas || 0) + (citasHoy.filter(c => c.estado === 'no_asistio').length || 0)) / (resumen.total_citas_hoy || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </main>
      </div>

      {/* Quick Modals */}
      {modalPaciente && (
        <PacienteForm onAgregar={handleAgregarPaciente} onClose={() => setModalPaciente(false)} />
      )}

      {modalCita && (
        <CitaForm
          onGuardar={handleCrearCita}
          onClose={() => setModalCita(false)}
          citaEditar={null}
          pacientes={pacientesParaSelector}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-primary text-white text-[12px] px-4 py-2 rounded-full whitespace-nowrap z-20 shadow-lg flex items-center gap-1.5 border border-white/10">
          <Check size={13} className="text-teal" /> {toast}
        </div>
      )}
    </div>
  );
}
