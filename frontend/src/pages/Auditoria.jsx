import { useState, useEffect } from 'react';
import {
  ShieldCheck, Search, Filter, Calendar, RefreshCw, Eye, X,
  CheckCircle2, XCircle, Building2, User, Activity, ArrowRight
} from 'lucide-react';
import { api } from '../api';
import { useApp } from '../context/Appcontext';
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';
import { ROLES, ROLE_LABELS } from '../utils/rbac';

export default function Auditoria() {
  const { usuario } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [consultorios, setConsultorios] = useState([]);

  // Filtros
  const [filtros, setFiltros] = useState({
    consultorio_id: '',
    rol: '',
    modulo: '',
    accion: '',
    estado: '',
    fecha_inicio: '',
    fecha_fin: '',
    busqueda: '',
    page: 1,
    limit: 20
  });

  // Modal Detalle
  const [selectedLog, setSelectedLog] = useState(null);

  // Cargar consultorios para el filtro si es SUPERADMIN
  useEffect(() => {
    if (usuario?.rol === ROLES.SUPERADMIN) {
      api.getConsultorios()
        .then(setConsultorios)
        .catch(() => {});
    }
  }, [usuario]);

  // Cargar logs de auditoría
  const cargarAuditoria = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAuditoria(filtros);
      setLogs(res.data || []);
      setMeta(res.meta || { total: 0, page: 1, limit: 20, totalPages: 1 });
    } catch (err) {
      console.error('Error al cargar auditoría:', err);
      setError(err.error || 'No se pudieron cargar los registros de auditoría');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarAuditoria();
  }, [filtros.page, filtros.consultorio_id, filtros.rol, filtros.estado]);

  const handleBuscarSubmit = (e) => {
    e.preventDefault();
    setFiltros(prev => ({ ...prev, page: 1 }));
    cargarAuditoria();
  };

  const handleLimpiarFiltros = () => {
    setFiltros({
      consultorio_id: '',
      rol: '',
      modulo: '',
      accion: '',
      estado: '',
      fecha_inicio: '',
      fecha_fin: '',
      busqueda: '',
      page: 1,
      limit: 20
    });
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} title="Registro de Auditoría" />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
          {/* Header vista */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-7 h-7 text-primary dark:text-teal" />
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Auditoria del Sistema</h1>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {usuario?.rol === ROLES.SUPERADMIN
                  ? 'Registro inmutable global de acciones, seguridad y eventos de la plataforma'
                  : 'Trazabilidad e historial inmutable de acciones en su consultorio'}
              </p>
            </div>
            <button
              onClick={cargarAuditoria}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>
          </div>

          {/* Barra de Filtros */}
          <form onSubmit={handleBuscarSubmit} className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-soft border border-slate-200/80 dark:border-slate-800 mb-6 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {/* Buscador textual */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar en auditoría..."
                  value={filtros.busqueda}
                  onChange={e => setFiltros(prev => ({ ...prev, busqueda: e.target.value }))}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>

              {/* Filtro Consultorio (SUPERADMIN) */}
              {usuario?.rol === ROLES.SUPERADMIN && (
                <div>
                  <select
                    value={filtros.consultorio_id}
                    onChange={e => setFiltros(prev => ({ ...prev, consultorio_id: e.target.value, page: 1 }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option value="">Todos los consultorios</option>
                    {consultorios.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre_consultorio}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Filtro Rol */}
              <div>
                <select
                  value={filtros.rol}
                  onChange={e => setFiltros(prev => ({ ...prev, rol: e.target.value, page: 1 }))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="">Todos los roles</option>
                  {Object.entries(ROLE_LABELS).map(([rKey, rLabel]) => (
                    <option key={rKey} value={rKey}>{rLabel}</option>
                  ))}
                </select>
              </div>

              {/* Filtro Estado */}
              <div>
                <select
                  value={filtros.estado}
                  onChange={e => setFiltros(prev => ({ ...prev, estado: e.target.value, page: 1 }))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="">Todos los estados</option>
                  <option value="EXITOSO">Exitoso</option>
                  <option value="FALLIDO">Fallido</option>
                </select>
              </div>

              {/* Rango de fechas */}
              <div className="flex gap-1">
                <input
                  type="date"
                  value={filtros.fecha_inicio}
                  onChange={e => setFiltros(prev => ({ ...prev, fecha_inicio: e.target.value }))}
                  className="w-1/2 px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none"
                  title="Fecha inicio"
                />
                <input
                  type="date"
                  value={filtros.fecha_fin}
                  onChange={e => setFiltros(prev => ({ ...prev, fecha_fin: e.target.value }))}
                  className="w-1/2 px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none"
                  title="Fecha fin"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleLimpiarFiltros}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
              >
                Limpiar Filtros
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-xs font-medium transition-colors cursor-pointer shadow-xs"
              >
                Aplicar Filtro
              </button>
            </div>
          </form>

          {/* Error display */}
          {error && (
            <div className="p-4 mb-6 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Tabla de registros de auditoría */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-soft border border-slate-200/80 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Fecha y Hora</th>
                    <th className="px-4 py-3">Usuario</th>
                    <th className="px-4 py-3">Rol</th>
                    <th className="px-4 py-3">Módulo</th>
                    <th className="px-4 py-3">Acción</th>
                    <th className="px-4 py-3">Registro / Registro ID</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    {usuario?.rol === ROLES.SUPERADMIN && <th className="px-4 py-3">Consultorio</th>}
                    <th className="px-4 py-3 text-right">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={usuario?.rol === ROLES.SUPERADMIN ? 9 : 8} className="py-12 text-center text-slate-400">
                        Cargando registros de auditoría...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={usuario?.rol === ROLES.SUPERADMIN ? 9 : 8} className="py-12 text-center text-slate-400">
                        No se encontraron registros de auditoría con los criterios seleccionados.
                      </td>
                    </tr>
                  ) : (
                    logs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {new Date(log.creado_en).toLocaleString('es-CO')}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                          {log.usuario_nombre || 'Sistema'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {ROLE_LABELS[log.usuario_rol] || log.usuario_rol || 'Sistema'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                          {log.modulo}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                          {log.accion}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {log.recurso_id ? `#${log.recurso_id}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            log.estado === 'EXITOSO'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                          }`}>
                            {log.estado === 'EXITOSO' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                            {log.estado}
                          </span>
                        </td>
                        {usuario?.rol === ROLES.SUPERADMIN && (
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400 truncate max-w-[150px]">
                            {log.consultorio?.nombre_consultorio || 'Plataforma'}
                          </td>
                        )}
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="p-1 text-slate-400 hover:text-primary dark:hover:text-teal transition-colors cursor-pointer"
                            title="Ver detalle"
                          >
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginador */}
            {meta.totalPages > 1 && (
              <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Mostrando página {meta.page} de {meta.totalPages} ({meta.total} registros totales)
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={meta.page <= 1}
                    onClick={() => setFiltros(prev => ({ ...prev, page: prev.page - 1 }))}
                    className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs disabled:opacity-50 cursor-pointer"
                  >
                    Anterior
                  </button>
                  <button
                    disabled={meta.page >= meta.totalPages}
                    onClick={() => setFiltros(prev => ({ ...prev, page: prev.page + 1 }))}
                    className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs disabled:opacity-50 cursor-pointer"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal de Detalle de Auditoría */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary dark:text-teal" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Detalle de Evento de Auditoría</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                <div>
                  <span className="text-slate-400 block font-medium">Fecha y Hora</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {new Date(selectedLog.creado_en).toLocaleString('es-CO')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Estado</span>
                  <span className={`font-semibold ${selectedLog.estado === 'EXITOSO' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {selectedLog.estado}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Usuario</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedLog.usuario_nombre || 'Sistema'} ({ROLE_LABELS[selectedLog.usuario_rol] || selectedLog.usuario_rol || 'Sistema'})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Módulo y Acción</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedLog.modulo} — {selectedLog.accion}
                  </span>
                </div>
                {selectedLog.consultorio && (
                  <div className="col-span-2">
                    <span className="text-slate-400 block font-medium">Consultorio</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedLog.consultorio.nombre_consultorio}
                    </span>
                  </div>
                )}
                {selectedLog.ip_address && (
                  <div>
                    <span className="text-slate-400 block font-medium">Dirección IP</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{selectedLog.ip_address}</span>
                  </div>
                )}
                {selectedLog.user_agent && (
                  <div className="col-span-2">
                    <span className="text-slate-400 block font-medium">User Agent</span>
                    <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400 break-all">{selectedLog.user_agent}</span>
                  </div>
                )}
              </div>

              <div>
                <span className="text-slate-400 block font-medium mb-1">Detalles de la Acción</span>
                <p className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-800 dark:text-slate-200 font-medium">
                  {selectedLog.detalles || 'Sin descripción detallada'}
                </p>
              </div>

              {/* Comparación de cambios Antes -> Después */}
              {selectedLog.metadata?.cambios && Array.isArray(selectedLog.metadata.cambios) && selectedLog.metadata.cambios.length > 0 && (
                <div>
                  <span className="text-slate-800 dark:text-white font-bold block mb-2 text-sm">
                    Modificaciones de Campos (Antes → Después)
                  </span>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                        <tr>
                          <th className="p-2.5">Campo</th>
                          <th className="p-2.5">Valor Anterior</th>
                          <th className="p-2.5">Valor Nuevo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {selectedLog.metadata.cambios.map((c, i) => (
                          <tr key={i}>
                            <td className="p-2.5 font-semibold text-slate-700 dark:text-slate-300">{c.campo}</td>
                            <td className="p-2.5 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20 font-mono text-[11px]">
                              {String(c.oldValue ?? 'vacio')}
                            </td>
                            <td className="p-2.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 font-mono text-[11px]">
                              {String(c.newValue ?? 'vacio')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-right">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium text-xs cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
