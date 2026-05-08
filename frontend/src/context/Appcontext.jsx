// src/context/AppContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const AppContext = createContext(null);

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
        setError('No se pudieron cargar los pacientes');
      })
      .finally(() => setLoading(false));
  }, [token]);

  // ── Auth ─────────────────────────────────────────────────────────────
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

  // ── Pacientes ────────────────────────────────────────────────────────
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

  // ── Historias ────────────────────────────────────────────────────────
  async function actualizarHistoria(historiaActualizada) {
    const { id, evoluciones, adjuntos, pacienteNombre, cedula,
            tipoDocumento, fechaNacimiento, sexo, telefono,
            correo, municipioCiudad, pacienteId, ...datos } = historiaActualizada;
    await api.actualizarHistoria(id, datos);
    setHistorias((prev) =>
      prev.map((h) => h.id === id ? historiaActualizada : h)
    );
  }

  async function crearEvolucion(historiaId, datos) {
    const nueva = await api.crearEvolucion(historiaId, datos);
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

  return (
    <AppContext.Provider value={{
      token, guardarToken, cerrarSesion,
      pacientes, setPacientes, agregarPaciente, eliminarPaciente, recargarPacientes,
      historias, setHistorias, actualizarHistoria,
      crearEvolucion, eliminarEvolucion, actualizarOdontograma,
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