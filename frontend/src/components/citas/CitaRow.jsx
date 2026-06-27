// src/components/citas/CitaRow.jsx
import { useState } from 'react';
import { Pencil, Trash2, ChevronDown } from 'lucide-react';
import { ESTADOS_CITA, ESTADO_ESTILOS } from '../../data/citasData';

function ConfirmarEliminar({ nombre, fecha, onConfirmar, onCancelar }) {
  return (
    <div className="fixed inset-0 bg-primary/40 flex items-center justify-center z-30"
      onClick={(e) => e.target === e.currentTarget && onCancelar()}>
      <div className="bg-white rounded-2xl w-[320px] border border-teal-border overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-teal-soft flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-status-redBg flex items-center justify-center flex-shrink-0">
            <Trash2 size={16} className="text-status-red" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-primary">¿Cancelar esta cita?</p>
            <p className="text-[11px] text-teal-muted mt-0.5">Esta acción no se puede deshacer</p>
          </div>
        </div>
        <div className="px-5 py-4">
          <p className="text-[12px] text-teal-muted mb-1">Cita de:</p>
          <p className="text-[14px] font-medium text-primary">{nombre}</p>
          <p className="text-[12px] text-teal-muted mt-0.5">{fecha}</p>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-teal-soft">
          <button type="button" onClick={onCancelar}
            className="px-3.5 py-[7px] text-[12px] text-primary font-sans bg-white border border-teal-border rounded-lg cursor-pointer hover:bg-teal-info transition-colors">
            Cancelar
          </button>
          <button type="button" onClick={onConfirmar}
            className="px-3.5 py-[7px] text-[12px] text-white font-medium font-sans bg-status-red rounded-lg border-none cursor-pointer hover:opacity-90 transition-opacity">
            Sí, eliminar
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
      <tr className="border-b border-teal-soft hover:bg-teal-panel transition-colors group">

        {/* Paciente */}
        <td className="px-4 py-3">
          <p className="text-[13px] font-medium text-primary">{cita.pacienteNombre}</p>
        </td>

        {/* Fecha y hora */}
        <td className="px-4 py-3">
          <p className="text-[12px] text-primary font-medium">{cita.fecha}</p>
          <p className="text-[11px] text-teal-muted">{cita.hora}</p>
        </td>

        {/* Motivo */}
        <td className="px-4 py-3">
          <p className="text-[12px] text-[#1a3a3a]">{cita.motivo}</p>
        </td>

        {/* Doctor */}
        <td className="px-4 py-3">
          <p className="text-[12px] text-[#1a3a3a]">{cita.doctor}</p>
        </td>

        {/* Estado — con dropdown para cambiar */}
        <td className="px-4 py-3 relative">
          <button
            type="button"
            onClick={() => setMenuEstado((v) => !v)}
            className={[
              'flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full',
              'cursor-pointer border-none transition-opacity hover:opacity-80',
              estilos.badge,
            ].join(' ')}
          >
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${estilos.dot}`} />
            {cita.estado}
            <ChevronDown size={10} />
          </button>

          {menuEstado && (
            <div className="absolute left-4 top-10 bg-white border border-teal-border rounded-xl shadow-lg z-10 overflow-hidden w-[160px]">
              {ESTADOS_CITA.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => { onCambiarEstado(cita.id, e); setMenuEstado(false); }}
                  className={[
                    'w-full text-left px-3 py-2 text-[12px] font-sans border-none cursor-pointer',
                    'flex items-center gap-2 transition-colors',
                    cita.estado === e
                      ? 'bg-teal-soft text-primary font-medium'
                      : 'bg-white text-[#1a3a3a] hover:bg-teal-panel',
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
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button type="button" onClick={() => onEditar(cita)}
              className="p-1.5 rounded-lg border border-teal-border bg-white hover:bg-teal-soft text-primary transition-colors cursor-pointer">
              <Pencil size={13} />
            </button>
            <button type="button" onClick={() => setConfirmar(true)}
              className="p-1.5 rounded-lg border border-status-redBg bg-status-redBg hover:bg-red-100 text-status-red transition-colors cursor-pointer">
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
