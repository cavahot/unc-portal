# MIG-IMG — Recuperar las imágenes de noticias en el portal (Media de Payload, disco local, con guardias)

**Estado:** PROPUESTA de diseño (SDD + plan TDD). No se cambió código, pruebas, configuración ni base de datos. **Backlog:** migración WordPress (MIG-WP) → imágenes. **Relacionado:** `docs/specs/security/SEC-03-matriz-editorial.md` (aprobada, no se relaja), `docs/specs/security/DEP-03-flujo-editorial-servidor.md`, `docs/specs/deploy/DEP-02-lectura-publica-solo-publicado.md`, `docs/specs/deploy/DEP-06-limites-api-y-cors.md`, `docs/specs/deploy/DEP-07-via-unica-de-esquema.md`, `docs/specs/security/SEC-10-lectura-solo-activos-tribunal.md`. **RDD:** `docs/research/evidence-register-mig-img.md` (RDD-MIG-IMG-01 … 30; integrar luego en `docs/research/evidence-register.md`). No autoriza pruebas sobre producción ni sobre el sitio WordPress en vivo.

## 1. Problema

- Hoy el importador guarda en `Noticias.featuredImageUrl` la URL del sitio original (`https://www.unc.edu.py/wp-content/uploads/AAAA/MM/archivo`) (`scripts/migrate-wordpress.mjs:615`, `scripts/lib/wpContent.mjs:6`) y el portal la muestra con `next/image` (`app/[locale]/noticias/[slug]/page.tsx:131-140`, `app/[locale]/noticias/page.tsx:183-192`, `app/[locale]/page.tsx:422-427`). El portal depende del sitio viejo en vivo (hotlink).
- Las imágenes del cuerpo se **descartan** al convertir HTML a Lexical (`scripts/migrate-wordpress.mjs:257`, `.replace(/<img[^>]*>/gi, '')`). El esquema sí tendría lugar (el editor Lexical por defecto incluye `UploadFeature`, `node_modules/@payloadcms/richtext-lexical/dist/lexical/config/server/default.js:26`; y existe `Noticias.gallery`, `apps/cms/src/collections/Noticias.ts:214-238`), pero el portal no renderiza nodos `upload` (`components/RichText.tsx:42-75`, sin `case 'upload'`).
- Hay 237 imágenes verificadas (2024-2026; 151 `.jpg`, 66 `.jpeg`, 20 `.png`; 35 MB en total; la mayor pesa 1 013 711 bytes; `verify-log.csv`: 237 `formato_ok=True`) fuera del repositorio, en `C:\Users\UNC\Downloads\Plataforma\wp-migration\uploads\AAAA\MM\archivo`. `download-log.csv`: 187 de origen `adjunto`, 50 `embebida`. Las de 2016-2023 no son recuperables por ahora.

## 2. Comportamiento esperado (resumen)

1. Cada imagen recuperada se convierte en **un documento `media`** de Payload, subido por la **API REST con un usuario real** (rol `media-manager`), atravesando access, hooks, validación de bytes y auditoría. El archivo vive en un **volumen de disco persistente** del CMS; Postgres guarda **solo metadatos** (fila `media` ≈ 14 columnas, `apps/cms/src/migrations/20261017_021341_arch_db_02_baseline.ts:65-80`).
2. La noticia enlaza la imagen destacada por **relación** (`featuredImage → media`) y las imágenes del cuerpo como **galería** (`gallery[].image → media`) en el orden de WordPress, sin repetir la destacada. `featuredImageUrl` se conserva como **respaldo** (no se borra en esta tarea).
3. El enlace a la noticia pasa por el **flujo editorial aprobado** (SEC-03/DEP-03): autor guarda borrador → revisor aprueba → publicador publica, tres identidades distintas, igual que `scripts/lib/wpPublishFlow.mjs:14-19`. Nada se publica por atajo.
4. El portal resuelve la URL de la imagen con prioridad `featuredImage.url` (convertida a URL pública absoluta del CMS) > `featuredImageUrl` (respaldo, solo host WordPress permitido) > imagen por defecto.
5. El cargador es idempotente (sha256 del contenido + ruta original), tiene `--dry-run` sin red, es pausado y reanudable, informa conteos y nunca imprime secretos. Sirve igual para un lote futuro (2016-2023) apuntando a otra carpeta.

## 3. Alcance y fuera de alcance

**Dentro:** colección `media` (endurecimiento), dos campos nuevos de procedencia en `media` (`sha256`, `sourcePath`) con migración (vía DEP-07), configuración de subida (`upload.limits`, `abortOnLimit`, `staticDir`), cabeceras al servir archivos, guardia de borrado de media en uso, límite de tasa de subidas, volumen persistente y respaldo del directorio, resolución de URL en el portal, `remotePatterns`/CSP acotados, cargador `scripts/load-news-images.mjs` + `scripts/lib/mediaLoader.mjs` (nombres propuestos), pruebas.

**Fuera (no objetivos):** reinsertar las imágenes **en su posición** dentro del cuerpo Lexical (requiere reprocesar el HTML; ver pregunta al PO n.º 2); renderizar nodos `upload` en `components/RichText.tsx`; borrar `featuredImageUrl` o quitar `www.unc.edu.py` de `remotePatterns` mientras existan noticias 2016-2023 sin imagen local; tamaños derivados (`imageSizes`); MinIO/S3 (DEP-11, opción D: se deja compatible); cambiar la matriz SEC-03; modificar `scripts/migrate-wordpress.mjs`, `scripts/lib/wp*.mjs` o `tests/unit/wp-*.spec.ts` (otro agente los usa; el cargador puede **importar** funciones puras de `wpContent.mjs` sin modificarlas).

## 4. Opciones comparadas

| Opción | Qué es | A favor | En contra | Veredicto |
|---|---|---|---|---|
| **A** | `media` en disco local (volumen) + cargador por **REST** con usuario `media-manager` real | Ejercita exactamente el camino de producción (multipart, `abortOnLimit`, access, hooks, auditoría, nginx); el usuario queda en la auditoría; sin `overrideAccess`; no requiere código dentro del contenedor | Más lento (red, multipart); el límite de tasa debe permitir el lote; requiere un usuario y contraseña de servicio (`CMS_PASSWORD` vía `requireCmsPassword`) | **Recomendada** |
| **B** | Igual, por **Local API** (`payload.create({ filePath })`) | Rápido; sin HTTP | Omite `processMultipart` (sin `limits.fileSize`/`abortOnLimit`, RDD-MIG-IMG-08); por defecto **omite el access** (`overrideAccess: true`, RDD-SEC-002); `req.user` vacío ⇒ los hooks editoriales no actúan (`enforceTransition.ts:41-43`) y la auditoría pierde el actor; exige ejecutar código con la config real y credenciales de BD en el host del cargador | Solo para pruebas de integración con `overrideAccess: false` y `user`, no para la carga |
| **C** | Seguir enlazando las URL originales (hotlink) | Cero trabajo; cero almacenamiento | Dependencia del WordPress vivo (si se apaga o reorganiza, 404 masivos); propiedad mixta (lo sirve otro sistema, sin auditoría ni respaldo propios); `remotePatterns` amplio = superficie del optimizador `/_next/image` hacia hosts externos (fetch del servidor, consumo de CPU) (RDD-MIG-IMG-20); bloqueo de hotlink o cambio de TLS rompe el portal sin aviso; CSP debe seguir abriendo `img-src` a esos hosts | Solo como **respaldo transitorio** para lo no recuperable |
| **D** | Almacenamiento de objetos (S3 compatible) más adelante | Escala, CDN, sin volumen en el host del CMS | No disponible hoy (imagen MinIO no autorizada, DEP-11); `disablePayloadAccessControl: true` (`payload.config.ts:217`) salta la política de lectura | **Más adelante**, con las condiciones de compatibilidad de §4.1 |

### 4.1 Compatibilidad exigida para pasar de A a D sin cambiar el esquema

1. **Sin `prefix`.** El plugin agrega la columna `prefix` solo si se configura `prefix` o `alwaysInsertFields` (`node_modules/@payloadcms/plugin-cloud-storage/dist/fields/getFields.js:135-151`); la tabla `media` no la tiene (`baseline:65-80`). Clave del objeto = `filename` plano (único, `node_modules/payload/dist/uploads/getBaseFields.js:71-83`), igual que `generateFileURL` (`payload.config.ts:222-230`).
2. **El portal nunca construye rutas de archivo**: usa `media.url` vía `resolveMediaUrl` (§7.4), que ya acepta URL absolutas de un host permitido. Al migrar a D, `url` pasa a ser `S3_PUBLIC_URL/...` y solo cambia la lista de hosts permitidos.
3. **Sin `imageSizes`** en esta tarea (si se agregan luego, migración aparte: columnas `sizes_*`).
4. **Copia de archivos**: el volumen local se sube al bucket con el mismo nombre de archivo; `sha256` permite verificar 1:1.
5. **Política de lectura**: si el PO decide ocultar media no publicada (pregunta n.º 1), D debe usar `disablePayloadAccessControl: false` o URL firmadas; documentado como condición del cambio.

## 5. Contrato de datos

### 5.1 `media` (propuesto)

| Campo | Cambio | Regla |
|---|---|---|
| `alt` | sin cambio de tipo; validación nueva | texto plano, `trim`, 1-300 caracteres, sin `<`/`>` (se rechaza, no se escapa). |
| `blurDataURL` | sin cambio | lo fija el servidor; `access.create/update = false` (hoy solo `admin.readOnly`, `Media.ts:19-27`). |
| `sha256` | **nuevo** `text`, `unique`, `index`, `access.create/update = false`, `admin.readOnly` | lo calcula un hook `beforeOperation` sobre los bytes recibidos; clave de idempotencia. |
| `sourcePath` | **nuevo** `text`, `unique` (admite nulo), `index`, editable solo por `superadmin` y `media-manager` | ruta original normalizada `AAAA/MM/archivo` (regex `^\d{4}/\d{2}/[^/\\]+$`); nulo para subidas manuales. |
| `filename`, `mimeType`, `filesize`, `width`, `height`, `focalX`, `focalY`, `url`, `thumbnailURL` | automáticos de Payload | ver §9. |

Migración: una sola, aditiva (`ALTER TABLE media ADD COLUMN sha256 varchar, ADD COLUMN source_path varchar` + índices únicos), aplicada por `payload migrate` según DEP-07; `down` solo sobre BD vacía.

### 5.2 `noticias` (sin cambio de esquema)

- `featuredImage` (relación a `media`, `Noticias.ts:193-202`) = media de la imagen destacada.
- `gallery[]` (`Noticias.ts:214-238`, `maxRows: 30`) = media del cuerpo en orden WordPress, excluida la destacada; `caption` = `alt` de WordPress si existe.
- `featuredImageUrl` (`Noticias.ts:204-212`) = se conserva (respaldo y trazabilidad); el portal ya da prioridad a `featuredImage`.

### 5.3 Manifiesto del cargador (archivo local, no versionado)

`manifest.json` generado en `--dry-run` desde el export WordPress y la carpeta: `{ slug, featured: { relPath, alt } | null, embedded: [{ relPath, alt }] }` por noticia, más `files: [{ relPath, bytes, sha256 }]`. Clave de unión noticia ↔ post: `slug` (= `post_name` o `slugify(title)-ID`, `scripts/migrate-wordpress.mjs` bloque `migrateNews`). Rutas validadas con `safeLocalPath` (`scripts/lib/wpContent.mjs:88-93`).

## 6. Estados

**Archivo (cargador):** `pendiente` → `validado` (bytes, extensión, tamaño) → `subido` (media creada) | `existente` (sha256 o `sourcePath` ya presentes) | `rechazado` (motivo) | `error` (reintentable).

**Enlace (por noticia):** `sin_imagen` → `borrador_con_imagen` (autor guardó borrador con `featuredImage`/`gallery`) → `en_revision` → `aprobado` → `publicado`. Si la noticia está `rechazado`, el cargador **no** la toca (decisión humana, igual que `wpPublishFlow.mjs:44-46`). Lo publicado sigue visible sin imagen nueva hasta que el Publicador publica la versión nueva (`forceDraftSaveUnlessPublisher`, `enforceTransition.ts:129-133`).

## 7. Guardias por capa (qué evita cada una y su límite)

| Capa | Control propuesto | Amenaza | Límite |
|---|---|---|---|
| nginx `cms.unc.edu.py` | `client_max_body_size` del CMS de 100m (`nginx.conf:136`) → bajar a 25m; `limit_req` para `POST /api/media` (p. ej. 30 r/min, ráfaga 10) | Agotamiento de disco/CPU con subidas grandes o masivas | Por IP; el cargador debe ir pausado por debajo |
| Payload global | `upload: { limits: { fileSize: 10 MiB }, abortOnLimit: true }` | Hoy no hay tope por archivo (por defecto `abortOnLimit: false` y sin `limits`, `fetchAPI-multipart/index.js:5-19`); con tope y sin `abortOnLimit` el archivo se **trunca en silencio** y se guarda (`processMultipart.js:67-83`) | Solo multipart (REST/admin); la Local API no pasa por aquí → tope repetido en hook |
| `media.upload` | `mimeTypes` sin `image/svg+xml` (ver §7.1); `staticDir: process.env.MEDIA_DIR` (absoluto, fuera de `/app`); `pasteURL: false`; `modifyResponseHeaders` (§7.2) | SVG activo, escritura en la capa efímera del contenedor, fetch remoto desde el admin | `mimeTypes` sigue admitiendo PDF/DOC para otras colecciones |
| Hook `beforeOperation` (create/update con archivo) | `validateUploadBytes`: tamaño ≤ 5 MiB para imágenes; tipo detectado por **bytes** ∈ {jpeg, png, webp} y coherente con la extensión final; decodificación completa con sharp (rechaza truncadas y políglotas que solo tienen cabecera); nombre: rechaza `..`, `/`, `\`, NUL, controles y segmentos intermedios peligrosos (`.php`, `.html`, `.svg`, `.js`…); calcula `sha256` | Payload acepta un archivo **no detectable** (p. ej. HTML renombrado `.jpg`) por la extensión con solo un aviso (`checkFileRestrictions.js:297-321`); guarda el `mimeType` declarado por el cliente si no reprocesa (`generateFileData.js:173-178`); `getImageSize` cae a una sonda de bytes que acepta archivos truncados (`getImageSize.js:5-22`) | El análisis de bytes no detecta contenido malicioso dentro de una imagen válida; la protección final es servirla como imagen con `nosniff` |
| Hook `beforeOperation` | Límite de tasa por **usuario** para create en `media` (p. ej. 120/10 min) → 429 | Abuso con una cuenta comprometida | En memoria por proceso (como DEP-06); N réplicas = N × límite |
| Access `media` | Sin cambio de roles hoy: create/update `canWriteMedia` (`roles.ts:298-299`), delete `canDeleteMedia` (`roles.ts:301-302`), read `() => true` (`Media.ts:8`); anónimo → 403 | Escritura anónima o por rol sin función | La lista incluye `correspondent` y `editor` (SEC-03 punto 3, pendiente de confirmar); no se amplía |
| Hook `beforeDelete` en `media` | Rechaza (409) borrar una media referenciada por `noticias.featuredImage`, `noticias.gallery.image`, versiones, u otras colecciones que relacionan `media` (Autoridades, Facultades, MarcoLegal, Revistas, TribunalMiembros, bloques Hero/Testimonials) | Que borrar un archivo deje sin imagen una noticia publicada sin pasar por el flujo | Consulta adicional por borrado |
| Hook `afterChange`/`afterDelete` en `media` | `logAudit` con acción `importar` (cargador, `sourcePath` presente) o `crear`/`actualizar`/`eliminar`; documento = `filename (ID)`, `cambiosRelevantes` = `{ sha256, filesize, mimeType, sourcePath }`; rechazos del hook de bytes con `resultado: 'error'` | Subidas sin rastro | `getClientIP` toma el primer `x-forwarded-for` (`audit.ts:58-64`), controlable por el cliente: la IP auditada no es confiable (deuda aparte) |
| Flujo editorial | El enlace usa los hooks existentes sin cambios (`createEnforceEditorialTransition`, `forceDraftSaveUnlessPublisher`) | Publicar por atajo | Tres identidades (autor, revisor, publicador) |
| Portal `next.config.mjs` | `remotePatterns`: agregar el origen público del CMS con `pathname: '/api/media/file/**'`; dejar `www.unc.edu.py` solo con `pathname: '/wp-content/uploads/**'`; quitar `migracion.unc.edu.py`; dev sin cambios | Optimizador como proxy hacia rutas/hosts arbitrarios (`next.config.mjs:41-42` hoy permite `/**`) | El hotlink residual sigue hasta decidir 2016-2023 |
| Portal CSP (`lib/csp.ts:15-21,72`) | `img-src` agrega el origen público del CMS; quita `migracion.unc.edu.py` | Carga de imágenes desde hosts no previstos | Las imágenes optimizadas salen de `/_next/image` (`'self'`); los hosts solo importan para `unoptimized`/OG |
| Portal cabeceras | Ya hay `X-Content-Type-Options: nosniff` (`next.config.mjs:19`) | — | — |
| Persistencia | Volumen nombrado `unc_cms_media_prod` montado en `MEDIA_DIR` con dueño uid 1001 (`nextjs`, `apps/cms/Dockerfile:89-99`); respaldo `tar` + `sha256sum` del directorio en `scripts/backup/backup.sh` (hoy solo respalda MinIO, `backup.sh:55-61`) y restauración probada | Pérdida de imágenes en cada redeploy: hoy el servicio `cms` no monta volumen (`compose.prod.yaml:119-150`) y `staticDir` por defecto es `media` relativo al cwd (`payload/dist/collections/config/sanitize.js:209`) → `/app/media`, efímero y probablemente sin permiso de escritura | El volumen vive en el host: su respaldo fuera del host es DEP-08 |
| Base de datos | Solo metadatos; `blurDataURL` ≈ 100-200 bytes por fila | Crecimiento de la BD | — |

### 7.1 SVG

Recomendación: quitar `image/svg+xml` de `Media.upload.mimeTypes`. Motivo: el bloqueo de Payload es una **lista negra por expresiones regulares** (`validateSvg.js:7-34`) y el archivo se sirve desde el **mismo origen que el panel** (`cms.unc.edu.py/api/media/file/...`); la mitigación incluida es solo `Content-Security-Policy: script-src 'none'` en SVG (`getFile.js:109-111`). Si el PO necesita SVG (logos), se exige además `Content-Disposition: attachment` o `CSP: sandbox` vía `modifyResponseHeaders`. Precondición: contar SVG existentes antes del cambio (consulta de solo lectura; no se ejecutó).

### 7.2 Cabeceras al servir `/api/media/file/*` (CMS)

`modifyResponseHeaders` (`getFile.js:135-137`) agrega: `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox`, `Cross-Origin-Resource-Policy: cross-origin` (el portal las consume), `Cache-Control: public, max-age=86400` (no `immutable`: el nombre puede reutilizarse tras borrar). Para PDF/DOC (otras colecciones) `Content-Disposition: attachment` se evalúa aparte.

### 7.3 Lectura de media de una noticia en borrador (decisión propuesta)

**Decisión propuesta para MIG-IMG: mantener `Media.read = () => true`.** Justificación: (1) las 237 imágenes ya fueron públicas en el sitio WordPress; (2) el nombre de archivo de una media no se lista para anónimos fuera de `/api/media` (que hoy sí lista todo: es la deuda real); (3) restringir lectura exige filtrar por relación inversa a noticias publicadas en cada `GET /api/media/file/*` (`checkFileAccess.js:10-16` evalúa `access.read` con `isReadingStaticFile`), que se rompe con `disablePayloadAccessControl` en D. **Riesgo remanente:** una imagen subida para un borrador (embargo, información sensible) es accesible a quien adivine o vea el nombre, y `GET /api/media` la lista a anónimos. Es decisión reservada al PO (`docs/engineering/SDD-RDD-HARNESS.md`, «visibilidad de media no publicada»): pregunta n.º 1.

### 7.4 Resolución de URL en el portal

Con almacenamiento local y sin `serverURL` (no definido en `payload.config.ts`), `media.url` es **relativa**: `/api/media/file/<nombre>` (`node_modules/payload/dist/uploads/generateFilePathOrURL.js:17-24`). El portal la pasaría tal cual a `next/image`, que la trataría como imagen local del **portal** (404). Se propone `lib/cms/mediaUrl.ts` → `resolveMediaUrl(url)`: relativa que empieza por `/api/media/file/` → `${CMS_PUBLIC_URL}${url}`; absoluta → solo si su host está en la lista permitida; resto → `null`. Alternativa: definir `serverURL` en Payload (afecta también URLs del admin y correos; más amplio). Se usa en los 4 consumidores (`app/[locale]/page.tsx:422`, `noticias/page.tsx:186`, `noticias/[slug]/page.tsx:51,104,134,217`, `buscar/page.tsx:131`) y en `NewsGallery`.

## 8. Criterios Given/When/Then (negativos primero)

**Acceso**
1. Dado un anónimo, cuando hace `POST /api/media` con una imagen válida, entonces 403 y no se crea archivo ni fila.
2. Dado un anónimo, cuando hace `DELETE /api/media/:id`, entonces 403.
3. Dado `viewer`, `auditor` o `reviewer`, cuando sube, entonces 403 (no están en `canWriteMedia`).
4. Dado `editor`, `correspondent`, `publisher`, `web-admin`, `media-manager` o `superadmin`, cuando sube una imagen válida, entonces 201 (matriz vigente; SEC-03 punto 3 pendiente).
5. Dado `editor`, cuando borra una media, entonces 403; dado `media-manager`, cuando borra una media **no referenciada**, entonces 200; **referenciada** por una noticia → 409 y nada cambia.

**Archivo**
6. Dado un JPEG de 6 MiB, cuando se sube, entonces 413 (o 400 del hook) y no queda archivo en `MEDIA_DIR`. Dado un archivo > 10 MiB por multipart, entonces 413 y **no** se guarda truncado.
7. Dado un PNG declarado como `image/jpeg` con extensión `.jpg`, cuando se sube, entonces 400 (extensión y bytes no coinciden).
8. Dado un HTML renombrado `foto.jpg` (bytes `<!doctype html>`), cuando se sube, entonces 400 (tipo no detectable) — hoy Payload lo aceptaría por la extensión (RDD-MIG-IMG-05).
9. Dado un SVG (con o sin `<script>`) renombrado o no, cuando se sube, entonces 400.
10. Dado `foto.php.jpg` o `foto.svg.png`, cuando se sube, entonces 400; dado `95.1-1-1.jpg` (nombre real del lote), entonces 201 (los puntos intermedios no peligrosos se aceptan).
11. Dado el nombre `../../etc/passwd.jpg` o `..\\x.jpg` o con NUL/controles, entonces 400 y ningún archivo fuera de `MEDIA_DIR`.
12. Dado un JPEG truncado (solo cabecera), entonces 400 (sharp no lo decodifica).
13. Dado `alt` vacío, solo espacios, > 300 caracteres o con `<`, entonces 400.
14. Dado un cliente que envía `sha256` o `blurDataURL` en el cuerpo, entonces se ignoran y el servidor fija los suyos.

**Idempotencia y tasa**
15. Dada una media con el mismo `sha256`, cuando se sube el mismo contenido con otro nombre, entonces 409/400 por unicidad y el cargador lo cuenta como `existente` (no duplica).
16. Dada una media con `sourcePath = 2024/05/105-1.jpg`, cuando el cargador se repite, entonces no hace `POST` (consulta previa) y cuenta `existente`.
17. Dado un usuario que supera N subidas en la ventana, entonces 429 con `Retry-After`; otro usuario no se ve afectado.

**Enlace y flujo editorial**
18. Dada una noticia publicada, cuando el autor (`editor`) guarda `featuredImage`, entonces se crea una **versión borrador** y el público sigue viendo la versión publicada sin cambios.
19. Dado ese borrador, cuando el revisor aprueba y el publicador publica (personas distintas), entonces el público ve la imagen nueva.
20. Dado el cargador con una sola identidad o identidades repetidas, entonces se detiene antes de cualquier escritura (mismo contrato que `checkIdentities`, `wpPublishFlow.mjs`).
21. Dada una noticia `rechazado`, entonces el cargador no la modifica y la informa como bloqueada.

**Portal**
22. Dada una noticia con `featuredImage` poblada, cuando se renderiza el listado, la búsqueda y el detalle, entonces `src` es `https://<cms-público>/api/media/file/<nombre>` y se usa `blurDataURL` de la media.
23. Dada una noticia sin `featuredImage` y con `featuredImageUrl` de `www.unc.edu.py/wp-content/uploads/...`, entonces se usa ese respaldo; con un host no permitido → imagen por defecto (no se pasa a `next/image`).
24. Dado `/_next/image?url=https://migracion.unc.edu.py/...` o `https://www.unc.edu.py/otra-ruta`, entonces el optimizador responde 400 (fuera de `remotePatterns`).
25. Dado `GET /api/media/file/x.jpg` en el CMS, entonces la respuesta trae `X-Content-Type-Options: nosniff` y la CSP con `sandbox`.

## 9. Mapa de propiedades

Convenciones: **A** = anónimo; roles por identificador interno. «Lectura» = `Media.read` o `readPublishedOrEditorial`. «Hook» = hooks que tocan el campo. «Prueba» = existente (ruta) o planificada (P-xx, §10). **BRECHA** marca huecos.

### 9.1 Colección `media` (`apps/cms/src/collections/Media.ts`)

Access de la colección (todas las filas): read = todos, incluido A (`Media.ts:8`); create/update = `superadmin, web-admin, publisher, editor, correspondent, media-manager` (`roles.ts:298-299`); delete = `superadmin, web-admin, media-manager` (`roles.ts:301-302`). Ningún campo tiene access propio hoy.

| Campo Payload (tipo, req., índice, access, hooks) | Fuente WP / atributo de archivo | Valor del cargador (transformación) | Validación / guardia | Consumidor en el portal | Prueba |
|---|---|---|---|---|---|
| `id` (serial PK) | — | lo asigna Postgres; se guarda en el informe | — | `lib/cms/queries/news.ts:68` (tipo `featuredImage.id`) | P-08 |
| `alt` (text, **requerido**, sin índice; access de colección; sin hook) (`Media.ts:14-18`) | `<img alt>` (`wpContent.mjs:106-126`); para la destacada sin `alt`: `post_title` | `trim`, colapsar espacios, cortar a 300; vacío → título de la noticia | Hoy solo `required`. **Propuesto:** 1-300, sin `<`/`>` | `noticias/[slug]/page.tsx:135,221`; `noticias/page.tsx:187`; `page.tsx:423`; `buscar/page.tsx:132` | P-03 |
| `blurDataURL` (text, opcional, `admin.readOnly`; **escribible por API** porque no tiene access de campo; hook `beforeChange` `Media.ts:43-59`) | derivado de los bytes | no se envía; lo calcula el hook (8×8 webp) | Fallo de sharp se ignora en silencio (`Media.ts:53-55`). **Propuesto:** access create/update `false`; error → el hook de bytes ya rechazó antes | `page.tsx:427`; `noticias/page.tsx:192`; `noticias/[slug]/page.tsx:140,223,232`; `components/news/NewsGallery.tsx:100,225,339` | P-04 |
| `sha256` (**NUEVO**: text, único, índice, access create/update `false`, hook `beforeOperation`) | bytes del archivo | lo calcula el servidor; el cargador calcula el suyo solo para la consulta previa | único en BD | sin consumidor (solo procedencia) — **esperado** | P-05, P-06 |
| `sourcePath` (**NUEVO**: text, único admite nulo, índice, editable por `superadmin`/`media-manager`) | ruta `AAAA/MM/archivo` del CSV/carpeta | normalizada, `/` como separador | regex `^\d{4}/\d{2}/[^/\\]+$`; único | sin consumidor — **esperado** | P-06, P-13 |
| `filename` (text, automático, **índice único**, oculto) (`payload/dist/uploads/getBaseFields.js:71-83`) | nombre del archivo | se envía el nombre original; Payload lo sanea (`sanitize-filename`) y, si choca, agrega `-1`, `-2` (`getSafeFilename.js:46-57`, `generateFileData.js:188-202`) | **Propuesto:** rechazo de `..`, separadores, controles y dobles extensiones peligrosas antes de Payload | indirecto (dentro de `url`) | P-02 |
| `mimeType` (text, automático, oculto) | bytes | no se envía (lo declara multipart) | Payload guarda el tipo **declarado** si no reprocesa (`generateFileData.js:173-178`). **Propuesto:** el hook impone el tipo detectado por bytes | ninguno | P-02 |
| `filesize` (number, automático) | tamaño en disco | — | **Propuesto:** ≤ 5 MiB en hook; ≤ 10 MiB multipart con `abortOnLimit` | ninguno — **BRECHA menor** (no se usa para `sizes` del `<Image>`) | P-01 |
| `width`, `height` (number, automáticos) | dimensiones decodificadas | — | sharp (`generateFileData.js` `getImageSize`) | ninguno: el portal usa `fill` — **BRECHA menor** (se podrían usar para evitar CLS) | P-02 |
| `focalX`, `focalY` (number, automáticos; `focalPoint` por defecto `true`, `generateFileData.js:50`) | — | — (Payload pone 50/50) | — | ninguno — **BRECHA** (sin `object-position` en el portal) | — |
| `sizes.*` | — | — | **No existe**: `Media` no define `imageSizes` | ninguno | — |
| `url` (text, automático; `afterRead` lo genera) | — | — | Relativa sin `serverURL` (`generateFilePathOrURL.js:17-24`) | `page.tsx:422`; `noticias/page.tsx:183-186`; `noticias/[slug]/page.tsx:51,104,131-134,217`; `buscar/page.tsx:128-131`; `NewsGallery` vía `item.image.url` — **BRECHA:** se usa sin resolver a absoluta (§7.4) | P-09 |
| `thumbnailURL` (text, automático) | — | — | — | ninguno | — |
| `createdAt`, `updatedAt` (automáticos) | fecha de carga | — | — | ninguno | — |
| `prefix` | — | — | **No existe** (plugin S3 inactivo, sin `prefix`) — mantener así (§4.1) | ninguno | — |

### 9.2 Colección `noticias` (`apps/cms/src/collections/Noticias.ts`)

Access de colección: read = `readPublishedOrEditorial` (A/viewer/auditor/media-manager solo `_status = published`), readVersions = `canReadEditorialVersions` (`Noticias.ts:30-39`), create = `superadmin, editor, correspondent`, update = autores (corresponsal solo lo propio) + `reviewer` + `publisher`/`superadmin` (`roles.ts:157-192`), delete = `canDeleteEditorial`. Hooks de colección: `beforeOperation` (`forceDraftSaveUnlessPublisher`, `stripAuthorshipSort`), `beforeValidate` (slug), `beforeChange` (`createEnforceEditorialTransition`, restaura contenido para revisor/publicador), `afterChange` (revalidación, auditoría, notificación) (`Noticias.ts:261-300`).

| Campo Payload (tipo, req., índice, access, hooks) | Fuente WP | Importador (MIG-WP) / cargador (MIG-IMG) | Validación / guardia | Consumidor en el portal | Prueba |
|---|---|---|---|---|---|
| `title` (text, **req.**) `:134` | `post_title` | importador: `slice(0,150)`; cargador: no toca | `required` | `noticias/[slug]/page.tsx:45,49,99,155,167`; listados | existente MIG-WP (`tests/unit/wp-*.spec.ts`) |
| `slug` (text, **req., único, índice**) `:142`; `beforeValidate` lo genera si falta | `post_name` o `slugify(title)-ID` | importador lo fija; **cargador lo usa como clave de unión** | único | `noticias/page.tsx:180`; `getNewsBySlug` `news.ts:159-165`; `sitemap.ts:62` | P-12 |
| `summary` (textarea, **req.**, 20-300) `:153` | `post_excerpt` | importador: omite la noticia si < 20 | min/max | `noticias/[slug]/page.tsx:46,50,100,190-192`; `noticias/page.tsx:216-217` | existente MIG-WP |
| `content` (richText Lexical, **req.**) `:164` | `post_content` | importador: HTML→Lexical **sin `<img>`** (`migrate-wordpress.mjs:257`); cargador: **no toca** (no objetivo) | `required`; DEP-15 `safeHref` | `noticias/[slug]/page.tsx:197-198` → `components/RichText.tsx` — **BRECHA:** sin `case 'upload'` (`RichText.tsx:42-75`) | — (fuera de alcance) |
| `category` (select, **req., índice**) `:85` | categorías WP | importador: `mapCategory` | opciones fijas | `noticias/[slug]/page.tsx:91-94`; `noticias/page.tsx:206-210` | existente MIG-WP |
| `tags[].tag` (array, `maxRows 15`) `:170` | categorías WP | importador: hasta 10 | `maxRows` | `noticias/[slug]/page.tsx:202-204` | existente MIG-WP |
| `publishedAt` (date, índice) `:75` | `post_date_gmt`/`post_date` | importador: `wpDateInfo`; revisor/publicador no lo cambian | — | `noticias/[slug]/page.tsx:102,172-174`; `noticias/page.tsx:219-221`; `sitemap.ts:70`; orden `news.ts` (`sort=-publishedAt`) | existente MIG-WP |
| `featured` (checkbox, índice) `:63` | — | importador: `false`; cargador: no toca | — | filtro de portada `page.tsx:140` → `news.ts:130-132` | existente PERF-DB |
| `faculty` (relación `facultades`) `:103` | — | no se fija — **BRECHA** (campo sin valor en migradas) | — | ninguno en noticias | — |
| `author` (text) `:114` | `post_author` | no se fija — **BRECHA** | — | `noticias/[slug]/page.tsx:103,181-184` | — |
| `featuredImage` (relación `media`, opcional; access de colección; hooks editoriales) `:193-202` | miniatura (`_thumbnail_id`) o 1.ª imagen recuperable del cuerpo (`pickFeaturedImage`, `wpContent.mjs:129-138`) | **cargador:** id de la media cuyo `sourcePath` = `relPath` de la destacada; guardado por el autor como borrador | relación válida; flujo DEP-03 | ver §9.3 | P-10, P-11, P-12 |
| `featuredImageUrl` (text, opcional) `:204-212` | misma imagen, URL canónica WP | importador: URL de `www.unc.edu.py`; cargador: **no la borra** | — (**propuesto:** validar host/ruta en el portal) | `page.tsx:422`; `noticias/page.tsx:183-186`; `noticias/[slug]/page.tsx:51,104,131-134,217` | P-09 |
| `gallery[].image` (relación `media`, **req.** dentro de la fila) `:219`; `gallery` `maxRows 30` | `<img>` del cuerpo en orden | **cargador:** ids de media del cuerpo, excluida la destacada, máx. 30 | `maxRows`; flujo DEP-03 | `noticias/[slug]/page.tsx:226-234` → `NewsGallery` | P-11 |
| `gallery[].caption` (text) `:226` | `<img alt>` | `alt` si existe | — | `NewsGallery` (epígrafe) | P-11 |
| `approvalStatus` (select, índice, default `draft`) `:43`; fijado por `beforeChange` | — | importador: `draft` + pasos; cargador: pasos de `wpPublishFlow` (`buildStepBody`) | transición válida por rol (DEP-03) | ninguno (el portal filtra por `_status`) | existente `tests/unit/cms-editorial-transitions.spec.ts`; P-12 |
| `_status` (draft/published, automático de versiones) | — | ídem | `forceDraftSaveUnlessPublisher` | `where[_status][equals]=published` en `news.ts` (getNews, getNewsBySlug, getNewsSlugs, getNewsByQuery) | existente `tests/unit/cms-drafts-read-access.spec.ts` |
| `approvalHistory` (array, access create/update `false`, solo servidor) (`fields/approvalHistory.ts:19-63`) | — | no se envía | el servidor descarta lo recibido | ninguno | existente DEP-03 |
| `reviewComment` (virtual) | — | no se envía | obligatorio al rechazar | ninguno | existente DEP-03 |
| `createdBy` (relación `users`, access create/update `false`, read `canReadEditorialAuthorship`) (`fields/createdBy.ts:21-39`) | — | lo fija el servidor al crear (identidad autor del importador) | inmutable | ninguno | existente `tests/unit/cms-editorial-createdby.spec.ts` |
| SEO (meta título/descr./imagen) | — | **no existen** como campos: el portal deriva de `title`/`summary`/imagen (`noticias/[slug]/page.tsx:45-51,99-104`) | — | `generateMetadata` y JSON-LD `imageUrl` | P-09 |
| `blurDataURL` de noticia | — | **no existe** en `noticias` (vive en `media`) | — | — | — |

### 9.3 Cadena extremo a extremo `media → featuredImage → consulta → componente`

1. **Listado/búsqueda:** `getNews` usa `depth=1` (`news.ts:129`) y `select[...]` con `LIST_SELECT_FIELDS` (`news.ts:84-92`, incluye `featuredImage` y `featuredImageUrl` en `:89-90`); `getNewsByQuery` igual (`news.ts:245-246`). En Payload 3, `select` del documento padre **no recorta** los campos de la relación poblada salvo que se use `populate` o `defaultPopulate` en `media`: la media llega completa con `url`, `alt`, `blurDataURL` (HIPÓTESIS H-SEL, RDD-MIG-IMG-24; se prueba en P-14). **Conclusión: el `select` de listado NO necesita cambios para que funcione**; como optimización opcional, `populate[media][url|alt|blurDataURL]=true` o `defaultPopulate` en `Media`, solo si P-14 confirma la hipótesis.
2. **Detalle:** `getNewsBySlug` y `getNewsBySlugDraft` con `depth=2` y sin `select` (`news.ts:159-165,186-197`): pueblan `featuredImage` y `gallery[].image`. Sin cambios.
3. **Mapa del sitio:** `depth: 0, select: ['slug','publishedAt']` (`sitemap.ts:62`): no usa imágenes. Sin cambios.
4. **Tipo del portal:** `NewsItem.featuredImage` (`news.ts:67-71`) y `gallery[].image` (`:74-75`) **no declaran `blurDataURL`**, por eso los componentes usan `as any` (`page.tsx:427`, `noticias/page.tsx:192`, `noticias/[slug]/page.tsx:140,223,232`). **BRECHA:** agregar `blurDataURL?: string | null` al tipo.
5. **Componentes:** pasan `media.url` sin resolver a `next/image` (§7.4). **BRECHA principal** con almacenamiento local: URL relativa ⇒ 404 en el portal.
6. **Tipos compartidos:** `packages/cms-types/src/payload-types.ts` está **desincronizado** respecto de `apps/cms/src/payload-types.ts`: a `Noticia` le falta `featuredImageUrl` (y el orden de campos difiere); `Media` coincide salvo comentarios. Los consumidores de noticias no usan `@unc/cms-types` (lo usan `carreras`, `facultades`, bloques), así que hoy no rompe, pero los nuevos campos `sha256`/`sourcePath` exigen `npm run generate:types` y sincronizar el paquete.

## 10. Plan TDD (pruebas que fallan primero, en orden)

Todas con vitest (`tests/unit/**/*.spec.ts`, `vitest.config.mts`), sin red ni BD salvo la última fase. Comentarios en español con «qué hace y por qué» (AGENTS.md).

| # | Archivo | Qué afirma | Por qué falla hoy (RED) |
|---|---|---|---|
| P-01 | `tests/unit/cms-media-upload-config.spec.ts` | `buildConfig.upload.limits.fileSize` = 10 MiB y `abortOnLimit === true`; `Media.upload.staticDir` es absoluto y viene de `MEDIA_DIR`; `pasteURL === false`; `mimeTypes` sin `image/svg+xml`; existe `modifyResponseHeaders` que fija `nosniff` y `sandbox` | No hay `upload` global ni `staticDir`; SVG permitido (`Media.ts:36`) |
| P-02 | `tests/unit/cms-media-bytes-guard.spec.ts` | `validateUploadBytes` (función pura): rechaza HTML→`.jpg`, SVG→`.png`, PNG con `.jpg`, JPEG truncado, `foto.php.jpg`, `../x.jpg`, `..\\x.jpg`, NUL/controles, > 5 MiB; acepta `95.1-1-1.jpg` real sintético y PNG válido; devuelve tipo detectado y `sha256` | La función no existe |
| P-03 | `tests/unit/cms-media-alt.spec.ts` | validador de `alt`: vacío, espacios, > 300, `<` → error; texto normal → ok | `alt` solo `required` |
| P-04 | `tests/unit/cms-media-fields-access.spec.ts` | `blurDataURL` y `sha256` con `access.create/update` que devuelven `false` para todos los roles; `sourcePath` solo `superadmin`/`media-manager` | Sin access de campo; campos nuevos ausentes |
| P-05 | `tests/unit/cms-media-hooks.spec.ts` | hook `beforeOperation`: fija `data.sha256` desde `req.file.data` (ignora el del cliente) y lanza `APIError` 400 con lo que rechaza P-02; registra auditoría `resultado:'error'` (`logAudit` simulado) | Hook inexistente |
| P-06 | `tests/unit/cms-media-access.spec.ts` | matriz `canWriteMedia`/`canDeleteMedia` por rol (A, viewer, auditor, reviewer → false; los 6 roles → true; delete solo 3) — fija la política vigente para que nadie la amplíe sin querer | No hay prueba de media (hoy pasa en verde: es **prueba de caracterización**, se escribe primero igual) |
| P-07 | `tests/unit/cms-media-delete-guard.spec.ts` | `beforeDelete` con `payload.find`/`count` simulados: referenciada por `noticias.featuredImage`, `gallery.image`, versión o colección relacionada → `APIError` 409; no referenciada → pasa | Hook inexistente |
| P-08 | `tests/unit/cms-media-audit.spec.ts` | `afterChange`/`afterDelete` llaman `logAudit` con acción (`importar` si `sourcePath`), `documento` `filename (ID)` y `cambiosRelevantes` sin datos personales | Sin auditoría de media |
| P-09 | `tests/unit/portal-media-url.spec.ts` | `resolveMediaUrl`: relativa `/api/media/file/a.jpg` → absoluta con el origen público del CMS; absoluta de host permitido → igual; `javascript:`, `//evil`, host no permitido, `/api/otra` → `null`; respaldo `featuredImageUrl` solo `https://www.unc.edu.py/wp-content/uploads/...` | Función inexistente |
| P-10 | `tests/unit/portal-image-config.spec.ts` | `next.config.mjs`: patrón del CMS con `pathname '/api/media/file/**'`; `www.unc.edu.py` solo `'/wp-content/uploads/**'`; sin `migracion.unc.edu.py`; `lib/csp.ts` `img-src` sin `migracion` y con el CMS | Hoy `/**` y `migracion` presentes (`next.config.mjs:41-42`, `lib/csp.ts:17`) |
| P-11 | `tests/unit/mig-img-plan.spec.ts` | `scripts/lib/mediaLoader.mjs` (puro): de manifiesto + inventario produce el plan por noticia: destacada, galería sin duplicar la destacada, máx. 30, orden WP, `alt`/`caption`; omite rechazadas; idempotencia por `sha256` y `sourcePath` | Módulo inexistente |
| P-12 | `tests/unit/mig-img-loader-dryrun.spec.ts` | `--dry-run` no llama a `fetch` (simulado que falla si se invoca); falla antes de red sin `CMS_PASSWORD` (`requireCmsPassword`); identidades repetidas → error; el informe tiene conteos y **no** contiene la contraseña ni el token (busca la cadena) | Script inexistente |
| P-13 | `tests/unit/mig-img-loader-resume.spec.ts` | con `fetch` simulado: 429 → espera `Retry-After` y reintenta (reusa el patrón de `scripts/lib/retry.mjs` sin modificarlo); corte a mitad → segunda corrida no repite `POST` (consulta `sourcePath`); pausa entre peticiones inyectable | Script inexistente |
| P-14 | `tests/integration/mig-img-payload.int.spec.ts` (**requiere Postgres sintético autorizado**, como `docs/evidence/dep-03-validation.md`) | Payload real 3.87.1: criterios §8 1-17 por REST (`handleEndpoints`) y Local API con `overrideAccess:false`; H-SEL (populate con `select`); H-PUB (publicar la versión borrador con la imagen) | Sin implementación; necesita autorización del dueño para Docker |

Después de GREEN: `node harness/check.mjs --quick`, suite afectada, revisión independiente; staging sintético antes de cargar datos reales.

## 11. Diseño del cargador (`scripts/load-news-images.mjs` + `scripts/lib/mediaLoader.mjs`)

- **Entradas:** `--uploads=<dir>` (por defecto la carpeta actual), `--manifest=<json>`, `--dry-run`, `--only-upload` (fase 1), `--link` (fase 2), `--limit=N`, `--delay-ms` (por defecto 1500). Variables: `CMS_URL`, `MEDIA_EMAIL`/`CMS_PASSWORD` (media-manager), y para la fase 2 las tres identidades editoriales del importador. Nunca acepta contraseñas por argumento.
- **Fase 0 (dry-run, sin red):** lee inventario y manifiesto, calcula `sha256`, valida con la misma `validateUploadBytes` (compartida en un módulo puro), y escribe `mig-img-report.json` local (no versionado) con conteos: total, válidos, rechazados (por motivo), por año/mes, destacadas, de galería, huérfanas (sin noticia).
- **Fase 1 (subir):** login REST (`/api/users/login`) con usuario `media-manager`; para cada archivo: `GET /api/media?where[sourcePath][equals]=…` o `where[sha256][equals]=…` (`depth=0`, `select[id]`); si existe → `existente`; si no → `POST /api/media` multipart con `alt` y `sourcePath`. Pausado, `Retry-After` en 429, reintentos acotados en 5xx/red, nunca reintenta 4xx. Escribe progreso incremental (reanudable).
- **Fase 2 (enlazar):** por `slug`: lee la noticia con `draft=true`; si `rechazado` → bloqueada; autor guarda `featuredImage`/`gallery` (solo esos campos; si ya coinciden, no escribe); luego `remainingSteps`/`buildStepBody` de `wpPublishFlow.mjs` con revisor y publicador. Si la noticia aún no está en el CMS (importación en curso) → `pendiente`, se reintenta en otra corrida.
- **Salida:** solo conteos y nombres de archivo/slug; nunca token, contraseña ni cabeceras. Código de salida ≠ 0 si hubo errores no reintentables.
- **Lote futuro (2016-2023):** mismo comando con otra `--uploads`; la idempotencia evita duplicados.

## 12. Rollback

- **Código/config:** revertir el commit; el volumen y las filas quedan (datos aditivos).
- **Enlaces:** como `featuredImageUrl` no se borra, quitar `featuredImage`/`gallery` (vía flujo editorial) vuelve al estado actual; o, si solo hay borradores sin publicar, descartar esas versiones.
- **Media:** borrar por `sourcePath` (lista del informe) con `media-manager`; la guardia de borrado obliga a desenlazar primero.
- **Migración de columnas:** forward-only en producción (DEP-07); el `down` solo en BD vacía.
- **Volumen:** respaldo `tar` + manifiesto `sha256` previo a la carga; restauración probada en staging.

## 13. Riesgos y desconocidos

| Tipo | Descripción |
|---|---|
| Hipótesis H-PERM | El usuario `nextjs` no puede crear `/app/media` en el contenedor (raíz de `/app` sin `chown`, `Dockerfile:84-99`): la primera subida en producción fallaría. Sin probar (sin Docker). |
| Hipótesis H-SEL | `select` del listado no recorta la media poblada (Payload 3.87.1). Sin probar. |
| Hipótesis H-PUB | Publicar desde `aprobado` publica la última versión borrador con la imagen (mismo supuesto que usa el importador). Sin probar con Payload real para este campo. |
| Hipótesis H-NEXT | Comportamiento de Next 16 con `remotePatterns` hacia IP privada / `http://cms:3000` (si se eligiera URL interna). Por eso se recomienda URL pública. |
| Riesgo condicionado | Si se omite `abortOnLimit: true`, un archivo grande se guarda **truncado** sin error. |
| Riesgo condicionado | Con `Media.read = true`, `GET /api/media` lista a anónimos todas las media (incluidas las de borradores). |
| Riesgo condicionado | La IP en la auditoría del CMS es controlable por el cliente (`audit.ts:58-64`). |
| Desconocido | Cuántas SVG/PDF/DOC hay hoy en `media` (afecta §7.1); cuántas noticias del lote existen ya en el CMS (importación en curso). |
| Desconocido | Política de retención/respaldo fuera del host (DEP-08). |

## 14. Preguntas que solo decide el Product Owner

1. **Media de borradores:** ¿se acepta que una imagen subida para una noticia aún no publicada sea públicamente accesible por URL (decisión propuesta para esta tarea), o se exige ocultarla hasta publicar (más complejo e incompatible con S3 público)?
2. **Imágenes del cuerpo:** ¿basta con mostrarlas como galería al pie (propuesta), o deben volver a su posición dentro del texto (requiere reprocesar el cuerpo y que el portal renderice imágenes en el texto)?
3. **Re-publicación de 49+ noticias:** ¿se acepta que cada noticia publicada pase de nuevo por Revisor y Publicador para mostrar su imagen (respeta SEC-03, ya aprobada), o se prefiere esperar a que la importación termine y enlazar antes de publicar las que aún no lo estén?
4. **Noticias 2016-2023:** mientras no llegue un respaldo, ¿se mantiene el hotlink al sitio viejo como respaldo o se muestra la imagen institucional por defecto (y se corta toda dependencia del WordPress vivo)?

---

## 15. Decisiones del Product Owner (2026-10-23)

Registro de las decisiones tomadas por César (Product Owner) el 2026-10-23. Esta sección **se agrega** a la propuesta; no reescribe las secciones 1-14. Donde una decisión contradice el texto anterior, **prevalece esta sección**. No cambia código ni datos. Evidencia nueva: RDD-MIG-IMG-31 … 37 en `docs/research/evidence-register-mig-img.md`.

| ID | Decisión | Consecuencia sobre esta spec |
|---|---|---|
| D1 | Las imágenes de noticias en borrador **pueden ser públicas por URL**, siempre que no comprometa la seguridad de la base de datos. | Cierra la pregunta 1 (§14). Se confirma §7.3: `Media.read` sigue siendo público (`apps/cms/src/collections/Media.ts:8`) en esta tarea. La base de datos no queda expuesta por ello: el acceso es a un archivo por URL, no a Postgres. Riesgo remanente aceptado: `GET /api/media` lista las media a anónimos y una imagen de embargo sería alcanzable; queda como deuda (restringir el listado es una tarea aparte). |
| D2 | Diseño de la imagen destacada: **ancho completo desde el encabezado**, con degradé verde encima, **ruta de migas sobre el degradé**, y el **título y el contenido/resumen sobre ella**. La **galería va al final** de la noticia. | Cierra la pregunta 2 (§14): las fotos del cuerpo se muestran en la galería final (la propuesta), no dentro del texto. Se agrega el análisis de brecha de §15.1. |
| D3 | **Toda noticia debe tener imagen destacada**, para unificar. Todas están en `www.unc.edu.py`; si alguna no se encuentra, se **reporta al PO** para que la entregue. | La imagen destacada pasa a ser obligatoria para publicar (regla de contenido, no solo de importación). Ver §15.2. |
| D4 | Las noticias 2016-2023 se **desvinculan del sitio WordPress** (sin hotlink) y quedan **independientes**: imágenes servidas desde **nuestro almacenamiento** y metadatos en **nuestro Postgres**. | Cierra la pregunta 4 (§14): se **elimina** el respaldo por hotlink y se descarta la imagen institucional por defecto como solución permanente. `featuredImageUrl` queda **obsoleto** y debe reemplazarse por `featuredImage` (relación a `media`) en **todas** las noticias. Ver §15.3. |

La pregunta 3 (§14, re-publicación de 49+ noticias por Revisor y Publicador) **no quedó resuelta** por D1-D4. La decisión D0 del mismo día (el Revisor aprueba y publica; ver `docs/specs/editorial/SEC-03-D0-revisor-publica.md`) simplifica ese camino a una sola persona distinta del autor, pero sigue pendiente de decisión si se re-publica cada noticia o se enlaza la imagen antes de publicar las que aún no lo están.

### 15.1 Análisis de brecha de D2 (diseño del encabezado de la noticia)

Archivos comparados: `app/[locale]/noticias/[slug]/page.tsx` (255 líneas) y `components/news/NewsGallery.tsx` (único archivo de `components/news/`; no existe un componente de hero). Todo es lectura estática, no se ejecutó el portal.

| Requisito D2 | Estado actual | Evidencia | Brecha |
|---|---|---|---|
| Imagen de ancho completo desde el encabezado | **Parcial.** Hay un contenedor `relative h-72 w-full … sm:h-96 lg:h-[480px]` con `next/image` en modo `fill`. El encabezado del sitio es `fixed … top-0 z-50` con fondo `bg-[#004700]`, por lo que el hero queda debajo de él y no "sube" detrás del encabezado. | `page.tsx:131-145`; `components/layout/Header.tsx:37` | Definir si la imagen queda **detrás** del encabezado (hero a `top-0` con relleno superior) o **inmediatamente debajo**. Por confirmar con el PO. |
| Degradé **verde** sobre la imagen | **Falta.** El degradé es `from-slate-950 via-slate-950/60 to-transparent` (gris oscuro, solo hacia arriba). | `page.tsx:143` | Cambiar a un degradé verde institucional. El verde exacto (hay `#004700` en el encabezado y `#5CFF5C` como acento) está por confirmar. |
| Ruta de migas **sobre** el degradé | **Falta.** Las migas están en la columna de contenido (`max-w-3xl`), en gris `text-white/40`, debajo de la imagen; solo se solapan por el `-mt-24`. | `page.tsx:147,150-156` | Mover la ruta dentro del hero, sobre el degradé, con contraste AA (hoy `white/40` no lo garantiza). |
| **Título** sobre la imagen | **Falta.** El `h1` va en la columna de contenido, tras la categoría. | `page.tsx:158-168` | Mover título (y categoría) al hero. |
| **Contenido/resumen** sobre la imagen | **Falta.** El resumen es un bloque con borde lateral tras la fecha y el autor. | `page.tsx:170-194` | Mover el resumen (`summary`, hasta 300 caracteres) al hero; decidir si el cuerpo (`RichText`, `:196-199`) sigue debajo. "Contenido" se interpreta aquí como el resumen; por confirmar. |
| Galería **al final** | **Cumple.** `NewsGallery` va después de etiquetas y antes del enlace de volver. | `page.tsx:215-237,239-250` | Hoy la galería **incluye otra vez la imagen destacada** como primera foto (`featuredItem`, `:217-225,234`); con el hero grande, decidir si se excluye para no repetirla. |
| Toda noticia con imagen destacada (D3) | **Falta.** El hero solo se muestra si existe imagen; sin ella, `pt-28` (sin hero). | `page.tsx:131,147` | Con D3 el caso "sin imagen" desaparece; hasta entonces se necesita un estado definido (no un espacio vacío). |
| Imagen desde nuestro almacenamiento (D4) | **Parcial.** Prioriza `featuredImage.url`, con respaldo a `featuredImageUrl` (URL externa) en 6 puntos. No existe `resolveMediaUrl` (propuesto en §7.4); una `url` relativa de Payload (`/api/media/file/…`) se pasaría a `next/image` y daría 404 (RDD-MIG-IMG-17/18). | `page.tsx:51,104,131,134,147,217`; `lib/cms/mediaUrl.ts` no existe | Crear `resolveMediaUrl` (§7.4) y retirar el respaldo a `featuredImageUrl`. |
| Mismo criterio en tarjetas y portada | **Falta.** Listado, portada y buscador también usan `featuredImageUrl`. | `app/[locale]/noticias/page.tsx:183-186`; `app/[locale]/page.tsx:422`; `lib/cms/queries/news.ts:72,90` | Retirar el respaldo en los consumidores. |
| Banner de borrador | Existe y no choca con el hero (`fixed … z-[200]`). | `page.tsx:118-128` | Verificar que no tape las migas del hero. |

**Resumen de lo existente:** hero de imagen con `next/image`, `priority`, `blurDataURL` y `alt`; galería final con lightbox. **Falta:** degradé verde, migas, título y resumen **sobre** la imagen, resolución de URL de Media, obligatoriedad de imagen. La implementación debe pasar por el flujo SDD+RDD+TDD de `AGENTS.md` y respetar `docs/engineering/SDD-RDD-HARNESS.md`.

### 15.2 Consecuencias de D3 (imagen destacada obligatoria)

- Un campo `required: true` sobre `Noticias.featuredImage` (`apps/cms/src/collections/Noticias.ts`, hoy `required: false`) rompería la edición de las noticias heredadas y los borradores existentes. Propuesta: exigirla **al enviar a revisión o publicar** (validación en la transición), no al crear, y medir primero el faltante.
- **Cuántas noticias no tienen imagen hoy: por confirmar.** Solo hay dos hechos verificados: existen 237 imágenes 2024-2026 descargadas fuera del repo (RDD-MIG-IMG-28) y el importador usa la primera imagen del cuerpo cuando falta la miniatura. El lote de 2016-2023 **no** está descargado.
- Procedimiento propuesto (sin ejecutar): una consulta de solo lectura que liste las noticias cuyo `featuredImage` sea nulo y cuyo `featuredImageUrl` no resuelva a un archivo cargado; entregar la lista al PO para que aporte las imágenes que no se encuentren en `www.unc.edu.py`.
- Descargar las imágenes de 2016-2023 desde `www.unc.edu.py` requiere **autorización y alcance explícitos** (AGENTS.md prohíbe escaneos agresivos y alto volumen; ver «Límites de las pruebas adversariales»): lista cerrada de URLs tomada del volcado, con tasa baja, y verificación de formato y tamaño (como en RDD-MIG-IMG-28).

### 15.3 Consecuencias de D4 (independencia de WordPress)

- Se suprime el respaldo por hotlink de §14.4. Cuando D4 se cumpla, `featuredImageUrl` deja de usarse y se marca **obsoleto**; se retira del esquema en una migración posterior, solo hacia adelante (DEP-07), después de verificar que ninguna noticia depende de él.
- `next.config.mjs` permite `www.unc.edu.py/**` y `migracion.unc.edu.py/**` en `remotePatterns`, y `lib/csp.ts` los incluye en `img-src` (RDD-MIG-IMG-19). Una vez que no quede ninguna imagen remota, ambos permisos deben **quitarse**, para cerrar la dependencia y reducir superficie.
- Las imágenes **dentro del cuerpo** de las noticias de 2016-2023 también cargan desde el sitio viejo; se resuelven por la galería final (D2), como indica §14.2. Los enlaces a archivos (PDF, etc.) en el texto no están cubiertos por esta spec: por confirmar.
- Almacenamiento: disco local con volumen (opción A de §4); el plugin S3/MinIO sigue bloqueado (ver `docs/FASE-4-MINIO-DIAGNOSTICO.md`). La independencia de WordPress no exige S3, pero sí **backup** de ese volumen (DEP-08, pendiente).
- Metadatos en Postgres: la tabla `media` (propuesta en §5.1) guarda nombre, tipo, tamaño, texto alternativo y miniaturas; la relación `featuredImage` queda en `noticias`. Con el esquema de §4.1 se puede pasar a S3 sin otra migración.

### 15.4 Estado de las preguntas del PO (§14)

| Pregunta | Estado |
|---|---|
| 1. Media de borradores | **Cerrada** por D1 (aceptado). |
| 2. Imágenes del cuerpo | **Cerrada** por D2: galería al final. La imagen destacada va en el hero de ancho completo. |
| 3. Re-publicación de 49+ noticias | **Abierta** (simplificada por D0). |
| 4. Noticias 2016-2023 | **Cerrada** por D4: sin hotlink; imágenes propias; `featuredImageUrl` obsoleto. |

---

## 16. Implementación fase 1 (almacenamiento local)

**Estado:** implementada y verificada en local (2026-10-23), sin commit. Alcance mínimo de la opción A: almacenamiento de `media` en **disco local persistente con interruptor explícito**, endurecimiento de subida y respaldo del volumen. **Fuera de esta fase (pendiente, ver §16.6):** columnas `sha256`/`sourcePath` (y su migración), cargador masivo, `resolveMediaUrl` del portal, cabeceras `modifyResponseHeaders`, guardia de borrado de media en uso, límite de tasa por usuario, auditoría de media, `remotePatterns`/CSP. Evidencia: RDD-MIG-IMG-38 a 45.

### 16.1 Comportamiento (SDD)

1. **Selector `MEDIA_STORAGE`** (`apps/cms/src/config/mediaStorage.ts`, función pura `resolveMediaStorage`): `local` por defecto si falta; `s3` solo si se elige de forma explícita **y** existen `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET` y `S3_ENDPOINT`; si no, el CMS **no arranca** con un error que nombra las variables faltantes sin mostrar valores. Un valor distinto de `local`/`s3` también aborta (sin eco del valor). Tener las claves S3 ya **no** activa S3.
2. **Directorio `MEDIA_DIR`** (modo `local`): en producción es obligatorio y **absoluto** (el volumen); en desarrollo, por defecto `media` relativo al cwd del CMS (git-ignorado, como antes). Se rechazan vacío, NUL, segmentos `..` y la raíz del sistema. Durante `next build` (`NEXT_PHASE=phase-production-build`) no se exige (el Dockerfile construye sin variables); el arranque real vuelve a validar.
3. **Tope de subida** `MEDIA_MAX_BYTES` (por defecto 10 MiB; techo 11 MiB): `buildUploadOptions` fija `upload.limits.fileSize` y **`abortOnLimit: true`** en `buildConfig` (RDD-MIG-IMG-39); además `experimental.proxyClientMaxBodySize: '12mb'` en `apps/cms/next.config.mjs` (RDD-MIG-IMG-41) para que el proxy de Next no recorte el cuerpo antes que Payload.
4. **Sin SVG:** `image/svg+xml` sale de `Media.upload.mimeTypes` (nada en el repo sube SVG: búsqueda en `apps/cms/src`, `apps/cms/scripts`, `scripts/`). El hook de `blurDataURL` ya no distingue SVG.
5. **Guardia de bytes** (`apps/cms/src/utilities/uploadGuard.ts`, `validateUploadFile`, usado por el hook `beforeOperation` de `Media`): la firma real (JPEG, PNG, WebP, GIF, AVIF, `%PDF-`, `D0CF11E0…` = DOC, `PK\x03\x04` = DOCX) debe coincidir con el MIME declarado **y** con la extensión; las imágenes además se leen con `sharp.metadata()`; el nombre no admite separadores, `..`, NUL/controles ni doble extensión peligrosa (`.php.jpg`, `.html.png`…); el archivo no puede estar vacío ni superar `MEDIA_MAX_BYTES` (repite el tope para la Local API). Rechazo = **400** con mensaje genérico (sin eco del contenido); el MIME se fija al detectado. Se acepta `95.1-1-1.jpg` y el logo real `premio-calidad-conacyt.jpg`.
6. **Volumen persistente:** `compose.prod.yaml` monta el volumen nombrado `cms_media` (`unc_cms_media_prod`) en `/app/media` del servicio `cms`; `MEDIA_DIR: /app/media` es literal en el ancla `x-cms-env`; `MEDIA_STORAGE: ${MEDIA_STORAGE:-local}` y `MEDIA_MAX_BYTES: ${MEDIA_MAX_BYTES:-10485760}` se documentan en `.env.prod.example`. `apps/cms/Dockerfile` (etapa `runner`) hace `ENV MEDIA_DIR=/app/media` y `mkdir -p /app/media && chown nextjs:nodejs /app/media`, de modo que Docker copie el dueño al volumen vacío (hipótesis H-PERM, **sin probar con Docker**).
7. **Respaldo:** `scripts/backup/backup.sh` (paso 2b) empaqueta `/app/media` como `media-volume.tar.gz` desde el contenedor `unc-cms-prod` (variable `CMS_CONTAINER`), verifica que sea legible y queda dentro de `checksums.sha256` (sha256). Restauración y límites en `docs/BACKUP_RECOVERY.md` (Scenario 2b).
8. **Guard del harness:** `guard-media-volume` (`harness/guards.mjs`, 10.º guard) falla si el compose no monta un volumen **nombrado** declarado en `MEDIA_DIR` o el Dockerfile no entrega ese directorio a `nextjs`.
9. **Revalidación CMS → portal (DEP-19b):** `resolvePortalBaseUrl` normaliza `PORTAL_URL` (solo origen http(s), sin credenciales) y `describeFetchFailure` reporta el código de red; el log pasa de «error de red (TypeError)» a «error de red (ECONNREFUSED) -> localhost:3001». Un fallo sigue sin bloquear el guardado (el helper nunca lanza). Causa raíz local en RDD-MIG-IMG-43.

### 16.2 Variables de entorno

| Variable | Servicio | Valores / por defecto | Dónde se documenta |
|---|---|---|---|
| `MEDIA_STORAGE` | cms, cms-migrate | `local` (defecto) o `s3`. `s3` exige `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_ENDPOINT`; inválido o incompleto → el CMS no arranca | `.env.prod.example`, `apps/cms/.env.example`, `DEPLOY.md` |
| `MEDIA_DIR` | cms, cms-migrate | Producción: ruta **absoluta** (fijada en el compose a `/app/media`, no se configura desde `.env.prod`); desarrollo: `media` | `compose.prod.yaml`, `apps/cms/.env.example` |
| `MEDIA_MAX_BYTES` | cms, cms-migrate | Entero de bytes entre 1 y 11 534 336 (11 MiB); por defecto 10 485 760 (10 MiB). Un valor mayor impide el arranque (límite del proxy de Next; subirlo exige subir también `proxyClientMaxBodySize`, el techo del código y el nginx) | `.env.prod.example`, `DEPLOY.md` |
| `PORTAL_URL` | cms | Origen http(s) del portal (por defecto `http://localhost:3000`); se descartan ruta y credenciales; inválido → no se llama a `fetch` y se registra | `apps/cms/.env.example`, `DEP-10` |
| `REVALIDATION_SECRET` | portal **y** cms | **Mismo valor** en ambos; si difiere el portal responde 401, si es débil 503 | `apps/cms/.env.example`, `DEPLOY.md` |

**Compatibilidad hacia atrás (acción del operador):** los despliegues que usan S3/MinIO deben fijar `MEDIA_STORAGE=s3`; sin él, el CMS pasa a disco local y las URL que ya estén guardadas en la base (apuntan a `S3_PUBLIC_URL`) seguirán apuntando al bucket. Hoy no hay media en producción que dependa de S3 (MinIO no disponible, DEP-11).

### 16.3 nginx (IMPLEMENTADO 2026-10-23, tarea NGX-01)

Antes (informe): `client_max_body_size 100m` en el CMS y `depends_on: minio` en `cms`. **Decisión del PO (2026-10-23): aplicar ambos cambios.** Ahora:

- **Tope de cuerpo del CMS = 12m** (`infrastructure/nginx/nginx.conf`, server `cms.unc.edu.py`). Orden de límites, de fuera a dentro: nginx 12m **>=** Next `proxyClientMaxBodySize: '12mb'` (`apps/cms/next.config.mjs`) **>** techo de media 11 MiB + sobrecarga multipart. Se deja nginx igual o por encima de la app para que un archivo de, p. ej., 11,5 MiB reciba el **413 limpio de la app** y no un 413 genérico de nginx; y bien por debajo de 100m para no consumir ancho de banda antes de rechazar. Subir `MEDIA_MAX_BYTES` o `proxyClientMaxBodySize` obliga a subir este valor en el mismo cambio. Los PDF/DOC comparten el tope (`MEDIA_MAX_BYTES` 10 MiB por defecto).
- **Límite de tasa solo para `POST /api/media`:** `map $request_method $media_write_key` (vacía salvo POST) + `limit_req_zone $media_write_key zone=cms_media:10m rate=10r/m` en el contexto `http`, y `location ~ ^/api/media/?$` con `limit_req zone=cms_media burst=5 nodelay; limit_req_status 429;`. nginx no cuenta las peticiones con clave vacía, así que GET/PUT/DELETE no se ven afectados. La location **copia** las directivas de proxy de `location /` (el archivo se monta solo, sin `include`). `/api/users/login` conserva su zona `cms_login`.
- **Límites:** cuenta por IP, no por usuario (editores tras una misma IP comparten cupo; un atacante con muchas IP lo evita). Una **carga masiva** legítima (p. ej. las 237 imágenes del cargador de §11) superaría 10/min + burst 5: ejecutarla contra la red interna (`http://cms:3000`), o subir el límite temporalmente. **No probado con nginx real** (`nginx -t` y `curl` requieren Docker, no autorizado en este paso).
- **`files.unc.edu.py` y MinIO opcional:** se eliminó el `upstream minio_upstream` estático (nginx lo resuelve al arrancar y abortaría con «host not found in upstream» si el contenedor no existe). Ahora `files.*` usa `resolver 127.0.0.11` + `set $minio_backend minio:9000; proxy_pass http://$minio_backend;` (resolución por petición). Sin MinIO responde **502** en ese dominio, esperado con `MEDIA_STORAGE=local`.
- **Compose:** ver §16.8.

### 16.4 Pruebas (TDD, negativas primero)

| Archivo | Qué afirma |
|---|---|
| `tests/unit/mig-img-media-storage.spec.ts` | Selector (`s3` sin credenciales falla sin filtrar secretos, valor inválido, `MEDIA_DIR` absoluto en producción, `..`, NUL, raíz, build), `MEDIA_MAX_BYTES`, `buildUploadOptions` con `abortOnLimit`, cableado en `payload.config.ts`/`Media.ts`, coherencia con `proxyClientMaxBodySize` |
| `tests/unit/mig-img-upload-guard.spec.ts` | HTML→`.jpg`, SVG, `a.php.jpg`, rutas, NUL, vacío, MIME y extensión cruzados, tope, JPEG truncado, PDF falso; aceptación de JPEG/PNG/WebP/GIF/PDF/DOC/DOCX, `95.1-1-1.jpg` y el logo real de CONACYT |
| `tests/unit/revalidation-diagnostics.spec.ts` | `resolvePortalBaseUrl`, `describeFetchFailure` y el log con causa y host sin secreto; nunca lanza |
| `harness/guards.test.mjs` | `guard-media-volume` (fixtures malas/buena y repo real); `guard-backup-encrypted` (BKP-01) |
| `tests/deploy/backup-encrypted.test.mjs` | BKP-01: `encrypt-dump.sh` con gpg real (fail-closed con secreto ausente/corto, ida y vuelta, sha256, borrado del texto plano, sin eco del secreto) y workflow (validación previa, solo `.gpg` subido, limpieza `always()`) |
| `tests/deploy/nginx-cms-limits.test.mjs` | NGX-01: `12m`, orden de límites frente a Next, zona `cms_media` en `http`, location de `/api/media` con proxy idéntico, sin `upstream` estático a minio |
| `tests/deploy/compose-minio-optional.test.mjs` | MIN-01: perfil `s3`, `cms` sin `depends_on: minio`, `deploy.yml` sin `minio` en el `up -d`, DEP-11 anotado |

### 16.5 Riesgos

| Tipo | Descripción |
|---|---|
| Riesgo condicionado (MITIGADO 2026-10-23, BKP-01) | `.github/workflows/backup.yml` subía el volcado como artefacto de Actions (retención 30 días) en un repositorio **público**. Ahora el volcado se **cifra con gpg AES256 dentro del runner** (`scripts/backup/encrypt-dump.sh`, secreto `BACKUP_ENCRYPTION_PASSPHRASE` >= 20 caracteres) y solo se sube el `.gpg` + sha256 (retención 14 días); guard `guard-backup-encrypted`. **Residual:** (a) los artefactos anteriores (hasta 30 días) están en claro; (b) `DATABASE_URL` debe ser alcanzable desde el runner: si la BD no está expuesta, el job no puede ejecutarse y la vía recomendada es `pg_dump` en el VPS + copia externa cifrada (destino sin decidir); (c) la frase vive en GitHub. Ver `docs/BACKUP_RECOVERY.md`. |
| Hipótesis H-PERM | El `chown` del Dockerfile y el volumen nombrado nuevo dan escritura a `nextjs`; no probado con Docker. Un volumen ya existente con otro dueño no hereda permisos. |
| Hipótesis | `proxyClientMaxBodySize` aplica igual en `next start`/standalone que en `next dev`; verificado solo en dev. |
| Riesgo | El volumen está en el mismo host que el CMS: sin copia fuera del host (DEP-08) un fallo de disco pierde las imágenes. `backup.sh` es manual y local; no hay cron para el volumen. |
| Riesgo | `Media.read` sigue público (D1): `GET /api/media` lista nombres a anónimos. Deuda aparte. |
| Riesgo | `sharp.metadata()` lee solo la cabecera: un JPEG con cabecera válida y cuerpo corrupto pasa la guardia (se vería roto, no ejecutable). Defensa final: `nosniff`, pendiente `modifyResponseHeaders`. |
| Riesgo | Un `unhandledRejection` «Unexpected end of form» apareció una vez en `next dev` cuando Next recortó el cuerpo (antes del ajuste). No reapareció con 413; no se verificó en producción. |
| Observación | Un `DELETE /api/media/:id` devolvió 403 una vez y 200 al repetirlo (sin causa conocida; no reproducido). |

### 16.6 Pendiente para la siguiente fase

1. Columnas `sha256` (único) y `sourcePath` en `media` + migración manual (DEP-07) e idempotencia del cargador.
2. Cargador `scripts/load-news-images.mjs` + `scripts/lib/mediaLoader.mjs` (REST con `media-manager`) y `--dry-run`.
3. `lib/cms/mediaUrl.ts` (`resolveMediaUrl`), `blurDataURL` en el tipo del portal y `remotePatterns`/CSP acotados (con `media.url` relativa el portal daría 404, §7.4).
4. `modifyResponseHeaders` (`nosniff`, CSP `sandbox`), `pasteURL: false`, guardia de borrado de media referenciada, límite de tasa por usuario y auditoría de media.
5. Cron/respaldo externo del volumen (DEP-08) y destino externo de las copias (decisión del PO). *(Ajuste del nginx y `depends_on: minio`: hechos, §16.3 y §16.8.)*
6. Prueba de integración P-14 con Postgres sintético autorizado (criterios §8 por REST) y prueba del volumen con Docker autorizado.

*Actualización 2026-10-24:* el punto 1 (columnas y migración), el 3 (`remotePatterns`/CSP acotados) y `modifyResponseHeaders` del punto 4 se hicieron en la fase 2a (§17).

### 16.7 Rollback

Revertir el commit. Con `MEDIA_STORAGE` sin definir el CMS usa disco local; los archivos del volumen `unc_cms_media_prod` y las filas `media` no se borran. Para volver a S3: `MEDIA_STORAGE=s3` con todas las `S3_*`. Ninguna migración de esquema en esta fase.

### 16.8 MinIO opcional en producción (IMPLEMENTADO 2026-10-23, tarea MIN-01)

**Decisión del PO:** quitar la dependencia dura de MinIO. **Comportamiento (SDD):** Given `MEDIA_STORAGE` por defecto (`local`), When se ejecuta `docker compose up` sobre `compose.prod.yaml`, Then no se crea, descarga ni espera el servicio `minio` y `cms` arranca solo con `postgres` sano y `cms-migrate` completado.

- `minio` lleva `profiles: ["s3"]`; se retiró `depends_on: minio` de `cms`. **Construcción elegida:** quitar el `depends_on` y **no** usar `depends_on.required: false`, porque este último exige Compose >= 2.20 (changelog de Compose v2.20.0; ver https://docs.docker.com/reference/compose-file/services/#depends_on) y `DEPLOY.md` solo exige «v2.x»: en un v2 anterior el archivo entero sería rechazado. Un `depends_on` sin `required: false` hacia un servicio de perfil apagado también falla. Perfiles: https://docs.docker.com/compose/how-tos/profiles/ (un servicio con perfil solo arranca con `--profile`/`COMPOSE_PROFILES` o **si se nombra explícitamente**).
- **`deploy.yml` SÍ requirió un cambio mínimo de correctitud:** su `up -d … postgres minio cms portal nginx` nombraba `minio`, lo que **activa el perfil** y habría vuelto a arrastrar la imagen sin disponibilidad. Se quitó `minio` de la lista; el test `dep19a (1)` ahora exige «servicios por defecto menos `cms-migrate`» (excluye los que tienen `profiles`).
- Las variables `S3_*`/`MINIO_*` del ancla `x-cms-env` pasan a `${VAR:-}` (Compose interpola el archivo completo aunque el perfil esté apagado; sin default avisaría en cada `up`). Con `MEDIA_STORAGE=s3` el CMS valida que no estén vacías (§16.1.1).
- **DEP-11 (imagen sin fijar):** `quay.io/minio/minio:latest` **no se cambió** (no se puede verificar un tag sin acceso a registros; no se inventa). Se anotó «DEP-11 pendiente». `guard-deploy-steps` **sigue reportando `:latest`, a propósito**: el hallazgo es verdadero para el perfil opcional, aunque ya no afecte al despliegue por defecto. Se acepta que ese guard quede rojo hasta fijar una versión.
- **Cómo activar S3:** `MEDIA_STORAGE=s3` + credenciales en `.env.prod` y `docker compose --profile s3 up -d minio` (`DEPLOY.md` paso 14); recrear `cms`. Un contenedor `unc-minio-prod` ya existente seguirá corriendo hasta pararlo a mano (`--remove-orphans` no lo retira: sigue definido en el compose).
- **No verificado (requiere Docker):** `docker compose config`/`up` con y sin perfil, arranque real de nginx sin el contenedor `minio`, y que el CMS en modo `local` arranque sin MinIO.

---

## 17. Fase 2a: capa de normalización de subidas

**Estado:** implementada y verificada en local (2026-10-24), sin commit. **Pedido del PO:** los editores subirán muchas fotos (noticias, galerías, fotos de autoridades, logos) desde teléfonos (4-12 MB, con GPS); el portal debe seguir rápido, la BD y el disco livianos y las subidas seguras: «una capa ANTES de guardar». **Alcance:** solo la colección `media`; PDF/DOC/DOCX no se transforman. **Fuera:** cargador masivo (§17.8), `imageSizes`/miniaturas y `prefix` (rompen el paso a S3, §4.1), `pasteURL: false`, guardia de borrado de media en uso, límite por usuario y auditoría de media (siguen en §16.6). Evidencia: RDD-MIG-IMG-50 a 62.

### 17.1 Comportamiento (SDD)

Tubería en `beforeOperation` de `media` (`apps/cms/src/hooks/media/uploadPipeline.ts`, `prepareMediaUpload`), el único punto con `req.file` disponible ANTES de que Payload mida, fije el MIME y escriba el archivo (RDD-MIG-IMG-50, 51):

1. **Acceso temprano:** sin `overrideAccess`, si `canWriteMedia` no se cumple → **403** antes de calcular nada (beforeOperation corre antes del access de Payload; evita trabajo de CPU y sondeo de hashes por anónimos). El tope de 10 MiB de multipart sigue actuando antes (413).
2. **Guardia de bytes de fase 1** sin cambios (`validateUploadFile`) → 400.
3. **Huella:** `sha256` de los bytes **originales**. Decisión: el cargador puede calcularla sobre el archivo local antes de subir y no depende de la versión de sharp ni de los parámetros de codificación; el hash del resultado no se guarda (mantenerlo simple). Si otro documento ya la tiene → **409** «Esta imagen ya está en la biblioteca de medios (ID n). Use la existente…» con `errors[0].data = { id, filename }` (RDD-MIG-IMG-59). No se crea archivo ni fila. Al reemplazar el archivo de un documento se excluye ese mismo documento. Se eligió el error explícito (no la idempotencia silenciosa) para que el editor sepa que debe reutilizar la imagen y para que el cargador distinga «existente» de «subido».
4. **Normalización** (`apps/cms/src/utilities/imageNormalize.ts`, `normalizeImage`, función pura) para JPEG/PNG/WebP/AVIF: decodificación **completa** con `failOn: 'warning'` y `limitInputPixels` de 120 MP; `autoOrient`; lado largo ≤ **2560 px** sin agrandar (`fit: 'inside'`, `withoutEnlargement`); sRGB; **sin** EXIF/GPS/XMP/IPTC/ICC; recodificación en el **mismo formato** (JPEG mozjpeg calidad 82 progresivo; PNG sin pérdida, `compressionLevel` 9, alfa intacto; WebP 82; AVIF 60). GIF: solo validación por decodificación completa, bytes sin tocar. Se reemplazan `req.file.data`, `size` y `mimetype` (nombre y extensión no cambian). Imagen dañada o truncada → **400** «La imagen está dañada o incompleta…» (sin texto de libvips). Esto cierra el riesgo de §16.5 sobre `sharp.metadata()` (RDD-MIG-IMG-54).
5. **Procedencia** (`enforceMediaProvenance`, primer `beforeChange`): `sha256` lo fija **solo el servidor** (el valor del cliente se descarta); editar sin archivo conserva el previo; alta sin archivo propio («Duplicar» del panel) → NULL. `sourcePath` se recorta y vacío → NULL.
6. El hook de `blurDataURL` (segundo `beforeChange`) ya recibe la versión normalizada (Payload reasigna `req.file`, `generateFileData.js:285-289`).

**Por qué no las opciones de Payload** (RDD-MIG-IMG-52): `resizeOptions`/`formatOptions` son únicas para la colección (un solo formato de salida) y, sin ellas, Payload guarda JPEG/PNG con los bytes del cliente (con GPS) y mide sin aplicar la orientación. `withMetadata` no se define (Payload tampoco reinyecta metadatos cuando reprocesa WebP/AVIF/GIF).

### 17.2 Contrato de datos (`media`)

| Campo | Tipo | Regla |
|---|---|---|
| `sha256` | text, **único**, índice `media_sha256_idx` | 64 hex, del original; lo fija el servidor; `admin.readOnly`. Filas anteriores: NULL (el índice único de Postgres admite varios NULL). |
| `sourcePath` | text opcional (máx. 512) | Relativa con `/`, sin `..`/`.`/segmentos vacíos, sin `\`, unidad de disco, `://` ni controles (`validateSourcePath`, `apps/cms/src/utilities/mediaProvenance.ts`). Mensaje en español sin eco del valor. No es único: la idempotencia la da `sha256` (se aparta de §5.1, que lo pedía único). |
| `alt` | text obligatorio (máx. 300) | Recortado no vacío, sin `<`/`>` (se rechaza, no se escapa); ayuda «Describe la imagen para personas que usan lector de pantalla…». |

**Migración** `apps/cms/src/migrations/20261024_120000_mig_img_02_media_provenance.{ts,json}` (registrada en `index.ts` y `README.md`): `ADD COLUMN IF NOT EXISTS "sha256" varchar`, `"source_path" varchar` y `CREATE UNIQUE INDEX IF NOT EXISTS "media_sha256_idx"`. `down` se niega si alguna fila tiene `sha256` o `source_path`. Nombres = los de Payload (RDD-MIG-IMG-60, contrastado con el push de dev). **No** se ejecutó `payload migrate` en ninguna BD. Tipos: `apps/cms/src/payload-types.ts` lo regeneró el propio servidor de dev (autoGenerate; `npm run generate:types` por CLI falla en este equipo porque no encuentra un `PAYLOAD_SECRET` válido); `packages/cms-types` con `npm run sync:types` y retiro manual del bloque `declare module 'payload'` (la regex de `scripts/sync-types.js` no lo quita porque el bloque contiene llaves anidadas).

### 17.3 Cabeceras al servir (§7.2 y §16.6.4)

`upload.modifyResponseHeaders = applyMediaFileHeaders` (`apps/cms/src/utilities/mediaHeaders.ts`; existe en 3.87.1, RDD-MIG-IMG-58): `X-Content-Type-Options: nosniff` siempre; `Content-Security-Policy: default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox` en todo salvo PDF (el visor de PDF del navegador no abre con `sandbox`); `Cache-Control: public, max-age=86400` en imágenes (sin `immutable`). **Límite:** con `MEDIA_STORAGE=s3` el plugin responde antes y estas cabeceras no se aplican (las debe fijar el bucket/CDN).

### 17.4 Portal: entrega de imágenes

`lib/images/nextImagesConfig.mjs` (`buildImagesConfig(env)`, `cmsPublicOrigin(env)`), usado por `next.config.mjs` (`images: buildImagesConfig(process.env)`) y por `lib/csp.ts`:

- **Desarrollo:** `dangerouslyAllowLocalIP: true` (Next 16 rechaza IP locales, RDD-MIG-IMG-62); CMS local (`localhost`/`127.0.0.1:3002`) solo `pathname: '/api/media/file/**'`; MinIO local `:9100`.
- **Producción:** sin `dangerouslyAllowLocalIP`; origen del CMS desde `NEXT_PUBLIC_CMS_URL` (solo https, puerto exacto) con `/api/media/file/**`. **Sin variable en el build** se usa `https://cms.unc.edu.py`, porque el Dockerfile del portal no pasa `NEXT_PUBLIC_CMS_URL` como build-arg y `remotePatterns` se congela en `next build`. `MEDIA_HOSTNAME` (S3/CDN) solo si es un nombre DNS válido y por https. WordPress solo `/wp-content/uploads/**`; se quitó `migracion.unc.edu.py` (D4). No se agregaron variables nuevas (DEP-10).
- **CSP:** `img-src` = `'self' data: blob:` + origen público del CMS + hosts https de la misma lista; se calcula por llamada desde el objeto `process.env` (no el literal `process.env.NEXT_PUBLIC_*`, que Next reemplaza al construir).

### 17.5 Pruebas (TDD, negativas primero) y verificación en vivo

| Archivo | Qué afirma |
|---|---|
| `tests/unit/mig-img-normalize.spec.ts` | Cuerpo corrupto con cabecera válida (pasa `metadata()`, falla la decodificación), truncado, PDF; EXIF+GPS eliminados; orientación 6 aplicada; CMYK→sRGB; políglota descartado; 6000x4000→2560x1707; 3000x5000→1536x2560; no agranda; JPEG progresivo; PNG con alfa exacto; WebP sigue WebP; GIF intacto; logo real |
| `tests/unit/mig-img-media-pipeline.spec.ts` | 403 temprano (anónimo/auditor) sin consultar BD; 400 HTML y corrupto; 409 con ID; exclusión del propio documento; hash del original; regresión `req.context` reemplazado (RDD-MIG-IMG-57); `overrideAccess`; sha256 del cliente ignorado; `validateSourcePath`; cabeceras; cableado (sin `imageSizes`/`prefix`/`formatOptions`), `alt` y descripción del panel |
| `tests/unit/mig-img-migration.spec.ts` | SQL idempotente y aditivo, nombres de Payload, NULL admitidos, snapshot encadenado e idéntico fuera de `media`, `down` seguro |
| `tests/unit/portal-images-config.spec.ts` | Matcher real de Next: producción sin IP local ni localhost, solo `/api/media/file/**`, https y puerto exactos, WordPress acotado, `MEDIA_HOSTNAME` inválido ignorado, host canónico por defecto; desarrollo con `dangerouslyAllowLocalIP`; CSP de producción con el CMS |

Verificación en vivo (RDD-MIG-IMG-61, 62): JPEG 6000x4000 con GPS y orientación 6 → 1707x2560 sin EXIF (608 KB → 28 KB); 409 en la repetición; 403 anónimo; 400 corrupto; PNG/WebP conservan formato; cabeceras presentes; `/_next/image` del CMS local → 200.

### 17.6 Riesgos

| Tipo | Descripción |
|---|---|
| Riesgo | `failOn: 'warning'` rechaza también fotos reales con pequeñas corrupciones que un visor tolera; el editor debe reexportarlas (el mensaje lo indica). |
| Riesgo | WebP/AVIF se codifican dos veces (nuestra calidad 82/60 y luego Payload con valores por defecto, RDD-MIG-IMG-51): pérdida leve. GIF lo recodifica Payload (comportamiento previo). |
| Riesgo | Un JPEG ya muy comprimido puede crecer algo al recodificarse a calidad 82. |
| Riesgo | Dos subidas idénticas simultáneas: la segunda la frena el índice único (error de validación de Payload, no el 409 explicativo). |
| Riesgo | La normalización ocupa CPU/memoria del CMS (sharp, hasta 120 MP); el tope de 10 MiB y el `limit_req` de nginx (10/min) la acotan. Sin cola. |
| Riesgo | La media anterior a esta fase (p. ej. ID 6) no tiene `sha256` ni fue normalizada: resubir el mismo archivo NO da 409. Rellenar exige un script aparte. |
| Hipótesis | En producción `cms.unc.edu.py` resuelve a una IP pública desde el contenedor del portal; si resolviera a una privada, `/_next/image` daría 400. |
| Riesgo | Con `MEDIA_STORAGE=s3` no aplican las cabeceras de §17.3. |

### 17.7 Rollback

Revertir los archivos. La migración es aditiva: las columnas pueden quedar (Payload las ignora si se quitan los campos) o retirarse con `down` solo si están vacías. Los archivos ya normalizados no se pueden «desnormalizar» (no se guarda el original: decisión de privacidad y disco).

### 17.8 Siguiente paso: cargador masivo

`scripts/load-news-images.mjs` + `scripts/lib/mediaLoader.mjs` (§11): calcula `sha256` local, consulta `GET /api/media?where[sha256][equals]=…` y sube solo lo nuevo con `sourcePath`; trata el 409 como «existente» (usa `errors[0].data.id`). Debe correr contra `http://cms:3000` en la red interna (evita el `limit_req` de 10/min de nginx, §16.3), con un usuario `media-manager` y pausado.

---

## 18. Implementación del cargador masivo (2026-10-28)

**Estado:** código y pruebas listos; fase 0 ejecutada sobre los datos reales; fases 1 y 2 **no ejecutadas** contra ningún CMS (solo pruebas contra un CMS falso en proceso). Cumple §11 con las diferencias indicadas abajo.

### 18.1 Qué existe

| Archivo | Contenido |
|---|---|
| `scripts/load-news-images.mjs` | CLI: guardias, fase 0/1/2, progreso reanudable, códigos de salida. |
| `scripts/lib/mediaLoader.mjs` | Lógica: `validateUploadBytes`, `parseWpPosts` (mismo slug que `migrate-wordpress.mjs`), `buildNoticiaEntries`, `buildReport`, `selectUploads`, `planMediaLinks`, cliente HTTP con pausa/429/5xx, `runUpload`, `runLink`. |
| `tests/unit/mig-img-plan.spec.ts`, `mig-img-loader-dryrun.spec.ts`, `mig-img-loader-resume.spec.ts`, `mig-img-loader-agreement.spec.ts` | P-11, P-12, P-13 y la concordancia con `validateUploadFile` del CMS en una tabla de fixtures. |

Diferencias con §11: (1) credenciales de la fase 1: `CMS_EMAIL`/`CMS_PASSWORD` (no `MEDIA_EMAIL`); (2) la validación de bytes se **reimplementa sin sharp** (firmas jpeg/png/webp/gif, ≤ 11 MiB, sin SVG, nombre seguro) porque `uploadGuard.ts` es TypeScript con sharp; una prueba obliga a que ambas coincidan; el CMS repite la guardia y decodifica por completo; (3) `--manifest` no existe: manifiesto e informe se recalculan en cada corrida (determinista, 1 s); (4) por defecto solo se suben archivos **válidos y referenciados** por alguna noticia (`--include-orphans` sube todos); los duplicados por contenido se suben una vez y los demás usan el mismo id.

### 18.2 Comandos

Variables (solo entorno, nunca argumentos): `CMS_EMAIL`, `CMS_PASSWORD` (autor y subida; rol con permiso de subir y de escribir noticias), y para publicar `CMS_REVIEWER_EMAIL/PASSWORD` y `CMS_PUBLISHER_EMAIL/PASSWORD` (tres identidades distintas; sin ellas la fase 2 solo deja borradores).

```
# Fase 0 (sin red, sin credenciales)
node scripts/load-news-images.mjs --dry-run --xml=<volcado.xml> --uploads=<dir con AAAA/MM> --out=<dir fuera del repo>
# Fase 1 (subir) y fase 2 (enlazar); mismos --xml/--uploads/--out; destino por defecto http://localhost:3002
node scripts/load-news-images.mjs --only-upload [--limit=N] [--delay-ms=1500] [--include-orphans] ...
node scripts/load-news-images.mjs --link ...
```

`--out` dentro del repositorio se rechaza (los artefactos llevan rutas y hashes locales). Destino remoto: solo `--cms=https://…` con `--allow-remote`. Código de salida: 0 ok; 1 errores no reintentables o identidades inválidas; 2 uso/guardia; 3 solo errores reintentables (repetir el mismo comando).

### 18.3 Formato del informe (`mig-img-report.json`) y del progreso

`files` (total, valid, rejected, rejectedByReason, byYear, byYearMonth, duplicatesBySha256), `noticias` (total, byYear, withFeatured, withGallery, withoutImage, withoutImageByYear, withoutImageSlugsByYear), `orphans`, `referencedButRejected`, `referencedButMissing` (referenciadas por el contenido y recuperables pero ausentes de la carpeta). `manifest.json` = `{ noticias[{postId, slug, title, year, month, featured, gallery, missing}], files[{relPath, bytes, sha256, status, reason}], aliases }`. `progress.json` (en `--out`) guarda por archivo `subido|existente|rechazado|error` con `mediaId` y por noticia `escrita|completa`; sin tokens ni contraseñas. Estados de la fase 2 por noticia: `enlazada`, `sin_cambios`, `pendiente` (noticia aún no importada o media sin subir), `bloqueada` (rechazada o en estado desconocido), `sin_imagen`, `conflicto` (la noticia ya tiene otra imagen/galería elegida por una persona: no se pisa).

### 18.4 Lote 2016-2023

Cuando MITIC entregue `wp-content/uploads`, repetir los mismos comandos con otra `--uploads=<dir>` (y el mismo `--out` para conservar el progreso): lo ya cargado se resuelve por `sourcePath`/`sha256` como `existente`, las noticias `sin_imagen` pasan a tener destacada y la fase 2 las enlaza. Las noticias de 2016-2023 sin imagen se informan como `sin_imagen` (no como fallo).

### 18.5 Rollback

Enlaces: quitar `featuredImage`/`gallery` por el flujo editorial o descartar los borradores aún no publicados (`progress.json` → `links` lista los slugs tocados). Media: borrar por `sourcePath` desde la lista de `progress.json` (`files` con `state: subido`) con un usuario `media-manager`, tras desenlazar (§7, guardia de borrado). Antes de ejecutar: copia de seguridad de la BD y del volumen de medios.

### 18.6 Límites

No decodifica la imagen en el cargador (lo hace el CMS, que además normaliza y quita EXIF); un 5xx tras guardar el archivo se resuelve en el reintento por 409 (sha256 único). No cubre la visibilidad de media de borradores (D1) ni el retiro de `featuredImageUrl` (D4, tarea aparte).

### 18.7 Correcciones tras la primera ejecución local (2026-10-28)

- **Editar contenido publicado:** el CMS responde 422 si se guarda `featuredImage`/`gallery` de una noticia publicada sin guardarla como borrador (`apps/cms/src/hooks/editorial/transitions.ts:274`). La fase 2 ahora hace `PATCH /api/noticias/:id?draft=true` con `{featuredImage, gallery, _status: 'draft'}`, lleva el flujo (revisión, aprobación, publicación) y **verifica** que la versión pública (`draft=false`) tenga la imagen; si no, cuenta un error no reintentable y deja la noticia como `escrita`.
- **`--limit=N` en la fase 2** cuenta noticias con trabajo real (escritura, avance de flujo, conflicto, error); las ya `completa` se saltan sin red (`reanudadas`) y `sin_imagen`/`sin_cambios`/`pendiente` no consumen cupo.
- **Texto alternativo:** `pickAlt` normaliza con NFKC, descarta textos pobres (`isPoorAlt`: una sola palabra o nombre de archivo, «Noticia N», IMG_…, solo dígitos) y elige: alt del cuerpo > alt/título del adjunto > título de la noticia > «Imagen de la noticia»; máx. 150 caracteres. `--check-alt` informa y `--fix-alt` corrige por `PATCH {alt}` las filas con `sourcePath` ya cargadas.
