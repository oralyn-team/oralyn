import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';

import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';
import StatCard from '../components/StatCard';
import HistoriaLista from '../components/historias/HistoriaLista';
import HistoriaDetalle from '../components/historias/HistoriaDetalle';

function buildStats(historias) {
  const conAlergia = historias.filter((h) => h.alergias && h.alergias !== 'Ninguna conocida').length;
  const totalEvoluciones = historias.reduce((acc, h) => acc + (h.evoluciones?.length || 0), 0);

  return [
    { label: 'Total historias', value: historias.length, sub: 'registradas', accentColor: '#3ECFCF' },
    { label: 'Con alergias', value: conAlergia, sub: 'requieren precaución', accentColor: '#EF9F27' },
    { label: 'Total evoluciones', value: totalEvoluciones, sub: 'entradas clínicas', accentColor: '#5DC2A4' },
    {
      label: 'Con adjuntos',
      value: historias.filter((h) => h.adjuntos?.length > 0).length,
      sub: 'archivos cargados',
      accentColor: '#85B7EB',
    },
  ];
}

function formatearFechaNacimiento(fecha) {
  return fecha ? String(fecha).split('T')[0] : '';
}

function formatearSexo(sexo) {
  if (sexo === 'femenino') return 'Femenino';
  if (sexo === 'masculino') return 'Masculino';
  if (sexo === 'otro') return 'Otro';
  return '';
}

function nombreCompletoPaciente(paciente) {
  return `${paciente.nombres} ${paciente.primer_apellido}${paciente.segundo_apellido ? ` ${paciente.segundo_apellido}` : ''}`;
}

function construirHistoriaBase(paciente, historia) {
  return {
    id: historia.id,
    pacienteId: paciente.id,
    paciente_id: paciente.id,

    // Datos del paciente para FormularioClinico
    pacienteNombre: nombreCompletoPaciente(paciente),
    cedula: paciente.numero_documento,
    tipoDocumento: paciente.tipo_documento,
    fechaNacimiento: formatearFechaNacimiento(paciente.fecha_nacimiento),
    sexo: formatearSexo(paciente.sexo),
    telefono: paciente.telefono || '',
    correo: paciente.correo || '',
    municipioCiudad: paciente.municipio_ciudad || '',

    // Datos de la historia
    fechaCreacion: historia.fecha_atencion || '',
    motivoConsulta: historia.motivo_consulta || '',
    diagnostico: historia.diagnostico || '',
    tratamiento: historia.tratamiento_realizado || '',
    medicamentos: historia.medicamentos_actuales || '',
    antOdontologicos: historia.antecedentes_odontologicos || '',
    eventoAdverso: historia.evento_adverso || false,
    eventoAdversoObs: historia.evento_adverso_obs || '',
    habitosObs: historia.habitos_observaciones || '',

    alergias: null,
    tipoSangre: null,
    rh: null,
    departamento: '',
    estadoCivil: '',
    direccion: '',
    ocupacion: '',
    acudiente: '',
    parentesco: '',
    eps: '',
    tipoAfiliacion: '',
    antecedentes: {},
    habitosOrales: {},
    estomatologico: {},
    estomatologicoObs: '',
    odontograma: {},
    adjuntos: [],
  };
}

function formatearEvolucion(ev) {
  return {
    id: ev.id,
    fecha: ev.fecha?.split('T')[0] || '',
    motivo: ev.tipo_consulta || '',
    diagnostico: ev.procedimiento_realizado || '',
    tratamiento: ev.procedimiento_realizado || '',
    doctor: ev.firma_odontologo || '',
    observaciones: ev.cavidad || null,
    diente: ev.diente || null,
  };
}

export default function Historias() {
  const { pacientes, actualizarHistoria } = useApp();
  const [historias, setHistorias] = useState([]);
  const [historiaActiva, setHistoriaActiva] = useState(null);
  const [loadingH, setLoadingH] = useState(true);

  // Cargar historias de todos los pacientes
  useEffect(() => {
    if (pacientes.length === 0) {
      setHistorias([]);
      setLoadingH(false);
      return;
    }

    setLoadingH(true);

    Promise.all(
      pacientes.map((paciente) =>
        api.getHistoriasPaciente(paciente.id)
          .then((historiasPaciente) =>
            Promise.all(
              historiasPaciente.map((historia) =>
                api.getEvoluciones(historia.id)
                  .then((evoluciones) => ({
                    ...construirHistoriaBase(paciente, historia),
                    evoluciones: evoluciones.map(formatearEvolucion),
                  }))
                  .catch(() => ({
                    ...construirHistoriaBase(paciente, historia),
                    evoluciones: [],
                  }))
              )
            )
          )
          .catch(() => [])
      )
    )
      .then((resultados) => setHistorias(resultados.flat()))
      .finally(() => setLoadingH(false));
  }, [pacientes]);

  // Abrir historia desde URL ?pacienteId=X
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pacienteId = Number(params.get('pacienteId'));

    if (pacienteId && historias.length > 0) {
      const encontrada = historias.find((h) => h.paciente_id === pacienteId);
      if (encontrada) setHistoriaActiva(encontrada);
    }
  }, [historias]);

  function handleActualizar(actualizada) {
    actualizarHistoria(actualizada);
    setHistoriaActiva(actualizada);
    setHistorias((prev) => prev.map((h) => (h.id === actualizada.id ? actualizada : h)));
  }

  function handleVolver() {
    setHistoriaActiva(null);
    window.history.replaceState({}, '', '/historias');
  }

  const stats = buildStats(historias);

  return (
    <div className="flex min-h-screen bg-teal-bg font-sans">
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar pacientes={[]} />

        {historiaActiva ? (
          <HistoriaDetalle
            historia={historiaActiva}
            onVolver={handleVolver}
            onActualizar={handleActualizar}
          />
        ) : (
          <main className="flex-1 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-4 gap-3 mb-5">
              {stats.map((s) => (
                <StatCard key={s.label} {...s} />
              ))}
            </div>

            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[15px] font-medium text-primary">Historias Clínicas</h2>
                <p className="text-[11px] text-teal mt-0.5">
                  {loadingH
                    ? 'Cargando...'
                    : `${historias.length} expedientes · Haz clic en un paciente para ver su historia`}
                </p>
              </div>
            </div>

            {loadingH ? (
              <p className="text-[13px] text-teal-muted px-1">Cargando historias...</p>
            ) : (
              <HistoriaLista historias={historias} onSeleccionar={setHistoriaActiva} />
            )}
          </main>
        )}
      </div>
    </div>
  );
}
