// src/pages/Historias.jsx
import { useState, useEffect } from 'react';
import { useApp } from '../context/Appcontext';
import { api } from '../api';
import { antecedentesDbToForm } from '../data/historiasData';

import Sidebar       from '../components/layout/Sidebar';
import Topbar        from '../components/layout/Topbar';
import StatCard      from '../components/StatCard';
import HistoriaLista from '../components/historias/HistoriaLista';
import HistoriaDetalle from '../components/historias/HistoriaDetalle';

function buildStats(historias, pacientes) {
  const conAlergia       = historias.filter((h) => h.alergias && h.alergias !== 'Ninguna conocida').length;
  const totalEvoluciones = historias.reduce((acc, h) => acc + (h.evoluciones?.length || 0), 0);

  // Cuenta pacientes con saldo pendiente usando el campo del contexto (más confiable)
  const conPagosPendientes = pacientes.filter((p) => Number(p.saldoPendiente ?? 0) > 0).length;

  return [
    { label: 'Total historias',   value: historias.length,  sub: 'registradas',          accentColor: '#3ECFCF' },
    { label: 'Con alergias',      value: conAlergia,         sub: 'requieren precaución', accentColor: '#EF9F27' },
    { label: 'Total evoluciones', value: totalEvoluciones,   sub: 'entradas clínicas',    accentColor: '#5DC2A4' },
    { label: 'Pagos pendientes',  value: conPagosPendientes, sub: 'pacientes con saldo',  accentColor: '#F87171' },
  ];
}

function formatearFechaNacimiento(fecha) {
  return fecha ? String(fecha).split('T')[0] : '';
}

function formatearSexo(sexo) {
  if (sexo === 'femenino')  return 'Femenino';
  if (sexo === 'masculino') return 'Masculino';
  if (sexo === 'otro')      return 'Otro';
  return '';
}

function nombreCompletoPaciente(p) {
  return `${p.nombres} ${p.primer_apellido}${p.segundo_apellido ? ` ${p.segundo_apellido}` : ''}`;
}

// Mapea el "tipo" que guarda la base de datos (mayúsculas) a la clave que
// consume el frontend (OdontogramaModal, HistoriaDetalle): minúsculas + guion.
// Debe mantenerse en sync con TIPOS_ODONTOGRAMA/ALIASES_TIPO del backend
// (src/services/odontogramas.js) y con TIPOS_ODONTOGRAMA de OdontogramaModal.jsx.
const TIPO_A_CLAVE_FRONTEND = {
  GENERAL_ADULTO: 'general-adulto',
  GENERAL_INFANTIL: 'general-infantil',
  ORTODONCIA: 'ortodoncia',
};

/**
 * Reconstruye el array de odontogramas (uno por tipo, tal como los devuelve
 * GET /detalle/:id) en el objeto keyed-por-tipo que espera el frontend:
 * { 'general-adulto': { [numeroDiente]: { estado, notas } }, ... }
 */
function construirOdontogramaPorTipo(odontogramas = []) {
  const resultado = {};
  odontogramas.forEach((o) => {
    const clave = TIPO_A_CLAVE_FRONTEND[o.tipo] || o.tipo;
    resultado[clave] = o.dientes_json || {};
  });
  return resultado;
}

/**
 * Construye el objeto historia que consume HistoriaDetalle/FormularioClinico.
 * @param {object} paciente  - fila del módulo Pacientes
 * @param {object} historia  - fila del GET /:pacienteId (lista)
 * @param {object|null} detalle - resultado del GET /detalle/:id (con antecedentes, examen, odontogramas)
 */
function construirHistoriaBase(paciente, historia, detalle = null) {
  return {
    id:          historia.id,
    pacienteId:  paciente.id,
    paciente_id: paciente.id,

    // ── Datos del paciente (solo lectura) ──────────────────────────────
    pacienteNombre:  nombreCompletoPaciente(paciente),
    cedula:          paciente.numero_documento,
    tipoDocumento:   paciente.tipo_documento,
    fechaNacimiento: formatearFechaNacimiento(paciente.fecha_nacimiento),
    sexo:            formatearSexo(paciente.sexo),
    telefono:        paciente.telefono       || '',
    correo:          paciente.correo         || '',
    municipioCiudad: paciente.municipio_ciudad || '',

    // ── Campos principales de historiaClinica ──────────────────────────
    fechaCreacion:    historia.fecha_atencion                     || '',
    motivoConsulta:   historia.motivo_consulta                    || '',
    diagnostico:      historia.diagnostico                        || '',
    tratamiento:      historia.tratamiento_realizado              || '',
    medicamentos:     historia.medicamentos_actuales              || '',
    antOdontologicos: historia.antecedentes_odontologicos         || '',
    eventoAdverso:    historia.evento_adverso                     ?? false,
    eventoAdversoObs: historia.evento_adverso_obs                 || '',
    habitosObs:       historia.habitos_observaciones              || '',
    habitosOrales:    historia.habitos_json                       || {},

    // ── Campos adicionales (ahora guardados en DB) ─────────────────────
    departamento:    historia.departamento    || '',
    estadoCivil:     historia.estado_civil    || '',
    direccion:       historia.direccion       || '',
    ocupacion:       historia.ocupacion       || '',
    acudiente:       historia.acudiente       || '',
    parentesco:      historia.parentesco      || '',
    eps:             historia.eps             || '',
    tipoAfiliacion:  historia.tipo_afiliacion || '',
    tipoSangre:      historia.tipo_sangre     || null,
    rh:              historia.rh              || null,
    alergias:        historia.alergias        || null,

    // ── Datos anidados (vienen del detalle) ────────────────────────────
    // antecedentesDbToForm convierte { hepatitis: true } → { 'Hepatitis': true }
    antecedentes:     antecedentesDbToForm(detalle?.antecedentes),
    estomatologico:   detalle?.examen?.estructuras_json ?? {},
    estomatologicoObs: detalle?.examen?.observaciones   ?? '',
    // Reconstruye TODOS los tipos de odontograma (adulto/infantil/ortodoncia),
    // no solo el primero del array — antes esto perdía los tipos != [0].
    odontograma:      construirOdontogramaPorTipo(detalle?.odontogramas),

    examenPulpar:     detalle?.examen?.examen_pulpar_json ?? {},
    pulparObs:        detalle?.examen?.pulpar_obs         ?? '',
    tejidos:          detalle?.examen?.tejidos_json       ?? {},
    tejidosObs:       detalle?.examen?.tejidos_obs        ?? '',
    periodontal:      detalle?.examen?.periodontal_json   ?? {},
    dxPeriodontal:    detalle?.examen?.dx_periodontal     ?? '',
    periodontalObs:   detalle?.examen?.periodontal_obs    ?? '',

    adjuntos: (detalle?.adjuntos || []).map(formatearAdjunto),
  };
}

function formatearAdjunto(adj) {
  return {
    id: adj.id,
    nombre: adj.nombre || adj.nombre_archivo || '',
    tipo: adj.tipo || (adj.mime_type?.startsWith('image/') ? 'imagen' : 'pdf'),
    fecha: adj.creado_en?.split('T')[0] || adj.fecha?.split('T')[0] || '',
    url: adj.url || adj.ruta || null,
    mimeType: adj.mime_type || null,
    contenido_base64: adj.contenido_base64 || null,
  };
}

function formatearEvolucion(ev) {
  return {
    id:              ev.id,
    fecha:           ev.fecha?.split('T')[0] || '',
    doctor:          ev.doctor || '',
    motivo:          ev.motivo || '',
    diagnostico:     ev.diagnostico || '',
    procedimiento:   ev.procedimiento || '',
    piezasTratadas:  ev.piezas_tratadas || '',
    tratamiento:     ev.tratamiento || '',
    estadoClinico:   ev.estado_clinico || '',
    recomendaciones: ev.recomendaciones || '',
    proximoControl:  ev.proximo_control?.split('T')[0] || '',
    observaciones:   ev.observaciones || '',
  };
}

export default function Historias() {
  const { pacientes, actualizarHistoria } = useApp();
  const [historias, setHistorias]           = useState([]);
  const [historiaActiva, setHistoriaActiva] = useState(null);
  const [loadingH, setLoadingH]             = useState(true);

  // ── Carga historias con detalle completo ──────────────────────────────
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
                Promise.all([
                  api.getHistoriaDetalle(historia.id),  // trae antecedentes, examen, odontogramas
                  api.getEvoluciones(historia.id),
                ])
                .then(([detalle, evoluciones]) => ({
                  ...construirHistoriaBase(paciente, historia, detalle),
                  evoluciones: evoluciones.map(formatearEvolucion),
                }))
                .catch(() => ({
                  ...construirHistoriaBase(paciente, historia, null),
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
    const params    = new URLSearchParams(window.location.search);
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

  const stats = buildStats(historias, pacientes);

  return (
    <div className="flex min-h-screen bg-teal-bg font-sans">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar pacientes={pacientes} />

        {historiaActiva ? (
          <HistoriaDetalle
          historia={historiaActiva}
          onVolver={handleVolver}
          onActualizar={handleActualizar}
          onVerPDF={() => api.verHistoriaPDF(historiaActiva.id)} 
          />
        ) : (
          <main className="flex-1 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-4 gap-3 mb-5">
              {stats.map((s) => <StatCard key={s.label} {...s} />)}
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