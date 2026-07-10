// src/components/layout/Topbar.jsx
import { useApp } from '../../context/Appcontext';
import Notificaciones from '../Notificaciones';
import { useNotificaciones } from '../../hooks/useNotificaciones';

/**
 * Topbar obtiene pacientes del contexto global automáticamente.
 * La prop pacientes se mantiene por compatibilidad pero ya no es necesaria.
 */
export default function Topbar() {
  const { pacientes, configuracion} = useApp();
  const notificaciones = useNotificaciones(pacientes);

  return (
    <header className="bg-white border-b border-teal-border px-6 py-3 flex items-center justify-between flex-shrink-0">
      <div>
        <h1 className="text-[15px] font-medium text-primary">Gestión de Pacientes</h1>
        <p className="text-[11px] text-teal mt-0.5">Oralyn › Pacientes</p>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Notificaciones con datos reales */}
        <Notificaciones notificaciones={notificaciones} />

        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-teal flex items-center justify-center text-[11px] font-medium text-primary flex-shrink-0">
            {configuracion?.nombre_profesional
            ? configuracion.nombre_profesional.split(' ').map(w => w[0]).slice(0, 2).join('')
            : 'DR'}
          </div>
      </div>
    </header>
  );
}