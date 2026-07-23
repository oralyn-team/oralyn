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

// ── Catálogo CUPS Oficial (Solo Lectura) ──────────────────────────────────
export const CATALOGO_CUPS_OFICIAL = [
  // Promoción y prevención
  { codigo: '890201', nombreOficial: 'CONSULTA DE PRIMERA VEZ POR ODONTOLOGÍA GENERAL', categoria: 'Promoción y prevención', frecuente: true },
  { codigo: '890202', nombreOficial: 'CONTROL DE PRIMERA VEZ POR ODONTOLOGÍA GENERAL', categoria: 'Promoción y prevención', frecuente: true },
  { codigo: '890203', nombreOficial: 'PROFILAXIS DENTAL Y CONTROL DE PLACA', categoria: 'Promoción y prevención', frecuente: true },
  { codigo: '890204', nombreOficial: 'APLICACIÓN TÓPICA DE FLÚOR EN GEL O BARNIZ', categoria: 'Promoción y prevención', frecuente: true },
  { codigo: '890205', nombreOficial: 'APLICACIÓN DE SELLANTES DE FOSAS Y FISURAS', categoria: 'Promoción y prevención', frecuente: true },
  { codigo: '890206', nombreOficial: 'RADIOGRAFÍA PERIAPICAL O CORONAL', categoria: 'Promoción y prevención', frecuente: false },

  // Restaurador
  { codigo: '890301', nombreOficial: 'RESTAURACIÓN DENTAL CON RESINA DE FOTOCURADO', categoria: 'Restaurador', frecuente: true },
  { codigo: '890302', nombreOficial: 'RESTAURACIÓN ODONTOLÓGICA CON AMALGAMA', categoria: 'Restaurador', frecuente: false },
  { codigo: '890303', nombreOficial: 'INCRUSTACIÓN METÁLICA O ESTÉTICA (INLAY/ONLAY)', categoria: 'Restaurador', frecuente: false },
  { codigo: '890304', nombreOficial: 'RECONSTRUCCIÓN DE MUÑÓN CON NÚCLEO PREFABRICADO', categoria: 'Restaurador', frecuente: true },

  // Endodoncia
  { codigo: '890401', nombreOficial: 'TRATAMIENTO DE CONDUCTOS EN DENTICIÓN PERMANENTE UNIRRADICULAR', categoria: 'Endodoncia', frecuente: true },
  { codigo: '890402', nombreOficial: 'TRATAMIENTO DE CONDUCTOS EN DENTICIÓN PERMANENTE BIRRADICULAR', categoria: 'Endodoncia', frecuente: true },
  { codigo: '890403', nombreOficial: 'TRATAMIENTO DE CONDUCTOS EN DENTICIÓN PERMANENTE MULTIRRADICULAR', categoria: 'Endodoncia', frecuente: false },
  { codigo: '890404', nombreOficial: 'RETRATAMIENTO ENDODÓNTICO EN DIENTE UNIRRADICULAR O MULTIRRADICULAR', categoria: 'Endodoncia', frecuente: false },

  // Ortodoncia
  { codigo: '890701', nombreOficial: 'INSTALACIÓN DE APARATOLOGÍA FIJA DE ORTODONCIA (BRACKETS)', categoria: 'Ortodoncia', frecuente: true },
  { codigo: '890702', nombreOficial: 'CONTROL MENSUAL DE TRATAMIENTO DE ORTODONCIA', categoria: 'Ortodoncia', frecuente: true },
  { codigo: '890703', nombreOficial: 'ELABORACIÓN E INSTALACIÓN DE RETENEDORES DE ORTODONCIA', categoria: 'Ortodoncia', frecuente: false },

  // Cirugía
  { codigo: '890501', nombreOficial: 'EXODONCIA DE DIENTE PERMANENTE UNIRRADICULAR O MULTIRRADICULAR', categoria: 'Cirugía', frecuente: true },
  { codigo: '890502', nombreOficial: 'EXODONCIA QUIRÚRGICA DE TERCER MOLAR RETENIDO O INCLUIDO', categoria: 'Cirugía', frecuente: true },
  { codigo: '890503', nombreOficial: 'FRENECTOMÍA LABIAL O LINGUAL', categoria: 'Cirugía', frecuente: false },

  // Rehabilitación
  { codigo: '890801', nombreOficial: 'COLOCACIÓN DE CORONA COMPLETA INDIVIDUAL EN METAL-CERÁMICA O ZIRCONIO', categoria: 'Rehabilitación', frecuente: true },
  { codigo: '890802', nombreOficial: 'PRÓTESIS PARCIAL REMOVIBLE ACRÍLICA O METÁLICA', categoria: 'Rehabilitación', frecuente: false },
  { codigo: '890803', nombreOficial: 'PRÓTESIS TOTAL SUPERIOR E INFERIOR ACRÍLICA', categoria: 'Rehabilitación', frecuente: false },
  { codigo: '890804', nombreOficial: 'IMPLANTE DENTAL OSEOINTEGRADO INDIVIDUAL', categoria: 'Rehabilitación', frecuente: true },
];

const CUPS_KEY = 'oralyn_procedimientos_cups';

const CUPS_SEED = [
  { id: 'cups_1',  codigo: '890201', nombreOficial: 'CONSULTA DE PRIMERA VEZ POR ODONTOLOGÍA GENERAL', nombre: 'Valoración inicial', categoria: 'Promoción y prevención', valorBase: 50000, activo: true },
  { id: 'cups_2',  codigo: '890203', nombreOficial: 'PROFILAXIS DENTAL Y CONTROL DE PLACA', nombre: 'Profilaxis dental', categoria: 'Promoción y prevención', valorBase: 60000, activo: true },
  { id: 'cups_3',  codigo: '890301', nombreOficial: 'RESTAURACIÓN DENTAL CON RESINA DE FOTOCURADO', nombre: 'Resina compuesta', categoria: 'Restaurador', valorBase: 120000, activo: true },
  { id: 'cups_4',  codigo: '890401', nombreOficial: 'TRATAMIENTO DE CONDUCTOS EN DENTICIÓN PERMANENTE UNIRRADICULAR', nombre: 'Endodoncia unirradicular', categoria: 'Endodoncia', valorBase: 400000, activo: true },
  { id: 'cups_5',  codigo: '890501', nombreOficial: 'EXODONCIA DE DIENTE PERMANENTE UNIRRADICULAR O MULTIRRADICULAR', nombre: 'Exodoncia simple', categoria: 'Cirugía', valorBase: 80000, activo: true },
  { id: 'cups_6',  codigo: '890502', nombreOficial: 'EXODONCIA QUIRÚRGICA DE TERCER MOLAR RETENIDO O INCLUIDO', nombre: 'Cirugía de terceros molares', categoria: 'Cirugía', valorBase: 350000, activo: true },
  { id: 'cups_7',  codigo: '890702', nombreOficial: 'CONTROL MENSUAL DE TRATAMIENTO DE ORTODONCIA', nombre: 'Control de ortodoncia', categoria: 'Ortodoncia', valorBase: 80000, activo: true },
  { id: 'cups_8',  codigo: '890801', nombreOficial: 'COLOCACIÓN DE CORONA COMPLETA INDIVIDUAL EN METAL-CERÁMICA O ZIRCONIO', nombre: 'Corona dental', categoria: 'Rehabilitación', valorBase: 800000, activo: true },
  { id: 'cups_9',  codigo: '890804', nombreOficial: 'IMPLANTE DENTAL OSEOINTEGRADO INDIVIDUAL', nombre: 'Implante dental', categoria: 'Rehabilitación', valorBase: 2500000, activo: true },
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

async function getCatalogoOficial() {
  await _delay();
  return CATALOGO_CUPS_OFICIAL;
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
  getCatalogoOficial:        ()         => getCatalogoOficial(),
  getProcedimientos:         ()         => getProcedimientos(),
  crearProcedimiento:        (data)     => crearProcedimiento(data),
  actualizarProcedimiento:   (id, data) => actualizarProcedimiento(id, data),
  eliminarProcedimiento:     (id)       => eliminarProcedimiento(id),
}

