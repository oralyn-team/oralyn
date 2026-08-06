export default function StatCard({ label, value, sub, accentColor }) {
  return (
    <div className="relative bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-xl px-4 py-3.5 overflow-hidden shadow-soft-sm hover:shadow-soft-md transition-all duration-200">
      {/* Barra de acento izquierda */}
      <span
        className="absolute top-0 left-0 w-1 h-full rounded-l-xl"
        style={{ backgroundColor: accentColor || '#3ECFCF' }}
      />

      <p className="text-[10px] sm:text-[11px] font-semibold text-teal-muted dark:text-dark-muted uppercase tracking-[0.8px] mb-1.5 truncate">
        {label}
      </p>
      <p className="text-[20px] sm:text-[24px] font-bold text-primary dark:text-dark-text leading-none tracking-tight">
        {value}
      </p>
      <p className="text-[11px] text-teal dark:text-teal-light font-medium mt-1 truncate">{sub}</p>
    </div>
  );
}