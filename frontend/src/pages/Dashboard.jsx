// src/pages/Dashboard.jsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/Appcontext';
import { api } from '../api';
import { hasPermission, PERMISSIONS } from '../utils/rbac';

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
  const { usuario, pacientes, agregarPaciente, recargarPacientes, configuracion } = useApp();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      
      setData((prev) => {
        if (!prev) return null;
        const updatedCitas = prev.citas_hoy.map((c) => {
          if (c.id === id) return { ...c, estado: nuevoEstado };
          return c;
        });

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
      loadDashboardData();
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
      loadDashboardData();
      recargarPacientes();
    } catch (err) {
      console.error(err);
      mostrarToast(err.error || 'No se pudo agendar la cita');
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-teal-bg dark:bg-dark-bg font-sans">
        <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
        <div className="flex flex-col flex-1 min-w-0">
          <Topbar onToggleMobileMenu={() => setMobileMenuOpen(true)} />
          <main className="flex-1 flex flex-col items-center justify-center py-20 px-4">
            <Loader2 className="w-8 h-8 text-primary dark:text-teal animate-spin" />
            <p className="text-[13px] text-teal-muted dark:text-slate-400 mt-3 font-medium">Cargando panel de control...</p>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-teal-bg dark:bg-dark-bg font-sans">
        <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
        <div className="flex flex-col flex-1 min-w-0">
          <Topbar onToggleMobileMenu={() => setMobileMenuOpen(true)} />
          <main className="flex-1 px-4 sm:px-6 py-5">
            <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl p-6 text-center max-w-md mx-auto mt-12 shadow-soft-md">
              <AlertCircle className="w-10 h-10 text-status-red mx-auto mb-3" />
              <h3 className="text-[14px] font-semibold text-primary dark:text-dark-text mb-1">Error al cargar datos</h3>
              <p className="text-[12px] text-teal-muted dark:text-slate-400 mb-4">{error}</p>
              <button 
                type="button" 
                onClick={loadDashboardData}
                className="text-[12px] text-white font-medium px-4 py-2.5 bg-primary dark:bg-teal dark:text-slate-900 rounded-lg hover:opacity-90 transition-opacity"
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
    <div className="flex min-h-screen bg-teal-bg dark:bg-dark-bg font-sans relative">
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar onToggleMobileMenu={() => setMobileMenuOpen(true)} />
        
        <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-5 custom-scrollbar">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-primary via-primary-light to-teal-muted dark:from-slate-900 dark:via-slate-800 dark:to-teal-dark rounded-2xl p-5 sm:p-6 text-white mb-5 shadow-soft-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-[20px] sm:text-[24px] tracking-wide">¡Hola, {configuracion?.nombre_profesional || 'Doctor'}!</h1>
              <p className="text-[11px] sm:text-[12px] text-teal-light dark:text-slate-300 mt-1 max-w-lg leading-relaxed">
                Este es el resumen de tu consultorio odontológico para el día de hoy. Gestiona citas y accesos rápidos fácilmente.
              </p>
            </div>
            <div className="bg-white/10 dark:bg-white/5 px-4 py-2 rounded-xl border border-white/15 backdrop-blur-xs flex items-center gap-2 self-start md:self-auto">
              <Clock size={16} className="text-teal-light" />
              <span className="text-[12px] font-medium tabular-nums text-white">
                {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
            {stats.map((s) => <StatCard key={s.label} {...s} />)}
          </div>

          {/* Main Content Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            
            {/* Today's Appointments List (2/3 width) */}
            <div className="lg:col-span-2 bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl overflow-hidden shadow-soft-sm flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-teal-soft dark:border-dark-border bg-teal-panel/40 dark:bg-slate-800/40">
                <div>
                  <h2 className="text-[14px] font-semibold text-primary dark:text-dark-text">Citas de hoy ({citasHoy.length})</h2>
                  <p className="text-[11px] text-teal-muted dark:text-slate-400 mt-0.5">Listado ordenado por horario</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => navigate('/citas')}
                  className="text-[12px] text-primary dark:text-teal hover:underline font-medium flex items-center gap-0.5 cursor-pointer touch-target"
                >
                  Ver agenda completa <ChevronRight size={14} />
                </button>
              </div>

              <div className="overflow-x-auto custom-scrollbar flex-1">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-teal-panel dark:bg-slate-800/60 border-b border-teal-soft dark:border-dark-border">
                      <th className="px-4 py-3 text-[11px] font-semibold text-teal-muted dark:text-slate-400 uppercase tracking-wider w-[90px]">Hora</th>
                      <th className="px-4 py-3 text-[11px] font-semibold text-teal-muted dark:text-slate-400 uppercase tracking-wider">Paciente</th>
                      <th className="px-4 py-3 text-[11px] font-semibold text-teal-muted dark:text-slate-400 uppercase tracking-wider w-[120px]">Teléfono</th>
                      <th className="px-4 py-3 text-[11px] font-semibold text-teal-muted dark:text-slate-400 uppercase tracking-wider">Procedimiento</th>
                      <th className="px-4 py-3 text-[11px] font-semibold text-teal-muted dark:text-slate-400 uppercase tracking-wider w-[110px]">Estado</th>
                      <th className="px-4 py-3 text-[11px] font-semibold text-teal-muted dark:text-slate-400 uppercase tracking-wider text-right w-[110px]">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-teal-soft dark:divide-dark-border">
                    {citasHoy.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center text-[12px] text-teal-muted dark:text-slate-400">
                          <div className="flex justify-center mb-2">
                            <CalendarDays size={36} className="text-teal-light dark:text-slate-500" />
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
                          <tr key={cita.id} className="hover:bg-teal-info/30 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="px-4 py-3.5 text-[12px] font-medium text-primary dark:text-dark-text tabular-nums">
                              {formatTime(cita.fecha_hora)}
                            </td>
                            <td className="px-4 py-3.5">
                              <p className="text-[12px] font-medium text-primary dark:text-dark-text leading-tight">{pNombre}</p>
                            </td>
                            <td className="px-4 py-3.5 text-[11.5px] text-teal-muted dark:text-slate-400 font-mono whitespace-nowrap">
                              {paciente.telefono ? (
                                <span className="flex items-center gap-1">
                                  <Phone size={11} className="text-teal" />
                                  {paciente.telefono}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-[12px] text-primary dark:text-slate-300 max-w-[150px] truncate" title={cita.procedimiento}>
                              {cita.procedimiento}
                            </td>
                            <td className="px-4 py-3.5">
                              {updatingCitaId === cita.id ? (
                                <Loader2 size={14} className="animate-spin text-teal" />
                              ) : (
                                <select
                                  value={cita.estado}
                                  onChange={(e) => handleCambiarEstado(cita.id, e.target.value)}
                                  className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${est.bgClass} ${est.borderClass} cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/40`}
                                >
                                  <option value="pendiente">Pendiente</option>
                                  <option value="asistio">Asistió</option>
                                  <option value="no_asistio">No asistió</option>
                                  <option value="cancelada">Cancelada</option>
                                </select>
                              )}
                            </td>
                             <td className="px-4 py-3.5 text-right whitespace-nowrap">
                               {hasPermission(usuario, PERMISSIONS.CLINICAL_RECORDS_READ) ? (
                                 <button
                                   type="button"
                                   onClick={() => navigate(`/historias?pacienteId=${paciente.id}`)}
                                   className="text-[11px] text-primary dark:text-teal font-medium hover:underline flex items-center gap-0.5 justify-end ml-auto cursor-pointer"
                                 >
                                   Ver Historia <ChevronRight size={13} />
                                 </button>
                               ) : (
                                 <button
                                   type="button"
                                   onClick={() => navigate('/pacientes')}
                                   className="text-[11px] text-primary dark:text-teal font-medium hover:underline flex items-center gap-0.5 justify-end ml-auto cursor-pointer"
                                 >
                                   Ver Paciente <ChevronRight size={13} />
                                 </button>
                               )}
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
              <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl p-5 shadow-soft-sm">
                <h3 className="text-[13px] font-semibold text-primary dark:text-dark-text mb-3 flex items-center gap-2">
                  <TrendingUp size={16} className="text-teal" /> Atajos Rápidos
                </h3>
                <div className="flex flex-col gap-2.5">
                  <button 
                    type="button" 
                    onClick={() => setModalCita(true)}
                    className="w-full flex items-center justify-between text-left text-[12px] font-medium text-primary dark:text-dark-text hover:bg-teal-info/50 dark:hover:bg-slate-800 border border-teal-border dark:border-dark-border p-3 rounded-xl cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="p-1.5 bg-teal-soft dark:bg-slate-800 text-primary dark:text-teal rounded-lg"><CalendarPlus size={15} /></span>
                      Agendar nueva cita
                    </span>
                    <ChevronRight size={14} className="text-teal-muted dark:text-slate-400" />
                  </button>

                  <button 
                    type="button" 
                    onClick={() => setModalPaciente(true)}
                    className="w-full flex items-center justify-between text-left text-[12px] font-medium text-primary dark:text-dark-text hover:bg-teal-info/50 dark:hover:bg-slate-800 border border-teal-border dark:border-dark-border p-3 rounded-xl cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="p-1.5 bg-teal-soft dark:bg-slate-800 text-primary dark:text-teal rounded-lg"><UserPlus size={15} /></span>
                      Registrar nuevo paciente
                    </span>
                    <ChevronRight size={14} className="text-teal-muted dark:text-slate-400" />
                  </button>

                  <button 
                    type="button" 
                    onClick={() => navigate('/configuracion')}
                    className="w-full flex items-center justify-between text-left text-[12px] font-medium text-primary dark:text-dark-text hover:bg-teal-info/50 dark:hover:bg-slate-800 border border-teal-border dark:border-dark-border p-3 rounded-xl cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="p-1.5 bg-teal-soft dark:bg-slate-800 text-primary dark:text-teal rounded-lg"><Settings size={15} /></span>
                      Ajustes del Consultorio
                    </span>
                    <ChevronRight size={14} className="text-teal-muted dark:text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Status Breakdown Panel */}
              <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl p-5 shadow-soft-sm flex-1">
                <h3 className="text-[13px] font-semibold text-primary dark:text-dark-text mb-3">Distribución de Citas</h3>
                {citasHoy.length === 0 ? (
                  <p className="text-[11px] text-teal-muted dark:text-slate-400 py-2">Sin datos de citas para graficar.</p>
                ) : (
                  <div className="space-y-3.5 pt-1">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1.5">
                        <span className="text-teal-muted dark:text-slate-400">Asistieron</span>
                        <span className="font-semibold text-primary dark:text-dark-text">{resumen.citas_atendidas || 0} / {resumen.total_citas_hoy || 0}</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-status-green h-full rounded-full transition-all duration-300" 
                          style={{ width: `${((resumen.citas_atendidas || 0) / (resumen.total_citas_hoy || 1)) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1.5">
                        <span className="text-teal-muted dark:text-slate-400">Pendientes</span>
                        <span className="font-semibold text-primary dark:text-dark-text">{resumen.citas_pendientes || 0} / {resumen.total_citas_hoy || 0}</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-status-amberMid h-full rounded-full transition-all duration-300" 
                          style={{ width: `${((resumen.citas_pendientes || 0) / (resumen.total_citas_hoy || 1)) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1.5">
                        <span className="text-teal-muted dark:text-slate-400">Canceladas o No Asistió</span>
                        <span className="font-semibold text-primary dark:text-dark-text">{(resumen.citas_canceladas || 0) + (citasHoy.filter(c => c.estado === 'no_asistio').length) || 0} / {resumen.total_citas_hoy || 0}</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-status-red h-full rounded-full transition-all duration-300" 
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
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-primary dark:bg-slate-800 text-white text-[12px] px-4 py-2.5 rounded-full whitespace-nowrap z-50 shadow-soft-lg flex items-center gap-2 border border-white/10 animate-toast">
          <Check size={14} className="text-teal" /> {toast}
        </div>
      )}
    </div>
  );
}

