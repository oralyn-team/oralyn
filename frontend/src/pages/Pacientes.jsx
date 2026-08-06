// src/pages/Pacientes.jsx
import { useState } from 'react';
import { useApp } from '../context/Appcontext';

import Sidebar       from '../components/layout/Sidebar';
import Topbar        from '../components/layout/Topbar';
import StatCard      from '../components/StatCard';
import SearchBar     from '../components/SearchBar';
import PacienteList  from '../components/PacienteList';
import PacienteForm  from '../components/PacienteForm';
import FiltroChips   from '../components/FiltroChips';

function buildStats(pacientes) {
  return [
    { label: 'Total pacientes', value: pacientes.length,                                              sub: 'registrados',        accentColor: '#3ECFCF' },
    { label: 'Al día',          value: pacientes.filter((p) => p.estado === 'Al día').length,         sub: 'sin pendientes',     accentColor: '#5DC2A4' },
    { label: 'Pendientes',      value: pacientes.filter((p) => p.estado === 'Pendiente').length,      sub: 'requieren atención', accentColor: '#EF9F27' },
    { label: 'Nuevos',          value: pacientes.filter((p) => p.estado === 'Nuevo').length,          sub: 'este mes',           accentColor: '#85B7EB' },
  ];
}

export default function Pacientes() {
  const { pacientes, agregarPaciente, eliminarPaciente, recargarPacientes, loading, error } = useApp();

  const [busqueda, setBusqueda]   = useState('');
  const [filtroEstado, setFiltro] = useState('Todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast]         = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-teal-bg dark:bg-dark-bg font-sans">
        <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
        <div className="flex flex-col flex-1 min-w-0">
          <Topbar onToggleMobileMenu={() => setMobileMenuOpen(true)} />
          <main className="flex-1 flex items-center justify-center p-6">
            <p className="text-[13px] text-teal-muted dark:text-slate-400">Cargando pacientes...</p>
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
          <main className="flex-1 flex items-center justify-center p-6">
            <p className="text-[13px] text-status-red dark:text-red-400">{error}</p>
          </main>
        </div>
      </div>
    );
  }

  const pacientesFiltrados = pacientes.filter((p) => {
    const t = busqueda.toLowerCase().trim();
    const nombre = `${p.nombres} ${p.primer_apellido} ${p.segundo_apellido || ''}`.toLowerCase();
    const coincideTexto  = nombre.includes(t) || (p.numero_documento || '').includes(t);
    const coincideEstado = filtroEstado === 'Todos' || p.estado === filtroEstado;
    return coincideTexto && coincideEstado;
  });

  function handleAgregar(datos) {
    agregarPaciente(datos);
    setModalOpen(false);
    mostrarToast('Paciente registrado correctamente');
  }

  function handleEliminar(id) {
    eliminarPaciente(id);
    mostrarToast('Paciente eliminado');
  }

  function mostrarToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  const stats = buildStats(pacientes);

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

          {/* Main Card container */}
          <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl overflow-hidden shadow-soft-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 py-4 border-b border-teal-soft dark:border-dark-border bg-teal-panel/40 dark:bg-slate-800/40 gap-2">
              <h2 className="text-[14px] font-semibold text-primary dark:text-dark-text">
                Pacientes registrados ({pacientesFiltrados.length})
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 px-4 sm:px-5 py-3 bg-teal-panel dark:bg-slate-800/60 border-b border-teal-soft dark:border-dark-border">
              <div className="flex-1 min-w-0">
                <SearchBar busqueda={busqueda} onBuscar={setBusqueda} />
              </div>
              <button 
                type="button" 
                onClick={() => setModalOpen(true)}
                className="text-[12px] text-white font-medium px-4 py-2.5 bg-primary dark:bg-teal dark:text-slate-900 rounded-xl hover:opacity-90 transition-opacity whitespace-nowrap flex items-center justify-center gap-1.5 touch-target cursor-pointer shadow-soft-sm"
              >
                + Nuevo paciente
              </button>
            </div>

            <FiltroChips activo={filtroEstado} onChange={setFiltro} pacientes={pacientes} />
            <PacienteList pacientes={pacientesFiltrados} onEliminar={handleEliminar} />
          </div>
        </main>
      </div>

      {modalOpen && (
        <PacienteForm onAgregar={handleAgregar} onClose={() => setModalOpen(false)} />
      )}

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-primary dark:bg-slate-800 text-white text-[12px] px-4 py-2.5 rounded-full whitespace-nowrap z-50 shadow-soft-lg animate-toast border border-white/10">
          ✓ {toast}
        </div>
      )}
    </div>
  );
}