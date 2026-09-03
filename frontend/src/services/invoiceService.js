// src/services/invoiceService.js
import { api } from '../api';

/**
 * Servicio de Facturación Electrónica conectado a la API Backend de Oralyn (Factus / DIAN)
 */

export const invoiceService = {
  /**
   * Obtiene la lista de facturas desde el backend con soporte para filtrado
   */
  async getInvoices(filters = {}) {
    const params = {};
    if (filters.search) params.search = filters.search;
    if (filters.estado && filters.estado !== 'Todos') params.estado = filters.estado;
    if (filters.fechaInicio) params.fechaInicio = filters.fechaInicio;
    if (filters.fechaFin) params.fechaFin = filters.fechaFin;

    try {
      const facturas = await api.getFacturas(params);
      return Array.isArray(facturas) ? facturas : [];
    } catch (err) {
      if (err?.status === 404) {
        console.warn('El endpoint /api/facturas devolvió 404 (Aún no desplegado en el backend o sin servidor activo). Retornando lista vacía.');
        return [];
      }
      console.error('Error en invoiceService.getInvoices:', err);
      throw err;
    }
  },

  /**
   * Obtiene el detalle de una factura por ID
   */
  async getInvoiceById(id) {
    try {
      return await api.getFactura(id);
    } catch (err) {
      if (err?.status === 404) return null;
      throw err;
    }
  },

  /**
   * Genera una nueva factura electrónica enviándola al backend y a la DIAN vía Factus
   */
  async createInvoice(invoiceData) {
    const payload = {
      pacienteId: invoiceData.patientId || invoiceData.pacienteId || invoiceData.patient?.id,
      cotizacionId: invoiceData.cotizacionId,
      pagoId: invoiceData.pagoId,
      observacion: invoiceData.observacion || invoiceData.observations,
      items: (invoiceData.items || []).map((item) => ({
        codigoCups: item.cupsCode || item.codigoCups || item.codigo || '890201',
        nombre: item.description || item.nombre || 'Procedimiento odontológico',
        cantidad: Number(item.quantity || item.cantidad) || 1,
        valorUnitario: Number(item.unitPrice || item.valorUnitario) || 0,
      })),
      pagos: (invoiceData.paymentMethod || invoiceData.pagos) ? [
        {
          monto: Number(invoiceData.total) || 0,
          metodoPago: invoiceData.paymentMethod || 'efectivo',
        }
      ] : []
    };

    return api.crearFactura(payload);
  },

  /**
   * Reintenta el envío de una factura rechazada a DIAN vía Factus
   */
  async retryInvoice(id) {
    return api.reintentarFactura(id);
  },

  /**
   * Descarga la representación gráfica PDF de la factura desde Factus/Backend
   */
  async downloadInvoicePdf(id) {
    return api.descargarFacturaPdf(id);
  },

  /**
   * Descarga el archivo XML firmado de la factura desde Factus/Backend
   */
  async downloadInvoiceXml(id) {
    return api.descargarFacturaXml(id);
  },

  /**
   * Genera una Nota Crédito sobre una factura aceptada
   */
  async createCreditNote(invoiceId, noteData) {
    const payload = {
      motivo: noteData.reason || noteData.motivo || 'Anulación de factura',
      correctionCode: noteData.correctionCode || '2',
      observations: noteData.observations || noteData.observaciones || '',
      items: (noteData.items || []).length > 0 ? noteData.items : [
        {
          nombre: noteData.reason || 'Ajuste de factura',
          cantidad: 1,
          valorUnitario: Number(noteData.amount) || 0,
          codigoCups: 'SERV-ODONTO'
        }
      ]
    };

    return api.crearNotaCreditoFactura(invoiceId, payload);
  },

  /**
   * Obtiene la respuesta técnica DIAN de la factura
   */
  async getDianResponse(id) {
    try {
      const inv = await api.getFactura(id);
      return inv ? inv.dianResponse : null;
    } catch {
      return null;
    }
  }
};
