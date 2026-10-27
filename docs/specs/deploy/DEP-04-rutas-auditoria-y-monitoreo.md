# DEP-04 — Rutas de auditoría y monitoreo con rol, ACL y errores seguros

**Estado:** implementación local propuesta con política **PROVISIONAL de solo estrechamiento**; pendiente de decisión del Product Owner (SEC-03) y de pruebas de integración en staging. **Backlog:** DEP-04 = SEC-05/06 (hallazgos altos de `AUDIT-DEPLOY-2026-10-19.md`: «Monitoring routes without role checks», «Misleading health check» en lo que toca a la credencial embebida). **Spec base:** `docs/specs/security/SEC-005-guardia-rutas-cms.md`. **RDD:** `docs/research/evidence-register.md` (RDD-DEP-03, RDD-DEP-11, RDD-DEP-12). No autoriza pentest externo.

## Contrato

- Una ruta administrativa se protege en el handler (autenticación por `payload.auth` + rol) **antes** de validar parámetros, leer cuerpo o consultar datos. CORS, middleware y la UI no sustituyen este control.
- Principio: **solo estrechar**. Ningún rol gana permisos que hoy no tenga. Hoy cualquier sesión autenticada llega a estas rutas; tras el cambio, solo los roles de la tabla.
- Orden fijo en cada handler: (1) `payload.auth`; (2) sin usuario → 401; (3) rol fuera de la lista → 403; (4) validación de parámetros → 400; (5) consulta; (6) en error, respuesta genérica 500.
- Un anónimo con parámetros inválidos recibe 401, no 400 (no se informa del esquema a quien no se autenticó).

### Política provisional por recurso

| Recurso | Roles permitidos | Notas |
|---|---|---|
| `Auditoria.access.read` | `superadmin`, `auditor` | Antes: cualquier sesión. Contiene emails e IP. |
| `Auditoria.access.update` / `delete` | nadie (`() => false`) | El log no es mutable. `create` ya era `() => false` (SEC-05). |
| `GET /api/auditoria` | `superadmin`, `auditor` | Consulta con `overrideAccess: false` y `user`. |
| `GET /api/logs` | `superadmin`, `auditor` | Logs de archivo del servidor. |
| `GET /api/metrics` | `superadmin`, `auditor` | Conteos agregados y por rol de usuario. |
| `GET /api/alerts` | `superadmin`, `auditor` | `POST` sigue solo `superadmin` (SEC-005, sin cambios). |
| `GET /api/dashboard/noticias`, `GET /api/dashboard/stats` | `superadmin`, `web-admin`, `publisher`, `reviewer`, `editor`, `correspondent`, `auditor` | Consultas con `overrideAccess: false` y `user`: aplican las ACL de `noticias` (DEP-02). |
| `GET /api/health` | anónimo y cualquier sesión: solo `{ "status": "ok" }`; detalle (BD/MinIO/portal/métricas) solo `superadmin`, `auditor` | El healthcheck de Docker (`compose.prod.yaml`) y el portal lo llaman sin sesión. |
| `POST /api/setup/create-bucket` | `superadmin` | `GET` deja de existir (405). |

- `media-manager` y `viewer` no figuran en ninguna ruta de monitoreo ni dashboard: son roles sin función editorial/auditora hoy. Su inclusión es decisión de SEC-03.
- `auditor` entra al dashboard porque su función es observar; con `overrideAccess: false` solo ve lo que `noticias.read` le concede (DEP-02: únicamente publicados). Sus conteos por estado serán por tanto parciales: límite conocido, no un fallo.

### Parámetros

- `limit`: entero decimal estricto `^\d+$` en 1..200; por defecto 50 (`auditoria`), 100 (`logs`), 20 (`dashboard/noticias`). Valor ausente → defecto; presente e inválido (vacío, negativo, decimal, texto, fuera de rango) → **400**, no se recorta en silencio.
- `page` (`auditoria`, `dashboard/noticias`): entero 1..10000, defecto 1; inválido → 400.
- `hours` (`logs`, `alerts`): entero 1..720, defecto 24; inválido → 400.
- `category` (`logs`): lista blanca `cms | portal | database | auth | api | security | performance`; defecto `api`. `level` (`logs`): `debug | info | warn | error | critical`. Otro valor → 400. Evita que el parámetro componga rutas de archivos de log.
- `status` (`dashboard/noticias`): `draft | en_revision | aprobado | rechazado | publicado`, defecto `en_revision`. Otro valor → 400.
- `auditoria`: `accion` ∈ opciones de la colección y `resultado` ∈ `exito | error | advertencia`; otro valor → 400. `usuario` se acota a 254 caracteres.

### Errores

- Toda excepción interna devuelve `{ "error": "<mensaje genérico fijo>" }` con 500. Nunca `error.message`, `stack`, `String(error)` ni la respuesta cruda de S3.
- El detalle va a `console.error` del servidor como `etiqueta + nombre y mensaje` del error, sin objetos de configuración, endpoint ni credenciales.
- `create-bucket` no imprime el endpoint ni el nombre del secreto en logs y no devuelve el objeto `response` del SDK.

### `/api/health`

- Se elimina el fallback `postgresql://postgres:password@localhost:5432/unc_portal`. La comprobación de BD usa `getDatabaseURL()` (`apps/cms/src/config/database.ts`), que acepta `DATABASE_URI` o `DATABASE_URL` y **falla cerrado**: si no hay URI válida la comprobación marca la BD como caída sin conectarse a nada.
- La ruta se declara en `PUBLIC_API_ROUTES` del arnés (`harness/guards.mjs`) con su límite: es pública **solo** por el healthcheck de contenedor; su respuesta anónima es constante, no consulta datos ni revela versión o estado de servicios.
- Si `getPayload`/`payload.auth` fallan, responde 503 `{ "status": "error" }` sin detalle.

## Escenarios Given/When/Then (negativos primero)

Rutas R = `auditoria`, `logs`, `metrics`, `alerts GET`.

1. **Anónimo en R:** dado ningún usuario, cuando llama a cada ruta de R, entonces 401 y no se consulta ningún dato (ni `find`, ni logger, ni `alertManager`).
2. **Viewer en R:** dada una sesión `viewer`, cuando llama a R, entonces 403 y no se consultan datos.
3. **Editor en R:** dada una sesión `editor`, entonces 403 y no se consultan datos.
4. **Rol nulo/desconocido en R:** dado `role` ausente o `hacker`, entonces 403.
5. **Auditor y superadmin en R:** dados `auditor` o `superadmin`, entonces 200 y la respuesta conserva su forma actual.
6. **Dashboard anónimo/viewer/media-manager:** 401 / 403 / 403 sin consulta.
7. **Dashboard con rol editorial o auditor:** 200; cada `find`/`count` recibe `overrideAccess: false` y `user` = la sesión (no se filtra nada que `noticias.read` niegue).
8. **`status` inválido** en `dashboard/noticias` (`foo`, vacío): 400 sin consulta.
9. **`limit` inválido** (`0`, `201`, `-1`, `1.5`, `abc`, vacío) en `auditoria`, `logs`, `dashboard/noticias`: 400. Límites `1` y `200` aceptados.
10. **`hours` inválido** (`0`, `721`, `abc`, vacío) en `logs` y `alerts`: 400. `720` aceptado.
11. **`category`/`level` fuera de lista** (`../../etc`, `foo`): 400 y `logger.getLogs` no se invoca.
12. **Anónimo con parámetros inválidos:** 401 (la autenticación precede a la validación).
13. **Error interno sin fuga:** dado que la consulta lanza `Error('secreto-interno-xyz')` (o `payload.auth` lo lanza), cuando se llama a cualquier ruta cubierta, entonces 500 y el cuerpo no contiene el texto interno ni `details`/`stack`.
14. **Auditoria.access:** `read` = `true` para `superadmin` y `auditor`, `false` para anónimo, `viewer`, `editor`, `web-admin`, `media-manager`, rol desconocido; `update`, `delete` y `create` = `false` para todos, incluido `superadmin`.
15. **Health anónimo:** cuerpo exactamente `{ "status": "ok" }`, no se abre conexión a BD ni se llama a MinIO.
16. **Health con `viewer`/`editor`:** mismo cuerpo mínimo.
17. **Health con `auditor`/`superadmin`:** cuerpo detallado; la conexión a BD usa la URI de entorno validada. Sin `DATABASE_URI`/`DATABASE_URL`, no se construye ninguna conexión y la BD figura caída (503). Ninguna conexión usa la credencial `postgres:password@localhost`.
18. **create-bucket:** `GET` no está exportado (405); `POST` anónimo 401; `editor`/`auditor`/`viewer` 403 sin crear; `superadmin` 200 con `{ success, message }` sin `response` del SDK; ya existente → 200; error del SDK → 500 genérico sin el texto del error; ningún `console.log` incluye el endpoint.
19. **Arnés:** `guard-route-roles` no reporta ninguna de estas rutas.

## Consumidores del panel revisados

| Consumidor | Llama a | Efecto del cambio |
|---|---|---|
| `admin/views/MonitoringView.tsx`, `app/monitoring/page.tsx` | `/api/health`, `/api/metrics` | `superadmin`/`auditor` sin cambio. Otros roles recibían datos; ahora reciben 403 (metrics) y mínimo (health). Se añadió comprobación `res.ok` para que la vista no falle al leer `metrics.sistema`. |
| `admin/views/AuditView.tsx` | `/api/auditoria` | Mismo parámetro `limit=20`, `page`, `accion`, `resultado`. Ya usa `data.docs ?? []`: un 403 muestra lista vacía. **Falta** `cambio_rol`/`ver`/`exportar` en sus filtros contra las opciones reales de la colección (`cambiar_rol`): pre-existente, no se toca. |
| `app/dashboard/page.tsx` | `/api/dashboard/stats`, `/api/dashboard/noticias?status=&page=` | Roles editoriales sin cambio; `status` enviado ∈ lista blanca. `viewer`/`media-manager` pasan a 403. `stats` ahora devuelve números (`totalDocs`), que es lo que la página ya esperaba. |
| `docker` healthcheck, portal `app/api/health/route.ts`, `deploy.yml` | `/api/health` anónimo | Siguen recibiendo 200 `{status:'ok'}`. |
| `docs/MONITOREO.md`, `SECURITY.md`, `docs/BACKUP_RECOVERY.md` | `curl` sin sesión | Ya no funcionan sin sesión; requieren cookie/token de `superadmin` o `auditor`. |
| `create-bucket` | ninguno en scripts, workflows ni docs (solo mención histórica en `docs/FASE-4-SUMMARY.md`) | Uso manual: `POST` autenticado como `superadmin`. |

## Hipótesis a validar en staging (no verificadas)

- H1: `payload.find`/`count` con `overrideAccess: false` y `user` aplican `readPublishedOrEditorial` también para `depth: 2` sobre relaciones (`createdBy`).
- H2: el `payload-token` de la sesión del panel llega a estas rutas por cookie (`payload.auth({ headers })` ya lo hacía, sin cambio).
- H3: `Auditoria.read` solo-`superadmin`/`auditor` no rompe el listado de la colección en el panel de otros roles (se espera 403 y sección vacía).

## Pendientes y fuera de alcance

- **DEP-07:** índices de `auditoria` (`usuario`, `fecha_hora`, `coleccion`) por migración. **No** se crea aquí.
- **DEP-03 / SEC-03:** flujo editorial y matriz final de roles. Esta política no la decide.
- **DEP-06:** rate limiting de estas rutas. **DEP-09:** readiness real de `/api/health`.
- `GET /api/alerts` sigue sirviendo estado en memoria por instancia; el almacén de alertas compartido no se revisa.
- `app/api/health/route.ts` del **portal** devuelve `String(error)` en su rama de error; no pertenece a las rutas del CMS de esta tarea.
- Los logs de auditoría escriben vía Local API (`utilities/audit.ts` → `payload.create`, `overrideAccess` por defecto `true`): **no dependen** de `Auditoria.access`, por lo que cerrar `update`/`delete` y mantener `create: false` no rompe el registro.

## Pruebas y rollback

- `tests/unit/cms-monitoring-routes.spec.ts` (handlers reales, `payload` simulado, auth sintética, sin Docker ni red). Arnés: `node harness/check.mjs --quick`, `node --test "harness/*.test.mjs"`.
- Rollback: revertir `apps/cms/src/utilities/routeGuard.ts`, las rutas bajo `apps/cms/src/app/api/{auditoria,logs,metrics,alerts,health,dashboard,setup}`, `Auditoria.ts`, las constantes añadidas en `access/roles.ts`, los ajustes de las vistas y `PUBLIC_API_ROUTES`. No hay migraciones ni datos que revertir.
