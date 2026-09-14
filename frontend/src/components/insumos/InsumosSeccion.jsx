import { useState, useEffect } from 'react';
import { api } from '../../api';
import StatCard from '../StatCard';
import SearchBar from '../SearchBar';
import InsumoFormModal from './InsumoFormModal';
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Loader2,
  RefreshCw,
  Calendar,
  Edit
} from 'lucide-react';

function BadgeSemaforo({ eje, color }) {
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

function formatearFecha(fechaStr) {
  if (!fechaStr) return 'Sin fecha';
  try {
    const f = new Date(fechaStr);
    if (isNaN(f.getTime())) return 'Sin fecha';
    return f.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return 'Sin fecha';
  }
}

export default function InsumosSeccion() {
  const [insumos, setInsumos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [toast, setToast] = useState(null);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [insumoEditar, setInsumoEditar] = useState(null);

  async function cargarInsumos() {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getInsumos();
      setInsumos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(err?.error || err?.message || 'Error al cargar los insumos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarInsumos();
  }, []);

  function mostrarToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }

  function handleNuevoInsumo() {
    setInsumoEditar(null);
    setModalAbierto(true);
  }

  function handleEditarInsumo(item) {
    setInsumoEditar(item);
    setModalAbierto(true);
  }

  function handleSuccessForm(msg) {
    mostrarToast(msg);
    cargarInsumos();
  }

  // Filtrado de insumos
  const insumosFiltrados = insumos.filter((item) => {
    const q = busqueda.toLowerCase().trim();
    const coincideTexto =
      (item.nombre || '').toLowerCase().includes(q) ||
      (item.categoria || '').toLowerCase().includes(q) ||
      (item.proveedor || '').toLowerCase().includes(q) ||
      (item.ubicacion || '').toLowerCase().includes(q);

    let coincideFiltro = true;
    if (filtroEstado === 'Alertas') {
      coincideFiltro =
        item.color_stock === 'amarillo' ||
        item.color_stock === 'rojo' ||
        item.color_vencimiento === 'amarillo' ||
        item.color_vencimiento === 'rojo';
    } else if (filtroEstado === 'Stock Bajo') {
      coincideFiltro = item.color_stock === 'amarillo' || item.color_stock === 'rojo';
    } else if (filtroEstado === 'Próximos a Vencer') {
      coincideFiltro = item.color_vencimiento === 'amarillo' || item.color_vencimiento === 'rojo';
    }

    return coincideTexto && coincideFiltro;
  });

  // Estadísticas para las StatCards
  const totalCount = insumos.length;
  const optimosCount = insumos.filter(i => i.color_stock === 'verde' && i.color_vencimiento === 'verde').length;
  const alertasCount = insumos.filter(i => i.color_stock === 'amarillo' || i.color_vencimiento === 'amarillo').length;
  const criticosCount = insumos.filter(i => i.color_stock === 'rojo' || i.color_vencimiento === 'rojo').length;

  const stats = [
    { label: 'Total insumos', value: totalCount, sub: 'en inventario activo', accentColor: '#3ECFCF' },
    { label: 'Estado Óptimo', value: optimosCount, sub: 'sin novedades', accentColor: '#5DC2A4' },
    { label: 'En Alerta', value: alertasCount, sub: 'stock / vencimiento', accentColor: '#EF9F27' },
    { label: 'Críticos', value: criticosCount, sub: 'requieren atención urgente', accentColor: '#E54D42' },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-teal-soft">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-600">Cargando inventario de insumos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex flex-col items-start gap-3">
        <div className="flex items-center gap-2 font-medium">
          <XCircle className="w-5 h-5 text-rose-600" />
          <span>Error al conectar con la API de insumos</span>
        </div>
        <p className="text-xs text-rose-700">{error}</p>
        <button
          type="button"
          onClick={cargarInsumos}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Tarjetas de Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Contenedor Principal de la Sección */}
      <div className="bg-white border border-teal-border rounded-xl overflow-hidden shadow-xs">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 py-4 border-b border-teal-soft gap-3">
          <div>
            <h2 className="text-sm font-semibold text-primary flex items-center gap-2">
              <Package className="w-4 h-4 text-teal" />
              Semaforización de Insumos ({insumosFiltrados.length})
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Control de inventario, stock mínimo y semáforo bi-axial de vencimiento.
            </p>
          </div>

          <button
            type="button"
            onClick={handleNuevoInsumo}
            className="text-xs text-white font-medium px-4 py-2 bg-primary rounded-lg cursor-pointer hover:bg-primary-light transition-colors whitespace-nowrap flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" /> Nuevo insumo
          </button>
        </div>

        {/* Buscador y Filtros */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-5 py-3 bg-teal-panel border-b border-teal-soft">
          <div className="w-full sm:w-72">
            <SearchBar busqueda={busqueda} onBuscar={setBusqueda} placeholder="Buscar por nombre, categoría, proveedor..." />
          </div>

          {/* Chips de filtro */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['Todos', 'Alertas', 'Stock Bajo', 'Próximos a Vencer'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFiltroEstado(f)}
                className={`px-3 py-1 text-xs rounded-full font-medium transition-all whitespace-nowrap ${
                  filtroEstado === f
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla Desktop (hidden md:table) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-teal-soft uppercase text-[10px] tracking-wider">
                <th className="px-5 py-3">Insumo</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Stock Actual</th>
                <th className="px-4 py-3">Stock Mínimo</th>
                <th className="px-4 py-3">Vencimiento</th>
                <th className="px-5 py-3 text-center">Estado (Vencimiento / Stock)</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-teal-soft text-slate-700 font-sans">
              {insumosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                    No se encontraron insumos que coincidan con la búsqueda o filtro seleccionado.
                  </td>
                </tr>
              ) : (
                insumosFiltrados.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900">{item.nombre}</div>
                      {item.ubicacion && (
                        <div className="text-[10px] text-slate-500">Ubicación: {item.ubicacion}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] rounded font-medium">
                        {item.categoria || 'Sin categoría'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {item.cantidad_actual} <span className="text-[11px] font-normal text-slate-500">{item.unidad_medida}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {item.stock_minimo} <span className="text-[11px] text-slate-400">{item.unidad_medida}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatearFecha(item.fecha_vencimiento)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <BadgeSemaforo eje="Vencimiento" color={item.color_vencimiento} />
                        <BadgeSemaforo eje="Stock" color={item.color_stock} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleEditarInsumo(item)}
                        className="p-1.5 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Editar insumo"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Vista Mobile en Cards (block md:hidden) */}
        <div className="block md:hidden divide-y divide-teal-soft">
          {insumosFiltrados.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No se encontraron insumos que coincidan con la búsqueda.
            </div>
          ) : (
            insumosFiltrados.map((item) => (
              <div key={item.id} className="p-4 space-y-2.5 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="text-xs font-semibold text-slate-900">{item.nombre}</h3>
                    <span className="inline-block mt-0.5 px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded font-medium">
                      {item.categoria || 'General'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-xs font-bold text-primary">
                        {item.cantidad_actual} {item.unidad_medida}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Min: {item.stock_minimo} {item.unidad_medida}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleEditarInsumo(item)}
                      className="p-1.5 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-slate-200 shrink-0"
                      title="Editar insumo"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Vence: {formatearFecha(item.fecha_vencimiento)}</span>
                </div>

                {/* Badges lado a lado */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                  <BadgeSemaforo eje="Vencimiento" color={item.color_vencimiento} />
                  <BadgeSemaforo eje="Stock" color={item.color_stock} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Formulario Insumo */}
      {modalAbierto && (
        <InsumoFormModal
          insumoEditar={insumoEditar}
          onClose={() => setModalAbierto(false)}
          onSuccess={handleSuccessForm}
        />
      )}

      {/* Toast Notificación */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-primary text-white text-xs px-4 py-2.5 rounded-full whitespace-nowrap z-50 shadow-lg animate-toast flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
