// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/Appcontext'
import { PrivateRoute, SuperadminRoute, PublicRoute, DefaultRedirect } from './router/Guards'
import Login from './pages/login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Pacientes from './pages/Pacientes'
import Historias from './pages/Historias'
import Insumos from './pages/Insumos'
import Citas from './pages/Citas'
import Consentimientos from './pages/Consentimientos'
import Configuracion from './pages/Configuracion'
import Rips from './pages/Rips'
import Facturacion from './pages/Facturacion'
import Auditoria from './pages/Auditoria'
import Superadmin from './pages/Superadmin'

import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
          <Route path="/" element={<PrivateRoute><DefaultRedirect /></PrivateRoute>} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/pacientes" element={<PrivateRoute><Pacientes /></PrivateRoute>} />
          <Route path="/historias" element={<PrivateRoute><Historias /></PrivateRoute>} />
          <Route path="/insumos" element={<PrivateRoute><Insumos /></PrivateRoute>} />
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
