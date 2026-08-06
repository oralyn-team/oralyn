// src/components/citas/CitaTabla.jsx
import { useState } from 'react';
import { Search } from 'lucide-react';
import CitaRow from './CitaRow';
import { ESTADOS_CITA, ESTADO_ESTILOS } from '../../data/citasData';

const CHIPS = ['Todas', ...ESTADOS_CITA];

export default function CitaTabla({ citas, onEditar, onEliminar, onCambiarEstado }) {
  const [busqueda, setBusqueda]   = useState('');
  const [filtro, setFiltro]       = useState('Todas');

  const filtradas = citas.filter((c) => {
    const t = busqueda.toLowerCase();
    const coincideTexto =
      (c.pacienteNombre || '').toLowerCase().includes(t) ||
      (c.motivo || '').toLowerCase().includes(t) ||
      (c.doctor || '').toLowerCase().includes(t);
    const coincideEstado = filtro === 'Todas' || c.estado === filtro;
    return coincideTexto && coincideEstado;
  });

  return (
    <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl overflow-hidden shadow-soft-sm">

      {/* Toolbar */}
      <div className="flex items-center gap-2.5 px-5 py-3 bg-teal-panel dark:bg-slate-800/60 border-b border-teal-soft dark:border-dark-border">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-teal dark:text-teal-light pointer-events-none" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por paciente, motivo o doctor..."
            className="w-full pl-9 pr-3 py-2 border border-teal-border dark:border-dark-border rounded-xl text-[12px] font-sans text-primary dark:text-dark-text bg-white dark:bg-dark-input outline-none placeholder:text-teal-light dark:placeholder:text-slate-500 focus:border-primary dark:focus:border-teal transition-colors min-h-[38px]"
          />
        </div>
      </div>

      {/* Chips de filtro por estado */}
      <div className="flex items-center gap-2 px-5 py-2.5 border-b border-teal-soft dark:border-dark-border bg-white dark:bg-dark-card flex-wrap">
        <span className="text-[11px] text-teal-muted dark:text-slate-400 font-semibold uppercase tracking-[0.7px] mr-1">Estado:</span>
        {CHIPS.map((chip) => {
          const activo = filtro === chip;
          const estilos = chip !== 'Todas' ? ESTADO_ESTILOS[chip] : null;
          const conteo  = chip === 'Todas' ? citas.length : citas.filter((c) => c.estado === chip).length;
          return (
            <button key={chip} type="button" onClick={() => setFiltro(chip)}
              className={[
                'flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-150 cursor-pointer font-sans border touch-target',
                activo
                  ? (estilos ? `${estilos.badge} border-transparent shadow-soft-sm scale-[1.03]` : 'bg-teal-soft dark:bg-teal text-primary dark:text-slate-900 border-teal-border dark:border-transparent shadow-soft-sm scale-[1.03] font-semibold')
                  : 'bg-white dark:bg-dark-input text-teal-muted dark:text-slate-400 border-teal-border dark:border-dark-border hover:bg-teal-soft dark:hover:bg-slate-800',
              ].join(' ')}>
              {estilos && <span className={`w-1.5 h-1.5 rounded-full ${estilos.dot}`} />}
              {chip}
              <span className={[
                'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                activo ? 'bg-white/30 dark:bg-black/25' : 'bg-teal-soft dark:bg-slate-800',
              ].join(' ')}>
                {conteo}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tabla */}
      {filtradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-teal dark:text-teal-light text-[13px]">
          <span className="text-[36px] mb-2">📅</span>
          <p className="font-semibold text-primary dark:text-dark-text">No se encontraron citas</p>
        </div>
      ) : (
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="border-b border-teal-soft dark:border-dark-border bg-teal-bg/40 dark:bg-slate-800/40">
                {['Paciente', 'Fecha / Hora', 'Motivo', 'Doctor', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-teal-muted dark:text-slate-400 uppercase tracking-[0.7px]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-teal-soft dark:divide-dark-border text-primary dark:text-dark-text bg-white dark:bg-dark-card">
              {filtradas.map((cita) => (
                <CitaRow
                  key={cita.id}
                  cita={cita}
                  onEditar={onEditar}
                  onEliminar={onEliminar}
                  onCambiarEstado={onCambiarEstado}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="px-5 py-3 border-t border-teal-soft dark:border-dark-border bg-teal-panel/40 dark:bg-slate-800/40">
        <p className="text-[11px] text-teal-muted dark:text-slate-400">
          Mostrando {filtradas.length} de {citas.length} citas
        </p>
      </div>
    </div>
  );
}
