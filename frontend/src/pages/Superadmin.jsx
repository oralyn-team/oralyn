import { useState, useEffect } from 'react';
import {
  Building2, Users, UserCheck, ShieldCheck, Plus, RefreshCw, X,
  CheckCircle2, XCircle, Activity, Globe, Lock, ShieldAlert
} from 'lucide-react';
import { api } from '../api';
import { useApp } from '../context/Appcontext';
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';
import { ROLES } from '../utils/rbac';

export default function Superadmin() {
  const { usuario } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [consultorios, setConsultorios] = useState([]);
  const [stats, setStats] = useState({ totalConsultorios: 0, totalUsuarios: 0, totalPacientes: 0, totalCitas: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalCrearOpen, setModalCrearOpen] = useState(false);
  const [creando, setCreando] = useState(false);

  // Formulario nuevo consultorio
  const [form, setForm] = useState({
    nombre_consultorio: '',
    nombre_profesional: '',
    registro_profesional: '',
    nit: '',
    direccion: '',
    telefono: '',
    ciudad: 'Villavicencio',
    email: '',
    usuario_email: '',
    usuario_password: '',
    usuario_nombre: '',
    usuario_registro: ''
  });

  const cargarDatos = async () => {
    setLoading(true);
    setError(null);
    try {
      const [listCons, statRes] = await Promise.all([
        api.getConsultorios(),
        api.getAdminStats()
      ]);
      setConsultorios(listCons || []);
      setStats(statRes || { totalConsultorios: 0, totalUsuarios: 0, totalPacientes: 0, totalCitas: 0 });
    } catch (err) {
      console.error('Error al cargar panel de superadmin:', err);
      setError(err.error || 'Error al cargar los consultorios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleCrearConsultorio = async (e) => {
    e.preventDefault();
    setCreando(true);
    try {
      await api.crearConsultorio(form);
      setModalCrearOpen(false);
      setForm({
        nombre_consultorio: '',
        nombre_profesional: '',
        registro_profesional: '',
        nit: '',
        direccion: '',
        telefono: '',
        ciudad: 'Villavicencio',
        email: '',
        usuario_email: '',
        usuario_password: '',
        usuario_nombre: '',
        usuario_registro: ''
      });
      await cargarDatos();
    } catch (err) {
      alert(err.error || 'Error al crear consultorio');
    } finally {
      setCreando(false);
    }
  };

  const handleToggleStatus = async (id, activoActual) => {
    if (!confirm(`¿Está seguro de ${activoActual ? 'desactivar' : 'activar'} este consultorio?`)) return;
    try {
      await api.toggleConsultorioStatus(id, !activoActual);
      await cargarDatos();
    } catch (err) {
      alert(err.error || 'Error al cambiar estado del consultorio');
    }
  };

  if (usuario?.rol !== ROLES.SUPERADMIN) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-4">
        <div className="max-w-md text-center bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Acceso Denegado</h2>
          <p className="text-sm text-slate-400">Esta sección está reservada exclusivamente para Superadministradores de la plataforma Oralyn.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} title="Superadministración de Plataforma" />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-7 h-7 text-primary dark:text-teal" />
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Administración de Plataforma</h1>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Gestión global de consultorios, cuentas de clientes y métricas de Oralyn
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setModalCrearOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors shadow-xs cursor-pointer"
              >
                <Plus size={16} />
                <span>Nuevo Consultorio</span>
              </button>
            </div>
          </div>

          {/* Tarjetas de estadísticas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-soft flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Consultorios</span>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.totalConsultorios}</p>
              </div>
              <div className="p-3 bg-teal/10 text-teal rounded-xl">
                <Building2 size={24} />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-soft flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Usuarios Totales</span>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.totalUsuarios}</p>
              </div>
              <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
                <Users size={24} />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-soft flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pacientes Registrados</span>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.totalPacientes}</p>
              </div>
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                <UserCheck size={24} />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-soft flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Citas Totales</span>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.totalCitas}</p>
              </div>
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                <Activity size={24} />
              </div>
            </div>
          </div>

          {/* Advertencia de protección clínica */}
          <div className="p-4 mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-3">
            <Lock className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Aviso de Privacidad y Separación de Funciones</span>
              <span>Como Superadministrador de Oralyn, tienes acceso a la gestión de licencias, consultorios y auditoría técnica global. Por diseño y protección legal de los pacientes, el rol Superadmin no tiene acceso a historias clínicas ni datos sensibles de salud.</span>
            </div>
          </div>

          {/* Tabla de consultorios */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-soft border border-slate-200/80 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Consultorios de la Plataforma</h2>
              <button
                onClick={cargarDatos}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title="Refrescar"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">ID</th>
                    <th className="px-5 py-3">Consultorio</th>
                    <th className="px-5 py-3">Profesional Principal</th>
                    <th className="px-5 py-3">NIT / Registro</th>
                    <th className="px-5 py-3">Ciudad / Teléfono</th>
                    <th className="px-5 py-3 text-center">Usuarios</th>
                    <th className="px-5 py-3 text-center">Pacientes</th>
                    <th className="px-5 py-3 text-center">Estado</th>
                    <th className="px-5 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">Cargando consultorios...</td>
                    </tr>
                  ) : consultorios.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">No hay consultorios registrados aún.</td>
                    </tr>
                  ) : (
                    consultorios.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-5 py-4 font-mono font-bold text-slate-500">#{c.id}</td>
                        <td className="px-5 py-4 font-bold text-slate-900 dark:text-white text-sm">
                          {c.nombre_consultorio}
                          {c.email && <span className="block text-[11px] font-normal text-slate-400">{c.email}</span>}
                        </td>
                        <td className="px-5 py-4 font-medium text-slate-800 dark:text-slate-200">
                          {c.nombre_profesional}
                        </td>
                        <td className="px-5 py-4 font-mono text-slate-600 dark:text-slate-400">
                          {c.nit || 'Sin NIT'}
                          {c.registro_profesional && <span className="block text-[10px] text-slate-400">Reg: {c.registro_profesional}</span>}
                        </td>
                        <td className="px-5 py-4 text-slate-600 dark:text-slate-400">
                          {c.ciudad}
                          {c.telefono && <span className="block text-[11px] text-slate-400">{c.telefono}</span>}
                        </td>
                        <td className="px-5 py-4 text-center font-bold text-slate-700 dark:text-slate-300">
                          {c._count?.usuarios || 0}
                        </td>
                        <td className="px-5 py-4 text-center font-bold text-slate-700 dark:text-slate-300">
                          {c._count?.pacientes || 0}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            c.activo !== false
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                          }`}>
                            {c.activo !== false ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                            {c.activo !== false ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => handleToggleStatus(c.id, c.activo !== false)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                              c.activo !== false
                                ? 'bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:hover:bg-red-900/60 dark:text-red-400'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-400'
                            }`}
                          >
                            {c.activo !== false ? 'Desactivar' : 'Activar'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Modal Crear Consultorio */}
      {modalCrearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary dark:text-teal" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Nuevo Consultorio Odontológico</h3>
              </div>
              <button
                onClick={() => setModalCrearOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCrearConsultorio} className="py-4 space-y-4 text-xs">
              <div className="font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1">
                Datos del Consultorio
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Nombre del Consultorio *</label>
                  <input
                    type="text"
                    required
                    value={form.nombre_consultorio}
                    onChange={e => setForm({ ...form, nombre_consultorio: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                    placeholder="Ej. Clínica Dental Sonrisas"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Profesional Principal *</label>
                  <input
                    type="text"
                    required
                    value={form.nombre_profesional}
                    onChange={e => setForm({ ...form, nombre_profesional: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                    placeholder="Dra. María Pérez"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">NIT</label>
                  <input
                    type="text"
                    value={form.nit}
                    onChange={e => setForm({ ...form, nit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                    placeholder="900123456-1"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Registro Profesional</label>
                  <input
                    type="text"
                    value={form.registro_profesional}
                    onChange={e => setForm({ ...form, registro_profesional: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                    placeholder="12345"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={form.telefono}
                    onChange={e => setForm({ ...form, telefono: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Ciudad</label>
                  <input
                    type="text"
                    value={form.ciudad}
                    onChange={e => setForm({ ...form, ciudad: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1 pt-2">
                Cuenta del Usuario Administrador / Dueño
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    value={form.usuario_nombre}
                    onChange={e => setForm({ ...form, usuario_nombre: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Correo Electrónico *</label>
                  <input
                    type="email"
                    required
                    value={form.usuario_email}
                    onChange={e => setForm({ ...form, usuario_email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                    placeholder="dueño@consultorio.com"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Contraseña Inicial *</label>
                  <input
                    type="password"
                    required
                    value={form.usuario_password}
                    onChange={e => setForm({ ...form, usuario_password: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Registro del Usuario</label>
                  <input
                    type="text"
                    value={form.usuario_registro}
                    onChange={e => setForm({ ...form, usuario_registro: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalCrearOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creando}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium text-xs disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {creando ? 'Creando...' : 'Crear Consultorio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
