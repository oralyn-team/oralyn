// src/services/invoiceService.js

/**
 * Modelo de Datos Frontend para Facturación Electrónica (DIAN / Colombia)
 * 
 * Invoice interface shape:
 * {
 *   id: string,
 *   number: string, // e.g. "FE-001245"
 *   prefix: string, // e.g. "FE"
 *   patientId: string,
 *   patient: {
 *     nombre: string,
 *     tipoDocumento: string,
 *     documento: string,
 *     email: string,
 *     telefono: string,
 *     direccion: string
 *   },
 *   consultorio: {
 *     razonSocial: string,
 *     nit: string,
 *     direccion: string,
 *     telefono: string,
 *     email: string
 *   },
 *   issueDate: string,
 *   dueDate: string,
 *   subtotal: number,
 *   discount: number,
 *   tax: number,
 *   total: number,
 *   paymentMethod: string, // 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Otro'
 *   paymentStatus: string, // 'Pagada' | 'Pendiente' | 'Parcial'
 *   electronicStatus: string, // 'Borrador' | 'Pendiente' | 'Enviada' | 'Validada' | 'Aceptada' | 'Rechazada' | 'Anulada'
 *   cufe: string,
 *   dianStatus: string,
 *   dianResponse: {
 *     codigo: string,
 *     mensaje: string,
 *     fechaValidacion: string,
 *     codigoRechazo?: string,
 *     mensajeRechazo?: string,
 *     fechaIntento?: string
 *   },
 *   environment: string, // 'Pruebas' | 'Producción'
 *   provider: string,
 *   items: Array<InvoiceItem>,
 *   creditNotes: Array<CreditNote>,
 *   createdAt: string,
 *   updatedAt: string
 * }
 */

// Mocks iniciales de facturas con ciclo de vida completo
const MOCK_INVOICES = [
  {
    id: 'inv_101',
    number: 'FE-001245',
    prefix: 'FE',
    patientId: 'pac_1',
    patient: {
      nombre: 'Laura Martínez',
      tipoDocumento: 'CC',
      documento: '1018432910',
      email: 'laura.martinez@email.com',
      telefono: '310 987 6543',
      direccion: 'Calle 45 # 12-34, Bogotá'
    },
    consultorio: {
      razonSocial: 'Oralyn Consultorio Odontológico S.A.S.',
      nit: '901.456.789-1',
      direccion: 'Calle 15 # 24-30, Villavicencio',
      telefono: '+57 320 123 4567',
      email: 'facturacion@oralyn.com'
    },
    issueDate: '2026-09-01',
    dueDate: '2026-09-15',
    subtotal: 350000,
    discount: 0,
    tax: 0,
    total: 350000,
    paymentMethod: 'Transferencia',
    paymentStatus: 'Pagada',
    electronicStatus: 'Aceptada',
    cufe: 'a8f7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7',
    dianStatus: 'Aceptada',
    dianResponse: {
      codigo: '00',
      mensaje: 'Factura validada y aceptada por la DIAN',
      fechaValidacion: '2026-09-01 10:42 AM'
    },
    environment: 'Producción',
    provider: 'FacturaTech Colombia',
    items: [
      { id: 'itm_1', cupsCode: '890201', description: 'Consulta odontológica de primera vez', quantity: 1, unitPrice: 100000, discount: 0, tax: 0, total: 100000 },
      { id: 'itm_2', cupsCode: '997101', description: 'Profilaxis y detartraje dental general', quantity: 1, unitPrice: 250000, discount: 0, tax: 0, total: 250000 }
    ],
    creditNotes: [],
    createdAt: '2026-09-01T10:40:00Z',
    updatedAt: '2026-09-01T10:42:00Z'
  },
  {
    id: 'inv_102',
    number: 'FE-001246',
    prefix: 'FE',
    patientId: 'pac_2',
    patient: {
      nombre: 'Carlos Andrés Gómez',
      tipoDocumento: 'CC',
      documento: '80123456',
      email: 'carlos.gomez@email.com',
      telefono: '315 456 7890',
      direccion: 'Carrera 14 # 8-15, Villavicencio'
    },
    consultorio: {
      razonSocial: 'Oralyn Consultorio Odontológico S.A.S.',
      nit: '901.456.789-1',
      direccion: 'Calle 15 # 24-30, Villavicencio',
      telefono: '+57 320 123 4567',
      email: 'facturacion@oralyn.com'
    },
    issueDate: '2026-09-01',
    dueDate: '2026-09-01',
    subtotal: 620000,
    discount: 20000,
    tax: 0,
    total: 600000,
    paymentMethod: 'Tarjeta',
    paymentStatus: 'Pagada',
    electronicStatus: 'Rechazada',
    cufe: 'Pendiente',
    dianStatus: 'Rechazada',
    dianResponse: {
      codigo: 'R-401',
      mensaje: 'Rechazada por inconsistencia en el formato del NIT del receptor.',
      codigoRechazo: 'ERR-NIT-004',
      mensajeRechazo: 'El número de identificación del adquiriente no cumple con el algoritmo de verificación DV DIAN.',
      fechaIntento: '2026-09-01 11:15 AM'
    },
    environment: 'Producción',
    provider: 'FacturaTech Colombia',
    items: [
      { id: 'itm_3', cupsCode: '230101', description: 'Restauración con resina de fotocurado posterior', quantity: 2, unitPrice: 310000, discount: 20000, tax: 0, total: 600000 }
    ],
    creditNotes: [],
    createdAt: '2026-09-01T11:10:00Z',
    updatedAt: '2026-09-01T11:15:00Z'
  },
  {
    id: 'inv_103',
    number: 'FE-001247',
    prefix: 'FE',
    patientId: 'pac_3',
    patient: {
      nombre: 'María Paula Ríos',
      tipoDocumento: 'CC',
      documento: '1121938475',
      email: 'maria.rios@email.com',
      telefono: '318 765 4321',
      direccion: 'Av. 40 # 15-20, Villavicencio'
    },
    consultorio: {
      razonSocial: 'Oralyn Consultorio Odontológico S.A.S.',
      nit: '901.456.789-1',
      direccion: 'Calle 15 # 24-30, Villavicencio',
      telefono: '+57 320 123 4567',
      email: 'facturacion@oralyn.com'
    },
    issueDate: '2026-08-30',
    dueDate: '2026-09-10',
    subtotal: 1200000,
    discount: 0,
    tax: 0,
    total: 1200000,
    paymentMethod: 'Efectivo',
    paymentStatus: 'Pagada',
    electronicStatus: 'Pendiente',
    cufe: 'Pendiente',
    dianStatus: 'Pendiente',
    dianResponse: {
      codigo: 'P-100',
      mensaje: 'Factura en cola de procesamiento para firma y envío a DIAN.',
      fechaIntento: '2026-08-30 04:30 PM'
    },
    environment: 'Producción',
    provider: 'FacturaTech Colombia',
    items: [
      { id: 'itm_4', cupsCode: '230201', description: 'Tratamiento de endodoncia uni-radicular', quantity: 1, unitPrice: 1200000, discount: 0, tax: 0, total: 1200000 }
    ],
    creditNotes: [],
    createdAt: '2026-08-30T16:25:00Z',
    updatedAt: '2026-08-30T16:30:00Z'
  },
  {
    id: 'inv_104',
    number: 'FE-001248',
    prefix: 'FE',
    patientId: 'pac_4',
    patient: {
      nombre: 'Jorge Enrique Vargas',
      tipoDocumento: 'CC',
      documento: '79842109',
      email: 'jorge.vargas@email.com',
      telefono: '300 111 2233',
      direccion: 'Calle 22 # 5-40, Villavicencio'
    },
    consultorio: {
      razonSocial: 'Oralyn Consultorio Odontológico S.A.S.',
      nit: '901.456.789-1',
      direccion: 'Calle 15 # 24-30, Villavicencio',
      telefono: '+57 320 123 4567',
      email: 'facturacion@oralyn.com'
    },
    issueDate: '2026-08-28',
    dueDate: '2026-08-28',
    subtotal: 450000,
    discount: 50000,
    tax: 0,
    total: 400000,
    paymentMethod: 'Transferencia',
    paymentStatus: 'Pagada',
    electronicStatus: 'Anulada',
    cufe: 'b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2',
    dianStatus: 'Anulada mediante Nota Crédito NC-000012',
    dianResponse: {
      codigo: 'NC-01',
      mensaje: 'Factura anulada por devolución total registrada mediante Nota Crédito',
      fechaValidacion: '2026-08-29 09:15 AM'
    },
    environment: 'Producción',
    provider: 'FacturaTech Colombia',
    items: [
      { id: 'itm_5', cupsCode: '890202', description: 'Blanqueamiento dental profesional en consultorio', quantity: 1, unitPrice: 450000, discount: 50000, tax: 0, total: 400000 }
    ],
    creditNotes: [
      {
        id: 'nc_01',
        invoiceId: 'inv_104',
        number: 'NC-000012',
        reason: 'Anulación de factura',
        amount: 400000,
        status: 'Aceptada',
        createdAt: '2026-08-29T09:10:00Z',
        observations: 'Paciente solicitó cancelación del servicio por cambio de residencia.'
      }
    ],
    createdAt: '2026-08-28T14:00:00Z',
    updatedAt: '2026-08-29T09:15:00Z'
  },
  {
    id: 'inv_105',
    number: 'FE-001249',
    prefix: 'FE',
    patientId: 'pac_5',
    patient: {
      nombre: 'Sofía Ramirez Cruz',
      tipoDocumento: 'CC',
      documento: '1020485921',
      email: 'sofia.ramirez@email.com',
      telefono: '312 345 6789',
      direccion: 'Manzana 5 Casa 12, Barzal, Villavicencio'
    },
    consultorio: {
      razonSocial: 'Oralyn Consultorio Odontológico S.A.S.',
      nit: '901.456.789-1',
      direccion: 'Calle 15 # 24-30, Villavicencio',
      telefono: '+57 320 123 4567',
      email: 'facturacion@oralyn.com'
    },
    issueDate: '2026-09-01',
    dueDate: '2026-09-01',
    subtotal: 180000,
    discount: 0,
    tax: 0,
    total: 180000,
    paymentMethod: 'Efectivo',
    paymentStatus: 'Pagada',
    electronicStatus: 'Borrador',
    cufe: 'Pendiente',
    dianStatus: 'Sin enviar',
    dianResponse: null,
    environment: 'Pruebas',
    provider: 'FacturaTech Colombia',
    items: [
      { id: 'itm_6', cupsCode: '890201', description: 'Valoración y radiografía periapical', quantity: 1, unitPrice: 180000, discount: 0, tax: 0, total: 180000 }
    ],
    creditNotes: [],
    createdAt: '2026-09-01T14:30:00Z',
    updatedAt: '2026-09-01T14:30:00Z'
  }
];

// Almacenamiento en memoria para el frontend mock (persistible temporalmente en localStorage si se requiere)
let localInvoices = [...MOCK_INVOICES];

// Servicio de Facturación
export const invoiceService = {
  /**
   * Obtiene la lista de facturas con soporte para filtrado
   */
  async getInvoices(filters = {}) {
    await new Promise((resolve) => setTimeout(resolve, 250)); // Simula latencia de red

    let result = [...localInvoices];

    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        (inv) =>
          inv.number.toLowerCase().includes(q) ||
          inv.patient.nombre.toLowerCase().includes(q) ||
          inv.patient.documento.toLowerCase().includes(q) ||
          (inv.cufe && inv.cufe.toLowerCase().includes(q))
      );
    }

    if (filters.estado && filters.estado !== 'Todos') {
      result = result.filter((inv) => inv.electronicStatus === filters.estado);
    }

    if (filters.fechaRango) {
      const today = new Date().toISOString().split('T')[0];
      if (filters.fechaRango === 'Hoy') {
        result = result.filter((inv) => inv.issueDate === today);
      } else if (filters.fechaRango === 'Esta semana') {
        const now = new Date();
        const firstDay = new Date(now.setDate(now.getDate() - now.getDay())).toISOString().split('T')[0];
        result = result.filter((inv) => inv.issueDate >= firstDay);
      } else if (filters.fechaRango === 'Este mes') {
        const monthPrefix = today.substring(0, 7);
        result = result.filter((inv) => inv.issueDate.startsWith(monthPrefix));
      }
    }

    if (filters.fechaInicio) {
      result = result.filter((inv) => inv.issueDate >= filters.fechaInicio);
    }
    if (filters.fechaFin) {
      result = result.filter((inv) => inv.issueDate <= filters.fechaFin);
    }

    return result;
  },

  /**
   * Obtiene el detalle de una factura por ID
   */
  async getInvoiceById(id) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const inv = localInvoices.find((item) => item.id === id);
    if (!inv) throw new Error('Factura no encontrada');
    return inv;
  },

  /**
   * Genera una nueva factura electrónica desde cotización / pagos / manual
   */
  async createInvoice(invoiceData) {
    await new Promise((resolve) => setTimeout(resolve, 400));

    const nextNum = 1250 + localInvoices.length;
    const invoiceNumber = `FE-00${nextNum}`;
    const cufeSimulated = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    const newInvoice = {
      id: `inv_${Date.now()}`,
      number: invoiceNumber,
      prefix: 'FE',
      patientId: invoiceData.patientId || 'pac_custom',
      patient: {
        nombre: invoiceData.patient?.nombre || 'Paciente General',
        tipoDocumento: invoiceData.patient?.tipoDocumento || 'CC',
        documento: invoiceData.patient?.documento || '123456789',
        email: invoiceData.patient?.email || 'paciente@ejemplo.com',
        telefono: invoiceData.patient?.telefono || '300 000 0000',
        direccion: invoiceData.patient?.direccion || 'Villavicencio'
      },
      consultorio: {
        razonSocial: invoiceData.consultorio?.razonSocial || 'Oralyn Consultorio Odontológico S.A.S.',
        nit: invoiceData.consultorio?.nit || '901.456.789-1',
        direccion: invoiceData.consultorio?.direccion || 'Calle 15 # 24-30, Villavicencio',
        telefono: invoiceData.consultorio?.telefono || '+57 320 123 4567',
        email: invoiceData.consultorio?.email || 'facturacion@oralyn.com'
      },
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: invoiceData.dueDate || new Date().toISOString().split('T')[0],
      subtotal: Number(invoiceData.subtotal) || 0,
      discount: Number(invoiceData.discount) || 0,
      tax: Number(invoiceData.tax) || 0,
      total: Number(invoiceData.total) || 0,
      paymentMethod: invoiceData.paymentMethod || 'Efectivo',
      paymentStatus: 'Pagada',
      electronicStatus: 'Validada', // Estado inicial simulado exitoso
      cufe: cufeSimulated,
      dianStatus: 'Aceptada',
      dianResponse: {
        codigo: '00',
        mensaje: 'Factura procesada y validada correctamente por el servicio simulado DIAN',
        fechaValidacion: new Date().toLocaleString('es-CO')
      },
      environment: 'Pruebas',
      provider: 'FacturaTech Colombia',
      items: (invoiceData.items || []).map((item, idx) => ({
        id: `itm_${Date.now()}_${idx}`,
        cupsCode: item.cupsCode || item.codigo || '890201',
        description: item.description || item.nombre || 'Procedimiento dental',
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || Number(item.valorUnitario) || 0,
        discount: Number(item.discount) || 0,
        tax: Number(item.tax) || 0,
        total: Number(item.total) || (Number(item.quantity || 1) * Number(item.unitPrice || 0))
      })),
      creditNotes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    localInvoices.unshift(newInvoice);
    return newInvoice;
  },

  /**
   * Reintenta el envío de una factura rechazada a DIAN
   */
  async retryInvoice(id) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const idx = localInvoices.findIndex((inv) => inv.id === id);
    if (idx === -1) throw new Error('Factura no encontrada');

    const cufeSimulated = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    localInvoices[idx] = {
      ...localInvoices[idx],
      electronicStatus: 'Aceptada',
      dianStatus: 'Aceptada',
      cufe: cufeSimulated,
      dianResponse: {
        codigo: '00',
        mensaje: 'Reintento exitoso: Factura validada correctamente por la DIAN',
        fechaValidacion: new Date().toLocaleString('es-CO')
      },
      updatedAt: new Date().toISOString()
    };

    return localInvoices[idx];
  },

  /**
   * Descarga la representación gráfica PDF de la factura
   */
  async downloadInvoicePdf(id) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const inv = localInvoices.find((i) => i.id === id);
    const filename = `${inv ? inv.number : 'factura'}.pdf`;

    // Generar un Blob sintético de previsualización PDF / HTML
    const content = `Representación Gráfica Factura Electrónica ${inv?.number || ''}\nPaciente: ${inv?.patient?.nombre || ''}\nTotal: $${inv?.total || 0}`;
    const blob = new Blob([content], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return true;
  },

  /**
   * Descarga el archivo XML firmado de la factura
   */
  async downloadInvoiceXml(id) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const inv = localInvoices.find((i) => i.id === id);
    const filename = `${inv ? inv.number : 'factura'}.xml`;

    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <ID>${inv?.number || ''}</ID>
  <UUID schemeName="CUFE">${inv?.cufe || ''}</UUID>
  <IssueDate>${inv?.issueDate || ''}</IssueDate>
  <AccountingSupplierParty><Party><PartyName><Name>${inv?.consultorio?.razonSocial}</Name></PartyName></Party></AccountingSupplierParty>
  <AccountingCustomerParty><Party><PartyName><Name>${inv?.patient?.nombre}</Name></PartyName></Party></AccountingCustomerParty>
  <LegalMonetaryTotal><PayableAmount currencyID="COP">${inv?.total || 0}</PayableAmount></LegalMonetaryTotal>
</Invoice>`;

    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return true;
  },

  /**
   * Genera una Nota Crédito sobre una factura aceptada
   */
  async createCreditNote(invoiceId, noteData) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const idx = localInvoices.findIndex((inv) => inv.id === invoiceId);
    if (idx === -1) throw new Error('Factura no encontrada');

    const inv = localInvoices[idx];
    const ncNumber = `NC-0000${Math.floor(10 + Math.random() * 90)}`;

    const newCreditNote = {
      id: `nc_${Date.now()}`,
      invoiceId,
      number: ncNumber,
      reason: noteData.reason || 'Anulación de factura',
      amount: Number(noteData.amount) || inv.total,
      status: 'Aceptada',
      createdAt: new Date().toISOString(),
      observations: noteData.observations || ''
    };

    const isTotalAnulation = Number(noteData.amount) >= inv.total;

    localInvoices[idx] = {
      ...inv,
      electronicStatus: isTotalAnulation ? 'Anulada' : inv.electronicStatus,
      dianStatus: isTotalAnulation ? `Anulada mediante ${ncNumber}` : inv.dianStatus,
      creditNotes: [...(inv.creditNotes || []), newCreditNote],
      updatedAt: new Date().toISOString()
    };

    return newCreditNote;
  },

  /**
   * Obtiene la respuesta técnica DIAN de la factura
   */
  async getDianResponse(id) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const inv = localInvoices.find((i) => i.id === id);
    return inv ? inv.dianResponse : null;
  }
};
