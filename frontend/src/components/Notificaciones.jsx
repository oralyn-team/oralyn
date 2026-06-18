// src/components/Notificaciones.jsx
import { useState, useRef, useEffect } from 'react';
import { Bell, Clock, AlertTriangle, UserPlus, X, CheckCheck } from 'lucide-react';

const ICONOS = {
  clock: Clock,
  alert: AlertTriangle,
  user:  UserPlus,
};

const ESTILOS_TIPO = {
  advertencia: {
    borde:  'border-l-status-amberMid',
    iconBg: 'bg-status-amberBg',
    icon:   'text-status-amber',
    badge:  'bg-status-amberBg text-status-amber',
  },
  pendiente: {
    borde:  'border-l-status-red',
    iconBg: 'bg-status-redBg',
    icon:   'text-status-red',
    badge:  'bg-status-redBg text-status-red',
  },
  info: {
    borde:  'border-l-status-blueMid',
    iconBg: 'bg-status-blueBg',
    icon:   'text-status-blue',
    badge:  'bg-status-blueBg text-status-blue',
  },
};

const LABEL_TIPO = {
  advertencia: 'Sin visita',
  pendiente:   'Pendiente',
  info:        'Seguimiento',
};

/**
 * @param {Array} props.notificaciones - Lista generada por useNotificaciones
 */
export default function Notificaciones({ notificaciones }) {
  const [abierto, setAbierto]         = useState(false);
  const [leidas, setLeidas]           = useState(new Set());
  const ref                           = useRef(null);

  const sinLeer = notificaciones.filter((n) => !leidas.has(n.id)).length;

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickFuera(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setAbierto(false);
      }
    }
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, []);

  function marcarTodasLeidas() {
    setLeidas(new Set(notificaciones.map((n) => n.id)));
  }

  function marcarLeida(id) {
    setLeidas((prev) => new Set([...prev, id]));
  }

  return (
    <div className="relative" ref={ref}>
      {/* Botón campana */}
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="relative w-8 h-8 rounded-full border border-teal-border bg-teal-info flex items-center justify-center cursor-pointer hover:bg-teal-soft transition-colors"
      >
        <Bell size={15} className="text-primary" strokeWidth={1.8} />
        {sinLeer > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-status-red border-2 border-white flex items-center justify-center text-[9px] text-white font-bold">
            {sinLeer > 9 ? '9+' : sinLeer}
          </span>
        )}
      </button>

      {/* Panel desplegable */}
      {abierto && (
        <div className="absolute right-0 top-10 w-[340px] bg-white border border-teal-border rounded-xl shadow-lg z-50 overflow-hidden">

          {/* Header del panel */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-teal-soft">
            <div>
              <p className="text-[13px] font-medium text-primary">Notificaciones</p>
              <p className="text-[11px] text-teal-muted mt-0.5">
                {sinLeer > 0 ? `${sinLeer} sin leer` : 'Todo al día'}
              </p>
            </div>
            <button
              type="button"
              onClick={marcarTodasLeidas}
              className="flex items-center gap-1 text-[11px] text-teal cursor-pointer hover:text-primary transition-colors font-sans border-none bg-transparent"
            >
              <CheckCheck size={13} />
              Marcar todas
            </button>
          </div>

          {/* Lista */}
          <ul className="max-h-[360px] overflow-y-auto divide-y divide-teal-soft">
            {notificaciones.length === 0 ? (
              <li className="flex flex-col items-center justify-center py-10 text-teal-muted text-[12px] gap-2">
                <CheckCheck size={24} className="text-teal" />
                Sin notificaciones pendientes
              </li>
            ) : (
              notificaciones.map((n) => {
                const estilos  = ESTILOS_TIPO[n.tipo];
                const Icono    = ICONOS[n.icono];
                const esLeida  = leidas.has(n.id);

                return (
                  <li
                    key={n.id}
                    className={[
                      'flex items-start gap-3 px-4 py-3 border-l-[3px] transition-colors',
                      estilos.borde,
                      esLeida ? 'bg-white opacity-50' : 'bg-white hover:bg-teal-panel',
                    ].join(' ')}
                  >
                    {/* Ícono */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${estilos.iconBg}`}>
                      <Icono size={14} className={estilos.icon} strokeWidth={2} />
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${estilos.badge}`}>
                          {LABEL_TIPO[n.tipo]}
                        </span>
                        {!esLeida && (
                          <span className="w-1.5 h-1.5 rounded-full bg-teal flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-[12px] font-medium text-primary leading-snug">{n.titulo}</p>
                      <p className="text-[11px] text-teal-muted mt-0.5 leading-snug">{n.mensaje}</p>
                    </div>

                    {/* Botón cerrar / marcar leída */}
                    {!esLeida && (
                      <button
                        type="button"
                        onClick={() => marcarLeida(n.id)}
                        className="flex-shrink-0 mt-0.5 text-teal-muted hover:text-primary transition-colors border-none bg-transparent cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </li>
                );
              })
            )}
          </ul>

          {/* Footer */}
          {notificaciones.length > 0 && (
            <div className="px-4 py-2.5 border-t border-teal-soft bg-teal-panel">
              <p className="text-[11px] text-teal-muted text-center">
                {notificaciones.length} alertas generadas automáticamente
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}