import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import BadgeSemaforo from './BadgeSemaforo';
import {
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
  Loader2,
  RefreshCw
} from 'lucide-react';

export default function AlertasInsumosWidget() {
  const navigate = useNavigate();
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchAlertas() {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getInsumosAlertas();
      setAlertas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar las alertas de insumos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Patrón aceptado: carga de datos al montar componente, ver docs/eslint-exceptions.md
    fetchAlertas();
  }, []);

  return (
    <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-xl p-5 shadow-sm flex flex-col font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-dark-border mb-3">
        <h3 className="text-[13px] font-semibold text-primary dark:text-dark-text flex items-center gap-1.5">
          <AlertTriangle size={15} className="text-amber-500 shrink-0" />
          Alertas de Insumos
        </h3>

        <button
          type="button"
          onClick={() => navigate('/insumos')}
          className="text-[11px] text-primary dark:text-teal hover:text-primary-light dark:hover:text-teal-light font-medium flex items-center gap-0.5 bg-transparent border-none cursor-pointer transition-colors"
        >
          Ver todos <ChevronRight size={13} />
        </button>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex items-center justify-center py-6 text-slate-500 dark:text-slate-400 gap-2">
          <Loader2 className="w-4 h-4 text-teal animate-spin" />
          <span className="text-[11px]">Cargando alertas de inventario...</span>
        </div>
      ) : error ? (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg text-amber-800 dark:text-amber-300 text-[11px] flex items-center justify-between gap-2">
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchAlertas}
            className="p-1 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded transition-colors text-amber-900 dark:text-amber-200 cursor-pointer shrink-0"
            title="Reintentar"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      ) : alertas.length === 0 ? (
        <div className="py-5 px-3 bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-lg text-center text-emerald-800 dark:text-emerald-300 text-xs flex flex-col items-center gap-1.5">
          <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400" />
          <span className="font-semibold">Todo el inventario está en orden ✓</span>
          <span className="text-[10px] text-emerald-700 dark:text-emerald-400">Sin insumos críticos ni próximos a vencer</span>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Contador Destacado */}
          <div className="p-2.5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-lg flex items-center justify-between text-xs">
            <span className="font-medium text-amber-900 dark:text-amber-200">Insumos que requieren atención:</span>
            <span className="px-2 py-0.5 bg-amber-500 text-white font-bold rounded-full text-[11px] tabular-nums">
              {alertas.length}
            </span>
          </div>

          {/* Lista corta (máx 5) */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {alertas.slice(0, 5).map((item) => (
              <div
                key={item.id}
                onClick={() => navigate('/insumos')}
                className="py-2 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 px-1 rounded-md transition-colors cursor-pointer group"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-primary dark:group-hover:text-teal transition-colors">
                    {item.nombre}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Stock: {item.cantidad_actual} {item.unidad_medida} (Mín: {item.stock_minimo})
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0 scale-90 origin-right">
                  <BadgeSemaforo eje="Venc" color={item.color_vencimiento} />
                  <BadgeSemaforo eje="Stock" color={item.color_stock} />
                </div>
              </div>
            ))}
          </div>

          {alertas.length > 5 && (
            <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 font-medium pt-1">
              + {alertas.length - 5} insumos más en alerta
            </p>
          )}
        </div>
      )}
    </div>
  );
}
