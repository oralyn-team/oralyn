const BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

function getToken() {
  return localStorage.getItem('token')
}

async function verPDF(tipo, id) {
  let url;

  switch (tipo) {
    case 'consentimiento':
      url = `${BASE_URL}/pdf/consentimiento/${id}`;
      break;

    case 'certificado':
      url = `${BASE_URL}/pdf/certificado/${id}`;
      break;

    default:
      throw new Error(`Tipo de PDF no soportado: ${tipo}`);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(error);
    throw new Error('Error al obtener el PDF');
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  window.open(objectUrl, '_blank');
}

async function verHistoriaPDF(historiaId) {
  const url = `${BASE_URL}/pdf/historia/${historiaId}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al obtener el PDF');
  }

  const blob = await response.blob();
  window.open(URL.createObjectURL(blob), '_blank');
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw { status: res.status, ...error };
  }

  if (res.status === 204) return null;

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ── Procedimientos CUPS — mock localStorage ────────────────────────────────
// Estructura de cada procedimiento:
// { id, codigo, nombre, categoria, valorBase, activo, createdAt }
//
// Cuando el backend esté disponible, basta con reemplazar estas funciones
// por llamadas a `request(...)` con los mismos contratos de entrada/salida.

const CUPS_KEY = 'oralyn_procedimientos_cups';

const CUPS_SEED = [
  // Preventivo
  { id: 'cups_1',  codigo: '890201', nombre: 'Valoración inicial',            categoria: 'Preventivo',   valorBase: 50000,  activo: true },
  { id: 'cups_2',  codigo: '890202', nombre: 'Profilaxis',                    categoria: 'Preventivo',   valorBase: 60000,  activo: true },
  { id: 'cups_3',  codigo: '890203', nombre: 'Limpieza dental',               categoria: 'Preventivo',   valorBase: 60000,  activo: true },
  { id: 'cups_4',  codigo: '890204', nombre: 'Radiografía periapical',        categoria: 'Preventivo',   valorBase: 20000,  activo: true },
  { id: 'cups_5',  codigo: '890205', nombre: 'Radiografía panorámica',        categoria: 'Preventivo',   valorBase: 80000,  activo: true },
  // Restaurador
  { id: 'cups_6',  codigo: '890301', nombre: 'Resina compuesta',              categoria: 'Restaurador',  valorBase: 120000, activo: true },
  { id: 'cups_7',  codigo: '890302', nombre: 'Restauración',                  categoria: 'Restaurador',  valorBase: 100000, activo: true },
  { id: 'cups_8',  codigo: '890303', nombre: 'Incrustación (Inlay)',          categoria: 'Restaurador',  valorBase: 350000, activo: true },
  { id: 'cups_9',  codigo: '890304', nombre: 'Corona dental',                 categoria: 'Restaurador',  valorBase: 800000, activo: true },
  { id: 'cups_10', codigo: '890305', nombre: 'Sellante de fisuras',           categoria: 'Restaurador',  valorBase: 40000,  activo: true },
  // Endodoncia
  { id: 'cups_11', codigo: '890401', nombre: 'Endodoncia unirradicular',      categoria: 'Endodoncia',   valorBase: 400000, activo: true },
  { id: 'cups_12', codigo: '890402', nombre: 'Endodoncia birradicular',       categoria: 'Endodoncia',   valorBase: 550000, activo: true },
  { id: 'cups_13', codigo: '890403', nombre: 'Endodoncia trirradicular',      categoria: 'Endodoncia',   valorBase: 700000, activo: true },
  { id: 'cups_14', codigo: '890404', nombre: 'Retratamiento endodóntico',     categoria: 'Endodoncia',   valorBase: 600000, activo: true },
  // Cirugía
  { id: 'cups_15', codigo: '890501', nombre: 'Exodoncia simple',              categoria: 'Cirugía',      valorBase: 80000,  activo: true },
  { id: 'cups_16', codigo: '890502', nombre: 'Exodoncia quirúrgica',          categoria: 'Cirugía',      valorBase: 200000, activo: true },
  { id: 'cups_17', codigo: '890503', nombre: 'Cirugía de terceros molares',   categoria: 'Cirugía',      valorBase: 350000, activo: true },
  { id: 'cups_18', codigo: '890504', nombre: 'Implante dental',               categoria: 'Cirugía',      valorBase: 2500000,activo: true },
  { id: 'cups_19', codigo: '890505', nombre: 'Frenectomía',                   categoria: 'Cirugía',      valorBase: 250000, activo: true },
  // Estético
  { id: 'cups_20', codigo: '890601', nombre: 'Blanqueamiento dental',         categoria: 'Estético',     valorBase: 400000, activo: true },
  { id: 'cups_21', codigo: '890602', nombre: 'Carillas de resina',            categoria: 'Estético',     valorBase: 300000, activo: true },
  { id: 'cups_22', codigo: '890603', nombre: 'Carillas de porcelana',         categoria: 'Estético',     valorBase: 1200000,activo: true },
  { id: 'cups_23', codigo: '890604', nombre: 'Diseño de sonrisa',             categoria: 'Estético',     valorBase: 500000, activo: true },
  // Ortodoncia
  { id: 'cups_24', codigo: '890701', nombre: 'Ortodoncia fija (inicio)',      categoria: 'Ortodoncia',   valorBase: 3000000,activo: true },
  { id: 'cups_25', codigo: '890702', nombre: 'Control de ortodoncia',         categoria: 'Ortodoncia',   valorBase: 80000,  activo: true },
  { id: 'cups_26', codigo: '890703', nombre: 'Ortodoncia invisible',          categoria: 'Ortodoncia',   valorBase: 4000000,activo: true },
  { id: 'cups_27', codigo: '890704', nombre: 'Retenedores',                   categoria: 'Ortodoncia',   valorBase: 200000, activo: true },
  // Prótesis
  { id: 'cups_28', codigo: '890801', nombre: 'Prótesis parcial removible',    categoria: 'Prótesis',     valorBase: 800000, activo: true },
  { id: 'cups_29', codigo: '890802', nombre: 'Prótesis total',                categoria: 'Prótesis',     valorBase: 1500000,activo: true },
  { id: 'cups_30', codigo: '890803', nombre: 'Prótesis fija (puente)',        categoria: 'Prótesis',     valorBase: 2000000,activo: true },
  { id: 'cups_31', codigo: '890804', nombre: 'Provisional acrílico',          categoria: 'Prótesis',     valorBase: 150000, activo: true },
  // Periodoncia
  { id: 'cups_32', codigo: '890901', nombre: 'Curetaje',                      categoria: 'Periodoncia',  valorBase: 120000, activo: true },
  { id: 'cups_33', codigo: '890902', nombre: 'Raspado y alisado radicular',   categoria: 'Periodoncia',  valorBase: 180000, activo: true },
  { id: 'cups_34', codigo: '890903', nombre: 'Gingivoplastia',                categoria: 'Periodoncia',  valorBase: 300000, activo: true },
  { id: 'cups_35', codigo: '890904', nombre: 'Control periodontal',           categoria: 'Periodoncia',  valorBase: 60000,  activo: true },
];

/** Retorna todos los procedimientos desde localStorage, inicializando el seed si no existe */
function _cupsRead() {
  const raw = localStorage.getItem(CUPS_KEY);
  if (!raw) {
    const seeded = CUPS_SEED.map((p) => ({ ...p, createdAt: new Date().toISOString() }));
    localStorage.setItem(CUPS_KEY, JSON.stringify(seeded));
    return seeded;
  }
  return JSON.parse(raw);
}

function _cupsWrite(data) {
  localStorage.setItem(CUPS_KEY, JSON.stringify(data));
}

function _delay(ms = 120) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getProcedimientos() {
  await _delay();
  return _cupsRead();
}

async function crearProcedimiento(data) {
  await _delay();
  const list = _cupsRead();
  const nuevo = {
    ...data,
    id: `cups_${Date.now()}`,
    activo: data.activo !== false,
    createdAt: new Date().toISOString(),
  };
  _cupsWrite([...list, nuevo]);
  return nuevo;
}

async function actualizarProcedimiento(id, data) {
  await _delay();
  const list = _cupsRead();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) throw { status: 404, error: 'Procedimiento no encontrado' };
  const updated = { ...list[idx], ...data, id };
  list[idx] = updated;
  _cupsWrite(list);
  return updated;
}

async function eliminarProcedimiento(id) {
  await _delay();
  const list = _cupsRead();
  const filtered = list.filter((p) => p.id !== id);
  _cupsWrite(filtered);
  return null;
}

// Agrega esta función junto a verHistoriaPDF:
async function verCotizacionPDF(cotizacionId) {
  const url = `${BASE_URL}/cotizaciones/${cotizacionId}/pdf`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al obtener el PDF');
  }

  const blob = await response.blob();
  window.open(URL.createObjectURL(blob), '_blank');
}

async function verRecomendacionesPDF() {
  const url = `${BASE_URL}/pdf/recomendaciones`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al obtener el PDF');
  }

  const blob = await response.blob();
  window.open(URL.createObjectURL(blob), '_blank');
}

export const api = {
  verPDF,
  verHistoriaPDF,
  verCotizacionPDF,
  verRecomendacionesPDF,

  // Auth
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  // Pacientes
  getPacientes:       ()         => request('/pacientes'),
  buscarPacientes:    (q)        => request(`/pacientes/buscar?q=${encodeURIComponent(q)}`),
  getPaciente:        (id)       => request(`/pacientes/${id}`),
  crearPaciente:      (data)     => request('/pacientes', { method: 'POST', body: JSON.stringify(data) }),
  actualizarPaciente: (id, data) => request(`/pacientes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  eliminarPaciente:   (id)       => request(`/pacientes/${id}`, { method: 'DELETE' }),

  // Citas
  getCitas:             ()         => request('/citas'),
  crearCita:            (data)     => request('/citas', { method: 'POST', body: JSON.stringify(data) }),
  actualizarCita:       (id, data) => request(`/citas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  eliminarCita:         (id)       => request(`/citas/${id}`, { method: 'DELETE' }),
  cambiarEstadoCita:    (id, estado) => request(`/citas/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado }) }),

  // Historias
  getHistoriasPaciente: (pacienteId)       => request(`/historias/${pacienteId}`),
  getHistoriaDetalle:   (id)               => request(`/historias/detalle/${id}`),
  crearHistoria:        (pacienteId, data) => request(`/historias/${pacienteId}`, { method: 'POST', body: JSON.stringify(data) }),
  actualizarHistoria:   (id, data)         => request(`/historias/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Evoluciones
  getEvoluciones: (historiaId)       => request(`/historias/${historiaId}/evoluciones`),
  crearEvolucion: (historiaId, data) => request(`/historias/${historiaId}/evoluciones`, { method: 'POST', body: JSON.stringify(data) }),

  // Odontograma
  actualizarOdontograma: (historiaId, tipo, data) => request(`/historias/${historiaId}/odontograma/${tipo}`, { method: 'PUT', body: JSON.stringify(data),}),

  // Adjuntos
  crearAdjunto:    (historiaId, data)      => request(`/historias/${historiaId}/adjuntos`, { method: 'POST', body: JSON.stringify(data) }),
  eliminarAdjunto: (historiaId, adjuntoId) => request(`/historias/${historiaId}/adjuntos/${adjuntoId}`, { method: 'DELETE' }),

  // Cotizaciones / Tratamientos
  getCotizacionesPaciente: (pacienteId) => request(`/cotizaciones/paciente/${pacienteId}`),
  getCotizacion:           (id)         => request(`/cotizaciones/${id}`),
  crearCotizacion:         (data)       => request('/cotizaciones', { method: 'POST', body: JSON.stringify(data) }),
  actualizarCotizacion:    (id, data)   => request(`/cotizaciones/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  cambiarEstadoCotizacion: (id, estado) => request(`/cotizaciones/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado }) }),
  eliminarCotizacion:      (id)         => request(`/cotizaciones/${id}`, { method: 'DELETE' }),
  verCotizacionPDF:        (id)         => verCotizacionPDF(id),
  verRecomendacionesPDF:   ()           => verRecomendacionesPDF(),

  // Pagos
  getPagosPaciente: (pacienteId) => request(`/pagos/paciente/${pacienteId}`),
  crearPago:        (data)       => request('/pagos', { method: 'POST', body: JSON.stringify(data) }),

  // Consentimientos
  getConsentimientosPaciente: (pacienteId) => request(`/consentimientos/paciente/${pacienteId}`),
  getConsentimiento:          (id)         => request(`/consentimientos/${id}`),
  crearConsentimiento:        (data)       => request('/consentimientos', { method: 'POST', body: JSON.stringify(data) }),
  actualizarFirmasConsentimiento: (id, data) =>
    request(`/consentimientos/${id}/firmas`, { method: 'PATCH', body: JSON.stringify(data) }),
  anularConsentimiento:       (id, motivo_anulacion) =>
    request(`/consentimientos/${id}/anular`, { method: 'PATCH', body: JSON.stringify({ motivo_anulacion }) }),
  eliminarConsentimiento:     (id)         => request(`/consentimientos/${id}`, { method: 'DELETE' }),

  // Certificados dentales
  getCertificadosPaciente: (pacienteId) => request(`/certificados/paciente/${pacienteId}`),
  crearCertificado:       (data)       => request('/certificados', { method: 'POST', body: JSON.stringify(data) }),
  anularCertificado:      (id, motivo_anulacion) =>
    request(`/certificados/${id}/anular`, { method: 'PATCH', body: JSON.stringify({ motivo_anulacion }) }),
  eliminarCertificado:    (id)         => request(`/certificados/${id}`, { method: 'DELETE' }),


  // Dashboard
  getDashboard: () => request('/dashboard'),

  // Configuración
  getConfiguracion: () => request('/configuracion'),
  actualizarConfiguracion: (data) => request('/configuracion', { method: 'PUT', body: JSON.stringify(data) }),

  // Catálogo de Procedimientos CUPS (mock localStorage — reemplazar por request() cuando el backend esté listo)
  getProcedimientos:         ()         => getProcedimientos(),
  crearProcedimiento:        (data)     => crearProcedimiento(data),
  actualizarProcedimiento:   (id, data) => actualizarProcedimiento(id, data),
  eliminarProcedimiento:     (id)       => eliminarProcedimiento(id),
}

