// src/components/StatCard.jsx

/**
 * @param {object} props
 * @param {string} props.label       - Etiqueta de la métrica
 * @param {number} props.value       - Valor numérico
 * @param {string} props.sub         - Subtexto descriptivo
 * @param {string} props.accentColor - Color hex del acento izquierdo
 */
export default function StatCard({ label, value, sub, accentColor }) {
  return (
    <div className="relative bg-white border border-teal-border rounded-[10px] px-4 py-3.5 overflow-hidden">
      {/* Barra de acento izquierda */}
      <span
        className="absolute top-0 left-0 w-[3px] h-full rounded-none"
        style={{ backgroundColor: accentColor }}
      />

      <p className="text-[11px] text-teal-muted uppercase tracking-[0.8px] mb-1.5">
        {label}
      </p>
      <p className="text-[22px] font-medium text-primary leading-none">
        {value}
      </p>
      <p className="text-[11px] text-teal mt-1">{sub}</p>
    </div>
  );
}