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
    const coincideTexto  = c.pacienteNombre.toLowerCase().includes(t) || c.motivo.toLowerCase().includes(t) || c.doctor.toLowerCase().includes(t);
    const coincideEstado = filtro === 'Todas' || c.estado === filtro;
    return coincideTexto && coincideEstado;
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
            placeholder="Buscar por paciente, motivo o doctor..."
            className="w-full pl-8 pr-3 py-[7px] border border-teal-border rounded-lg text-[13px] font-sans text-[#1a3a3a] bg-white outline-none placeholder:text-teal-light focus:border-teal transition-colors"
          />
        </div>
      </div>

      {/* Chips de filtro por estado */}
      <div className="flex items-center gap-2 px-5 py-2.5 border-b border-teal-soft flex-wrap">
        <span className="text-[11px] text-teal-muted uppercase tracking-[0.7px] mr-1">Estado:</span>
        {CHIPS.map((chip) => {
          const activo = filtro === chip;
          const estilos = chip !== 'Todas' ? ESTADO_ESTILOS[chip] : null;
          const conteo  = chip === 'Todas' ? citas.length : citas.filter((c) => c.estado === chip).length;
          return (
            <button key={chip} type="button" onClick={() => setFiltro(chip)}
              className={[
                'flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium',
                'border transition-all duration-150 cursor-pointer font-sans',
                activo
                  ? (estilos ? `${estilos.badge} border-transparent shadow-sm scale-[1.03]` : 'bg-teal-soft text-primary border-teal-border shadow-sm scale-[1.03]')
                  : 'bg-white text-teal-muted border-teal-border hover:bg-teal-soft',
              ].join(' ')}>
              {estilos && <span className={`w-1.5 h-1.5 rounded-full ${estilos.dot}`} />}
              {chip}
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${activo ? 'bg-white/50' : 'bg-teal-soft'}`}>
                {conteo}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tabla */}
      {filtradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-teal text-[13px]">
          <span className="text-[32px] mb-2">📅</span>
          <p>No se encontraron citas</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-teal-soft bg-[#F7FDFD]">
                {['Paciente', 'Fecha / Hora', 'Motivo', 'Doctor', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium text-teal-muted uppercase tracking-[0.7px]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
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

      <div className="px-5 py-2.5 border-t border-teal-soft bg-teal-panel">
        <p className="text-[11px] text-teal-muted">
          Mostrando {filtradas.length} de {citas.length} citas
        </p>
      </div>
    </div>
  );
}