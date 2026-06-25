// src/components/tratamientos/FinancialPanel.jsx
import { CreditCard, CheckCircle2, Clock } from 'lucide-react';
import { fmt } from './helpers';

// ─── Mini stat card ───────────────────────────────────────────────────────────

function StatCard({ label, value, variant = 'default', icon: Icon }) {
  const variants = {
    default:  'bg-white border-teal-border text-[#1a3a3a]',
    primary:  'bg-primary text-white border-primary',
    success:  'bg-emerald-50 border-emerald-200 text-emerald-700',
    warning:  'bg-amber-50 border-amber-200 text-amber-700',
  };

  return (
    <div className={`rounded-xl border p-3.5 ${variants[variant]}`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-[10px] font-semibold uppercase tracking-[0.65px] ${variant === 'primary' ? 'text-white/70' : 'text-teal-muted'}`}>
          {label}
        </span>
        {Icon && <Icon size={12} className={variant === 'primary' ? 'text-white/60' : 'text-teal-muted'} />}
      </div>
      <p className={`text-[14px] font-bold leading-tight tabular-nums truncate ${variant === 'primary' ? 'text-white' : ''}`}>
        {value}
      </p>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

/**
 * @param {{ total: number, totalPagado: number, saldo: number }} totales
 * @param {object[]} pagos
 * @param {number}   numProcedimientos
 */
export default function FinancialPanel({ totales, pagos, numProcedimientos }) {
  const { total, totalPagado, saldo } = totales;
  const pagado = total > 0 && saldo <= 0;
  const porcentajePagado = total > 0 ? Math.min((totalPagado / total) * 100, 100) : 0;

  return (
    <div className="flex flex-col gap-3">

      {/* Total principal */}
      <StatCard
        label="Total del tratamiento"
        value={fmt(total)}
        variant="primary"
        icon={CreditCard}
      />

      {/* Pagado / Saldo */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          label="Pagado"
          value={fmt(totalPagado)}
          variant={totalPagado > 0 ? 'success' : 'default'}
          icon={CheckCircle2}
        />
        <StatCard
          label="Saldo"
          value={fmt(saldo)}
          variant={saldo > 0 ? 'warning' : 'default'}
          icon={Clock}
        />
      </div>

      {/* Barra de progreso de pago */}
      {total > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-teal-muted uppercase tracking-[0.6px]">
              Progreso de pago
            </span>
            <span className="text-[10.5px] font-semibold text-[#1a3a3a]">
              {porcentajePagado.toFixed(0)}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-teal-soft rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${pagado ? 'bg-emerald-400' : 'bg-primary'}`}
              style={{ width: `${porcentajePagado}%` }}
            />
          </div>
          {pagado && (
            <p className="text-[10px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <CheckCircle2 size={10} /> Tratamiento pagado completamente
            </p>
          )}
        </div>
      )}

      {/* Separador */}
      <div className="h-px bg-teal-soft" />

      {/* Resumen de procedimientos */}
      <div className="rounded-xl border border-teal-border bg-white p-3">
        <p className="text-[10px] font-semibold text-teal-muted uppercase tracking-[0.65px] mb-2">
          Procedimientos ({numProcedimientos})
        </p>
        {numProcedimientos === 0 ? (
          <p className="text-[11px] text-teal-light text-center py-1.5">Sin procedimientos</p>
        ) : (
          <p className="text-[12px] text-[#1a3a3a]">
            {numProcedimientos} procedimiento{numProcedimientos !== 1 ? 's' : ''} · Total{' '}
            <span className="font-semibold text-primary">{fmt(total)}</span>
          </p>
        )}
      </div>

      {/* Lista de pagos */}
      {pagos.length > 0 && (
        <div className="rounded-xl border border-teal-border bg-white p-3">
          <p className="text-[10px] font-semibold text-teal-muted uppercase tracking-[0.65px] mb-2.5">
            Pagos ({pagos.length})
          </p>
          <div className="flex flex-col divide-y divide-teal-soft">
            {pagos.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0">
                <div>
                  <p className="text-[11.5px] font-medium text-[#1a3a3a]">{p.metodo}</p>
                  <p className="text-[10px] text-teal-muted">{p.fecha}</p>
                </div>
                <span className="text-[11.5px] font-semibold text-emerald-600 tabular-nums">
                  {fmt(p.monto)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nota */}
      {total === 0 && numProcedimientos === 0 && (
        <p className="text-[10.5px] text-teal-light text-center px-2">
          Agrega procedimientos para ver el resumen financiero.
        </p>
      )}
    </div>
  );
}
