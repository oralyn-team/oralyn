# ANÁLISIS DE BRECHAS DE SEGURIDAD (SECURITY_GAP_ANALYSIS.md)

> **Nota:** Este documento es una fotografía de la auditoría original. El estado
> vivo y actualizado de cada hallazgo se mantiene en `BUG_DATABASE.md`. Consulta
> ese archivo para el estado actual antes de asumir que algo aquí sigue abierto.

Este informe presenta la auditoría técnica de seguridad detallada para la plataforma **ORALYN**, evaluando los controles de protección de datos, aislamiento multi-tenant, gestión de identidades, almacenamiento de secretos, registro de eventos y resiliencia de la infraestructura.

---

## 1. Resumen Ejecutivo

La auditoría técnica del backend y frontend de **ORALYN** confirma que los controles de aislamiento multi-tenant (*cross-tenant isolation*) y control de accesos a nivel de API han sido **robusta y exitosamente implementados** durante las fases previas de estabilización. 

Sin embargo, existen brechas significativas en la gestión de sesiones (verificación 100% apátrida sin revocación), políticas de contraseñas (ausencia de validaciones de complejidad), registro de eventos de auditoría (logs de seguridad inexistentes) y en la formalización de planes de contingencia (copias de seguridad verificadas, planes de recuperación ante desastres y respuesta ante incidentes).

---

## 2. Matriz de Estado de Seguridad

A continuación se resume el estado actual de cada dimensión de seguridad evaluada:

| Área | Estado | Severidad | Evidencia | Archivo/Ubicación | Acción Requerida |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Cross-tenant** | ✅ IMPLEMENTADO | Baja (Estable) | 18 pruebas automatizadas de seguridad que intentan inyectar y alterar información de otros consultorios aprueban al 100%. | `backend/src/routes/` y `backend/test/integration/` | Ninguna en producción. Mantener el monitoreo en nuevas rutas. |
| **Logs de Seguridad** | ❌ NO IMPLEMENTADO | Alta | Únicamente existen `console.error` dentro de bloques `catch` de excepciones genéricas. No hay registros de logins, cambios de clave ni accesos 401/403. | `backend/src/` | Implementar un middleware de auditoría estructurado (ej. Winston/Bunyan) para registrar eventos críticos. |
| **Sesiones** | ⚠️ PARCIAL | Alta | JWT firmado expira en 8 horas, pero la verificación es 100% apátrida (stateless). No hay logout en backend ni forma de revocar sesiones activas. | `backend/src/middlewares/auth.js` | Implementar una lista negra (blacklist) de tokens en Redis/Base de datos o usar tokens de refresco con almacenamiento en cookies HTTP-only. |
| **Contraseñas** | ⚠️ PARCIAL | Media | Se utiliza `bcryptjs` con factor de coste de 10. No obstante, no se valida longitud mínima, caracteres especiales, ni diccionarios de claves débiles en el registro. | `backend/src/routes/auth.js` | Añadir reglas de validación de complejidad de contraseñas en el registro de usuarios. |
| **Secretos (Admin)** | ✅ RESUELTO | Baja (Estable) | Reemplazado por autenticación de administradores en BD y JWT con clave dedicada (`JWT_ADMIN_SECRET`). El secreto estático `ADMIN_SECRET` fue eliminado. | `backend/.env` y `backend/src/` | Asegurar la rotación periódica de las claves de firma JWT. |
| **Backups** | ⚠️ PARCIAL | Media | Supabase realiza copias de seguridad de forma nativa a nivel de proveedor, pero ORALYN carece de una estrategia de verificación de restauración autónoma. | Proveedor Cloud (Supabase) | Establecer y documentar pruebas periódicas de restauración de bases de datos. |
| **Disaster Recovery** | ❌ NO IMPLEMENTADO | Media | No existe documentación de objetivos RTO, RPO, ni procedimientos formales de recuperación ante caídas de infraestructura. | Raíz del proyecto | Elaborar el Plan de Recuperación ante Desastres (Disaster Recovery Plan). |
| **Incident Response** | ❌ NO IMPLEMENTADO | Alta | Ausencia de protocolos formales de contención, comunicación y análisis posterior ante incidentes de fuga de información o accesos no autorizados. | Raíz del proyecto | Redactar el Protocolo de Respuesta ante Incidentes. |
| **Risk Assessment** | ❌ NO IMPLEMENTADO | Media | No se dispone de una matriz formal de evaluación ni priorización periódica de riesgos. | Raíz del proyecto | Diseñar y ejecutar una evaluación formal de riesgos anual. |
| **Security Testing** | ⚠️ PARCIAL | Media | Se dispone de una excelente suite de integración que valida el aislamiento, pero no está integrada a un pipeline de integración continua (CI) automatizado. | `backend/test/` | Configurar un motor de ejecución automatizado (como GitHub Actions) para correr las pruebas en cada push/PR. |

---

## 3. Hallazgos Detallados y Vulnerabilidades

### [GAP-001] Gestión de Sesiones Apátrida sin Revocación
* **Categoría:** Gestión de Sesiones
* **Descripción:** La verificación de tokens JWT se realiza de manera 100% apátrida utilizando únicamente la firma criptográfica. Si un usuario cambia su contraseña, es deshabilitado, o cierra sesión, los tokens previamente generados continúan siendo válidos para acceder a la API durante las 8 horas de su ciclo de vida útil.
* **Evidencia:** `jwt.verify(token, process.env.JWT_SECRET)` en [auth.js](file:///c:/Users/valen/oralyn/backend/src/middlewares/auth.js) no realiza ninguna consulta a la base de datos ni a un almacén de sesiones temporal para validar si el token ha sido revocado.
* **Impacto:** Si un token es interceptado (secuestro de sesión), el atacante conserva acceso completo a la API sin posibilidad de que el administrador o el usuario invaliden dicha sesión manualmente.
* **Severidad:** **Alta**
* **Recomendación:** Implementar un mecanismo de revocación de tokens (ej. guardar un `token_version` en la tabla de usuarios que invalide los tokens anteriores si cambia la contraseña, o mantener una lista negra de tokens en un almacén en caché rápido).

### [GAP-002] Almacenamiento Inseguro de JWT en el Cliente (Riesgo XSS)
* **Categoría:** Gestión de Sesiones / Frontend
* **Descripción:** El frontend de Oralyn almacena el JWT en el `localStorage` del navegador para adjuntarlo como cabecera `Authorization` en cada petición HTTP.
* **Evidencia:** `localStorage.setItem('token', nuevoToken)` y `localStorage.getItem('token')` en [Appcontext.jsx](file:///c:/Users/valen/oralyn/frontend/src/context/Appcontext.jsx) y [api.js](file:///c:/Users/valen/oralyn/frontend/src/api.js).
* **Impacto:** Si la aplicación sufre una vulnerabilidad de inyección de script (XSS), un atacante puede extraer el token directamente desde `localStorage` mediante código JavaScript malicioso.
* **Severidad:** **Alta**
* **Recomendación:** Migrar el almacenamiento del token de sesión a cookies seguras de tipo `HttpOnly`, `Secure` y `SameSite=Strict`, impidiendo el acceso a ellas a través de JavaScript del lado del cliente.

### [GAP-003] Ausencia de Registro de Auditoría y Logs de Seguridad
* **Categoría:** Logs de Seguridad
* **Descripción:** La aplicación no cuenta con un sistema de logging estructurado que deje trazabilidad sobre eventos sensibles de seguridad.
* **Evidencia:** Inspección de los controladores en `backend/src/routes/`. Los errores menores y excepciones no controladas se imprimen genéricamente en la consola mediante `console.error`, pero no hay registro de logins fallidos, intentos de escalación de privilegios (401/403), ni cambios de credenciales.
* **Impacto:** En caso de un incidente de seguridad real, el equipo técnico carece de herramientas forenses para determinar el origen del ataque, qué cuentas fueron comprometidas y qué información fue vulnerada.
* **Severidad:** **Alta**
* **Recomendación:** Integrar una biblioteca de logging estructurado como Winston o Bunyan, configurando el registro de logs estructurados en formato JSON dirigidos a un agregador externo de logs seguro.

### [GAP-004] Vulnerabilidad de Secreto Estático Administrativo
* **Categoría:** Autorización / Gestión de Secretos
* **Descripción:** El módulo de administración global de la API (`/api/admin`) se protege exclusivamente comparando la cabecera `x-admin-secret` contra la variable de entorno `ADMIN_SECRET`. No existe autenticación basada en base de datos para los administradores.
* **Evidencia:** Middleware [verificarAdmin.js](file:///c:/Users/valen/oralyn/backend/src/middlewares/verificarAdmin.js).
* **Impacto:** Si la clave estática `ADMIN_SECRET` se filtra o se expone en configuraciones, logs o repositorios, un atacante obtiene control administrativo absoluto e inmediato de la plataforma, pudiendo crear nuevos consultorios y usuarios administradores de forma arbitraria.
* **Severidad:** **Crítica**
* **Recomendación:** Migrar las funciones de administración global a un esquema de cuentas administrativas individuales con credenciales encriptadas y autenticación multifactor (MFA).
* **Estado:** ✅ RESUELTO (28 ago 2026) — Reemplazado por autenticación de administradores en base de datos con JWT firmado con secreto dedicado (`JWT_ADMIN_SECRET`), verificación de rol, chequeo de arranque obligatorio de la variable de entorno, y rate limiting en el login. Ver commits d0d8be8..5715327 en `main`.

### [GAP-005] Ausencia de Política de Complejidad de Contraseñas
* **Categoría:** Política de Contraseñas
* **Descripción:** La plataforma no impone reglas sobre la robustez de las contraseñas ingresadas por los usuarios durante el registro.
* **Evidencia:** `POST /api/auth/registro` en [auth.js](file:///c:/Users/valen/oralyn/backend/src/routes/auth.js) solo verifica que el campo `password` esté presente en la petición, procediendo a hashearlo inmediatamente sin más controles.
* **Impacto:** Los usuarios pueden registrarse con claves extremadamente vulnerables (ej. "123456" o "contraseña"), facilitando ataques de fuerza bruta o de diccionario.
* **Severidad:** **Media**
* **Recomendación:** Implementar un validador en el endpoint de registro que exija una longitud mínima (ej. 10 caracteres) y una combinación de mayúsculas, minúsculas, números y caracteres especiales.

### [GAP-006] Dependencias Innecesarias / Muertas en package.json
* **Categoría:** Configuración de Producción
* **Descripción:** La biblioteca `express-validator` se encuentra declarada como dependencia activa del proyecto, pero no se importa ni se utiliza en ninguna parte del código de producción o de pruebas del backend.
* **Evidencia:** Declaración en `dependencies` de [package.json](file:///c:/Users/valen/oralyn/backend/package.json), y ausencia de su importación tras auditoría estática con comandos de búsqueda de dependencias.
* **Impacto:** La presencia de código inactivo aumenta la superficie de ataque y expone al backend a alertas y potenciales exploits innecesarios de seguridad.
* **Severidad:** **Baja**
* **Recomendación:** Desinstalar `express-validator` del proyecto ejecutando `npm uninstall express-validator` para mantener el árbol de dependencias lo más minimalista y seguro posible.

---

## 4. Auditoría de Aislamiento Cross-Tenant (Aislamiento de Consultorios)

Se auditó minuciosamente la implementación de aislamiento de bases de datos para evitar fugas de información o escrituras cruzadas entre consultorios odontológicos. 

### Resumen de Endpoints Auditados

* **Pacientes (`/api/pacientes`):**
  * **GET `/` (Listar):** **Seguro**. Aplica filtro `where: { consultorio_id }` garantizando que no se listen pacientes de terceros.
  * **GET `/:id` (Obtener):** **Seguro**. Cambiado a `findFirst` utilizando en el filtrado `{ id, consultorio_id }`.
  * **POST `/` (Crear):** **Seguro**. Inicializa los datos asociando forzosamente el `consultorio_id` extraído del JWT del usuario.
  * **PUT `/:id` (Modificar):** **Seguro**. Valida la existencia previa del paciente dentro del consultorio usando `findFirst({ id, consultorio_id })`.
  * **DELETE `/:id` (Eliminar):** **Seguro**. Restringe el borrado físico únicamente a registros que coincidan con el `consultorio_id` del usuario autenticado.

* **Historias Clínicas (`/api/historias`):**
  * **GET `/:pacienteId`:** **Seguro**. Valida la pertenencia del paciente al consultorio antes de devolver la historia.
  * **POST `/:pacienteId`:** **Seguro**. Valida la existencia del paciente bajo el `consultorio_id` del doctor autenticado antes de crear la historia.
  * **PUT `/:id`:** **Seguro**. Valida que el paciente dueño de la historia clínica pertenezca al `consultorio_id` de la sesión.
  * **Evoluciones, Odontogramas y Adjuntos:** **Seguro**. Todas las rutas anidadas realizan búsquedas previas de la historia clínica (`findUnique` incluyendo `paciente`) para corroborar que el recurso esté asociado al consultorio autenticado antes de permitir cualquier consulta o alteración.

* **Consentimientos Informados (`/api/consentimientos`):**
  * **GET `/paciente/:pacienteId`:** **Seguro**. Restringe la lista al `consultorio_id` y valida pertenencia del paciente.
  * **POST `/`:** **Seguro**. Inicializa la propiedad `consultorio_id` del consentimiento forzando el valor contenido en la firma del JWT.
  * **PATCH `/:id/anular`:** **Seguro**. Comprueba pertenencia del acta a través del ID del consultorio antes de proceder con el cambio de estado.
  * **DELETE `/:id`:** **Seguro**. Valida pertenencia del registro antes de borrar físicamente la fila.

* **Certificados Dentales (`/api/certificados`):**
  * **POST `/` / GET `/paciente/:pacienteId` / PATCH `/:id/anular` / DELETE `/:id`:** **Seguro**. Todos los flujos se han acondicionado para realizar búsquedas restrictivas sobre el ID del certificado y el `consultorio_id` del doctor de forma simultánea, retornando `403` o respuestas seguras vacías en caso de accesos cruzados.

* **Citas (`/api/citas`):**
  * **GET `/` (Listar):** **Seguro**. Filtra citas estrictamente bajo el `consultorio_id` autenticado.
  * **POST `/` / PUT `/:id` / PATCH `/:id/estado` / DELETE `/:id`:** **Seguro**. Las citas se crean, modifican y borran verificando la pertenencia al consultorio del doctor autenticado a nivel de registro.

* **Cotizaciones y Pagos (`/api/cotizaciones` y `/api/pagos`):**
  * **POST `/` (Cotizaciones):** **Seguro**. Valida que el paciente pertenezca al consultorio antes de registrar el tratamiento y abonos iniciales.
  * **GET `/paciente/:pacienteId` / GET `/:id` / PUT `/:id` / DELETE `/:id`:** **Seguro**. Valida que el paciente y la cotización pertenezcan al consultorio del usuario autenticado en todas las consultas y escrituras.
  * **POST `/` (Pagos):** **Seguro**. Valida la existencia del paciente y su cotización correspondiente dentro de la misma clínica antes de crear la transacción.

* **Dashboard (`/api/dashboard`):**
  * **GET `/`:** **Seguro**. Toda la acumulación de datos financieros, conteo de pacientes y citas del día realiza consultas particionadas por el `consultorio_id` del JWT del usuario.

* **Configuración (`/api/configuracion`):**
  * **GET `/` / POST `/` / PUT `/`:** **Seguro**. Las lecturas, escrituras y modificaciones se realizan filtrando de manera única por el `id: req.usuario.consultorio_id`.

---

## 5. Riesgos Prioritarios

### Críticos
1. **[GAP-004] Acceso administrativo global por Clave Estática:** ✅ RESUELTO (28 ago 2026) — Se eliminó el secreto estático y se migró a autenticación por base de datos y JWT firmado.

### Altos
2. **[GAP-001] Sesión activa persistente tras Logout/Cambio de clave:** Exposición de las cuentas a accesos concurrentes no autorizados debido a la naturaleza apátrida del token JWT que no se puede revocar de forma remota.
3. **[GAP-002] Exposición de Tokens JWT en localStorage:** Vulnerabilidad a secuestro de sesión mediante ataques XSS.
4. **[GAP-003] Ausencia de logs estructurados y trazas de auditoría:** Imposibilidad de responder a incidentes o realizar análisis forense ante brechas de seguridad.

### Medios
5. **[GAP-005] Contraseñas inseguras en cuentas de usuarios:** Susceptibilidad a ataques de fuerza bruta y adivinación debido a la ausencia de políticas de complejidad de contraseñas.
6. **Ausencia de Pipeline Automatizado de Pruebas de Seguridad (CI):** Riesgo de reintroducir vulnerabilidades o regresiones en el código si los desarrolladores no ejecutan manualmente las pruebas locales antes de subir cambios.

### Bajos
7. **[GAP-006] Presencia de bibliotecas sin uso en package.json (`express-validator`):** Incremento innecesario en la superficie de ataque y peso de la aplicación.

---

## 6. Qué YA Está Bien Implementado

* **Aislamiento Multi-Tenant Completo:** Todas las rutas funcionales que exponen información del consultorio y sus subrecursos (citas, historias, odontogramas, evolución, adjuntos, cotizaciones, pagos, consentimientos, certificados) cuentan con filtros obligatorios basados en el `consultorio_id` resuelto criptográficamente del token JWT.
* **Hasheo Seguro de Contraseñas:** Uso correcto de `bcryptjs` con factor de coste 10 para garantizar que las contraseñas nunca se almacenen en texto plano.
* **Control Estructural de la Expiración:** Configuración de expiración automática de los tokens JWT de sesión establecida en 8 horas.
* **Protección contra Fuerza Bruta en Login:** Implementación de limitador de tasa de peticiones (`express-rate-limit`) en el endpoint de inicio de sesión.
* **Cero Secretos Hardcodeados en el Repositorio:** Todas las credenciales sensibles se recuperan de variables del sistema (`process.env`), y los archivos `.env` se encuentran excluidos de Git mediante `.gitignore` de manera correcta.

---

## 7. Qué Falta Implementar

1. **Mecanismo de Revocación de Sesiones:** Endpoint de logout real y validación activa del token contra una base de datos o almacenamiento temporal.
2. **Cookies Seguras para Almacenamiento de Tokens:** Transición de `localStorage` al uso de cookies con directivas `HttpOnly`, `Secure` y `SameSite`.
3. **Sistema de Auditoría de Logs:** Integración de bibliotecas de logs estructurados de auditoría para registrar eventos sensibles de seguridad.
4. **Esquema de Autorización Administrativa Dinámica:** Reemplazo de la cabecera `x-admin-secret` por perfiles administrativos registrados con autenticación y permisos detallados.
5. **Validación de Complejidad de Contraseñas:** Adición de políticas de longitud y caracteres para contraseñas en el flujo de registro.
6. **Pipeline de Integración Continua (CI):** Automatización de la suite de pruebas de regresión ante cada cambio en el repositorio principal.

---

## 8. Recomendaciones para la Siguiente Fase

### 1. Críticas (Inmediatas)
* Migrar las llamadas del backend de administración `/api/admin` a un sistema de usuarios administrativos registrados individualmente con permisos controlados a nivel de base de datos, en lugar de depender de la cabecera secreta estática.

### 2. Altas (Corto Plazo)
* Modificar el flujo de autenticación para emitir y almacenar el JWT en una cookie HttpOnly y Secure, mitigando así el riesgo de robo de tokens a través de XSS.
* Implementar un middleware de logs de auditoría estructurados usando Winston para dejar rastro de todos los intentos de acceso fallidos (401/403) y transacciones críticas.
* Añadir un mecanismo de base de datos que guarde una firma o versión del token del usuario, de modo que al realizar un cambio de clave o revocación administrativa, todos los tokens previamente emitidos queden inválidos.

### 3. Medias (Medio Plazo)
* Incorporar una biblioteca de validación de contraseñas (ej. `zxcvbn` o expresiones regulares de complejidad) en la ruta de registro de usuarios del backend.
* Diseñar y documentar una política básica de retención y pruebas de restauración de copias de seguridad de Supabase.
* Implementar la integración de GitHub Actions en el repositorio para que no se puedan integrar cambios a la rama de producción sin que la suite de pruebas complete de forma automática.

### 4. Bajas (Deseables)
* Remover la dependencia `express-validator` del archivo `package.json` mediante `npm uninstall`.
