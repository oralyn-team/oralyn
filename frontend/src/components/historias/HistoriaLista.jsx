// src/components/historias/HistoriaLista.jsx
import { useState } from 'react';
import { Search, FileText, ChevronRight, IdCard } from 'lucide-react';
import { getInitiales, getColorAvatar } from '../../data/pacientesData';

/**
 * @param {Array}    props.historias  - Lista de historias
 * @param {function} props.onSeleccionar - Callback al abrir una historia
 */
export default function HistoriaLista({ historias, onSeleccionar }) {
  const [busqueda, setBusqueda] = useState('');

  const filtradas = historias.filter((h) => {
    const t = busqueda.toLowerCase();
    return h.pacienteNombre.toLowerCase().includes(t) || h.cedula.includes(t);
  });

  return (
    <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl overflow-hidden shadow-soft-sm">

      {/* Toolbar */}
      <div className="flex items-center gap-2.5 px-4 sm:px-5 py-3 bg-teal-panel dark:bg-slate-800/60 border-b border-teal-soft dark:border-dark-border">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-teal dark:text-teal-light pointer-events-none" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o cédula..."
            className="w-full pl-9 pr-3 py-2 border border-teal-border dark:border-dark-border rounded-xl text-[12px] font-sans text-primary dark:text-dark-text bg-white dark:bg-dark-input outline-none placeholder:text-teal-light dark:placeholder:text-slate-500 focus:border-primary dark:focus:border-teal transition-colors min-h-[38px]"
          />
        </div>
      </div>

      {/* Lista */}
      {filtradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-teal-muted dark:text-slate-400 text-[13px]">
          <FileText size={36} className="text-teal-light dark:text-slate-500 mb-2" />
          <p className="font-semibold text-primary dark:text-dark-text">No se encontraron historias clínicas</p>
        </div>
      ) : (
        <ul className="divide-y divide-teal-soft dark:divide-dark-border">
          {filtradas.map((h) => {
            const av = getColorAvatar(h.pacienteId);
            const totalEv = h.evoluciones.length;
            const ultimaEv = h.evoluciones.length > 0
              ? h.evoluciones.slice().sort((a, b) => b.fecha.localeCompare(a.fecha))[0]
              : null;

            return (
              <li key={h.id}
                onClick={() => onSeleccionar(h)}
                className="flex items-center gap-3.5 px-4 sm:px-5 py-4 cursor-pointer hover:bg-teal-panel dark:hover:bg-slate-800/40 transition-colors group touch-target">

                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0 ${av.bg} ${av.text}`}>
                  {getInitiales(h.pacienteNombre)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-primary dark:text-dark-text truncate">{h.pacienteNombre}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-[11px] text-teal-muted dark:text-slate-400"><IdCard size={12} className="inline-block mr-1 text-teal" /> {h.cedula}</span>
                    <span className="text-[11px] text-teal-muted dark:text-slate-400">
                      {totalEv} evolución{totalEv !== 1 ? 'es' : ''}
                    </span>
                    {ultimaEv && (
                      <span className="text-[11px] text-teal-muted dark:text-slate-400 hidden sm:inline">
                        Última: {ultimaEv.fecha}
                      </span>
                    )}
                  </div>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {h.alergias && h.alergias !== 'Ninguna conocida' && (
                    <span className="text-[10px] bg-status-amberBg dark:bg-amber-950/60 text-status-amber dark:text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-900/50">
                      ⚠ Alergia
                    </span>
                  )}
                  <span className="text-[11px] text-teal-muted dark:text-slate-300 bg-teal-soft dark:bg-slate-800 px-2.5 py-0.5 rounded-full font-semibold">
                    {h.tipoSangre}
                  </span>
                  <ChevronRight size={16} className="text-teal-muted dark:text-slate-500 group-hover:text-primary dark:group-hover:text-teal transition-colors" />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="px-4 sm:px-5 py-3 border-t border-teal-soft dark:border-dark-border bg-teal-panel/40 dark:bg-slate-800/40">
        <p className="text-[11px] text-teal-muted dark:text-slate-400">
          {filtradas.length} de {historias.length} historias clínicas
        </p>
      </div>
    </div>
  );
}