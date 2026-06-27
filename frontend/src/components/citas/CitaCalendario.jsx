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
    <div className="bg-white border border-teal-border rounded-xl overflow-hidden">

      {/* Header del calendario */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-teal-soft">
        <button type="button" onClick={() => navMes(-1)}
          className="p-1.5 rounded-lg border border-teal-border hover:bg-teal-soft transition-colors cursor-pointer bg-white">
          <ChevronLeft size={15} className="text-primary" />
        </button>

        <h3 className="text-[14px] font-medium text-primary">
          {MESES[mes]} {anio}
        </h3>

        <button type="button" onClick={() => navMes(1)}
          className="p-1.5 rounded-lg border border-teal-border hover:bg-teal-soft transition-colors cursor-pointer bg-white">
          <ChevronRight size={15} className="text-primary" />
        </button>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 border-b border-teal-soft">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="py-2 text-center text-[11px] font-medium text-teal-muted uppercase tracking-[0.5px]">
            {d}
          </div>
        ))}
      </div>

      {/* Grid de días */}
      <div className="grid grid-cols-7">
        {diasGrid.map((dia, idx) => {
          if (!dia) return <div key={`empty-${idx}`} className="h-20 border-b border-r border-teal-soft bg-[#FAFEFE]" />;

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
                'h-20 border-b border-r border-teal-soft p-1.5 flex flex-col cursor-pointer',
                'transition-colors duration-150 relative',
                esSelec  ? 'bg-teal-soft'   : 'hover:bg-[#F7FDFD]',
                !tieneCitas && 'cursor-default',
              ].join(' ')}
            >
              {/* Número del día */}
              <span className={[
                'text-[12px] font-medium w-6 h-6 flex items-center justify-center rounded-full',
                esHoy    ? 'bg-primary text-white'      :
                esSelec  ? 'text-primary'               :
                'text-[#1a3a3a]',
              ].join(' ')}>
                {dia}
              </span>

              {/* Puntos de citas (máx 3 visibles) */}
              <div className="flex flex-col gap-0.5 mt-0.5 flex-1 overflow-hidden">
                {citasDia.slice(0, 3).map((c) => {
                  const est = ESTADO_ESTILOS[c.estado];
                  return (
                    <div key={c.id}
                      className={`text-[9px] font-medium px-1 py-0.5 rounded truncate ${est?.badge}`}>
                      {c.hora} {c.pacienteNombre.split(' ')[0]}
                    </div>
                  );
                })}
                {citasDia.length > 3 && (
                  <span className="text-[9px] text-teal-muted px-1">+{citasDia.length - 3} más</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Panel de citas del día seleccionado */}
      {diaSeleccionado && citasDiaSeleccionado.length > 0 && (
        <div className="border-t border-teal-soft px-5 py-4 bg-teal-panel">
          <p className="text-[12px] font-medium text-primary mb-3">
            Citas del {diaSeleccionado} de {MESES[mes]}
          </p>
          <div className="flex flex-col gap-2">
            {citasDiaSeleccionado.map((c) => {
              const est = ESTADO_ESTILOS[c.estado];
              return (
                <div key={c.id}
                  className={`flex items-center gap-3 bg-white border-l-4 ${est?.border} border border-teal-border rounded-lg px-3 py-2.5`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-primary truncate">{c.pacienteNombre}</p>
                    <p className="text-[11px] text-teal-muted">{c.hora} · {c.motivo} · {c.doctor}</p>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${est?.badge}`}>
                    {c.estado}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {diaSeleccionado && citasDiaSeleccionado.length === 0 && (
        <div className="border-t border-teal-soft px-5 py-4 text-center text-[12px] text-teal-muted">
          Sin citas para el {diaSeleccionado} de {MESES[mes]}
        </div>
      )}
    </div>
  );
}