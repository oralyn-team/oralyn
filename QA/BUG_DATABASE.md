# Base de Datos de Hallazgos y Vulnerabilidades (BUG_DATABASE.md)

Este documento mantiene el seguimiento operativo y actualizado del estado de cada brecha de seguridad de Oralyn.

## Registro de Brechas de Seguridad (GAP Analysis)

| ID | Hallazgo | Estado | Detalle y Solución |
|---|---|---|---|
| GAP-001 | Sesiones sin revocación | 🟢 Cerrado (29 ago 2026) | Implementado token_version en Usuario; verificado tras cambio de contraseña. Commits 8178356..e0e0554 en main. |
| GAP-002 | JWT en localStorage | 🟢 Cerrado (29 ago 2026) | Migrado a cookie HttpOnly/Secure/SameSite dinámico (None en prod, Lax en dev). Commits 8178356..e0e0554 en main. |
| GAP-003 | Ausencia de logs de auditoría | 🔴 Abierto | Sin registro estructurado de logins fallidos, cambios de contraseña, ni accesos 401/403. |
| GAP-004 | Secreto administrativo estático | 🟢 Cerrado (28 ago 2026) | Reemplazado por autenticación de administradores en BD y JWT con clave dedicada (JWT_ADMIN_SECRET). |
| GAP-005 | Ausencia de política de complejidad de contraseñas | 🔴 Abierto | Sin validación de longitud mínima ni caracteres especiales en el registro. |
| GAP-006 | Dependencia muerta (express-validator) | 🔴 Abierto | Instalada pero no usada en ninguna parte del código. |

---

## Otros Pendientes de Auditoría (Fuera de la numeración GAP oficial)
- **Estrategia de Backups y Recuperación (Disaster Recovery Plan)**: Establecer objetivos RTO/RPO y realizar pruebas periódicas de restauración autónoma.
- **Protocolo de Respuesta ante Incidentes**: Redactar planes formales de contención y respuesta en caso de brechas o fuga de información.
