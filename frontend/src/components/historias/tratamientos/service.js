// src/components/historias/tratamientos/service.js
import { api } from '../../../api';

function normalizeMetodoPago(metodo = '') {
  const metodos = {
    Efectivo: 'efectivo',
    'Transferencia bancaria': 'transferencia_bancaria',
    'Tarjeta débito': 'tarjeta_debito',
    'Tarjeta dÃ©bito': 'tarjeta_debito',
    'Tarjeta crédito': 'tarjeta_credito',
    'Tarjeta crÃ©dito': 'tarjeta_credito',
    Nequi: 'nequi',
    Daviplata: 'daviplata',
    Otro: 'otro',
  };

  return metodos[metodo] ?? metodo;
}

export function buildCotizacionPayload(data, pacienteId) {
  const { accion, info, procedimientos } = data;

  return {
    paciente_id: pacienteId,
    doctor_id: info.doctor_id ?? null,
    tipo_tratamiento: info.tipo ?? null,
    prioridad: info.prioridad ?? 'media',
    estado: accion === 'aprobar' ? 'aprobado' : (info.estado ?? 'borrador'),
    motivo: info.motivo ?? null,
    observaciones: info.observaciones ?? null,
    procedimientos: procedimientos.map((p, index) => ({
      procedimiento: p.procedimiento,
      descripcion: p.descripcion ?? null,
      aplica_en: p.aplicaEn ?? 'general',
      dientes: p.dientes ?? [],
      cuadrante: p.cuadrante ?? null,
      cantidad: Number(p.cantidad),
      valor_unitario: Number(p.valorUnitario),
      descuento: Number(p.descuento) || 0,
      estado: p.estado ?? 'pendiente',
      observaciones: p.observaciones ?? null,
      orden: index,
    })),
  };
}

export async function guardarTratamiento(data, pacienteId) {
  const { id, info, pagos = [] } = data;
  const body = buildCotizacionPayload(data, pacienteId);
  const esEdicion = Number.isInteger(id) && id < 1_000_000_000_000;

  const cotizacion = esEdicion
    ? api.actualizarCotizacion(id, body)
    : api.crearCotizacion(body);

  const guardada = await cotizacion;
  const pagosNuevos = pagos.filter((p) => typeof p.id !== 'number' && Number(p.monto) > 0);

  await Promise.all(pagosNuevos.map((p) => api.crearPago({
    paciente_id: pacienteId,
    cotizacion_id: guardada.id,
    monto: Number(p.monto),
    metodo_pago: normalizeMetodoPago(p.metodo),
    referencia: p.referencia || null,
    concepto: info.tipo || 'Tratamiento',
  })));

  return guardada;
}
