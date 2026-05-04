// src/pages/Citas.jsx
import { useState } from 'react';
import { CalendarDays, List } from 'lucide-react';

import Sidebar        from '../components/layout/Sidebar';
import Topbar         from '../components/layout/Topbar';
import StatCard       from '../components/StatCard';
import CitaTabla      from '../components/citas/CitaTabla';
import CitaCalendario from '../components/citas/CitaCalendario';
import CitaForm       from '../components/citas/CitaForm';

import { citasIniciales, pacientesParaSelector } from '../data/citasData';

function buildStats(citas) {
  const hoy = new Date().toISOString().slice(0, 10);
  return [
    { label: 'Total citas',   value: citas.length,                                              sub: 'registradas',       accentColor: '#3ECFCF' },
    { label: 'Hoy',           value: citas.filter((c) => c.fecha === hoy).length,               sub: 'programadas hoy',   accentColor: '#85B7EB' },
    { label: 'Pendientes',    value: citas.filter((c) => c.estado === 'Pendiente').length,       sub: 'por confirmar',     accentColor: '#EF9F27' },
    { label: 'Completadas',   value: citas.filter((c) => c.estado === 'Completada').length,      sub: 'este mes',          accentColor: '#5DC2A4' },
  ];
}

export default function Citas() {
  const [citas, setCitas]         = useState(citasIniciales);
  const [vista, setVista]         = useState('tabla');      // 'tabla' | 'calendario'
  const [modalOpen, setModalOpen] = useState(false);
  const [citaEditar, setCitaEditar] = useState(null);
  const [toast, setToast]         = useState(null);

  function mostrarToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  function abrirCrear() {
    setCitaEditar(null);
    setModalOpen(true);
  }

  function abrirEditar(cita) {
    setCitaEditar(cita);
    setModalOpen(true);
  }

  function guardarCita(datos) {
    if (citaEditar) {
      // Edición
      setCitas((prev) => prev.map((c) => c.id === datos.id ? datos : c));
      mostrarToast('Cita actualizada correctamente');
    } else {
      // Creación
      setCitas((prev) => [{ ...datos, id: Date.now() }, ...prev]);
      mostrarToast('Cita creada correctamente');
    }
    setModalOpen(false);
    setCitaEditar(null);
  }

  function eliminarCita(id) {
    setCitas((prev) => prev.filter((c) => c.id !== id));
    mostrarToast('Cita eliminada');
  }

  function cambiarEstado(id, nuevoEstado) {
    setCitas((prev) => prev.map((c) => c.id === id ? { ...c, estado: nuevoEstado } : c));
    mostrarToast(`Estado actualizado: ${nuevoEstado}`);
  }

  const stats = buildStats(citas);

  return (
    <div className="flex min-h-screen bg-teal-bg font-sans relative">
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar pacientes={[]} />

        <main className="flex-1 overflow-y-auto px-6 py-5">

          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            {stats.map((s) => <StatCard key={s.label} {...s} />)}
          </div>

          {/* Cabecera del panel */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[15px] font-medium text-primary">Gestión de Citas</h2>
              <p className="text-[11px] text-teal mt-0.5">{citas.length} citas registradas</p>
            </div>

            <div className="flex items-center gap-2">
              {/* Toggle de vista */}
              <div className="flex items-center bg-white border border-teal-border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setVista('tabla')}
                  className={[
                    'flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium font-sans border-none cursor-pointer transition-colors',
                    vista === 'tabla' ? 'bg-primary text-white' : 'bg-white text-teal-muted hover:bg-teal-soft',
                  ].join(' ')}
                >
                  <List size={13} /> Lista
                </button>
                <button
                  type="button"
                  onClick={() => setVista('calendario')}
                  className={[
                    'flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium font-sans border-none cursor-pointer transition-colors',
                    vista === 'calendario' ? 'bg-primary text-white' : 'bg-white text-teal-muted hover:bg-teal-soft',
                  ].join(' ')}
                >
                  <CalendarDays size={13} /> Calendario
                </button>
              </div>

              {/* Botón nueva cita */}
              <button
                type="button"
                onClick={abrirCrear}
                className="flex items-center gap-1.5 px-3.5 py-2 text-[12px] text-white font-medium font-sans bg-primary rounded-lg border-none cursor-pointer hover:bg-primary-light transition-colors"
              >
                + Nueva cita
              </button>
            </div>
          </div>

          {/* Vista activa */}
          {vista === 'tabla' ? (
            <CitaTabla
              citas={citas}
              onEditar={abrirEditar}
              onEliminar={eliminarCita}
              onCambiarEstado={cambiarEstado}
            />
          ) : (
            <CitaCalendario citas={citas} />
          )}
        </main>
      </div>

      {/* Modal crear / editar */}
      {modalOpen && (
        <CitaForm
          onGuardar={guardarCita}
          onClose={() => { setModalOpen(false); setCitaEditar(null); }}
          citaEditar={citaEditar}
          pacientes={pacientesParaSelector}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-primary text-white text-[12px] px-4 py-2 rounded-full whitespace-nowrap z-20 animate-toast">
          ✓ {toast}
        </div>
      )}
    </div>
  );
}