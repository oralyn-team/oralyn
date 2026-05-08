const BASE_URL = 'http://localhost:3000/api'

function getToken() {
  return localStorage.getItem('token')
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...options.headers,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw { status: res.status, ...error }
  }

  return res.json()
}

export const api = {
  // Auth
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  // Pacientes
  getPacientes:     ()         => request('/pacientes'),
  buscarPacientes:  (q)        => request(`/pacientes/buscar?q=${encodeURIComponent(q)}`),
  getPaciente:      (id)       => request(`/pacientes/${id}`),
  crearPaciente:    (data)     => request('/pacientes', { method: 'POST', body: JSON.stringify(data) }),
  editarPaciente:   (id, data) => request(`/pacientes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  eliminarPaciente: (id)       => request(`/pacientes/${id}`, { method: 'DELETE' }),

  // Historias
  getHistoriasPaciente: (pacienteId)       => request(`/historias/${pacienteId}`),
  getHistoriaDetalle:   (id)               => request(`/historias/detalle/${id}`),
  crearHistoria:        (pacienteId, data) => request(`/historias/${pacienteId}`, { method: 'POST', body: JSON.stringify(data) }),
  actualizarHistoria:   (id, data)         => request(`/historias/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Evoluciones
  getEvoluciones:      (historiaId)              => request(`/historias/${historiaId}/evoluciones`),
  crearEvolucion:      (historiaId, data)         => request(`/historias/${historiaId}/evoluciones`, { method: 'POST', body: JSON.stringify(data) }),

  // Odontograma
  actualizarOdontograma: (historiaId, data) => request(`/historias/${historiaId}/odontograma`, { method: 'PUT', body: JSON.stringify(data) }),

  // Adjuntos
  crearAdjunto:    (historiaId, data)        => request(`/historias/${historiaId}/adjuntos`, { method: 'POST', body: JSON.stringify(data) }),
  eliminarAdjunto: (historiaId, adjuntoId)   => request(`/historias/${historiaId}/adjuntos/${adjuntoId}`, { method: 'DELETE' }),
}