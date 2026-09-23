export function esNumeroValido(valor) {
  return valor !== undefined && valor !== '' && !isNaN(Number(valor)) && Number(valor) >= 0;
}

export function formatearFecha(fechaStr, fallback = 'Sin fecha') {
  if (!fechaStr) return fallback;
  try {
    const f = new Date(fechaStr);
    if (isNaN(f.getTime())) return fallback;
    return f.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return fallback;
  }
}

export function formatearFechaHora(fechaStr, fallback = '—') {
  if (!fechaStr) return fallback;
  try {
    const f = new Date(fechaStr);
    if (isNaN(f.getTime())) return fallback;
    return f.toLocaleString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return fallback;
  }
}
