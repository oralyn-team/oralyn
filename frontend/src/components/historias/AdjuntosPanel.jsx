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
export default function AdjuntosPanel({
  adjuntos = [],
  editable = false,
  onChange,
  onAgregarArchivos,
  onEliminarAdjunto,
}) {
  const [dragging, setDragging] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState(null);

  async function procesarArchivos(archivos) {
    const files = Array.from(archivos || []);
    if (!files.length) return;

    setProcesando(true);
    setError(null);
    try {
      if (onAgregarArchivos) {
        await onAgregarArchivos(files);
      } else {
        onChange?.(adjuntos);
      }
    } catch (err) {
      console.error('Error adjuntando archivos:', err)
      const msg =
        err.status === 413
          ? 'El archivo es demasiado grande (máx. 20 MB).'
          : err.error || 'No se pudieron adjuntar los archivos.';
      setError(msg);
    } finally {
      setProcesando(false);
    }
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

  async function eliminarAdjunto(id) {
    setProcesando(true);
    setError(null);
    try {
      if (onEliminarAdjunto) {
        await onEliminarAdjunto(id);
      } else {
        onChange?.(adjuntos.filter((a) => a.id !== id));
      }
    } catch (err) {
      console.error('Error eliminando adjunto:', err);
      setError(err.error || 'No se pudo eliminar el adjunto.');
    } finally {
      setProcesando(false);
    }
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
          <label className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-white font-medium font-sans bg-primary rounded-lg transition-colors ${procesando ? 'opacity-60 cursor-wait' : 'cursor-pointer hover:bg-primary-light'}`}>
            <Upload size={12} />
            {procesando ? 'Procesando...' : 'Adjuntar'}
            <input type="file" accept="image/*,.pdf" multiple onChange={handleInputChange} className="hidden" disabled={procesando} />
          </label>
        )}
      </div>

      {error && (
        <div className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-status-red">
          {error}
        </div>
      )}

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
          {adjuntos.map((adj) => {
            const hasViewableContent = adj.url || adj.contenido_base64;

            const handleVer = () => {
              if (adj.url) {
                window.open(adj.url, '_blank', 'noopener,noreferrer');
                return;
              }

              if (adj.contenido_base64) {
                try {
                  const byteCharacters = atob(adj.contenido_base64);
                  const byteNumbers = new Array(byteCharacters.length);
                  for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                  }
                  const byteArray = new Uint8Array(byteNumbers);
                  const blob = new Blob([byteArray], { type: adj.mimeType || 'application/octet-stream' });
                  const blobUrl = URL.createObjectURL(blob);
                  window.open(blobUrl, '_blank');
                } catch (e) {
                  console.error('Error al decodificar el archivo base64:', e);
                  alert('No se pudo abrir el archivo adjunto.');
                }
              }
            };

            return (
              <li key={adj.id} className="flex items-center gap-3 py-2.5 group">
                <IconoTipo tipo={adj.tipo} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-primary truncate">{adj.nombre}</p>
                  <p className="text-[10px] text-teal-muted">{adj.tipo === 'imagen' ? 'Imagen' : 'PDF'} · {adj.fecha}</p>
                </div>
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button type="button"
                    onClick={handleVer}
                    disabled={!hasViewableContent}
                    className="text-[11px] text-primary border border-teal-border rounded-lg px-2.5 py-1 bg-white hover:bg-teal-soft transition-colors cursor-pointer font-sans disabled:opacity-50 disabled:cursor-not-allowed">
                    Ver
                  </button>
                  {editable && (
                    <button type="button" onClick={() => eliminarAdjunto(adj.id)} disabled={procesando}
                      className="p-1.5 rounded-lg bg-status-redBg text-status-red border border-status-redBg hover:bg-red-100 transition-colors cursor-pointer">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
