import { useState, useEffect } from 'react';
import { api } from '../../api';
import { X, Package, AlertCircle, Loader2 } from 'lucide-react';

const ESTADO_INICIAL = {
  nombre: '',
  categoria: '',
  unidad_medida: 'Unidad',
  cantidad_actual: '',
  stock_minimo: '',
  lote: '',
  registro_invima: '',
  fabricante: '',
  proveedor: '',
  fecha_vencimiento: '',
  fecha_apertura: '',
  ubicacion: '',
};

function esNumeroValido(valor) {
  return valor !== undefined && valor !== '' && !isNaN(Number(valor)) && Number(valor) >= 0;
}

function Field({
  name,
  label,
  placeholder,
  type = 'text',
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  helpText = null,
}) {
  return (
    <div className="mb-3">
      <label className="block text-[11px] font-medium text-slate-700 uppercase tracking-wider mb-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-3 py-2 border text-xs rounded-lg outline-none transition-colors ${
          disabled
            ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
            : 'bg-white border-slate-300 focus:border-teal focus:ring-1 focus:ring-teal text-slate-800'
        } ${error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : ''}`}
      />
      {helpText && <p className="text-[11px] text-amber-700 mt-0.5">{helpText}</p>}
      {error && <p role="alert" className="text-[11px] text-rose-600 mt-0.5">{error}</p>}
    </div>
  );
}

export default function InsumoFormModal({ insumoEditar, onClose, onSuccess }) {
  const [form, setForm] = useState(ESTADO_INICIAL);
  const [errs, setErrs] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [errorApi, setErrorApi] = useState(null);

  const esEdicion = Boolean(insumoEditar);

  useEffect(() => {
    if (insumoEditar) {
      setForm({
        nombre: insumoEditar.nombre || '',
        categoria: insumoEditar.categoria || '',
        unidad_medida: insumoEditar.unidad_medida || 'Unidad',
        cantidad_actual: insumoEditar.cantidad_actual !== undefined ? String(insumoEditar.cantidad_actual) : '',
        stock_minimo: insumoEditar.stock_minimo !== undefined ? String(insumoEditar.stock_minimo) : '',
        lote: insumoEditar.lote || '',
        registro_invima: insumoEditar.registro_invima || '',
        fabricante: insumoEditar.fabricante || '',
        proveedor: insumoEditar.proveedor || '',
        fecha_vencimiento: insumoEditar.fecha_vencimiento ? insumoEditar.fecha_vencimiento.substring(0, 10) : '',
        fecha_apertura: insumoEditar.fecha_apertura ? insumoEditar.fecha_apertura.substring(0, 10) : '',
        ubicacion: insumoEditar.ubicacion || '',
      });
    } else {
      setForm(ESTADO_INICIAL);
    }
  }, [insumoEditar]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errs[name]) {
      setErrs((prev) => ({ ...prev, [name]: '' }));
    }
  }

  function validar() {
    const e = {};
    if (!form.nombre.trim()) {
      e.nombre = 'El nombre es obligatorio';
    }
    if (!form.unidad_medida.trim()) {
      e.unidad_medida = 'La unidad de medida es obligatoria';
    }
    if (!esEdicion) {
      if (!esNumeroValido(form.cantidad_actual)) {
        e.cantidad_actual = 'Debe ser un número válido mayor o igual a 0';
      }
    }
    if (!esNumeroValido(form.stock_minimo)) {
      e.stock_minimo = 'Debe ser un número válido mayor o igual a 0';
    }
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorApi(null);

    const errores = validar();
    if (Object.keys(errores).length > 0) {
      setErrs(errores);
      return;
    }

    setGuardando(true);

    try {
      if (esEdicion) {
        const payload = {
          nombre: form.nombre.trim(),
          categoria: form.categoria.trim() || null,
          unidad_medida: form.unidad_medida.trim(),
          stock_minimo: Number(form.stock_minimo),
          lote: form.lote.trim() || null,
          registro_invima: form.registro_invima.trim() || null,
          fabricante: form.fabricante.trim() || null,
          proveedor: form.proveedor.trim() || null,
          fecha_vencimiento: form.fecha_vencimiento ? new Date(form.fecha_vencimiento).toISOString() : null,
          fecha_apertura: form.fecha_apertura ? new Date(form.fecha_apertura).toISOString() : null,
          ubicacion: form.ubicacion.trim() || null,
        };
        await api.actualizarInsumo(insumoEditar.id, payload);
      } else {
        const payload = {
          nombre: form.nombre.trim(),
          categoria: form.categoria.trim() || null,
          unidad_medida: form.unidad_medida.trim(),
          cantidad_actual: Number(form.cantidad_actual),
          stock_minimo: Number(form.stock_minimo),
          lote: form.lote.trim() || null,
          registro_invima: form.registro_invima.trim() || null,
          fabricante: form.fabricante.trim() || null,
          proveedor: form.proveedor.trim() || null,
          fecha_vencimiento: form.fecha_vencimiento ? new Date(form.fecha_vencimiento).toISOString() : null,
          fecha_apertura: form.fecha_apertura ? new Date(form.fecha_apertura).toISOString() : null,
          ubicacion: form.ubicacion.trim() || null,
        };
        await api.crearInsumo(payload);
      }

      onSuccess(esEdicion ? 'Insumo actualizado correctamente' : 'Insumo creado correctamente');
      onClose();
    } catch (err) {
      console.error(err);
      setErrorApi(err?.error || err?.message || 'Error al guardar el insumo');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] border border-teal-border shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-primary text-white">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-teal" />
            <h2 className="text-sm font-semibold">
              {esEdicion ? 'Editar Insumo' : 'Nuevo Insumo'}
            </h2>
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
        <form onSubmit={handleSubmit} className="px-5 py-4 overflow-y-auto space-y-4 flex-1">
          {errorApi && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorApi}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Field
              name="nombre"
              label="Nombre del insumo"
              placeholder="Ej: Lidocaína 2% con Epinefrina"
              value={form.nombre}
              onChange={handleChange}
              error={errs.nombre}
              required
            />

            <Field
              name="categoria"
              label="Categoría"
              placeholder="Ej: Anestesia, Restauración, EPP..."
              value={form.categoria}
              onChange={handleChange}
            />

            <Field
              name="unidad_medida"
              label="Unidad de medida"
              placeholder="Ej: Cartucho, Caja, Frasco, Unidad"
              value={form.unidad_medida}
              onChange={handleChange}
              error={errs.unidad_medida}
              required
            />

            <Field
              name="stock_minimo"
              label="Stock mínimo"
              placeholder="Ej: 10"
              type="number"
              value={form.stock_minimo}
              onChange={handleChange}
              error={errs.stock_minimo}
              required
            />

            <Field
              name="cantidad_actual"
              label="Cantidad actual"
              placeholder="Ej: 50"
              type="number"
              value={form.cantidad_actual}
              onChange={handleChange}
              error={errs.cantidad_actual}
              required={!esEdicion}
              disabled={esEdicion}
              helpText={esEdicion ? 'Para ajustar cantidad, usa Registrar movimiento' : null}
            />

            <Field
              name="ubicacion"
              label="Ubicación"
              placeholder="Ej: Gaveta 3, Estante B"
              value={form.ubicacion}
              onChange={handleChange}
            />

            <Field
              name="lote"
              label="Lote"
              placeholder="Ej: LOT-2026-X9"
              value={form.lote}
              onChange={handleChange}
            />

            <Field
              name="registro_invima"
              label="Registro INVIMA"
              placeholder="Ej: INVIMA 2021DM-00234"
              value={form.registro_invima}
              onChange={handleChange}
            />

            <Field
              name="fabricante"
              label="Fabricante"
              placeholder="Ej: 3M ESPE, Dentsply"
              value={form.fabricante}
              onChange={handleChange}
            />

            <Field
              name="proveedor"
              label="Proveedor"
              placeholder="Ej: Depósito Dental Central"
              value={form.proveedor}
              onChange={handleChange}
            />

            <Field
              name="fecha_vencimiento"
              label="Fecha de vencimiento"
              type="date"
              value={form.fecha_vencimiento}
              onChange={handleChange}
            />

            <Field
              name="fecha_apertura"
              label="Fecha de apertura"
              type="date"
              value={form.fecha_apertura}
              onChange={handleChange}
            />
          </div>

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
              <span>{esEdicion ? 'Actualizar insumo' : 'Guardar insumo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
