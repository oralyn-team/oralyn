import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Search,
  Filter,
  CalendarDays,
  Download,
  FileBarChart,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  User,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  AlertCircle,
  Stethoscope,
  Users
} from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';
import { useApp } from '../context/Appcontext';
import { api } from '../api';

export default function Rips() {
  const { pacientes, configuracion, usuariosConsultorio = [] } = useApp();
  const doctorDefault = configuracion?.nombre_profesional || (usuariosConsultorio.length === 1 ? usuariosConsultorio[0].nombre : '');

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [toast, setToast] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filters
  const [fechaInicial, setFechaInicial] = useState('');
  const [fechaFinal, setFechaFinal] = useState('');
  const [profesional, setProfesional] = useState(doctorDefault);
  const [estadoFilter, setEstadoFilter] = useState('Todos');

  useEffect(() => {
    if (!profesional && (configuracion?.nombre_profesional || usuariosConsultorio.length === 1)) {
      const def = configuracion?.nombre_profesional || usuariosConsultorio[0]?.nombre || '';
      if (def) setProfesional(def);
    }
  }, [configuracion, usuariosConsultorio]);

  // Modals / Panels
  const [selectedGeneracion, setSelectedGeneracion] = useState(null);
  const [generarModal, setGenerarModal] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const cargarGeneraciones = async (filters = {}) => {
    setLoading(true);
    try {
      const res = await api.getRips({
        fecha_inicio: filters.fechaInicial ?? fechaInicial,
        fecha_fin: filters.fechaFinal ?? fechaFinal,
        profesional: filters.profesional ?? profesional,
        estado: filters.estadoFilter ?? estadoFilter
      });
      setData(Array.isArray(res) ? res : res.data || []);
    } catch (err) {
      console.error('Error al cargar RIPS:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarGeneraciones();
  }, []);

  const handleBuscar = () => {
    setCurrentPage(1);
    cargarGeneraciones();
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleDescargar = async (id, formato) => {
    try {
      await api.descargarRipsFile(id, formato);
      showToast(`Archivo RIPS (${formato.toUpperCase()}) descargado correctamente`);
    } catch (err) {
      console.error('Error al descargar RIPS:', err);
      showToast(err.message || 'Error al descargar el archivo RIPS');
    }
  };

  const confirmGenerar = async () => {
    if (!generarModal) return;

    try {
      const res = await api.generarRips({
        fecha_inicio: generarModal.fechaInicial,
        fecha_fin: generarModal.fechaFinal
      });

      if (res.valido) {
        showToast('Archivo RIPS generado exitosamente');
        setGenerarModal(null);
        cargarGeneraciones();
      } else {
        setGenerarModal(prev => ({
          ...prev,
          inconsistencias: res.inconsistencias || []
        }));
      }
    } catch (err) {
      console.error('Error generando RIPS:', err);
      showToast(err.error || 'Error al generar RIPS');
    }
  };

  const statsSummary = useMemo(() => {
    const listos = data.filter(item => item.estado === 'Generado' || (item.inconsistencias.length === 0 && item.estado === 'Pendiente')).reduce((acc, curr) => acc + curr.cantidadRegistros, 0);
    const conInconsistencias = data.filter(item => item.inconsistencias.length > 0).reduce((acc, curr) => acc + curr.inconsistencias.length, 0);
    const pendientes = data.filter(item => item.estado === 'Pendiente').reduce((acc, curr) => acc + curr.cantidadRegistros, 0);
    return { listos, conInconsistencias, pendientes };
  }, [data]);

  const totalItems = data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentData = data.slice(startIndex, endIndex);

  return (
    <div className="flex min-h-screen bg-teal-bg dark:bg-dark-bg font-sans relative">
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar onToggleMobileMenu={() => setMobileMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-5 custom-scrollbar">
          {/* Encabezado */}
          <div className="mb-5">
            <h2 className="text-[15px] font-semibold text-primary dark:text-dark-text flex items-center gap-2">
              <FileBarChart size={18} className="text-teal" /> Módulo de RIPS
            </h2>
            <p className="text-[11px] text-teal dark:text-teal-light font-medium mt-0.5">
              Consulte registros de prestación de servicios, valide inconsistencias y genere archivos RIPS.
            </p>
          </div>

          {/* Tarjeta de Resumen Indicadores */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-5">
            <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl p-4 flex items-center gap-3.5 shadow-soft-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                <CheckCircle size={20} />
              </div>
              <div>
                <p className="text-[20px] font-bold text-primary dark:text-dark-text leading-none">{statsSummary.listos}</p>
                <p className="text-[11px] text-teal-muted dark:text-slate-400 mt-1 font-medium">Registros listos</p>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl p-4 flex items-center gap-3.5 shadow-soft-sm">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <p className="text-[20px] font-bold text-primary dark:text-dark-text leading-none">{statsSummary.conInconsistencias}</p>
                <p className="text-[11px] text-teal-muted dark:text-slate-400 mt-1 font-medium">Inconsistencias detectadas</p>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl p-4 flex items-center gap-3.5 shadow-soft-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-[20px] font-bold text-primary dark:text-dark-text leading-none">{statsSummary.pendientes}</p>
                <p className="text-[11px] text-teal-muted dark:text-slate-400 mt-1 font-medium">Pendientes por completar</p>
              </div>
            </div>
          </div>

          {/* Tarjeta de Filtros */}
          <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl p-4 sm:p-5 shadow-soft-sm mb-5">
            <div className="flex items-center gap-2 mb-4">
              <Filter size={15} className="text-teal" />
              <h3 className="text-[13px] font-semibold text-primary dark:text-dark-text">Filtros de búsqueda</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-teal-muted dark:text-slate-400 font-semibold uppercase tracking-wider">Fecha inicial</label>
                <div className="relative">
                  <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-muted dark:text-slate-400" />
                  <input
                    type="date"
                    value={fechaInicial}
                    onChange={(e) => setFechaInicial(e.target.value)}
                    className="w-full text-[12px] bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl pl-9 pr-3 py-2 outline-none focus:border-primary dark:focus:border-teal text-primary dark:text-dark-text min-h-[38px]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-teal-muted dark:text-slate-400 font-semibold uppercase tracking-wider">Fecha final</label>
                <div className="relative">
                  <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-muted dark:text-slate-400" />
                  <input
                    type="date"
                    value={fechaFinal}
                    onChange={(e) => setFechaFinal(e.target.value)}
                    className="w-full text-[12px] bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl pl-9 pr-3 py-2 outline-none focus:border-primary dark:focus:border-teal text-primary dark:text-dark-text min-h-[38px]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-teal-muted dark:text-slate-400 font-semibold uppercase tracking-wider">Profesional</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-muted dark:text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    list="profesionales-lista-rips"
                    value={profesional}
                    onChange={(e) => setProfesional(e.target.value)}
                    placeholder="Todos / Nombre del profesional..."
                    className="w-full text-[12px] bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl pl-9 pr-3 py-2 outline-none focus:border-primary dark:focus:border-teal text-primary dark:text-dark-text min-h-[38px]"
                  />
                  <datalist id="profesionales-lista-rips">
                    <option value="Todos" />
                    {usuariosConsultorio.map((u) => (
                      <option key={u.id} value={u.nombre} />
                    ))}
                    {configuracion?.nombre_profesional && !usuariosConsultorio.some(u => u.nombre === configuracion.nombre_profesional) && (
                      <option value={configuracion.nombre_profesional} />
                    )}
                  </datalist>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-teal-muted dark:text-slate-400 font-semibold uppercase tracking-wider">Estado</label>
                <div className="relative">
                  <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-muted dark:text-slate-400" />
                  <select
                    value={estadoFilter}
                    onChange={(e) => setEstadoFilter(e.target.value)}
                    className="w-full text-[12px] bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl pl-9 pr-3 py-2 outline-none focus:border-primary dark:focus:border-teal text-primary dark:text-dark-text appearance-none min-h-[38px] cursor-pointer"
                  >
                    <option value="Todos">Todos los estados</option>
                    <option value="Generado">Generado</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="Con observaciones">Con observaciones</option>
                  </select>
                </div>
              </div>

              <div>
                <button
                  onClick={handleBuscar}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-[12px] text-white font-medium bg-primary dark:bg-teal dark:text-slate-900 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-70 touch-target cursor-pointer shadow-soft-sm"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                  Buscar
                </button>
              </div>
            </div>
          </div>

          {/* Área de Tabla de Generaciones */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-medium text-teal-muted dark:text-slate-400">
              {loading ? 'Buscando generaciones...' : `Mostrando ${totalItems} períodos de RIPS`}
            </span>
          </div>

          {/* Tabla de Generaciones RIPS */}
          <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl overflow-hidden shadow-soft-sm">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead className="bg-teal-bg/60 dark:bg-slate-800/60 border-b border-teal-soft dark:border-dark-border text-[10.5px] font-semibold text-teal-muted dark:text-slate-400 uppercase tracking-[0.7px]">
                  <tr>
                    <th className="px-4 py-3.5 whitespace-nowrap">Período</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Fecha de generación</th>
                    <th className="px-4 py-3.5 whitespace-nowrap text-right">Cantidad de registros</th>
                    <th className="px-4 py-3.5 whitespace-nowrap text-center">Estado</th>
                    <th className="px-4 py-3.5 whitespace-nowrap text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="text-[12px] text-primary dark:text-dark-text divide-y divide-teal-soft dark:divide-dark-border">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, idx) => (
                      <tr key={idx} className="bg-white dark:bg-dark-card">
                        <td className="px-4 py-3.5"><div className="h-3.5 bg-teal-soft dark:bg-slate-800 rounded w-48 animate-pulse"></div></td>
                        <td className="px-4 py-3.5"><div className="h-3.5 bg-teal-soft dark:bg-slate-800 rounded w-28 animate-pulse"></div></td>
                        <td className="px-4 py-3.5"><div className="h-3.5 bg-teal-soft dark:bg-slate-800 rounded w-16 animate-pulse ml-auto"></div></td>
                        <td className="px-4 py-3.5"><div className="h-3.5 bg-teal-soft dark:bg-slate-800 rounded w-24 animate-pulse mx-auto"></div></td>
                        <td className="px-4 py-3.5"><div className="h-3.5 bg-teal-soft dark:bg-slate-800 rounded w-32 animate-pulse mx-auto"></div></td>
                      </tr>
                    ))
                  ) : currentData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-teal-muted dark:text-slate-400">
                        <FileText size={36} className="text-teal-light dark:text-slate-500 mx-auto mb-2" />
                        <p className="font-semibold text-[13px] text-primary dark:text-dark-text">Sin registros de RIPS</p>
                        <p className="text-[11px] mt-0.5">No se encontraron generaciones RIPS para los filtros seleccionados.</p>
                      </td>
                    </tr>
                  ) : (
                    currentData.map((item) => {
                      const isGenerado = item.estado === 'Generado';
                      const isObservaciones = item.estado === 'Con observaciones';
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-teal-info/40 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="px-4 py-3.5 font-medium">
                            <p className="text-[12.5px] font-semibold text-primary dark:text-dark-text">{item.periodo}</p>
                          </td>
                          <td className="px-4 py-3.5 text-teal-muted dark:text-slate-400 text-[11.5px]">
                            {item.fechaGeneracion}
                          </td>
                          <td className="px-4 py-3.5 text-right font-medium tabular-nums">
                            {item.cantidadRegistros} atenciones
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={[
                              'inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border',
                              isGenerado ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50' :
                              isObservaciones ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50' :
                              'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/50'
                            ].join(' ')}>
                              {isGenerado && <CheckCircle size={12} />}
                              {isObservaciones && <AlertTriangle size={12} />}
                              {!isGenerado && !isObservaciones && <Clock size={12} />}
                              {item.estado}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setSelectedGeneracion(item)}
                                className="flex items-center gap-1 px-3 py-1.5 text-[11.5px] font-medium text-primary dark:text-teal hover:bg-teal-soft dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer border border-teal-border dark:border-dark-border touch-target"
                                title="Ver detalle e inconsistencias"
                              >
                                <Eye size={13} /> Ver detalle
                              </button>

                              {isGenerado ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleDescargar(item.id, 'json')}
                                    className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-white bg-primary dark:bg-teal dark:text-slate-900 rounded-lg hover:opacity-90 transition-opacity cursor-pointer shadow-soft-sm touch-target"
                                    title="Descargar JSON"
                                  >
                                    <Download size={12} /> JSON
                                  </button>
                                  <button
                                    onClick={() => handleDescargar(item.id, 'csv')}
                                    className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-primary dark:text-teal border border-teal-border dark:border-dark-border bg-white dark:bg-dark-input rounded-lg hover:bg-teal-soft dark:hover:bg-slate-800 transition-colors cursor-pointer touch-target"
                                    title="Descargar CSV"
                                  >
                                    <Download size={12} /> CSV
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setGenerarModal(item)}
                                  className="flex items-center gap-1 px-3 py-1.5 text-[11.5px] font-medium text-white bg-primary dark:bg-teal dark:text-slate-900 rounded-lg hover:opacity-90 transition-opacity cursor-pointer shadow-soft-sm touch-target"
                                >
                                  <Download size={12} /> Generar RIPS
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {totalItems > 0 && !loading && (
              <div className="px-4 py-3 bg-teal-panel/40 dark:bg-slate-800/40 border-t border-teal-soft dark:border-dark-border flex items-center justify-between text-[11.5px] text-teal-muted dark:text-slate-400">
                <div>
                  Mostrando <strong className="text-primary dark:text-dark-text">{startIndex + 1}</strong> a <strong className="text-primary dark:text-dark-text">{endIndex}</strong> de <strong className="text-primary dark:text-dark-text">{totalItems}</strong> períodos
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-teal-border dark:border-dark-border bg-white dark:bg-dark-input text-primary dark:text-dark-text disabled:opacity-40 disabled:cursor-not-allowed hover:bg-teal-soft dark:hover:bg-slate-700 cursor-pointer touch-target"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="px-2 font-medium">Página {currentPage} de {totalPages}</span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-teal-border dark:border-dark-border bg-white dark:bg-dark-input text-primary dark:text-dark-text disabled:opacity-40 disabled:cursor-not-allowed hover:bg-teal-soft dark:hover:bg-slate-700 cursor-pointer touch-target"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── MODAL VISTA DE DETALLE (RESUMEN E INCONSISTENCIAS) ──────────────── */}
      {selectedGeneracion && (
        <div
          className="fixed inset-0 bg-primary/40 dark:bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in"
          onClick={(e) => e.target === e.currentTarget && setSelectedGeneracion(null)}
        >
          <div className="bg-white dark:bg-dark-card rounded-t-2xl sm:rounded-2xl w-full max-w-lg shadow-soft-lg border border-teal-border dark:border-dark-border flex flex-col max-h-[88vh] overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-teal-soft dark:border-dark-border bg-primary dark:bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <FileBarChart size={16} className="text-teal-light" />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-white">Detalle del período RIPS</h3>
                  <p className="text-[11px] text-teal-light dark:text-slate-400 mt-0.5">{selectedGeneracion.periodo}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedGeneracion(null)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer touch-target flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1 bg-white dark:bg-dark-card text-primary dark:text-dark-text">
              {/* Tarjeta Resumen */}
              <div className="bg-teal-panel dark:bg-slate-800/60 border border-teal-border dark:border-dark-border rounded-xl p-4 space-y-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.7px] text-teal-muted dark:text-slate-400 flex items-center gap-1.5">
                  <FileText size={13} /> Resumen de atención
                </h4>
                <div className="grid grid-cols-2 gap-3 pt-1 text-[12px]">
                  <div className="flex items-center gap-2">
                    <Users size={15} className="text-teal-muted dark:text-slate-400" />
                    <div>
                      <span className="text-[10.5px] text-teal-muted dark:text-slate-400 block">Pacientes atendidos</span>
                      <span className="font-semibold text-primary dark:text-dark-text">{selectedGeneracion.pacientesCount} pacientes</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Stethoscope size={15} className="text-teal-muted dark:text-slate-400" />
                    <div>
                      <span className="text-[10.5px] text-teal-muted dark:text-slate-400 block">Procedimientos</span>
                      <span className="font-semibold text-primary dark:text-dark-text">{selectedGeneracion.procedimientosCount} procedimientos</span>
                    </div>
                  </div>

                  <div className="col-span-2 pt-2 border-t border-teal-border/50 dark:border-dark-border">
                    <span className="text-[10.5px] text-teal-muted dark:text-slate-400 block">Profesionales incluidos</span>
                    <span className="font-medium text-primary dark:text-dark-text">{selectedGeneracion.profesionales}</span>
                  </div>
                </div>
              </div>

              {/* Sección de Inconsistencias */}
              <div>
                <h4 className="text-[12px] font-semibold text-primary dark:text-dark-text mb-2 flex items-center gap-1.5">
                  <AlertTriangle size={15} className={selectedGeneracion.inconsistencias.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"} />
                  Validación de Inconsistencias ({selectedGeneracion.inconsistencias.length})
                </h4>

                {selectedGeneracion.inconsistencias.length === 0 ? (
                  <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-[12px]">
                    <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <span>No se detectaron inconsistencias. Los registros están listos para generación de RIPS.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-lg p-3">
                      ⚠️ Es necesario corregir las siguientes observaciones antes de procesar el RIPS definitivo:
                    </p>
                    <ul className="space-y-2">
                      {selectedGeneracion.inconsistencias.map((inc, i) => (
                        <li key={i} className="p-3 bg-red-50/60 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg text-[11.5px] text-status-red dark:text-red-300 flex items-start gap-2">
                          <AlertCircle size={15} className="flex-shrink-0 mt-0.5 text-status-red dark:text-red-400" />
                          <span>{inc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 border-t border-teal-soft dark:border-dark-border bg-teal-panel/40 dark:bg-slate-800/40 flex justify-end items-center gap-2 flex-shrink-0">
              {selectedGeneracion.estado === 'Generado' && (
                <div className="flex items-center gap-2 mr-auto">
                  <button
                    onClick={() => handleDescargar(selectedGeneracion.id, 'json')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-medium text-white bg-primary dark:bg-teal dark:text-slate-900 rounded-lg hover:opacity-90 transition-opacity cursor-pointer shadow-soft-sm touch-target"
                  >
                    <Download size={13} /> JSON
                  </button>
                  <button
                    onClick={() => handleDescargar(selectedGeneracion.id, 'csv')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-medium text-primary dark:text-teal border border-teal-border dark:border-dark-border bg-white dark:bg-dark-input rounded-lg hover:bg-teal-soft dark:hover:bg-slate-700 transition-colors cursor-pointer touch-target"
                  >
                    <Download size={13} /> CSV
                  </button>
                </div>
              )}
              <button
                onClick={() => setSelectedGeneracion(null)}
                className="px-4 py-2 text-[12px] text-primary dark:text-slate-300 font-medium rounded-lg border border-teal-border dark:border-dark-border bg-white dark:bg-dark-input hover:bg-teal-soft dark:hover:bg-slate-700 cursor-pointer touch-target"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL GENERACIÓN RIPS CON VALIDACIÓN DE INCONSISTENCIAS ───────── */}
      {generarModal && (
        <div
          className="fixed inset-0 bg-primary/40 dark:bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in"
          onClick={(e) => e.target === e.currentTarget && setGenerarModal(null)}
        >
          <div className="bg-white dark:bg-dark-card rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-soft-lg border border-teal-border dark:border-dark-border p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary dark:text-teal">
                <Download size={18} />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-primary dark:text-dark-text">Generar archivo RIPS</h3>
                <p className="text-[11px] text-teal-muted dark:text-slate-400 mt-0.5">Confirmación de procesamiento</p>
              </div>
            </div>

            <div className="space-y-3 mb-5 text-[12px]">
              <div className="p-3.5 bg-teal-panel dark:bg-slate-800/60 border border-teal-border dark:border-dark-border rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-teal-muted dark:text-slate-400">Período:</span>
                  <span className="font-semibold text-primary dark:text-dark-text">{generarModal.periodo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-teal-muted dark:text-slate-400">Cantidad de registros:</span>
                  <span className="font-semibold text-primary dark:text-dark-text">{generarModal.cantidadRegistros} atenciones</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-teal-muted dark:text-slate-400">Inconsistencias detectadas:</span>
                  <span className={`font-bold ${generarModal.inconsistencias.length > 0 ? 'text-status-red dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {generarModal.inconsistencias.length} observaciones
                  </span>
                </div>
              </div>

              {generarModal.inconsistencias.length > 0 ? (
                <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-status-red dark:text-red-400 text-[11.5px] flex items-start gap-2">
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Generación bloqueada</p>
                    <p className="mt-0.5">Existen {generarModal.inconsistencias.length} inconsistencias que deben corregirse primero en la historia clínica o catálogo de procedimientos.</p>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-teal-muted dark:text-slate-400">
                  Los datos cumplen con las validaciones básicas de estructura. Al hacer clic en "Generar" se procesará la descarga del paquete RIPS.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-teal-soft dark:border-dark-border">
              <button
                type="button"
                onClick={() => setGenerarModal(null)}
                className="px-4 py-2 text-[12px] text-primary dark:text-slate-300 font-medium rounded-lg border border-teal-border dark:border-dark-border bg-white dark:bg-dark-input hover:bg-teal-soft dark:hover:bg-slate-700 cursor-pointer touch-target"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmGenerar}
                disabled={generarModal.inconsistencias.length > 0}
                className="flex items-center gap-1.5 px-4 py-2 text-[12px] text-white font-medium bg-primary dark:bg-teal dark:text-slate-900 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer touch-target shadow-soft-sm"
              >
                <Download size={14} /> Generar
              </button>
            </div>
          </div>
        </div>
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

