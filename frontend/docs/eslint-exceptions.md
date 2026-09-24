# Excepciones de ESLint documentadas

## `react-hooks/set-state-in-effect`

Esta regla (parte de `eslint-plugin-react-hooks` v7, alineada con las reglas del
React Compiler) marca cualquier llamada a un setter de estado (`setX(...)`)
que ocurra de forma síncrona dentro del cuerpo de un `useEffect`. La
justificación de la regla es evitar el patrón "leer una prop/estado y volcarlo
sincrónicamente a otro estado", que puede producir renders en cascada
innecesarios.

### Por qué "cargar datos al montar/actualizar" es una excepción aceptada

El proyecto usa consistentemente este patrón para cargar datos desde la API:

```jsx
async function cargarX() {
  setLoading(true);
  try {
    const data = await api.getX();
    setDatos(data);
  } catch (err) {
    setError('...');
  } finally {
    setLoading(false);
  }
}

useEffect(() => {
  cargarX(); // o inline: setLoading(true); api.getX().then(...)
}, []); // o con dependencias de filtros/paginación
```

Aquí el `setState` no está sincronizando datos derivables de una prop en el
mismo render — está iniciando un efecto secundario real (una petición HTTP)
cuyo resultado llega de forma asíncrona. No hay una alternativa sin `useEffect`
que tenga sentido para este caso (no es un valor derivable con `useMemo`, ni
algo que se pueda calcular durante el render). El "render en cascada" que la
regla busca prevenir es, en este caso, exactamente el comportamiento deseado:
mostrar el estado de carga inmediatamente y luego los datos cuando lleguen.

Este patrón se documenta como excepción aceptada del proyecto y se silencia
línea por línea con:

```js
// eslint-disable-next-line react-hooks/set-state-in-effect -- Patrón aceptado: carga de datos al montar componente, ver docs/eslint-exceptions.md
```

Se eligió silenciar por línea (en vez de una regla global en
`eslint.config.js` o un override por carpeta) para no perder visibilidad de
casos *nuevos*: cualquier violación futura de esta regla en un archivo nuevo o
en un patrón distinto seguirá apareciendo en `npm run lint` y deberá evaluarse
caso por caso — no queda oculta por una excepción de alcance amplio.

Los demás casos de `react-hooks/set-state-in-effect` que reporta el linter
(sincronizar un formulario con una prop de edición, resetear estado de UI al
cerrar un modal, seleccionar un elemento activo según la URL, etc.) **no**
están cubiertos por esta excepción y siguen apareciendo como errores a
resolver.

### Archivos y líneas con la excepción aplicada (18)

| # | Archivo | Línea (al momento de aplicar la excepción) |
|---|---|---|
| 1 | `src/components/configuracion/ProfesionalesSeccion.jsx` | 253 |
| 2 | `src/components/insumos/AlertasInsumosWidget.jsx` | 35 |
| 3 | `src/components/insumos/InsumoDetalleModal.jsx` | 66 |
| 4 | `src/components/insumos/InsumosSeccion.jsx` | 57 |
| 5 | `src/pages/Auditoria.jsx` | 66 |
| 6 | `src/pages/Configuracion.jsx` | 797 (`loadConfiguracion`) |
| 7 | `src/pages/Configuracion.jsx` | 1319 (`cargarUsuarios`) |
| 8 | `src/pages/Dashboard.jsx` | 82 |
| 9 | `src/pages/Facturacion.jsx` | 101 |
| 10 | `src/pages/Rips.jsx` | 78 |
| 11 | `src/pages/Superadmin.jsx` | 58 |
| 12 | `src/components/citas/CitaForm.jsx` | 80 (`setLoadingCie10`) |
| 13 | `src/components/citas/CitaForm.jsx` | 154 (`setCotizacionesPendientes`) |
| 14 | `src/components/facturacion/GenerarFacturaModal.jsx` | 95 (`setLoadingOrigen`) |
| 15 | `src/context/Appcontext.jsx` | 200 (`setLoadingPacientes`) |
| 16 | `src/context/Appcontext.jsx` | 236 (`setLoadingProcedimientos`) |
| 17 | `src/pages/Configuracion.jsx` | 108 (`setLoadingOficial`) |
| 18 | `src/pages/Historias.jsx` | 179 (`setLoadingH`) |

Los 7 casos marcados como carga inline (12-18, excepto 6, 7, que ya usan una
función nombrada) llaman al `setState` de "loading" directamente en el cuerpo
del efecto en vez de a través de una función `cargarX()`/`fetchX()` separada,
pero cumplen el mismo propósito (iniciar una carga de datos) y se tratan como
la misma excepción.
