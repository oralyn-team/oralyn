import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  function handleChange(e) {
    if (errorMsg) setErrorMsg(null)
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!token) {
      setErrorMsg('Token de recuperación no válido o ausente.')
      return
    }

    if (form.password.length < 8) {
      setErrorMsg('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }

    if (form.password !== form.confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    setErrorMsg(null)

    try {
      await api.resetPassword(token, form.password)
      setSuccess(true)
    } catch (err) {
      setErrorMsg(err?.error || 'No se pudo restablecer la contraseña. Es posible que el enlace haya expirado o ya haya sido utilizado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-teal-bg font-sans">
      <div className="bg-white border border-teal-border rounded-2xl p-10 w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-7">
          <div className="w-9 h-9 bg-primary rounded-[10px] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="7" r="3.5" stroke="white" strokeWidth="1.5"/>
              <path d="M4 17c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p className="font-serif text-xl text-primary leading-none">Oralyn</p>
            <p className="text-[10px] tracking-widest text-teal-600 uppercase mt-0.5">Consultorio dental</p>
          </div>
        </div>

        <h1 className="text-[22px] font-medium text-gray-800 mb-1">Nueva contraseña</h1>
        <p className="text-[13px] text-gray-400 mb-6">
          Ingresa tu nueva contraseña para actualizar tu cuenta.
        </p>

        {!token ? (
          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">
              Enlace no válido. Por favor solicita un nuevo correo de recuperación.
            </div>
            <Link
              to="/forgot-password"
              className="block w-full text-center py-2.5 bg-primary text-white text-sm font-medium rounded-[10px] hover:bg-primary-light transition-colors"
            >
              Solicitar nuevo enlace
            </Link>
          </div>
        ) : success ? (
          <div className="space-y-4">
            <div className="p-4 bg-teal-50 border border-teal-200 rounded-[10px]">
              <div className="flex items-center gap-2 mb-2 text-teal-800 font-medium text-sm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                ¡Contraseña actualizada!
              </div>
              <p className="text-[12px] text-teal-700 leading-relaxed">
                Tu contraseña ha sido restablecida exitosamente. Todas tus sesiones activas han sido cerradas. Ahora puedes iniciar sesión con tu nueva contraseña.
              </p>
            </div>

            <Link
              to="/login"
              className="block w-full text-center py-2.5 bg-primary text-white text-sm font-medium rounded-[10px] hover:bg-primary-light transition-colors"
            >
              Iniciar sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-[11px] font-medium text-primary uppercase tracking-wide mb-1.5">
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength={8}
                  className="w-full px-3 py-2.5 pr-10 text-sm border border-teal-border rounded-[10px] bg-teal-bg focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-primary"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-[11px] font-medium text-primary uppercase tracking-wide mb-1.5">
                Confirmar nueva contraseña
              </label>
              <input
                type={showPass ? 'text' : 'password'}
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Repite la nueva contraseña"
                required
                className="w-full px-3 py-2.5 text-sm border border-teal-border rounded-[10px] bg-teal-bg focus:outline-none focus:border-primary"
              />
            </div>

            {errorMsg && (
              <p className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 bg-primary text-white text-sm font-medium rounded-[10px] hover:bg-primary-light transition-colors disabled:opacity-50"
            >
              {loading ? 'Restableciendo...' : 'Restablecer contraseña'}
            </button>

            <div className="mt-4 text-center">
              <Link to="/login" className="text-[12px] text-primary hover:underline">
                &larr; Volver al inicio de sesión
              </Link>
            </div>
          </form>
        )}

        <div className="flex items-center gap-2.5 mt-5">
          <div className="flex-1 h-px bg-teal-border" />
          <span className="text-[11px] text-gray-400">Sistema de gestión clínica</span>
          <div className="flex-1 h-px bg-teal-border" />
        </div>
      </div>
    </div>
  )
}
