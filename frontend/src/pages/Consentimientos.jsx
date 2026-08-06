import { useMemo, useState } from 'react';
import {
  BadgeCheck,
  CalendarDays,
  FileBadge,
  FileText,
  Loader2,
  Ban,
  PenLine,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';
import StatCard from '../components/StatCard';
import { useApp } from '../context/Appcontext';
import { api } from '../api';
import { useSignaturePad } from '../hooks/useSignaturePad';

const TIPOS_CONSENTIMIENTO = [
  { value: 'anestesia', label: 'Anestesia' },
  { value: 'cirugia_oral', label: 'Cirugia oral' },
  { value: 'retiro_poste_corona', label: 'Retiro de poste/corona' },
  { value: 'rehabilitacion', label: 'Rehabilitacion' },
  { value: 'higiene_oral', label: 'Higiene oral' },
];

function fechaInputHoy() {
  return new Date().toISOString().split('T')[0];
}

function nombreCompleto(paciente) {
  if (!paciente) return '';
  return [paciente.nombres, paciente.primer_apellido, paciente.segundo_apellido]
    .filter(Boolean)
    .join(' ');
}

function formatoFecha(value) {
  if (!value) return 'Sin fecha';
  return new Date(value).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

function tipoConsentimientoLabel(tipo) {
  return TIPOS_CONSENTIMIENTO.find((item) => item.value === tipo)?.label || tipo;
}

function estaAnulado(documento) {
  return Boolean(documento?.anulado || documento?.anulado_en);
}

function puedeEliminar(documento) {
  return true;
}

function DocumentoCard({
  icon: Icon,
  tipo,
  documentoId,
  title,
  subtitle,
  fecha,
  estado,
  anulado,
  motivoAnulacion,
  puedeEliminarDocumento,
  procesando,
  onAnular,
  onEliminar,
}) {
  return (
    <div className={[
      'border rounded-xl p-4 bg-white transition-colors',
      anulado ? 'border-red-200 bg-red-50/40' : 'border-teal-border hover:border-teal/50',
    ].join(' ')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={[
            'w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0',
            anulado
              ? 'bg-red-50 border-red-200 text-status-red'
              : 'bg-teal-panel border-teal-soft text-primary',
          ].join(' ')}>
            <Icon size={16} />
          </div>
          <div className="min-w-0">
            <p className={['text-[13px] font-semibold truncate', anulado ? 'text-status-red' : 'text-primary'].join(' ')}>
              {title}
            </p>
            <p className="text-[11px] text-teal-muted mt-0.5 truncate">{subtitle}</p>
            <p className="text-[11px] text-teal-muted mt-1 flex items-center gap-1.5">
              <CalendarDays size={12} />
              {fecha}
            </p>
            {anulado && motivoAnulacion && (
              <p className="text-[11px] text-status-red mt-1 leading-snug">
                Motivo: {motivoAnulacion}
              </p>
            )}
          </div>
        </div>
        <span className={[
          'text-[10px] font-medium px-2 py-1 rounded-full whitespace-nowrap',
          anulado ? 'bg-red-100 text-status-red' : 'bg-teal-soft text-teal-muted',
        ].join(' ')}>
          {estado}
        </span>
      </div>

      <div className="flex items-center justify-end gap-2 mt-3">
        <button
        type="button"
        onClick={() => api.verPDF(tipo, documentoId)}
        className={[
          'inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg border transition-colors',
          anulado
            ? 'text-status-red border-red-200 hover:bg-red-100'
            : 'text-primary border-teal-border hover:bg-teal-soft',
        ].join(' ')}
        >
          <FileText size={12} />
          Ver PDF
          </button>
        {puedeEliminarDocumento && (
          <button
            type="button"
            onClick={onEliminar}
            disabled={procesando}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-status-red rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-60"
          >
            <Trash2 size={12} />
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-medium uppercase tracking-[0.7px] text-teal-muted mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  'w-full px-3 py-2 border border-teal-border rounded-lg text-[12px] text-[#1a3a3a] bg-white outline-none focus:border-teal transition-colors';

export default function Consentimientos() {
  const { pacientes, loading, error } = useApp();
  const [busqueda, setBusqueda] = useState('');
  const [pacienteId, setPacienteId] = useState('');
  const [consentimientos, setConsentimientos] = useState([]);
  const [certificados, setCertificados] = useState([]);
  const [cargandoDocs, setCargandoDocs] = useState(false);
  const [guardando, setGuardando] = useState(null);
  const [procesandoDoc, setProcesandoDoc] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [errorDocs, setErrorDocs] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const pacienteSeleccionado = useMemo(
    () => pacientes.find((p) => p.id === Number(pacienteId)) || null,
    [pacientes, pacienteId]
  );

  // Firmas: una para el paciente, otra para la doctora
  const firmaPaciente = useSignaturePad(pacienteId);
  const firmaDoctor = useSignaturePad(pacienteId);

  const pacientesFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return pacientes;
    return pacientes.filter((paciente) => {
      const nombre = nombreCompleto(paciente).toLowerCase();
      return nombre.includes(texto) || String(paciente.numero_documento || '').includes(texto);
    });
  }, [pacientes, busqueda]);

  const [consentimientoForm, setConsentimientoForm] = useState({
    tipo: 'anestesia',
    ciudad: 'Villavicencio',
    detalle: '',
    nombre_paciente_declarado: '',
    cc_paciente_declarado: '',
    cc_profesional: '',
  });

  const [certificadoForm, setCertificadoForm] = useState({
    tipo_cita_texto: '',
    fecha_expedicion: fechaInputHoy(),
    ciudad: 'Villavicencio',
  });

  async function cargarDocumentos(id = pacienteId) {
    if (!id) return;
    setCargandoDocs(true);
    setErrorDocs(null);
    try {
      const [cons, certs] = await Promise.all([
        api.getConsentimientosPaciente(id),
        api.getCertificadosPaciente(id),
      ]);
      setConsentimientos(cons || []);
      setCertificados(certs || []);
    } catch (err) {
      console.error('Error cargando documentos:', err);
      setErrorDocs(err.error || 'No se pudieron cargar los documentos del paciente.');
    } finally {
      setCargandoDocs(false);
    }
  }

  function seleccionarPaciente(paciente) {
    setPacienteId(String(paciente.id));
    setConsentimientos([]);
    setCertificados([]);
    setConsentimientoForm((prev) => ({
      ...prev,
      nombre_paciente_declarado: nombreCompleto(paciente),
      cc_paciente_declarado: paciente.numero_documento || '',
    }));
    cargarDocumentos(paciente.id);
  }

  function mostrarMensaje(texto) {
    setMensaje(texto);
    setTimeout(() => setMensaje(null), 2200);
  }

  async function crearConsentimiento(event) {
    event.preventDefault();
    if (!pacienteId) return;
    setGuardando('consentimiento');
    setErrorDocs(null);
    try {
      await api.crearConsentimiento({
        paciente_id: Number(pacienteId),
        tipo: consentimientoForm.tipo,
        ciudad: consentimientoForm.ciudad || 'Villavicencio',
        campos_especificos: consentimientoForm.detalle
          ? { detalle: consentimientoForm.detalle }
          : null,
        nombre_paciente_declarado: consentimientoForm.nombre_paciente_declarado || null,
        cc_paciente_declarado: consentimientoForm.cc_paciente_declarado || null,
        firma_paciente: firmaPaciente.obtenerImagen() || null,
        cc_profesional: consentimientoForm.cc_profesional || null,
        firma_doctor: firmaDoctor.obtenerImagen() || null,
      });
      setConsentimientoForm((prev) => ({ ...prev, detalle: '' }));
      firmaPaciente.limpiar();
      firmaDoctor.limpiar();
      await cargarDocumentos(pacienteId);
      mostrarMensaje('Consentimiento creado correctamente');
    } catch (err) {
      console.error('Error creando consentimiento:', err);
      setErrorDocs(err.error || 'No se pudo crear el consentimiento.');
    } finally {
      setGuardando(null);
    }
  }

  async function crearCertificado(event) {
    event.preventDefault();
    if (!pacienteId) return;
    setGuardando('certificado');
    setErrorDocs(null);
    try {
      await api.crearCertificado({
        paciente_id: Number(pacienteId),
        tipo_cita_texto: certificadoForm.tipo_cita_texto,
        fecha_expedicion: certificadoForm.fecha_expedicion,
        ciudad: certificadoForm.ciudad || 'Villavicencio',
      });
      setCertificadoForm({
        tipo_cita_texto: '',
        fecha_expedicion: fechaInputHoy(),
        ciudad: certificadoForm.ciudad || 'Villavicencio',
      });
      await cargarDocumentos(pacienteId);
      mostrarMensaje('Certificado creado correctamente');
    } catch (err) {
      console.error('Error creando certificado:', err);
      setErrorDocs(err.error || 'No se pudo crear el certificado.');
    } finally {
      setGuardando(null);
    }
  }

  async function anularDocumento(tipo, id) {
    const motivo = window.prompt('Motivo de anulacion');
    if (!motivo?.trim()) return;

    setProcesandoDoc(`${tipo}-${id}`);
    setErrorDocs(null);
    try {
      if (tipo === 'consentimiento') {
        await api.anularConsentimiento(id, motivo.trim());
      } else {
        await api.anularCertificado(id, motivo.trim());
      }
      await cargarDocumentos(pacienteId);
      mostrarMensaje('Documento anulado correctamente');
    } catch (err) {
      console.error('Error anulando documento:', err);
      setErrorDocs(err.error || 'No se pudo anular el documento.');
    } finally {
      setProcesandoDoc(null);
    }
  }

  async function eliminarDocumento(tipo, id) {
    const confirmado = window.confirm(
      'Eliminar este documento? Esta accion no se puede deshacer.'
    );
    if (!confirmado) return;

    setProcesandoDoc(`${tipo}-${id}`);
    setErrorDocs(null);
    try {
      if (tipo === 'consentimiento') {
        await api.eliminarConsentimiento(id);
      } else {
        await api.eliminarCertificado(id);
      }
      await cargarDocumentos(pacienteId);
      mostrarMensaje('Documento eliminado correctamente');
    } catch (err) {
      console.error('Error eliminando documento:', err);
      setErrorDocs(err.error || 'No se pudo eliminar el documento.');
    } finally {
      setProcesandoDoc(null);
    }
  }

  const stats = [
    {
      label: 'Consentimientos',
      value: consentimientos.filter((c) => !estaAnulado(c)).length,
      sub: 'activos',
      accentColor: '#3ECFCF',
    },
    {
      label: 'Certificados',
      value: certificados.filter((c) => !estaAnulado(c)).length,
      sub: 'activos',
      accentColor: '#5DC2A4',
    },
    {
      label: 'Con firma',
      value: consentimientos.filter((c) => !estaAnulado(c) && (c.firma_paciente || c.firma_doctor)).length,
      sub: 'consentimientos',
      accentColor: '#85B7EB',
    },
    {
      label: 'Anulados',
      value: [...consentimientos, ...certificados].filter(estaAnulado).length,
      sub: 'con trazabilidad',
      accentColor: '#EF9F27',
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen bg-teal-bg dark:bg-dark-bg font-sans">
        <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
        <div className="flex flex-col flex-1 min-w-0">
          <Topbar onToggleMobileMenu={() => setMobileMenuOpen(true)} />
          <main className="flex-1 flex items-center justify-center p-6">
            <p className="text-[13px] text-teal-muted dark:text-slate-400">Cargando pacientes...</p>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-teal-bg dark:bg-dark-bg font-sans">
        <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
        <div className="flex flex-col flex-1 min-w-0">
          <Topbar onToggleMobileMenu={() => setMobileMenuOpen(true)} />
          <main className="flex-1 flex items-center justify-center p-6">
            <p className="text-[13px] text-status-red dark:text-red-400">{error}</p>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-teal-bg dark:bg-dark-bg font-sans relative">
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar onToggleMobileMenu={() => setMobileMenuOpen(true)} />
        
        <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-5 custom-scrollbar">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
            {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr] gap-4 items-start">
            <section className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl overflow-hidden shadow-soft-sm">
              <div className="px-4 py-3.5 border-b border-teal-soft dark:border-dark-border bg-teal-panel/40 dark:bg-slate-800/40">
                <h2 className="text-[13px] font-semibold text-primary dark:text-dark-text">Seleccionar paciente</h2>
                <p className="text-[11px] text-teal-muted dark:text-slate-400 mt-0.5">
                  Elige un paciente para crear y consultar documentos
                </p>
              </div>

              <div className="p-3 border-b border-teal-soft dark:border-dark-border bg-teal-panel dark:bg-slate-800/60">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-teal" />
                  <input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar por nombre o cédula..."
                    className="w-full pl-9 pr-3 py-2 border border-teal-border dark:border-dark-border rounded-xl text-[12px] text-primary dark:text-dark-text bg-white dark:bg-dark-input outline-none focus:border-primary dark:focus:border-teal transition-colors"
                  />
                </div>
              </div>

              <div className="max-h-[350px] lg:max-h-[600px] overflow-y-auto custom-scrollbar divide-y divide-teal-soft dark:divide-dark-border">
                {pacientesFiltrados.length === 0 ? (
                  <p className="text-[12px] text-teal-muted dark:text-slate-400 p-4 text-center">No hay pacientes encontrados</p>
                ) : (
                  pacientesFiltrados.map((paciente) => {
                    const activo = Number(pacienteId) === paciente.id;
                    return (
                      <button
                        key={paciente.id}
                        type="button"
                        onClick={() => seleccionarPaciente(paciente)}
                        className={[
                          'w-full text-left px-4 py-3 transition-colors cursor-pointer touch-target',
                          activo ? 'bg-teal-soft dark:bg-slate-800 font-semibold' : 'bg-white dark:bg-dark-card hover:bg-teal-panel dark:hover:bg-slate-800/40',
                        ].join(' ')}
                      >
                        <p className="text-[12px] font-medium text-primary dark:text-dark-text">{nombreCompleto(paciente)}</p>
                        <p className="text-[11px] text-teal-muted dark:text-slate-400 mt-0.5">
                          {paciente.tipo_documento || 'CC'} {paciente.numero_documento || 'Sin documento'}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            </section>

            <section className="space-y-4 min-w-0">
              {!pacienteSeleccionado ? (
                <div className="bg-white dark:bg-dark-card border border-dashed border-teal-border dark:border-dark-border rounded-2xl p-10 text-center shadow-soft-sm">
                  <FileBadge size={40} className="text-teal mx-auto mb-3" />
                  <p className="text-[14px] font-semibold text-primary dark:text-dark-text">Selecciona un paciente</p>
                  <p className="text-[12px] text-teal-muted dark:text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                    Aquí aparecerán sus consentimientos informados, certificados y formularios de creación.
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl px-5 py-3.5 flex items-center justify-between shadow-soft-sm">
                    <div>
                      <h2 className="text-[14px] font-bold text-primary dark:text-dark-text">
                        {nombreCompleto(pacienteSeleccionado)}
                      </h2>
                      <p className="text-[11px] text-teal-muted dark:text-slate-400 mt-0.5">
                        {pacienteSeleccionado.tipo_documento || 'CC'} {pacienteSeleccionado.numero_documento}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => cargarDocumentos()}
                      disabled={cargandoDocs}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[12px] text-primary dark:text-slate-300 bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl hover:bg-teal-soft dark:hover:bg-slate-700 transition-colors disabled:opacity-60 cursor-pointer touch-target shadow-soft-sm font-medium"
                    >
                      {cargandoDocs ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      Actualizar
                    </button>
                  </div>

                  {errorDocs && (
                    <div className="text-[12px] text-status-red dark:text-red-400 bg-status-redBg dark:bg-red-950/40 px-4 py-3 rounded-xl border border-red-200 dark:border-red-900/50 font-medium">
                      {errorDocs}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <form onSubmit={crearConsentimiento} className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl overflow-hidden shadow-soft-sm">
                      <div className="px-5 py-3.5 border-b border-teal-soft dark:border-dark-border flex items-center gap-2 bg-teal-panel/40 dark:bg-slate-800/40">
                        <PenLine size={16} className="text-primary dark:text-teal" />
                        <h3 className="text-[13px] font-semibold text-primary dark:text-dark-text">Nuevo consentimiento</h3>
                      </div>
                      <div className="p-4 sm:p-5 space-y-3">
                        <Campo label="Tipo">
                          <select
                            value={consentimientoForm.tipo}
                            onChange={(e) => setConsentimientoForm((prev) => ({ ...prev, tipo: e.target.value }))}
                            className="w-full px-3 py-2 border border-teal-border dark:border-dark-border rounded-xl text-[12px] text-primary dark:text-dark-text bg-white dark:bg-dark-input outline-none focus:border-primary dark:focus:border-teal transition-colors min-h-[38px]"
                          >
                            {TIPOS_CONSENTIMIENTO.map((tipo) => (
                              <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                            ))}
                          </select>
                        </Campo>
                        <Campo label="Ciudad">
                          <input
                            value={consentimientoForm.ciudad}
                            onChange={(e) => setConsentimientoForm((prev) => ({ ...prev, ciudad: e.target.value }))}
                            className="w-full px-3 py-2 border border-teal-border dark:border-dark-border rounded-xl text-[12px] text-primary dark:text-dark-text bg-white dark:bg-dark-input outline-none focus:border-primary dark:focus:border-teal transition-colors min-h-[38px]"
                          />
                        </Campo>
                        <Campo label="Nombre declarado">
                          <input
                            value={consentimientoForm.nombre_paciente_declarado}
                            onChange={(e) => setConsentimientoForm((prev) => ({ ...prev, nombre_paciente_declarado: e.target.value }))}
                            className="w-full px-3 py-2 border border-teal-border dark:border-dark-border rounded-xl text-[12px] text-primary dark:text-dark-text bg-white dark:bg-dark-input outline-none focus:border-primary dark:focus:border-teal transition-colors min-h-[38px]"
                          />
                        </Campo>
                        <Campo label="Documento declarado">
                          <input
                            value={consentimientoForm.cc_paciente_declarado}
                            onChange={(e) => setConsentimientoForm((prev) => ({ ...prev, cc_paciente_declarado: e.target.value }))}
                            className="w-full px-3 py-2 border border-teal-border dark:border-dark-border rounded-xl text-[12px] text-primary dark:text-dark-text bg-white dark:bg-dark-input outline-none focus:border-primary dark:focus:border-teal transition-colors min-h-[38px]"
                          />
                        </Campo>
                        <Campo label="Detalles específicos">
                          <textarea
                            value={consentimientoForm.detalle}
                            onChange={(e) => setConsentimientoForm((prev) => ({ ...prev, detalle: e.target.value }))}
                            rows={3}
                            className="w-full px-3 py-2 border border-teal-border dark:border-dark-border rounded-xl text-[12px] text-primary dark:text-dark-text bg-white dark:bg-dark-input outline-none focus:border-primary dark:focus:border-teal transition-colors resize-none"
                            placeholder="Observaciones, procedimiento o condiciones particulares"
                          />
                        </Campo>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Campo label="Firma paciente">
                            <div className="border border-teal-border dark:border-dark-border rounded-xl overflow-hidden bg-white">
                              <canvas
                                ref={firmaPaciente.canvasRef}
                                className="w-full h-32 cursor-crosshair touch-none"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={firmaPaciente.limpiar}
                              className="mt-1.5 text-[11px] text-status-red dark:text-red-400 hover:underline cursor-pointer"
                            >
                              Limpiar firma
                            </button>
                          </Campo>
                          <Campo label="Firma doctor">
                            <div className="border border-teal-border dark:border-dark-border rounded-xl overflow-hidden bg-white">
                              <canvas
                                ref={firmaDoctor.canvasRef}
                                className="w-full h-32 cursor-crosshair touch-none"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={firmaDoctor.limpiar}
                              className="mt-1.5 text-[11px] text-status-red dark:text-red-400 hover:underline cursor-pointer"
                            >
                              Limpiar firma
                            </button>
                          </Campo>
                        </div>
                        <Campo label="CC profesional">
                          <input
                            value={consentimientoForm.cc_profesional}
                            onChange={(e) => setConsentimientoForm((prev) => ({ ...prev, cc_profesional: e.target.value }))}
                            className="w-full px-3 py-2 border border-teal-border dark:border-dark-border rounded-xl text-[12px] text-primary dark:text-dark-text bg-white dark:bg-dark-input outline-none focus:border-primary dark:focus:border-teal transition-colors min-h-[38px]"
                          />
                        </Campo>
                        <div className="flex gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              firmaPaciente.limpiar();
                              firmaDoctor.limpiar();
                              setConsentimientoForm({
                                tipo: 'anestesia',
                                ciudad: 'Villavicencio',
                                detalle: '',
                                nombre_paciente_declarado: nombreCompleto(pacienteSeleccionado),
                                cc_paciente_declarado: pacienteSeleccionado?.numero_documento || '',
                                cc_profesional: '',
                              });
                            }}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-[12px] text-primary dark:text-slate-300 bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl hover:bg-teal-soft dark:hover:bg-slate-700 transition-colors touch-target font-medium cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={guardando === 'consentimiento'}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-[12px] text-white font-medium bg-primary dark:bg-teal dark:text-slate-900 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-70 touch-target cursor-pointer shadow-soft-sm"
                          >
                            {guardando === 'consentimiento' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                            Crear consentimiento
                          </button>
                        </div>
                      </div>
                    </form>

                    <form onSubmit={crearCertificado} className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl overflow-hidden shadow-soft-sm">
                      <div className="px-5 py-3.5 border-b border-teal-soft dark:border-dark-border flex items-center gap-2 bg-teal-panel/40 dark:bg-slate-800/40">
                        <FileBadge size={16} className="text-primary dark:text-teal" />
                        <h3 className="text-[13px] font-semibold text-primary dark:text-dark-text">Nuevo certificado</h3>
                      </div>
                      <div className="p-4 sm:p-5 space-y-3">
                        <Campo label="Tipo de cita o atención">
                          <input
                            value={certificadoForm.tipo_cita_texto}
                            onChange={(e) => setCertificadoForm((prev) => ({ ...prev, tipo_cita_texto: e.target.value }))}
                            className="w-full px-3 py-2 border border-teal-border dark:border-dark-border rounded-xl text-[12px] text-primary dark:text-dark-text bg-white dark:bg-dark-input outline-none focus:border-primary dark:focus:border-teal transition-colors min-h-[38px]"
                            placeholder="Ej. Consulta odontológica"
                            required
                          />
                        </Campo>
                        <Campo label="Fecha de expedición">
                          <input
                            type="date"
                            value={certificadoForm.fecha_expedicion}
                            onChange={(e) => setCertificadoForm((prev) => ({ ...prev, fecha_expedicion: e.target.value }))}
                            className="w-full px-3 py-2 border border-teal-border dark:border-dark-border rounded-xl text-[12px] text-primary dark:text-dark-text bg-white dark:bg-dark-input outline-none focus:border-primary dark:focus:border-teal transition-colors min-h-[38px]"
                            required
                          />
                        </Campo>
                        <Campo label="Ciudad">
                          <input
                            value={certificadoForm.ciudad}
                            onChange={(e) => setCertificadoForm((prev) => ({ ...prev, ciudad: e.target.value }))}
                            className="w-full px-3 py-2 border border-teal-border dark:border-dark-border rounded-xl text-[12px] text-primary dark:text-dark-text bg-white dark:bg-dark-input outline-none focus:border-primary dark:focus:border-teal transition-colors min-h-[38px]"
                          />
                        </Campo>
                        <div className="bg-teal-panel dark:bg-slate-800/60 border border-teal-soft dark:border-dark-border rounded-xl p-4">
                          <p className="text-[12px] font-semibold text-primary dark:text-dark-text">Vista previa</p>
                          <p className="text-[11px] text-teal-muted dark:text-slate-400 mt-1 leading-relaxed">
                            Se emitirá un certificado para {nombreCompleto(pacienteSeleccionado)} con la fecha y tipo de atención indicados.
                          </p>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setCertificadoForm({
                              tipo_cita_texto: '',
                              fecha_expedicion: fechaInputHoy(),
                              ciudad: 'Villavicencio',
                            })}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-[12px] text-primary dark:text-slate-300 bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl hover:bg-teal-soft dark:hover:bg-slate-700 transition-colors touch-target font-medium cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={guardando === 'certificado'}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-[12px] text-white font-medium bg-primary dark:bg-teal dark:text-slate-900 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-70 touch-target cursor-pointer shadow-soft-sm"
                          >
                            {guardando === 'certificado' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                            Crear certificado
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl overflow-hidden shadow-soft-sm">
                      <div className="px-5 py-3.5 border-b border-teal-soft dark:border-dark-border flex items-center justify-between bg-teal-panel/40 dark:bg-slate-800/40">
                        <h3 className="text-[13px] font-semibold text-primary dark:text-dark-text">Consentimientos</h3>
                        <span className="text-[11px] text-teal-muted dark:text-slate-400 font-bold">{consentimientos.length}</span>
                      </div>
                      <div className="p-4 space-y-3">
                        {cargandoDocs ? (
                          <p className="text-[12px] text-teal-muted dark:text-slate-400 text-center py-6">Cargando...</p>
                        ) : consentimientos.length === 0 ? (
                          <p className="text-[12px] text-teal-muted dark:text-slate-400 text-center py-6">Sin consentimientos registrados</p>
                        ) : (
                          consentimientos.map((consentimiento) => {
                            const anulado = estaAnulado(consentimiento);
                            return (
                              <DocumentoCard
                                key={consentimiento.id}
                                icon={FileText}
                                title={tipoConsentimientoLabel(consentimiento.tipo)}
                                subtitle={consentimiento.ciudad || 'Villavicencio'}
                                fecha={formatoFecha(consentimiento.fecha)}
                                estado={anulado ? 'Anulado' : (consentimiento.pdf_generado_en ? 'PDF generado' : 'Registrado')}
                                tipo="consentimiento"           
                                documentoId={consentimiento.id} 
                                anulado={anulado}
                                motivoAnulacion={consentimiento.motivo_anulacion}
                                puedeEliminarDocumento={puedeEliminar(consentimiento)}
                                procesando={procesandoDoc === `consentimiento-${consentimiento.id}`}
                                onAnular={() => anularDocumento('consentimiento', consentimiento.id)}
                                onEliminar={() => eliminarDocumento('consentimiento', consentimiento.id)}
                              />
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl overflow-hidden shadow-soft-sm">
                      <div className="px-5 py-3.5 border-b border-teal-soft dark:border-dark-border flex items-center justify-between bg-teal-panel/40 dark:bg-slate-800/40">
                        <h3 className="text-[13px] font-semibold text-primary dark:text-dark-text">Certificados</h3>
                        <span className="text-[11px] text-teal-muted dark:text-slate-400 font-bold">{certificados.length}</span>
                      </div>
                      <div className="p-4 space-y-3">
                        {cargandoDocs ? (
                          <p className="text-[12px] text-teal-muted dark:text-slate-400 text-center py-6">Cargando...</p>
                        ) : certificados.length === 0 ? (
                          <p className="text-[12px] text-teal-muted dark:text-slate-400 text-center py-6">Sin certificados registrados</p>
                        ) : (
                          certificados.map((certificado) => {
                            const anulado = estaAnulado(certificado);
                            return (
                              <DocumentoCard
                                key={certificado.id}
                                icon={BadgeCheck}
                                title={certificado.tipo_cita_texto}
                                subtitle={certificado.ciudad || 'Villavicencio'}
                                fecha={formatoFecha(certificado.fecha_expedicion)}
                                estado={anulado ? 'Anulado' : 'Emitido'}
                                tipo="certificado"
                                documentoId={certificado.id}
                                anulado={anulado}
                                motivoAnulacion={certificado.motivo_anulacion}
                                puedeEliminarDocumento={puedeEliminar(certificado)}
                                procesando={procesandoDoc === `certificado-${certificado.id}`}
                                onAnular={() => anularDocumento('certificado', certificado.id)}
                                onEliminar={() => eliminarDocumento('certificado', certificado.id)}
                              />
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>
        </main>
      </div>

      {mensaje && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-primary dark:bg-slate-800 text-white text-[12px] px-4 py-2.5 rounded-full whitespace-nowrap z-50 animate-toast border border-white/10 shadow-soft-lg">
          {mensaje}
        </div>
      )}
    </div>
  );
}

