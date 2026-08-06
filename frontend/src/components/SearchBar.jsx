// src/components/SearchBar.jsx
import{
  Search
} from 'lucide-react';
/**
 * @param {object} props
 * @param {string} props.busqueda  - Valor actual del input
 * @param {function} props.onBuscar - Callback al cambiar el input
 */
export default function SearchBar({ busqueda, onBuscar }) {
  return (
    <div className="relative flex-1">
      {/* Ícono lupa */}
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-teal dark:text-teal-light pointer-events-none">
        <Search size={14} />
      </span>

      <input
        type="text"
        id="buscador"
        value={busqueda}
        onChange={(e) => onBuscar(e.target.value)}
        placeholder="Buscar por nombre o cédula..."
        className={[
          'w-full pl-8 pr-3 py-[7px]',
          'border border-teal-border dark:border-dark-border rounded-lg',
          'text-[13px] font-sans text-primary dark:text-dark-text bg-white dark:bg-dark-input',
          'outline-none placeholder:text-teal-light dark:placeholder:text-slate-500',
          'focus:border-primary dark:focus:border-teal transition-colors duration-150',
        ].join(' ')}
      />
    </div>
  );
}