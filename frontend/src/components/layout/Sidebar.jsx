import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, CalendarDays,
  Stethoscope, ClipboardList, Settings, LogOut, FileBarChart, Receipt,
  Sun, Moon, X
} from 'lucide-react';
import { useApp } from '../../context/Appcontext';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard',       path: '/dashboard'       },
  { icon: Users,           label: 'Pacientes',       path: '/pacientes'       },
  { icon: CalendarDays,    label: 'Citas',            path: '/citas'           },
  { icon: Stethoscope,     label: 'Consentimientos',  path: '/consentimientos' },
  { icon: ClipboardList,   label: 'Historias',        path: '/historias'       },
  { icon: FileBarChart,    label: 'RIPS',             path: '/rips'            },
  { icon: Receipt,         label: 'Facturación',      path: '/facturacion'     },
  { icon: Settings,        label: 'Ajustes',          path: '/configuracion'   },
];

function ToothIcon() {
  return (
    <svg className="w-7 h-7 mb-1" viewBox="0 0 28 28" fill="none">
      <path
        d="M14 3C10 3 7 5.5 7 9c0 2 .5 3.5 1 5 .8 2.5 1.5 6 2.5 8.5.4 1 1 1.5 2 1
           1-.6 1.5-2 1.5-3.5 0 1.5.5 2.9 1.5 3.5 1 .5 1.6 0 2-1
           C18.5 20 19.2 16.5 20 14c.5-1.5 1-3 1-5 0-3.5-3-6-7-6z"
        fill="#3ECFCF"
      />
    </svg>
  );
}

export default function Sidebar({ isOpen, onClose }) {
  const { configuracion, cerrarSesion, darkMode, toggleDarkMode } = useApp();
  const navigate = useNavigate();

  function handleLogout() {
    cerrarSesion();
    navigate('/login', { replace: true });
  }

  const sidebarContent = (
    <aside className="w-[240px] h-full bg-primary dark:bg-slate-900 flex flex-col flex-shrink-0 text-white select-none shadow-soft-lg">
      {/* Header / Logo */}
      <div className="px-5 pt-5 pb-4 border-b border-white/10 dark:border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ToothIcon />
            <p className="font-display text-xl text-white tracking-wide">Oralyn</p>
          </div>
          <p className="text-[10px] text-teal-light dark:text-teal tracking-[1.5px] uppercase mt-0.5 font-medium">
            Sistema Odontológico
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav className="py-3 flex-1 overflow-y-auto custom-scrollbar">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.label}
              to={item.path}
              onClick={() => onClose && onClose()}
              className={({ isActive }) => [
                'flex items-center gap-3 px-5 py-3 text-[13px] font-medium',
                'border-l-[4px] transition-all duration-150 no-underline touch-target',
                isActive
                  ? 'text-white bg-white/10 dark:bg-slate-800/80 border-l-teal dark:border-l-teal font-semibold'
                  : 'text-white/70 dark:text-slate-400 border-l-transparent hover:bg-white/5 dark:hover:bg-slate-800/40 hover:text-white',
              ].join(' ')}
            >
              <Icon size={18} strokeWidth={1.8} className="flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Dark mode & Profile Footer */}
      <div className="px-5 py-4 border-t border-white/10 dark:border-slate-800 flex flex-col gap-3">
        {/* Dark mode switch */}
        <button
          type="button"
          onClick={toggleDarkMode}
          className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-white/5 dark:bg-slate-800 hover:bg-white/10 dark:hover:bg-slate-700 text-white/80 dark:text-slate-300 text-[12px] font-medium transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            {darkMode ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-teal-light" />}
            <span>{darkMode ? 'Modo Claro' : 'Modo Oscuro'}</span>
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-teal-light font-mono">
            {darkMode ? 'DARK' : 'LIGHT'}
          </span>
        </button>

        {/* User profile info */}
        <div className="flex items-center gap-2.5 pt-1">
          <div className="w-8 h-8 rounded-full bg-teal flex items-center justify-center text-[12px] font-bold text-primary flex-shrink-0 shadow-sm">
            {configuracion?.nombre_profesional
              ? configuracion.nombre_profesional.split(' ').map((w) => w[0]).slice(0, 2).join('')
              : 'DR'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-white truncate">
              {configuracion?.nombre_profesional || 'Doctor'}
            </p>
            <p className="text-[10px] text-white/50 dark:text-slate-400 truncate">Odontólogo</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Cerrar sesión"
            className="flex-shrink-0 p-1.5 rounded-lg text-white/60 hover:text-red-300 hover:bg-white/10 transition-colors cursor-pointer touch-target flex items-center justify-center"
          >
            <LogOut size={16} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:block h-screen sticky top-0 flex-shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile drawer overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-primary/40 dark:bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={onClose}
          />
          <div className="relative z-10 h-full animate-slide-in-right">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
