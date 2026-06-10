// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/Appcontext'
import Login from './pages/login'
import Pacientes from './pages/Pacientes'
import Historias from './pages/Historias'
import Citas from './pages/Citas'
import Consentimientos from './pages/Consentimientos'

import './index.css'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/login" />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/pacientes" element={<PrivateRoute><Pacientes /></PrivateRoute>} />
          <Route path="/historias" element={<PrivateRoute><Historias /></PrivateRoute>} />
          <Route path="/citas" element={<PrivateRoute><Citas /></PrivateRoute>} />
          <Route path="/consentimientos" element={<PrivateRoute><Consentimientos /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  </StrictMode>
)
