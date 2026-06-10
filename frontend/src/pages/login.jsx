import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useApp } from '../context/Appcontext'

export default function Login() {
  const navigate = useNavigate()
  const { guardarToken } = useApp()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
  e.preventDefault()
  setLoading(true)
  setError(false)
  try {
    const { token } = await api.login(form.email, form.password)
    guardarToken(token)      
    navigate('/pacientes')
  } catch {
    setError(true)
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

        <h1 className="text-[22px] font-medium text-gray-800 mb-1">Bienvenido de nuevo</h1>
        <p className="text-[13px] text-gray-400 mb-6">Ingresa tus credenciales para acceder al sistema</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-[11px] font-medium text-primary uppercase tracking-wide mb-1.5">
              Correo electrónico
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="usuario@oralyn.com"
              required
              className="w-full px-3 py-2.5 text-sm border border-teal-border rounded-[10px] bg-teal-bg focus:outline-none focus:border-primary"
            />
          </div>

          <div className="mb-2">
            <label className="block text-[11px] font-medium text-primary uppercase tracking-wide mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
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

          {error && (
            <p className="text-[12px] text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">
              Correo o contraseña incorrectos
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 bg-primary text-white text-sm font-medium rounded-[10px] hover:bg-primary-light transition-colors disabled:opacity-50"
          >
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="flex items-center gap-2.5 mt-5">
          <div className="flex-1 h-px bg-teal-border" />
          <span className="text-[11px] text-gray-400">Sistema de gestión clínica</span>
          <div className="flex-1 h-px bg-teal-border" />
        </div>
      </div>
    </div>
  )
}