import { Navigate } from 'react-router-dom';
import { useApp } from '../context/useApp';

export function PrivateRoute({ children }) {
  const { token } = useApp()
  return token ? children : <Navigate to="/login" replace />
}

export function SuperadminRoute({ children }) {
  const { token, usuario } = useApp()
  if (!token) return <Navigate to="/login" replace />
  if (usuario?.rol !== 'SUPERADMIN') return <Navigate to="/dashboard" replace />
  return children
}

// Si ya hay sesión activa, redirigir según el rol del usuario
export function PublicRoute({ children }) {
  const { token, usuario } = useApp()
  if (token) {
    if (usuario?.rol === 'SUPERADMIN') {
      return <Navigate to="/superadmin" replace />
    }
    return <Navigate to="/dashboard" replace />
  }
  return children
}

export function DefaultRedirect() {
  const { usuario } = useApp()
  if (usuario?.rol === 'SUPERADMIN') {
    return <Navigate to="/superadmin" replace />
  }
  return <Navigate to="/dashboard" replace />
}
