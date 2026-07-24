// src/components/historias/OdontogramaModal.jsx
import { useState, useCallback, useEffect, useRef } from 'react';
import { X, Save, RotateCcw, Info, Link2 } from 'lucide-react';

// ── Constantes ────────────────────────────────────────────────────────────
const ESTADOS = {
  sano:         { label: 'Sano',          color: '#3ECFCF', bg: '#E1F5EE', text: '#0F6E56',  dot: '#3ECFCF' },
  caries:       { label: 'Caries',        color: '#EF9F27', bg: '#FAEEDA', text: '#854F0B',  dot: '#EF9F27' },
  restauracion: { label: 'Restauración',  color: '#3B6D11', bg: '#EAF3DE', text: '#3B6D11',  dot: '#5DC2A4' },
  ausente:      { label: 'Ausente',       color: '#A32D2D', bg: '#FDECEA', text: '#A32D2D',  dot: '#A32D2D' },
  endodoncia:   { label: 'Endodoncia',    color: '#993556', bg: '#FBEAF0', text: '#993556',  dot: '#993556' },
  corona:       { label: 'Corona',        color: '#185FA5', bg: '#E6F1FB', text: '#185FA5',  dot: '#85B7EB' },
  implante:     { label: 'Implante',      color: '#3C3489', bg: '#EEEDFE', text: '#3C3489',  dot: '#3C3489' },
};

// Permanentes FDI
const SUP_DER = [18, 17, 16, 15, 14, 13, 12, 11];
const SUP_IZQ = [21, 22, 23, 24, 25, 26, 27, 28];
const INF_DER = [48, 47, 46, 45, 44, 43, 42, 41];
const INF_IZQ = [31, 32, 33, 34, 35, 36, 37, 38];

// Temporales FDI
const TEMP_SUP_DER = [55, 54, 53, 52, 51];
const TEMP_SUP_IZQ = [61, 62, 63, 64, 65];
const TEMP_INF_DER = [85, 84, 83, 82, 81];
const TEMP_INF_IZQ = [71, 72, 73, 74, 75];

const TIPOS_ODONTOGRAMA = [
  { value: 'general-adulto', label: 'General Adulto' },
  { value: 'general-infantil', label: 'General Infantil' },
  { value: 'ortodoncia', label: 'Ortodoncia' },
];

// Aparatología seleccionable por diente (multi-selección, no excluyente)
export const APARATOLOGIA = [
  { key: 'bracket',      label: 'Bracket' },
  { key: 'banda',        label: 'Banda' },
  { key: 'tubo',         label: 'Tubo' },
  { key: 'boton',        label: 'Botón' },
  { key: 'miniImplante', label: 'Mini implante' },
  { key: 'ligadura',     label: 'Ligadura' },
  { key: 'retenedor',    label: 'Retenedor' },
];
export const APARATOLOGIA_LABELS = Object.fromEntries(APARATOLOGIA.map((a) => [a.key, a.label]));

// Tipos de arco de ortodoncia por arcada
const TIPOS_ARCO = [
  'Redondo NiTi .012',
  'Redondo NiTi .014',
  'Redondo NiTi .016',
  'Redondo NiTi .018',
  'Redondo NiTi .020',
  'Rectangular NiTi',
  'Rectangular Acero',
  'TMA',
];

// Configuraciones de elásticos intermaxilares (diente → diente)
const TIPOS_ELASTICO = [
  { key: 'clase-i',   label: 'Clase I' },
  { key: 'clase-ii',  label: 'Clase II' },
  { key: 'clase-iii', label: 'Clase III' },
  { key: 'cruzado',   label: 'Cruzado' },
  { key: 'vertical',  label: 'Vertical' },
  { key: 'triangulo', label: 'Triángulo' },
];
const COLOR_ELASTICO = {
  'clase-i':   '#0EA5A5',
  'clase-ii':  '#D97706',
  'clase-iii': '#DC2626',
  cruzado:     '#7C3AED',
  vertical:    '#2563EB',
  triangulo:   '#DB2777',
};

const ODONTOGRAMA_CONFIGS = {
  'general-adulto': {
    arcadas: [
      {
        key: 'superior',
        label: 'Arcada Superior',
        separator: 'Lingual',
        normalLabel: 'Vestibular',
        normalRows: [
          { groups: [SUP_DER, SUP_IZQ], divider: true },
          { groups: [TEMP_SUP_DER, TEMP_SUP_IZQ], pequeño: true, gap: 'gap-12' },
        ],
        lingualRows: [
          { groups: [TEMP_SUP_DER, TEMP_SUP_IZQ], pequeño: true, gap: 'gap-12' },
          { groups: [SUP_DER, SUP_IZQ], divider: true },
        ],
        lingualLabel: 'Vestibular',
      },
      {
        key: 'inferior',
        label: 'Arcada Inferior',
        separator: 'Vestibular',
        normalLabel: 'Lingual',
        normalRows: [
          { groups: [TEMP_INF_DER, TEMP_INF_IZQ], pequeño: true, gap: 'gap-12' },
          { groups: [INF_DER, INF_IZQ], divider: true },
        ],
        lingualRows: [
          { groups: [INF_DER, INF_IZQ], divider: true },
          { groups: [TEMP_INF_DER, TEMP_INF_IZQ], pequeño: true, gap: 'gap-12' },
        ],
        lingualLabel: 'Lingual',
      },
    ],
  },
  'general-infantil': {
    arcadas: [
      {
        key: 'superior',
        label: 'Arcada Superior',
        separator: 'Lingual',
        normalLabel: 'Vestibular',
        normalRows: [
          { groups: [TEMP_SUP_DER, TEMP_SUP_IZQ], divider: true },
        ],
        lingualRows: [
          { groups: [TEMP_SUP_DER, TEMP_SUP_IZQ], divider: true },
        ],
        lingualLabel: 'Vestibular',
      },
      {
        key: 'inferior',
        label: 'Arcada Inferior',
        separator: 'Vestibular',
        normalLabel: 'Lingual',
        normalRows: [
          { groups: [TEMP_INF_DER, TEMP_INF_IZQ], divider: true },
        ],
        lingualRows: [
          { groups: [TEMP_INF_DER, TEMP_INF_IZQ], divider: true },
        ],
        lingualLabel: 'Lingual',
      },
    ],
  },
  ortodoncia: {
    ortodoncia: true,
    arcadas: [
      {
        key: 'superior',
        label: 'Arcada Superior',
        separator: 'Lingual',
        normalLabel: 'Vestibular',
        normalRows: [
          { groups: [SUP_DER, SUP_IZQ], divider: true, ortodoncia: true },
        ],
        lingualRows: [
          { groups: [SUP_DER, SUP_IZQ], divider: true, ortodoncia: true },
        ],
        lingualLabel: 'Vestibular',
      },
      {
        key: 'inferior',
        label: 'Arcada Inferior',
        separator: 'Vestibular',
        normalLabel: 'Lingual',
        normalRows: [
          { groups: [INF_DER, INF_IZQ], divider: true, ortodoncia: true },
        ],
        lingualRows: [
          { groups: [INF_DER, INF_IZQ], divider: true, ortodoncia: true },
        ],
        lingualLabel: 'Lingual',
      },
    ],
  },
};

// ── SVG de un diente ─────────────────────────────────────────────────────

function DienteSVG({ numero, datos, seleccionado, multiSeleccionado, elasticoRol, onClick, pequeño, registerRef }) {
  const w = pequeño ? 28 : 34;
  const h = pequeño ? 36 : 44;
  const est = datos?.estado ? ESTADOS[datos.estado] : null;
  const tieneAparatologia = Array.isArray(datos?.aparatologia) && datos.aparatologia.length > 0;

  const colorElasticoRol = elasticoRol === 'origen' ? '#D97706' : elasticoRol === 'destino' ? '#0B4F5E' : null;

  const fillColor   = est ? est.bg    : '#F7FDFD';
  const strokeColor = seleccionado
    ? '#0B4F5E'
    : elasticoRol
      ? colorElasticoRol
      : multiSeleccionado
        ? '#3ECFCF'
        : est ? est.color : '#C7E8E8';
  const strokeWidth = seleccionado || multiSeleccionado || elasticoRol ? 2 : 1;

  const esMolar    = [6, 7, 8].includes(numero % 10) || [16, 17, 18, 26, 27, 28, 36, 37, 38, 46, 47, 48].includes(numero);
  const esCanino   = [3].includes(numero % 10) || [13, 23, 33, 43].includes(numero);
  const esIncisivo = [1, 2].includes(numero % 10);

  function Simbolo() {
    if (!est || datos.estado === 'sano') return null;
    if (datos.estado === 'ausente')      return <text x={w/2} y={h/2+5} textAnchor="middle" fontSize={pequeño ? 12 : 16} fill={est.color} fontWeight="bold">×</text>;
    if (datos.estado === 'caries')       return <circle cx={w/2} cy={h/2} r={pequeño ? 4 : 5} fill={est.color} opacity={0.85} />;
    if (datos.estado === 'restauracion') return <rect x={w/2-4} y={h/2-4} width={8} height={8} rx={1.5} fill={est.color} opacity={0.85} />;
    if (datos.estado === 'endodoncia')   return <text x={w/2} y={h/2+5} textAnchor="middle" fontSize={pequeño ? 9 : 11} fill={est.color} fontWeight="bold">▼</text>;
    if (datos.estado === 'corona')       return <text x={w/2} y={h/2+5} textAnchor="middle" fontSize={pequeño ? 9 : 12} fill={est.color}>♛</text>;
    if (datos.estado === 'implante')     return <text x={w/2} y={h/2+5} textAnchor="middle" fontSize={pequeño ? 8 : 10} fill={est.color}>⬡</text>;
    return null;
  }

  const tooltipAparatologia = tieneAparatologia
    ? ` — ${datos.aparatologia.map((k) => APARATOLOGIA_LABELS[k] || k).join(', ')}`
    : '';

  return (
    <div
      ref={(el) => registerRef && registerRef(numero, el)}
      onClick={() => onClick(numero)}
      className="flex flex-col items-center gap-0.5 cursor-pointer group select-none"
      title={`Diente ${numero}${est ? ` — ${est.label}` : ''}${tooltipAparatologia}`}
    >
      <span className={`${pequeño ? 'text-[8px]' : 'text-[9px]'} font-medium leading-none ${seleccionado ? 'text-primary font-bold' : 'text-teal-muted'}`}>
        {numero}
      </span>
      <svg
        width={w} height={h}
        viewBox={`0 0 ${w} ${h}`}
        className={`transition-all duration-150 ${!seleccionado && !multiSeleccionado ? 'group-hover:scale-110' : 'scale-110'}`}
      >
        {esMolar ? (
          <rect x={2} y={4} width={w-4} height={h-8} rx={5} ry={5}
            fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
        ) : esCanino ? (
          <path d={`M${w/2} 2 L${w-3} ${h-6} Q${w/2} ${h-2} 3 ${h-6} Z`}
            fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
        ) : esIncisivo ? (
          <rect x={3} y={3} width={w-6} height={h-7} rx={4} ry={6}
            fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
        ) : (
          <ellipse cx={w/2} cy={h/2} rx={(w-6)/2} ry={(h-8)/2}
            fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
        )}
        <Simbolo />
        {(seleccionado || multiSeleccionado || elasticoRol) && (
          <rect x={0} y={0} width={w} height={h} rx={6}
            fill="none" stroke={seleccionado ? '#0B4F5E' : elasticoRol ? colorElasticoRol : '#3ECFCF'}
            strokeWidth={2} strokeDasharray={seleccionado ? '0' : '4 2'} />
        )}
      </svg>
      <div className="flex items-center gap-1 h-1.5">
        {tieneAparatologia && (
          <div className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] ring-1 ring-white" title="Tiene aparatología" />
        )}
        {datos?.notas && (
          <div className="w-1.5 h-1.5 rounded-full bg-teal-light flex-shrink-0" title="Tiene notas" />
        )}
      </div>
    </div>
  );
}

// ── Fila de dientes ───────────────────────────────────────────────────────

function FilaDientes({ dientes, odontograma, seleccionado, multiSel, onClickDiente, pequeño, registerRef, elasticoOrigen, elasticoDestino }) {
  return (
    <div className="flex items-end gap-1 justify-center">
      {dientes.map((n) => (
        <DienteSVG
          key={n}
          numero={n}
          datos={odontograma[n]}
          seleccionado={seleccionado === n}
          multiSeleccionado={multiSel.includes(n)}
          elasticoRol={elasticoOrigen === n ? 'origen' : elasticoDestino === n ? 'destino' : null}
          onClick={onClickDiente}
          pequeño={pequeño}
          registerRef={registerRef}
        />
      ))}
    </div>
  );
}

function FilaConfig({ row, filaProps }) {
  return (
    <div className={`flex justify-center ${row.gap || 'gap-1'}`}>
      {row.groups.map((dientes, index) => (
        <div key={`${dientes[0]}-${dientes[dientes.length - 1]}`} className="flex items-end gap-1">
          <FilaDientes dientes={dientes} {...filaProps} pequeño={row.pequeño} />
          {row.divider && index < row.groups.length - 1 && (
            <div className="w-px self-stretch bg-teal-border mx-1" />
          )}
        </div>
      ))}
    </div>
  );
}

function ArcoArcada({ arco, onChange }) {
  const datos = arco || { tipoArco: '', fechaColocacion: '', activo: false };

  return (
    <div className="mt-3 border-t border-dashed border-teal-border pt-3">
      <div className="flex items-center gap-2 mb-2.5 px-1">
        <span
          className={`flex-1 h-1.5 rounded-full ${datos.activo && datos.tipoArco ? '' : 'opacity-40'}`}
          style={{
            backgroundColor: datos.activo && datos.tipoArco ? '#0B4F5E' : 'transparent',
            backgroundImage: datos.activo && datos.tipoArco
              ? 'none'
              : 'repeating-linear-gradient(90deg, #C7E8E8 0 6px, transparent 6px 10px)',
          }}
        />
        <span className="text-[9px] text-teal-muted whitespace-nowrap">
          {datos.activo && datos.tipoArco ? 'Arco activo' : 'Sin arco activo'}
        </span>
        <span
          className={`flex-1 h-1.5 rounded-full ${datos.activo && datos.tipoArco ? '' : 'opacity-40'}`}
          style={{
            backgroundColor: datos.activo && datos.tipoArco ? '#0B4F5E' : 'transparent',
            backgroundImage: datos.activo && datos.tipoArco
              ? 'none'
              : 'repeating-linear-gradient(90deg, #C7E8E8 0 6px, transparent 6px 10px)',
          }}
        />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <select
          value={datos.tipoArco}
          onChange={(e) => onChange({ ...datos, tipoArco: e.target.value })}
          className="text-[11px] border border-teal-border rounded-lg px-2 py-1.5 bg-white outline-none font-sans text-[#1a3a3a]"
        >
          <option value="">Sin arco</option>
          {TIPOS_ARCO.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input
          type="date"
          value={datos.fechaColocacion || ''}
          onChange={(e) => onChange({ ...datos, fechaColocacion: e.target.value })}
          className="text-[11px] border border-teal-border rounded-lg px-2 py-1.5 bg-white outline-none font-sans text-[#1a3a3a]"
        />
        <label className="flex items-center gap-1.5 text-[11px] text-teal-muted cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!datos.activo}
            onChange={(e) => onChange({ ...datos, activo: e.target.checked })}
          />
          Activo
        </label>
      </div>
    </div>
  );
}

function ArcadaOdontograma({ arcada, vistaLingual, filaProps, arco, onArcoChange }) {
  const rows = vistaLingual ? arcada.lingualRows : arcada.normalRows;
  const label = vistaLingual ? arcada.lingualLabel : arcada.normalLabel;

  return (
    <div className="border border-teal-border rounded-2xl overflow-hidden mb-4 last:mb-0">
      <div className="bg-teal-panel px-4 py-2 border-b border-teal-soft flex items-center justify-between">
        <span className="text-[10px] font-semibold text-primary uppercase tracking-[1px]">{arcada.label}</span>
        <div className="flex items-center gap-4 text-[9px] text-teal-muted">
          <span>← Derecho</span>
          <span>Izquierdo →</span>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        <p className="text-[9px] text-center text-teal-muted uppercase tracking-[1.5px]">{label}</p>
        {rows.map((row, index) => (
          <div key={`${arcada.key}-${index}`}>
            <FilaConfig row={row} filaProps={filaProps} />
            {row.ortodoncia && <ArcoArcada arco={arco} onChange={onArcoChange} />}
          </div>
        ))}

        <div className="flex items-center gap-2">
          <div className="flex-1 border-t border-dashed border-teal-border" />
          <span className="text-[9px] text-teal-muted font-medium px-2 uppercase tracking-wide">{arcada.separator}</span>
          <div className="flex-1 border-t border-dashed border-teal-border" />
        </div>
      </div>
    </div>
  );
}

// ── Panel de edición del diente seleccionado ──────────────────────────────

function PanelEdicion({ numero, datos, tipoOdontograma, onChange, onCerrar }) {
  const [local, setLocal] = useState({
    estado: datos?.estado || 'sano',
    notas:  datos?.notas  || '',
    aparatologia: datos?.aparatologia || [],
  });

  const est = ESTADOS[local.estado];

  function toggleAparatologia(key) {
    setLocal((p) => ({
      ...p,
      aparatologia: p.aparatologia.includes(key)
        ? p.aparatologia.filter((k) => k !== key)
        : [...p.aparatologia, key],
    }));
  }

  function guardar() {
    onChange(numero, local);
    onCerrar();
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-teal-soft bg-teal-panel flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-[11px] text-white font-bold">
            {numero}
          </div>
          <div>
            <p className="text-[12px] font-semibold text-primary">Diente {numero}</p>
            <p className="text-[10px] text-teal-muted uppercase tracking-wide">Edición</p>
          </div>
        </div>
        <button type="button" onClick={onCerrar}
          className="p-1 rounded-lg hover:bg-teal-soft transition-colors cursor-pointer border-none bg-transparent text-teal-muted hover:text-primary">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex items-center gap-2 mb-4 p-2.5 rounded-lg border"
          style={{ backgroundColor: est.bg, borderColor: est.color }}>
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: est.color }} />
          <span className="text-[12px] font-medium" style={{ color: est.text }}>{est.label}</span>
        </div>

        <div className="mb-4">
          <label className="block text-[10px] font-semibold text-teal-muted uppercase tracking-[0.8px] mb-2">
            Estado del diente
          </label>
          <div className="flex flex-col gap-1.5">
            {Object.entries(ESTADOS).map(([key, val]) => (
              <label key={key}
                className={[
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-all',
                  local.estado === key
                    ? 'border-primary bg-teal-soft shadow-sm'
                    : 'border-teal-border bg-white hover:bg-teal-panel',
                ].join(' ')}>
                <input type="radio" name={`estado-${numero}`} value={key}
                  checked={local.estado === key}
                  onChange={() => setLocal((p) => ({ ...p, estado: key }))}
                  className="sr-only" />
                <div className="w-3 h-3 rounded-full flex-shrink-0 border"
                  style={{ backgroundColor: val.bg, borderColor: val.color }} />
                <span className="text-[12px] font-medium" style={{ color: local.estado === key ? '#0B4F5E' : '#1a3a3a' }}>
                  {val.label}
                </span>
                {local.estado === key && (
                  <span className="ml-auto text-primary text-[10px]">✓</span>
                )}
              </label>
            ))}
          </div>
        </div>

        {tipoOdontograma === 'ortodoncia' && (
          <div className="mb-4">
            <label className="block text-[10px] font-semibold text-teal-muted uppercase tracking-[0.8px] mb-2">
              Aparatología
            </label>
            <div className="flex flex-wrap gap-1.5">
              {APARATOLOGIA.map((item) => {
                const activo = local.aparatologia.includes(item.key);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggleAparatologia(item.key)}
                    className={[
                      'text-[11px] px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer font-sans',
                      activo
                        ? 'bg-primary text-white border-primary font-medium'
                        : 'bg-white text-teal-muted border-teal-border hover:bg-teal-panel',
                    ].join(' ')}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-[10px] font-semibold text-teal-muted uppercase tracking-[0.8px] mb-2">
            Notas clínicas
          </label>
          <textarea
            value={local.notas}
            onChange={(e) => setLocal((p) => ({ ...p, notas: e.target.value }))}
            rows={4}
            placeholder="Observaciones, lesiones, tratamientos previos..."
            className={[
              'w-full px-2.5 py-2 border border-teal-border rounded-lg resize-none',
              'text-[12px] font-sans text-[#1a3a3a] bg-[#FAFEFE]',
              'outline-none transition-colors focus:border-teal focus:bg-white placeholder:text-teal-light',
            ].join(' ')}
          />
        </div>
      </div>

      <div className="px-4 py-3 border-t border-teal-soft flex-shrink-0">
        <button type="button" onClick={guardar}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-[12px] text-white font-semibold font-sans bg-primary rounded-xl border-none cursor-pointer hover:bg-primary-light transition-colors">
          <Save size={14} />
          Guardar cambios
        </button>
      </div>
    </div>
  );
}

// ── Modal principal ───────────────────────────────────────────────────────

/**
 * @param {boolean}  props.isOpen
 * @param {function} props.onClose
 * @param {object}   props.odontograma    - { [tipo]: { [numero]: { estado, notas } } }
 * @param {function} props.onGuardar      - Callback ASYNC con odontograma actualizado
 * @param {string}   props.nombrePaciente
 */
export default function OdontogramaModal({ isOpen, onClose, odontogramas = {}, onGuardar, nombrePaciente = '' }) {
  const [local, setLocal]               = useState({ ...odontogramas });
  const [seleccionado, setSelec]        = useState(null);
  const [multiSel, setMultiSel]         = useState([]);
  const [modoMulti, setModoMulti]       = useState(false);
  const [estadoMasivo, setEstadoMasivo] = useState('caries');
  const [aparatologiaMasiva, setAparatologiaMasiva] = useState([]);
  const [vistaLingual, setVistaLingual] = useState(false);
  const [tipoOdontograma, setTipoOdontograma] = useState('general-adulto');
  const [guardando, setGuardando]       = useState(false);
  const [error, setError]               = useState(null);

  // ── Ortodoncia: elásticos direccionales ──
  const [modoElastico, setModoElastico]           = useState(false);
  const [elasticoOrigen, setElasticoOrigen]       = useState(null);
  const [elasticoDestino, setElasticoDestino]     = useState(null);
  const [elasticoTipoSel, setElasticoTipoSel]     = useState('clase-ii');
  const [lineasElasticos, setLineasElasticos]     = useState([]);
  const [overlaySize, setOverlaySize]             = useState({ width: 0, height: 0 });

  const prevIsOpen = useRef(false);
  const dienteRefsMap = useRef({});
  const arcadasContainerRef = useRef(null);

  const registerDienteRef = useCallback((numero, el) => {
    if (el) dienteRefsMap.current[numero] = el;
    else delete dienteRefsMap.current[numero];
  }, []);

  useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      setLocal({ ...odontogramas });
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, odontogramas]);

  useEffect(() => {
    if (!isOpen) {
      setSelec(null);
      setMultiSel([]);
      setModoMulti(false);
      setAparatologiaMasiva([]);
      setModoElastico(false);
      setElasticoOrigen(null);
      setElasticoDestino(null);
      setError(null);
    }
  }, [isOpen]);

  const handleClickDiente = useCallback((numero) => {
    if (modoElastico) {
      if (elasticoOrigen === null) {
        setElasticoOrigen(numero);
        setElasticoDestino(null);
      } else if (elasticoDestino === null) {
        if (numero === elasticoOrigen) {
          setElasticoOrigen(null);
        } else {
          setElasticoDestino(numero);
        }
      } else {
        setElasticoOrigen(numero);
        setElasticoDestino(null);
      }
      return;
    }
    if (modoMulti) {
      setMultiSel((prev) =>
        prev.includes(numero) ? prev.filter((n) => n !== numero) : [...prev, numero]
      );
      setSelec(null);
    } else {
      setSelec((prev) => prev === numero ? null : numero);
      setMultiSel([]);
    }
  }, [modoMulti, modoElastico, elasticoOrigen, elasticoDestino]);

  // ── Recalcular posiciones de las flechas de elásticos ──
  const recalcularLineasElasticos = useCallback(() => {
    const contenedor = arcadasContainerRef.current;
    if (!contenedor || tipoOdontograma !== 'ortodoncia') {
      setLineasElasticos([]);
      return;
    }
    const elasticosActuales = local[tipoOdontograma]?.elasticos || [];
    if (!elasticosActuales.length) {
      setLineasElasticos([]);
      return;
    }
    const contRect = contenedor.getBoundingClientRect();
    setOverlaySize({ width: contRect.width, height: contRect.height });
    const nuevas = elasticosActuales
      .map((el) => {
        const nodoOrigen = dienteRefsMap.current[el.desde];
        const nodoDestino = dienteRefsMap.current[el.hasta];
        if (!nodoOrigen || !nodoDestino) return null;
        const rOrigen = nodoOrigen.getBoundingClientRect();
        const rDestino = nodoDestino.getBoundingClientRect();
        return {
          id: el.id,
          tipo: el.tipo,
          x1: rOrigen.left + rOrigen.width / 2 - contRect.left,
          y1: rOrigen.top + rOrigen.height / 2 - contRect.top,
          x2: rDestino.left + rDestino.width / 2 - contRect.left,
          y2: rDestino.top + rDestino.height / 2 - contRect.top,
        };
      })
      .filter(Boolean);
    setLineasElasticos(nuevas);
  }, [local, tipoOdontograma]);

  useEffect(() => {
    recalcularLineasElasticos();
  }, [recalcularLineasElasticos, vistaLingual, seleccionado]);

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('resize', recalcularLineasElasticos);
    return () => window.removeEventListener('resize', recalcularLineasElasticos);
  }, [isOpen, recalcularLineasElasticos]);

  function actualizarDiente(numero, datos) {
    setLocal((prev) => ({
      ...prev,
      [tipoOdontograma]: {
        ...(prev[tipoOdontograma] || {}),
        [numero]: datos,
      },
    }));
  }

  function aplicarMasivo() {
    if (!multiSel.length) return;
    setLocal((prev) => {
      const actual = prev[tipoOdontograma] || {};
      const nuevoActual = { ...actual };
      multiSel.forEach((n) => {
        nuevoActual[n] = { ...actual[n], estado: estadoMasivo, notas: actual[n]?.notas || '' };
      });
      return { ...prev, [tipoOdontograma]: nuevoActual };
    });
    setMultiSel([]);
    setModoMulti(false);
  }

  // ── Ortodoncia: selección rápida de arcada y aplicación masiva de aparatología ──
  function seleccionarArcada(dientes) {
    setMultiSel((prev) => Array.from(new Set([...prev, ...dientes])));
  }

  function seleccionarTodosLosDientes() {
    setMultiSel(Array.from(new Set([...SUP_DER, ...SUP_IZQ, ...INF_DER, ...INF_IZQ])));
  }

  function toggleAparatologiaMasiva(key) {
    setAparatologiaMasiva((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function aplicarAparatologiaMasiva() {
    if (!multiSel.length || !aparatologiaMasiva.length) return;
    setLocal((prev) => {
      const actual = prev[tipoOdontograma] || {};
      const nuevoActual = { ...actual };
      multiSel.forEach((n) => {
        const datosDiente = actual[n] || {};
        const existente = datosDiente.aparatologia || [];
        const combinado = Array.from(new Set([...existente, ...aparatologiaMasiva]));
        nuevoActual[n] = { ...datosDiente, aparatologia: combinado };
      });
      return { ...prev, [tipoOdontograma]: nuevoActual };
    });
    setMultiSel([]);
    setModoMulti(false);
    setAparatologiaMasiva([]);
  }

  function limpiarTodo() {
    setLocal((prev) => ({ ...prev, [tipoOdontograma]: {} }));
    setSelec(null);
    setMultiSel([]);
    setElasticoOrigen(null);
    setElasticoDestino(null);
  }

  function actualizarArco(arcadaKey, cambios) {
    setLocal((prev) => {
      const actual = prev[tipoOdontograma] || {};
      const arcosActuales = actual.arcos || {};
      return {
        ...prev,
        [tipoOdontograma]: {
          ...actual,
          arcos: { ...arcosActuales, [arcadaKey]: cambios },
        },
      };
    });
  }

  function confirmarElastico() {
    if (elasticoOrigen == null || elasticoDestino == null) return;
    const nuevo = {
      id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      desde: elasticoOrigen,
      hasta: elasticoDestino,
      tipo: elasticoTipoSel,
    };
    setLocal((prev) => {
      const actual = prev[tipoOdontograma] || {};
      const elasticosActuales = actual.elasticos || [];
      return {
        ...prev,
        [tipoOdontograma]: { ...actual, elasticos: [...elasticosActuales, nuevo] },
      };
    });
    setElasticoOrigen(null);
    setElasticoDestino(null);
  }

  function cancelarSeleccionElastico() {
    setElasticoOrigen(null);
    setElasticoDestino(null);
  }

  function eliminarElastico(id) {
    setLocal((prev) => {
      const actual = prev[tipoOdontograma] || {};
      return {
        ...prev,
        [tipoOdontograma]: { ...actual, elasticos: (actual.elasticos || []).filter((e) => e.id !== id) },
      };
    });
  }

  async function guardarYCerrar() {
    const dientesActual = local[tipoOdontograma] || {};

    setGuardando(true);
    setError(null);
    try {
      await onGuardar({ tipo: tipoOdontograma, dientes_json: dientesActual });
      onClose();
    } catch (err) {
      console.error('Error guardando odontograma:', err);
      setError('No se pudieron guardar los cambios. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  if (!isOpen) return null;

  const dientesActual = local[tipoOdontograma] || {};

  const dientesConEstado = Object.keys(dientesActual).filter(
    (k) => dientesActual[k]?.estado && dientesActual[k].estado !== 'sano'
  ).length;

  const arcosActuales = local[tipoOdontograma]?.arcos || {};
  const elasticosActuales = local[tipoOdontograma]?.elasticos || [];

  const filaProps = {
    odontograma: dientesActual,
    seleccionado,
    multiSel,
    onClickDiente: handleClickDiente,
    registerRef: registerDienteRef,
    elasticoOrigen: modoElastico ? elasticoOrigen : null,
    elasticoDestino: modoElastico ? elasticoDestino : null,
  };
  const configOdontograma = ODONTOGRAMA_CONFIGS[tipoOdontograma] || ODONTOGRAMA_CONFIGS['general-adulto'];

  function cambiarTipoOdontograma(value) {
    setTipoOdontograma(value);
    setSelec(null);
    setMultiSel([]);
    setModoMulti(false);
    setAparatologiaMasiva([]);
    setModoElastico(false);
    setElasticoOrigen(null);
    setElasticoDestino(null);
  }

  return (
    <div
      className="fixed inset-0 bg-primary/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && !guardando && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-[1100px] h-[90vh] flex flex-col border border-teal-border shadow-2xl overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 bg-primary flex-shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-[15px] font-semibold text-white">Odontograma</h2>
              {nombrePaciente && (
                <p className="text-[11px] text-teal-light mt-0.5">{nombrePaciente}</p>
              )}
            </div>
            {dientesConEstado > 0 && (
              <span className="text-[10px] bg-teal/30 text-teal-light px-2.5 py-1 rounded-full border border-teal/30">
                {dientesConEstado} diente{dientesConEstado !== 1 ? 's' : ''} con condición
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setVistaLingual((v) => !v)}
              className="text-[11px] text-white/70 border border-white/20 rounded-lg px-3 py-1.5 hover:bg-white/10 transition-colors cursor-pointer font-sans bg-transparent">
              Vista: {vistaLingual ? 'Lingual' : 'Vestibular'}
            </button>

            <button type="button" onClick={() => { setModoMulti((v) => !v); setSelec(null); setMultiSel([]); setAparatologiaMasiva([]); setModoElastico(false); setElasticoOrigen(null); setElasticoDestino(null); }}
              className={[
                'text-[11px] border rounded-lg px-3 py-1.5 transition-colors cursor-pointer font-sans',
                modoMulti
                  ? 'bg-teal text-primary border-teal font-semibold'
                  : 'text-white/70 border-white/20 bg-transparent hover:bg-white/10',
              ].join(' ')}>
              {modoMulti ? '✓ Multi-selección' : 'Multi-selección'}
            </button>

            {tipoOdontograma === 'ortodoncia' && (
              <button type="button" onClick={() => { setModoElastico((v) => !v); setSelec(null); setMultiSel([]); setModoMulti(false); setElasticoOrigen(null); setElasticoDestino(null); }}
                className={[
                  'flex items-center gap-1.5 text-[11px] border rounded-lg px-3 py-1.5 transition-colors cursor-pointer font-sans',
                  modoElastico
                    ? 'bg-teal text-primary border-teal font-semibold'
                    : 'text-white/70 border-white/20 bg-transparent hover:bg-white/10',
                ].join(' ')}>
                <Link2 size={12} /> {modoElastico ? '✓ Elásticos' : 'Elásticos'}
              </button>
            )}

            <button type="button" onClick={limpiarTodo}
              className="text-[11px] text-white/70 border border-white/20 rounded-lg px-3 py-1.5 hover:bg-white/10 transition-colors cursor-pointer font-sans bg-transparent flex items-center gap-1.5">
              <RotateCcw size={12} /> Limpiar todo
            </button>

            <button type="button" onClick={onClose} disabled={guardando}
              className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white hover:bg-white/25 transition-colors cursor-pointer border-none disabled:opacity-50">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden">

          <div className="flex-1 overflow-y-auto px-6 py-5">

            {/* Banner de error */}
            {error && (
              <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-[12px] text-red-600 flex-1">{error}</p>
                <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-600 border-none bg-transparent cursor-pointer">
                  <X size={13} />
                </button>
              </div>
            )}

            {modoMulti && (
              <div className="flex flex-col gap-3 mb-4 px-4 py-3 bg-status-blueBg border border-status-blueMid rounded-xl">
                <div className="flex items-center gap-3 flex-wrap">
                  <Info size={15} className="text-status-blue flex-shrink-0" />
                  <p className="text-[12px] text-status-blue flex-1 min-w-[220px]">
                    Modo multi-selección activo — haz clic en varios dientes para aplicarles un cambio a todos a la vez.
                    {multiSel.length > 0 && <strong className="ml-1">{multiSel.length} seleccionado{multiSel.length !== 1 ? 's' : ''}.</strong>}
                  </p>
                  {tipoOdontograma === 'ortodoncia' && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button type="button" onClick={() => seleccionarArcada([...SUP_DER, ...SUP_IZQ])}
                        className="text-[10px] text-status-blue border border-status-blueMid rounded-md px-2 py-1 bg-white hover:bg-status-blueBg transition-colors cursor-pointer font-sans">
                        + Arcada superior
                      </button>
                      <button type="button" onClick={() => seleccionarArcada([...INF_DER, ...INF_IZQ])}
                        className="text-[10px] text-status-blue border border-status-blueMid rounded-md px-2 py-1 bg-white hover:bg-status-blueBg transition-colors cursor-pointer font-sans">
                        + Arcada inferior
                      </button>
                      <button type="button" onClick={seleccionarTodosLosDientes}
                        className="text-[10px] text-status-blue border border-status-blueMid rounded-md px-2 py-1 bg-white hover:bg-status-blueBg transition-colors cursor-pointer font-sans">
                        + Todos
                      </button>
                      {multiSel.length > 0 && (
                        <button type="button" onClick={() => setMultiSel([])}
                          className="text-[10px] text-red-500 border border-red-200 rounded-md px-2 py-1 bg-white hover:bg-red-50 transition-colors cursor-pointer font-sans">
                          Limpiar selección
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {multiSel.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-status-blue uppercase tracking-wide font-medium">Estado:</span>
                    <select value={estadoMasivo} onChange={(e) => setEstadoMasivo(e.target.value)}
                      className="text-[12px] border border-teal-border rounded-lg px-2 py-1.5 bg-white outline-none font-sans text-[#1a3a3a]">
                      {Object.entries(ESTADOS).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                    <button type="button" onClick={aplicarMasivo}
                      className="text-[12px] text-white font-medium bg-primary rounded-lg px-3 py-1.5 border-none cursor-pointer hover:bg-primary-light transition-colors font-sans">
                      Aplicar
                    </button>
                  </div>
                )}

                {tipoOdontograma === 'ortodoncia' && multiSel.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-status-blueMid/40">
                    <span className="text-[10px] text-status-blue uppercase tracking-wide font-medium">Aparatología:</span>
                    {APARATOLOGIA.map((item) => {
                      const activo = aparatologiaMasiva.includes(item.key);
                      return (
                        <button key={item.key} type="button" onClick={() => toggleAparatologiaMasiva(item.key)}
                          className={[
                            'text-[11px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer font-sans',
                            activo
                              ? 'bg-primary text-white border-primary font-medium'
                              : 'bg-white text-teal-muted border-teal-border hover:bg-teal-panel',
                          ].join(' ')}>
                          {item.label}
                        </button>
                      );
                    })}
                    <button type="button" onClick={aplicarAparatologiaMasiva} disabled={!aparatologiaMasiva.length}
                      className="text-[12px] text-white font-medium bg-primary rounded-lg px-3 py-1.5 border-none cursor-pointer hover:bg-primary-light transition-colors font-sans disabled:opacity-40 disabled:cursor-not-allowed">
                      Aplicar a {multiSel.length} diente{multiSel.length !== 1 ? 's' : ''}
                    </button>
                  </div>
                )}
              </div>
            )}

            {modoElastico && (
              <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-status-blueBg border border-status-blueMid rounded-xl flex-wrap">
                <Link2 size={15} className="text-status-blue flex-shrink-0" />
                <p className="text-[12px] text-status-blue flex-1 min-w-[220px]">
                  {elasticoOrigen === null && 'Modo elásticos activo — selecciona el diente de origen.'}
                  {elasticoOrigen !== null && elasticoDestino === null && (
                    <>Origen: <strong>{elasticoOrigen}</strong>. Ahora selecciona el diente destino.</>
                  )}
                  {elasticoOrigen !== null && elasticoDestino !== null && (
                    <>Elástico: <strong>{elasticoOrigen} → {elasticoDestino}</strong></>
                  )}
                </p>
                {elasticoOrigen !== null && elasticoDestino !== null && (
                  <div className="flex items-center gap-2">
                    <select value={elasticoTipoSel} onChange={(e) => setElasticoTipoSel(e.target.value)}
                      className="text-[12px] border border-teal-border rounded-lg px-2 py-1.5 bg-white outline-none font-sans text-[#1a3a3a]">
                      {TIPOS_ELASTICO.map((t) => (
                        <option key={t.key} value={t.key}>{t.label}</option>
                      ))}
                    </select>
                    <button type="button" onClick={confirmarElastico}
                      className="text-[12px] text-white font-medium bg-primary rounded-lg px-3 py-1.5 border-none cursor-pointer hover:bg-primary-light transition-colors font-sans">
                      Agregar
                    </button>
                    <button type="button" onClick={cancelarSeleccionElastico}
                      className="text-[12px] text-teal-muted border border-teal-border rounded-lg px-3 py-1.5 bg-white cursor-pointer hover:bg-teal-panel transition-colors font-sans">
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-border bg-teal-panel px-4 py-3">
              <label className="text-[10px] font-semibold text-primary uppercase tracking-[0.8px]" htmlFor="tipo-odontograma">
                Tipo de odontograma
              </label>
              <select
                id="tipo-odontograma"
                value={tipoOdontograma}
                onChange={(e) => cambiarTipoOdontograma(e.target.value)}
                className="min-w-[190px] text-[12px] border border-teal-border rounded-lg px-3 py-2 bg-white outline-none font-sans text-[#1a3a3a] focus:border-teal"
              >
                {TIPOS_ODONTOGRAMA.map((tipo) => (
                  <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                ))}
              </select>
            </div>

            {tipoOdontograma === 'ortodoncia' && elasticosActuales.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-teal-border bg-teal-panel px-4 py-3">
                <span className="text-[10px] font-semibold text-primary uppercase tracking-[0.8px] mr-1">Elásticos:</span>
                {elasticosActuales.map((el) => {
                  const tipoInfo = TIPOS_ELASTICO.find((t) => t.key === el.tipo);
                  const color = COLOR_ELASTICO[el.tipo] || '#7C3AED';
                  return (
                    <span key={el.id}
                      className="flex items-center gap-1.5 text-[11px] text-primary bg-white border rounded-full pl-3 pr-1.5 py-1"
                      style={{ borderColor: color }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                      {el.desde} → {el.hasta} · {tipoInfo?.label || el.tipo}
                      <button type="button" onClick={() => eliminarElastico(el.id)}
                        className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-red-50 text-teal-muted hover:text-red-500 border-none bg-transparent cursor-pointer">
                        <X size={10} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* ── Arcadas: única implementación reutilizable para los 3 tipos ── */}
            <div ref={arcadasContainerRef} className="relative">
              {configOdontograma.arcadas.map((arcada) => (
                <ArcadaOdontograma
                  key={arcada.key}
                  arcada={arcada}
                  vistaLingual={vistaLingual}
                  filaProps={filaProps}
                  arco={arcosActuales[arcada.key]}
                  onArcoChange={(cambios) => actualizarArco(arcada.key, cambios)}
                />
              ))}

              {tipoOdontograma === 'ortodoncia' && lineasElasticos.length > 0 && (
                <svg
                  width={overlaySize.width}
                  height={overlaySize.height}
                  className="absolute top-0 left-0 pointer-events-none"
                  style={{ overflow: 'visible' }}
                >
                  <defs>
                    <marker id="flecha-elastico" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto-start-reverse">
                      <path d="M0,0 L6,3 L0,6 Z" fill="context-stroke" />
                    </marker>
                  </defs>
                  {lineasElasticos.map((l) => {
                    const color = COLOR_ELASTICO[l.tipo] || '#7C3AED';
                    const mx = (l.x1 + l.x2) / 2;
                    const my = (l.y1 + l.y2) / 2 - 16;
                    return (
                      <path
                        key={l.id}
                        d={`M ${l.x1} ${l.y1} Q ${mx} ${my} ${l.x2} ${l.y2}`}
                        fill="none"
                        stroke={color}
                        strokeWidth={1.5}
                        strokeDasharray="4 3"
                        markerEnd="url(#flecha-elastico)"
                      />
                    );
                  })}
                </svg>
              )}
            </div>

            {/* ── Leyenda ── */}
            <div className="mt-4 flex flex-wrap items-center gap-3 px-1">
              <span className="text-[10px] text-teal-muted uppercase tracking-[0.8px] font-medium mr-1">Leyenda:</span>
              {Object.entries(ESTADOS).map(([key, val]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm border" style={{ backgroundColor: val.bg, borderColor: val.color }} />
                  <span className="text-[10px] text-teal-muted">{val.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 ml-2">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-light" />
                <span className="text-[10px] text-teal-muted">Tiene notas</span>
              </div>
            </div>
          </div>

          {/* ── Panel lateral de edición ── */}
          <div className={[
            'border-l border-teal-border transition-all duration-200 flex-shrink-0 flex flex-col',
            seleccionado ? (tipoOdontograma === 'ortodoncia' ? 'w-[280px]' : 'w-[240px]') : 'w-0 overflow-hidden',
          ].join(' ')}>
            {seleccionado && (
              <PanelEdicion
              key={seleccionado}
              numero={seleccionado}
              datos={dientesActual[seleccionado]}
              tipoOdontograma={tipoOdontograma}
              onChange={actualizarDiente}
              onCerrar={() => setSelec(null)}
              />
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-teal-soft bg-teal-panel flex-shrink-0">
          <p className="text-[11px] text-teal-muted">
            Haz clic en un diente para editarlo · Los cambios se guardan al presionar <strong className="text-primary">Guardar odontograma</strong>
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} disabled={guardando}
              className="px-4 py-2 text-[12px] text-primary font-sans bg-white border border-teal-border rounded-xl cursor-pointer hover:bg-teal-info transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button type="button" onClick={guardarYCerrar} disabled={guardando}
              className="flex items-center gap-2 px-4 py-2 text-[12px] text-white font-semibold font-sans bg-primary rounded-xl border-none cursor-pointer hover:bg-primary-light transition-colors disabled:opacity-70 disabled:cursor-not-allowed">
              <Save size={14} />
              {guardando ? 'Guardando…' : 'Guardar odontograma'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}