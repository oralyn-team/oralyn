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
    <div className="bg-white border border-teal-border rounded-xl overflow-hidden">

      {/* Toolbar */}
      <div className="flex items-center gap-2.5 px-5 py-3 bg-teal-panel border-b border-teal-soft">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-teal pointer-events-none" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o cédula..."
            className="w-full pl-8 pr-3 py-[7px] border border-teal-border rounded-lg text-[13px] font-sans text-[#1a3a3a] bg-white outline-none placeholder:text-teal-light focus:border-teal transition-colors"
          />
        </div>
      </div>

      {/* Lista */}
      {filtradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-teal text-[13px]">
          <FileText size={32} className="text-teal mb-2" />
          <p>No se encontraron historias clínicas</p>
        </div>
      ) : (
        <ul className="divide-y divide-teal-soft">
          {filtradas.map((h) => {
            const av = getColorAvatar(h.pacienteId);
            const totalEv = h.evoluciones.length;
            const ultimaEv = h.evoluciones.length > 0
              ? h.evoluciones.slice().sort((a, b) => b.fecha.localeCompare(a.fecha))[0]
              : null;

            return (
              <li key={h.id}
                onClick={() => onSeleccionar(h)}
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-teal-panel transition-colors group">

                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-medium flex-shrink-0 ${av.bg} ${av.text}`}>
                  {getInitiales(h.pacienteNombre)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-primary">{h.pacienteNombre}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[11px] text-teal-muted"><IdCard size={12} className="inline-block mr-1" /> {h.cedula}</span>
                    <span className="text-[11px] text-teal-muted">
                      {totalEv} evolución{totalEv !== 1 ? 'es' : ''}
                    </span>
                    {ultimaEv && (
                      <span className="text-[11px] text-teal-muted">
                        Última: {ultimaEv.fecha}
                      </span>
                    )}
                  </div>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {h.alergias && h.alergias !== 'Ninguna conocida' && (
                    <span className="text-[10px] bg-status-amberBg text-status-amber font-medium px-2 py-0.5 rounded-full">
                      ⚠ Alergia
                    </span>
                  )}
                  <span className="text-[11px] text-teal-muted bg-teal-soft px-2 py-0.5 rounded-full">
                    {h.tipoSangre}
                  </span>
                  <ChevronRight size={15} className="text-teal-muted group-hover:text-primary transition-colors" />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="px-5 py-2.5 border-t border-teal-soft bg-teal-panel">
        <p className="text-[11px] text-teal-muted">
          {filtradas.length} de {historias.length} historias clínicas
        </p>
      </div>
    </div>
  );
}