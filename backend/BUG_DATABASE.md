# Base de Datos de Hallazgos y Vulnerabilidades (BUG_DATABASE.md)

Este documento mantiene el seguimiento operativo y actualizado del estado de cada brecha de seguridad e incidentes de Oralyn.

## Registro de Brechas de Seguridad (GAP Analysis)

| ID | Hallazgo | Estado | Detalle y Solución |
| :--- | :--- | :--- | :--- |
| GAP-001 | Sesiones sin revocación | 🟢 Cerrado (29 ago 2026) | Implementado token_version en Usuario; verificado tras cambio de contraseña. Commits 8178356..e0e0554 en main. |
| GAP-002 | JWT en localStorage | 🟢 Cerrado (29 ago 2026) | Migrado a cookie HttpOnly/Secure/SameSite dinámico (None en prod, Lax en dev). Commits 8178356..e0e0554 en main. |
| GAP-003 | Complejidad de Contraseñas | 🔴 Abierto | Sin reglas de complejidad de contraseñas (longitud mínima, caracteres especiales, diccionarios de claves débiles) en el registro. |
| GAP-004 | Gestión de Secretos del Administrador | 🟢 Cerrado (28 ago 2026) | Reemplazado por autenticación de administradores en BD y JWT con clave dedicada (`JWT_ADMIN_SECRET`). El secreto estático fue eliminado. |
| GAP-005 | Logs de Seguridad y Auditoría | 🔴 Abierto | Ausencia de logs estructurados de logins, cambios de clave y accesos 401/403. |
| GAP-006 | Disaster Recovery y Backups | 🔴 Abierto | Sin verificación periódica de restauración de base de datos ni plan formal de recuperación ante desastres (DRP). |
| GAP-007 | Incident Response y Riesgos | 🔴 Abierto | Ausencia de protocolo de respuesta ante incidentes y matriz anual de evaluación de riesgos. |
