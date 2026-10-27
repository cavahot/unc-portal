# DEP-09 — Health real, despliegue por sha y rollback de imagen

**Estado:** implementación local propuesta; **nada de esto se ha probado con Docker, Postgres, ghcr.io ni servidor reales** (ver «Lo que NO se verificó»). **Backlog:** DEP-09 (hallazgo alto «Misleading health check» de `docs/security/AUDIT-DEPLOY-2026-10-19.md`, línea 31; C4 junto con DEP-07). **Formato:** SEC-005. **RDD:** `docs/research/evidence-register.md` (RDD-DEP-27 … RDD-DEP-31). No autoriza pentest ni despliegue.

## Problema (hecho observado)

1. `/api/health` anónimo del CMS devuelve `{status:'ok'}` sin tocar la BD (`apps/cms/src/app/api/health/route.ts`, rama `!canSeeDetail`): el healthcheck de Docker y el deploy dan verde con la BD caída (RDD-DEP-27).
2. `compose.prod.yaml` referencia `:latest` para `cms` y `portal`; el tag `sha-xxxxxxx` se publica pero no se usa → no hay forma de volver a «la versión anterior» (RDD-DEP-28).
3. El deploy espera 20 s fijos, consulta la URL pública y no revierte ante fallo (RDD-DEP-29).
4. El `/api/health` del portal devuelve `String(error)` y `error.message` en sus ramas de error, y responde 503 cuando el CMS cae (acopla la liveness del portal a otro servicio) (RDD-DEP-30).

## Contrato

### A. Liveness vs readiness del CMS

- `GET /api/health` (liveness, **sin cambio de contrato**): anónimo y roles sin monitoreo → `200 {"status":"ok"}`. Sirve a monitores externos y a DEP-04. No prueba la BD.
- `GET /api/health/ready` (readiness, **nueva, sin sesión**): ejecuta `SELECT 1` con una conexión corta (`Pool` de `max: 1` construido con `getDatabaseURL()`; no usa el pool de Payload) y un tope de ≈ 2 s.
  - BD responde → `200 {"status":"ready"}`.
  - BD caída, lenta, `DATABASE_URI` ausente/inválida o cualquier excepción → `503 {"status":"unavailable"}`.
  - El cuerpo **nunca** incluye host, URI, mensaje de error, stack ni nombre de excepción. El detalle va solo al log del servidor (nombre de la excepción, sin `message`).
  - Cabecera `Cache-Control: no-store` (que no la cachee un intermediario).
  - **Caché de resultado en proceso: 5 s** (una sola comprobación en vuelo; las llamadas concurrentes comparten la promesa). Cota: ≤ 1 conexión a Postgres cada 5 s por proceso, sin importar la tasa de peticiones.
  - **Limitador por IP**: 30 peticiones por 60 s por clave; la clave es `x-real-ip` válido (nginx lo fija con `$remote_addr`, mismo criterio de DEP-06) o el cubo `no-ip`. Superado → `429 {"status":"rate_limited"}` con `Retry-After`. El limitador se evalúa **antes** de la caché.
  - Decisión «limitador local y no `lib/security/rateLimit`»: la imagen del CMS se construye desde `apps/cms` (la etapa `migrator` solo copia `apps/cms/src`; el runner es el `standalone` de Next) y `apps/cms/tsconfig.json` no resuelve `lib/` del portal. Importarlo cruzaría la frontera del paquete sin verificar el trazado de `standalone`. Se implementa uno mínimo (ventana fija por clave, memoria acotada) en `apps/cms/src/utilities/readiness.ts`. **Límite:** ventana fija (permite hasta 2× el límite en el borde de dos ventanas); memoria por proceso, no compartido entre réplicas (misma pendiente que DEP-06).
- **Healthcheck de Docker del `cms`** apunta a `/api/health/ready` (la BD caída marca el contenedor `unhealthy`, y `depends_on: service_healthy` de `portal`/`nginx` lo respeta). Consumo: 4 llamadas/min desde `localhost` (cubo `no-ip`), muy por debajo de 30/min. Docker **no reinicia** un contenedor por `unhealthy` (solo la política `restart` ante salida del proceso), así que un parpadeo de la BD no provoca bucles de reinicio.
- **Healthcheck del `portal`** sigue en `/api/health` (liveness propia; ver B).

### B. Portal

- `GET /api/health` del portal: la caída del CMS es **solo informativa** (`dependencies.cms.status = 'down'`, `status = 'degraded'`) y la respuesta HTTP sigue siendo **200**: el portal está vivo aunque el CMS no lo esté (las páginas ya degradan a datos de respaldo). 503/500 queda para fallos propios del portal.
- Ya no se devuelve `String(error)` ni `error.message`: ninguna rama incluye texto de excepciones, URLs ni rutas. El detalle va al log (solo `error.name`).

### C. Despliegue por sha

- `compose.prod.yaml`: `cms`, `portal` y `cms-migrate` usan `image: ghcr.io/cavahot/<imagen>:${IMAGE_TAG:?IMAGE_TAG obligatorio (sha-xxxxxxx)}`. Sin `IMAGE_TAG`, **cualquier** comando `docker compose` sobre ese archivo falla (la interpolación es del archivo entero; es deliberado: no hay «latest implícito»). `CMS_IMAGE_TAG` (DEP-07) se sustituye por `IMAGE_TAG`: migrator y cms son siempre del mismo sha.
- MinIO conserva `:latest` (pin y credencial root: **DEP-11**, no se toca aquí; `guard-deploy-steps` lo seguirá reportando).
- `deploy.yml`: el tag es `sha-` + los 7 primeros caracteres de `github.event.workflow_run.head_sha` (el commit que CI validó y que `build-images` construye). Se calcula con la misma fórmula en `build-images` (para etiquetar) y en `deploy` (para desplegar). Se pasa al servidor con `envs: IMAGE_TAG`. `latest` sigue publicándose como alias, **nunca** como referencia de despliegue.
  - Razón de no usar `type=sha` de `docker/metadata-action`: usa `GITHUB_SHA`, que en `workflow_run` es el último commit de la rama por defecto y puede diferir de `head_sha` si hubo otro push entre CI y deploy.

### D. Gate de readiness y rollback (script SSH de `deploy.yml`)

- **Fail-fast** (antes de `docker login`, `pull`, backup o migrate): `IMAGE_TAG` ausente o que no cumpla `^sha-[0-9a-f]{7,40}$` → `exit 1`. El archivo de estado `.deploy-previous-tag` (junto al compose, en `/opt/unc-portal`) debe existir y contener un tag válido; si no existe → `exit 1` con mensaje claro (**primer deploy: no hay rollback posible**; se siembra a mano tras el arranque inicial de `DEPLOY.md`).
- Tras `cms-migrate` y `up -d --remove-orphans`, el gate consulta **por la red interna**, no por la URL pública: `docker exec unc-cms-prod wget … /api/health/ready` y `docker exec unc-portal-prod wget … /api/health`, con reintentos (`DEP09_READY_RETRIES`, defecto 12; `DEP09_READY_INTERVAL`, defecto 5 s ⇒ ≈ 60 s). `wget` sale con != 0 ante 503/429/conexión rechazada.
- **Éxito:** se escribe el tag nuevo en `.deploy-previous-tag` (archivo temporal + `mv`) **solo ahora**. El archivo contiene siempre «el último tag que pasó el gate».
- **Fallo del gate o de `up -d`:** `IMAGE_TAG=<previo> docker compose up -d --no-deps cms portal`, se vuelve a pasar el gate para informar si el rollback quedó sano y el script **sale con código != 0**. El archivo de estado **no** se sobrescribe. `--no-deps` evita relanzar `cms-migrate` y tocar Postgres/MinIO/nginx.
- **Nunca** se invoca `down` (ni `migrate:down|reset|refresh|fresh`) en el rollback.
- **Límites que el mensaje del script declara:** el rollback de imagen **no revierte migraciones**; solo es seguro si las migraciones del lote son retrocompatibles (expandir/contraer). Si no lo son, la restauración de datos es **manual** desde `backups/pre-deploy-<UTC>.dump` (DEP-01/DEP-08), con aprobación humana y pérdida de escrituras posteriores (DEP-07 C10).

### E. Environment de GitHub

`environment: production` con revisores requeridos es un **ajuste manual** (Settings → Environments); no se automatiza ni se da por hecho. Se añade al checklist de `DEPLOY.md`.

## Escenarios Given/When/Then (negativos primero)

1. **BD caída:** dado que `SELECT 1` rechaza con `Error('connect ECONNREFUSED 10.0.0.5:5432 password=secreto')`, cuando se llama a `GET /api/health/ready`, entonces 503 `{"status":"unavailable"}` y el cuerpo (y las cabeceras) no contienen `10.0.0.5`, `ECONNREFUSED`, `secreto`, ni la URI de entorno.
2. **BD colgada:** dado que la consulta no resuelve, cuando pasan 2 s, entonces 503 (no se espera indefinidamente) y la conexión se cierra.
3. **Sin URI:** dado que no hay `DATABASE_URI`/`DATABASE_URL` válidas, entonces 503 y **no** se construye ningún `Pool`.
4. **Rate limit:** dadas 30 peticiones desde `x-real-ip: 203.0.113.9` en la ventana, la 31.ª → 429 con `Retry-After` entero ≥ 1 y sin consulta a BD; otra IP no se bloquea.
5. **`x-forwarded-for` ignorado:** rotar `x-forwarded-for` no evade el límite (la clave es `x-real-ip`/`no-ip`).
6. **Caché:** dos peticiones en < 5 s disparan **una** sola consulta; tras 5 s se vuelve a consultar. Un 503 también se cachea (no hay tormenta de reconexiones con la BD caída).
7. **BD ok:** 200 `{"status":"ready"}`, `Cache-Control: no-store`, sin sesión ni consulta a `payload.auth`.
8. **Liveness intacta:** `/api/health` anónimo sigue devolviendo exactamente `{"status":"ok"}` sin abrir conexión a BD.
9. **Portal sin fuga:** dado que `fetch` rechaza con `Error('connect ECONNREFUSED 10.0.0.5:3002')`, el cuerpo no contiene ese texto ni `String(error)`; dado CMS caído, responde 200 con `dependencies.cms.status = 'down'`.
10. **IMAGE_TAG ausente o inválido** (`latest`, `sha-abc;rm -rf /`): el script falla con exit != 0 antes de invocar `docker` alguna vez.
11. **Primer deploy sin tag previo:** sin `.deploy-previous-tag`, exit != 0, sin `pull`, sin `migrate`, sin `up`; el mensaje explica cómo sembrarlo.
12. **Readiness que nunca responde:** tras `DEP09_READY_RETRIES` intentos, `up` con el tag previo, exit != 0, `.deploy-previous-tag` **sigue** con el tag previo, y no se ejecutó `down`.
13. **Rollback que también falla:** exit != 0, el archivo de estado intacto y mensaje de intervención manual.
14. **Éxito:** `.deploy-previous-tag` pasa a contener el tag nuevo **después** del gate; con éxito tras k reintentos (k < máximo) también.
15. **`up` falla:** se trata como fallo del gate (rollback), no como éxito.
16. **Estático:** `compose.prod.yaml` no contiene `:latest` salvo MinIO; `cms`, `cms-migrate` y `portal` usan `${IMAGE_TAG:?`; `deploy.yml` pasa `IMAGE_TAG` por `envs` y calcula el tag desde `head_sha`; no aparece `down`.
17. **Arnés:** `guard-route-roles` acepta la nueva ruta solo porque está en `PUBLIC_API_ROUTES`; `guard-deploy-steps` ya no reporta «falta rollback» ni los `:latest` propios, pero **sigue reportando** el de MinIO.

## Verificación

| Escenario | Prueba |
|---|---|
| 1–7 | `tests/unit/cms-health-ready.spec.ts` (handlers reales, `pg` y `payload` simulados) |
| 8, 9 | `tests/unit/cms-monitoring-routes.spec.ts` (existente, caso 15) y `tests/unit/portal-health.spec.ts` |
| 10–15 | `tests/deploy/dep09-deploy-rollback.test.mjs` (script SSH real con shim `docker`) |
| 16 | mismo archivo (comprobaciones textuales de YAML) |
| 17 | `harness/guards.test.mjs` + ejecución de los 8 guards |

## Lo que NO se verificó

- Nada se ejecutó con Docker, Compose, Postgres, ghcr.io ni un servidor: el shim simula `docker`, `wget`, `psql` y `pg_*`.
- `docker exec … wget` dentro de las imágenes reales (busybox `wget` de Alpine: `-T` y código de salida != 0 ante 503) — supuesto de documentación, no medido.
- Que `up -d --no-deps cms portal` con el tag previo arranque sin relanzar `cms-migrate` (comportamiento de Compose con `depends_on`) y que las imágenes previas sigan en el disco del servidor (`docker image prune -f` solo borra imágenes colgantes; un `prune -a` externo las quitaría).
- Que `appleboy/ssh-action@v1.2.0` propague `envs: IMAGE_TAG` (parámetro documentado de la acción).
- Que el `Pool` de `pg` cierre una conexión colgada tras `end()`; que 2 s sea suficiente bajo carga real.
- Que `payload migrate` con la imagen previa no se ejecute durante el rollback (no se ejecuta por `--no-deps`).
- El `environment: production` con revisores (ajuste manual de GitHub).

## Riesgos remanentes

- Rollback de imagen con esquema ya migrado: seguro solo con migraciones retrocompatibles; no hay verificación automática de esa propiedad.
- El archivo `.deploy-previous-tag` es el único registro del tag sano; si se borra, el siguiente deploy aborta (falla cerrado).
- Limitador y caché en memoria por proceso (N réplicas ⇒ N× el límite y N conexiones/5 s).
- `latest` sigue publicándose: quien despliegue a mano con `:latest` ya no puede (Compose falla sin `IMAGE_TAG`), pero el alias existe en el registro.
- DEP-07 C8 pide que readiness informe «migraciones pendientes»: **no se implementa**; el orden lo garantiza `depends_on: cms-migrate` y el gate de `SELECT 1` no detecta un esquema atrasado.

## Rollback de este cambio (por bloques)

1. Readiness: eliminar `apps/cms/src/app/api/health/ready/`, `utilities/readiness.ts`, la entrada de `PUBLIC_API_ROUTES` y devolver el healthcheck del `cms` a `/api/health`.
2. Portal: revertir `app/api/health/route.ts`.
3. Por sha: devolver `:latest` / `${CMS_IMAGE_TAG:-latest}` en el compose y quitar `envs`/pasos de tag del workflow.
4. Gate/rollback: restaurar el bloque `up -d` + paso «Health check» previos de `deploy.yml`.
5. Pruebas: borrar `tests/unit/cms-health-ready.spec.ts`, `tests/unit/portal-health.spec.ts`, `tests/deploy/dep09-deploy-rollback.test.mjs` y revertir el seed de tag en `dep07-deploy-script.test.mjs`.
No hay migraciones ni datos que revertir.
