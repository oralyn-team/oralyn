// src/components/PacienteList.jsx
import PacienteCard from './PacienteCard';

export default function PacienteList({ pacientes, onEliminar }) {
  if (pacientes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-teal text-[13px]">
        <span className="text-[32px] mb-2">🦷</span>
        <p>No se encontraron pacientes</p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2">
      {pacientes.map((paciente, index) => (
        <li key={paciente.id} className={index % 2 === 0 ? 'border-r border-teal-soft' : ''}>
          <PacienteCard paciente={paciente} onEliminar={onEliminar} />
        </li>
      ))}
    </ul>
  );
}