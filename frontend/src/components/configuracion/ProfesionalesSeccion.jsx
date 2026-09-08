import { useState, useEffect } from 'react';
import {
  UserCheck, Plus, X, Loader2, AlertCircle, PenTool, CheckCircle2,
  ToggleLeft, ToggleRight, FileSignature, Award, Stethoscope
} from 'lucide-react';
import { api } from '../../api';
import { useSignaturePad } from '../../hooks/useSignaturePad';

function ModalFirma({ profesional, onClose, onFirmaGuardada, mostrarToast }) {
  const { canvasRef, limpiar, obtenerImagen } = useSignaturePad(profesional?.id);
  const [guardando, setGuardando] = useState(false);

  const handleGuardar = async () => {
    const base64 = obtenerImagen();
    if (!base64) {
      mostrarToast?.('Por favor dibuja una firma en el recuadro antes de guardar');
      return;
    }

    try {
      setGuardando(true);
      await api.actualizarFirmaProfesional(profesional.id, base64);
      mostrarToast?.(`Firma por defecto actualizada para ${profesional.nombre_completo}`);
      onFirmaGuardada?.();
      onClose();
    } catch (err) {
      console.error(err);
      mostrarToast?.(err?.error || err?.message || 'Error al guardar la firma por defecto');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-teal-soft dark:border-dark-border pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-soft/80 dark:bg-slate-800 text-teal flex items-center justify-center">
              <FileSignature className="w-4 h-4 text-primary dark:text-teal" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-primary dark:text-dark-text leading-tight">
                Firma por Defecto
              </h3>
              <p className="text-[11px] text-teal-muted dark:text-slate-400 font-medium">
                {profesional.nombre_completo}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-teal-muted hover:text-primary dark:hover:text-dark-text p-1.5 rounded-xl hover:bg-teal-soft dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {profesional.firma_default && (
          <div className="bg-teal-bg/60 dark:bg-dark-input/50 p-3 rounded-xl border border-teal-border/40 dark:border-dark-border space-y-1.5">
            <p className="text-[11px] font-medium text-teal-muted dark:text-slate-400">Firma Actual Guardada:</p>
            <div className="bg-white dark:bg-white rounded-xl p-2.5 flex items-center justify-center border border-teal-border/30 shadow-2xs">
              <img
                src={profesional.firma_default}
                alt={`Firma de ${profesional.nombre_completo}`}
                className="max-h-16 object-contain"
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-teal-muted dark:text-slate-400">
            Dibujar Nueva Firma Digital
          </label>
          <div className="border border-teal-border dark:border-dark-border rounded-xl overflow-hidden bg-white shadow-inner relative group">
            <canvas
              ref={canvasRef}
              className="w-full h-36 cursor-crosshair touch-none"
            />
          </div>
          <div className="flex justify-between items-center pt-0.5">
            <span className="text-[10px] text-teal-muted dark:text-slate-400">
              Traza directamente en el recuadro blanco
            </span>
            <button
              type="button"
              onClick={limpiar}
              className="text-[11px] font-semibold text-status-red dark:text-red-400 hover:underline cursor-pointer"
            >
              Limpiar trazo
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-teal-soft dark:border-dark-border">
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="px-4 py-2.5 text-[12px] font-semibold text-teal-muted dark:text-slate-400 hover:text-primary dark:hover:text-dark-text transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGuardar}
            disabled={guardando}
            className="flex items-center gap-2 px-5 py-2.5 text-[12px] font-semibold text-white bg-primary dark:bg-teal dark:text-slate-900 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 shadow-soft-sm cursor-pointer"
          >
            {guardando ? <Loader2 size={14} className="animate-spin" /> : <PenTool size={14} />}
            {guardando ? 'Guardando...' : 'Guardar Firma'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalCrearProfesional({ onClose, onCreado, mostrarToast }) {
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [cedulaProfesional, setCedulaProfesional] = useState('');
  const [creando, setCreando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombreCompleto.trim()) {
      mostrarToast?.('El nombre del profesional es obligatorio');
      return;
    }

    try {
      setCreando(true);
      await api.crearProfesional({
        nombre_completo: nombreCompleto.trim(),
        cedula_profesional: cedulaProfesional.trim() || null
      });
      mostrarToast?.('Profesional registrado exitosamente');
      onCreado?.();
      onClose();
    } catch (err) {
      console.error(err);
      mostrarToast?.(err?.error || err?.message || 'Error al crear el profesional');
    } finally {
      setCreando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-teal-soft dark:border-dark-border pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-soft/80 dark:bg-slate-800 text-teal flex items-center justify-center">
              <UserCheck className="w-4 h-4 text-primary dark:text-teal" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-primary dark:text-dark-text leading-tight">
                Registrar Nuevo Profesional
              </h3>
              <p className="text-[10px] text-teal-muted dark:text-slate-400">
                Doctor o especialista que atiende en la clínica
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-teal-muted hover:text-primary dark:hover:text-dark-text p-1.5 rounded-xl hover:bg-teal-soft dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-teal-muted dark:text-slate-400 mb-1">
              Nombre Completo del Profesional *
            </label>
            <input
              type="text"
              required
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
              className="w-full text-[12px] text-primary dark:text-dark-text bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-teal font-sans transition-colors min-h-[40px]"
              placeholder="Ej: Dr. Alejandro Ramírez"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-teal-muted dark:text-slate-400 mb-1">
              Registro / Cédula Profesional (Opcional)
            </label>
            <input
              type="text"
              value={cedulaProfesional}
              onChange={(e) => setCedulaProfesional(e.target.value)}
              className="w-full text-[12px] text-primary dark:text-dark-text bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-teal font-sans transition-colors min-h-[40px]"
              placeholder="Ej: Reg. Odontología 998877"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-teal-soft dark:border-dark-border">
          <button
            type="button"
            onClick={onClose}
            disabled={creando}
            className="px-4 py-2.5 text-[12px] font-semibold text-teal-muted dark:text-slate-400 hover:text-primary dark:hover:text-dark-text transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={creando}
            className="flex items-center gap-2 px-5 py-2.5 text-[12px] font-semibold text-white bg-primary dark:bg-teal dark:text-slate-900 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 shadow-soft-sm cursor-pointer"
          >
            {creando ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {creando ? 'Creando...' : 'Crear Profesional'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ProfesionalesSeccion({ mostrarToast }) {
  const [profesionales, setProfesionales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [modalCrear, setModalCrear] = useState(false);
  const [profesionalParaFirma, setProfesionalParaFirma] = useState(null);
  const [cambiandoEstadoId, setCambiandoEstadoId] = useState(null);

  const cargarProfesionales = async () => {
    try {
      setCargando(true);
      setError(null);
      const data = await api.getProfesionales();
      setProfesionales(data || []);
    } catch (err) {
      console.error(err);
      setError(err?.error || err?.message || 'No se pudieron cargar los profesionales');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarProfesionales();
  }, []);

  const handleToggleEstado = async (prof) => {
    try {
      setCambiandoEstadoId(prof.id);
      const nuevoEstado = !prof.activo;
      await api.actualizarProfesional(prof.id, { activo: nuevoEstado });
      mostrarToast?.(
        nuevoEstado
          ? `Profesional ${prof.nombre_completo} activado`
          : `Profesional ${prof.nombre_completo} desactivado`
      );
      cargarProfesionales();
    } catch (err) {
      console.error(err);
      mostrarToast?.(err?.error || err?.message || 'Error al cambiar estado del profesional');
    } finally {
      setCambiandoEstadoId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl p-5 sm:p-6 shadow-soft-sm space-y-5">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-teal-soft dark:border-dark-border pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-soft/80 dark:bg-slate-800 text-teal flex items-center justify-center flex-shrink-0 shadow-2xs">
            <UserCheck className="w-5 h-5 text-primary dark:text-teal" />
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-primary dark:text-dark-text leading-tight">
              Profesionales del Consultorio
            </h3>
            <p className="text-[11.5px] text-teal-muted dark:text-slate-400 font-medium mt-0.5">
              Administra los doctores que atienden en la clínica y sus firmas predeterminadas para los documentos oficiales.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setModalCrear(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 text-[12px] font-semibold text-white bg-primary dark:bg-teal dark:text-slate-900 rounded-xl hover:opacity-90 transition-opacity shadow-soft-sm cursor-pointer self-start sm:self-auto touch-target"
        >
          <Plus size={15} />
          Nuevo Profesional
        </button>
      </div>

      {/* Contenido principal */}
      {cargando ? (
        <div className="py-10 text-center space-y-2">
          <Loader2 className="w-7 h-7 text-primary dark:text-teal animate-spin mx-auto" />
          <p className="text-[12px] font-medium text-teal-muted dark:text-slate-400">Cargando profesionales del consultorio...</p>
        </div>
      ) : error ? (
        <div className="py-6 text-center bg-status-red-bg/30 rounded-2xl border border-status-red/20 p-5 space-y-2">
          <AlertCircle className="w-6 h-6 text-status-red mx-auto" />
          <p className="text-[12px] font-medium text-status-red dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={cargarProfesionales}
            className="text-[11.5px] font-semibold text-primary dark:text-teal underline cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      ) : profesionales.length === 0 ? (
        <div className="py-10 text-center border-2 border-dashed border-teal-border dark:border-dark-border rounded-2xl p-6 bg-teal-bg/30 dark:bg-dark-input/10">
          <Stethoscope className="w-9 h-9 text-teal-muted/40 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-[13px] font-bold text-primary dark:text-dark-text">
            Sin profesionales registrados
          </p>
          <p className="text-[11.5px] text-teal-muted dark:text-slate-400 max-w-md mx-auto mt-1">
            Haz clic en <strong className="text-primary dark:text-teal">"Nuevo Profesional"</strong> para agregar el primer doctor y personalizar su firma oficial.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {profesionales.map((prof) => {
            const iniciales = prof.nombre_completo
              ? prof.nombre_completo
                  .replace(/^(Dr\.|Dra\.|Lic\.|Odont\.)\s+/i, '')
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()
              : 'DR';

            return (
              <div
                key={prof.id}
                className={`bg-white dark:bg-dark-card border rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 transition-all duration-200 hover:shadow-soft-md ${
                  !prof.activo
                    ? 'border-gray-200 dark:border-dark-border opacity-70 bg-gray-50/50 dark:bg-dark-input/20'
                    : 'border-teal-border/70 dark:border-dark-border hover:border-primary/30 dark:hover:border-teal/40'
                }`}
              >
                <div className="space-y-3">
                  {/* Fila Nombre y Estado */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-teal/20 text-primary dark:text-teal font-bold flex items-center justify-center flex-shrink-0 text-sm shadow-2xs">
                        {iniciales}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[13.5px] font-bold text-primary dark:text-dark-text truncate leading-snug">
                          {prof.nombre_completo}
                        </h4>
                        <p className="text-[11px] text-teal-muted dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          {prof.cedula_profesional ? (
                            <>
                              <Award size={13} className="text-teal flex-shrink-0" />
                              <span className="truncate">Reg: <strong className="font-mono">{prof.cedula_profesional}</strong></span>
                            </>
                          ) : (
                            <span className="italic text-teal-muted/60 dark:text-slate-500">Sin cédula registrada</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[10.5px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
                        !prof.activo
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50'
                      }`}
                    >
                      {prof.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  {/* Estado de Firma */}
                  <div className="pt-2 border-t border-teal-soft/60 dark:border-dark-border/60">
                    {prof.firma_default ? (
                      <div className="bg-teal-bg/60 dark:bg-dark-input/40 border border-teal-border/40 dark:border-dark-border rounded-xl p-2.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-primary dark:text-dark-text truncate">Firma por defecto</p>
                            <p className="text-[10px] text-teal-muted dark:text-slate-400">Lista para documentos PDF</p>
                          </div>
                        </div>
                        <div className="bg-white dark:bg-white px-2 py-1 rounded-lg border border-teal-border/40 shadow-2xs flex-shrink-0">
                          <img
                            src={prof.firma_default}
                            alt={`Firma de ${prof.nombre_completo}`}
                            className="h-7 max-w-[80px] object-contain"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 rounded-xl p-2.5 flex items-center gap-2.5">
                        <PenTool size={15} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
                        <div>
                          <p className="text-[11px] font-semibold text-amber-900 dark:text-amber-300">Sin firma por defecto</p>
                          <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80">Puedes dibujar su trazo oficial para reportes</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div className="pt-3 border-t border-teal-soft dark:border-dark-border flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setProfesionalParaFirma(prof)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[11.5px] font-semibold text-primary dark:text-teal bg-teal-soft/60 dark:bg-dark-input hover:bg-teal-soft border border-teal-border/70 dark:border-dark-border rounded-xl transition-colors cursor-pointer"
                  >
                    <FileSignature size={14} />
                    {prof.firma_default ? 'Cambiar Firma' : 'Cargar Firma'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleEstado(prof)}
                    disabled={cambiandoEstadoId === prof.id}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 text-[11.5px] font-semibold rounded-xl border transition-colors cursor-pointer ${
                      prof.activo
                        ? 'text-status-red dark:text-red-400 border-status-red/30 hover:bg-status-red-bg/40'
                        : 'text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50'
                    }`}
                  >
                    {cambiandoEstadoId === prof.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : prof.activo ? (
                      <ToggleRight size={16} />
                    ) : (
                      <ToggleLeft size={16} />
                    )}
                    <span>{prof.activo ? 'Desactivar' : 'Activar'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalCrear && (
        <ModalCrearProfesional
          onClose={() => setModalCrear(false)}
          onCreado={cargarProfesionales}
          mostrarToast={mostrarToast}
        />
      )}

      {profesionalParaFirma && (
        <ModalFirma
          profesional={profesionalParaFirma}
          onClose={() => setProfesionalParaFirma(null)}
          onFirmaGuardada={cargarProfesionales}
          mostrarToast={mostrarToast}
        />
      )}
    </div>
  );
}
