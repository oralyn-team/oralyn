// src/components/facturacion/FacturaDetalle.jsx
import React, { useState } from 'react';
import {
  Receipt,
  User,
  Building2,
  FileText,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Download,
  FileDiff,
  X,
  Loader2,
  Calendar,
  CreditCard
} from 'lucide-react';
import FacturaStatusBadge from './FacturaStatusBadge';
import CreditNoteModal from './CreditNoteModal';
import { invoiceService } from '../../services/invoiceService';

function fmtCOP(val) {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
}

export default function FacturaDetalle({ invoice, onClose, onInvoiceUpdated, showToast }) {
  const [reintentando, setReintentando] = useState(false);
  const [descargando, setDescargando] = useState(null); // 'pdf' | 'xml'
  const [showCreditNoteModal, setShowCreditNoteModal] = useState(false);

  if (!invoice) return null;

  const isAceptada = invoice.electronicStatus === 'Aceptada' || invoice.electronicStatus === 'Validada';
  const isRechazada = invoice.electronicStatus === 'Rechazada';
  const isAnulada = invoice.electronicStatus === 'Anulada';

  const handleReintentar = async () => {
    setReintentando(true);
    try {
      const updated = await invoiceService.retryInvoice(invoice.id);
      if (onInvoiceUpdated) onInvoiceUpdated(updated);
      if (showToast) showToast('Factura reenviada y validada correctamente por la DIAN');
    } catch (err) {
      console.error('Error reintentando envío:', err);
      if (showToast) showToast(err.message || 'Error al reintentar el envío');
    } fontName: setReintentando(false);
  };

  const handleDescargarPDF = async () => {
    setDescargando('pdf');
    try {
      await invoiceService.downloadInvoicePdf(invoice.id);
      if (showToast) showToast('Representación gráfica PDF descargada');
    } catch (err) {
      if (showToast) showToast('Error descargando PDF');
    } finally {
      setDescargando(null);
    }
  };

  const handleDescargarXML = async () => {
    setDescargando('xml');
    try {
      await invoiceService.downloadInvoiceXml(invoice.id);
      if (showToast) showToast('Archivo XML firmado descargado');
    } catch (err) {
      if (showToast) showToast('Error descargando XML');
    } finally {
      setDescargando(null);
    }
  };

  const handleCreateCreditNoteConfirm = async (noteData) => {
    try {
      await invoiceService.createCreditNote(invoice.id, noteData);
      const updated = await invoiceService.getInvoiceById(invoice.id);
      if (onInvoiceUpdated) onInvoiceUpdated(updated);
      if (showToast) showToast('Nota Crédito generada exitosamente');
    } catch (err) {
      if (showToast) showToast(err.message || 'Error al generar Nota Crédito');
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-primary/45 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="bg-white dark:bg-dark-card rounded-t-2xl sm:rounded-2xl w-full max-w-3xl shadow-soft-lg border border-teal-border dark:border-dark-border flex flex-col max-h-[90vh] overflow-hidden">
          
          {/* Encabezado */}
          <div className="px-6 py-4 border-b border-teal-soft dark:border-dark-border bg-primary dark:bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <Receipt size={20} className="text-teal-light" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-[15px] font-bold text-white">Factura electrónica de venta</h3>
                  <span className="font-mono text-[13px] text-teal-light font-semibold bg-white/10 px-2 py-0.5 rounded">
                    {invoice.number}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-teal-light/80 dark:text-slate-400 mt-1">
                  <span className="flex items-center gap-1"><Calendar size={12} /> Emisión: {invoice.issueDate}</span>
                  <span>•</span>
                  <span>Vencimiento: {invoice.dueDate || invoice.issueDate}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <FacturaStatusBadge estado={invoice.electronicStatus} />
              <button
                type="button"
                onClick={onClose}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer touch-target flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Body principal con scroll */}
          <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-white dark:bg-dark-card text-primary dark:text-dark-text">
            
            {/* Grid 2 Columnas: Paciente & Consultorio */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Información del Paciente */}
              <div className="bg-teal-panel dark:bg-slate-800/60 border border-teal-border dark:border-dark-border rounded-2xl p-4 space-y-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.7px] text-teal-muted dark:text-slate-400 flex items-center gap-1.5 border-b border-teal-border/50 dark:border-dark-border pb-2">
                  <User size={14} className="text-teal" /> Información del Adquiriente (Paciente)
                </h4>
                <div className="pt-1 space-y-1 text-[12px]">
                  <p className="font-semibold text-[13px] text-primary dark:text-dark-text">{invoice.patient.nombre}</p>
                  <p className="text-teal-muted dark:text-slate-400">
                    <strong className="font-mono text-[11px]">{invoice.patient.tipoDocumento || 'CC'}:</strong> {invoice.patient.documento}
                  </p>
                  <p className="text-teal-muted dark:text-slate-400">
                    <strong>Correo:</strong> {invoice.patient.email || 'Pendiente'}
                  </p>
                  <p className="text-teal-muted dark:text-slate-400">
                    <strong>Teléfono:</strong> {invoice.patient.telefono || 'Pendiente'}
                  </p>
                  {invoice.patient.direccion && (
                    <p className="text-teal-muted dark:text-slate-400">
                      <strong>Dirección:</strong> {invoice.patient.direccion}
                    </p>
                  )}
                </div>
              </div>

              {/* Información del Consultorio */}
              <div className="bg-teal-panel dark:bg-slate-800/60 border border-teal-border dark:border-dark-border rounded-2xl p-4 space-y-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.7px] text-teal-muted dark:text-slate-400 flex items-center gap-1.5 border-b border-teal-border/50 dark:border-dark-border pb-2">
                  <Building2 size={14} className="text-teal" /> Información del Emisor (Consultorio)
                </h4>
                <div className="pt-1 space-y-1 text-[12px]">
                  <p className="font-semibold text-[13px] text-primary dark:text-dark-text">{invoice.consultorio.razonSocial}</p>
                  <p className="text-teal-muted dark:text-slate-400">
                    <strong>NIT:</strong> {invoice.consultorio.nit}
                  </p>
                  <p className="text-teal-muted dark:text-slate-400">
                    <strong>Dirección:</strong> {invoice.consultorio.direccion}
                  </p>
                  <p className="text-teal-muted dark:text-slate-400">
                    <strong>Teléfono:</strong> {invoice.consultorio.telefono}
                  </p>
                  <p className="text-teal-muted dark:text-slate-400">
                    <strong>Correo:</strong> {invoice.consultorio.email}
                  </p>
                </div>
              </div>

            </div>

            {/* Tabla de Servicios Facturados */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[12px] font-semibold uppercase tracking-wider text-teal-muted dark:text-slate-400 flex items-center gap-1.5">
                  <FileText size={14} /> Servicios y Procedimientos Facturados
                </h4>
                <span className="text-[11px] text-teal-muted dark:text-slate-400 font-medium">
                  {invoice.items.length} ítem(s)
                </span>
              </div>

              <div className="border border-teal-border dark:border-dark-border rounded-2xl overflow-hidden shadow-soft-sm">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead className="bg-teal-bg/60 dark:bg-slate-800/60 border-b border-teal-soft dark:border-dark-border text-[10.5px] font-semibold text-teal-muted dark:text-slate-400 uppercase tracking-[0.7px]">
                      <tr>
                        <th className="px-4 py-3">Código CUPS</th>
                        <th className="px-4 py-3">Servicio / Descripción</th>
                        <th className="px-4 py-3 text-center">Cant.</th>
                        <th className="px-4 py-3 text-right">Valor unitario</th>
                        <th className="px-4 py-3 text-right">Descuento</th>
                        <th className="px-4 py-3 text-right">Impuesto</th>
                        <th className="px-4 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-teal-soft dark:divide-dark-border text-[12px] text-primary dark:text-dark-text">
                      {invoice.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-teal-info/40 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3 font-mono font-semibold text-teal dark:text-teal-light text-[11px]">
                            {item.cupsCode || '890201'}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {item.description}
                          </td>
                          <td className="px-4 py-3 text-center font-medium">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-right font-medium tabular-nums">
                            {fmtCOP(item.unitPrice)}
                          </td>
                          <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-medium tabular-nums">
                            {item.discount > 0 ? `-${fmtCOP(item.discount)}` : '$0'}
                          </td>
                          <td className="px-4 py-3 text-right text-teal-muted dark:text-slate-400 font-medium tabular-nums">
                            {item.tax > 0 ? `+${fmtCOP(item.tax)}` : '$0'}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-primary dark:text-dark-text tabular-nums">
                            {fmtCOP(item.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Resumen Financiero Destacado */}
            <div className="flex justify-end">
              <div className="w-full sm:w-80 bg-teal-panel/60 dark:bg-slate-800/60 border border-teal-border dark:border-dark-border rounded-2xl p-4 space-y-2 text-[12px]">
                <div className="flex justify-between text-teal-muted dark:text-slate-400">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-primary dark:text-dark-text tabular-nums">{fmtCOP(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Descuentos:</span>
                  <span className="font-semibold tabular-nums">-{fmtCOP(invoice.discount)}</span>
                </div>
                <div className="flex justify-between text-teal-muted dark:text-slate-400">
                  <span>Impuestos (IVA 0% / Exento):</span>
                  <span className="font-semibold text-primary dark:text-dark-text tabular-nums">+{fmtCOP(invoice.tax)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-teal-border/60 dark:border-dark-border text-[15px] font-extrabold">
                  <span className="text-primary dark:text-dark-text">Total a Pagar:</span>
                  <span className="text-primary dark:text-teal tabular-nums">{fmtCOP(invoice.total)}</span>
                </div>
                <div className="pt-2 text-[11px] text-teal-muted dark:text-slate-400 flex items-center justify-between border-t border-teal-border/40 dark:border-dark-border">
                  <span className="flex items-center gap-1"><CreditCard size={12} /> Método de Pago:</span>
                  <span className="font-semibold text-primary dark:text-dark-text">{invoice.paymentMethod || 'Efectivo'}</span>
                </div>
              </div>
            </div>

            {/* Sección: Información Electrónica */}
            <div className="bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-2xl p-4 space-y-3">
              <h4 className="text-[12px] font-semibold uppercase tracking-wider text-primary dark:text-dark-text flex items-center gap-2">
                <ShieldCheck size={16} className="text-teal" /> Información de facturación electrónica
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[11.5px] pt-1">
                <div>
                  <span className="text-[10.5px] text-teal-muted dark:text-slate-400 block font-medium">Prefijo & Número</span>
                  <span className="font-semibold font-mono text-primary dark:text-dark-text">{invoice.prefix || 'FE'} - {invoice.number}</span>
                </div>

                <div>
                  <span className="text-[10.5px] text-teal-muted dark:text-slate-400 block font-medium">Fecha de Emisión</span>
                  <span className="font-medium text-primary dark:text-dark-text">{invoice.issueDate}</span>
                </div>

                <div>
                  <span className="text-[10.5px] text-teal-muted dark:text-slate-400 block font-medium">Estado DIAN</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{invoice.dianStatus || 'Pendiente'}</span>
                </div>

                <div>
                  <span className="text-[10.5px] text-teal-muted dark:text-slate-400 block font-medium">Ambiente</span>
                  <span className="font-medium text-primary dark:text-dark-text">{invoice.environment || 'Pruebas'}</span>
                </div>

                <div>
                  <span className="text-[10.5px] text-teal-muted dark:text-slate-400 block font-medium">Proveedor Tecnológico</span>
                  <span className="font-medium text-primary dark:text-dark-text">{invoice.provider || 'FacturaTech Colombia'}</span>
                </div>

                <div>
                  <span className="text-[10.5px] text-teal-muted dark:text-slate-400 block font-medium">Fecha de Validación</span>
                  <span className="font-medium text-primary dark:text-dark-text">{invoice.dianResponse?.fechaValidacion || 'Pendiente'}</span>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-[10.5px] text-teal-muted dark:text-slate-400 block font-medium">CUFE (Código Único de Facturación Electrónica)</span>
                  <p className="font-mono text-[10px] text-teal dark:text-teal-light break-all bg-teal-soft/50 dark:bg-slate-900 p-1.5 rounded border border-teal-border/40 dark:border-dark-border mt-0.5">
                    {invoice.cufe || 'Pendiente'}
                  </p>
                </div>
              </div>
            </div>

            {/* Sección: Validación Electrónica / Respuesta DIAN */}
            <div className="space-y-2">
              <h4 className="text-[12px] font-semibold text-primary dark:text-dark-text flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-teal" /> Validación Electrónica DIAN
              </h4>

              {isRechazada ? (
                /* Estado Rechazada */
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-2xl space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-[13px] font-bold text-amber-900 dark:text-amber-300">⚠ Factura rechazada por la DIAN</h5>
                      <p className="text-[11.5px] text-amber-800 dark:text-amber-400 mt-0.5">
                        {invoice.dianResponse?.mensaje || 'El documento presentó inconsitencias de validación.'}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-white/70 dark:bg-slate-900/60 rounded-xl text-[11px] space-y-1 text-amber-950 dark:text-amber-200">
                    <p><strong>Código de rechazo:</strong> <span className="font-mono">{invoice.dianResponse?.codigoRechazo || 'ERR-VAL-001'}</span></p>
                    <p><strong>Mensaje técnico:</strong> {invoice.dianResponse?.mensajeRechazo || 'Detalle no disponible'}</p>
                    <p><strong>Fecha del intento:</strong> {invoice.dianResponse?.fechaIntento || invoice.updatedAt}</p>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleReintentar}
                      disabled={reintentando}
                      className="flex items-center gap-1.5 px-4 py-2 text-[12px] text-white font-medium bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors cursor-pointer shadow-soft-sm touch-target disabled:opacity-50"
                    >
                      {reintentando ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                      Reintentar envío a DIAN
                    </button>
                  </div>
                </div>
              ) : isAceptada ? (
                /* Estado Aceptada / Validada */
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl flex items-start gap-3">
                  <CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1 text-[12px] text-emerald-900 dark:text-emerald-200">
                    <p className="font-bold text-[13px]">✓ Factura validada correctamente por la DIAN</p>
                    <p><strong>Fecha de validación:</strong> {invoice.dianResponse?.fechaValidacion || invoice.issueDate}</p>
                    <p className="font-mono text-[10.5px] break-all"><strong>CUFE:</strong> {invoice.cufe}</p>
                  </div>
                </div>
              ) : (
                /* Estado Pendiente / Borrador */
                <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-2xl text-[12px] text-blue-900 dark:text-blue-200 flex items-center gap-2">
                  <CheckCircle size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <span>El documento se encuentra en estado <strong>{invoice.electronicStatus}</strong>.</span>
                </div>
              )}
            </div>

            {/* Sección: Notas Crédito Asociadas (si existen) */}
            {invoice.creditNotes && invoice.creditNotes.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-teal-soft dark:border-dark-border">
                <h4 className="text-[12px] font-semibold text-primary dark:text-dark-text flex items-center gap-1.5">
                  <FileDiff size={15} className="text-teal" /> Notas Crédito registradas ({invoice.creditNotes.length})
                </h4>

                <div className="space-y-2">
                  {invoice.creditNotes.map((nc) => (
                    <div key={nc.id} className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl text-[11.5px] flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-900 dark:text-amber-300">{nc.number}</span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-[10px] font-medium">
                            {nc.reason}
                          </span>
                        </div>
                        {nc.observations && <p className="text-[11px] text-teal-muted dark:text-slate-400 mt-0.5">{nc.observations}</p>}
                      </div>
                      <span className="font-bold text-amber-900 dark:text-amber-300 tabular-nums text-[12.5px]">
                        {fmtCOP(nc.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Footer Acciones de Factura */}
          <div className="px-6 py-4 border-t border-teal-soft dark:border-dark-border bg-teal-panel/40 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Botón PDF */}
              <button
                type="button"
                onClick={handleDescargarPDF}
                disabled={descargando === 'pdf'}
                className="flex items-center gap-1.5 px-3.5 py-2 text-[12px] text-primary dark:text-teal font-medium bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl hover:bg-teal-soft dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-soft-sm touch-target"
              >
                {descargando === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                Descargar PDF
              </button>

              {/* Botón XML (si está aceptada o enviada) */}
              {(isAceptada || isAnulada) && (
                <button
                  type="button"
                  onClick={handleDescargarXML}
                  disabled={descargando === 'xml'}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-[12px] text-primary dark:text-teal font-medium bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl hover:bg-teal-soft dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-soft-sm touch-target"
                >
                  {descargando === 'xml' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  Descargar XML
                </button>
              )}

              {/* Botón Generar Nota Crédito (si está aceptada) */}
              {isAceptada && (
                <button
                  type="button"
                  onClick={() => setShowCreditNoteModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-[12px] text-amber-800 dark:text-amber-300 font-medium bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors cursor-pointer shadow-soft-sm touch-target"
                >
                  <FileDiff size={14} /> Generar Nota Crédito
                </button>
              )}

              {/* Botón Reintentar envío (si está rechazada) */}
              {isRechazada && (
                <button
                  type="button"
                  onClick={handleReintentar}
                  disabled={reintentando}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-[12px] text-white font-medium bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors cursor-pointer shadow-soft-sm touch-target disabled:opacity-50"
                >
                  {reintentando ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                  Reintentar envío
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[12px] text-primary dark:text-slate-300 font-medium rounded-xl border border-teal-border dark:border-dark-border bg-white dark:bg-dark-input hover:bg-teal-soft dark:hover:bg-slate-700 cursor-pointer touch-target"
            >
              Cerrar
            </button>
          </div>

        </div>
      </div>

      {/* Modal Secundario: Nota Crédito */}
      {showCreditNoteModal && (
        <CreditNoteModal
          invoice={invoice}
          onClose={() => setShowCreditNoteModal(false)}
          onConfirm={handleCreateCreditNoteConfirm}
        />
      )}
    </>
  );
}
