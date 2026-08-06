// src/components/PacienteList.jsx
import PacienteCard from './PacienteCard';

export default function PacienteList({ pacientes, onEliminar, onEditar }) {
  if (pacientes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-teal dark:text-teal-light text-[13px]">
        <span className="text-[36px] mb-2">🦷</span>
        <p className="font-semibold text-primary dark:text-dark-text">No se encontraron pacientes</p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 divide-teal-soft dark:divide-dark-border">
      {pacientes.map((paciente, index) => (
        <li 
          key={paciente.id} 
          className={[
            'transition-colors',
            index % 2 === 0 ? 'md:border-r md:border-teal-soft md:dark:border-dark-border' : ''
          ].join(' ')}
        >
          <PacienteCard paciente={paciente} onEliminar={onEliminar} onEditar={onEditar} />
        </li>
      ))}
    </ul>
  );
}