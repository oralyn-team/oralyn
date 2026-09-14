import { useState, useEffect } from 'react';
import { api } from '../../api';
import InsumoFormModal from './InsumoFormModal';
import MovimientoModal from './MovimientoModal';
import { BadgeSemaforo } from './InsumosSeccion';
import {
  X,
  Package,
  Calendar,
  Tag,
  MapPin,
  Building2,
  Truck,
  FileCheck,
  History,
  Edit,
  ArrowUpDown,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

function formatearFecha(fechaStr) {
  if (!fechaStr) return 'Sin especificar';
  try {
    const f = new Date(fechaStr);
    if (isNaN(f.getTime())) return 'Sin especificar';
    return f.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return 'Sin especificar';
  }
}

function formatearFechaHora(fechaStr) {
  if (!fechaStr) return '—';
  try {
    const f = new Date(fechaStr);
    if (isNaN(f.getTime())) return '—';
    return f.toLocaleString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function BadgeMovimiento({ tipo }) {
  const t = (tipo || '').toLowerCase();
  const config = {
    entrada: { bg: 'bg-emerald-50 border-emerald-200 text-emerald-800', label: 'Entrada (+)' },
    salida: { bg: 'bg-rose-50 border-rose-200 text-rose-800', label: 'Salida (-)' },
    ajuste: { bg: 'bg-amber-50 border-amber-200 text-amber-800', label: 'Ajuste (=)' },
  };

  const c = config[t] || { bg: 'bg-slate-100 border-slate-200 text-slate-700', label: tipo };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold border rounded-full capitalize ${c.bg}`}>
      {c.label}
    </span>
  );
}

export default function InsumoDetalleModal({ insumoId, onClose, onRefreshList }) {
  const [insumo, setInsumo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modalEditar, setModalEditar] = useState(false);
  const [modalMovimiento, setModalMovimiento] = useState(false);

  async function fetchInsumo() {
    if (!insumoId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await api.getInsumo(insumoId);
      setInsumo(data);
    } catch (err) {
      console.error(err);
      setError(err?.error || err?.message || 'Error al cargar el detalle del insumo');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInsumo();
  }, [insumoId]);

  function handleSuccessAccion(msg) {
    fetchInsumo();
    if (onRefreshList) onRefreshList(msg);
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] border border-teal-border shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 bg-primary text-white">
          <div className="flex items-start gap-3">
            <Package className="w-6 h-6 text-teal shrink-0 mt-1" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-semibold">
                  {loading ? 'Cargando insumo...' : (insumo?.nombre || 'Detalle del Insumo')}
                </h2>
                {insumo?.categoria && (
                  <span className="px-2 py-0.5 bg-white/15 text-teal-light text-[11px] font-medium rounded-full">
                    {insumo.categoria}
                  </span>
                )}
              </div>
              {insumo && (
                <div className="flex items-center gap-2 mt-2">
                  <BadgeSemaforo eje="Vencimiento" color={insumo.color_vencimiento} />
                  <BadgeSemaforo eje="Stock" color={insumo.color_stock} />
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
              <p className="text-xs font-medium">Cargando datos detallados...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex flex-col items-start gap-2">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Error al cargar el insumo</span>
              </div>
              <p className="text-rose-700">{error}</p>
              <button
                type="button"
                onClick={fetchInsumo}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reintentar
              </button>
            </div>
          ) : insumo && (
            <>
              {/* Botones de Acción directos */}
              <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-teal-border shadow-2xs gap-3">
                <div className="text-xs text-slate-600">
                  Stock actual: <strong className="text-slate-900 text-sm">{insumo.cantidad_actual} {insumo.unidad_medida}</strong> (mínimo: {insumo.stock_minimo})
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalMovimiento(true)}
                    className="px-3 py-1.5 text-xs font-medium text-teal-dark bg-teal-panel border border-teal-soft rounded-lg hover:bg-teal-info transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5 text-teal" />
                    <span>Registrar movimiento</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalEditar(true)}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary-light transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                </div>
              </div>

              {/* Ficha Técnica / Datos completos */}
              <div className="bg-white rounded-xl border border-teal-border p-4 shadow-2xs space-y-3">
                <h3 className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <Tag className="w-4 h-4 text-teal" /> Ficha del Insumo
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase font-medium">Unidad de medida</span>
                    <span className="font-medium text-slate-800">{insumo.unidad_medida || 'Sin especificar'}</span>
                  </div>

                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase font-medium">Cantidad actual</span>
                    <span className="font-semibold text-slate-900">{insumo.cantidad_actual} {insumo.unidad_medida}</span>
                  </div>

                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase font-medium">Stock mínimo</span>
                    <span className="font-medium text-slate-700">{insumo.stock_minimo} {insumo.unidad_medida}</span>
                  </div>

                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase font-medium">Ubicación</span>
                    <span className="font-medium text-slate-800 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {insumo.ubicacion || 'Sin especificar'}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase font-medium">Lote</span>
                    <span className="font-mono text-slate-700">{insumo.lote || 'Sin especificar'}</span>
                  </div>

                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase font-medium">Registro INVIMA</span>
                    <span className="font-medium text-slate-800 flex items-center gap-1">
                      <FileCheck className="w-3 h-3 text-slate-400" />
                      {insumo.registro_invima || 'Sin especificar'}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase font-medium">Fabricante</span>
                    <span className="font-medium text-slate-800 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-slate-400" />
                      {insumo.fabricante || 'Sin especificar'}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase font-medium">Proveedor</span>
                    <span className="font-medium text-slate-800 flex items-center gap-1">
                      <Truck className="w-3 h-3 text-slate-400" />
                      {insumo.proveedor || 'Sin especificar'}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase font-medium">Fecha de vencimiento</span>
                    <span className="font-medium text-slate-800 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {formatearFecha(insumo.fecha_vencimiento)}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase font-medium">Fecha de apertura</span>
                    <span className="font-medium text-slate-800 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {formatearFecha(insumo.fecha_apertura)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Histórico de Movimientos */}
              <div className="bg-white rounded-xl border border-teal-border p-4 shadow-2xs space-y-3">
                <h3 className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <History className="w-4 h-4 text-teal" /> Histórico de Movimientos ({insumo.movimientos?.length || 0})
                </h3>

                {!insumo.movimientos || insumo.movimientos.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    Aún no se han registrado movimientos para este insumo.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-[10px] uppercase">
                          <th className="px-3 py-2">Fecha y hora</th>
                          <th className="px-3 py-2">Tipo</th>
                          <th className="px-3 py-2 text-right">Cantidad</th>
                          <th className="px-3 py-2">Motivo / Observación</th>
                          <th className="px-3 py-2 text-center">Usuario ID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {insumo.movimientos.map((mov) => (
                          <tr key={mov.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">
                              {formatearFechaHora(mov.fecha)}
                            </td>
                            <td className="px-3 py-2.5">
                              <BadgeMovimiento tipo={mov.tipo} />
                            </td>
                            <td className="px-3 py-2.5 text-right font-bold text-slate-900 whitespace-nowrap">
                              {mov.cantidad} <span className="text-[10px] font-normal text-slate-500">{insumo.unidad_medida}</span>
                            </td>
                            <td className="px-3 py-2.5 text-slate-600">
                              {mov.motivo || '—'}
                            </td>
                            <td className="px-3 py-2.5 text-center text-[11px] text-slate-400 font-mono">
                              {mov.usuario_id || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modales incrustados para reusar lógica sin duplicar */}
        {modalEditar && insumo && (
          <InsumoFormModal
            insumoEditar={insumo}
            onClose={() => setModalEditar(false)}
            onSuccess={handleSuccessAccion}
          />
        )}

        {modalMovimiento && insumo && (
          <MovimientoModal
            insumo={insumo}
            onClose={() => setModalMovimiento(false)}
            onSuccess={handleSuccessAccion}
          />
        )}
      </div>
    </div>
  );
}
