# REPORTE DE CORRECCIÓN DE DEFECTOS (BUG_FIX_REPORT.md)

Este reporte consolida la trazabilidad de todos los defectos documentados y corregidos durante el ciclo de estabilización del backend de Oralyn, contrastando su comportamiento antes y después de aplicar las correcciones correspondientes.

---

## 1. Declaración de No Reversión de Cambios

> [!IMPORTANT]
> Los cambios de producción actualmente presentes en los directorios:
> * `backend/src/routes/`
> * `backend/src/middlewares/`
> 
> Corresponden estrictamente a las correcciones definitivas aplicadas durante el **Sprint 8** para solventar las vulnerabilidades de seguridad (*cross-tenant*) y los bugs de validación y lógica. **NO deben ser revertidos bajo ninguna circunstancia**, ya que su remoción reintroduciría fallos críticos en la seguridad y el comportamiento del sistema.

---

## 2. Tabla Consolidada de Trazabilidad de Defectos (Sprints 8–10)

A continuación se presenta el mapeo de los 24 defectos documentados en `DEFECT_BACKLOG.md`:

| ID del defecto | tipo | severidad | endpoint | archivo modificado | prueba asociada | resultado antes de la corrección | resultado después de la corrección | estado final |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-001** | Security | Crítica | `PUT /api/historias/:id` | `backend/src/routes/historias.js` | `Aislamiento: PUT /api/historias/:id — no permite modificar historia clínica de otro consultorio (BUG DE SEGURIDAD)` | Fallaba (retornaba 200 y editaba datos de otro consultorio) | PASS (retorna 403 Forbidden) | Corregido |
| **SEC-002** | Security | Crítica | `POST /api/historias/:historiaId/evoluciones` | `backend/src/routes/historias.js` | `Aislamiento: POST /api/historias/:historiaId/evoluciones — no permite agregar evolución a historia de otro consultorio (BUG DE SEGURIDAD)` | Fallaba (retornaba 201 y creaba evolución en historia ajena) | PASS (retorna 403 Forbidden) | Corregido |
| **SEC-003** | Security | Crítica | `PUT /api/historias/:historiaId/evoluciones/:id` | `backend/src/routes/historias.js` | `Aislamiento: PUT /api/historias/:historiaId/evoluciones/:evolucionId — no permite modificar evolución de otro consultorio (BUG DE SEGURIDAD)` | Fallaba (retornaba 200 y editaba evolución de otra clínica) | PASS (retorna 403 Forbidden) | Corregido |
| **SEC-004** | Security | Crítica | `DELETE /api/historias/:historiaId/evoluciones/:id` | `backend/src/routes/historias.js` | `Aislamiento: DELETE /api/historias/:historiaId/evoluciones/:evolucionId — no permite eliminar evolución de otro consultorio (BUG DE SEGURIDAD)` | Fallaba (retornaba 200 y borraba evolución ajena) | PASS (retorna 403 Forbidden) | Corregido |
| **SEC-005** | Security | Crítica | `PUT /api/historias/:historiaId/odontograma` | `backend/src/routes/historias.js` | `Aislamiento: PUT /api/historias/:historiaId/odontograma — no permite modificar odontograma de otro consultorio (BUG DE SEGURIDAD)` | Fallaba (retornaba 200 y alteraba odontograma ajeno) | PASS (retorna 403 Forbidden) | Corregido |
| **SEC-006** | Security | Crítica | `POST /api/historias/:historiaId/adjuntos` | `backend/src/routes/historias.js` | `Adjuntos: Aislamiento — Intentar subir adjunto a historia de otro consultorio (BUG DE SEGURIDAD)` | Fallaba (retornaba 201 y subía adjunto a paciente ajeno) | PASS (retorna 403 Forbidden) | Corregido |
| **SEC-007** | Security | Crítica | `GET /api/historias/:historiaId/adjuntos` | `backend/src/routes/historias.js` | `Adjuntos: Aislamiento — Intentar listar adjuntos de historia de otro consultorio (BUG DE SEGURIDAD)` | Fallaba (retornaba 200 y exponía adjuntos ajenos) | PASS (retorna 403 Forbidden) | Corregido |
| **SEC-008** | Security | Crítica | `DELETE /api/historias/:historiaId/adjuntos/:id` | `backend/src/routes/historias.js` | `Adjuntos: Aislamiento — Intentar eliminar adjunto de historia de otro consultorio (BUG DE SEGURIDAD)` | Fallaba (retornaba 200 y eliminaba adjunto ajeno) | PASS (retorna 403 Forbidden) | Corregido |
| **SEC-009** | Security | Crítica | `GET /api/historias/:id/pdf` | Ninguno (Sin cambios) | `PDF: Aislamiento — Historia perteneciente a otro consultorio retorna 403` | Exitoso nativamente (Siempre pasó) | PASS | Descartado (Falso Positivo) |
| **SEC-010** | Security | Crítica | `PATCH /api/consentimientos/:id/anular` | `backend/src/routes/consentimientos.js` | `Aislamiento: PATCH /api/consentimientos/:id/anular — no permite anular consentimiento de otro consultorio (BUG DE SEGURIDAD)` | Fallaba (retornaba 200 y anulaba actas ajenas) | PASS (retorna 403 Forbidden) | Corregido |
| **SEC-011** | Security | Crítica | `DELETE /api/consentimientos/:id` | `backend/src/routes/consentimientos.js` | `Aislamiento: DELETE /api/consentimientos/:id — no permite eliminar consentimiento de otro consultorio (BUG DE SEGURIDAD)` | Fallaba (retornaba 200 y eliminaba física de terceros) | PASS (retorna 403 Forbidden) | Corregido |
| **SEC-012** | Security | Crítica | `POST /api/certificados` | `backend/src/routes/certificados.js` | `Aislamiento: POST /api/certificados — no permite crear certificado para paciente de otro consultorio (BUG DE SEGURIDAD)` | Fallaba (retornaba 201 y creaba actas para pacientes ajenos) | PASS (retorna 403 Forbidden) | Corregido |
| **SEC-013** | Security | Crítica | `GET /api/certificados/paciente/:pacienteId` | `backend/src/routes/certificados.js` | `Aislamiento: GET /api/certificados/paciente/:pacienteId — no permite listar certificados de paciente de otro consultorio (BUG DE SEGURIDAD)` | Fallaba (retornaba 200 exponiendo certificados ajenos) | PASS (retorna lista vacía `[]`) | Corregido |
| **SEC-014** | Security | Crítica | `PATCH /api/certificados/:id/anular` | `backend/src/routes/certificados.js` | `Aislamiento: PATCH /api/certificados/:id/anular — no permite anular certificado de otro consultorio (BUG DE SEGURIDAD)` | Fallaba (retornaba 200 y anulaba actas ajenas) | PASS (retorna 403 Forbidden) | Corregido |
| **SEC-015** | Security | Crítica | `DELETE /api/certificados/:id` | `backend/src/routes/certificados.js` | `Aislamiento: DELETE /api/certificados/:id — no permite eliminar certificado de otro consultorio (BUG DE SEGURIDAD)` | Fallaba (retornaba 200 y borraba física de terceros) | PASS (retorna 403 Forbidden) | Corregido |
| **SEC-016** | Security | Crítica | `GET /api/certificados/:id/pdf` | `backend/src/routes/certificados.js` | `Aislamiento: GET /api/certificados/:id/pdf — no permite descargar PDF de certificado de otro consultorio (BUG DE SEGURIDAD)` | Fallaba (retornaba 200 con el PDF de otro consultorio) | PASS (retorna 403 Forbidden) | Corregido |
| **BUG-001** | Validation | Alta | `POST /api/pacientes` | `backend/src/routes/pacientes.js` | `Validación: POST /api/pacientes — documento con solo espacios retorna 400` | Fallaba (permitía registrar pacientes con documento en blanco) | PASS (retorna 400 Bad Request) | Corregido |
| **BUG-002** | Validation | Alta | `POST /api/pacientes` | `backend/src/routes/pacientes.js` | `Validación: POST /api/pacientes — tipo_documento inválido retorna 400` | Fallaba (permitía crear con tipo de documento no catalogado) | PASS (retorna 400 Bad Request) | Corregido |
| **BUG-003** | Validation | Alta | `POST /api/pacientes` | `backend/src/routes/pacientes.js` | `Validación: POST /api/pacientes — fecha inválida retorna 400` | Fallaba (permitía ingresar fechas corruptas/inexistentes) | PASS (retorna 400 Bad Request) | Corregido |
| **BUG-004** | Error Handling | Media | `POST /api/pacientes` | `backend/src/middlewares/errorHandler.js` | `Validación: POST /api/pacientes — JSON incorrecto retorna 400` | Fallaba (caía en excepción no controlada returning 500) | PASS (retorna 400 Bad Request) | Corregido |
| **BUG-005** | Validation | Alta | `POST /api/historias/:pacienteId` | `backend/src/routes/historias.js` | `Validación: POST /api/historias/:pacienteId — motivo con solo espacios retorna 400` | Fallaba (permitía registrar historias con campos obligatorios vacíos) | PASS (retorna 400 Bad Request) | Corregido |
| **BUG-006** | Validation | Media | `GET /api/citas?fecha=fecha-incorrecta` | `backend/src/routes/citas.js` | `Filtros Fecha: Rango inválido (fecha malformada) retorna 400 o 500 (BUG DE VALIDACIÓN)` | Fallaba (retornaba status 200 vacío o status 500) | PASS (retorna 400 Bad Request) | Corregido |
| **BUG-007** | Functional | Alta | `GET /api/citas?fecha=YYYY-MM-DD` | `backend/src/routes/citas.js` | `Filtros Fecha: Rango válido (fecha específica)` | Fallaba (desfase por huso horario del servidor) | PASS (filtra exactamente según fecha UTC recibida) | Corregido |
| **BUG-008** | Functional | Alta | `POST /api/configuracion` | `backend/src/routes/configuracion.js` | `POST /api/configuracion — creación vincula el id al consultorio_id del usuario (BUG DE LÓGICA)` | Fallaba (creaba ID autoincremental inconexo, rompiendo GET con 404) | PASS (guarda configuración con ID del consultorio del creador) | Corregido |

---

## 3. Discrepancias Detectadas
* No se han identificado discrepancias lógicas o de diseño entre el `DEFECT_BACKLOG.md`, las correcciones aplicadas y las aserciones de la suite de pruebas. El 100% de los defectos catalogados cuenta con su test de integración correspondiente funcionando adecuadamente.
