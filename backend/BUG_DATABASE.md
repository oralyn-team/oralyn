# Base de Datos de Hallazgos y Vulnerabilidades (BUG_DATABASE.md)

Este documento mantiene el seguimiento operativo y actualizado del estado de cada brecha de seguridad de Oralyn.

## Registro de Brechas de Seguridad (GAP Analysis)

| ID | Hallazgo | Estado | Detalle y Solución |
|---|---|---|---|
| GAP-001 | Sesiones sin revocación | 🟢 Cerrado (29 ago 2026) | Implementado token_version en Usuario; verificado tras cambio de contraseña. Commits 8178356..e0e0554 en main. |
| GAP-002 | JWT en localStorage | 🟢 Cerrado (29 ago 2026) | Migrado a cookie HttpOnly/Secure/SameSite dinámico (None en prod, Lax en dev). Commits 8178356..e0e0554 en main. |
| GAP-003 | Ausencia de logs de auditoría | 🟢 Cerrado (28 sept 2026) | Tabla inmutable `Auditoria` (Prisma) ya registraba logins fallidos/exitosos y cambios de contraseña (`audit.service.js`, usado en `auth.js`). Faltaba el tercer punto del hallazgo original — accesos 401/403 —, ahora cubierto: `verificarToken` audita token rechazado (usuario inexistente, cuenta desactivada, sesión revocada, firma inválida — no así el expirado, que es el flujo normal de la sesión de 8h) y `rbac.js` audita `ACCESO_DENEGADO` en `requireRole`/`requirePermission`/`requireAnyPermission`/`verifyTenantAccess`. Tests en `test/integration/audit_authorization.test.js`. |
| GAP-004 | Secreto administrativo estático | 🟢 Cerrado (28 ago 2026) | Reemplazado por autenticación de administradores en BD y JWT con clave dedicada (JWT_ADMIN_SECRET). |
| GAP-005 | Ausencia de política de complejidad de contraseñas | 🟢 Cerrado (28 sept 2026) | `validarComplejidadPassword` (`backend/src/utils/validacion.js`): mínimo 10 caracteres, mayúscula, minúscula, número y carácter especial. Aplicada en los 5 puntos donde se crea o cambia una contraseña: `POST /auth/registro`, `POST /auth/change-password`, `POST /auth/reset-password`, `POST /usuarios` y `POST /admin/consultorio`. Tests en `auth.test.js`, `admin.test.js`, `usuarios_password_policy.test.js` y `validacion_password.test.js`. |
| GAP-006 | Dependencia muerta (express-validator) | 🟢 Cerrado (verificado 28 sept 2026) | `express-validator` ya no aparece en `package.json` ni se importa en el código. Confirmado por auditoría directa del repo. |

---

## Otros Pendientes de Auditoría (Fuera de la numeración GAP oficial)
- **Estrategia de Backups y Recuperación (Disaster Recovery Plan)**: Establecer objetivos RTO/RPO y realizar pruebas periódicas de restauración autónoma.
- **Protocolo de Respuesta ante Incidentes**: Redactar planes formales de contención y respuesta en caso de brechas o fuga de información.
