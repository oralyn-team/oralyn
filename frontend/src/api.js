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
  login: (email, password) =>
  request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),

  getPacientes: () => request('/pacientes'),
  buscarPacientes: (q) => request(`/pacientes/buscar?q=${encodeURIComponent(q)}`),
  getPaciente: (id) => request(`/pacientes/${id}`),
  crearPaciente: (data) =>
    request('/pacientes', { method: 'POST', body: JSON.stringify(data) }),
  editarPaciente: (id, data) =>
    request(`/pacientes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  eliminarPaciente: (id) =>
    request(`/pacientes/${id}`, { method: 'DELETE' }),
}