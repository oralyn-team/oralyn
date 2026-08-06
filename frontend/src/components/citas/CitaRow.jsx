// src/components/citas/CitaRow.jsx
import { useState } from 'react';
import { Pencil, Trash2, ChevronDown } from 'lucide-react';
import { ESTADOS_CITA, ESTADO_ESTILOS } from '../../data/citasData';

function ConfirmarEliminar({ nombre, fecha, onConfirmar, onCancelar }) {
  return (
    <div className="fixed inset-0 bg-primary/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onCancelar()}>
      <div className="bg-white dark:bg-dark-card rounded-2xl w-full max-w-sm border border-teal-border dark:border-dark-border overflow-hidden shadow-soft-lg">
        <div className="px-5 py-4 border-b border-teal-soft dark:border-dark-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-status-redBg dark:bg-red-950/40 flex items-center justify-center flex-shrink-0">
            <Trash2 size={16} className="text-status-red dark:text-red-400" />
          </div>
          <div>
            <p className="text-[13.5px] font-semibold text-primary dark:text-dark-text">¿Cancelar esta cita?</p>
            <p className="text-[11px] text-teal-muted dark:text-slate-400 mt-0.5">Esta acción no se puede deshacer</p>
          </div>
        </div>
        <div className="px-5 py-4">
          <p className="text-[11px] text-teal-muted dark:text-slate-400 font-semibold uppercase tracking-wider mb-1">Cita de:</p>
          <p className="text-[14px] font-bold text-primary dark:text-dark-text">{nombre}</p>
          <p className="text-[12px] text-teal-muted dark:text-slate-400 mt-0.5">{fecha}</p>
        </div>
        <div className="flex justify-end gap-2.5 px-5 py-3.5 border-t border-teal-soft dark:border-dark-border bg-teal-panel/40 dark:bg-slate-800/40">
          <button type="button" onClick={onCancelar}
            className="px-4 py-2 text-[12px] text-primary dark:text-slate-300 font-sans bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl cursor-pointer hover:bg-teal-soft dark:hover:bg-slate-700 transition-colors touch-target">
            Cancelar
          </button>
          <button type="button" onClick={onConfirmar}
            className="px-4 py-2 text-[12px] text-white font-medium font-sans bg-status-red dark:bg-red-600 rounded-xl border-none cursor-pointer hover:opacity-90 transition-opacity touch-target shadow-soft-sm">
            Sí, cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * @param {object}   props
 * @param {object}   props.cita
 * @param {function} props.onEditar
 * @param {function} props.onEliminar
 * @param {function} props.onCambiarEstado
 */
export default function CitaRow({ cita, onEditar, onEliminar, onCambiarEstado }) {
  const [confirmar, setConfirmar]       = useState(false);
  const [menuEstado, setMenuEstado]     = useState(false);

  const estilos = ESTADO_ESTILOS[cita.estado] || ESTADO_ESTILOS['Pendiente'];

  return (
    <>
      <tr className="border-b border-teal-soft dark:border-dark-border hover:bg-teal-panel dark:hover:bg-slate-800/30 transition-colors group">

        {/* Paciente */}
        <td className="px-4 py-3.5">
          <p className="text-[13px] font-semibold text-primary dark:text-dark-text">{cita.pacienteNombre}</p>
        </td>

        {/* Fecha y hora */}
        <td className="px-4 py-3.5">
          <p className="text-[12px] text-primary dark:text-dark-text font-semibold">{cita.fecha}</p>
          <p className="text-[11px] text-teal-muted dark:text-slate-400 mt-0.5">{cita.hora}</p>
        </td>

        {/* Motivo */}
        <td className="px-4 py-3.5">
          <p className="text-[12px] text-primary dark:text-dark-text leading-snug">{cita.motivo}</p>
        </td>

        {/* Doctor */}
        <td className="px-4 py-3.5">
          <p className="text-[12px] text-primary dark:text-dark-text font-medium">{cita.doctor}</p>
        </td>

        {/* Estado — con dropdown para cambiar */}
        <td className="px-4 py-3.5 relative">
          <button
            type="button"
            onClick={() => setMenuEstado((v) => !v)}
            className={[
              'flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full',
              'cursor-pointer border-none transition-opacity hover:opacity-90 touch-target',
              estilos.badge,
            ].join(' ')}
          >
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${estilos.dot}`} />
            {cita.estado}
            <ChevronDown size={11} />
          </button>

          {menuEstado && (
            <div className="absolute left-4 top-11 bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-xl shadow-soft-lg z-20 overflow-hidden w-[160px]">
              {ESTADOS_CITA.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => { onCambiarEstado(cita.id, e); setMenuEstado(false); }}
                  className={[
                    'w-full text-left px-3 py-2 text-[12px] font-sans border-none cursor-pointer',
                    'flex items-center gap-2 transition-colors touch-target',
                    cita.estado === e
                      ? 'bg-teal-soft dark:bg-slate-800 text-primary dark:text-teal font-semibold'
                      : 'bg-white dark:bg-dark-card text-primary dark:text-dark-text hover:bg-teal-panel dark:hover:bg-slate-800/40',
                  ].join(' ')}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ESTADO_ESTILOS[e]?.dot}`} />
                  {e}
                </button>
              ))}
            </div>
          )}
        </td>

        {/* Acciones */}
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button type="button" onClick={() => onEditar(cita)}
              className="p-1.5 rounded-lg border border-teal-border dark:border-dark-border bg-white dark:bg-dark-input hover:bg-teal-soft dark:hover:bg-slate-700 text-primary dark:text-teal transition-colors cursor-pointer touch-target">
              <Pencil size={13} />
            </button>
            <button type="button" onClick={() => setConfirmar(true)}
              className="p-1.5 rounded-lg border border-status-redBg dark:border-red-900/50 bg-status-redBg dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/40 text-status-red dark:text-red-400 transition-colors cursor-pointer touch-target">
              <Trash2 size={13} />
            </button>
          </div>
        </td>
      </tr>

      {confirmar && (
        <ConfirmarEliminar
          nombre={cita.pacienteNombre}
          fecha={`${cita.fecha} a las ${cita.hora}`}
          onConfirmar={() => { onEliminar(cita.id); setConfirmar(false); }}
          onCancelar={() => setConfirmar(false)}
        />
      )}
    </>
  );
}
