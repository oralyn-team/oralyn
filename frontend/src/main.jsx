// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/Appcontext'
import Login from './pages/login'
import Dashboard from './pages/Dashboard'
import Pacientes from './pages/Pacientes'
import Historias from './pages/Historias'
import Citas from './pages/Citas'
import Consentimientos from './pages/Consentimientos'
import Configuracion from './pages/Configuracion'
import Rips from './pages/Rips'
import Facturacion from './pages/Facturacion'
import Auditoria from './pages/Auditoria'
import Superadmin from './pages/Superadmin'

import './index.css'

function PrivateRoute({ children }) {
  const { token } = useApp()
  return token ? children : <Navigate to="/login" replace />
}

function SuperadminRoute({ children }) {
  const { token, usuario } = useApp()
  if (!token) return <Navigate to="/login" replace />
  if (usuario?.rol !== 'SUPERADMIN') return <Navigate to="/dashboard" replace />
  return children
}

// Si ya hay sesión activa, redirigir según el rol del usuario
function PublicRoute({ children }) {
  const { token, usuario } = useApp()
  if (token) {
    if (usuario?.rol === 'SUPERADMIN') {
      return <Navigate to="/superadmin" replace />
    }
    return <Navigate to="/dashboard" replace />
  }
  return children
}

function DefaultRedirect() {
  const { usuario } = useApp()
  if (usuario?.rol === 'SUPERADMIN') {
    return <Navigate to="/superadmin" replace />
  }
  return <Navigate to="/dashboard" replace />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/" element={<PrivateRoute><DefaultRedirect /></PrivateRoute>} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/pacientes" element={<PrivateRoute><Pacientes /></PrivateRoute>} />
          <Route path="/historias" element={<PrivateRoute><Historias /></PrivateRoute>} />
          <Route path="/citas" element={<PrivateRoute><Citas /></PrivateRoute>} />
          <Route path="/consentimientos" element={<PrivateRoute><Consentimientos /></PrivateRoute>} />
          <Route path="/rips" element={<PrivateRoute><Rips /></PrivateRoute>} />
          <Route path="/facturacion" element={<PrivateRoute><Facturacion /></PrivateRoute>} />
          <Route path="/configuracion" element={<PrivateRoute><Configuracion /></PrivateRoute>} />
          <Route path="/auditoria" element={<PrivateRoute><Auditoria /></PrivateRoute>} />
          <Route path="/superadmin" element={<SuperadminRoute><Superadmin /></SuperadminRoute>} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  </StrictMode>
)
