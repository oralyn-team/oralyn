import { useState, useEffect } from 'react';
import { UserCheck, Plus, X, Loader2, AlertCircle, PenTool, CheckCircle2, ToggleLeft, ToggleRight, FileSignature } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl max-w-md w-full p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-teal-soft dark:border-dark-border pb-3">
          <div className="flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-teal" />
            <h3 className="text-[14px] font-semibold text-primary dark:text-dark-text">
              Firma por Defecto — {profesional.nombre_completo}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-teal-muted hover:text-primary dark:hover:text-dark-text p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {profesional.firma_default && (
          <div className="bg-teal-soft/30 dark:bg-dark-input/50 p-3 rounded-xl border border-teal-border/40 dark:border-dark-border space-y-1">
            <p className="text-[11px] font-medium text-teal-muted dark:text-slate-400">Firma Actual Guardada:</p>
            <div className="bg-white dark:bg-white rounded-lg p-2 flex items-center justify-center border border-teal-border/30">
              <img
                src={profesional.firma_default}
                alt={`Firma de ${profesional.nombre_completo}`}
                className="max-h-16 object-contain"
              />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-teal-muted dark:text-slate-400">
            Dibujar Nueva Firma
          </label>
          <div className="border border-teal-border dark:border-dark-border rounded-xl overflow-hidden bg-white shadow-inner">
            <canvas
              ref={canvasRef}
              className="w-full h-36 cursor-crosshair touch-none"
            />
          </div>
          <div className="flex justify-between items-center pt-1">
            <span className="text-[10px] text-teal-muted dark:text-slate-400">
              Traza con el mouse o la pantalla táctil
            </span>
            <button
              type="button"
              onClick={limpiar}
              className="text-[11px] font-medium text-status-red dark:text-red-400 hover:underline cursor-pointer"
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
            className="px-4 py-2 text-[12px] font-medium text-teal-muted dark:text-slate-400 hover:text-primary dark:hover:text-dark-text transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGuardar}
            disabled={guardando}
            className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium text-white bg-primary dark:bg-teal dark:text-slate-900 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 shadow-soft-sm cursor-pointer"
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
      mostrarToast?.('Profesional creado exitosamente');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl max-w-md w-full p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-teal-soft dark:border-dark-border pb-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-teal" />
            <h3 className="text-[14px] font-semibold text-primary dark:text-dark-text">
              Nuevo Profesional
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-teal-muted hover:text-primary dark:hover:text-dark-text p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-teal-muted dark:text-slate-400 mb-1">
            Nombre Completo del Profesional *
          </label>
          <input
            type="text"
            required
            value={nombreCompleto}
            onChange={(e) => setNombreCompleto(e.target.value)}
            className="w-full text-[12px] text-primary dark:text-dark-text bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-teal font-sans transition-colors min-h-[40px]"
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
            className="w-full text-[12px] text-primary dark:text-dark-text bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-teal font-sans transition-colors min-h-[40px]"
            placeholder="Ej: Reg. Odontología 998877"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-teal-soft dark:border-dark-border">
          <button
            type="button"
            onClick={onClose}
            disabled={creando}
            className="px-4 py-2 text-[12px] font-medium text-teal-muted dark:text-slate-400 hover:text-primary dark:hover:text-dark-text transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={creando}
            className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium text-white bg-primary dark:bg-teal dark:text-slate-900 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 shadow-soft-sm cursor-pointer"
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
    <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl p-5 shadow-soft-sm space-y-4">
      <div className="flex items-center justify-between border-b border-teal-soft dark:border-dark-border pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-teal" />
          <div>
            <h3 className="text-[13px] font-semibold text-primary dark:text-dark-text">
              Profesionales del Consultorio
            </h3>
            <p className="text-[11px] text-teal-muted dark:text-slate-400">
              Administra los doctores que atienden y sus firmas predeterminadas para los documentos en PDF.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setModalCrear(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-medium text-white bg-primary dark:bg-teal dark:text-slate-900 rounded-xl hover:opacity-90 transition-opacity shadow-soft-sm cursor-pointer"
        >
          <Plus size={14} />
          Nuevo Profesional
        </button>
      </div>

      {cargando ? (
        <div className="py-8 text-center">
          <Loader2 className="w-6 h-6 text-teal animate-spin mx-auto mb-2" />
          <p className="text-[12px] text-teal-muted dark:text-slate-400">Cargando profesionales...</p>
        </div>
      ) : error ? (
        <div className="py-6 text-center bg-status-red-bg/30 rounded-xl border border-status-red/20 p-4">
          <AlertCircle className="w-6 h-6 text-status-red mx-auto mb-1.5" />
          <p className="text-[12px] text-status-red dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={cargarProfesionales}
            className="mt-2 text-[11px] font-medium text-primary dark:text-teal underline cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      ) : profesionales.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-teal-border dark:border-dark-border rounded-xl">
          <UserCheck className="w-8 h-8 text-teal-muted/40 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-[12px] font-medium text-teal-muted dark:text-slate-400">
            Aún no hay profesionales registrados.
          </p>
          <p className="text-[11px] text-teal-muted/70 dark:text-slate-500 mt-0.5">
            Haz clic en "Nuevo Profesional" para registrar al primer doctor del consultorio.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-teal-soft dark:divide-dark-border">
          {profesionales.map((prof) => (
            <div
              key={prof.id}
              className={`py-3.5 flex items-center justify-between gap-3 flex-wrap transition-colors ${
                !prof.activo ? 'opacity-60 bg-gray-50/50 dark:bg-dark-input/20 px-2 rounded-xl' : ''
              }`}
            >
              <div className="space-y-0.5 min-w-[200px]">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-primary dark:text-dark-text">
                    {prof.nombre_completo}
                  </span>
                  {!prof.activo ? (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                      Inactivo
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                      Activo
                    </span>
                  )}
                </div>

                {prof.cedula_profesional ? (
                  <p className="text-[11px] text-teal-muted dark:text-slate-400">
                    Cédula / Reg: <span className="font-mono text-[11.5px]">{prof.cedula_profesional}</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-teal-muted/60 dark:text-slate-500 italic">
                    Sin cédula profesional registrada
                  </p>
                )}

                {prof.firma_default ? (
                  <div className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/40 mt-1">
                    <CheckCircle2 size={11} />
                    <span>Firma por defecto cargada</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-800/40 mt-1">
                    <PenTool size={11} />
                    <span>Sin firma por defecto</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setProfesionalParaFirma(prof)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-primary dark:text-teal bg-teal-soft/40 dark:bg-dark-input hover:bg-teal-soft border border-teal-border/60 dark:border-dark-border rounded-xl transition-colors cursor-pointer"
                >
                  <FileSignature size={13} />
                  {prof.firma_default ? 'Cambiar Firma' : 'Cargar Firma'}
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleEstado(prof)}
                  disabled={cambiandoEstadoId === prof.id}
                  title={prof.activo ? 'Desactivar profesional' : 'Activar profesional'}
                  className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-xl border transition-colors cursor-pointer ${
                    prof.activo
                      ? 'text-status-red dark:text-red-400 border-status-red/30 hover:bg-status-red-bg/40'
                      : 'text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50'
                  }`}
                >
                  {cambiandoEstadoId === prof.id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : prof.activo ? (
                    <ToggleRight size={15} />
                  ) : (
                    <ToggleLeft size={15} />
                  )}
                  <span>{prof.activo ? 'Desactivar' : 'Activar'}</span>
                </button>
              </div>
            </div>
          ))}
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
