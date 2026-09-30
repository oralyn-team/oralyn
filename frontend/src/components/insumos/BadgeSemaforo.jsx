export default function BadgeSemaforo({ eje, color }) {
  const config = {
    verde: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300',
      dot: 'bg-emerald-500',
      label: 'Óptimo'
    },
    amarillo: {
      bg: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300',
      dot: 'bg-amber-500',
      label: 'Alerta'
    },
    rojo: {
      bg: 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300',
      dot: 'bg-rose-500',
      label: 'Crítico'
    },
    gris: {
      bg: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400',
      dot: 'bg-slate-400',
      label: 'Sin fecha'
    }
  };

  const c = config[color] || config.gris;
  const tooltip = `${eje}: ${color ? color.toUpperCase() : 'N/A'}`;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium border rounded-full transition-all cursor-help whitespace-nowrap ${c.bg}`}
      title={tooltip}
    >
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      <span>{eje}: <strong className="capitalize">{color || 'n/a'}</strong></span>
    </span>
  );
}
