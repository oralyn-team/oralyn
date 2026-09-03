// src/components/facturacion/GenerarFacturaModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Receipt,
  User,
  FileText,
  CreditCard,
  CheckCircle,
  X,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Plus,
  Trash2,
  FileCheck,
  Settings
} from 'lucide-react';
import { invoiceService } from '../../services/invoiceService';
import { useApp } from '../../context/Appcontext';
import { api } from '../../api';

function fmtCOP(val) {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
}

export default function GenerarFacturaModal({ data, onClose, onFacturaCreada }) {
  const { pacientes, configuracion } = useApp();

  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState(null);
  const [facturaCreada, setFacturaCreada] = useState(null);

  const facturacionHabilitada = Boolean(configuracion?.facturacion_habilitada);

  // Lista segura de pacientes
  const safePacientes = Array.isArray(pacientes) ? pacientes : [];

  // Selección de paciente
  const [selectedPacienteId, setSelectedPacienteId] = useState(() => {
    return data?.patient?.id || data?.paciente?.id || data?.paciente_id || data?.pacienteId || (safePacientes?.[0]?.id || '');
  });

  // Cotizaciones y pagos del paciente seleccionado
  const [cotizaciones, setCotizaciones] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [loadingOrigen, setLoadingOrigen] = useState(false);
  const [selectedCotizacionId, setSelectedCotizacionId] = useState(data?.cotizacion_id || data?.cotizacionId || '');
  const [selectedPagoId, setSelectedPagoId] = useState(data?.pago_id || data?.pagoId || '');

  const pacienteSeleccionado = safePacientes.find(p => String(p.id) === String(selectedPacienteId)) || data?.patient || data?.paciente || {
    nombre: data?.info?.pacienteNombre || 'Paciente',
    tipoDocumento: 'CC',
    documento: data?.info?.pacienteDocumento || '',
    email: data?.info?.pacienteEmail || '',
    telefono: data?.info?.pacienteTelefono || ''
  };

  const pacienteNombre = pacienteSeleccionado.nombre || `${pacienteSeleccionado.nombres || ''} ${pacienteSeleccionado.primer_apellido || ''}`.trim();
  const pacienteDoc = pacienteSeleccionado.documento || pacienteSeleccionado.numero_documento;
  const pacienteTipoDoc = pacienteSeleccionado.tipoDocumento || pacienteSeleccionado.tipo_documento || 'CC';

  // Items de la factura
  const [items, setItems] = useState(() => {
    if (data?.procedimientos || data?.items) {
      const raw = data.procedimientos || data.items;
      if (Array.isArray(raw)) {
        return raw.map(p => {
          const q = Number(p.quantity || p.cantidad) || 1;
          const sub = p.total !== undefined && p.total !== null ? Number(p.total) : (p.subtotal !== undefined && p.subtotal !== null ? Number(p.subtotal) : (Number(p.unitPrice || p.valorUnitario || 0) * q));
          const uPrice = q > 0 ? (sub / q) : Number(p.unitPrice || p.valorUnitario || 0);
          return {
            cupsCode: p.cupsCode || p.codigoCups || p.codigo || '890201',
            description: p.description || p.nombre || p.procedimiento || 'Procedimiento odontológico',
            quantity: q,
            unitPrice: uPrice,
            total: sub
          };
        });
      }
    }
    return [
      { cupsCode: '890201', description: 'Consulta odontológica de tratamiento', quantity: 1, unitPrice: data?.totales?.subtotal || data?.monto || 150000, total: data?.totales?.subtotal || data?.monto || 150000 }
    ];
  });

  const [metodoPago, setMetodoPago] = useState(data?.metodoPago || data?.pagoMetodo || 'efectivo');
  const [observaciones, setObservaciones] = useState(data?.observacion || '');

  // Cargar cotizaciones y pagos cuando cambie el paciente seleccionado
  useEffect(() => {
    if (!selectedPacienteId) return;
    let cancel = false;
    setLoadingOrigen(true);

    Promise.all([
      api.getCotizacionesPaciente(selectedPacienteId).catch(() => []),
      api.getPagosPaciente(selectedPacienteId).catch(() => [])
    ]).then(([cotRes, pagRes]) => {
      if (cancel) return;
      setCotizaciones(Array.isArray(cotRes) ? cotRes : (Array.isArray(cotRes?.data) ? cotRes.data : []));
      setPagos(Array.isArray(pagRes) ? pagRes : (Array.isArray(pagRes?.data) ? pagRes.data : []));
    }).finally(() => {
      if (!cancel) setLoadingOrigen(false);
    });

    return () => { cancel = true; };
  }, [selectedPacienteId]);

  const safeCotizaciones = Array.isArray(cotizaciones) ? cotizaciones : [];
  const safePagos = Array.isArray(pagos) ? pagos : [];
  const safeItems = Array.isArray(items) ? items : [];

  // Manejar selección de cotización pre-llenando los items
  const handleSelectCotizacion = (cotId) => {
    setSelectedCotizacionId(cotId);
    setSelectedPagoId('');
    if (!cotId) return;

    const cot = safeCotizaciones.find(c => String(c.id) === String(cotId));
    if (cot && Array.isArray(cot.procedimientos) && cot.procedimientos.length > 0) {
      setItems(cot.procedimientos.map(p => {
        const q = Number(p.cantidad) || 1;
        const sub = p.subtotal !== undefined && p.subtotal !== null ? Number(p.subtotal) : (Number(p.valor_unitario || 0) * q);
        const uPrice = q > 0 ? (sub / q) : Number(p.valor_unitario || 0);
        return {
          cupsCode: p.procedimiento_consultorio?.catalogo_oficial?.codigo_cups || p.codigo_cups || '890201',
          description: p.procedimiento || p.descripcion || 'Procedimiento odontológico',
          quantity: q,
          unitPrice: uPrice,
          total: sub
        };
      }));
    }
  };

  // Manejar selección de pago
  const handleSelectPago = (pagoId) => {
    setSelectedPagoId(pagoId);
    setSelectedCotizacionId('');
    if (!pagoId) return;

    const pg = safePagos.find(p => String(p.id) === String(pagoId));
    if (pg) {
      const monto = Number(pg.monto) || 0;
      setItems([
        {
          cupsCode: '890201',
          description: pg.concepto || 'Pago de tratamiento odontológico',
          quantity: 1,
          unitPrice: monto,
          total: monto
        }
      ]);
      if (pg.metodo_pago) {
        setMetodoPago(pg.metodo_pago);
      }
    }
  };

  const subtotal = safeItems.reduce((acc, curr) => acc + Number(curr.total ?? (Number(curr.unitPrice || 0) * Number(curr.quantity || 1))), 0);
  const descuento = data?.totales?.descuento ?? 0;
  const impuesto = data?.totales?.impuesto ?? 0;
  const total = subtotal - descuento + impuesto;

  const handleAddItem = () => {
    setItems(prev => [
      ...(Array.isArray(prev) ? prev : []),
      { cupsCode: '890201', description: 'Procedimiento odontológico', quantity: 1, unitPrice: 50000, total: 50000 }
    ]);
  };

  const handleRemoveItem = (index) => {
    if (safeItems.length <= 1) return;
    setItems(prev => (Array.isArray(prev) ? prev : []).filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const next = [...(Array.isArray(prev) ? prev : [])];
      if (!next[index]) return prev;
      next[index] = { ...next[index], [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        const q = Number(next[index].quantity) || 0;
        const p = Number(next[index].unitPrice) || 0;
        next[index].total = q * p;
      }
      return next;
    });
  };

  const handleConfirmarGeneracion = async () => {
    setGenerando(true);
    setError(null);

    const targetPatientId = selectedPacienteId || pacienteSeleccionado.id;
    if (!targetPatientId) {
      setError('Debes seleccionar un paciente para generar la factura.');
      setGenerando(false);
      return;
    }

    try {
      const inv = await invoiceService.createInvoice({
        patientId: targetPatientId,
        cotizacionId: selectedCotizacionId || undefined,
        pagoId: selectedPagoId || undefined,
        patient: {
          id: targetPatientId,
          nombre: pacienteNombre,
          tipoDocumento: pacienteTipoDoc,
          documento: pacienteDoc
        },
        items: safeItems,
        subtotal,
        discount: descuento,
        tax: impuesto,
        total,
        paymentMethod: metodoPago,
        observacion: observaciones
      });

      setFacturaCreada(inv);
      if (onFacturaCreada) onFacturaCreada(inv);
    } catch (err) {
      console.error('Error generando factura:', err);
      setError(err.error || err.message || err.detalle || 'No fue posible generar la factura electrónica.');
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-primary/45 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && !generando && onClose()}
    >
      <div className="bg-white dark:bg-dark-card rounded-2xl w-full max-w-lg shadow-soft-lg border border-teal-border dark:border-dark-border flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-teal-soft dark:border-dark-border bg-primary dark:bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
              <Receipt size={18} className="text-teal-light" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-white">Generar Factura Electrónica</h3>
              <p className="text-[11px] text-teal-light dark:text-slate-400 mt-0.5">Emisión oficial DIAN (Factus)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={generando}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer touch-target flex items-center justify-center disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-primary dark:text-dark-text">
          {facturaCreada ? (
            /* Estado Exitoso de Creación */
            <div className="py-6 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-900/50 shadow-soft-sm">
                <CheckCircle size={32} />
              </div>
              <h4 className="text-[16px] font-bold text-primary dark:text-dark-text">Factura creada correctamente</h4>
              <p className="text-[12px] text-teal-muted dark:text-slate-400">
                Se ha generado el documento electrónico número <strong className="text-primary dark:text-teal font-semibold font-mono text-[13px]">{facturaCreada.number}</strong>.
              </p>
              
              <div className="p-3.5 bg-teal-panel dark:bg-slate-800/60 border border-teal-border dark:border-dark-border rounded-xl text-left text-[11.5px] space-y-1.5 mt-4">
                <div className="flex justify-between">
                  <span className="text-teal-muted dark:text-slate-400">CUFE:</span>
                  <span className="font-mono text-[10px] text-primary dark:text-dark-text font-medium truncate max-w-[240px]" title={facturaCreada.cufe}>
                    {facturaCreada.cufe || 'En proceso de validación...'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-teal-muted dark:text-slate-400">Estado DIAN:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <ShieldCheck size={12} /> {facturaCreada.electronicStatus || 'Validada'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-teal-muted dark:text-slate-400">Total facturado:</span>
                  <span className="font-bold text-primary dark:text-dark-text">{fmtCOP(facturaCreada.total)}</span>
                </div>
              </div>
            </div>
          ) : (
            /* Vista de Pre-visualización y Confirmación */
            <>
              {!facturacionHabilitada && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl text-amber-900 dark:text-amber-300 text-[11.5px] flex items-start gap-2.5">
                  <Settings size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">La facturación electrónica está desactivada</strong>
                    <span>
                      Para emitir facturas oficiales DIAN, activa el interruptor y guarda tus credenciales de Factus en <strong>Ajustes → Facturación electrónica</strong>.
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-status-red dark:text-red-400 text-[11.5px] flex items-center gap-2">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Selector de Paciente */}
              <div className="bg-teal-panel dark:bg-slate-800/50 border border-teal-border dark:border-dark-border rounded-xl p-3.5 space-y-2">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.7px] text-teal-muted dark:text-slate-400 flex items-center gap-1.5">
                  <User size={13} /> Adquiriente / Paciente *
                </p>
                {safePacientes.length > 0 && !data?.patient && !data?.paciente ? (
                  <select
                    value={selectedPacienteId}
                    onChange={(e) => {
                      setSelectedPacienteId(e.target.value);
                      setSelectedCotizacionId('');
                      setSelectedPagoId('');
                    }}
                    className="w-full text-[12px] bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl px-3 py-2 text-primary dark:text-dark-text focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-teal cursor-pointer"
                  >
                    {safePacientes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombres} {p.primer_apellido} ({p.tipo_documento}: {p.numero_documento})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex justify-between items-center text-[12px] pt-1">
                    <span className="font-semibold text-primary dark:text-dark-text">{pacienteNombre}</span>
                    <span className="text-teal-muted dark:text-slate-400 font-mono text-[11px]">
                      {pacienteTipoDoc}: {pacienteDoc}
                    </span>
                  </div>
                )}
              </div>

              {/* Prellenar desde Cotización o Pago si no viene de props */}
              {!data?.procedimientos && selectedPacienteId && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11.5px]">
                  <div>
                    <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-teal-muted dark:text-slate-400 mb-1 flex items-center gap-1">
                      <FileCheck size={12} /> Cargar desde Cotización
                    </label>
                    <select
                      value={selectedCotizacionId}
                      onChange={(e) => handleSelectCotizacion(e.target.value)}
                      disabled={loadingOrigen}
                      className="w-full text-[11.5px] bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl px-2.5 py-1.5 text-primary dark:text-dark-text focus:outline-none cursor-pointer"
                    >
                      <option value="">-- Ninguna --</option>
                      {safeCotizaciones.map((c) => (
                        <option key={c.id} value={c.id}>
                          Cotización #{c.id} ({fmtCOP(c.total)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-teal-muted dark:text-slate-400 mb-1 flex items-center gap-1">
                      <CreditCard size={12} /> Cargar desde Pago
                    </label>
                    <select
                      value={selectedPagoId}
                      onChange={(e) => handleSelectPago(e.target.value)}
                      disabled={loadingOrigen}
                      className="w-full text-[11.5px] bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl px-2.5 py-1.5 text-primary dark:text-dark-text focus:outline-none cursor-pointer"
                    >
                      <option value="">-- Ninguno --</option>
                      {safePagos.map((pg) => (
                        <option key={pg.id} value={pg.id}>
                          Pago #{pg.id} ({fmtCOP(pg.monto)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Servicios */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.7px] text-teal-muted dark:text-slate-400 flex items-center gap-1.5">
                    <FileText size={13} /> Servicios a facturar ({safeItems.length})
                  </p>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-[11px] text-teal hover:text-primary dark:hover:text-dark-text font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={12} /> Agregar ítem
                  </button>
                </div>

                <div className="border border-teal-border dark:border-dark-border rounded-xl overflow-hidden divide-y divide-teal-soft dark:divide-dark-border text-[11.5px]">
                  {safeItems.map((it, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between gap-2 bg-white dark:bg-dark-input">
                      <div className="flex-1 space-y-1">
                        <input
                          type="text"
                          value={it.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          className="w-full font-medium text-primary dark:text-dark-text bg-transparent border-none p-0 focus:outline-none text-[12px]"
                          placeholder="Descripción del procedimiento"
                        />
                        <div className="flex items-center gap-3 text-[10px] text-teal-muted dark:text-slate-400">
                          <span className="font-mono">CUPS: {it.cupsCode}</span>
                          <span className="flex items-center gap-1">
                            Cant:
                            <input
                              type="number"
                              min={1}
                              value={it.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                              className="w-12 bg-teal-panel dark:bg-slate-800 border border-teal-border dark:border-dark-border rounded px-1 text-center text-[10.5px] font-bold"
                            />
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-primary dark:text-dark-text tabular-nums">{fmtCOP(it.total)}</span>
                        {safeItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-slate-400 hover:text-red-500 p-1 rounded cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resumen financiero y método de pago */}
              <div className="bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl p-3.5 space-y-2 text-[12px]">
                <div className="flex justify-between text-teal-muted dark:text-slate-400">
                  <span>Subtotal:</span>
                  <span className="font-medium text-primary dark:text-dark-text tabular-nums">{fmtCOP(subtotal)}</span>
                </div>
                {descuento > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Descuentos:</span>
                    <span className="font-medium tabular-nums">-{fmtCOP(descuento)}</span>
                  </div>
                )}
                {impuesto > 0 && (
                  <div className="flex justify-between text-teal-muted dark:text-slate-400">
                    <span>Impuestos (IVA/INC):</span>
                    <span className="font-medium text-primary dark:text-dark-text tabular-nums">+{fmtCOP(impuesto)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-teal-soft dark:border-dark-border font-bold text-[14px]">
                  <span className="text-primary dark:text-dark-text">Total a facturar:</span>
                  <span className="text-primary dark:text-teal tabular-nums">{fmtCOP(total)}</span>
                </div>

                <div className="pt-2 flex items-center justify-between text-[11px] text-teal-muted dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <CreditCard size={13} className="text-teal" /> Método de pago:
                  </span>
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    className="text-[11.5px] bg-teal-panel dark:bg-slate-800 border border-teal-border dark:border-dark-border rounded-lg px-2 py-1 font-semibold text-primary dark:text-dark-text focus:outline-none cursor-pointer"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia_bancaria">Transferencia bancaria</option>
                    <option value="tarjeta_debito">Tarjeta débito</option>
                    <option value="tarjeta_credito">Tarjeta crédito</option>
                    <option value="nequi">Nequi</option>
                    <option value="daviplata">Daviplata</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
              </div>

              {/* Pregunta de confirmación */}
              <div className="p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/50 rounded-xl text-[11.5px] text-teal-800 dark:text-teal-300 text-center font-medium">
                ¿Deseas generar la factura electrónica con esta información ante la DIAN?
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-teal-soft dark:border-dark-border bg-teal-panel/40 dark:bg-slate-800/40 flex justify-end items-center gap-2 flex-shrink-0">
          {facturaCreada ? (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-[12px] text-white font-medium bg-primary dark:bg-teal dark:text-slate-900 rounded-xl hover:opacity-90 transition-opacity cursor-pointer shadow-soft-sm touch-target"
            >
              Aceptar y Cerrar
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={generando}
                className="px-4 py-2 text-[12px] text-primary dark:text-slate-300 font-medium rounded-xl border border-teal-border dark:border-dark-border bg-white dark:bg-dark-input hover:bg-teal-soft dark:hover:bg-slate-700 cursor-pointer touch-target disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarGeneracion}
                disabled={generando}
                className="flex items-center gap-1.5 px-4 py-2 text-[12px] text-white font-medium bg-primary dark:bg-teal dark:text-slate-900 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shadow-soft-sm touch-target"
              >
                {generando ? <Loader2 size={14} className="animate-spin" /> : <Receipt size={14} />}
                {generando ? 'Generando...' : 'Generar factura'}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
