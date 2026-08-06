// src/components/citas/CitaCalendario.jsx
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ESTADO_ESTILOS } from '../../data/citasData';

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function getDiasDelMes(year, month) {
  const primerDia = new Date(year, month, 1).getDay();
  const totalDias = new Date(year, month + 1, 0).getDate();
  return { primerDia, totalDias };
}

function toYMD(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

/**
 * @param {object}   props
 * @param {Array}    props.citas      - Lista completa de citas
 * @param {function} props.onDiaClick - Callback al hacer clic en un día con citas
 */
export default function CitaCalendario({ citas, onDiaClick }) {
  const hoy = new Date();
  const [mes, setMes]   = useState(hoy.getMonth());
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);

  const { primerDia, totalDias } = getDiasDelMes(anio, mes);

  function navMes(dir) {
    const fecha = new Date(anio, mes + dir, 1);
    setMes(fecha.getMonth());
    setAnio(fecha.getFullYear());
    setDiaSeleccionado(null);
  }

  function citasDelDia(dia) {
    const fechaStr = `${anio}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
    return citas.filter((c) => c.fecha === fechaStr);
  }

  const hoyStr = toYMD(hoy);
  const diasGrid = Array.from({ length: primerDia }, () => null)
    .concat(Array.from({ length: totalDias }, (_, i) => i + 1));

  const citasDiaSeleccionado = diaSeleccionado ? citasDelDia(diaSeleccionado) : [];

  return (
    <div className="bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-2xl overflow-hidden shadow-soft-sm">

      {/* Header del calendario */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-teal-soft dark:border-dark-border bg-teal-panel/40 dark:bg-slate-800/40">
        <button type="button" onClick={() => navMes(-1)}
          className="p-1.5 rounded-lg border border-teal-border dark:border-dark-border hover:bg-teal-soft dark:hover:bg-slate-700 transition-colors cursor-pointer bg-white dark:bg-dark-input text-primary dark:text-dark-text shadow-soft-sm">
          <ChevronLeft size={16} />
        </button>

        <h3 className="text-[14px] font-bold text-primary dark:text-dark-text">
          {MESES[mes]} {anio}
        </h3>

        <button type="button" onClick={() => navMes(1)}
          className="p-1.5 rounded-lg border border-teal-border dark:border-dark-border hover:bg-teal-soft dark:hover:bg-slate-700 transition-colors cursor-pointer bg-white dark:bg-dark-input text-primary dark:text-dark-text shadow-soft-sm">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 border-b border-teal-soft dark:border-dark-border bg-teal-panel/10 dark:bg-slate-800/10">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="py-2 text-center text-[11px] font-bold text-teal-muted dark:text-slate-400 uppercase tracking-[0.5px]">
            {d}
          </div>
        ))}
      </div>

      {/* Grid de días */}
      <div className="grid grid-cols-7 divide-x divide-y divide-teal-soft dark:divide-dark-border/80 border-t border-l border-teal-soft dark:border-dark-border/80">
        {diasGrid.map((dia, idx) => {
          if (!dia) return <div key={`empty-${idx}`} className="h-20 bg-teal-bg/30 dark:bg-slate-900/20" />;

          const fechaStr = `${anio}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
          const citasDia = citasDelDia(dia);
          const esHoy    = fechaStr === hoyStr;
          const esSelec  = diaSeleccionado === dia;
          const tieneCitas = citasDia.length > 0;

          return (
            <div
              key={dia}
              onClick={() => { setDiaSeleccionado(dia === diaSeleccionado ? null : dia); if (tieneCitas) onDiaClick?.(citasDia); }}
              className={[
                'h-20 p-1.5 flex flex-col cursor-pointer transition-colors duration-150 relative',
                esSelec  ? 'bg-teal-soft/80 dark:bg-slate-850'   : 'hover:bg-teal-panel/30 dark:hover:bg-slate-800/20',
                !tieneCitas && 'cursor-default',
              ].join(' ')}
            >
              {/* Número del día */}
              <span className={[
                'text-[12px] font-semibold w-6 h-6 flex items-center justify-center rounded-full',
                esHoy    ? 'bg-primary dark:bg-teal text-white dark:text-slate-900 font-bold shadow-soft-sm' :
                esSelec  ? 'text-primary dark:text-teal font-bold' :
                'text-primary dark:text-dark-text',
              ].join(' ')}>
                {dia}
              </span>

              {/* Puntos de citas (máx 3 visibles) */}
              <div className="flex flex-col gap-1 mt-1 flex-1 overflow-hidden">
                {citasDia.slice(0, 3).map((c) => {
                  const est = ESTADO_ESTILOS[c.estado];
                  return (
                    <div key={c.id}
                      className={`text-[9px] font-semibold px-1 py-0.5 rounded truncate ${est?.badge}`}
                      title={`${c.hora} - ${c.pacienteNombre}`}>
                      {c.hora} {c.pacienteNombre.split(' ')[0]}
                    </div>
                  );
                })}
                {citasDia.length > 3 && (
                  <span className="text-[9px] text-teal-muted dark:text-slate-400 font-bold px-1 mt-0.5">+{citasDia.length - 3} más</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Panel de citas del día seleccionado */}
      {diaSeleccionado && citasDiaSeleccionado.length > 0 && (
        <div className="border-t border-teal-soft dark:border-dark-border px-5 py-4 bg-teal-panel/40 dark:bg-slate-800/40">
          <p className="text-[12.5px] font-bold text-primary dark:text-dark-text mb-3">
            Citas del {diaSeleccionado} de {MESES[mes]}
          </p>
          <div className="flex flex-col gap-2">
            {citasDiaSeleccionado.map((c) => {
              const est = ESTADO_ESTILOS[c.estado];
              return (
                <div key={c.id}
                  className={`flex items-center gap-3 bg-white dark:bg-dark-card border-l-4 ${est?.border} border border-teal-border dark:border-dark-border rounded-xl px-3 py-2.5 shadow-soft-xs`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-semibold text-primary dark:text-dark-text truncate">{c.pacienteNombre}</p>
                    <p className="text-[11px] text-teal-muted dark:text-slate-400 mt-0.5">{c.hora} · {c.motivo} · {c.doctor}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full flex-shrink-0 ${est?.badge}`}>
                    {c.estado}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {diaSeleccionado && citasDiaSeleccionado.length === 0 && (
        <div className="border-t border-teal-soft dark:border-dark-border px-5 py-5 text-center text-[12px] text-teal-muted dark:text-slate-400 font-semibold bg-teal-panel/10 dark:bg-slate-800/10">
          Sin citas para el {diaSeleccionado} de {MESES[mes]}
        </div>
      )}
    </div>
  );
}