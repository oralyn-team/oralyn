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

  // DESPUÉS de todos los useState
  if (loading) return <p style={{ padding: 32 }}>Cargando pacientes...</p>;
  if (error)   return <p style={{ padding: 32, color: 'red' }}>{error}</p>;


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

  function handleEditar() {
  recargarPacientes();
  mostrarToast('Paciente actualizado correctamente');
}

  const stats = buildStats(pacientes);

  return (
    <div className="flex min-h-screen bg-teal-bg font-sans relative">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar pacientes={pacientes} />
        <main className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-4 gap-3 mb-5">
            {stats.map((s) => <StatCard key={s.label} {...s} />)}
          </div>

          <div className="bg-white border border-teal-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-teal-soft">
              <h2 className="text-[13px] font-medium text-primary">
                Pacientes registrados ({pacientesFiltrados.length})
              </h2>
            </div>

            <div className="flex items-center gap-2.5 px-5 py-3 bg-teal-panel border-b border-teal-soft">
              <SearchBar busqueda={busqueda} onBuscar={setBusqueda} />
              <button type="button" onClick={() => setModalOpen(true)}
                className="text-[12px] text-white font-medium font-sans px-3.5 py-[7px] bg-primary rounded-lg border-none cursor-pointer hover:bg-primary-light transition-colors whitespace-nowrap flex items-center gap-1.5">
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
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-primary text-white text-[12px] px-4 py-2 rounded-full whitespace-nowrap z-20 animate-toast">
          ✓ {toast}
        </div>
      )}
    </div>
  );
}