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

export const api = {
  verPDF,
  verHistoriaPDF,
  verCotizacionPDF,

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
  actualizarOdontograma: (historiaId, data) => request(`/historias/${historiaId}/odontograma`, { method: 'PUT', body: JSON.stringify(data) }),

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
}
