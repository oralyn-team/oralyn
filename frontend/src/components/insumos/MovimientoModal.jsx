import { useState } from 'react';
import { api } from '../../api';
import { X, ArrowUpDown, AlertCircle, Loader2, Info } from 'lucide-react';

function esNumeroValido(valor) {
  return valor !== undefined && valor !== '' && !isNaN(Number(valor)) && Number(valor) >= 0;
}

export default function MovimientoModal({ insumo, onClose, onSuccess }) {
  const [tipo, setTipo] = useState('entrada');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [errCantidad, setErrCantidad] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorApi, setErrorApi] = useState(null);

  if (!insumo) return null;

  const numActual = Number(insumo.cantidad_actual || 0);
  const numCantidad = Number(cantidad || 0);

  let cantidadResultante = numActual;
  if (tipo === 'entrada') {
    cantidadResultante = numActual + numCantidad;
  } else if (tipo === 'salida') {
    cantidadResultante = numActual - numCantidad;
  } else if (tipo === 'ajuste') {
    cantidadResultante = numCantidad;
  }

  // Redondear a 2 decimales limpios
  const resultanteLimpia = Math.round(cantidadResultante * 100) / 100;
  const esSalidaInvalida = tipo === 'salida' && cantidadResultante < 0;

  const descripcionesTipo = {
    entrada: 'Suma la cantidad ingresada al inventario actual.',
    salida: 'Resta la cantidad ingresada del inventario actual.',
    ajuste: 'Reemplaza la cantidad actual por el nuevo valor ingresado.',
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorApi(null);

    if (!esNumeroValido(cantidad)) {
      setErrCantidad('Debe ingresar un número mayor o igual a 0');
      return;
    }

    setErrCantidad('');
    setGuardando(true);

    try {
      const payload = {
        tipo,
        cantidad: Number(cantidad),
        motivo: motivo.trim() || undefined,
      };

      await api.registrarMovimientoInsumo(insumo.id, payload);
      onSuccess('Movimiento registrado correctamente');
      onClose();
    } catch (err) {
      console.error(err);
      setErrorApi(err?.error || err?.message || 'Error al registrar el movimiento');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl w-full max-w-lg border border-teal-border shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 bg-primary text-white">
          <div className="flex items-start gap-2.5">
            <ArrowUpDown className="w-5 h-5 text-teal shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-semibold">Registrar movimiento</h2>
              <p className="text-xs text-teal-light mt-0.5">
                {insumo.nombre} (actual: <strong className="text-white">{insumo.cantidad_actual} {insumo.unidad_medida}</strong>)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4 overflow-y-auto">
          {errorApi && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorApi}</span>
            </div>
          )}

          {/* Tipo de movimiento */}
          <div>
            <label className="block text-[11px] font-medium text-slate-700 uppercase tracking-wider mb-1.5">
              Tipo de movimiento <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'entrada', label: 'Entrada (+)', color: 'hover:border-emerald-500 active:bg-emerald-50' },
                { key: 'salida', label: 'Salida (-)', color: 'hover:border-rose-500 active:bg-rose-50' },
                { key: 'ajuste', label: 'Ajuste (=)', color: 'hover:border-amber-500 active:bg-amber-50' },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTipo(t.key)}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-all cursor-pointer ${
                    tipo === t.key
                      ? 'bg-primary text-white border-primary shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-teal shrink-0" />
              <span>{descripcionesTipo[tipo]}</span>
            </p>
          </div>

          {/* Cantidad */}
          <div>
            <label className="block text-[11px] font-medium text-slate-700 uppercase tracking-wider mb-1">
              Cantidad ({insumo.unidad_medida}) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={cantidad}
              onChange={(e) => {
                setCantidad(e.target.value);
                if (errCantidad) setErrCantidad('');
              }}
              placeholder="Ej: 10"
              className={`w-full px-3 py-2 border text-xs rounded-lg outline-none transition-colors ${
                errCantidad
                  ? 'border-rose-500 focus:border-rose-500'
                  : 'bg-white border-slate-300 focus:border-teal focus:ring-1 focus:ring-teal text-slate-800'
              }`}
            />
            {errCantidad && <p role="alert" className="text-[11px] text-rose-600 mt-0.5">{errCantidad}</p>}
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-[11px] font-medium text-slate-700 uppercase tracking-wider mb-1">
              Motivo / Observación <span className="text-slate-400 font-normal text-[10px]">(opcional)</span>
            </label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Compra mensual, Uso clínico, Conteo físico"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-teal focus:ring-1 focus:ring-teal text-slate-800"
            />
          </div>

          {/* Previsualización en tiempo real */}
          <div className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
            esSalidaInvalida
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-teal-panel border-teal-soft text-slate-700'
          }`}>
            <span className="font-medium">Cantidad resultante:</span>
            <span className="font-bold text-slate-900 text-sm">
              {cantidad !== '' && !isNaN(Number(cantidad)) ? resultanteLimpia : insumo.cantidad_actual} {insumo.unidad_medida}
            </span>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-4 py-2 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary-light transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {guardando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Registrar movimiento</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
