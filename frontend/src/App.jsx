// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import Pacientes from './pages/Pacientes';
import Citas     from './pages/Citas';
import Historias from './pages/Historias';
import Consentimientos from './pages/Consentimientos';

export default function App() {
  return (
    <Routes>
      <Route path="/"           element={<Navigate to="/pacientes" replace />} />
      <Route path="/pacientes"  element={<Pacientes />} />
      <Route path="/citas"      element={<Citas />} />
      <Route path="/historias"  element={<Historias />} />
      <Route path="/consentimientos" element={<Consentimientos />} />
    </Routes>
  );
}
