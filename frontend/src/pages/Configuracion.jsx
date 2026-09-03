// src/pages/Configuracion.jsx
import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/Appcontext';
import { api } from '../api';

import Sidebar from '../components/layout/Sidebar';
import Topbar  from '../components/layout/Topbar';

import {
  Settings,
  Save,
  Building2,
  UserRound,
  Users,
  FileText,
  MapPin,
  Phone,
  Mail,
  Check,
  AlertCircle,
  Loader2,
  Stethoscope,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  Tag,
  DollarSign,
  Hash,
  Receipt,
  ShieldCheck,
  CheckCircle2,
  CalendarDays,
  Globe
} from 'lucide-react';

// ── Categorías predefinidas (sirven como opciones en el modal) ─────────────────
const CATEGORIAS = [
  'Preventivo',
  'Restaurador',
  'Endodoncia',
  'Cirugía',
  'Estético',
  'Ortodoncia',
  'Prótesis',
  'Periodoncia',
];

// ── Colores por categoría ──────────────────────────────────────────────────────
const CAT_COLORS = {
  Preventivo:  { bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200'    },
  Restaurador: { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200'    },
  Endodoncia:  { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200'   },
  'Cirugía':   { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200'     },
  'Estético':  { bg: 'bg-pink-50',    text: 'text-pink-700',    border: 'border-pink-200'    },
  Ortodoncia:  { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200'  },
  'Prótesis':  { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200'  },
  Periodoncia: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
};

function catColor(cat) {
  return CAT_COLORS[cat] || { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' };
}

function fmt(n) {
  const num = Number(n);
  if (!num) return '—';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
}

// ── Estilos reutilizables ──────────────────────────────────────────────────────
const inputCls = 'w-full text-[12px] text-primary bg-white border border-teal-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40 font-sans';
const labelCls = 'block text-[11px] font-medium text-teal-muted mb-1';

// ── Subcomponentes ─────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex items-center h-5 w-9 rounded-full transition-colors cursor-pointer flex-shrink-0',
        checked ? 'bg-primary' : 'bg-slate-200',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200',
          checked ? 'translate-x-4.5' : 'translate-x-0.5',
        ].join(' ')}
        style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }}
      />
    </button>
  );
}

// ── Modal de Procedimiento (Crear / Editar) ───────────────────────────────────

const PROC_VACIO = { codigo: '', nombre: '', categoria: CATEGORIAS[0], valorBase: '', activo: true };

// ── Modal de Procedimiento (Crear / Editar) ───────────────────────────────────

function ProcedimientoModal({ proc, onSave, onClose, saving }) {
  const [catalogoOficial, setCatalogoOficial] = useState([]);
  const [loadingOficial, setLoadingOficial] = useState(false);
  const [busquedaOficial, setBusquedaOficial] = useState('');
  const [selectedOficial, setSelectedOficial] = useState(
    proc ? { codigo: proc.codigo, nombreOficial: proc.nombreOficial || proc.nombre, categoria: proc.categoria } : null
  );

  const [form, setForm] = useState(() => ({
    codigo: proc?.codigo || '',
    nombreOficial: proc?.nombreOficial || proc?.nombre || '',
    nombre: proc?.nombre || '',
    categoria: proc?.categoria || 'Preventivo',
    valorBase: proc?.valorBase ?? '',
    activo: proc?.activo !== false,
  }));
  const [errs, setErrs] = useState({});

  useEffect(() => {
    if (!proc) {
      let isMounted = true;
      setLoadingOficial(true);
      api.getCatalogoOficial().then((res) => {
        if (isMounted) {
          setCatalogoOficial(res || []);
          setLoadingOficial(false);
        }
      }).catch(() => {
        if (isMounted) setLoadingOficial(false);
      });
      return () => { isMounted = false; };
    }
  }, [proc]);

  const resultadosOficiales = useMemo(() => {
    let list = [...catalogoOficial];
    if (busquedaOficial.trim()) {
      const q = busquedaOficial.toLowerCase();
      list = list.filter(item =>
        item.nombreOficial.toLowerCase().includes(q) ||
        item.codigo.toLowerCase().includes(q)
      );
    }
    // Ordenar: Frecuentes primero
    return list.sort((a, b) => (b.frecuente ? 1 : 0) - (a.frecuente ? 1 : 0));
  }, [catalogoOficial, busquedaOficial]);

  function handleSelectOfficial(item) {
    setSelectedOficial(item);
    setForm((prev) => ({
      ...prev,
      codigo: item.codigo,
      nombreOficial: item.nombreOficial,
      nombre: item.nombreOficial, // Nombre visible por defecto
      categoria: item.categoria,
    }));
  }

  function set(field, val) { setForm(p => ({ ...p, [field]: val })); }

  function validar() {
    const e = {};
    if (!selectedOficial)      e.oficial = 'Debes seleccionar un procedimiento del Catálogo Oficial CUPS.';
    if (!form.nombre.trim())   e.nombre  = 'El nombre visible es obligatorio.';
    if (form.valorBase !== '' && isNaN(Number(form.valorBase))) e.valorBase = 'Ingresa un precio válido.';
    setErrs(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validar()) return;
    onSave({
      ...form,
      valorBase: form.valorBase !== '' ? Number(form.valorBase) : 0,
    });
  }

  return (
    <div
      className="fixed inset-0 bg-primary/40 dark:bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-dark-card rounded-t-2xl sm:rounded-2xl w-full max-w-lg shadow-soft-lg border border-teal-border dark:border-dark-border flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-teal-soft dark:border-dark-border bg-primary dark:bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
              <Stethoscope size={16} className="text-teal-light" />
            </div>
            <div>
              <p className="text-[13.5px] font-semibold text-white">
                {proc ? 'Editar procedimiento' : 'Agregar procedimiento'}
              </p>
              <p className="text-[10.5px] text-teal-light dark:text-slate-400 mt-0.5">Catálogo CUPS Oficial & Repertorio Clínico</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/10 touch-target flex items-center justify-center">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1 bg-white dark:bg-dark-card text-primary dark:text-dark-text">

          {/* BUSCADOR DE CATÁLOGO OFICIAL */}
          {!proc && (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-teal-muted dark:text-slate-400 mb-1">
                <span className="flex items-center gap-1"><Search size={12} /> Buscar en Catálogo CUPS Oficial *</span>
              </label>
              <div className="relative mb-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-muted dark:text-slate-400" />
                <input
                  type="text"
                  value={busquedaOficial}
                  onChange={e => setBusquedaOficial(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-[12px] border border-teal-border dark:border-dark-border rounded-xl bg-white dark:bg-dark-input text-primary dark:text-dark-text focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-teal transition-colors min-h-[38px]"
                  placeholder="Buscar por código CUPS (ej: 890201) o nombre oficial..."
                />
              </div>

              {errs.oficial && <p className="text-[10.5px] text-status-red dark:text-red-400 mb-2 font-medium">⚠ {errs.oficial}</p>}

              {/* Lista de resultados del catálogo oficial */}
              <div className="border border-teal-border dark:border-dark-border rounded-xl max-h-48 overflow-y-auto custom-scrollbar divide-y divide-teal-soft dark:divide-dark-border bg-white dark:bg-dark-input mb-4">
                {loadingOficial ? (
                  <div className="p-4 text-center text-[11px] text-teal-muted dark:text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin text-primary dark:text-teal" /> Cargando catálogo oficial CUPS...
                  </div>
                ) : resultadosOficiales.length === 0 ? (
                  <div className="p-4 text-center text-[11px] text-teal-muted dark:text-slate-400">
                    No se encontraron procedimientos en el Catálogo Oficial.
                  </div>
                ) : (
                  resultadosOficiales.map((item) => {
                    const isSelected = selectedOficial?.codigo === item.codigo;
                    const cc = catColor(item.categoria);
                    return (
                      <div
                        key={item.codigo}
                        onClick={() => handleSelectOfficial(item)}
                        className={[
                          'p-3 cursor-pointer transition-colors flex items-start justify-between gap-2 touch-target',
                          isSelected ? 'bg-primary/10 dark:bg-slate-800 border-l-4 border-l-primary dark:border-l-teal font-medium' : 'hover:bg-teal-panel dark:hover:bg-slate-800/40',
                        ].join(' ')}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-[10.5px] font-mono text-teal-muted dark:text-teal bg-teal-soft/80 dark:bg-slate-900 px-1.5 py-0.5 rounded font-semibold">
                              CUPS {item.codigo}
                            </span>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${cc.bg} ${cc.text} ${cc.border}`}>
                              {item.categoria}
                            </span>
                            {item.frecuente && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-900/50 flex items-center gap-1">
                                ⭐ Frecuente
                              </span>
                            )}
                          </div>
                          <p className="text-[11.5px] font-medium text-primary dark:text-dark-text leading-snug">{item.nombreOficial}</p>
                        </div>
                        {isSelected && <Check size={16} className="text-primary dark:text-teal flex-shrink-0 mt-1" />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* DATOS OFICIALES (INFORMACIÓN SOLO LECTURA) */}
          {selectedOficial && (
            <div className="p-3.5 bg-teal-panel dark:bg-slate-800/60 border border-teal-border dark:border-dark-border rounded-xl space-y-2">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.7px] text-teal-muted dark:text-slate-400 flex items-center gap-1">
                <FileText size={12} /> Información Oficial CUPS (Solo Lectura)
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1 text-[11.5px]">
                <div>
                  <span className="text-[10px] text-teal-muted dark:text-slate-400 block">Código CUPS</span>
                  <span className="font-mono font-semibold text-primary dark:text-dark-text">{selectedOficial.codigo}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-teal-muted dark:text-slate-400 block">Categoría Oficial</span>
                  <span className="font-medium text-primary dark:text-dark-text">{selectedOficial.categoria}</span>
                </div>
                <div className="col-span-3 pt-1 border-t border-teal-border/40 dark:border-dark-border">
                  <span className="text-[10px] text-teal-muted dark:text-slate-400 block">Nombre Oficial</span>
                  <span className="font-medium text-primary dark:text-dark-text leading-snug block">{selectedOficial.nombreOficial}</span>
                </div>
              </div>
            </div>
          )}

          {/* CONFIGURACIÓN PROPIA DEL CONSULTORIO (EDITABLE) */}
          {selectedOficial && (
            <div className="space-y-3 pt-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.7px] text-primary dark:text-dark-text flex items-center gap-1 border-b border-teal-soft dark:border-dark-border pb-1">
                <Pencil size={12} className="text-teal" /> Configuración en el Consultorio
              </p>

              {/* Nombre Visible */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-teal-muted dark:text-slate-400 mb-1">
                  <span className="flex items-center gap-1"><FileText size={11} /> Nombre visible en el consultorio *</span>
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={e => set('nombre', e.target.value)}
                  className={`w-full px-3 py-2.5 text-[12px] border rounded-xl bg-white dark:bg-dark-input text-primary dark:text-dark-text focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-teal min-h-[38px] ${errs.nombre ? 'border-status-red dark:border-red-400' : 'border-teal-border dark:border-dark-border'}`}
                  placeholder="Ej: Profilaxis dental"
                />
                {errs.nombre && <p className="text-[10.5px] text-status-red dark:text-red-400 mt-1 font-medium">⚠ {errs.nombre}</p>}
                <p className="text-[10px] text-teal-muted dark:text-slate-400 mt-1">Nombre corto con el que los profesionales identificarán el procedimiento.</p>
              </div>

              {/* Precio / Valor base */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-teal-muted dark:text-slate-400 mb-1">
                  <span className="flex items-center gap-1"><DollarSign size={11} /> Precio / Valor base (COP)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-muted dark:text-slate-400 text-[12px] font-bold">$</span>
                  <input
                    type="number"
                    min="0"
                    value={form.valorBase}
                    onChange={e => set('valorBase', e.target.value)}
                    className={`w-full pl-7 pr-3 py-2.5 text-[12px] border rounded-xl bg-white dark:bg-dark-input text-primary dark:text-dark-text focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-teal min-h-[38px] ${errs.valorBase ? 'border-status-red dark:border-red-400' : 'border-teal-border dark:border-dark-border'}`}
                    placeholder="0"
                  />
                </div>
                {errs.valorBase && <p className="text-[10.5px] text-status-red dark:text-red-400 mt-1 font-medium">⚠ {errs.valorBase}</p>}
              </div>

              {/* Estado (Activo / Inactivo) */}
              <div className="flex items-center justify-between py-2.5 px-3.5 bg-white dark:bg-dark-input rounded-xl border border-teal-border dark:border-dark-border">
                <div>
                  <p className="text-[12px] font-semibold text-primary dark:text-dark-text">Estado del procedimiento</p>
                  <p className="text-[10.5px] text-teal-muted dark:text-slate-400">Solo los activos aparecen en historias clínicas y citas</p>
                </div>
                <Toggle checked={form.activo} onChange={v => set('activo', v)} />
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-teal-soft dark:border-dark-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[12px] text-primary dark:text-slate-300 font-medium rounded-lg border border-teal-border dark:border-dark-border bg-white dark:bg-dark-input hover:bg-teal-soft dark:hover:bg-slate-700 transition-colors cursor-pointer touch-target"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !selectedOficial}
              className="flex items-center gap-1.5 px-4 py-2 text-[12px] text-white font-medium bg-primary dark:bg-teal dark:text-slate-900 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer touch-target shadow-soft-sm"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? 'Guardando...' : 'Guardar Procedimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal de Confirmación Eliminar ────────────────────────────────────────────

function ConfirmDelete({ proc, onConfirm, onClose, deleting }) {
  return (
    <div
      className="fixed inset-0 bg-primary/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-dark-card rounded-2xl w-full max-w-sm shadow-soft-lg border border-teal-border dark:border-dark-border p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-status-red dark:text-red-400 flex items-center justify-center flex-shrink-0">
            <Trash2 size={18} />
          </div>
          <div>
            <p className="text-[13.5px] font-semibold text-primary dark:text-dark-text">Eliminar procedimiento</p>
            <p className="text-[11.5px] text-teal-muted dark:text-slate-400 mt-1 leading-relaxed">
              ¿Estás seguro de que deseas eliminar <strong className="text-primary dark:text-dark-text font-bold">"{proc.nombre}"</strong>?
              Esta acción no se puede deshacer.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-[12px] text-primary dark:text-slate-300 font-medium rounded-lg border border-teal-border dark:border-dark-border bg-white dark:bg-dark-input hover:bg-teal-soft dark:hover:bg-slate-700 transition-colors cursor-pointer touch-target"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(proc.id)}
            disabled={deleting}
            className="flex items-center gap-1.5 px-4 py-2 text-[12px] text-white font-medium bg-status-red dark:bg-red-600 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-70 cursor-pointer touch-target shadow-soft-sm"
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {deleting ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Catálogo CUPS ────────────────────────────────────────────────────────

function TabCatalogoCUPS() {
  const {
    procedimientosCatalog,
    loadingProcedimientos,
    crearProcedimiento,
    actualizarProcedimiento,
    eliminarProcedimiento,
  } = useApp();

  const [busqueda, setBusqueda]         = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [modal, setModal]               = useState(null); // null | 'crear' | procedimiento_a_editar
  const [confirmDelete, setConfirmDelete] = useState(null); // null | procedimiento
  const [saving, setSaving]             = useState(false);
  const [deleting, setDeleting]         = useState(false);
  const [toast, setToast]               = useState(null);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  const filtrados = useMemo(() => {
    let list = [...procedimientosCatalog];
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      list = list.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        (p.codigo || '').toLowerCase().includes(q)
      );
    }
    if (filtroCategoria) list = list.filter(p => p.categoria === filtroCategoria);
    if (filtroEstado === 'activos')   list = list.filter(p => p.activo);
    if (filtroEstado === 'inactivos') list = list.filter(p => !p.activo);
    return list;
  }, [procedimientosCatalog, busqueda, filtroCategoria, filtroEstado]);

  const categoriasDisponibles = useMemo(() => {
    const cats = new Set(procedimientosCatalog.map(p => p.categoria));
    return [...cats].sort();
  }, [procedimientosCatalog]);

  const stats = useMemo(() => ({
    total: procedimientosCatalog.length,
    activos: procedimientosCatalog.filter(p => p.activo).length,
    categorias: new Set(procedimientosCatalog.map(p => p.categoria)).size,
  }), [procedimientosCatalog]);

  async function handleSave(data) {
    setSaving(true);
    try {
      if (modal && modal !== 'crear') {
        await actualizarProcedimiento(modal.id, data);
        showToast('Procedimiento actualizado correctamente');
      } else {
        const res = await crearProcedimiento(data);
        if (res && res._reactivado) {
          showToast('Procedimiento reactivado correctamente');
        } else {
          showToast('Procedimiento creado correctamente');
        }
      }
      setModal(null);
    } catch (err) {
      showToast(err?.error || 'Ocurrió un error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActivo(proc) {
    try {
      await actualizarProcedimiento(proc.id, { ...proc, activo: !proc.activo });
      showToast(`Procedimiento ${!proc.activo ? 'activado' : 'desactivado'}`);
    } catch {
      showToast('No se pudo cambiar el estado');
    }
  }

  async function handleDelete(id) {
    setDeleting(true);
    try {
      const res = await eliminarProcedimiento(id);
      if (res && res.advertencia) {
        showToast(`Procedimiento desactivado. ⚠️ ${res.advertencia}`);
      } else {
        showToast(res?.message || 'Procedimiento desactivado correctamente');
      }
      setConfirmDelete(null);
    } catch {
      showToast('No se pudo desactivar el procedimiento');
    } finally {
      setDeleting(false);
    }
  }

  if (loadingProcedimientos) {
    return (
      <div className="bg-white border border-teal-border rounded-xl p-10 text-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
        <p className="text-[12px] text-teal-muted">Cargando catálogo de procedimientos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: 'Total procedimientos', value: stats.total, icon: Stethoscope, color: 'text-primary dark:text-teal bg-primary/10 dark:bg-slate-800' },
          { label: 'Activos',              value: stats.activos, icon: Check, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40' },
          { label: 'Categorías',           value: stats.categorias, icon: Tag, color: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl p-4 flex items-center gap-3.5 shadow-soft-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>
              <s.icon size={18} />
            </div>
            <div>
              <p className="text-[20px] font-bold text-primary dark:text-dark-text leading-none">{s.value}</p>
              <p className="text-[11px] text-teal-muted dark:text-slate-400 mt-1 font-medium">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl p-4 flex flex-col sm:flex-row flex-wrap items-center gap-3 shadow-soft-sm">

        {/* Búsqueda */}
        <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-muted dark:text-slate-400" />
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o código CUPS..."
            className="w-full pl-9 pr-8 py-2.5 text-[12px] border border-teal-border dark:border-dark-border rounded-xl bg-white dark:bg-dark-input text-primary dark:text-dark-text focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-teal transition-colors min-h-[38px]"
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-muted dark:text-slate-400 hover:text-primary dark:hover:text-dark-text">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filtros container */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
          {/* Filtro categoría */}
          <div className="relative flex-1 sm:flex-initial min-w-[140px]">
            <select
              value={filtroCategoria}
              onChange={e => setFiltroCategoria(e.target.value)}
              className="w-full text-[12px] border border-teal-border dark:border-dark-border rounded-xl px-3 py-2 bg-white dark:bg-dark-input appearance-none pr-8 text-primary dark:text-dark-text focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-teal cursor-pointer min-h-[38px]"
            >
              <option value="">Todas las categorías</option>
              {categoriasDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-teal-muted dark:text-slate-400 pointer-events-none" />
          </div>

          {/* Filtro estado */}
          <div className="flex rounded-xl border border-teal-border dark:border-dark-border overflow-hidden text-[11.5px] bg-white dark:bg-dark-input">
            {[['todos','Todos'],['activos','Activos'],['inactivos','Inactivos']].map(([val, lab]) => (
              <button
                key={val}
                type="button"
                onClick={() => setFiltroEstado(val)}
                className={[
                  'px-3 py-2 transition-colors cursor-pointer touch-target',
                  filtroEstado === val ? 'bg-primary dark:bg-teal text-white dark:text-slate-900 font-semibold' : 'text-teal-muted dark:text-slate-400 hover:bg-teal-panel dark:hover:bg-slate-800/40',
                ].join(' ')}
              >
                {lab}
              </button>
            ))}
          </div>
        </div>

        {/* Nuevo procedimiento */}
        <button
          type="button"
          onClick={() => setModal('crear')}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 text-[12px] text-white font-medium bg-primary dark:bg-teal dark:text-slate-900 rounded-xl hover:opacity-90 transition-opacity cursor-pointer sm:ml-auto flex-shrink-0 touch-target shadow-soft-sm"
        >
          <Plus size={14} /> Nuevo procedimiento
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl overflow-hidden shadow-soft-sm">

        {filtrados.length === 0 ? (
          <div className="py-16 text-center">
            <Stethoscope size={36} className="text-teal-light dark:text-slate-500 mx-auto mb-3" />
            <p className="text-[13px] font-semibold text-primary dark:text-dark-text mb-1">Sin procedimientos</p>
            <p className="text-[11.5px] text-teal-muted dark:text-slate-400 max-w-sm mx-auto">
              {busqueda || filtroCategoria
                ? 'No hay procedimientos que coincidan con los filtros aplicados.'
                : 'Aún no has agregado procedimientos al catálogo.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-teal-bg/60 dark:bg-slate-800/60 border-b border-teal-soft dark:border-dark-border">
                  <th className="px-4 py-3.5 text-[10.5px] font-semibold text-teal-muted dark:text-slate-400 uppercase tracking-[0.7px]">Nombre visible</th>
                  <th className="px-4 py-3.5 text-[10.5px] font-semibold text-teal-muted dark:text-slate-400 uppercase tracking-[0.7px]">Código CUPS</th>
                  <th className="px-4 py-3.5 text-[10.5px] font-semibold text-teal-muted dark:text-slate-400 uppercase tracking-[0.7px]">Nombre oficial</th>
                  <th className="px-4 py-3.5 text-[10.5px] font-semibold text-teal-muted dark:text-slate-400 uppercase tracking-[0.7px]">Categoría</th>
                  <th className="px-4 py-3.5 text-[10.5px] font-semibold text-teal-muted dark:text-slate-400 uppercase tracking-[0.7px] text-right">Precio</th>
                  <th className="px-4 py-3.5 text-[10.5px] font-semibold text-teal-muted dark:text-slate-400 uppercase tracking-[0.7px] text-center">Estado</th>
                  <th className="px-4 py-3.5 text-[10.5px] font-semibold text-teal-muted dark:text-slate-400 uppercase tracking-[0.7px] text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-teal-soft dark:divide-dark-border text-primary dark:text-dark-text">
                {filtrados.map((proc) => {
                  const cc = catColor(proc.categoria);
                  return (
                    <tr
                      key={proc.id}
                      className={[
                        'transition-colors hover:bg-teal-info/40 dark:hover:bg-slate-800/40',
                        !proc.activo ? 'opacity-55' : '',
                      ].join(' ')}
                    >
                      {/* Nombre visible */}
                      <td className="px-4 py-3.5">
                        <p className="text-[12.5px] font-medium text-primary dark:text-dark-text leading-snug">{proc.nombre}</p>
                      </td>

                      {/* Código CUPS */}
                      <td className="px-4 py-3.5">
                        <span className="text-[11px] font-mono text-teal-muted dark:text-teal bg-teal-soft/60 dark:bg-slate-800 px-2 py-1 rounded font-semibold">
                          {proc.codigo || '—'}
                        </span>
                      </td>

                      {/* Nombre oficial */}
                      <td className="px-4 py-3.5">
                        <p className="text-[11.5px] text-teal-muted dark:text-slate-400 leading-snug">{proc.nombreOficial || proc.nombre}</p>
                      </td>

                      {/* Categoría */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center text-[10.5px] font-medium px-2.5 py-0.5 rounded-full border ${cc.bg} ${cc.text} ${cc.border}`}>
                          {proc.categoria}
                        </span>
                      </td>

                      {/* Precio / Valor base */}
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-[12px] font-semibold text-primary dark:text-dark-text tabular-nums">{fmt(proc.valorBase)}</span>
                      </td>

                      {/* Estado toggle */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-2">
                          <Toggle checked={proc.activo} onChange={() => handleToggleActivo(proc)} />
                          <span className={`text-[10.5px] font-medium ${proc.activo ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                            {proc.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            title="Editar"
                            onClick={() => setModal(proc)}
                            className="p-1.5 rounded-lg text-teal-muted hover:text-primary dark:hover:text-teal hover:bg-teal-soft dark:hover:bg-slate-800 transition-colors cursor-pointer touch-target"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            title="Eliminar"
                            onClick={() => setConfirmDelete(proc)}
                            className="p-1.5 rounded-lg text-teal-muted hover:text-status-red dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer touch-target"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer contador */}
        {filtrados.length > 0 && (
          <div className="px-4 py-3 border-t border-teal-soft dark:border-dark-border bg-teal-panel/40 dark:bg-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[11px] text-teal-muted dark:text-slate-400">
              Mostrando <strong className="text-primary dark:text-dark-text">{filtrados.length}</strong> de{' '}
              <strong className="text-primary dark:text-dark-text">{procedimientosCatalog.length}</strong> procedimientos
            </p>
            <p className="text-[10px] text-teal-muted dark:text-slate-400">
              Los procedimientos inactivos no aparecen en los formularios
            </p>
          </div>
        )}
      </div>

      {/* Modales */}
      {modal && (
        <ProcedimientoModal
          proc={modal === 'crear' ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
          saving={saving}
        />
      )}
      {confirmDelete && (
        <ConfirmDelete
          proc={confirmDelete}
          onConfirm={handleDelete}
          onClose={() => setConfirmDelete(null)}
          deleting={deleting}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-primary dark:bg-slate-800 text-white text-[12px] px-4 py-2.5 rounded-full whitespace-nowrap z-[60] shadow-soft-lg flex items-center gap-2 border border-white/10 animate-toast">
          <Check size={14} className="text-teal" /> {toast}
        </div>
      )}
    </div>
  );
}

// ── Tab: Ajustes Generales ────────────────────────────────────────────────────

function TabAjustesGenerales() {
  const { pacientes, setConfiguracion } = useApp();

  const [form, setForm] = useState({
    nombre_consultorio: '',
    nombre_profesional: '',
    registro_profesional: '',
    nit: '',
    direccion: '',
    telefono: '',
    ciudad: 'Villavicencio',
    email: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState(null);
  const [toast, setToast]     = useState(null);
  const [existeConfig, setExisteConfig] = useState(false);

  async function loadConfiguracion() {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getConfiguracion();
      if (data) {
        setForm({
          nombre_consultorio:  data.nombre_consultorio  || '',
          nombre_profesional:  data.nombre_profesional  || '',
          registro_profesional: data.registro_profesional || '',
          nit:     data.nit     || '',
          direccion: data.direccion || '',
          telefono:  data.telefono  || '',
          ciudad:    data.ciudad    || 'Villavicencio',
          email:     data.email     || ''
        });
        setExisteConfig(true);
      }
    } catch (err) {
      if (err.status === 404) setExisteConfig(false);
      else setError(err.error || 'No se pudo cargar la configuración del consultorio.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadConfiguracion(); }, []);

  function mostrarToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nombre_consultorio.trim() || !form.nombre_profesional.trim()) {
      mostrarToast('Nombre del consultorio y profesional son obligatorios');
      return;
    }
    setSaving(true);
    try {
      if (existeConfig) {
        await api.actualizarConfiguracion(form);
        setConfiguracion(form);
        mostrarToast('Configuración actualizada correctamente');
      } else {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/configuracion`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(form)
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Error creando configuración');
        }
        setConfiguracion(form);
        setExisteConfig(true);
        mostrarToast('Configuración inicial guardada correctamente');
      }
    } catch (err) {
      mostrarToast(err.message || 'No se pudo guardar la configuración');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-teal-border rounded-xl p-8 text-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
        <p className="text-[12px] text-teal-muted">Cargando configuración...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-teal-border rounded-xl p-6 text-center max-w-md mx-auto">
        <AlertCircle className="w-10 h-10 text-status-red mx-auto mb-3" />
        <h3 className="text-[14px] font-medium text-primary mb-1">Error de conexión</h3>
        <p className="text-[11px] text-teal-muted mb-4">{error}</p>
        <button
          type="button"
          onClick={loadConfiguracion}
          className="text-[12px] text-white font-medium px-4 py-2 bg-primary rounded-lg hover:bg-primary-light transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Datos del Consultorio */}
          <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl p-5 shadow-soft-sm space-y-4">
            <h3 className="text-[13px] font-semibold text-primary dark:text-dark-text border-b border-teal-soft dark:border-dark-border pb-2 flex items-center gap-1.5">
              <Building2 size={15} className="text-teal" /> Datos del Consultorio
            </h3>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-teal-muted dark:text-slate-400 mb-1">Nombre del Consultorio *</label>
              <input type="text" required value={form.nombre_consultorio}
                onChange={e => setForm({...form, nombre_consultorio: e.target.value})}
                className="w-full text-[12px] text-primary dark:text-dark-text bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-teal font-sans transition-colors min-h-[40px]" placeholder="Ej: Oralyn Dental" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-teal-muted dark:text-slate-400 mb-1">NIT / Identificación</label>
                <input type="text" value={form.nit}
                  onChange={e => setForm({...form, nit: e.target.value})}
                  className="w-full text-[12px] text-primary dark:text-dark-text bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-teal font-sans transition-colors min-h-[40px]" placeholder="NIT o Cédula Jurídica" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-teal-muted dark:text-slate-400 mb-1">Ciudad</label>
                <input type="text" value={form.ciudad}
                  onChange={e => setForm({...form, ciudad: e.target.value})}
                  className="w-full text-[12px] text-primary dark:text-dark-text bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-teal font-sans transition-colors min-h-[40px]" placeholder="Villavicencio" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-teal-muted dark:text-slate-400 mb-1">Dirección Física</label>
              <div className="relative">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-muted dark:text-slate-400" />
                <input type="text" value={form.direccion}
                  onChange={e => setForm({...form, direccion: e.target.value})}
                  className="w-full text-[12px] text-primary dark:text-dark-text bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-teal font-sans transition-colors min-h-[40px]" placeholder="Calle 15 # 24-30" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-teal-muted dark:text-slate-400 mb-1">Teléfono Contacto</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-muted dark:text-slate-400" />
                  <input type="tel" value={form.telefono}
                    onChange={e => setForm({...form, telefono: e.target.value})}
                    className="w-full text-[12px] text-primary dark:text-dark-text bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-teal font-sans transition-colors min-h-[40px]" placeholder="+57 320 123 4567" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-teal-muted dark:text-slate-400 mb-1">Correo Electrónico</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-muted dark:text-slate-400" />
                  <input type="email" value={form.email}
                    onChange={e => setForm({...form, email: e.target.value})}
                    className="w-full text-[12px] text-primary dark:text-dark-text bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-teal font-sans transition-colors min-h-[40px]" placeholder="contacto@oralyn.com" />
                </div>
              </div>
            </div>
          </div>

          {/* Datos del Profesional */}
          <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl p-5 shadow-soft-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-[13px] font-semibold text-primary dark:text-dark-text border-b border-teal-soft dark:border-dark-border pb-2 flex items-center gap-1.5">
                <UserRound size={15} className="text-teal" /> Datos del Profesional Responsable
              </h3>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-teal-muted dark:text-slate-400 mb-1">Nombre Completo del Profesional *</label>
                <input type="text" required value={form.nombre_profesional}
                  onChange={e => setForm({...form, nombre_profesional: e.target.value})}
                  className="w-full text-[12px] text-primary dark:text-dark-text bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-teal font-sans transition-colors min-h-[40px]" placeholder="Ej: Dra. Diana Murillo" />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-teal-muted dark:text-slate-400 mb-1">Registro / Cédula Profesional</label>
                <div className="relative">
                  <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-muted dark:text-slate-400" />
                  <input type="text" value={form.registro_profesional}
                    onChange={e => setForm({...form, registro_profesional: e.target.value})}
                    className="w-full text-[12px] text-primary dark:text-dark-text bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-teal font-sans transition-colors min-h-[40px]" placeholder="Ej: Reg. Odontología 12345" />
                </div>
                <p className="text-[10px] text-teal-muted dark:text-slate-400 mt-1.5 leading-relaxed">
                  Esta información se imprimirá en los consentimientos informados firmados y certificados de asistencia emitidos.
                </p>
              </div>
            </div>

            <div className="pt-5 border-t border-teal-soft dark:border-dark-border flex items-center justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2 px-5 py-2.5 text-[12px] text-white font-medium bg-primary dark:bg-teal dark:text-slate-900 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-75 touch-target cursor-pointer shadow-soft-sm"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Guardando...' : 'Guardar Configuración'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-primary dark:bg-slate-800 text-white text-[12px] px-4 py-2.5 rounded-full whitespace-nowrap z-50 shadow-soft-lg flex items-center gap-2 border border-white/10 animate-toast">
          <Check size={14} className="text-teal" /> {toast}
        </div>
      )}
    </>
  );
}

// ── Tab: Facturación Electrónica DIAN / Factus ─────────────────────────────────

function TabFacturacionElectronica() {
  const { configuracion, setConfiguracion } = useApp();

  const [form, setForm] = useState({
    razon_social: configuracion?.razon_social || configuracion?.nombre_consultorio || '',
    nit_dv: configuracion?.nit_dv || '',
    municipio_code: configuracion?.municipio_code || '',
    factus_client_id: configuracion?.factus_client_id || '',
    factus_client_secret: configuracion?.has_factus_secret ? '••••••••' : (configuracion?.factus_client_secret || ''),
    factus_username: configuracion?.factus_username || '',
    factus_password: configuracion?.has_factus_password ? '••••••••' : (configuracion?.factus_password || ''),
    facturacion_habilitada: configuracion?.facturacion_habilitada || false,
  });

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (configuracion) {
      setForm({
        razon_social: configuracion.razon_social || configuracion.nombre_consultorio || '',
        nit_dv: configuracion.nit_dv || '',
        municipio_code: configuracion.municipio_code || '',
        factus_client_id: configuracion.factus_client_id || '',
        factus_client_secret: configuracion.has_factus_secret ? '••••••••' : (configuracion.factus_client_secret || ''),
        factus_username: configuracion.factus_username || '',
        factus_password: configuracion.has_factus_password ? '••••••••' : (configuracion.factus_password || ''),
        facturacion_habilitada: Boolean(configuracion.facturacion_habilitada),
      });
    }
  }, [configuracion]);

  const mostrarToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleSaveAll = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.actualizarConfiguracion(form);
      setConfiguracion((prev) => ({ ...prev, ...form }));
      mostrarToast('Ajustes y credenciales de Facturación Electrónica guardados');
    } catch (err) {
      console.error('Error guardando credenciales Factus:', err);
      mostrarToast(err?.error || err?.message || 'Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSaveAll} className="space-y-4">
      
      {/* Banner Habilitar Facturación */}
      <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl p-5 shadow-soft-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary dark:text-teal flex items-center justify-center flex-shrink-0">
            <Receipt size={20} />
          </div>
          <div>
            <h3 className="text-[13.5px] font-bold text-primary dark:text-dark-text">Facturación Electrónica (Factus / DIAN)</h3>
            <p className="text-[11px] text-teal-muted dark:text-slate-400 mt-0.5">
              Habilita la emisión automática de facturas electrónicas para este consultorio.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Toggle
            checked={form.facturacion_habilitada}
            onChange={(val) => setForm({ ...form, facturacion_habilitada: val })}
          />
          <span className={`text-[12px] font-semibold ${form.facturacion_habilitada ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
            {form.facturacion_habilitada ? 'Habilitada' : 'Deshabilitada'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* 1. Datos Fiscales del Consultorio */}
        <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl p-5 shadow-soft-sm space-y-4">
          <h3 className="text-[13px] font-semibold text-primary dark:text-dark-text border-b border-teal-soft dark:border-dark-border pb-2 flex items-center gap-1.5">
            <Building2 size={15} className="text-teal" /> Datos Fiscales ante DIAN
          </h3>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-teal-muted dark:text-slate-400 mb-1">Razón Social *</label>
            <input
              type="text"
              required
              value={form.razon_social}
              onChange={(e) => setForm({ ...form, razon_social: e.target.value })}
              placeholder="Ej: Oralyn Consultorio Odontológico S.A.S."
              className="w-full text-[12px] text-primary dark:text-dark-text bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-teal font-sans min-h-[40px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-teal-muted dark:text-slate-400 mb-1">Dígito de Verificación NIT (DV)</label>
              <input
                type="text"
                maxLength={2}
                value={form.nit_dv}
                onChange={(e) => setForm({ ...form, nit_dv: e.target.value })}
                placeholder="Ej: 1"
                className="w-full text-[12px] text-primary dark:text-dark-text bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-teal font-sans min-h-[40px]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-teal-muted dark:text-slate-400 mb-1">Código Municipio (DIVIPOLA)</label>
              <input
                type="text"
                value={form.municipio_code}
                onChange={(e) => setForm({ ...form, municipio_code: e.target.value })}
                placeholder="Ej: 50001 (Villavicencio)"
                className="w-full text-[12px] text-primary dark:text-dark-text bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-teal font-sans min-h-[40px]"
              />
            </div>
          </div>
        </div>

        {/* 2. Credenciales Factus API (Modelo Multiempresa) */}
        <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl p-5 shadow-soft-sm space-y-4">
          <h3 className="text-[13px] font-semibold text-primary dark:text-dark-text border-b border-teal-soft dark:border-dark-border pb-2 flex items-center gap-1.5">
            <Globe size={15} className="text-teal" /> Credenciales Factus API
          </h3>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-teal-muted dark:text-slate-400 mb-1">Factus Client ID</label>
            <input
              type="text"
              value={form.factus_client_id}
              onChange={(e) => setForm({ ...form, factus_client_id: e.target.value })}
              placeholder="Ej: 99a88b77-66c5-44d3-..."
              className="w-full text-[12px] font-mono text-primary dark:text-dark-text bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-teal font-sans min-h-[40px]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-teal-muted dark:text-slate-400 mb-1">Factus Client Secret</label>
            <input
              type="password"
              value={form.factus_client_secret}
              onChange={(e) => setForm({ ...form, factus_client_secret: e.target.value })}
              placeholder="••••••••••••••••"
              className="w-full text-[12px] font-mono text-primary dark:text-dark-text bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-teal font-sans min-h-[40px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-teal-muted dark:text-slate-400 mb-1">Factus Usuario / Email</label>
              <input
                type="text"
                value={form.factus_username}
                onChange={(e) => setForm({ ...form, factus_username: e.target.value })}
                placeholder="facturacion@consultorio.com"
                className="w-full text-[12px] text-primary dark:text-dark-text bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-teal font-sans min-h-[40px]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-teal-muted dark:text-slate-400 mb-1">Factus Contraseña</label>
              <input
                type="password"
                value={form.factus_password}
                onChange={(e) => setForm({ ...form, factus_password: e.target.value })}
                placeholder="••••••••"
                className="w-full text-[12px] text-primary dark:text-dark-text bg-white dark:bg-dark-input border border-teal-border dark:border-dark-border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-teal font-sans min-h-[40px]"
              />
            </div>
          </div>
        </div>

      </div>

      {/* Botón Guardar */}
      <div className="pt-4 border-t border-teal-soft dark:border-dark-border flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center justify-center gap-2 px-5 py-2.5 text-[12px] text-white font-medium bg-primary dark:bg-teal dark:text-slate-900 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-75 touch-target cursor-pointer shadow-soft-sm"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Guardando...' : 'Guardar Facturación Electrónica'}
        </button>
      </div>

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-primary dark:bg-slate-800 text-white text-[12px] px-4 py-2.5 rounded-full whitespace-nowrap z-50 shadow-soft-lg flex items-center gap-2 border border-white/10 animate-toast">
          <Check size={14} className="text-teal" /> {toast}
        </div>
      )}
    </form>
  );
}

// ── Tab: Usuarios y Roles del Consultorio ────────────────────────────────────

function TabUsuarios() {
  const { usuario: usuarioActual } = useApp();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalCrearOpen, setModalCrearOpen] = useState(false);
  const [creando, setCreando] = useState(false);
  const [toast, setToast] = useState(null);

  const [form, setForm] = useState({
    email: '',
    password: '',
    nombre: '',
    registro: '',
    rol: 'ASISTENTE_ODONTOLOGO'
  });

  const cargarUsuarios = async () => {
    setLoading(true);
    try {
      const data = await api.getUsuarios();
      setUsuarios(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const mostrarToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleCrearUsuario = async (e) => {
    e.preventDefault();
    if (form.rol === 'SUPERADMIN') {
      alert('No está permitido asignar el rol de Superadministrador');
      return;
    }
    setCreando(true);
    try {
      await api.crearUsuarioConsultorio(form);
      setModalCrearOpen(false);
      setForm({ email: '', password: '', nombre: '', registro: '', rol: 'ASISTENTE_ODONTOLOGO' });
      mostrarToast('Usuario del consultorio creado exitosamente');
      await cargarUsuarios();
    } catch (err) {
      alert(err.error || 'Error al crear usuario');
    } finally {
      setCreando(false);
    }
  };

  const handleCambiarRol = async (id, nuevoRol) => {
    try {
      await api.cambiarRolUsuario(id, nuevoRol);
      mostrarToast('Rol de usuario actualizado');
      await cargarUsuarios();
    } catch (err) {
      alert(err.error || 'Error al cambiar rol');
    }
  };

  const handleToggleStatus = async (id, activoActual) => {
    try {
      await api.toggleStatusUsuario(id, !activoActual);
      mostrarToast(`Usuario ${activoActual ? 'desactivado' : 'activado'}`);
      await cargarUsuarios();
    } catch (err) {
      alert(err.error || 'Error al cambiar estado');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header tab */}
      <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl p-5 shadow-soft-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary dark:text-teal flex items-center justify-center flex-shrink-0">
            <Users size={20} />
          </div>
          <div>
            <h3 className="text-[13.5px] font-bold text-primary dark:text-dark-text">Equipo y Permisos del Consultorio</h3>
            <p className="text-[11px] text-teal-muted dark:text-slate-400 mt-0.5">
              Gestione los miembros de su personal, asigne roles y controle el acceso al sistema.
            </p>
          </div>
        </div>
        <button
          onClick={() => setModalCrearOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-[12px] text-white font-medium bg-primary dark:bg-teal dark:text-slate-900 rounded-xl hover:opacity-90 transition-opacity cursor-pointer shadow-soft-sm"
        >
          <Plus size={14} /> Nuevo Usuario
        </button>
      </div>

      {/* Tabla usuarios */}
      <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl overflow-hidden shadow-soft-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-teal-bg/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-teal-soft dark:border-dark-border uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Nombre</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Registro</th>
                <th className="px-5 py-3">Rol</th>
                <th className="px-5 py-3 text-center">Estado</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-teal-soft dark:divide-dark-border text-primary dark:text-dark-text">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-teal-muted">Cargando equipo...</td>
                </tr>
              ) : usuarios.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-teal-muted">Sin usuarios registrados.</td>
                </tr>
              ) : (
                usuarios.map(u => (
                  <tr key={u.id} className="hover:bg-teal-info/40 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                      {u.nombre}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">
                      {u.email}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-500">
                      {u.registro || '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <select
                        value={u.rol}
                        disabled={u.id === usuarioActual?.id}
                        onChange={e => handleCambiarRol(u.id, e.target.value)}
                        className="px-2 py-1 text-xs border border-teal-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-input font-medium focus:outline-none"
                      >
                        <option value="DUENO">Dueño / Administrador</option>
                        <option value="ASISTENTE_ODONTOLOGO">Asistente / Odontólogo</option>
                        <option value="RECEPCIONISTA">Recepcionista</option>
                      </select>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        u.activo !== false
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                      }`}>
                        {u.activo !== false ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        disabled={u.id === usuarioActual?.id}
                        onClick={() => handleToggleStatus(u.id, u.activo !== false)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors disabled:opacity-40 ${
                          u.activo !== false
                            ? 'bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                        }`}
                      >
                        {u.activo !== false ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear Usuario */}
      {modalCrearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/40 dark:bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-dark-card rounded-2xl max-w-md w-full p-6 shadow-soft-lg border border-teal-border dark:border-dark-border">
            <div className="flex items-center justify-between pb-4 border-b border-teal-soft dark:border-dark-border">
              <h3 className="text-base font-bold text-primary dark:text-dark-text">Agregar Miembro al Equipo</h3>
              <button onClick={() => setModalCrearOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCrearUsuario} className="py-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-dark-input outline-none"
                  placeholder="Ej: Dra. Andrea Castro"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-dark-input outline-none"
                  placeholder="andrea@consultorio.com"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Contraseña *</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-dark-input outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Registro / Cédula Profesional</label>
                <input
                  type="text"
                  value={form.registro}
                  onChange={e => setForm({ ...form, registro: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-dark-input outline-none"
                  placeholder="Reg. 98765"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Rol Asignado *</label>
                <select
                  value={form.rol}
                  onChange={e => setForm({ ...form, rol: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-dark-input outline-none font-medium"
                >
                  <option value="ASISTENTE_ODONTOLOGO">Asistente / Odontólogo</option>
                  <option value="RECEPCIONISTA">Recepcionista</option>
                  <option value="DUENO">Dueño / Administrador</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalCrearOpen(false)}
                  className="px-4 py-2 border rounded-xl hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creando}
                  className="px-4 py-2 bg-primary dark:bg-teal dark:text-slate-900 text-white rounded-xl font-medium"
                >
                  {creando ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-primary dark:bg-slate-800 text-white text-[12px] px-4 py-2.5 rounded-full whitespace-nowrap z-50 shadow-soft-lg flex items-center gap-2 border border-white/10 animate-toast">
          <Check size={14} className="text-teal" /> {toast}
        </div>
      )}
    </div>
  );
}

// ── Página Principal ──────────────────────────────────────────────────────────

const BASE_TABS = [
  { id: 'general',     label: 'Ajustes Generales',      icon: Settings    },
  { id: 'catalogo',    label: 'Catálogo CUPS',           icon: Stethoscope },
  { id: 'facturacion', label: 'Facturación Electrónica', icon: Receipt     },
  { id: 'usuarios',    label: 'Gestión de Usuarios',     icon: Users       },
];

export default function Configuracion() {
  const { usuario } = useApp();
  const [tabActivo, setTabActivo] = useState('general');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabs = BASE_TABS.filter(t => {
    if (t.id === 'usuarios' && usuario?.rol !== 'DUENO' && usuario?.rol !== 'SUPERADMIN') return false;
    return true;
  });

  return (
    <div className="flex min-h-screen bg-teal-bg dark:bg-dark-bg font-sans relative">
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar onToggleMobileMenu={() => setMobileMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-5 custom-scrollbar">

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[15px] font-semibold text-primary dark:text-dark-text flex items-center gap-1.5">
                <Settings size={18} className="text-teal" /> Ajustes del Consultorio
              </h2>
              <p className="text-[11px] text-teal dark:text-teal-light font-medium mt-0.5">
                Administra la configuración general, equipo de trabajo, catálogo CUPS y facturación electrónica.
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mb-5 bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-xl p-1 w-full sm:w-fit overflow-x-auto custom-scrollbar shadow-soft-sm">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = tabActivo === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTabActivo(tab.id)}
                  className={[
                    'flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[12.5px] font-semibold transition-all duration-150 cursor-pointer touch-target whitespace-nowrap',
                    isActive
                      ? 'bg-primary dark:bg-teal text-white dark:text-slate-900 shadow-soft-sm'
                      : 'text-teal-muted dark:text-slate-400 hover:text-primary dark:hover:text-dark-text hover:bg-teal-panel dark:hover:bg-slate-800/40',
                  ].join(' ')}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Contenido del tab activo */}
          {tabActivo === 'general'     && <TabAjustesGenerales />}
          {tabActivo === 'catalogo'    && <TabCatalogoCUPS />}
          {tabActivo === 'facturacion' && <TabFacturacionElectronica />}
          {tabActivo === 'usuarios'    && <TabUsuarios />}

        </main>
      </div>
    </div>
  );
}