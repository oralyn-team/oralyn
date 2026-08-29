const BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

let onUnauthorized = null
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn
}

function getAuthHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
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
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      onUnauthorized?.();
    }
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
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      onUnauthorized?.();
    }
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
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      onUnauthorized?.();
    }
    const error = await res.json().catch(() => ({}));
    throw { status: res.status, ...error };
  }

  if (res.status === 204) return null;

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function buildQuery(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val)
    }
  })
  const str = query.toString()
  return str ? `?${str}` : ''
}

async function verCotizacionPDF(cotizacionId) {
  const url = `${BASE_URL}/cotizaciones/${cotizacionId}/pdf`;

  const response = await fetch(url, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      onUnauthorized?.();
    }
    throw new Error('Error al obtener el PDF');
  }

  const blob = await response.blob();
  window.open(URL.createObjectURL(blob), '_blank');
}

async function verRecomendacionesPDF() {
  const url = `${BASE_URL}/pdf/recomendaciones`;

  const response = await fetch(url, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      onUnauthorized?.();
    }
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
  getUsuarios: () => request('/usuarios'),

  // Pacientes
  getPacientes:       (params)   => request(`/pacientes${buildQuery(params)}`),
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

  // Catálogo de Procedimientos CUPS y CIE-10 (Backend Real)
  getCatalogoOficial: (params) => request(`/catalogo-cups${buildQuery(params)}`),
  getCatalogoCie10: (params) => request(`/catalogo-cie10${buildQuery(params)}`),
  getProcedimientos: (params) => request(`/procedimientos${buildQuery(params)}`),
  crearProcedimiento: (data) =>
    request('/procedimientos', {
      method: 'POST',
      body: JSON.stringify({
        catalogo_oficial_id: data.catalogo_oficial_id || data.id,
        nombre_visible: data.nombre_visible || data.nombre,
        precio: data.precio !== undefined ? data.precio : data.valorBase,
        activo: data.activo !== false
      }),
    }),
  actualizarProcedimiento: (id, data) =>
    request(`/procedimientos/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        nombre_visible: data.nombre_visible || data.nombre,
        precio: data.precio !== undefined ? data.precio : data.valorBase,
        activo: data.activo
      }),
    }),
  eliminarProcedimiento: (id) => request(`/procedimientos/${id}`, { method: 'DELETE' }),

  // Módulo de RIPS (Backend Real)
  getRips: (params) => request(`/rips${buildQuery(params)}`),
  getRip: (id) => request(`/rips/${id}`),
  generarRips: (data) => request('/rips/generar', { method: 'POST', body: JSON.stringify(data) }),
  eliminarRips: (id) => request(`/rips/${id}`, { method: 'DELETE' }),
  descargarRipsFile: async (id, formato = 'json') => {
    const url = `${BASE_URL}/rips/${id}/descargar?formato=${encodeURIComponent(formato)}`;
    const response = await fetch(url, {
      headers: {
        ...getAuthHeaders(),
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        onUnauthorized?.();
      }
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Error al descargar el archivo RIPS');
    }

    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition');
    let filename = `rips_${id}.${formato}`;
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) filename = match[1];
    }

    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  }
}


