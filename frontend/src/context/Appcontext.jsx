// src/context/AppContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';
import { calcTotales } from '../components/historias/tratamientos/helpers';

const AppContext = createContext(null);

function toDateInput(value) {
  return value ? String(value).split('T')[0] : '';
}

function normalizeProcedimiento(proc = {}, index = 0) {
  return {
    id: proc.id ?? proc.procedimiento_id ?? `proc_${index}`,
    aplicaEn: proc.aplicaEn ?? proc.aplica_en ?? 'general',
    dientes: Array.isArray(proc.dientes) ? proc.dientes : [],
    cuadrante: proc.cuadrante ?? '',
    procedimiento: proc.procedimiento ?? proc.nombre ?? '',
    descripcion: proc.descripcion ?? '',
    cantidad: proc.cantidad ?? 1,
    valorUnitario: proc.valorUnitario ?? proc.valor_unitario ?? '',
    descuento: proc.descuento ?? 0,
    estado: proc.estado ?? 'pendiente',
    observaciones: proc.observaciones ?? '',
  };
}

function normalizePago(pago = {}, index = 0) {
  return {
    id: pago.id ?? pago.pago_id ?? `pago_${index}`,
    fecha: toDateInput(pago.fecha ?? pago.fecha_pago),
    monto: pago.monto ?? '',
    metodo: pago.metodo ?? pago.metodo_pago ?? 'Efectivo',
    referencia: pago.referencia ?? '',
  };
}

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

function normalizeEvolucion(ev = {}) {
  return {
    id: ev.id,
    fecha: toDateInput(ev.fecha),
    doctor: ev.doctor ?? '',
    motivo: ev.motivo ?? '',
    diagnostico: ev.diagnostico ?? '',
    procedimiento: ev.procedimiento ?? '',
    piezasTratadas: ev.piezasTratadas ?? ev.piezas_tratadas ?? '',
    tratamiento: ev.tratamiento ?? '',
    estadoClinico: ev.estadoClinico ?? ev.estado_clinico ?? '',
    recomendaciones: ev.recomendaciones ?? '',
    proximoControl: toDateInput(ev.proximoControl ?? ev.proximo_control),
    observaciones: ev.observaciones ?? '',
  };
}

function evolucionToApi(ev = {}) {
  return {
    fecha: ev.fecha || null,
    doctor: ev.doctor || null,
    motivo: ev.motivo || null,
    diagnostico: ev.diagnostico || null,
    procedimiento: ev.procedimiento,
    piezas_tratadas: ev.piezasTratadas || null,
    tratamiento: ev.tratamiento || null,
    estado_clinico: ev.estadoClinico || null,
    recomendaciones: ev.recomendaciones || null,
    proximo_control: ev.proximoControl || null,
    observaciones: ev.observaciones || null,
  };
}

function normalizeCotizacion(cotizacion = {}) {
  if (cotizacion.info && cotizacion.procedimientos) return cotizacion;

  const procedimientos = (cotizacion.procedimientos || []).map(normalizeProcedimiento);
  const pagos = (cotizacion.pagos || []).map(normalizePago);
  const calculated = calcTotales(procedimientos, pagos);
  const total = Number(cotizacion.total ?? cotizacion.valor_total ?? calculated.total) || 0;
  const totalPagado = Number(cotizacion.totalPagado ?? cotizacion.total_pagado ?? calculated.totalPagado) || 0;
  const saldo = Number(cotizacion.saldo ?? Math.max(total - totalPagado, 0)) || 0;

  return {
    ...cotizacion,
    info: {
      fecha: toDateInput(cotizacion.fecha ?? cotizacion.created_at),
      doctor: cotizacion.doctor ?? cotizacion.doctor_nombre ?? cotizacion.odontologo ?? '',
      doctor_id: cotizacion.doctor_id ?? null,
      tipo: cotizacion.tipo ?? cotizacion.tipo_tratamiento ?? '',
      estado: cotizacion.estado ?? 'borrador',
      prioridad: cotizacion.prioridad ?? 'media',
      motivo: cotizacion.motivo ?? '',
      observaciones: cotizacion.observaciones ?? '',
    },
    procedimientos,
    pagos,
    totales: { total, totalPagado, saldo },
  };
}

export function AppProvider({ children }) {
  const [token, setToken]         = useState(() => localStorage.getItem('token'));
  const [pacientes, setPacientes] = useState([]);
  const [historias, setHistorias] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    api.getPacientes()
      .then((data) => setPacientes(data))
      .catch((err) => {
        console.error('Error cargando pacientes:', err);
        if (err.status === 401 || err.status === 403) {
          cerrarSesion();
        } else {
          setError('No se pudieron cargar los pacientes');
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  // ── Auth ──────────────────────────────────────────────────────────────────

  function guardarToken(nuevoToken) {
    localStorage.setItem('token', nuevoToken);
    setToken(nuevoToken);
  }

  function cerrarSesion() {
    localStorage.removeItem('token');
    setToken(null);
    setPacientes([]);
    setHistorias([]);
  }

  // ── Pacientes ─────────────────────────────────────────────────────────────

  async function recargarPacientes() {
    try {
      const data = await api.getPacientes();
      setPacientes(data);
    } catch (err) {
      console.error('Error recargando pacientes:', err);
    }
  }

  async function agregarPaciente(datosPaciente) {
    const nuevo = await api.crearPaciente(datosPaciente);
    setPacientes((prev) => [nuevo, ...prev]);
  }

  async function eliminarPaciente(id) {
    await api.eliminarPaciente(id);
    setPacientes((prev) => prev.filter((p) => p.id !== id));
    setHistorias((prev) => prev.filter((h) => h.pacienteId !== id));
  }

  // ── Historias ─────────────────────────────────────────────────────────────

  async function actualizarHistoria(historiaActualizada) {
    const { id } = historiaActualizada;
    const datos = { ...historiaActualizada };
    [
      'id', 'evoluciones', 'adjuntos', 'pacienteNombre', 'cedula',
      'tipoDocumento', 'fechaNacimiento', 'sexo', 'telefono',
      'correo', 'municipioCiudad', 'pacienteId',
    ].forEach((key) => delete datos[key]);

    await api.actualizarHistoria(id, datos);
    setHistorias((prev) =>
      prev.map((h) => h.id === id ? historiaActualizada : h)
    );
  }

  async function crearEvolucion(historiaId, datos) {
    const nueva = normalizeEvolucion(
      await api.crearEvolucion(historiaId, evolucionToApi(datos))
    );
    setHistorias((prev) => prev.map((h) =>
      h.id === historiaId
        ? { ...h, evoluciones: [...(h.evoluciones || []), nueva] }
        : h
    ));
    return nueva;
  }

  async function eliminarEvolucion(historiaId, evolucionId) {
    await api.eliminarEvolucion(historiaId, evolucionId);
    setHistorias((prev) => prev.map((h) =>
      h.id === historiaId
        ? { ...h, evoluciones: h.evoluciones.filter((e) => e.id !== evolucionId) }
        : h
    ));
  }

  async function actualizarOdontograma(historiaId, odontograma) {
    await api.actualizarOdontograma(historiaId, odontograma);
    setHistorias((prev) => prev.map((h) =>
      h.id === historiaId ? { ...h, odontograma } : h
    ));
  }

  // ── Cotizaciones / Tratamientos ───────────────────────────────────────────

  async function getCotizacionesPaciente(pacienteId) {
    const cotizaciones = await api.getCotizacionesPaciente(pacienteId);
    return (cotizaciones || []).map(normalizeCotizacion);
  }

  async function guardarTratamiento(data, pacienteId) {
  const { id, accion, info, procedimientos, pagos = [] } = data;

  // procedimientos llegan en camelCase desde el form (sin mapear)
  const procedimientosBody = procedimientos.map((p, index) => {
    const cantidad      = Number(p.cantidad      ?? p.cantidad)      || 1;
    const valorUnitario = Number(p.valorUnitario ?? p.valor_unitario) || 0;
    const descuento     = Number(p.descuento)    || 0;
    return {
      procedimiento:  p.procedimiento,
      descripcion:    p.descripcion          ?? null,
      aplica_en:      p.aplicaEn ?? p.aplica_en ?? 'general',
      dientes:        p.dientes              ?? [],
      cuadrante:      p.cuadrante            || null,
      cantidad,
      valor_unitario: valorUnitario,
      descuento,
      estado:         p.estado               ?? 'pendiente',
      observaciones:  p.observaciones        || null,
      orden:          index,
    };
  });

  // pagos llegan con metodo (label) desde el form
  const pagosBody = pagos
    .filter((p) => Number(p.monto) > 0)
    .map((p) => ({
      id:          p.id,         // back lo usa para distinguir nuevos vs existentes en PUT
      fecha:       p.fecha       ?? null,
      monto:       Number(p.monto),
      metodo_pago: normalizeMetodoPago(p.metodo ?? p.metodo_pago),
      referencia:  p.referencia  || null,
    }));

  const body = {
    paciente_id:      pacienteId,
    doctor_id:        info.doctor_id        ?? null,
    tipo_tratamiento: info.tipo             ?? null,
    prioridad:        info.prioridad        ?? 'media',
    estado:           accion === 'aprobar'  ? 'aprobado' : (info.estado ?? 'borrador'),
    motivo:           info.motivo           ?? null,
    observaciones:    info.observaciones    ?? null,
    procedimientos:   procedimientosBody,
    pagos:            pagosBody,            // ← van dentro del body, no por separado
  };

  // id null → crear, id número real → editar
  const esEdicion = Number.isInteger(id) && id > 0;

  const cotizacion = esEdicion
    ? await api.actualizarCotizacion(id, body)
    : await api.crearCotizacion(body);

  return normalizeCotizacion(cotizacion);
}

  async function cambiarEstadoCotizacion(cotizacionId, estado) {
    return api.cambiarEstadoCotizacion(cotizacionId, estado);
  }

  async function eliminarCotizacion(cotizacionId) {
    return api.eliminarCotizacion(cotizacionId);
  }

  // ── Pagos ─────────────────────────────────────────────────────────────────

  async function getPagosPaciente(pacienteId) {
    return api.getPagosPaciente(pacienteId);
  }

  async function registrarPago(datos) {
    // datos: { paciente_id, cotizacion_id?, monto, metodo_pago, referencia?, concepto? }
    return api.crearPago(datos);
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <AppContext.Provider value={{
      // Auth
      token, guardarToken, cerrarSesion,

      // Pacientes
      pacientes, setPacientes,
      agregarPaciente, eliminarPaciente, recargarPacientes,

      // Historias
      historias, setHistorias,
      actualizarHistoria, crearEvolucion, eliminarEvolucion, actualizarOdontograma,

      // Cotizaciones
      getCotizacionesPaciente, guardarTratamiento, cambiarEstadoCotizacion, eliminarCotizacion,

      // Pagos
      getPagosPaciente, registrarPago,

      // Estado global
      loading, error,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe usarse dentro de AppProvider');
  return ctx;
}
