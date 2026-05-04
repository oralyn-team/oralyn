import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, CalendarDays,
  Stethoscope, ClipboardList, Receipt, Settings,
} from 'lucide-react';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard',      path: '/dashboard'     },
  { icon: Users,           label: 'Pacientes',      path: '/pacientes'     },
  { icon: CalendarDays,    label: 'Citas',           path: '/citas'         },
  { icon: Stethoscope,     label: 'Tratamientos',   path: '/tratamientos'  },
  { icon: ClipboardList,   label: 'Historias',       path: '/historias'     },
  { icon: Receipt,         label: 'Facturación',    path: '/facturacion'   },
  { icon: Settings,        label: 'Configuración',  path: '/configuracion' },
];

function ToothIcon() {
  return (
    <svg className="w-7 h-7 mb-1" viewBox="0 0 28 28" fill="none">
      <path
        d="M14 3C10 3 7 5.5 7 9c0 2 .5 3.5 1 5 .8 2.5 1.5 6 2.5 8.5.4 1 1 1.5 2 1
           1-.6 1.5-2 1.5-3.5 0 1.5.5 2.9 1.5 3.5 1 .5 1.6 0 2-1
           C18.5 20 19.2 16.5 20 14c.5-1.5 1-3 1-5 0-3.5-3-6-7-6z"
        fill="#7ECECE"
      />
    </svg>
  );
}

export default function Sidebar() {
  return (
    <nav className="w-[220px] min-h-screen bg-primary flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-5 pt-5 pb-4 border-b border-white/10">
        <ToothIcon />
        <p className="font-display text-lg text-white tracking-wide">Oralyn</p>
        <p className="text-[10px] text-teal-light tracking-[1.5px] uppercase mt-0.5">
          Sistema Odontológico
        </p>
      </div>

      {/* Nav items */}
      <div className="py-3 flex-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.label}
              to={item.path}
              className={({ isActive }) => [
                'flex items-center gap-2.5 px-5 py-2.5 text-[13px]',
                'border-l-[3px] transition-all duration-150 no-underline',
                isActive
                  ? 'text-white bg-white/[0.08] border-l-teal'
                  : 'text-white/60 border-l-transparent hover:bg-white/5 hover:text-white/85',
              ].join(' ')}
            >
              <Icon size={16} strokeWidth={1.8} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-teal flex items-center justify-center text-[11px] font-medium text-primary">
            DR
          </div>
          <div>
            <p className="text-[12px] text-white/80">Dra. Murillo</p>
            <p className="text-[10px] text-white/40">Odontólogo</p>
          </div>
        </div>
      </div>
    </nav>
  );
}