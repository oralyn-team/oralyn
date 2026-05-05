import { createContext, useContext, useState, useEffect } from 'react';
import { historiasIniciales } from '../data/historiasData';
import { api } from '../api';

const AppContext = createContext(null);

function crearHistoriaDesde(paciente) {
  const hoy = new Date();
  const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`;

  return {
    id:               Date.now() + Math.random(),
    pacienteId:       paciente.id,
    pacienteNombre:   `${paciente.nombres} ${paciente.primer_apellido}${paciente.segundo_apellido ? ' ' + paciente.segundo_apellido : ''}`,
    cedula:           paciente.numero_documento,
    tipoDocumento:    paciente.tipo_documento,
    fechaNacimiento:  paciente.fecha_nacimiento,
    sexo:             paciente.sexo === 'F' ? 'Femenino' : paciente.sexo === 'M' ? 'Masculino' : 'Otro',
    telefono:         paciente.telefono || '',
    correo:           paciente.correo   || '',
    municipioCiudad:  paciente.municipio_ciudad || '',
    fechaCreacion:    fecha,
    departamento:     '',
    edad:             '',
    acudiente:        '',
    parentesco:       '',
    eps:              '',
    tipoAfiliacion:   '',
    estadoCivil:      '',
    direccion:        '',
    ocupacion:        '',
    tipoSangre:       '',
    rh:               '',
    alergias:         '',
    medicamentos:     '',
    antOdontologicos: '',
    motivoConsulta:   '',
    eventoAdverso:    false,
    eventoAdversoObs: '',
    antecedentes:     {},
    habitosOrales:    {},
    habitosObs:       '',
    estomatologico:   {},
    estomatologicoObs:'',
    odontograma:      {},
    evoluciones:      [],
    adjuntos:         [],
  };
}

export function AppProvider({ children }) {
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const [historias, setHistorias] = useState(() => [...historiasIniciales]);

  // ── Carga inicial desde el backend ─────────────────────────────────────
  useEffect(() => {
    api.getPacientes()
      .then((data) => {
        setPacientes(data);
        // Crear historia vacía para los que no tengan
        setHistorias((prev) => {
          const extras = data
            .filter((p) => !prev.find((h) => h.pacienteId === p.id))
            .map(crearHistoriaDesde);
          return [...prev, ...extras];
        });
      })
      .catch((err) => {
        console.error('Error cargando pacientes:', err);
        setError('No se pudieron cargar los pacientes');
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Pacientes ──────────────────────────────────────────────────────────
  async function agregarPaciente(datosPaciente) {
    const nuevo = await api.crearPaciente(datosPaciente);
    setPacientes((prev) => [nuevo, ...prev]);
    setHistorias((prev) => [crearHistoriaDesde(nuevo), ...prev]);
  }

  async function eliminarPaciente(id) {
    await api.eliminarPaciente(id);
    setPacientes((prev) => prev.filter((p) => p.id !== id));
    setHistorias((prev) => prev.filter((h) => h.pacienteId !== id));
  }

  // ── Historias ──────────────────────────────────────────────────────────
  function actualizarHistoria(historiaActualizada) {
    setHistorias((prev) =>
      prev.map((h) => h.id === historiaActualizada.id ? historiaActualizada : h)
    );
  }

  return (
    <AppContext.Provider value={{
      pacientes, setPacientes, agregarPaciente, eliminarPaciente,
      historias, actualizarHistoria,
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