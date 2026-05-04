// src/components/PacienteCard.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTagEstado } from '../data/pacientesData';
import { Search, FileText, IdCard, Phone, Trash2 } from 'lucide-react';

function getInitiales(p) {
  const n = p.nombres?.trim().charAt(0) || '';
  const a = p.primer_apellido?.trim().charAt(0) || '';
  return (n + a).toUpperCase() || '?';
}

const COLORES = [
  { bg: 'bg-[#E1F5EE]', text: 'text-[#0F6E56]' },
  { bg: 'bg-[#E6F1FB]', text: 'text-[#185FA5]' },
  { bg: 'bg-[#FAEEDA]', text: 'text-[#854F0B]' },
  { bg: 'bg-[#FBEAF0]', text: 'text-[#993556]' },
  { bg: 'bg-[#EEEDFE]', text: 'text-[#3C3489]' },
  { bg: 'bg-[#EAF3DE]', text: 'text-[#3B6D11]' },
];

function getColor(id) { return COLORES[id % COLORES.length]; }

export default function PacienteCard({ paciente, onEliminar }) {
  const { id, nombres, primer_apellido, segundo_apellido, numero_documento, telefono, ultimaVisita, estado } = paciente;
  const nombreCompleto = `${nombres} ${primer_apellido}${segundo_apellido ? ' ' + segundo_apellido : ''}`;
  const av  = getColor(id);
  const tag = getTagEstado(estado);
  const navigate = useNavigate();
  const [confirmar, setConfirmar] = useState(false);

  return (
    <>
      <article className="flex items-start gap-3 p-4 border-b border-teal-soft transition-colors duration-150 hover:bg-teal-panel">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-medium flex-shrink-0 ${av.bg} ${av.text}`}>
          {getInitiales(paciente)}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-primary truncate">{nombreCompleto}</p>
          <div className="flex flex-wrap gap-2 mt-0.5">
            <span className="text-[11px] text-teal-muted"> <IdCard size={12} className="inline-block mr-1"/> {numero_documento}</span>
            {telefono && <span className="text-[11px] text-teal-muted"> <Phone size={12} className="inline-block mr-1" /> {telefono}</span>}
          </div>

          <div className="flex items-center justify-between mt-2.5">
            <span>
              {ultimaVisita && <>
                <span className="text-[10px] text-teal-light">Última visita </span>
                <span className="text-[11px] font-medium text-primary">{ultimaVisita}</span>
              </>}
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${tag}`}>{estado}</span>
              <button type="button" onClick={() => navigate(`/historias?pacienteId=${id}`)}
                className="text-[11px] text-primary border border-teal-border rounded-md px-2.5 py-[3px] bg-transparent hover:bg-teal-soft transition-colors font-sans cursor-pointer">
                <FileText className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setConfirmar(true)}
                className="text-[11px] text-status-red border border-status-redBg rounded-md px-2.5 py-[3px] bg-status-redBg hover:bg-red-100 transition-colors font-sans cursor-pointer">
                <Trash2 className="w-4 h-4" />  
              </button>
            </div>
          </div>
        </div>
      </article>

      {confirmar && (
        <div className="fixed inset-0 bg-primary/40 flex items-center justify-center z-20"
          onClick={(e) => e.target === e.currentTarget && setConfirmar(false)}>
          <div className="bg-white rounded-2xl w-[320px] border border-teal-border overflow-hidden shadow-lg">
            <div className="px-5 py-4 border-b border-teal-soft flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-status-redBg flex items-center justify-center flex-shrink-0 text-[18px]"><Trash2 className="w-5 h-5" /></div>
              <div>
                <p className="text-[13px] font-medium text-primary">¿Eliminar paciente?</p>
                <p className="text-[11px] text-teal-muted mt-0.5">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <div className="px-5 py-4">
              <p className="text-[12px] text-teal-muted mb-1">Vas a eliminar a:</p>
              <p className="text-[14px] font-medium text-primary">{nombreCompleto}</p>
              <p className="text-[12px] text-teal-muted mt-0.5">Doc: {numero_documento}</p>
            </div>
            <div className="flex gap-2 px-5 py-3 border-t border-teal-soft justify-end">
              <button type="button" onClick={() => setConfirmar(false)}
                className="px-3.5 py-[7px] text-[12px] text-primary font-sans bg-white border border-teal-border rounded-lg cursor-pointer hover:bg-teal-info transition-colors">
                Cancelar
              </button>
              <button type="button" onClick={() => { onEliminar(id); setConfirmar(false); }}
                className="px-3.5 py-[7px] text-[12px] text-white font-medium font-sans bg-status-red rounded-lg border-none cursor-pointer hover:opacity-90 transition-opacity">
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}