// src/pages/Configuracion.jsx
import { useState, useEffect } from 'react';
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
  Loader2 
} from 'lucide-react';

export default function Configuracion() {
  const { pacientes } = useApp();

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [existeConfig, setExisteConfig] = useState(false); // Indicates if config exists or needs creation

  async function loadConfiguracion() {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getConfiguracion();
      if (data) {
        setForm({
          nombre_consultorio: data.nombre_consultorio || '',
          nombre_profesional: data.nombre_profesional || '',
          registro_profesional: data.registro_profesional || '',
          nit: data.nit || '',
          direccion: data.direccion || '',
          telefono: data.telefono || '',
          ciudad: data.ciudad || 'Villavicencio',
          email: data.email || ''
        });
        setExisteConfig(true);
      }
    } catch (err) {
      console.error('Error cargando configuración:', err);
      if (err.status === 404) {
        // Configuration does not exist yet, we will create it on submit
        setExisteConfig(false);
      } else {
        setError(err.error || 'No se pudo cargar la configuración del consultorio.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConfiguracion();
  }, []);

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
        // Update configuration
        await api.actualizarConfiguracion(form);
        mostrarToast('Configuración actualizada correctamente');
      } else {
        // Create configuration for the first time
        // POST endpoint
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
        setExisteConfig(true);
        mostrarToast('Configuración inicial guardada correctamente');
      }
    } catch (err) {
      console.error(err);
      mostrarToast(err.message || 'No se pudo guardar la configuración');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-teal-bg font-sans relative">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar pacientes={pacientes} />
        
        <main className="flex-1 overflow-y-auto px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[15px] font-medium text-primary flex items-center gap-1.5">
                <Settings size={17} className="text-teal" /> Ajustes del Consultorio
              </h2>
              <p className="text-[11px] text-teal mt-0.5">
                Administra los datos generales de tu clínica para recetas, consentimientos y cotizaciones.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="bg-white border border-teal-border rounded-xl p-8 text-center">
              <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
              <p className="text-[12px] text-teal-muted">Cargando configuración...</p>
            </div>
          ) : error ? (
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
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Clinic Information Card */}
                <div className="bg-white border border-teal-border rounded-xl p-5 shadow-sm space-y-3.5">
                  <h3 className="text-[13px] font-semibold text-primary border-b border-teal-soft pb-2 flex items-center gap-1.5">
                    <Building2 size={14} className="text-teal" /> Datos del Consultorio
                  </h3>
                  
                  <div>
                    <label className="block text-[11px] font-medium text-teal-muted mb-1">Nombre del Consultorio *</label>
                    <div className="relative">
                      <input 
                        type="text"
                        required
                        value={form.nombre_consultorio}
                        onChange={(e) => setForm({...form, nombre_consultorio: e.target.value})}
                        className="w-full text-[12px] text-primary bg-white border border-teal-border rounded-lg pl-3 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40 font-sans"
                        placeholder="Ej: Oralyn Dental"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-teal-muted mb-1">NIT / Identificación</label>
                      <input 
                        type="text"
                        value={form.nit}
                        onChange={(e) => setForm({...form, nit: e.target.value})}
                        className="w-full text-[12px] text-primary bg-white border border-teal-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40 font-sans"
                        placeholder="NIT o Cédula Jurídica"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-teal-muted mb-1">Ciudad</label>
                      <input 
                        type="text"
                        value={form.ciudad}
                        onChange={(e) => setForm({...form, ciudad: e.target.value})}
                        className="w-full text-[12px] text-primary bg-white border border-teal-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40 font-sans"
                        placeholder="Villavicencio"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-teal-muted mb-1">Dirección Física</label>
                    <div className="relative">
                      <MapPin size={13} className="absolute left-2.5 top-[10.5px] text-teal-muted" />
                      <input 
                        type="text"
                        value={form.direccion}
                        onChange={(e) => setForm({...form, direccion: e.target.value})}
                        className="w-full text-[12px] text-primary bg-white border border-teal-border rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40 font-sans"
                        placeholder="Calle 15 # 24-30"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-teal-muted mb-1">Teléfono Contacto</label>
                      <div className="relative">
                        <Phone size={13} className="absolute left-2.5 top-[10.5px] text-teal-muted" />
                        <input 
                          type="tel"
                          value={form.telefono}
                          onChange={(e) => setForm({...form, telefono: e.target.value})}
                          className="w-full text-[12px] text-primary bg-white border border-teal-border rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40 font-sans"
                          placeholder="+57 320 123 4567"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-teal-muted mb-1">Correo Electrónico</label>
                      <div className="relative">
                        <Mail size={13} className="absolute left-2.5 top-[10.5px] text-teal-muted" />
                        <input 
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm({...form, email: e.target.value})}
                          className="w-full text-[12px] text-primary bg-white border border-teal-border rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40 font-sans"
                          placeholder="contacto@oralyn.com"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Professional Information Card */}
                <div className="bg-white border border-teal-border rounded-xl p-5 shadow-sm space-y-3.5 flex flex-col justify-between">
                  <div className="space-y-3.5">
                    <h3 className="text-[13px] font-semibold text-primary border-b border-teal-soft pb-2 flex items-center gap-1.5">
                      <UserRound size={14} className="text-teal" /> Datos del Profesional Responsable
                    </h3>

                    <div>
                      <label className="block text-[11px] font-medium text-teal-muted mb-1">Nombre Completo del Profesional *</label>
                      <input 
                        type="text"
                        required
                        value={form.nombre_profesional}
                        onChange={(e) => setForm({...form, nombre_profesional: e.target.value})}
                        className="w-full text-[12px] text-primary bg-white border border-teal-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40 font-sans"
                        placeholder="Ej: Dra. Diana Murillo"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-teal-muted mb-1">Registro / Cédula Profesional</label>
                      <div className="relative">
                        <FileText size={13} className="absolute left-2.5 top-[10.5px] text-teal-muted" />
                        <input 
                          type="text"
                          value={form.registro_profesional}
                          onChange={(e) => setForm({...form, registro_profesional: e.target.value})}
                          className="w-full text-[12px] text-primary bg-white border border-teal-border rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40 font-sans"
                          placeholder="Ej: Reg. Odontología 12345"
                        />
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
                      {saving ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Save size={13} />
                      )}
                      {saving ? 'Guardando...' : 'Guardar Configuración'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}
        </main>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-primary text-white text-[12px] px-4 py-2 rounded-full whitespace-nowrap z-20 shadow-lg flex items-center gap-1.5 border border-white/10">
          <Check size={13} className="text-teal" /> {toast}
        </div>
      )}
    </div>
  );
}
