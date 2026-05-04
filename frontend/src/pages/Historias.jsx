// src/pages/Historias.jsx
import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

import Sidebar         from '../components/layout/Sidebar';
import Topbar          from '../components/layout/Topbar';
import StatCard        from '../components/StatCard';
import HistoriaLista   from '../components/historias/HistoriaLista';
import HistoriaDetalle from '../components/historias/HistoriaDetalle';

function buildStats(historias) {
  const conAlergia       = historias.filter((h) => h.alergias && h.alergias !== 'Ninguna conocida').length;
  const totalEvoluciones = historias.reduce((acc, h) => acc + (h.evoluciones?.length || 0), 0);
  return [
    { label: 'Total historias',   value: historias.length,                                      sub: 'registradas',         accentColor: '#3ECFCF' },
    { label: 'Con alergias',      value: conAlergia,                                            sub: 'requieren precaución', accentColor: '#EF9F27' },
    { label: 'Total evoluciones', value: totalEvoluciones,                                      sub: 'entradas clínicas',    accentColor: '#5DC2A4' },
    { label: 'Con adjuntos',      value: historias.filter((h) => h.adjuntos?.length > 0).length, sub: 'archivos cargados',  accentColor: '#85B7EB' },
  ];
}

export default function Historias() {
  const { historias, actualizarHistoria } = useApp();
  const [historiaActiva, setHistoriaActiva] = useState(null);

  // Abrir historia desde URL ?pacienteId=X
  useEffect(() => {
    const params     = new URLSearchParams(window.location.search);
    const pacienteId = Number(params.get('pacienteId'));
    if (pacienteId) {
      const encontrada = historias.find((h) => h.pacienteId === pacienteId);
      if (encontrada) setHistoriaActiva(encontrada);
    }
  }, [historias]);

  function handleActualizar(actualizada) {
    actualizarHistoria(actualizada);
    setHistoriaActiva(actualizada);
  }

  function handleVolver() {
    setHistoriaActiva(null);
    window.history.replaceState({}, '', '/historias');
  }

  const stats = buildStats(historias);

  return (
    <div className="flex min-h-screen bg-teal-bg font-sans">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar pacientes={[]} />

        {historiaActiva ? (
          <HistoriaDetalle
            historia={historiaActiva}
            onVolver={handleVolver}
            onActualizar={handleActualizar}
          />
        ) : (
          <main className="flex-1 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-4 gap-3 mb-5">
              {stats.map((s) => <StatCard key={s.label} {...s} />)}
            </div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[15px] font-medium text-primary">Historias Clínicas</h2>
                <p className="text-[11px] text-teal mt-0.5">
                  {historias.length} expedientes · Haz clic en un paciente para ver su historia
                </p>
              </div>
            </div>
            <HistoriaLista historias={historias} onSeleccionar={setHistoriaActiva} />
          </main>
        )}
      </div>
    </div>
  );
}