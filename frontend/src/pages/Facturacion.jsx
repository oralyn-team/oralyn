// src/pages/Facturacion.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Receipt,
  Search,
  Filter,
  CalendarDays,
  Plus,
  Eye,
  Download,
  RotateCcw,
  FileDiff,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  XCircle,
  Check
} from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';
import FacturaStatusBadge from '../components/facturacion/FacturaStatusBadge';
import FacturaDetalle from '../components/facturacion/FacturaDetalle';
import GenerarFacturaModal from '../components/facturacion/GenerarFacturaModal';
import CreditNoteModal from '../components/facturacion/CreditNoteModal';
import { invoiceService } from '../services/invoiceService';

const METODO_PAGO_LABELS = {
  efectivo: 'Efectivo',
  transferencia_bancaria: 'Transferencia bancaria',
  tarjeta_debito: 'Tarjeta débito',
  tarjeta_credito: 'Tarjeta crédito',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  otro: 'Otro',
  Efectivo: 'Efectivo',
  Transferencia: 'Transferencia bancaria',
  Tarjeta: 'Tarjeta débito/crédito'
};

function fmtCOP(n) {
  const num = Number(n) || 0;
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
}

export default function Facturacion() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);
  const [toast, setToast] = useState(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('Todos');
  const [fechaRango, setFechaRango] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  // Modales
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showNuevaFacturaModal, setShowNuevaFacturaModal] = useState(false);
  const [creditNoteTarget, setCreditNoteTarget] = useState(null);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const cargarFacturas = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await invoiceService.getInvoices({
        search: searchTerm,
        estado: estadoFilter,
        fechaRango,
        fechaInicio,
        fechaFin
      });
      setData(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Error al cargar facturas:', err);
      setError('No fue posible cargar las facturas.');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarFacturas();
  }, [estadoFilter, fechaRango]);

  const handleBuscar = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    cargarFacturas();
  };

  const handleLimpiarFiltros = () => {
    setSearchTerm('');
    setEstadoFilter('Todos');
    setFechaRango('');
    setFechaInicio('');
    setFechaFin('');
    setCurrentPage(1);
    invoiceService.getInvoices({}).then(res => setData(Array.isArray(res) ? res : []));
  };

  // Reintento de envío
  const handleReintentar = async (inv, e) => {
    if (e) e.stopPropagation();
    try {
      const updated = await invoiceService.retryInvoice(inv.id);
      showToast(`Factura ${updated.number} reenviada y aceptada por DIAN`);
      cargarFacturas();
      if (selectedInvoice && selectedInvoice.id === inv.id) {
        setSelectedInvoice(updated);
      }
    } catch (err) {
      showToast(err.message || 'Error al reintentar el envío');
    }
  };

  // Descargas rápidas
  const handleDescargarPDF = async (inv, e) => {
    if (e) e.stopPropagation();
    try {
      await invoiceService.downloadInvoicePdf(inv.id);
      showToast(`PDF de ${inv.number} descargado`);
    } catch (err) {
      showToast('Error al descargar el PDF');
    }
  };

  const handleDescargarXML = async (inv, e) => {
    if (e) e.stopPropagation();
    try {
      await invoiceService.downloadInvoiceXml(inv.id);
      showToast(`XML de ${inv.number} descargado`);
    } catch (err) {
      showToast('Error al descargar el XML');
    }
  };

  // Generar Nota Crédito confirmación
  const handleCreateCreditNote = async (noteData) => {
    if (!creditNoteTarget) return;
    try {
      await invoiceService.createCreditNote(creditNoteTarget.id, noteData);
      showToast('Nota Crédito generada exitosamente');
      setCreditNoteTarget(null);
      cargarFacturas();
    } catch (err) {
      showToast(err.message || 'Error al generar Nota Crédito');
    }
  };

  const safeData = Array.isArray(data) ? data : [];

  // Cálculo de Resumen Superior
  const summary = useMemo(() => {
    const totalEmitidas = safeData.length;
    const pendientes = safeData.filter(i => i?.electronicStatus === 'Pendiente' || i?.electronicStatus === 'Borrador' || i?.electronicStatus === 'Enviada').length;
    const aceptadas = safeData.filter(i => i?.electronicStatus === 'Aceptada' || i?.electronicStatus === 'Validada').length;
    const rechazadas = safeData.filter(i => i?.electronicStatus === 'Rechazada').length;
    const totalFacturado = safeData.filter(i => i?.electronicStatus !== 'Anulada').reduce((acc, curr) => acc + (curr?.total || 0), 0);

    return { totalEmitidas, pendientes, aceptadas, rechazadas, totalFacturado };
  }, [safeData]);

  // Paginación
  const totalItems = safeData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentData = safeData.slice(startIndex, endIndex);

  return (
    <div className="flex min-h-screen bg-teal-bg dark:bg-dark-bg font-sans relative">
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar onToggleMobileMenu={() => setMobileMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-5 custom-scrollbar">
          
          {/* Encabezado */}
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-[16px] font-bold text-primary dark:text-dark-text flex items-center gap-2">
                <Receipt size={20} className="text-teal" /> Facturación
              </h2>
              <p className="text-[11.5px] text-teal dark:text-teal-light font-medium mt-0.5">
                Gestiona las facturas electrónicas, consulta su estado y administra los documentos asociados.
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={() => setShowNuevaFacturaModal(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 text-[12.5px] text-white font-medium bg-primary dark:bg-teal dark:text-slate-900 rounded-xl hover:opacity-90 transition-opacity cursor-pointer shadow-soft-sm touch-target"
              >
                <Plus size={15} /> + Nueva factura
              </button>
            </div>
          </div>

          {/* 4. Resumen Superior (Tarjetas) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-5">
            {/* Emitidas */}
            <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl p-4 flex items-center gap-3 shadow-soft-sm">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 flex items-center justify-center flex-shrink-0">
                <FileText size={20} />
              </div>
              <div>
                <p className="text-[20px] font-bold text-primary dark:text-dark-text leading-none">{summary.totalEmitidas}</p>
                <p className="text-[11px] text-teal-muted dark:text-slate-400 mt-1 font-medium">Facturas emitidas</p>
              </div>
            </div>

            {/* Pendientes */}
            <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl p-4 flex items-center gap-3 shadow-soft-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-[20px] font-bold text-primary dark:text-dark-text leading-none">{summary.pendientes}</p>
                <p className="text-[11px] text-teal-muted dark:text-slate-400 mt-1 font-medium">Pendientes</p>
              </div>
            </div>

            {/* Aceptadas */}
            <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl p-4 flex items-center gap-3 shadow-soft-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                <CheckCircle size={20} />
              </div>
              <div>
                <p className="text-[20px] font-bold text-primary dark:text-dark-text leading-none">{summary.aceptadas}</p>
                <p className="text-[11px] text-teal-muted dark:text-slate-400 mt-1 font-medium">Aceptadas DIAN</p>
              </div>
            </div>

            {/* Rechazadas */}
            <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl p-4 flex items-center gap-3 shadow-soft-sm">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <p className="text-[20px] font-bold text-primary dark:text-dark-text leading-none">{summary.rechazadas}</p>
                <p className="text-[11px] text-teal-muted dark:text-slate-400 mt-1 font-medium">Rechazadas</p>
              </div>
            </div>

            {/* Total Facturado */}
            <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl p-4 flex items-center gap-3 shadow-soft-sm sm:col-span-2 lg:col-span-1">
              <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-teal/20 text-primary dark:text-teal flex items-center justify-center flex-shrink-0">
                <DollarSign size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[17px] font-extrabold text-primary dark:text-dark-text leading-none truncate tabular-nums">
                  {fmtCOP(summary.totalFacturado)}
                </p>
                <p className="text-[11px] text-teal-muted dark:text-slate-400 mt-1 font-medium">Total facturado</p>
              </div>
            </div>
          </div>

          {/* 5. Barra de Búsqueda y Filtros */}
          <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl p-4 sm:p-5 shadow-soft-sm mb-5">
            <form onSubmit={handleBuscar} className="space-y-3">
              <div className="flex items-center justify-between border-b border-teal-soft dark:border-dark-border pb-2.5">
                <div className="flex items-center gap-2">
                  <Filter size={15} className="text-teal" />
                  <h3 className="text-[13px] font-semibold text-primary dark:text-dark-text">Filtros de búsqueda</h3>
                </div>
                <button
                  type="button"
                  onClick={handleLimpiarFiltros}
                  className="text-[11.5px] font-medium text-teal hover:text-primary dark:hover:text-dark-text transition-colors cursor-pointer"
                >
                  Limpiar filtros
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                {/* Buscar */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-teal-muted dark:text-slate-400 font-semibold uppercase tracking-wider">
                    Buscar
                  </label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-muted dark:text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar factura, paciente o documento..."
                      className="w-full text-[12px] bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl pl-9 pr-3 py-2 outline-none focus:border-primary dark:focus:border-teal text-primary dark:text-dark-text min-h-[38px]"
                    />
                  </div>
                </div>

                {/* Estado */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-teal-muted dark:text-slate-400 font-semibold uppercase tracking-wider">
                    Estado
                  </label>
                  <select
                    value={estadoFilter}
                    onChange={(e) => setEstadoFilter(e.target.value)}
                    className="w-full text-[12px] bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl px-3 py-2 outline-none focus:border-primary dark:focus:border-teal text-primary dark:text-dark-text appearance-none min-h-[38px] cursor-pointer"
                  >
                    <option value="Todos">Todos los estados</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="Validada">Validada</option>
                    <option value="Rechazada">Rechazada</option>
                    <option value="Anulada">Anulada</option>
                  </select>
                </div>

                {/* Fecha Rango */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-teal-muted dark:text-slate-400 font-semibold uppercase tracking-wider">
                    Período / Fecha
                  </label>
                  <select
                    value={fechaRango}
                    onChange={(e) => setFechaRango(e.target.value)}
                    className="w-full text-[12px] bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl px-3 py-2 outline-none focus:border-primary dark:focus:border-teal text-primary dark:text-dark-text appearance-none min-h-[38px] cursor-pointer"
                  >
                    <option value="">Todas las fechas</option>
                    <option value="Hoy">Hoy</option>
                    <option value="Esta semana">Esta semana</option>
                    <option value="Este mes">Este mes</option>
                    <option value="Personalizado">Rango personalizado</option>
                  </select>
                </div>

                {/* Botón Buscar */}
                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-[12px] text-white font-medium bg-primary dark:bg-teal dark:text-slate-900 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-70 touch-target cursor-pointer shadow-soft-sm min-h-[38px]"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                    Filtrar facturas
                  </button>
                </div>
              </div>

              {/* Controles de fecha personalizados */}
              {fechaRango === 'Personalizado' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-teal-soft dark:border-dark-border">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10.5px] text-teal-muted dark:text-slate-400 font-semibold uppercase">Desde</label>
                    <input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      className="w-full text-[12px] bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl px-3 py-2 outline-none focus:border-primary dark:focus:border-teal text-primary dark:text-dark-text min-h-[38px]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10.5px] text-teal-muted dark:text-slate-400 font-semibold uppercase">Hasta</label>
                    <input
                      type="date"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                      className="w-full text-[12px] bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl px-3 py-2 outline-none focus:border-primary dark:focus:border-teal text-primary dark:text-dark-text min-h-[38px]"
                    />
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* 6. Tabla de Facturas */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-medium text-teal-muted dark:text-slate-400">
              {loading ? 'Cargando facturas...' : `Mostrando ${totalItems} factura(s)`}
            </span>
          </div>

          <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl overflow-hidden shadow-soft-sm">
            {error ? (
              /* Error state */
              <div className="py-12 text-center text-teal-muted dark:text-slate-400 space-y-3">
                <AlertTriangle size={36} className="text-status-red mx-auto" />
                <p className="font-semibold text-[14px] text-primary dark:text-dark-text">{error}</p>
                <button
                  type="button"
                  onClick={cargarFacturas}
                  className="px-4 py-2 text-[12px] text-white font-medium bg-primary rounded-xl hover:opacity-90 transition-opacity cursor-pointer shadow-soft-sm inline-flex items-center gap-1.5"
                >
                  <RefreshCw size={14} /> Reintentar
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[750px]">
                  <thead className="bg-teal-bg/60 dark:bg-slate-800/60 border-b border-teal-soft dark:border-dark-border text-[10.5px] font-semibold text-teal-muted dark:text-slate-400 uppercase tracking-[0.7px]">
                    <tr>
                      <th className="px-4 py-3.5">Factura</th>
                      <th className="px-4 py-3.5">Paciente</th>
                      <th className="px-4 py-3.5">Fecha</th>
                      <th className="px-4 py-3.5 text-right">Total</th>
                      <th className="px-4 py-3.5 text-center">Estado</th>
                      <th className="px-4 py-3.5">Método de pago</th>
                      <th className="px-4 py-3.5 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="text-[12px] text-primary dark:text-dark-text divide-y divide-teal-soft dark:divide-dark-border">
                    {loading ? (
                      /* Skeletons */
                      Array.from({ length: 5 }).map((_, idx) => (
                        <tr key={idx} className="bg-white dark:bg-dark-card">
                          <td className="px-4 py-3.5"><div className="h-4 bg-teal-soft dark:bg-slate-800 rounded w-20 animate-pulse"></div></td>
                          <td className="px-4 py-3.5"><div className="h-4 bg-teal-soft dark:bg-slate-800 rounded w-36 animate-pulse"></div></td>
                          <td className="px-4 py-3.5"><div className="h-4 bg-teal-soft dark:bg-slate-800 rounded w-24 animate-pulse"></div></td>
                          <td className="px-4 py-3.5"><div className="h-4 bg-teal-soft dark:bg-slate-800 rounded w-20 animate-pulse ml-auto"></div></td>
                          <td className="px-4 py-3.5"><div className="h-4 bg-teal-soft dark:bg-slate-800 rounded w-24 animate-pulse mx-auto"></div></td>
                          <td className="px-4 py-3.5"><div className="h-4 bg-teal-soft dark:bg-slate-800 rounded w-24 animate-pulse"></div></td>
                          <td className="px-4 py-3.5"><div className="h-4 bg-teal-soft dark:bg-slate-800 rounded w-28 animate-pulse mx-auto"></div></td>
                        </tr>
                      ))
                    ) : currentData.length === 0 ? (
                      /* Empty state */
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-teal-muted dark:text-slate-400">
                          <Receipt size={38} className="text-teal-light dark:text-slate-500 mx-auto mb-2" />
                          <p className="font-bold text-[14px] text-primary dark:text-dark-text">Todavía no hay facturas</p>
                          <p className="text-[11.5px] mt-0.5">Las facturas generadas desde cotizaciones y pagos aparecerán aquí.</p>
                        </td>
                      </tr>
                    ) : (
                      currentData.map((inv) => {
                        const isAceptada = inv.electronicStatus === 'Aceptada' || inv.electronicStatus === 'Validada';
                        const isRechazada = inv.electronicStatus === 'Rechazada';
                        const isAnulada = inv.electronicStatus === 'Anulada';

                        return (
                          <tr
                            key={inv.id}
                            className="hover:bg-teal-info/40 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                            onClick={() => setSelectedInvoice(inv)}
                          >
                            {/* Factura */}
                            <td className="px-4 py-3.5 font-mono font-bold text-primary dark:text-dark-text text-[12.5px]">
                              {inv.number}
                            </td>

                            {/* Paciente */}
                            <td className="px-4 py-3.5">
                              <p className="font-semibold text-primary dark:text-dark-text leading-snug">{inv.patient.nombre}</p>
                              <span className="text-[10.5px] text-teal-muted dark:text-slate-400 font-mono">
                                {inv.patient.tipoDocumento || 'CC'}: {inv.patient.documento}
                              </span>
                            </td>

                            {/* Fecha */}
                            <td className="px-4 py-3.5 text-teal-muted dark:text-slate-400 text-[11.5px]">
                              {inv.issueDate}
                            </td>

                            {/* Total */}
                            <td className="px-4 py-3.5 text-right font-bold text-primary dark:text-dark-text tabular-nums text-[13px]">
                              {fmtCOP(inv.total)}
                            </td>

                            {/* Estado Badge */}
                            <td className="px-4 py-3.5 text-center">
                              <FacturaStatusBadge estado={inv.electronicStatus} />
                            </td>

                            {/* Método de Pago */}
                            <td className="px-4 py-3.5 text-teal-muted dark:text-slate-400 text-[11.5px]">
                              {METODO_PAGO_LABELS[inv.paymentMethod] || inv.paymentMethod || 'Efectivo'}
                            </td>

                            {/* 7. Acciones por estado */}
                            <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Ver Detalle */}
                                <button
                                  type="button"
                                  onClick={() => setSelectedInvoice(inv)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-primary dark:text-teal hover:bg-teal-soft dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer border border-teal-border dark:border-dark-border touch-target"
                                  title="Ver detalle"
                                >
                                  <Eye size={13} /> Ver
                                </button>

                                {/* Factura Rechazada: Ver respuesta / Reintentar envío */}
                                {isRechazada && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleReintentar(inv, e)}
                                    className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors cursor-pointer shadow-soft-sm touch-target"
                                    title="Reintentar envío"
                                  >
                                    <RotateCcw size={12} /> Reintentar
                                  </button>
                                )}

                                {/* Factura Aceptada: PDF, XML, Nota Crédito */}
                                {isAceptada && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => handleDescargarPDF(inv, e)}
                                      className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium text-primary dark:text-teal border border-teal-border dark:border-dark-border rounded-lg hover:bg-teal-soft dark:hover:bg-slate-800 transition-colors cursor-pointer touch-target"
                                      title="Descargar PDF"
                                    >
                                      <Download size={12} /> PDF
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); setCreditNoteTarget(inv); }}
                                      className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/40 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer touch-target"
                                      title="Generar Nota Crédito"
                                    >
                                      <FileDiff size={12} /> NC
                                    </button>
                                  </>
                                )}

                                {/* Factura Anulada: Descargar PDF */}
                                {isAnulada && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleDescargarPDF(inv, e)}
                                    className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium text-teal-muted dark:text-slate-400 border border-teal-border dark:border-dark-border rounded-lg hover:bg-teal-soft dark:hover:bg-slate-800 transition-colors cursor-pointer touch-target"
                                    title="Descargar PDF"
                                  >
                                    <Download size={12} /> PDF
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Footer */}
            {totalItems > 0 && !loading && !error && (
              <div className="px-4 py-3 bg-teal-panel/40 dark:bg-slate-800/40 border-t border-teal-soft dark:border-dark-border flex items-center justify-between text-[11.5px] text-teal-muted dark:text-slate-400">
                <div>
                  Mostrando <strong className="text-primary dark:text-dark-text">{startIndex + 1}</strong> a <strong className="text-primary dark:text-dark-text">{endIndex}</strong> de <strong className="text-primary dark:text-dark-text">{totalItems}</strong> facturas
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-teal-border dark:border-dark-border bg-white dark:bg-dark-input text-primary dark:text-dark-text disabled:opacity-40 disabled:cursor-not-allowed hover:bg-teal-soft dark:hover:bg-slate-700 cursor-pointer touch-target"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="px-2 font-medium">Página {currentPage} de {totalPages}</span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-teal-border dark:border-dark-border bg-white dark:bg-dark-input text-primary dark:text-dark-text disabled:opacity-40 disabled:cursor-not-allowed hover:bg-teal-soft dark:hover:bg-slate-700 cursor-pointer touch-target"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal 8: Factura Detalle */}
      {selectedInvoice && (
        <FacturaDetalle
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onInvoiceUpdated={(updated) => {
            setSelectedInvoice(updated);
            cargarFacturas();
          }}
          showToast={showToast}
        />
      )}

      {/* Modal 13: Generar Factura */}
      {showNuevaFacturaModal && (
        <GenerarFacturaModal
          data={null}
          onClose={() => setShowNuevaFacturaModal(false)}
          onFacturaCreada={(nueva) => {
            showToast(`Factura ${nueva.number} creada correctamente`);
            cargarFacturas();
          }}
        />
      )}

      {/* Modal 11: Generar Nota Crédito directa */}
      {creditNoteTarget && (
        <CreditNoteModal
          invoice={creditNoteTarget}
          onClose={() => setCreditNoteTarget(null)}
          onConfirm={handleCreateCreditNote}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-primary dark:bg-slate-800 text-white text-[12px] px-4 py-2.5 rounded-full whitespace-nowrap z-50 shadow-soft-lg flex items-center gap-2 border border-white/10 animate-toast">
          <Check size={14} className="text-teal" /> {toast}
        </div>
      )}
    </div>
  );
}
