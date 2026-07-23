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
      className="fixed inset-0 bg-primary/45 backdrop-blur-[2px] flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-teal-border flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-teal-soft flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Stethoscope size={15} className="text-primary" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-primary">
                {proc ? 'Editar procedimiento del consultorio' : 'Agregar procedimiento al consultorio'}
              </p>
              <p className="text-[10.5px] text-teal-muted mt-0.5">Catálogo CUPS Oficial & Repertorio Clínico</p>
            </div>
          </div>
          <button onClick={onClose} className="text-teal-muted hover:text-primary transition-colors cursor-pointer p-1">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">

          {/* BUSCADOR DE CATÁLOGO OFICIAL (Solo si es nuevo o cambiando selección) */}
          {!proc && (
            <div>
              <label className={labelCls}>
                <span className="flex items-center gap-1"><Search size={11} /> Buscar en Catálogo CUPS Oficial *</span>
              </label>
              <div className="relative mb-2">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-teal-muted" />
                <input
                  type="text"
                  value={busquedaOficial}
                  onChange={e => setBusquedaOficial(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-[12px] border border-teal-border rounded-lg bg-teal-bg focus:outline-none focus:ring-1 focus:ring-primary/40 focus:bg-white transition-colors"
                  placeholder="Buscar por código CUPS (ej: 890201) o nombre oficial..."
                />
              </div>

              {errs.oficial && <p className="text-[10.5px] text-status-red mb-2">⚠ {errs.oficial}</p>}

              {/* Lista de resultados del catálogo oficial */}
              <div className="border border-teal-border rounded-xl max-h-48 overflow-y-auto divide-y divide-teal-soft bg-white mb-4">
                {loadingOficial ? (
                  <div className="p-4 text-center text-[11px] text-teal-muted flex items-center justify-center gap-2">
                    <Loader2 size={13} className="animate-spin text-primary" /> Cargando catálogo oficial CUPS...
                  </div>
                ) : resultadosOficiales.length === 0 ? (
                  <div className="p-4 text-center text-[11px] text-teal-muted">
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
                          'p-3 cursor-pointer transition-colors flex items-start justify-between gap-2',
                          isSelected ? 'bg-primary/10 border-l-4 border-l-primary' : 'hover:bg-teal-bg/50',
                        ].join(' ')}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-[10.5px] font-mono text-teal-muted bg-teal-soft/80 px-1.5 py-0.5 rounded font-semibold">
                              CUPS {item.codigo}
                            </span>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${cc.bg} ${cc.text} ${cc.border}`}>
                              {item.categoria}
                            </span>
                            {item.frecuente && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                                ⭐ Frecuente
                              </span>
                            )}
                          </div>
                          <p className="text-[11.5px] font-medium text-primary leading-snug">{item.nombreOficial}</p>
                        </div>
                        {isSelected && <Check size={16} className="text-primary flex-shrink-0 mt-1" />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* DATOS OFICIALES (INFORMACIÓN SOLO LECTURA) */}
          {selectedOficial && (
            <div className="p-3.5 bg-teal-bg/60 border border-teal-border rounded-xl space-y-2">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.7px] text-teal-muted flex items-center gap-1">
                <FileText size={11} /> Información Oficial CUPS (Solo Lectura)
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1 text-[11.5px]">
                <div>
                  <span className="text-[10px] text-teal-muted block">Código CUPS</span>
                  <span className="font-mono font-medium text-primary">{selectedOficial.codigo}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-teal-muted block">Categoría Oficial</span>
                  <span className="font-medium text-primary">{selectedOficial.categoria}</span>
                </div>
                <div className="col-span-3 pt-1 border-t border-teal-border/40">
                  <span className="text-[10px] text-teal-muted block">Nombre Oficial</span>
                  <span className="font-medium text-primary leading-snug block">{selectedOficial.nombreOficial}</span>
                </div>
              </div>
            </div>
          )}

          {/* CONFIGURACIÓN PROPIA DEL CONSULTORIO (EDITABLE) */}
          {selectedOficial && (
            <div className="space-y-3 pt-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.7px] text-primary flex items-center gap-1 border-b border-teal-soft pb-1">
                <Pencil size={11} className="text-teal" /> Configuración en el Consultorio
              </p>

              {/* Nombre Visible */}
              <div>
                <label className={labelCls}>
                  <span className="flex items-center gap-1"><FileText size={10} /> Nombre visible en el consultorio *</span>
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={e => set('nombre', e.target.value)}
                  className={`${inputCls} ${errs.nombre ? 'border-status-red' : ''}`}
                  placeholder="Ej: Profilaxis dental"
                />
                {errs.nombre && <p className="text-[10.5px] text-status-red mt-1">⚠ {errs.nombre}</p>}
                <p className="text-[10px] text-teal-muted mt-1">Nombre corto con el que los profesionales identificarán el procedimiento.</p>
              </div>

              {/* Precio / Valor base */}
              <div>
                <label className={labelCls}>
                  <span className="flex items-center gap-1"><DollarSign size={10} /> Precio / Valor base (COP)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-muted text-[12px]">$</span>
                  <input
                    type="number"
                    min="0"
                    value={form.valorBase}
                    onChange={e => set('valorBase', e.target.value)}
                    className={`${inputCls} pl-7 ${errs.valorBase ? 'border-status-red' : ''}`}
                    placeholder="0"
                  />
                </div>
                {errs.valorBase && <p className="text-[10.5px] text-status-red mt-1">⚠ {errs.valorBase}</p>}
              </div>

              {/* Estado (Activo / Inactivo) */}
              <div className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-teal-border">
                <div>
                  <p className="text-[12px] font-medium text-primary">Estado del procedimiento</p>
                  <p className="text-[10.5px] text-teal-muted">Solo los activos aparecen en historias clínicas y citas</p>
                </div>
                <Toggle checked={form.activo} onChange={v => set('activo', v)} />
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-teal-soft">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[12px] text-teal-muted font-medium rounded-lg border border-teal-border bg-white hover:bg-teal-bg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !selectedOficial}
              className="flex items-center gap-1.5 px-4 py-2 text-[12px] text-white font-medium bg-primary rounded-lg hover:bg-primary-light transition-colors disabled:opacity-50 cursor-pointer"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
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
      className="fixed inset-0 bg-primary/45 backdrop-blur-[2px] flex items-center justify-center z-50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl border border-teal-border p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
            <Trash2 size={16} className="text-status-red" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-primary">Eliminar procedimiento</p>
            <p className="text-[11.5px] text-teal-muted mt-1 leading-relaxed">
              ¿Estás seguro de que deseas eliminar <strong className="text-primary">"{proc.nombre}"</strong>?
              Esta acción no se puede deshacer.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-[12px] text-teal-muted font-medium rounded-lg border border-teal-border bg-white hover:bg-teal-bg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(proc.id)}
            disabled={deleting}
            className="flex items-center gap-1.5 px-4 py-2 text-[12px] text-white font-medium bg-status-red rounded-lg hover:bg-red-600 transition-colors disabled:opacity-70 cursor-pointer"
          >
            {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
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
        await crearProcedimiento(data);
        showToast('Procedimiento creado correctamente');
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
      await eliminarProcedimiento(id);
      showToast('Procedimiento eliminado');
      setConfirmDelete(null);
    } catch {
      showToast('No se pudo eliminar el procedimiento');
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
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total procedimientos', value: stats.total, icon: Stethoscope, color: 'text-primary bg-primary/10' },
          { label: 'Activos',              value: stats.activos, icon: Check, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Categorías',           value: stats.categorias, icon: Tag, color: 'text-violet-600 bg-violet-50' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-teal-border rounded-xl p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${s.color}`}>
              <s.icon size={16} />
            </div>
            <div>
              <p className="text-[18px] font-semibold text-primary leading-none">{s.value}</p>
              <p className="text-[10.5px] text-teal-muted mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-teal-border rounded-xl p-4 flex flex-wrap items-center gap-3">

        {/* Búsqueda */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-teal-muted" />
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o código CUPS..."
            className="w-full pl-8 pr-3 py-2 text-[12px] border border-teal-border rounded-lg bg-teal-bg focus:outline-none focus:ring-1 focus:ring-primary/40 focus:bg-white transition-colors"
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-teal-muted hover:text-primary">
              <X size={12} />
            </button>
          )}
        </div>

        {/* Filtro categoría */}
        <div className="relative">
          <select
            value={filtroCategoria}
            onChange={e => setFiltroCategoria(e.target.value)}
            className="text-[12px] border border-teal-border rounded-lg px-3 py-2 bg-white appearance-none pr-7 text-primary focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
          >
            <option value="">Todas las categorías</option>
            {categoriasDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-teal-muted pointer-events-none" />
        </div>

        {/* Filtro estado */}
        <div className="flex rounded-lg border border-teal-border overflow-hidden text-[11.5px]">
          {[['todos','Todos'],['activos','Activos'],['inactivos','Inactivos']].map(([val, lab]) => (
            <button
              key={val}
              type="button"
              onClick={() => setFiltroEstado(val)}
              className={[
                'px-3 py-2 transition-colors cursor-pointer',
                filtroEstado === val ? 'bg-primary text-white font-medium' : 'bg-white text-teal-muted hover:bg-teal-bg',
              ].join(' ')}
            >
              {lab}
            </button>
          ))}
        </div>

        {/* Nuevo procedimiento */}
        <button
          type="button"
          onClick={() => setModal('crear')}
          className="flex items-center gap-1.5 px-4 py-2 text-[12px] text-white font-medium bg-primary rounded-lg hover:bg-primary-light transition-colors cursor-pointer ml-auto flex-shrink-0"
        >
          <Plus size={13} /> Nuevo procedimiento
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-teal-border rounded-xl overflow-hidden">

        {filtrados.length === 0 ? (
          <div className="py-16 text-center">
            <Stethoscope size={28} className="text-teal-border mx-auto mb-3" />
            <p className="text-[13px] font-medium text-primary mb-1">Sin procedimientos</p>
            <p className="text-[11.5px] text-teal-muted">
              {busqueda || filtroCategoria
                ? 'No hay procedimientos que coincidan con los filtros aplicados.'
                : 'Aún no has agregado procedimientos al catálogo.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-teal-bg border-b border-teal-border">
                <th className="px-4 py-3 text-[10.5px] font-semibold text-teal-muted uppercase tracking-[0.7px]">Nombre visible</th>
                <th className="px-4 py-3 text-[10.5px] font-semibold text-teal-muted uppercase tracking-[0.7px]">Código CUPS</th>
                <th className="px-4 py-3 text-[10.5px] font-semibold text-teal-muted uppercase tracking-[0.7px]">Nombre oficial</th>
                <th className="px-4 py-3 text-[10.5px] font-semibold text-teal-muted uppercase tracking-[0.7px]">Categoría</th>
                <th className="px-4 py-3 text-[10.5px] font-semibold text-teal-muted uppercase tracking-[0.7px] text-right">Precio</th>
                <th className="px-4 py-3 text-[10.5px] font-semibold text-teal-muted uppercase tracking-[0.7px] text-center">Estado</th>
                <th className="px-4 py-3 text-[10.5px] font-semibold text-teal-muted uppercase tracking-[0.7px] text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((proc, idx) => {
                const cc = catColor(proc.categoria);
                return (
                  <tr
                    key={proc.id}
                    className={[
                      'border-b border-teal-soft/60 transition-colors',
                      idx % 2 === 0 ? 'bg-white' : 'bg-teal-bg/30',
                      !proc.activo ? 'opacity-55' : '',
                      'hover:bg-primary/[0.03]',
                    ].join(' ')}
                  >
                    {/* Nombre visible */}
                    <td className="px-4 py-3">
                      <p className="text-[12.5px] font-medium text-primary leading-snug">{proc.nombre}</p>
                    </td>

                    {/* Código CUPS */}
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-mono text-teal-muted bg-teal-soft/60 px-1.5 py-0.5 rounded font-semibold">
                        {proc.codigo || '—'}
                      </span>
                    </td>

                    {/* Nombre oficial */}
                    <td className="px-4 py-3">
                      <p className="text-[11.5px] text-teal-muted leading-snug">{proc.nombreOficial || proc.nombre}</p>
                    </td>

                    {/* Categoría */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center text-[10.5px] font-medium px-2 py-0.5 rounded-full border ${cc.bg} ${cc.text} ${cc.border}`}>
                        {proc.categoria}
                      </span>
                    </td>

                    {/* Precio / Valor base */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-[12px] font-medium text-primary tabular-nums">{fmt(proc.valorBase)}</span>
                    </td>

                    {/* Estado toggle */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Toggle checked={proc.activo} onChange={() => handleToggleActivo(proc)} />
                        <span className={`text-[10.5px] font-medium ${proc.activo ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {proc.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          title="Editar"
                          onClick={() => setModal(proc)}
                          className="p-1.5 rounded-lg text-teal-muted hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          title="Eliminar"
                          onClick={() => setConfirmDelete(proc)}
                          className="p-1.5 rounded-lg text-teal-muted hover:text-status-red hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Footer contador */}
        {filtrados.length > 0 && (
          <div className="px-4 py-2.5 border-t border-teal-soft/60 bg-teal-bg/40 flex items-center justify-between">
            <p className="text-[10.5px] text-teal-muted">
              Mostrando <strong className="text-primary">{filtrados.length}</strong> de{' '}
              <strong className="text-primary">{procedimientosCatalog.length}</strong> procedimientos
            </p>
            <p className="text-[10px] text-teal-muted/60">
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
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-primary text-white text-[12px] px-4 py-2 rounded-full whitespace-nowrap z-[60] shadow-lg flex items-center gap-1.5 border border-white/10">
          <Check size={12} className="text-teal" /> {toast}
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
          <div className="bg-white border border-teal-border rounded-xl p-5 shadow-sm space-y-3.5">
            <h3 className="text-[13px] font-semibold text-primary border-b border-teal-soft pb-2 flex items-center gap-1.5">
              <Building2 size={14} className="text-teal" /> Datos del Consultorio
            </h3>

            <div>
              <label className={labelCls}>Nombre del Consultorio *</label>
              <input type="text" required value={form.nombre_consultorio}
                onChange={e => setForm({...form, nombre_consultorio: e.target.value})}
                className={inputCls} placeholder="Ej: Oralyn Dental" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>NIT / Identificación</label>
                <input type="text" value={form.nit}
                  onChange={e => setForm({...form, nit: e.target.value})}
                  className={inputCls} placeholder="NIT o Cédula Jurídica" />
              </div>
              <div>
                <label className={labelCls}>Ciudad</label>
                <input type="text" value={form.ciudad}
                  onChange={e => setForm({...form, ciudad: e.target.value})}
                  className={inputCls} placeholder="Villavicencio" />
              </div>
            </div>

            <div>
              <label className={labelCls}>Dirección Física</label>
              <div className="relative">
                <MapPin size={13} className="absolute left-2.5 top-[10.5px] text-teal-muted" />
                <input type="text" value={form.direccion}
                  onChange={e => setForm({...form, direccion: e.target.value})}
                  className={`${inputCls} pl-8`} placeholder="Calle 15 # 24-30" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Teléfono Contacto</label>
                <div className="relative">
                  <Phone size={13} className="absolute left-2.5 top-[10.5px] text-teal-muted" />
                  <input type="tel" value={form.telefono}
                    onChange={e => setForm({...form, telefono: e.target.value})}
                    className={`${inputCls} pl-8`} placeholder="+57 320 123 4567" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Correo Electrónico</label>
                <div className="relative">
                  <Mail size={13} className="absolute left-2.5 top-[10.5px] text-teal-muted" />
                  <input type="email" value={form.email}
                    onChange={e => setForm({...form, email: e.target.value})}
                    className={`${inputCls} pl-8`} placeholder="contacto@oralyn.com" />
                </div>
              </div>
            </div>
          </div>

          {/* Datos del Profesional */}
          <div className="bg-white border border-teal-border rounded-xl p-5 shadow-sm space-y-3.5 flex flex-col justify-between">
            <div className="space-y-3.5">
              <h3 className="text-[13px] font-semibold text-primary border-b border-teal-soft pb-2 flex items-center gap-1.5">
                <UserRound size={14} className="text-teal" /> Datos del Profesional Responsable
              </h3>

              <div>
                <label className={labelCls}>Nombre Completo del Profesional *</label>
                <input type="text" required value={form.nombre_profesional}
                  onChange={e => setForm({...form, nombre_profesional: e.target.value})}
                  className={inputCls} placeholder="Ej: Dra. Diana Murillo" />
              </div>

              <div>
                <label className={labelCls}>Registro / Cédula Profesional</label>
                <div className="relative">
                  <FileText size={13} className="absolute left-2.5 top-[10.5px] text-teal-muted" />
                  <input type="text" value={form.registro_profesional}
                    onChange={e => setForm({...form, registro_profesional: e.target.value})}
                    className={`${inputCls} pl-8`} placeholder="Ej: Reg. Odontología 12345" />
                </div>
                <p className="text-[9.5px] text-teal-muted mt-1 leading-snug">
                  Esta información se imprimirá en los consentimientos informados firmados y certificados de asistencia emitidos.
                </p>
              </div>
            </div>

            <div className="pt-5 border-t border-teal-soft/60 flex items-center justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-[12px] text-white font-medium bg-primary rounded-lg border-none cursor-pointer hover:bg-primary-light transition-colors disabled:opacity-75"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {saving ? 'Guardando...' : 'Guardar Configuración'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-primary text-white text-[12px] px-4 py-2 rounded-full whitespace-nowrap z-20 shadow-lg flex items-center gap-1.5 border border-white/10">
          <Check size={13} className="text-teal" /> {toast}
        </div>
      )}
    </>
  );
}

// ── Página Principal ──────────────────────────────────────────────────────────

const TABS = [
  { id: 'general',    label: 'Ajustes Generales',  icon: Settings    },
  { id: 'catalogo',   label: 'Catálogo CUPS',       icon: Stethoscope },
];

export default function Configuracion() {
  const { pacientes } = useApp();
  const [tabActivo, setTabActivo] = useState('general');

  return (
    <div className="flex min-h-screen bg-teal-bg font-sans relative">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar pacientes={pacientes} />

        <main className="flex-1 overflow-y-auto px-6 py-5">

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[15px] font-medium text-primary flex items-center gap-1.5">
                <Settings size={17} className="text-teal" /> Ajustes del Consultorio
              </h2>
              <p className="text-[11px] text-teal mt-0.5">
                Administra la configuración general y el catálogo de procedimientos CUPS de tu clínica.
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mb-5 bg-white border border-teal-border rounded-xl p-1 w-fit">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = tabActivo === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTabActivo(tab.id)}
                  className={[
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-[12.5px] font-medium transition-all duration-150 cursor-pointer',
                    isActive
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-teal-muted hover:text-primary hover:bg-teal-bg',
                  ].join(' ')}
                >
                  <Icon size={13} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Contenido del tab activo */}
          {tabActivo === 'general'  && <TabAjustesGenerales />}
          {tabActivo === 'catalogo' && <TabCatalogoCUPS />}

        </main>
      </div>
    </div>
  );
}