# DEP-10 — Variables de entorno alineadas (código, compose y `.env.prod.example`)

**Estado:** implementación local; **nada de esto se probó con Docker, SMTP ni un servidor reales** (ver «Lo que NO se verificó»). **Backlog:** DEP-10 (hallazgo alto «Env vars out of sync» de `docs/security/AUDIT-DEPLOY-2026-10-19.md`, línea 32). **Formato:** SEC-005. **RDD:** `docs/research/evidence-register.md` (RDD-DEP-32 … RDD-DEP-37). No autoriza pentest ni despliegue. Fuera de alcance: DEP-16 (`PAYLOAD_SECRET` con fallback vacío) y DEP-11 (pin de MinIO y usuario de servicio: el CMS sigue recibiendo `MINIO_ROOT_*` mapeadas a `S3_*`).

## Problema (hecho observado)

1. `guard-env-parity` reportaba 25 hallazgos, pero el guard solo escaneaba 14 archivos de `app/api` y `apps/cms/src/{payload.config,config/database,app/api}`; no veía `lib/`, `components/`, colecciones, `middleware.ts`, `utilities/` ni `next.config.mjs`, y comparaba por nombre **global**, no por servicio. Un nombre presente en el servicio equivocado lo daba por bueno (RDD-DEP-32).
2. El correo de contacto del portal (`app/api/contact/route.ts`) lee `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` y `CONTACT_TO`; el servicio `portal` del compose no recibe ninguna. El CMS lee `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_SECURE`, `SMTP_FROM_ADDRESS`, `SMTP_FROM_NAME`; el compose le pasa `SMTP_FROM` (nombre que el CMS no lee) y nada de lo demás (RDD-DEP-33).
3. El CMS lee `POSTGRES_SSL`, `PORTAL_URL` y `REVALIDATION_SECRET`, que el ancla `x-cms-env` no incluye. Sin `PORTAL_URL`, las revalidaciones ISR y los enlaces de preview apuntan a `http://localhost:3000`, que dentro del contenedor del CMS es el propio CMS; sin `REVALIDATION_SECRET`, el `Bearer` va vacío (RDD-DEP-34).
4. El portal lee `PREVIEW_SECRET` (`app/api/preview/route.ts`) y `CMS_URL` (`lib/cms/client.ts`); su `environment` no los trae. `CMS_URL` cae a `http://localhost:3002` dentro del contenedor del portal (RDD-DEP-34).
5. Un mismo concepto tiene varios nombres: «URL del portal» = `PORTAL_URL` / `NEXT_PUBLIC_SERVER_URL` (hooks de Tribunal, sonda `checkPortal`) / `NEXT_PUBLIC_SITE_URL`; «URL pública del CMS» = `NEXT_PUBLIC_SERVER_URL` / `NEXT_PUBLIC_CMS_URL`; «endpoint S3 interno» = `S3_ENDPOINT` / `MINIO_ENDPOINT`; «URI de la BD» = `DATABASE_URI` / `DATABASE_URL`; contraseña SMTP = `SMTP_PASS` / `SMTP_PASSWORD`; remitente = `SMTP_FROM` / `SMTP_FROM_ADDRESS` (RDD-DEP-35).

## Contrato

### A. Nombres canónicos (un nombre por concepto)

| Concepto | Nombre canónico | Lo leen | Se descarta |
|---|---|---|---|
| Servidor SMTP | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` (`true` = TLS implícito), `SMTP_USER`, `SMTP_PASSWORD` | portal (contacto) y CMS (recuperación de contraseña) | `SMTP_PASS` |
| Remitente | `SMTP_FROM_ADDRESS`, `SMTP_FROM_NAME` | CMS; el portal usa `SMTP_FROM_ADDRESS` (el nombre visible del portal sigue fijo en el código) | `SMTP_FROM` |
| Destino del contacto | `CONTACT_TO` | portal | — |
| BD del CMS | `DATABASE_URI` (la contraseña va percent-encoded y debe coincidir con `POSTGRES_PASSWORD`) | CMS | `DATABASE_URL` (se quita el fallback de `getDatabaseURL`) |
| TLS hacia Postgres | `POSTGRES_SSL` | CMS | — |
| URL del portal vista desde el CMS | `PORTAL_URL` (valor = `PORTAL_PUBLIC_URL`) | CMS (CORS, preview, revalidación, sonda, enlaces de correo) | `NEXT_PUBLIC_SERVER_URL` y `NEXT_PUBLIC_SITE_URL` usados como URL del portal dentro del CMS |
| URL del CMS vista por el CMS | `NEXT_PUBLIC_SERVER_URL` (convención de Payload; valor = `CMS_PUBLIC_URL`) | CMS | `NEXT_PUBLIC_CMS_URL` dentro del CMS |
| URL del CMS vista por el portal | `NEXT_PUBLIC_CMS_URL` (CSP, sonda; valor = `CMS_PUBLIC_URL`) y `CMS_URL` (consultas servidor-a-servidor; valor fijo `http://cms:3000` por la red interna) | portal | — |
| Endpoint S3 | `S3_ENDPOINT` (valor fijo `http://minio:9000`) | CMS (almacenamiento, bucket, sonda de MinIO) | `MINIO_ENDPOINT` |
| Revalidación y preview | `REVALIDATION_SECRET`, `PREVIEW_SECRET` | portal **y** CMS (los dos extremos de cada llamada) | — |
| Webhook de notificaciones | `N8N_WEBHOOK_URL` (opcional; vacío = desactivado) | CMS | — |

En `.env.prod.example` hay **un nombre por concepto**: `CMS_PUBLIC_URL` y `PORTAL_PUBLIC_URL` son la fuente única de las URL públicas y el compose las proyecta a los nombres que exige cada framework (`NEXT_PUBLIC_*`, `PORTAL_URL`). Es la única indirección y queda documentada en `DEPLOY.md`.

### B. Regla de paridad por servicio

1. **Código → servicio.** Toda variable `process.env.X` que lee el código de un servicio (portal: `app/`, `lib/`, `components/`, `i18n/`, `proxy.ts`, `sentry.*.config.ts`; CMS: `apps/cms/src/`, sin archivos `*.backup.*`) debe ser una clave del `environment` de **ese** servicio en `compose.prod.yaml` (se resuelve el ancla `x-cms-env`/`*cms-env`). Excepciones solo en `ENV_IGNORED`, con razón por entrada.
2. **Servicio → código.** Toda clave del `environment` de `portal`/`cms` debe ser leída por el código de ese servicio (sin claves muertas como `SMTP_FROM` en el CMS).
3. **Compose → ejemplo.** Toda `${VAR}` interpolada en el compose debe figurar en `.env.prod.example` (excepto las que inyecta el pipeline, p. ej. `IMAGE_TAG`).
4. **Ejemplo → compose/código.** Toda variable del ejemplo debe estar interpolada por el compose o ser de build-time leída por el código (`SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`). Sin huérfanas.
5. **Sin secretos.** Los valores del ejemplo son placeholders `REEMPLAZAR_*` (o valores no sensibles); ningún patrón de secreto real.

Variables no exigidas al compose (`ENV_IGNORED`): `NODE_ENV` (la fija el `ENV` del Dockerfile y el compose), `CI` (solo pipeline, leída en build), `NEXT_RUNTIME` y `NEXT_TELEMETRY_DISABLED` (las fija Next/Dockerfile), `SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_AUTH_TOKEN` (build-time, vienen de secrets de GitHub vía `build-args`; `NEXT_PUBLIC_SENTRY_DSN` **sí** se exige).

### C. Cambios de código (solo donde el nombre difería)

- `app/api/contact/route.ts`: `SMTP_PASS`→`SMTP_PASSWORD`, `SMTP_FROM`→`SMTP_FROM_ADDRESS`; `secure` = `SMTP_SECURE` si está definida, si no `puerto === 465` (comportamiento previo).
- `apps/cms/src/config/database.ts`: se elimina el fallback `DATABASE_URL`.
- `apps/cms/src/app/api/health/route.ts`: `MINIO_ENDPOINT`→`S3_ENDPOINT`; `checkPortal` usa `PORTAL_URL`.
- `apps/cms/src/collections/{TribunalMiembros,TribunalDocumentos,Convenios}.ts`: la revalidación usa `PORTAL_URL` (sin `NEXT_PUBLIC_SERVER_URL` ni `NEXT_PUBLIC_SITE_URL`).
- `apps/cms/src/utilities/notifications.ts`: `NEXT_PUBLIC_CMS_URL`→`NEXT_PUBLIC_SERVER_URL`; `PORTAL_URL` sin fallback a `NEXT_PUBLIC_SITE_URL`.
- Sin variable de Sentry para el CMS: ningún código del CMS la lee (Sentry en el CMS es DEP-14).

### D. Compose

- `x-cms-env`: se quitan `SMTP_FROM`; se añaden `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_ADDRESS`, `SMTP_FROM_NAME`, `POSTGRES_SSL`, `PORTAL_URL`, `REVALIDATION_SECRET`, `N8N_WEBHOOK_URL`.
- `portal`: se añaden `CMS_URL`, `PREVIEW_SECRET`, `SMTP_HOST|PORT|SECURE|USER|PASSWORD|FROM_ADDRESS`, `CONTACT_TO`.

## Escenarios Given/When/Then (negativos primero)

1. **Variable en el servicio equivocado:** dado un compose donde `PREVIEW_SECRET` solo está en el CMS y el código del portal la lee, cuando corre `guard-env-parity`, entonces rojo con «no llega al servicio portal»; el nombre presente en otro servicio no lo salva.
2. **Clave muerta:** dado un `environment` con `SMTP_FROM` que ningún código del servicio lee, entonces rojo («ningún código del servicio la lee»).
3. **Falso positivo resuelto:** `NEXT_PUBLIC_SERVER_URL: ${CMS_PUBLIC_URL}` en el CMS y `CMS_PUBLIC_URL` en el ejemplo → verde (no exige el nombre `NEXT_PUBLIC_SERVER_URL` en el ejemplo); `S3_ACCESS_KEY_ID: ${MINIO_ROOT_USER}` idem.
4. **Huérfana:** una variable del ejemplo sin interpolación en el compose y sin lectura de código → rojo.
5. **Secreto real:** un valor del ejemplo con aspecto de credencial (p. ej. `AKIA…`, base64 largo, `-----BEGIN`, o una clave `*PASSWORD|SECRET|TOKEN|KEY` sin `REEMPLAZAR`) → rojo.
6. **Contacto con nombre viejo:** con `SMTP_PASS` definida y `SMTP_PASSWORD` no, el handler **no** autentica con esa contraseña; con `SMTP_PASSWORD` sí (`createTransport` recibe `auth.pass`). `SMTP_FROM` se ignora; `SMTP_FROM_ADDRESS` fija el remitente; `CONTACT_TO` el destino.
7. **`SMTP_SECURE`:** `SMTP_SECURE=true` → `secure: true` aun con puerto 587; `false` con puerto 465 → `secure: false`; sin la variable, 465 → `secure: true` (compatibilidad con el comportamiento previo).
8. **Sin `DATABASE_URL`:** con solo `DATABASE_URL` válida y `DATABASE_URI` vacía, `getDatabaseURL` lanza (ya no hay fallback); el mensaje no incluye la URI.
9. **Compose real:** cada variable que el código del portal y del CMS lee llega a su servicio; `cms` y `cms-migrate` comparten el ancla; el portal recibe `SMTP_*` y `CONTACT_TO`; el CMS recibe `SMTP_*`, `POSTGRES_SSL`, `PORTAL_URL`, `REVALIDATION_SECRET`.
10. **Arnés verde sin trampa:** `guard-env-parity` pasa sobre el repo sin que `ENV_IGNORED` oculte ninguna de las 19 variables con hallazgo real; cada entrada de `ENV_IGNORED` lleva su razón.

## Verificación

| Escenario | Prueba |
|---|---|
| 1–4, 10 | `harness/guards.test.mjs` (fixtures buena/mala por regla, parser del compose y ENV_IGNORED) |
| 5, 9 | `tests/deploy/dep10-env-vars.test.mjs` (lectura del repo real, estático: patrones de secreto, huérfanas, servicio por servicio) |
| 6, 7 | `tests/unit/api-public-routes-limits.spec.ts` (bloque `POST /api/contact — variables SMTP canónicas (DEP-10)`) |
| 8 | `tests/unit/database-config.spec.ts` (+ comprobación estática en `dep10-env-vars.test.mjs`) |

## Lo que NO se verificó

- No se levantó Docker, Compose ni SMTP real: el envío de correo de contacto y de recuperación de contraseña queda sin probar contra Mailpit/SMTP (la aceptación del backlog pide Mailpit local; requiere autorización para encender servicios).
- `docker compose config` no se ejecutó; la interpolación se razona textualmente.
- Que `NEXT_PUBLIC_*` leídas en código de servidor lleguen en runtime: Next las incrusta en build; el Dockerfile del portal solo pasa `NEXT_PUBLIC_SENTRY_DSN` como `ARG`. Si Next las sustituye en el bundle, `NEXT_PUBLIC_CMS_URL`/`NEXT_PUBLIC_SITE_URL`/`NEXT_PUBLIC_SERVER_URL` conservarían el valor por defecto del código. No se construyó la imagen; queda para DEP-13/staging.
- Que el CMS alcance `PORTAL_URL` (URL pública) desde su contenedor (hairpin por DNS/NAT del servidor): supuesto de red.

## Riesgos remanentes

- `PORTAL_URL` cumple dos papeles (origen CORS/enlace de navegador y destino servidor-a-servidor de la revalidación). Con la URL pública funciona si el servidor resuelve su propio dominio; si no, hará falta una variable interna aparte (no se añade: ningún código la lee).
- El portal y el CMS pueden usar `SMTP_USER` vacío para relays sin autenticación; si `SMTP_USER` se rellena y `SMTP_PASSWORD` no, el CMS omite la autenticación y el portal la envía con contraseña vacía (diferencia previa que no se unifica aquí).
- `apps/cms/scripts/seed/*` siguen leyendo `DATABASE_URL` como alternativa (scripts de desarrollo, no runtime de producción).
- El compose sigue exponiendo `MINIO_ROOT_*` al CMS (DEP-11) y `PAYLOAD_SECRET` sin fallo si falta (DEP-16).

## Rollback de este cambio (por bloques)

1. Guard: restaurar `harness/guards.mjs` y `harness/guards.test.mjs` (y la lectura de fuentes en `collectInputs`).
2. Compose y ejemplo: revertir `infrastructure/docker/compose.prod.yaml` y `infrastructure/docker/.env.prod.example`.
3. Código: revertir `app/api/contact/route.ts`, `apps/cms/src/config/database.ts`, `apps/cms/src/app/api/health/route.ts`, `apps/cms/src/collections/{TribunalMiembros,TribunalDocumentos,Convenios}.ts`, `apps/cms/src/utilities/notifications.ts`, `.env.example` y `apps/cms/.env.example`.
4. Pruebas y docs: borrar `tests/deploy/dep10-env-vars.test.mjs`, revertir `tests/unit/database-config.spec.ts` y `tests/unit/api-public-routes-limits.spec.ts`, la sección de `DEPLOY.md`, las fichas RDD-DEP-32…37 y este archivo.
No hay migraciones ni datos que revertir.
