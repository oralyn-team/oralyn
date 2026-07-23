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

// Datos simulados de Generaciones RIPS por periodo
const GENERACIONES_RIPS_MOCK = [
  {
    id: 1,
    periodo: 'Junio 2025 (01/06/2025 - 30/06/2025)',
    fechaInicial: '2025-06-01',
    fechaFinal: '2025-06-30',
    fechaGeneracion: '02/07/2025 10:30 AM',
    cantidadRegistros: 42,
    pacientesCount: 28,
    procedimientosCount: 42,
    profesionales: 'Dra. Ana López, Dr. Carlos Ruiz',
    estado: 'Generado',
    inconsistencias: []
  },
  {
    id: 2,
    periodo: 'Julio 2025 (01/07/2025 - 15/07/2025)',
    fechaInicial: '2025-07-01',
    fechaFinal: '2025-07-15',
    fechaGeneracion: '—',
    cantidadRegistros: 25,
    pacientesCount: 18,
    procedimientosCount: 25,
    profesionales: 'Dra. Ana López, Dr. Carlos Ruiz',
    estado: 'Con observaciones',
    inconsistencias: [
      'Diagnóstico CIE-10 faltante en atención #104 (Paciente: Juan Pérez)',
      'Procedimiento sin configurar en el catálogo del consultorio en atención #108 (CUPS 890206)',
      'Finalidad de la consulta no especificada en atención #112 (Paciente: María Rodríguez)'
    ]
  },
  {
    id: 3,
    periodo: 'Mayo 2025 (01/05/2025 - 31/05/2025)',
    fechaInicial: '2025-05-01',
    fechaFinal: '2025-05-31',
    fechaGeneracion: '02/06/2025 04:15 PM',
    cantidadRegistros: 38,
    pacientesCount: 24,
    procedimientosCount: 38,
    profesionales: 'Dra. Ana López',
    estado: 'Generado',
    inconsistencias: []
  },
  {
    id: 4,
    periodo: 'Abril 2025 (01/04/2025 - 30/04/2025)',
    fechaInicial: '2025-04-01',
    fechaFinal: '2025-04-30',
    fechaGeneracion: '—',
    cantidadRegistros: 15,
    pacientesCount: 10,
    procedimientosCount: 15,
    profesionales: 'Dr. Carlos Ruiz',
    estado: 'Pendiente',
    inconsistencias: []
  }
];

export default function Rips() {
  const { pacientes } = useApp();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [toast, setToast] = useState(null);

  // Filters
  const [fechaInicial, setFechaInicial] = useState('');
  const [fechaFinal, setFechaFinal] = useState('');
  const [profesional, setProfesional] = useState('Todos');
  const [estadoFilter, setEstadoFilter] = useState('Todos');

  // Modals / Panels
  const [selectedGeneracion, setSelectedGeneracion] = useState(null); // Para modal de detalle
  const [generarModal, setGenerarModal] = useState(null); // Para modal de generación RIPS

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    // Carga inicial simulada
    setTimeout(() => {
      setData(GENERACIONES_RIPS_MOCK);
      setLoading(false);
    }, 500);
  }, []);

  const handleBuscar = () => {
    setLoading(true);
    setTimeout(() => {
      let filtered = GENERACIONES_RIPS_MOCK;

      if (fechaInicial) {
        filtered = filtered.filter(item => item.fechaInicial >= fechaInicial);
      }
      if (fechaFinal) {
        filtered = filtered.filter(item => item.fechaFinal <= fechaFinal);
      }
      if (profesional !== 'Todos') {
        filtered = filtered.filter(item => item.profesionales.includes(profesional));
      }
      if (estadoFilter !== 'Todos') {
        filtered = filtered.filter(item => item.estado === estadoFilter);
      }

      setData(filtered);
      setCurrentPage(1);
      setLoading(false);
    }, 350);
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const confirmGenerar = () => {
    if (!generarModal) return;
    if (generarModal.inconsistencias.length > 0) return;

    setGenerarModal(null);
    showToast('Archivo RIPS generado exitosamente (Simulación)');
  };

  // Indicadores de resumen
  const statsSummary = useMemo(() => {
    const listos = data.filter(item => item.estado === 'Generado' || (item.inconsistencias.length === 0 && item.estado === 'Pendiente')).reduce((acc, curr) => acc + curr.cantidadRegistros, 0);
    const conInconsistencias = data.filter(item => item.inconsistencias.length > 0).reduce((acc, curr) => acc + curr.inconsistencias.length, 0);
    const pendientes = data.filter(item => item.estado === 'Pendiente').reduce((acc, curr) => acc + curr.cantidadRegistros, 0);
    return { listos, conInconsistencias, pendientes };
  }, [data]);

  // Lista única de profesionales
  const profesionalesList = useMemo(() => {
    return ['Todos', 'Dra. Ana López', 'Dr. Carlos Ruiz'];
  }, []);

  // Lógica de paginación
  const totalItems = data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentData = data.slice(startIndex, endIndex);

  return (
    <div className="flex min-h-screen bg-teal-bg font-sans relative">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar pacientes={pacientes} />

        <main className="flex-1 overflow-y-auto px-6 py-5">
          {/* Encabezado */}
          <div className="mb-5">
            <h2 className="text-[15px] font-medium text-primary flex items-center gap-2">
              <FileBarChart size={18} className="text-teal" /> Módulo de RIPS
            </h2>
            <p className="text-[11px] text-teal mt-0.5">
              Consulte registros de prestación de servicios, valide inconsistencias y genere archivos RIPS.
            </p>
          </div>

          {/* Tarjeta de Resumen Indicadores */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-white border border-teal-border rounded-xl p-4 flex items-center gap-3.5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <CheckCircle size={20} />
              </div>
              <div>
                <p className="text-[20px] font-bold text-primary leading-none">{statsSummary.listos}</p>
                <p className="text-[11px] text-teal-muted mt-1 font-medium">Registros listos</p>
              </div>
            </div>

            <div className="bg-white border border-teal-border rounded-xl p-4 flex items-center gap-3.5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <p className="text-[20px] font-bold text-primary leading-none">{statsSummary.conInconsistencias}</p>
                <p className="text-[11px] text-teal-muted mt-1 font-medium">Inconsistencias detectadas</p>
              </div>
            </div>

            <div className="bg-white border border-teal-border rounded-xl p-4 flex items-center gap-3.5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-[20px] font-bold text-primary leading-none">{statsSummary.pendientes}</p>
                <p className="text-[11px] text-teal-muted mt-1 font-medium">Pendientes por completar</p>
              </div>
            </div>
          </div>

          {/* Tarjeta de Filtros */}
          <div className="bg-white border border-teal-border rounded-xl p-5 shadow-sm mb-5">
            <div className="flex items-center gap-2 mb-4">
              <Filter size={15} className="text-teal" />
              <h3 className="text-[13px] font-semibold text-primary">Filtros de búsqueda</h3>
            </div>

            <div className="grid grid-cols-5 gap-4 items-end">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-teal-muted font-medium">Fecha inicial</label>
                <div className="relative">
                  <CalendarDays size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-teal-muted" />
                  <input
                    type="date"
                    value={fechaInicial}
                    onChange={(e) => setFechaInicial(e.target.value)}
                    className="w-full text-[12px] bg-white border border-teal-border rounded-lg pl-8 pr-3 py-2 outline-none focus:border-teal text-primary"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-teal-muted font-medium">Fecha final</label>
                <div className="relative">
                  <CalendarDays size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-teal-muted" />
                  <input
                    type="date"
                    value={fechaFinal}
                    onChange={(e) => setFechaFinal(e.target.value)}
                    className="w-full text-[12px] bg-white border border-teal-border rounded-lg pl-8 pr-3 py-2 outline-none focus:border-teal text-primary"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-teal-muted font-medium">Profesional</label>
                <div className="relative">
                  <User size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-teal-muted" />
                  <select
                    value={profesional}
                    onChange={(e) => setProfesional(e.target.value)}
                    className="w-full text-[12px] bg-white border border-teal-border rounded-lg pl-8 pr-3 py-2 outline-none focus:border-teal text-primary appearance-none"
                  >
                    {profesionalesList.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-teal-muted font-medium">Estado</label>
                <div className="relative">
                  <Filter size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-teal-muted" />
                  <select
                    value={estadoFilter}
                    onChange={(e) => setEstadoFilter(e.target.value)}
                    className="w-full text-[12px] bg-white border border-teal-border rounded-lg pl-8 pr-3 py-2 outline-none focus:border-teal text-primary appearance-none"
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
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-[12px] text-white font-medium bg-primary rounded-lg border-none cursor-pointer hover:bg-primary-light transition-colors disabled:opacity-70"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                  Buscar
                </button>
              </div>
            </div>
          </div>

          {/* Área de Tabla de Generaciones */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-medium text-teal-muted">
              {loading ? 'Buscando generaciones...' : `Mostrando ${totalItems} períodos de RIPS`}
            </span>
          </div>

          {/* Tabla de Generaciones RIPS */}
          <div className="bg-white border border-teal-border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-teal-bg border-b border-teal-border text-[10.5px] font-semibold text-teal-muted uppercase tracking-[0.7px]">
                  <tr>
                    <th className="px-4 py-3 whitespace-nowrap">Período</th>
                    <th className="px-4 py-3 whitespace-nowrap">Fecha de generación</th>
                    <th className="px-4 py-3 whitespace-nowrap text-right">Cantidad de registros</th>
                    <th className="px-4 py-3 whitespace-nowrap text-center">Estado</th>
                    <th className="px-4 py-3 whitespace-nowrap text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="text-[12px] text-primary">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-teal-bg/30'}>
                        <td className="px-4 py-3.5"><div className="h-3.5 bg-teal-soft rounded w-48 animate-pulse"></div></td>
                        <td className="px-4 py-3.5"><div className="h-3.5 bg-teal-soft rounded w-28 animate-pulse"></div></td>
                        <td className="px-4 py-3.5"><div className="h-3.5 bg-teal-soft rounded w-16 animate-pulse ml-auto"></div></td>
                        <td className="px-4 py-3.5"><div className="h-3.5 bg-teal-soft rounded w-24 animate-pulse mx-auto"></div></td>
                        <td className="px-4 py-3.5"><div className="h-3.5 bg-teal-soft rounded w-32 animate-pulse mx-auto"></div></td>
                      </tr>
                    ))
                  ) : currentData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-teal-muted">
                        <FileText size={32} className="text-teal-border mx-auto mb-2" />
                        <p className="font-medium text-[13px] text-primary">Sin registros de RIPS</p>
                        <p className="text-[11px] mt-0.5">No se encontraron generaciones RIPS para los filtros seleccionados.</p>
                      </td>
                    </tr>
                  ) : (
                    currentData.map((item, idx) => {
                      const isGenerado = item.estado === 'Generado';
                      const isObservaciones = item.estado === 'Con observaciones';
                      return (
                        <tr
                          key={item.id}
                          className={[
                            'border-b border-teal-soft/60 transition-colors',
                            idx % 2 === 0 ? 'bg-white' : 'bg-teal-bg/30',
                            'hover:bg-primary/[0.03]',
                          ].join(' ')}
                        >
                          <td className="px-4 py-3.5 font-medium">
                            <p className="text-[12.5px] font-semibold text-primary">{item.periodo}</p>
                          </td>
                          <td className="px-4 py-3.5 text-teal-muted text-[11.5px]">
                            {item.fechaGeneracion}
                          </td>
                          <td className="px-4 py-3.5 text-right font-medium tabular-nums">
                            {item.cantidadRegistros} atenciones
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={[
                              'inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full border',
                              isGenerado ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              isObservaciones ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-blue-50 text-blue-700 border-blue-200'
                            ].join(' ')}>
                              {isGenerado && <CheckCircle size={11} />}
                              {isObservaciones && <AlertTriangle size={11} />}
                              {!isGenerado && !isObservaciones && <Clock size={11} />}
                              {item.estado}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setSelectedGeneracion(item)}
                                className="flex items-center gap-1 px-2.5 py-1 text-[11.5px] font-medium text-teal-muted hover:text-primary hover:bg-teal-soft/60 rounded-lg transition-colors cursor-pointer border border-teal-border"
                                title="Ver detalle e inconsistencias"
                              >
                                <Eye size={13} /> Ver detalle
                              </button>

                              <button
                                onClick={() => setGenerarModal(item)}
                                className="flex items-center gap-1 px-3 py-1 text-[11.5px] font-medium text-white bg-primary rounded-lg hover:bg-primary-light transition-colors cursor-pointer shadow-sm"
                              >
                                <Download size={12} /> Generar RIPS
                              </button>
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
              <div className="px-4 py-3 bg-teal-bg/40 border-t border-teal-border flex items-center justify-between text-[11.5px] text-teal-muted">
                <div>
                  Mostrando <strong className="text-primary">{startIndex + 1}</strong> a <strong className="text-primary">{endIndex}</strong> de <strong className="text-primary">{totalItems}</strong> períodos
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1 rounded-lg border border-teal-border bg-white text-primary disabled:opacity-40 disabled:cursor-not-allowed hover:bg-teal-bg"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="px-2 font-medium">Página {currentPage} de {totalPages}</span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1 rounded-lg border border-teal-border bg-white text-primary disabled:opacity-40 disabled:cursor-not-allowed hover:bg-teal-bg"
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
          className="fixed inset-0 bg-primary/45 backdrop-blur-[2px] flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setSelectedGeneracion(null)}
        >
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-teal-border flex flex-col max-h-[85vh] overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-teal-soft flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileBarChart size={16} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-primary">Detalle del período RIPS</h3>
                  <p className="text-[11px] text-teal-muted mt-0.5">{selectedGeneracion.periodo}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedGeneracion(null)}
                className="text-teal-muted hover:text-primary p-1 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Tarjeta Resumen */}
              <div className="bg-teal-bg/60 border border-teal-border rounded-xl p-4 space-y-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.7px] text-teal-muted flex items-center gap-1.5">
                  <FileText size={12} /> Resumen de atención
                </h4>
                <div className="grid grid-cols-2 gap-3 pt-1 text-[12px]">
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-teal-muted" />
                    <div>
                      <span className="text-[10.5px] text-teal-muted block">Pacientes atendidos</span>
                      <span className="font-semibold text-primary">{selectedGeneracion.pacientesCount} pacientes</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Stethoscope size={14} className="text-teal-muted" />
                    <div>
                      <span className="text-[10.5px] text-teal-muted block">Procedimientos</span>
                      <span className="font-semibold text-primary">{selectedGeneracion.procedimientosCount} procedimientos</span>
                    </div>
                  </div>

                  <div className="col-span-2 pt-2 border-t border-teal-border/50">
                    <span className="text-[10.5px] text-teal-muted block">Profesionales incluidos</span>
                    <span className="font-medium text-primary">{selectedGeneracion.profesionales}</span>
                  </div>
                </div>
              </div>

              {/* Sección de Inconsistencias */}
              <div>
                <h4 className="text-[12px] font-semibold text-primary mb-2 flex items-center gap-1.5">
                  <AlertTriangle size={14} className={selectedGeneracion.inconsistencias.length > 0 ? "text-amber-600" : "text-emerald-600"} />
                  Validación de Inconsistencias ({selectedGeneracion.inconsistencias.length})
                </h4>

                {selectedGeneracion.inconsistencias.length === 0 ? (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-[12px]">
                    <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
                    <span>No se detectaron inconsistencias. Los registros están listos para generación de RIPS.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                      ⚠️ Es necesario corregir las siguientes observaciones antes de procesar el RIPS definitivo:
                    </p>
                    <ul className="space-y-2">
                      {selectedGeneracion.inconsistencias.map((inc, i) => (
                        <li key={i} className="p-2.5 bg-red-50/60 border border-red-200 rounded-lg text-[11.5px] text-status-red flex items-start gap-2">
                          <AlertCircle size={14} className="flex-shrink-0 mt-0.5 text-status-red" />
                          <span>{inc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-teal-soft flex justify-end gap-2">
              <button
                onClick={() => setSelectedGeneracion(null)}
                className="px-4 py-2 text-[12px] text-teal-muted font-medium rounded-lg border border-teal-border bg-white hover:bg-teal-bg cursor-pointer"
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
          className="fixed inset-0 bg-primary/45 backdrop-blur-[2px] flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setGenerarModal(null)}
        >
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-teal-border p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Download size={18} className="text-primary" />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-primary">Generar archivo RIPS</h3>
                <p className="text-[11px] text-teal-muted mt-0.5">Confirmación de procesamiento</p>
              </div>
            </div>

            <div className="space-y-3 mb-5 text-[12px]">
              <div className="p-3 bg-teal-bg/60 border border-teal-border rounded-xl space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-teal-muted">Período:</span>
                  <span className="font-semibold text-primary">{generarModal.periodo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-teal-muted">Cantidad de registros:</span>
                  <span className="font-semibold text-primary">{generarModal.cantidadRegistros} atenciones</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-teal-muted">Inconsistencias detectadas:</span>
                  <span className={`font-bold ${generarModal.inconsistencias.length > 0 ? 'text-status-red' : 'text-emerald-600'}`}>
                    {generarModal.inconsistencias.length} observaciones
                  </span>
                </div>
              </div>

              {generarModal.inconsistencias.length > 0 ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-status-red text-[11.5px] flex items-start gap-2">
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Generación bloqueada</p>
                    <p className="mt-0.5">Existen {generarModal.inconsistencias.length} inconsistencias que deben corregirse primero en la historia clínica o catálogo de procedimientos.</p>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-teal-muted">
                  Los datos cumplen con las validaciones básicas de estructura. Al hacer clic en "Generar" se simulará la descarga del paquete RIPS.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-teal-soft">
              <button
                type="button"
                onClick={() => setGenerarModal(null)}
                className="px-4 py-2 text-[12px] text-teal-muted font-medium rounded-lg border border-teal-border bg-white hover:bg-teal-bg cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmGenerar}
                disabled={generarModal.inconsistencias.length > 0}
                className="flex items-center gap-1.5 px-4 py-2 text-[12px] text-white font-medium bg-primary rounded-lg hover:bg-primary-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Download size={13} /> Generar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-primary text-white text-[12px] px-4 py-2 rounded-full whitespace-nowrap z-50 shadow-lg flex items-center gap-1.5 border border-white/10">
          <Check size={14} className="text-teal" /> {toast}
        </div>
      )}
    </div>
  );
}
