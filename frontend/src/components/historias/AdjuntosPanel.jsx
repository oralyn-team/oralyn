// src/components/historias/AdjuntosPanel.jsx
import { useState } from 'react';
import { Paperclip, FileImage, FileText, Trash2, Upload } from 'lucide-react';

function IconoTipo({ tipo }) {
  return tipo === 'imagen'
    ? <FileImage size={16} className="text-status-blue flex-shrink-0" />
    : <FileText  size={16} className="text-status-red flex-shrink-0" />;
}

/**
 * @param {Array}    props.adjuntos   - Lista de adjuntos actuales
 * @param {boolean}  props.editable
 * @param {function} props.onChange   - Callback con la lista actualizada
 */
export default function AdjuntosPanel({ adjuntos = [], editable = false, onChange }) {
  const [dragging, setDragging] = useState(false);

  function getFechaHoy() {
    const h = new Date();
    return `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,'0')}-${String(h.getDate()).padStart(2,'0')}`;
  }

  function procesarArchivos(archivos) {
    const nuevos = Array.from(archivos).map((file) => ({
      id:     Date.now() + Math.random(),
      nombre: file.name,
      tipo:   file.type.startsWith('image/') ? 'imagen' : 'pdf',
      fecha:  getFechaHoy(),
    }));
    onChange([...adjuntos, ...nuevos]);
  }

  function handleInputChange(e) {
    procesarArchivos(e.target.files);
    e.target.value = '';
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    procesarArchivos(e.dataTransfer.files);
  }

  function eliminarAdjunto(id) {
    onChange(adjuntos.filter((a) => a.id !== id));
  }

  return (
    <div className="bg-white border border-teal-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-teal-soft flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip size={14} className="text-teal" />
          <h3 className="text-[13px] font-medium text-primary">Archivos adjuntos</h3>
          <span className="text-[11px] text-teal-muted bg-teal-soft px-2 py-0.5 rounded-full">
            {adjuntos.length}
          </span>
        </div>

        {editable && (
          <label className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-white font-medium font-sans bg-primary rounded-lg cursor-pointer hover:bg-primary-light transition-colors">
            <Upload size={12} />
            Adjuntar
            <input type="file" accept="image/*,.pdf" multiple onChange={handleInputChange} className="hidden" />
          </label>
        )}
      </div>

      {/* Zona de drop */}
      {editable && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={[
            'mx-4 my-3 border-2 border-dashed rounded-xl p-4 text-center transition-colors',
            dragging ? 'border-teal bg-teal-soft' : 'border-teal-border bg-teal-panel',
          ].join(' ')}
        >
          <Upload size={18} className="text-teal mx-auto mb-1" />
          <p className="text-[12px] text-teal-muted">
            Arrastra imágenes o PDFs aquí, o usa el botón <span className="font-medium text-primary">Adjuntar</span>
          </p>
          <p className="text-[10px] text-teal-light mt-0.5">Formatos: JPG, PNG, PDF</p>
        </div>
      )}

      {/* Lista de adjuntos */}
      {adjuntos.length === 0 ? (
        <div className="px-4 py-6 text-center text-[12px] text-teal-muted">
          Sin archivos adjuntos
        </div>
      ) : (
        <ul className="divide-y divide-teal-soft px-4 pb-2">
          {adjuntos.map((adj) => (
            <li key={adj.id} className="flex items-center gap-3 py-2.5 group">
              <IconoTipo tipo={adj.tipo} />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-primary truncate">{adj.nombre}</p>
                <p className="text-[10px] text-teal-muted">{adj.tipo === 'imagen' ? 'Imagen' : 'PDF'} · {adj.fecha}</p>
              </div>
              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Simulado: en producción esto descargaría el archivo real */}
                <button type="button"
                  onClick={() => console.log('Descargar:', adj.nombre)}
                  className="text-[11px] text-primary border border-teal-border rounded-lg px-2.5 py-1 bg-white hover:bg-teal-soft transition-colors cursor-pointer font-sans">
                  Ver
                </button>
                {editable && (
                  <button type="button" onClick={() => eliminarAdjunto(adj.id)}
                    className="p-1.5 rounded-lg bg-status-redBg text-status-red border border-status-redBg hover:bg-red-100 transition-colors cursor-pointer">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}