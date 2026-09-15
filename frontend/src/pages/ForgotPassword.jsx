import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    try {
      await api.forgotPassword(email)
      setSubmitted(true)
    } catch (err) {
      if (err?.status === 429) {
        setErrorMsg('Demasiados intentos. Por favor espera unos minutos antes de reintentar.')
      } else {
        setErrorMsg(err?.error || 'Ocurrió un error al procesar la solicitud.')
      }
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

        <h1 className="text-[22px] font-medium text-gray-800 mb-1">Recuperar contraseña</h1>
        <p className="text-[13px] text-gray-400 mb-6">
          Ingresa tu correo electrónico registrado para enviarte un enlace de recuperación.
        </p>

        {submitted ? (
          <div className="space-y-4">
            <div className="p-4 bg-teal-50 border border-teal-200 rounded-[10px]">
              <div className="flex items-center gap-2 mb-2 text-teal-800 font-medium text-sm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                Solicitud recibida
              </div>
              <p className="text-[12px] text-teal-700 leading-relaxed">
                Si la cuenta existe en nuestro sistema, hemos enviado un correo con instrucciones para restablecer tu contraseña. Por favor revisa tu bandeja de entrada o carpeta de spam.
              </p>
            </div>

            <Link
              to="/login"
              className="block w-full text-center py-2.5 bg-primary text-white text-sm font-medium rounded-[10px] hover:bg-primary-light transition-colors"
            >
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-[11px] font-medium text-primary uppercase tracking-wide mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => {
                  if (errorMsg) setErrorMsg(null)
                  setEmail(e.target.value)
                }}
                placeholder="usuario@oralyn.com"
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
              {loading ? 'Enviando enlace...' : 'Enviar enlace de recuperación'}
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
