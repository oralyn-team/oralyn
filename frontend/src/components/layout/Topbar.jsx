// src/components/layout/Topbar.jsx
import { Bell } from 'lucide-react';
import Notificaciones from '../Notificaciones';
import { useNotificaciones } from '../../hooks/useNotificaciones';

/**
 * @param {Array} props.pacientes - Lista de pacientes desde Pacientes.jsx
 */
export default function Topbar({ pacientes = [] }) {
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
        <div className="w-8 h-8 rounded-full bg-teal flex items-center justify-center text-[11px] font-medium text-primary">
          DR
        </div>
      </div>
    </header>
  );
}