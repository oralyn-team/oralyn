// src/components/FiltroChips.jsx

const CHIPS = [
  { label: 'Todos',     color: 'bg-teal-soft text-primary border-teal-border'         },
  { label: 'Al día',    color: 'bg-status-greenBg text-status-green border-transparent' },
  { label: 'Pendiente', color: 'bg-status-amberBg text-status-amber border-transparent' },
  { label: 'Nuevo',     color: 'bg-status-blueBg text-status-blue border-transparent'  },
];

/**
 * @param {string}   props.activo    - Estado activo actual
 * @param {function} props.onChange  - Callback al cambiar chip
 * @param {Array}    props.pacientes - Lista completa para mostrar conteos
 */
export default function FiltroChips({ activo, onChange, pacientes }) {
  function conteo(label) {
    if (label === 'Todos') return pacientes.length;
    return pacientes.filter((p) => p.estado === label).length;
  }

  return (
    <div className="flex items-center gap-2 px-5 py-2.5 border-b border-teal-soft bg-white flex-wrap">
      <span className="text-[11px] text-teal-muted uppercase tracking-[0.7px] mr-1">
        Estado:
      </span>

      {CHIPS.map(({ label, color }) => {
        const isActive = activo === label;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onChange(label)}
            className={[
              'flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium',
              'border transition-all duration-150 cursor-pointer font-sans',
              isActive
                ? `${color} shadow-sm scale-[1.03]`
                : 'bg-white text-teal-muted border-teal-border hover:bg-teal-soft',
            ].join(' ')}
          >
            {label}
            <span
              className={[
                'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                isActive ? 'bg-white/50' : 'bg-teal-soft',
              ].join(' ')}
            >
              {conteo(label)}
            </span>
          </button>
        );
      })}
    </div>
  );
}