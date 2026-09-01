# INFORME DE COBERTURA Y CALIDAD FINAL (API BACKEND ORALYN)

Este documento consolida el estado final de la calidad, seguridad y cobertura funcional de la API del backend de Oralyn, compilando las auditorías, hallazgos, correcciones y pruebas de regresión realizadas a lo largo de los Sprints 2 al 9 de estabilización.

---

## 1. Resumen Ejecutivo

Al concluir la fase de estabilización (Sprint 9), la suite del backend de Oralyn reporta un estado **100% estable, seguro y libre de fallos conocidos**:

* **Pruebas Totales Ejecutadas:** 196
* **Pruebas Exitosas (PASS):** 196
* **Pruebas Fallidas (FAIL):** 0
* **Regresiones Activas:** 0
* **Duración Promedio de la Suite:** ~65.53 segundos (ejecutada de manera secuencial).

Toda la superficie expuesta por la API ha sido robustecida contra accesos cruzados no autorizados (*cross-tenant*) y cuenta con validaciones de tipo, fecha y formato en todos sus flujos de entrada críticos.

---

## 2. Arquitectura Evaluada

El sistema bajo análisis comprende los siguientes componentes fundamentales:

* **Framework de Aplicación:** **Express (Node.js)** con enrutamiento modular y manejo de error centralizado.
* **Capa de Persistencia:** **Prisma ORM** interactuando con una base de datos relacional **PostgreSQL** (Supabase).
* **Control de Acceso:** Autenticación y autorización basada en tokens **JWT**, portando la identidad del usuario y su pertenencia corporativa (`consultorio_id`).
* **Modularidad del Enrutador:** Rutas desacopladas por dominio funcional (Pacientes, Historias Clínicas, Citas, etc.), protegidas por el middleware global `verificarToken`.
* **Arnés de Pruebas Integradas:** Infraestructura de test (`test/helpers/appHarness.js`) que levanta dinámicamente instancias limpias del servidor Express en puertos aleatorios efímeros, acoplada a un mock in-memory (`test/helpers/mockPrisma.js`) que intercepta y valida las llamadas a base de datos de forma aislada.

---

## 3. Estrategia de Pruebas

La validación y estabilización del backend se fundamentó en una estrategia multinivel:

* **Pruebas de Integración (Integration Testing):** Ejecución de flujos HTTP de extremo a extremo simulando clientes reales. Se valida la interacción completa entre enrutadores, controladores y base de datos (simulada por el mock).
* **Pruebas de Seguridad (Isolation Testing):** Pruebas dirigidas específicamente a vulnerar el aislamiento multi-consultorio (*cross-tenant*), verificando que usuarios del *Consultorio A* no puedan leer, editar, anular o borrar información perteneciente al *Consultorio B*.
* **Pruebas de Validación (Input Validation Testing):** Aserción de límites en los datos de entrada (bloqueo de campos obligatorios vacíos o formados por espacios en blanco, rangos incorrectos de fechas y catálogos de tipos permitidos).
* **Pruebas de Regresión (Regression Testing):** Ejecución constante y serializada de la suite de pruebas completa después de cada cambio en el código para asegurar que las correcciones del Sprint 8 no introdujeran nuevos fallos en rutas funcionales previas.
* **Virtualización del Estado (Prisma Mock):** El archivo `mockPrisma.js` actúa como base de datos virtual en memoria, manteniendo la consistencia relacional y aplicando lógica de filtros anidados para garantizar la fiabilidad del testing sin requerir infraestructura externa.

---

## 4. Cobertura Funcional por Módulo

Dado que no se ejecutó una herramienta de cobertura porcentual de código fuente (como Istanbul/nyc), el alcance medido corresponde a **cobertura funcional de casos de prueba**, abarcando las siguientes áreas y reglas de negocio:

* **Autenticación (`/api/auth`):** Registro de usuarios vinculados a consultorios, credenciales duplicadas, login con generación de JWT, validación de firmas manipuladas, tokens malformados y expirados.
* **Pacientes (`/api/pacientes`):** Creación transaccional con inicialización automática de historia clínica, búsqueda de pacientes, control de acceso cruzado y borrado en cascada (transaccional) de entidades anidadas.
* **Historias Clínicas (`/api/historias`):** Creación de antecedentes y exámenes estomatológicos, registro y actualización de odontogramas, subida y descarga de archivos adjuntos, aislamiento multi-consultorio estricto en cada recurso de la historia y sus evoluciones asociadas.
* **Citas (`/api/citas`):** Agenda de citas médicas, transiciones de estado controladas (`pendiente`, `asistio`, `no_asistio`, `cancelada`), y filtrado de agenda diaria.
* **Cotizaciones (`/api/cotizaciones`):** Creación de tratamientos odontológicos, cálculo automático de subtotales, totales, abonos y saldos remanentes, y protección contra cotizaciones cruzadas.
* **Pagos (`/api/pagos`):** Registro de abonos financieros contra cotizaciones específicas, actualizando de forma coherente el saldo acumulado del paciente.
* **Consentimientos (`/api/consentimientos`):** Emisión de actas firmadas por tipo de procedimiento, flujo de anulación formal y borrado físico de actas de consentimiento.
* **Certificados (`/api/certificados`):** Generación de certificados dentales de asistencia a citas, anulación y eliminación física de actas.
* **PDFs (`/api/pdf` / `/api/certificados/:id/pdf` etc.):** Generación al vuelo de archivos PDF con estructura binaria correcta a partir de historias clínicas, cotizaciones, certificados y consentimientos, incluyendo resiliencia ante imágenes de logo corruptas u omitidas.
* **Dashboard (`/api/dashboard`):** Cálculo agregado de métricas financieras (deudas netas, pacientes morosos) y resúmenes diarios de citas, filtrados rigurosamente por consultorio.
* **Configuración (`/api/configuracion`):** Lectura, creación y actualización de los parámetros institucionales del consultorio.
* **Administración (`/api/admin`):** Creación aislada de consultorios atómicamente y control estricto de accesos administrativos mediante la cabecera secreta `x-admin-secret`.

---

## 5. Resultados de las Pruebas (Fase Final)

El resultado consolidado del Sprint 9 demuestra la estabilidad absoluta del sistema:

* **Pruebas Ejecutadas:** 196
* **Pruebas Aprobadas (PASS):** 196
* **Pruebas Fallidas (FAIL):** 0
* **Regresiones:** 0
* **Tiempo de Ejecución:** 65.53 segundos (concurrencia serializada = 1).
* **Módulos con 100% de éxito:** `auth.test.js`, `admin.test.js`, `pacientes.test.js`, `historias.test.js`, `citas.test.js`, `cotizaciones.test.js`, `consentimientos.test.js`, `certificados.test.js`, `configuracion.test.js`, `dashboard.test.js`, `pdf.test.js`.

---

## 6. Defectos Encontrados (Sprints 2 al 7)

A lo largo del proceso de auditoría y QA, se identificaron y catalogaron **23 defectos reales** (se descartó 1 falso positivo):

### Clasificación y Severidad de los Defectos

| ID | Clasificación | Severidad | Módulo Afectado | Endpoint |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-001** | Vulnerabilidad de Seguridad | Crítica | Historias Clínicas | `PUT /api/historias/:id` |
| **SEC-002** | Vulnerabilidad de Seguridad | Crítica | Historias Clínicas | `POST /api/historias/:historiaId/evoluciones` |
| **SEC-003** | Vulnerabilidad de Seguridad | Crítica | Historias Clínicas | `PUT /api/historias/:historiaId/evoluciones/:evolucionId` |
| **SEC-004** | Vulnerabilidad de Seguridad | Crítica | Historias Clínicas | `DELETE /api/historias/:historiaId/evoluciones/:evolucionId` |
| **SEC-005** | Vulnerabilidad de Seguridad | Crítica | Historias Clínicas | `PUT /api/historias/:historiaId/odontograma` |
| **SEC-006** | Vulnerabilidad de Seguridad | Crítica | Historias Clínicas | `POST /api/historias/:historiaId/adjuntos` |
| **SEC-007** | Vulnerabilidad de Seguridad | Crítica | Historias Clínicas | `GET /api/historias/:historiaId/adjuntos` |
| **SEC-008** | Vulnerabilidad de Seguridad | Crítica | Historias Clínicas | `DELETE /api/historias/:historiaId/adjuntos/:adjuntoId` |
| **SEC-009** | *Descartado / Falso Positivo* | - | Historias Clínicas | `GET /api/historias/:id/pdf` |
| **SEC-010** | Vulnerabilidad de Seguridad | Crítica | Consentimientos | `PATCH /api/consentimientos/:id/anular` |
| **SEC-011** | Vulnerabilidad de Seguridad | Crítica | Consentimientos | `DELETE /api/consentimientos/:id` |
| **SEC-012** | Vulnerabilidad de Seguridad | Crítica | Certificados | `POST /api/certificados` |
| **SEC-013** | Vulnerabilidad de Seguridad | Crítica | Certificados | `GET /api/certificados/paciente/:pacienteId` |
| **SEC-014** | Vulnerabilidad de Seguridad | Crítica | Certificados | `PATCH /api/certificados/:id/anular` |
| **SEC-015** | Vulnerabilidad de Seguridad | Crítica | Certificados | `DELETE /api/certificados/:id` |
| **SEC-016** | Vulnerabilidad de Seguridad | Crítica | Certificados | `GET /api/certificados/:id/pdf` |
| **BUG-001** | Bug de Validación | Alta | Pacientes | `POST /api/pacientes` |
| **BUG-002** | Bug de Validación | Alta | Pacientes | `POST /api/pacientes` |
| **BUG-003** | Bug de Validación | Alta | Pacientes | `POST /api/pacientes` |
| **BUG-004** | Bug de Manejo de Errores | Media | Pacientes (Global) | `POST /api/pacientes` (Express Router) |
| **BUG-005** | Bug de Validación | Alta | Historias Clínicas | `POST /api/historias/:pacienteId` |
| **BUG-006** | Bug de Validación | Media | Citas | `GET /api/citas` (Filtro `?fecha=`) |
| **BUG-007** | Bug Funcional | Alta | Citas | `GET /api/citas` (Filtro `?fecha=`) |
| **BUG-008** | Bug Funcional | Alta | Configuración | `POST /api/configuracion` |

---

## 7. Defectos Corregidos (Sprint 8)

A continuación se detallan las correcciones aplicadas para cada uno de los 23 defectos reales identificados:

### Módulo: Historias Clínicas
* **`SEC-001`**: `PUT /api/historias/:id` permitía modificar historias de otros consultorios.
  * *Corrección:* Se añadió un paso de validación previo que consulta la historia por ID e incluye su paciente, verificando que `paciente.consultorio_id === req.usuario.consultorio_id` antes de hacer el update.
  * *Prueba:* `Aislamiento: PUT /api/historias/:id — no permite modificar historia de otro consultorio (BUG DE SEGURIDAD)` en `historias.test.js`.
* **`SEC-002`, `SEC-003`, `SEC-004`, `SEC-005`, `SEC-006`, `SEC-007`, `SEC-008`**: Operaciones cruzadas en evoluciones, odontogramas y adjuntos.
  * *Corrección:* En todos los endpoints anidados se introdujo una búsqueda previa de la historia clínica (`historiaClinica.findUnique`) con inclusión de la relación `paciente`, validando la pertenencia al consultorio autenticado antes de ejecutar transacciones o lecturas secundarias.
  * *Pruebas:* Serie de tests de `Aislamiento` en `historias.test.js` (Líneas 231 a 297).
* **`BUG-005`**: Permisión de creación de historias con espacios en blanco en campos clave.
  * *Corrección:* Aplicación de `.trim()` sobre `motivo_consulta` y `diagnostico` en `POST /:pacienteId` previo a evaluar su obligatoriedad.
  * *Prueba:* `Validación: POST /api/historias/:pacienteId — motivo con solo espacios retorna 400`.

### Módulo: Consentimientos Informados
* **`SEC-010`, `SEC-011`**: Anulación y borrado de actas de otras clínicas.
  * *Corrección:* Se valida en base de datos mediante `findUnique` que el consentimiento pertenezca al `consultorio_id` del usuario autenticado; en caso negativo, se retorna `403 Forbidden`.
  * *Pruebas:* `Aislamiento: PATCH /api/consentimientos/:id/anular...` y `DELETE /api/consentimientos/:id...` en `consentimientos.test.js`.

### Módulo: Certificados Dentales
* **`SEC-012` a `SEC-016`**: Creación, lectura, anulación, eliminación y PDF de certificados de otros consultorios.
  * *Corrección:* Incorporación de chequeos contra la tabla `paciente` y el `consultorio_id` en las rutas `POST /`, `GET /paciente/:pacienteId` (filtrado y retorno seguro de lista vacía), `PATCH /:id/anular`, `DELETE /:id` y `GET /:id/pdf`.
  * *Pruebas:* Tests de `Aislamiento` correspondientes en `certificados.test.js`.

### Módulo: Pacientes
* **`BUG-001`, `BUG-002`, `BUG-003`**: Creación con documentos espaciados, tipo_documento no catalogado o fechas inválidas.
  * *Corrección:* Sanitización estricta mediante `.trim()`, aserción contra el arreglo de tipos válidos colombianos (`['CC', 'CE', 'TI', 'RC', 'PEP', 'PPT', 'PAS']`), y control estructural con `isNaN(Date.parse(...))` sobre el campo `fecha_nacimiento`.
  * *Pruebas:* Casos de `Validación` en `pacientes.test.js`.
* **`BUG-004`**: El parser JSON global retornaba error `500` ante payloads JSON inválidos/rotos.
  * *Corrección:* Captura específica en el middleware centralizado `errorHandler.js` interceptando instancias de `SyntaxError` con estatus `400` para retornar ordenadamente `400 Bad Request`.
  * *Prueba:* `Validación: POST /api/pacientes — JSON incorrecto retorna 400`.

### Módulo: Citas
* **`BUG-006`, `BUG-007`**: Filtro de fecha diario vulnerable a desfases de zona horaria local y falta de control ante fechas malformadas.
  * *Corrección:* Validación de la fecha de consulta arrojando `400` ante valores no parseables, y reconstrucción absoluta del rango de horas del día en UTC (`Date.UTC(y, m, d, 0, 0, 0, 0)`) para asegurar búsquedas exactas con independencia de la zona horaria del servidor de pruebas.
  * *Pruebas:* `Filtros Fecha: Rango válido (fecha específica)` y `Filtros Fecha: Rango inválido (fecha malformada)...` en `citas.test.js`.

### Módulo: Configuración
* **`BUG-008`**: La configuración se guardaba con una secuencia autoincremental desvinculada de la clínica.
  * *Corrección:* Forzado manual del campo `id: req.usuario.consultorio_id` en el método `prisma.configuracion.create` para reflejar la relación 1:1.
  * *Prueba:* `POST /api/configuracion — creación vincula el id al consultorio_id del usuario (BUG DE LÓGICA)`.

---

## 8. Seguridad Multi-Consultorio (Aislamiento Cross-Tenant)

La arquitectura multi-consultorio de Oralyn se basa en que los usuarios (`Usuario`) y los recursos principales pertenecen a un consultorio (`consultorio_id`). La fase de estabilización reveló una falta generalizada de controles de pertenencia sobre recursos anidados o secundarios (evoluciones, adjuntos, certificados, odontogramas y consentimientos), los cuales dependían únicamente de IDs autoincrementales globales expuestos.

### Hallazgos de Aislamiento
Antes de las correcciones, cualquier usuario autenticado de la clínica `A` podía modificar el historial de la clínica `B` enviando el ID correcto del recurso anidado en el cuerpo o la URL de la petición.

### Mitigación y Validación
La mitigación consistió en condicionar todas las consultas y escrituras a una doble validación:
1. Confirmación de pertenencia del recurso principal a través de joins relacionales en tiempo de consulta.
2. Bloqueo inmediato con código de estado `403 Forbidden` si la comprobación falla.

Este aislamiento fue validado mediante **18 pruebas automatizadas de seguridad** que intentan inyectar y alterar información de consultorios ajenos de forma deliberada, reportando un éxito total del **100% de efectividad en el aislamiento**.

---

## 9. Regresión Final

Tras la aplicación del lote de correcciones de la fase 8, se ejecutó una regresión total secuencial con el siguiente comando:
```bash
node --test --test-concurrency=1
```
* **Estado:** **Aprobado**.
* **Pruebas PASSED:** 196/196.
* **Pruebas FAILED:** 0.
* No se identificaron regresiones ni afectaciones a flujos heredados sanos.

---

## 10. Riesgos Pendientes

A pesar de contar con una suite de pruebas exitosa, se deben considerar los siguientes límites y riesgos remanentes:

### Limitaciones de la Estrategia de Mock
* El motor Prisma está simulado en memoria (`mockPrisma.js`). Esto significa que las restricciones físicas de clave externa de Postgres, el comportamiento de concurrencia real y el bloqueo de transacciones complejas no han sido simuladas de forma exacta.
* Las conversiones de zona horaria se han blindado a nivel lógico en la API, pero el comportamiento real puede variar dependiendo del huso horario configurado en el motor de base de datos PostgreSQL de producción.

### Aspectos que Requieren Pruebas en Entorno Real
* Pruebas de integración sobre un entorno de base de datos PostgreSQL clonado (Staging) para validar el comportamiento real del motor relacional.
* Pruebas de resiliencia del sistema de archivos al descargar y almacenar adjuntos reales fuera de la memoria mockeada.

---

## 11. Recomendaciones Técnicas

Para el escalamiento y la mejora continua del aseguramiento de calidad del backend de Oralyn, se proponen las siguientes acciones:

1. **Integración de Medición de Cobertura (Code Coverage):** Configurar `nyc` / Istanbul acoplado al test runner nativo de Node.js para obtener informes formales del porcentaje de líneas y funciones de código fuente cubiertas por las pruebas.
2. **Pruebas de Integración con Base de Datos Real (Integration/E2E):** Implementar contenedores Docker temporales con PostgreSQL (p. ej. usando Testcontainers) para correr la suite de pruebas contra un motor relacional real de forma automatizada en el pipeline de Integración Continua (CI).
3. **Mantenimiento del Arnés contra Port Clashing:** Mantener la asignación de puertos aleatorios efímeros (`server.listen(0)`) y el cierre forzado de conexiones mediante `server.closeAllConnections()` introducido en `appHarness.js`, previniendo fugas de sockets y fallos del motor de Node.js.
4. **Análisis de Código Estático (Linter/SAST):** Incorporar herramientas como ESLint o SonarQube para detectar posibles problemas de seguridad o lógicas redundantes de forma estática antes de la fase de testing.
