import { useEffect, useRef } from 'react';
import SignaturePad from 'signature_pad';

export function useSignaturePad(dependencia) {
  const canvasRef = useRef(null);
  const padRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;

    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;

    const context = canvas.getContext('2d');

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.scale(ratio, ratio);

    padRef.current = new SignaturePad(canvas, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor: 'rgb(26, 58, 58)',
    });

    return () => {
      padRef.current?.off();
      padRef.current = null;
    };
  }, [dependencia]);

  function limpiar() {
    padRef.current?.clear();
  }

  function obtenerImagen() {
    if (!padRef.current || padRef.current.isEmpty()) return '';
    return padRef.current.toDataURL('image/png');
  }

  return { canvasRef, limpiar, obtenerImagen };
}