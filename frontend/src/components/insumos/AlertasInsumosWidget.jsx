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
    fetchAlertas();
  }, []);

  return (
    <div className="bg-white border border-teal-border rounded-xl p-5 shadow-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <h3 className="text-[13px] font-semibold text-primary flex items-center gap-1.5">
          <AlertTriangle size={15} className="text-amber-500 shrink-0" />
          Alertas de Insumos
        </h3>

        <button
          type="button"
          onClick={() => navigate('/insumos')}
          className="text-[11px] text-primary hover:text-primary-light font-medium flex items-center gap-0.5 bg-transparent border-none cursor-pointer"
        >
          Ver todos <ChevronRight size={13} />
        </button>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex items-center justify-center py-6 text-slate-500 gap-2">
          <Loader2 className="w-4 h-4 text-teal animate-spin" />
          <span className="text-[11px]">Cargando alertas de inventario...</span>
        </div>
      ) : error ? (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] flex items-center justify-between gap-2">
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchAlertas}
            className="p-1 hover:bg-amber-100 rounded transition-colors text-amber-900 cursor-pointer shrink-0"
            title="Reintentar"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      ) : alertas.length === 0 ? (
        <div className="py-5 px-3 bg-emerald-50/60 border border-emerald-200/80 rounded-lg text-center text-emerald-800 text-xs flex flex-col items-center gap-1.5">
          <CheckCircle2 size={20} className="text-emerald-600" />
          <span className="font-semibold">Todo el inventario está en orden ✓</span>
          <span className="text-[10px] text-emerald-700">Sin insumos críticos ni próximos a vencer</span>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Contador Destacado */}
          <div className="p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-lg flex items-center justify-between text-xs">
            <span className="font-medium text-amber-900">Insumos que requieren atención:</span>
            <span className="px-2 py-0.5 bg-amber-500 text-white font-bold rounded-full text-[11px] tabular-nums">
              {alertas.length}
            </span>
          </div>

          {/* Lista corta (máx 5) */}
          <div className="divide-y divide-slate-100">
            {alertas.slice(0, 5).map((item) => (
              <div
                key={item.id}
                onClick={() => navigate('/insumos')}
                className="py-2 flex items-center justify-between gap-2 hover:bg-slate-50 px-1 rounded-md transition-colors cursor-pointer group"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-slate-800 truncate group-hover:text-primary">
                    {item.nombre}
                  </p>
                  <p className="text-[10px] text-slate-500">
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
            <p className="text-[10px] text-center text-slate-400 font-medium pt-1">
              + {alertas.length - 5} insumos más en alerta
            </p>
          )}
        </div>
      )}
    </div>
  );
}
