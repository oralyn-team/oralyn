import { Menu, Sun, Moon } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../../context/Appcontext';
import Notificaciones from '../Notificaciones';
import { useNotificaciones } from '../../hooks/useNotificaciones';

const TITULOS_PAGINAS = {
  '/dashboard': { titulo: 'Panel de Control', sub: 'Oralyn › Dashboard' },
  '/pacientes': { titulo: 'Gestión de Pacientes', sub: 'Oralyn › Pacientes' },
  '/citas': { titulo: 'Agenda de Citas', sub: 'Oralyn › Citas' },
  '/historias': { titulo: 'Historias Clínicas', sub: 'Oralyn › Historias' },
  '/consentimientos': { titulo: 'Consentimientos Informados', sub: 'Oralyn › Consentimientos' },
  '/rips': { titulo: 'Generador de RIPS', sub: 'Oralyn › RIPS' },
  '/configuracion': { titulo: 'Ajustes del Consultorio', sub: 'Oralyn › Configuración' },
};

export default function Topbar({ onToggleMobileMenu }) {
  const { pacientes, configuracion, darkMode, toggleDarkMode } = useApp();
  const notificaciones = useNotificaciones(pacientes);
  const location = useLocation();

  const pageInfo = TITULOS_PAGINAS[location.pathname] || {
    titulo: 'Sistema Odontológico',
    sub: 'Oralyn',
  };

  return (
    <header className="bg-white dark:bg-dark-card border-b border-teal-border dark:border-dark-border px-4 sm:px-6 py-3 flex items-center justify-between flex-shrink-0 sticky top-0 z-30 transition-colors">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger button */}
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-lg text-primary dark:text-teal hover:bg-teal-soft dark:hover:bg-slate-800 transition-colors touch-target flex items-center justify-center cursor-pointer"
            aria-label="Abrir menú de navegación"
          >
            <Menu size={20} />
          </button>
        )}

        <div>
          <h1 className="text-[14px] sm:text-[15px] font-semibold text-primary dark:text-dark-text leading-tight">
            {pageInfo.titulo}
          </h1>
          <p className="text-[10px] sm:text-[11px] text-teal dark:text-teal-light font-medium mt-0.5">
            {pageInfo.sub}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Dark mode button quick toggle */}
        <button
          type="button"
          onClick={toggleDarkMode}
          className="p-2 rounded-lg text-primary dark:text-amber-400 hover:bg-teal-soft dark:hover:bg-slate-800 transition-colors touch-target flex items-center justify-center cursor-pointer"
          title={darkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notificaciones */}
        <Notificaciones notificaciones={notificaciones} />

        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-full bg-teal flex items-center justify-center text-[11px] font-bold text-primary flex-shrink-0 shadow-sm border border-teal-light/40"
          title={configuracion?.nombre_profesional || 'Doctor'}
        >
          {configuracion?.nombre_profesional
            ? configuracion.nombre_profesional
                .split(' ')
                .map((w) => w[0])
                .slice(0, 2)
                .join('')
            : 'DR'}
        </div>
      </div>
    </header>
  );
}