// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/Appcontext'
import Login from './pages/login'
import Dashboard from './pages/Dashboard'
import Pacientes from './pages/Pacientes'
import Historias from './pages/Historias'
import Citas from './pages/Citas'
import Consentimientos from './pages/Consentimientos'
import Configuracion from './pages/Configuracion'

import './index.css'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/login" />
}

// Si ya hay sesión activa, redirigir al dashboard en lugar de mostrar el login
function PublicRoute({ children }) {
  const token = localStorage.getItem('token')
  return token ? <Navigate to="/dashboard" replace /> : children
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/" element={<PrivateRoute><Navigate to="/dashboard" replace /></PrivateRoute>} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/pacientes" element={<PrivateRoute><Pacientes /></PrivateRoute>} />
          <Route path="/historias" element={<PrivateRoute><Historias /></PrivateRoute>} />
          <Route path="/citas" element={<PrivateRoute><Citas /></PrivateRoute>} />
          <Route path="/consentimientos" element={<PrivateRoute><Consentimientos /></PrivateRoute>} />
          <Route path="/configuracion" element={<PrivateRoute><Configuracion /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  </StrictMode>
)
