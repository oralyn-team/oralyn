export default function BadgeSemaforo({ eje, color }) {
  const config = {
    verde: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      dot: 'bg-emerald-500',
      label: 'Óptimo'
    },
    amarillo: {
      bg: 'bg-amber-50 border-amber-200 text-amber-800',
      dot: 'bg-amber-500',
      label: 'Alerta'
    },
    rojo: {
      bg: 'bg-rose-50 border-rose-200 text-rose-800',
      dot: 'bg-rose-500',
      label: 'Crítico'
    },
    gris: {
      bg: 'bg-slate-100 border-slate-200 text-slate-600',
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
