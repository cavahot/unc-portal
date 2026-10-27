# DEP-16 — Secretos y rutas auxiliares

**Estado:** implementación local; pendiente de validación en staging (ver hipótesis). **Backlog:** DEP-16 de `docs/security/TASK-DEPLOY-001-remediacion-auditoria-predeploy.md` (hallazgos «Secreto vacío, preview, revalidate, monitoring» de `docs/security/AUDIT-DEPLOY-2026-10-19.md`). **RDD:** `docs/research/evidence-register.md` (RDD-DEP-38 a RDD-DEP-42). Formato como SEC-005 (contrato + Given/When/Then, negativos primero). Relacionadas: DEP-06 (límites), DEP-10 (variables), DEP-02b (preview con token del editor, **sin cambios**).

## Problema (hecho observado)

1. `payload.config.ts` pasaba `process.env.PAYLOAD_SECRET || ''` a Payload: con la variable ausente el CMS arrancaba y firmaba sesiones con secreto vacío (RDD-DEP-38).
2. `/api/revalidate` comparaba con `timingSafeEqual` sin igualar longitudes: un Bearer de otra longitud lanzaba `RangeError` y respondía 500; con el secreto ausente devolvía 500 con mensaje descriptivo. `/api/preview` comparaba con un `length !==` previo (RDD-DEP-39).
3. El enlace de live preview llevaba `PREVIEW_SECRET` crudo en la query (`/api/preview?secret=...`): queda en historial, logs de nginx y `Referer` (RDD-DEP-40).
4. `/api/monitoring` (túnel sin auth) construía el destino con el host del DSN que traía el envelope: relé abierto / SSRF parcial hacia cualquier host HTTPS (RDD-DEP-41).
5. `apps/cms/src/app/my-route/route.ts` era la ruta de ejemplo de la plantilla, sin auth ni consumidores.

## Contrato

### A. `PAYLOAD_SECRET` con falla cerrada (`apps/cms/src/config/secrets.ts`)

- `isStrongSecret(valor)`: true solo si, tras `trim`, tiene **≥ 32 caracteres**, **≥ 8 caracteres distintos** y **no contiene** (sin distinguir mayúsculas) ninguno de `WEAK_SECRET_MARKERS`: `changeme`, `change-this`, `change_me`, `reemplazar`, `replace-me`, `replace_me`, `placeholder`, `your-`, `secret-here`. Cubre los valores de `.env.example`, `apps/cms/.env.example` y `.env.prod.example`.
- `requireSecret(nombre, valor)`: devuelve el valor o lanza `Error` con el **nombre** de la variable y la regla, y cómo generar uno (`openssl rand -hex 32`). **Nunca** incluye el valor evaluado.
- `resolvePayloadSecret(env = process.env)`: se usa como `secret:` de `buildConfig`. En runtime y en el CLI de Payload (`migrate`, `generate:types`) llama a `requireSecret('PAYLOAD_SECRET', …)`.
- **Excepción de build (decisión):** si `env.NEXT_PHASE === 'phase-production-build'` devuelve el valor recibido o `''` sin validar. Motivo: `apps/cms/Dockerfile` (etapa `builder`) ejecuta `npm run build:cms` **sin** ninguna variable de entorno ni `ARG` de secretos, y `next build` evalúa `payload.config.ts` al recolectar rutas; validar allí rompería el build de la imagen. El secreto no se incrusta en la imagen y el arranque real (`NEXT_PHASE` distinto) valida. Alternativa descartada: validación perezosa en el primer request (el servicio arrancaría «sano» y fallaría tarde, peor que abortar al inicio). Límite: si alguien fija `NEXT_PHASE=phase-production-build` en el contenedor de producción, se omite el control; `guard-env-parity` lo trata como variable de Next (no del operador).
- `guard-secret-required` (harness) deja de ser rojo por **cierre real**: ya no existe el fallback vacío. Se ajustó su regla textual (con test) para cubrir también `PREVIEW_SECRET`/`REVALIDATION_SECRET` con `|| ''`/`?? ''` y `secret: ''` literal, ignorando líneas de comentario.
- **Efecto operativo:** quien tenga `PAYLOAD_SECRET` corto o de ejemplo en `.env`/`.env.prod` verá abortar el CMS (y `cms-migrate`) con un mensaje claro. Es intencional.

### B. Secretos fuertes en el portal (`lib/security/secrets.ts`)

- Copia deliberada del validador (el portal no importa del CMS: RDD-DEP-31). Una prueba falla si `WEAK_SECRET_MARKERS` o `MIN_SECRET_LENGTH` divergen entre las dos copias.
- `readStrongSecret(nombre, valor)`: devuelve el valor si es fuerte; si no, `null` y un log con **solo el nombre**. El llamador lee `process.env.NOMBRE` de forma explícita (así `guard-env-parity` ve la lectura).
- `/api/revalidate` y `/api/preview`: secreto ausente/débil → **503** genérico (`Service unavailable`, sin nombre de variable ni detalle). Orden: (1) tasa (DEP-06) → (2) tamaño → **(3) secreto del servidor 503** → (4) credencial 401 → (5) lógica.

### C. Comparación segura (`lib/security/safeEqual.ts`)

- `safeEqual(a, b)`: SHA-256 de ambas entradas y `timingSafeEqual` sobre los digests (siempre 32 bytes). No lanza con longitudes distintas y no depende de la longitud del secreto.
- `/api/revalidate`: `Authorization` ausente, distinto de `Bearer <secreto>`, de otra longitud o de la misma longitud → **401** `{ "error": "Unauthorized" }` uniforme. `/api/preview` usa la misma primitiva dentro de la verificación del token.

### D. Preview con token firmado de vida corta

**Formato:** `base64url(JSON {s: slug, t: "noticia"|"page", e: exp en segundos}) + "." + base64url(HMAC-SHA256(PREVIEW_SECRET, primera parte))`.

- **Quién firma:** el CMS, en `livePreview.url` (`apps/cms/src/payload.config.ts`) vía `signPreviewToken` (`apps/cms/src/utilities/previewToken.ts`). TTL emitido **5 min**. Lanza si el secreto es débil o el slug no cumple `^[a-z0-9][a-z0-9-/]{0,120}$`.
- **Decisión servidor vs. cliente (demostrada, RDD-DEP-40):** la función `url` se ejecuta **solo en el servidor** de Payload 3.87.1: la invoca `handleLivePreview` (`@payloadcms/ui/dist/utilities/handleLivePreview.js:67-80`) desde el RSC `views/Document` (`@payloadcms/next/dist/views/Document/index.js:300`) y desde la acción de servidor `buildFormState` (`@payloadcms/ui/dist/utilities/buildFormState.js:192`), pasándole `req`; y la configuración que se serializa al navegador solo conserva `breakpoints`, `collections` y `globals` de `livePreview` (`payload/dist/config/client.js:92-102`, `payload/dist/collections/config/client.js:58-63`): `url` se descarta. Por eso es seguro firmar ahí y **no** hizo falta una ruta de servidor aparte. Defensa adicional: la función solo firma si `req.user` tiene rol de `superadmin`, `web-admin`, `publisher`, `reviewer`, `editor` o `correspondent`; sin sesión, rol, slug válido o con secreto débil devuelve `''` (sin preview) y registra solo un mensaje genérico. Límite: demostrado por lectura estática; **no se abrió el panel en un navegador** (hipótesis H1).
- **Quién verifica:** el portal (`lib/security/previewToken.ts`, `verifyPreviewToken`) en `GET /api/preview?token=...`: firma válida (comparación segura), `exp` futuro y vida restante **≤ 15 min** (defensa ante un firmante mal configurado). Cualquier fallo → **401** `Invalid preview token` sin distinguir causa.
- **El parámetro `secret` en query ya no se acepta** (se ignora; sin `token` → 401). El `slug` y el `type` de la query también se ignoran: salen de la carga **firmada**, así el token no sirve para otro contenido. El slug firmado se revalida con el patrón antes del `redirect`.
- **Contrato DEP-02b intacto:** `/api/preview` solo habilita `draftMode`; los borradores se siguen leyendo con el JWT de la cookie `payload-token` del editor, que decide el CMS (DEP-02).
- **Límites conocidos:** el token sigue en la query (historial, `Referer`, logs de nginx) pero caduca en ≤ 5 min, no revela el secreto y está atado a slug y tipo; es un bearer sin uso único ni revocación. `PREVIEW_SECRET` sigue siendo compartido portal/CMS (si se filtra, se puede firmar cualquier token): rotar ambos a la vez. No se añadió ninguna variable nueva ni se hizo configurable el TTL (constante `PREVIEW_TTL_SECONDS`).
- **Duplicación deliberada:** firmante (CMS) y verificador (portal) son dos copias del mismo algoritmo (no se comparte código entre apps, RDD-DEP-31). Una prueba de ida y vuelta importa ambas.

### E. `/api/monitoring` solo hacia el DSN del servidor

- El destino se arma **siempre** como `https://<host>/api/<proyecto>/envelope/` con host y proyecto de `NEXT_PUBLIC_SENTRY_DSN` del **servidor** (`https:`, proyecto numérico). El DSN del cliente nunca decide el destino.
- DSN del servidor ausente o mal formado → **503** `Monitoring tunnel unavailable` (sin `fetch`) y log del motivo.
- Envelope con `dsn` cuyo host o proyecto difieren del configurado (incluye `https://host-ok@evil`, IPs internas, otro proyecto del mismo host) o ilegible como DSN → **403** `DSN not allowed`, sin `fetch`. Envelope sin `dsn` → se usa el del servidor. Envelope ilegible → 400 (como antes).
- Se conservan los límites de DEP-06 (60/min por IP, 1 MiB, 413).
- Límite: no autentica al cliente ni valida el contenido del envelope; solo acota el destino. Depende de que `NEXT_PUBLIC_SENTRY_DSN` esté disponible en el servidor del portal (ARG de build y `environment` del compose: `compose.prod.yaml:216`, `Dockerfile:39-43`).

### F. Limpieza y verificación documental

- Eliminado `apps/cms/src/app/my-route/route.ts` (plantilla sin auth; `grep` sin consumidores en código, tests ni configuración; solo aparecía en artefactos generados `.next/` y en docs). Reversible desde git.
- **Hipótesis a confirmar en staging, sin conclusión (RDD-DEP-42):** (1) cookies de Payload 3.87.1: por defecto `sameSite: 'Lax'` y `secure: false` (`payload/dist/collections/config/defaults.js:118-122,131-135`); `Users` solo declara `auth: true` (`apps/cms/src/collections/Users.ts:35`), así que `secure` podría quedar en `false` aunque el sitio use HTTPS. (2) CSRF: `csrf` es `[]` por defecto (`payload/dist/config/defaults.js:45,119`) y la config no lo define; con lista vacía `extractJWT` acepta la cookie con cualquier `Origin` (`payload/dist/auth/extractJWT.js:17-28`). (3) Playground GraphQL: `disablePlaygroundInProduction: true` por defecto (`payload/dist/config/defaults.js:51-52,125-130`) y `routes/graphql/playground.js:9-34` responde 404 en producción con ese valor. **Qué dice el código no es prueba de lo desplegado:** falta comprobar con `Set-Cookie` real, un POST con `Origin` ajeno y `GET /api/graphql-playground` en staging.

## Escenarios Given/When/Then (negativos primero)

**A**
1. Dado `PAYLOAD_SECRET` ausente, vacío o de solo espacios, cuando se evalúa la config en runtime, entonces lanza un error que nombra la variable y no contiene ningún valor.
2. Dado un secreto de menos de 32 caracteres, con `changeme`/`change-this`/`REEMPLAZAR_` o de un solo carácter repetido, entonces se rechaza sin imprimir el valor.
3. Dado `NEXT_PHASE=phase-production-build` y sin secreto, entonces `resolvePayloadSecret` no lanza (el build de la imagen no se rompe).
4. Dado un secreto fuerte, entonces se devuelve tal cual en runtime y en build.
5. Dado `payload.config.ts`, entonces no contiene `PAYLOAD_SECRET || ''` y usa `resolvePayloadSecret(`; `guard-secret-required` pasa.

**B**
6. Dado `REVALIDATION_SECRET` o `PREVIEW_SECRET` ausente, débil o corto, cuando se llama al endpoint, entonces 503 genérico, sin nombre ni valor en el cuerpo, y no se revalida ni se habilita draft.

**C**
7. Dado un Bearer de longitud distinta, cuando se llama a `/api/revalidate`, entonces 401 (antes 500) y no revalida.
8. Dado un Bearer de igual longitud pero distinto, sin `Authorization`, o con esquema distinto de Bearer, entonces 401 uniforme.
9. Dado el Bearer correcto, entonces 200 y se llama `revalidateTag`.
10. Dado `safeEqual('abc', 'abcdef')`, entonces `false` y no lanza.

**D**
11. Dado `GET /api/preview?secret=<secreto correcto>&slug=x`, entonces 401 y no se habilita draft.
12. Dado un token expirado, firmado con otro secreto, con carga alterada, con vida > 15 min o con formato inválido, entonces 401 `Invalid preview token` y no se habilita draft.
13. Dado un token válido de noticia/página, entonces se habilita draft y se redirige a `/noticias/<slug>` o `/<slug>`.
14. Dado un token válido para `a` y `slug=otro&type=page` en la query, entonces se redirige a `a` (la query se ignora).
15. Dado un token vigente a los 299 s, entonces válido; a los 300 s, inválido.
16. Dado `livePreview.url` en `payload.config.ts`, entonces no contiene `secret=`, firma con `signPreviewToken` y exige `req.user`.
17. Dado un token emitido por `signPreviewToken` del CMS, entonces `verifyPreviewToken` del portal devuelve `{ slug, type }` (compatibilidad de las dos copias).

**E**
18. Dado un envelope con DSN de host ajeno, IP interna, mismo host con otro proyecto o credenciales engañosas, entonces 403 y `fetch` no se llama.
19. Dado un envelope con el DSN configurado o sin DSN, entonces se reenvía una vez a `https://<host del servidor>/api/<proyecto>/envelope/`.
20. Dado `NEXT_PUBLIC_SENTRY_DSN` ausente o mal formado en el servidor, entonces 503 y `fetch` no se llama.

**F**
21. Dado el repositorio, entonces `apps/cms/src/app/my-route` no existe.

## Verificación

- Pruebas: `tests/unit/dep16-secrets.spec.ts` (A, B, C, D firmante/verificador, estático F), `tests/unit/dep16-routes.spec.ts` (handlers reales C, D, E y 503 de B), `tests/unit/api-public-routes-limits.spec.ts` (actualizado: secretos sintéticos ≥ 32, token firmado y DSN del servidor), `harness/guards.test.mjs` (regla ampliada de `guard-secret-required`).
- Comandos: `npm test`, `npm run typecheck`, `node --test "harness/*.test.mjs"`, `node --test tests/deploy/*.test.mjs`, guards en proceso y comparación de errores de `tsc` del CMS (antes/después en el informe del cambio).

## Lo que NO se verificó

- Build real de la imagen del CMS ni arranque con secreto débil dentro de Docker (sin Docker por política del arnés). La excepción de `NEXT_PHASE` se deduce de leer el Dockerfile y el flujo de Next.
- Que `livePreview.url` entregue el token en el iframe del panel y que el portal lo acepte de extremo a extremo (H1).
- Cookies, CSRF y playground reales (F), y el comportamiento de `NEXT_PUBLIC_SENTRY_DSN` en servidor tras el build del portal.

## Hipótesis a validar en staging

- H1: el panel muestra el live preview con `?token=` y el portal habilita draft y redirige correctamente; con rol sin permiso no hay preview.
- H2: `next build` del CMS en la imagen real completa con `NEXT_PHASE=phase-production-build` y sin variables; y el contenedor `cms`/`cms-migrate` aborta con secreto débil.
- H3: el túnel de Sentry reenvía eventos reales (el DSN del servidor está presente en runtime).
- H4 a H6: RDD-DEP-42 (cookie `secure`, `csrf` vacío, playground 404).

## Riesgos remanentes

- Despliegues con secretos de ejemplo/cortos fallarán al arrancar el CMS: hay que rotar y desplegar el mismo valor de `PREVIEW_SECRET`/`REVALIDATION_SECRET` en portal y CMS antes de actualizar.
- El hook de revalidación del CMS (`utilities/revalidation.ts`, colecciones Convenios y Tribunal*) mantiene `REVALIDATION_SECRET || ''`: con secreto débil el portal responde 503 y el CMS solo lo registra (fuera de alcance; cierre pendiente si se quiere abortar también ahí).
- Tests de integración del CMS (`apps/cms`, `test:int`, requieren BD) que importen `payload.config.ts` necesitarán un `PAYLOAD_SECRET` fuerte; no se ejecutaron.
- Token de preview reutilizable durante su vida y secreto compartido portal/CMS.
- Límites en memoria por instancia de DEP-06 siguen vigentes.

## Rollback de este cambio (por bloques)

1. **A + guard:** revertir `apps/cms/src/config/secrets.ts` (borrar), `secret:` en `payload.config.ts` (volver a la línea previa) y `harness/guards.mjs` (regla y `NEXT_PHASE` en `ENV_IGNORED`) con `harness/guards.test.mjs`.
2. **B + C:** revertir `app/api/revalidate/route.ts`, `lib/security/secrets.ts`, `lib/security/safeEqual.ts`.
3. **D:** revertir `app/api/preview/route.ts`, `lib/security/previewToken.ts`, `apps/cms/src/utilities/previewToken.ts` y el bloque `livePreview.url` + `PREVIEW_ROLES` en `payload.config.ts` (deben revertirse juntos: el firmante y el verificador son un par).
4. **E:** revertir `app/api/monitoring/route.ts`.
5. **F:** restaurar `apps/cms/src/app/my-route/route.ts` con `git checkout -- apps/cms/src/app/my-route/route.ts` (solo si se decidiera conservarlo).
6. **Docs/tests:** `docs/specs/deploy/DEP-16-*.md`, fichas RDD-DEP-38..42, comentarios de `DEPLOY.md` y `.env.prod.example`, `tests/unit/dep16-*.spec.ts` y los cambios de `tests/unit/api-public-routes-limits.spec.ts`.
