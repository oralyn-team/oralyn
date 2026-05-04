// src/context/AppContext.jsx
import { createContext, useContext, useState } from 'react';
import { pacientesIniciales } from '../data/pacientesData';
import { historiasIniciales  } from '../data/historiasData';

const AppContext = createContext(null);

// Historia vacía generada desde los datos del paciente
function crearHistoriaDesde(paciente) {
  const hoy = new Date();
  const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`;

  return {
    id:               Date.now() + Math.random(),
    pacienteId:       paciente.id,
    // Datos sincronizados desde paciente
    pacienteNombre:   `${paciente.nombres} ${paciente.primer_apellido}${paciente.segundo_apellido ? ' ' + paciente.segundo_apellido : ''}`,
    cedula:           paciente.numero_documento,
    tipoDocumento:    paciente.tipo_documento,
    fechaNacimiento:  paciente.fecha_nacimiento,
    sexo:             paciente.sexo === 'F' ? 'Femenino' : paciente.sexo === 'M' ? 'Masculino' : 'Otro',
    telefono:         paciente.telefono || '',
    correo:           paciente.correo   || '',
    municipioCiudad:  paciente.municipio_ciudad || '',
    fechaCreacion:    fecha,
    // Campos exclusivos de la historia
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

// Normalizar pacientes iniciales al formato nuevo si vienen del mock viejo
function normalizarPaciente(p) {
  if (p.primer_apellido) return p; // ya está en formato nuevo
  // Compatibilidad con el mock anterior (nombre, cedula, telefono)
  const partes = (p.nombre || '').trim().split(' ');
  return {
    ...p,
    nombres:          partes[0] || '',
    primer_apellido:  partes[1] || '',
    segundo_apellido: partes[2] || '',
    tipo_documento:   'CC',
    numero_documento: p.cedula || '',
    fecha_nacimiento: '',
    sexo:             '',
    municipio_ciudad: '',
    correo:           '',
  };
}

export function AppProvider({ children }) {
  const [pacientes, setPacientes] = useState(
    pacientesIniciales.map(normalizarPaciente)
  );

  const [historias, setHistorias] = useState(() => {
    // Partir de las historias iniciales simuladas
    const base = [...historiasIniciales];
    // Crear historia vacía para cualquier paciente que no tenga
    pacientesIniciales.forEach((p) => {
      const normalizado = normalizarPaciente(p);
      if (!base.find((h) => h.pacienteId === p.id)) {
        base.push(crearHistoriaDesde(normalizado));
      }
    });
    return base;
  });

  // ── Pacientes ──────────────────────────────────────────────────────────
  function agregarPaciente(datosPaciente) {
    const nuevo = { ...datosPaciente, id: Date.now() };
    setPacientes((prev) => [nuevo, ...prev]);
    // Crear historia vacía automáticamente
    setHistorias((prev) => [crearHistoriaDesde(nuevo), ...prev]);
  }

  function eliminarPaciente(id) {
    setPacientes((prev) => prev.filter((p) => p.id !== id));
    // Opcional: también eliminar su historia
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