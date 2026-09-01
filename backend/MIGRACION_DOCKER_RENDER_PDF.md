# Migración a Docker en Render + fix de generación de PDFs (registro del caso)

## Contexto del problema original

El backend (Node/Express + Prisma) genera PDFs con Puppeteer. En producción (Render), todo intento de generar un PDF devolvía `500 { "error": "Error generando PDF" }`. El repo ya tenía un `backend/Dockerfile` preparado con las dependencias de sistema para Chromium, pero el servicio en Render corría como **Node nativo** (buildpack), no como Docker — por eso ese Dockerfile nunca se usaba.

Este documento resume las causas reales confirmadas (no hipótesis) y los fixes ya aplicados, para que quede como referencia si el problema reaparece o si hay que replicar el mismo tipo de deploy en otro entorno.

---

## Causa raíz #1 — Render usaba su runtime Node nativo, no el Dockerfile

**Síntoma:** El log de error mostraba rutas tipo `/opt/render/project/src/backend/node_modules/...` (estructura del buildpack nativo de Render), no `/app/...` (el `WORKDIR` definido en el Dockerfile). Confirmaba que Render nunca construyó la imagen Docker.

**Efecto:** Puppeteer descargaba Chrome durante el build en un directorio de caché (`~/.cache/puppeteer`), pero el runtime de Render usa un filesystem distinto al del build en su entorno nativo Node — el binario descargado no sobrevivía hasta la ejecución. Error resultante:
```text
Error: Could not find Chrome (ver. ...). ... your cache path is incorrectly configured
(which is: /opt/render/.cache/puppeteer)
```

**Fix aplicado:** Se creó un nuevo Web Service en Render con **Environment: Docker** (en vez de Node), apuntando al mismo repositorio. El servicio Node nativo anterior se dejó pausado como respaldo hasta confirmar que el nuevo funcionaba, y luego se eliminó.

---

## Causa raíz #2 — Dockerfile Path / Build Context mal configurados en Render

**Síntoma:**
```text
error: failed to solve: failed to read dockerfile: open Dockerfile: no such file or directory
```

**Causa:** El repo es un monorepo (`frontend/` y `backend/` como carpetas separadas). Render, por defecto, busca `Dockerfile` en la raíz del repositorio, pero el archivo real vive en `backend/Dockerfile`.

**Fix aplicado:** En Settings del servicio Docker en Render:
- `Dockerfile Path` → `backend/Dockerfile`
- `Docker Build Context Directory` → `backend`

*(Ambos campos son necesarios: el primero le dice a Render dónde está el archivo; el segundo, desde qué carpeta se resuelven los `COPY` relativos dentro de ese Dockerfile).*

---

## Causa raíz #3 — Orden incorrecto de `COPY` vs `npm install` en el Dockerfile

**Síntoma:**
```text
> oralyn-backend@1.0.0 postinstall
> prisma generate && npx puppeteer browsers install chrome

Error: Could not find Prisma Schema that is required for this command.
...
npm error command failed
npm error command sh -c prisma generate && npx puppeteer browsers install chrome
```

**Causa:** `backend/package.json` tiene:
```json
"postinstall": "prisma generate && npx puppeteer browsers install chrome"
```
Este script se ejecuta automáticamente en cada `npm install`. Pero el `Dockerfile` copiaba `prisma/schema.prisma` **después** de correr `npm install` (para aprovechar el caché de capas de Docker), así que cuando `postinstall` intentaba correr `prisma generate`, el schema todavía no existía en la imagen — `npm install` fallaba completo, y por lo tanto `npx puppeteer browsers install chrome` (que venía después del `&&`) nunca llegaba a ejecutarse tampoco.

**Fix aplicado:** En `backend/Dockerfile`, se agregó `COPY prisma ./prisma` inmediatamente después de `COPY package*.json ./` y antes de `RUN npm install`:

```dockerfile
WORKDIR /app

# Copiar archivos de dependencias y el esquema de Prisma
# (prisma/ debe copiarse ANTES de npm install porque el script "postinstall"
# del package.json ejecuta "prisma generate" automáticamente)
COPY package*.json ./
COPY prisma ./prisma

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
RUN npm install

COPY . .

RUN npx prisma generate   # ahora redundante (ya corrió en postinstall), no rompe nada

EXPOSE 3000
CMD ["npm", "start"]
```

---

## Cambio de diagnóstico en `pdf.js`

En [pdf.js](file:///c:/Users/valen/oralyn-backend/backend/src/routes/pdf.js), las 6 rutas de generación de PDF se habían modificado temporalmente para exponer el error real en la respuesta.
Una vez confirmada la estabilidad de la generación de PDFs en Docker, se revirtió `pdf.js` a la respuesta limpia en producción:
```js
res.status(500).json({ error: 'Error generando PDF' })
```
mientras que `console.error(error)` se mantiene en cada `catch` para preservar la visibilidad del error en los logs del servidor Render.

---

## Checklist de verificación final

1. `[x]` El build en Render (Docker) termina en verde, sin errores en `apt-get`, `npm install` ni `prisma generate`.
2. `[x]` Los logs de arranque muestran `Servidor corriendo en puerto ...` sin errores posteriores.
3. `[x]` `VITE_API_URL` en Vercel apunta a la URL del nuevo servicio Docker.
4. `[x]` Se generó correctamente al menos un PDF de cada tipo: paciente, historia clínica, cotización, certificado, consentimiento, recomendaciones.
5. `[x]` Login, listado de pacientes y agenda de citas siguen funcionando con normalidad contra el nuevo backend.
6. `[x]` Se revirtió el cambio de diagnóstico en `pdf.js` (manteniendo `console.error(error)`).
7. `[x]` `Dockerfile` actualizado con `COPY prisma ./prisma` antes de `npm install`.
8. `[x]` El servicio Node nativo anterior en Render fue pausado y eliminado.
9. `[ ]` (Opcional) Configurar un keep-alive externo (cron cada 10-14 min a un endpoint de salud) si se quiere evitar el cold start del plan gratuito de Render.
