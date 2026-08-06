# Oralyn — Backend

Sistema de gestión odontológica integral.  
Stack: Node.js · Express · Prisma · PostgreSQL (Supabase)

---

## Requisitos

- Node.js 18+
- npm
- Cuenta en Supabase (base de datos)

---

## Instalación

1. Clona el repositorio y entra a la carpeta:
```bash
   cd backend
```

2. Instala dependencias:
```bash
   npm install
```

3. Crea el archivo `.env` en la raíz de `backend/` con estas variables:

DATABASE_URL="postgresql://..."
JWT_SECRET="DannaKelly04oralyn"
NODE_ENV="development"
PORT=3000

4. Aplica las migraciones:
```bash
   npx prisma migrate deploy
```

5. Crea los datos iniciales:
```bash
   npm run seed
```

6. Levanta el servidor:
```bash
   npm run dev
```

---

## Comandos disponibles

| Comando | Descripción |
|---|---|
| `npm start` | Servidor en producción |
| `npm run dev` | Servidor en desarrollo con hot reload |
| `npx prisma migrate dev` | Aplica migraciones nuevas |
| `npm run seed` | Crea datos iniciales en la BD |

---

## Endpoints

| Módulo | Ruta base |
|---|---|
| Autenticación | `/api/auth` |
| Pacientes | `/api/pacientes` |
| Historias clínicas | `/api/historias` |
| Citas | `/api/citas` |
| Cotizaciones | `/api/cotizaciones` |
| Pagos | `/api/pagos` |
| Consentimientos | `/api/consentimientos` |
| Certificados | `/api/certificados` |
| Dashboard | `/api/dashboard` |
| PDFs | `/api/pdf` |
| Configuración | `/api/configuracion` |

---

## Autenticación

Todas las rutas excepto `/api/auth/login` y `/api/auth/registro` requieren token JWT.

Enviar en el header:
Obtener token:

{
  "email": "doctora@oralyn.com",
  "password": "123456"
}

---

## Arquitectura multi-consultorio

Cada usuario pertenece a un consultorio (`consultorio_id`). El token JWT incluye el `consultorio_id` y todos los endpoints filtran automáticamente los datos por consultorio. Un mismo sistema puede servir a múltiples clínicas sin mezclar información.