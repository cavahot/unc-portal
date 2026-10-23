# TASK-DEPLOY-001 — Remediar la auditoría pre-deploy del Portal UNC (SDD + RDD + TDD)

**Estado:** Propuesto; ninguna corrección aplicada.  
**Origen:** `docs/security/AUDIT-DEPLOY-2026-10-19.md` (revisión estática, sin build, tests ni Docker).  
**Relación:** complementa `TASK-SEC-001` y `TASK-ARCH-DB-001`. Donde un hallazgo ya tiene subtarea SEC/ARCH-DB, esta tarea **no la duplica**: la referencia y añade lo que falta (deploy, backup, nginx, supply chain).  
**Responsable / fechas:** sin asignar / sin definir.  
**Criterio de cierre:** el veredicto pasa de NO-GO a GO solo con DEP-18 firmado y todo el checklist del informe en verde, con evidencia reproducible. «Corregido» exige prueba negativa que falló antes y pasa después.

## Reglas de trabajo (AGENTS.md)

- Rama de trabajo; no commitear `test_write.txt`, `.env`, dumps, backups ni cambios ajenos. No tocar la política editorial: **SEC-03 sigue siendo decisión del Product Owner**.
- Pruebas solo con cuentas y datos sintéticos, en local o staging autorizado. Docker, Postgres, MinIO o staging solo con autorización explícita; sin pentest ni escaneos agresivos sobre producción.
- Comentarios en español en toda función, hook y regla nueva o modificada: qué hace, por qué existe, amenaza que evita y límite del control, con referencia `DEP-XX` y su RDD.
- Cada subtarea cierra con: diff, comando y salida de las pruebas, riesgos remanentes y rollback.

## Ciclo obligatorio por subtarea

1. **SDD:** escribir `docs/specs/deploy/DEP-XX-<tema>.md` con contrato, estados permitidos, escenarios Given/When/Then (incluidos negativos y acceso por API directa), fuera de alcance. Una decisión funcional pendiente se marca como bloqueo, no como supuesto.
2. **RDD:** añadir al `docs/research/evidence-register.md` una ficha `RDD-DEP-XX` (afirmación falsable, `archivo:línea`, método, límites, estado). Separar hecho observado de hipótesis. Un advisory no es prueba de explotación.
3. **TDD:** (RED) escribir la prueba que reproduce el fallo y verla fallar por la razón correcta; (GREEN) cambio mínimo; (REFACTOR) sin perder cobertura.
4. **Arnés:** la prueba debe colgarse de un gate (`DEP-00`) y ejecutarse con `node harness/check.mjs --quick|--full`.
5. **Revisión:** revisión fresca independiente antes de commit (regla pre-commit del orquestador); `review-risk` para accesos/auth y `judgment-day` tras el diseño y la aplicación de DEP-01..04 y DEP-07..09.

## Arnés: qué se añade

El arnés actual (`harness/check.mjs`) ejecuta `npm test` y `typecheck`, pero **no detecta ninguno de los fallos del informe**. DEP-00 lo extiende, siempre de solo lectura:

| Gate | Comprueba (sin ejecutar nada destructivo) | Cubre |
|---|---|---|
| `guard-tracked-secrets` | `git ls-files` no contiene `*.dump*`, `*.bak`, `*.backup*`, `.env*` (salvo `*.example`), `test_write.txt`, `package.*.before-*.json` | DEP-01, DEP-17 |
| `guard-api-coverage` | El `matcher` de `proxy.ts` y los handlers `/api/*` tienen límite/CORS aplicado donde se declara | DEP-06 |
| `guard-route-roles` | Todo `route.ts` de `apps/cms/src/app/api/**` llama a un guard de rol o está en una lista blanca explícita de rutas públicas | DEP-04 |
| `guard-jsonld` | Ningún `dangerouslySetInnerHTML` usa `JSON.stringify` sin el helper de escape | DEP-05 |
| `guard-env-parity` | Variables leídas por el código = variables en `compose.prod.yaml` y `.env.prod.example` | DEP-10 |
| `guard-deploy-steps` | El workflow de deploy contiene paso de migración, backup previo y rollback; imágenes sin `:latest` | DEP-07, DEP-09, DEP-11 |
| `guard-i18n-parity` | Mismos archivos y claves en `es`, `en`, `gn`, `pt-BR` o fallback declarado | DEP-15 |
| `guard-secret-required` | `PAYLOAD_SECRET` y secretos de preview/revalidate abortan si faltan | DEP-16 |

Reglas del arnés: cada gate es una función pura con su test en `harness/check.test.mjs` (ejemplo bueno y malo); salida JSON como la actual; **un gate rojo inicial es evidencia de deuda, no se oculta ni se excluye**. `--quick` incluye los guards; `--full` añade lint, typecheck CMS y `npm audit`. Se añaden al arnés los artefactos de esta tarea (`REQUIRED_ARTIFACTS`).

## Orden de ejecución

```
Ola 0  DEP-00 (arnés)
Ola 1  DEP-01 → DEP-02 → DEP-04 → DEP-05 → DEP-06   (exposición de datos y accesos)
        DEP-03 espera SEC-03 (decisión PO)
Ola 2  DEP-07 → DEP-08 → DEP-09 → DEP-10 → DEP-11   (esquema, backup, deploy)
Ola 3  DEP-12 · DEP-13 · DEP-14                      (nginx, supply chain, contenedores)
Ola 4  DEP-15 · DEP-16 · DEP-17                      (frontend medio, secretos, higiene)
Ola 5  DEP-18                                        (gate final)
```

Las olas 1 y 2 se pueden trabajar en paralelo solo en ramas/worktrees distintos (un escritor por conjunto de archivos).

## Subtareas

### DEP-00 · Extender el arnés con guards de lectura [bloqueante; primero]
- **Resultado:** los 8 gates de la tabla anterior, rojos hoy donde corresponda.
- **RED:** un test por guard con fixture mala (debe fallar) y buena (debe pasar), en `harness/check.test.mjs`.
- **Aceptación:** `node --test harness/check.test.mjs` verde; `node harness/check.mjs --plan` lista los guards; `--quick` los ejecuta y reporta rojo real sobre el repo actual. Sin dependencias nuevas, sin red, sin escribir archivos.
- **Rollback:** revertir `harness/`.

### DEP-01 · Sacar datos de producción del repositorio y blindar el restore [P0] — hallazgo C1
- **Resultado:** `setup/seed.dump.gz` fuera del repo (y del historial si contiene PII); `restore-db-prod.sh` no puede borrar datos sin backup.
- **SDD/GWT:** dado un dump con usuarios, cuando se audita, entonces se decide purga o conservación con registro; dado `restore-db-prod.sh`, cuando la BD tiene filas, entonces exige un `pg_dump` verificado antes del `DROP SCHEMA` o se niega; el `DROP` no usa `|| true`.
- **RDD:** RDD-DEP-01 (`git ls-files setup`, `restore-db-prod.sh`). Hipótesis a validar: si el dump contiene hashes de usuarios o PII (inspección en entorno aislado, sin imprimir valores).
- **RED:** `guard-tracked-secrets` falla mientras el dump esté versionado; test de shell/Node del script con BD simulada que debe rechazar sin backup.
- **Aceptación:** guard verde; `.gitignore` y `.dockerignore` cubren `setup/*.dump*`; purga de historial **solo con aprobación humana** (acción destructiva sobre el remoto); si hubo credenciales en el dump, rotarlas e invalidar sesiones.
- **Rollback:** copia del dump fuera del repo antes de purgar.

### DEP-02 · Anónimo no lee borradores ni versiones [P0] — hallazgo C2 (= SEC-02)
- Ejecutar SEC-02 con spec existente `SEC-001-anonimo-no-lee-borradores.md`. Añadir: `Paginas`, `TribunalDocumentos` (`active`), `Tesis`, `Media` según SEC-10.
- **RED:** pruebas REST, GraphQL y Local API como anónimo y cada rol, con `draft=true` y consulta de versiones; deben devolver solo `published`.
- **Aceptación:** además del texto de SEC-02, confirmar con test el comportamiento real de `draft` anónimo en Payload 3.87.1 (hoy es hipótesis).

### DEP-03 · Imponer el flujo editorial en servidor [P0; **bloqueada por SEC-03**] — hallazgo C3 (= SEC-04)
- No codificar permisos hasta que el Product Owner apruebe la matriz. Mientras tanto, solo un **conjunto cerrado provisional** que no amplíe permisos (nadie fuera de `superadmin`/`web-admin` publica).
- **RED:** `correspondent` y `editor` intentan `approvalStatus='publicado'`, `_status='published'` y editar `approvalHistory` por REST/GraphQL: deben recibir 403/422.
- **Aceptación:** historial escrito por hook `beforeChange` desde `req.user`; pruebas por rol derivadas de la matriz aprobada.

### DEP-04 · Rutas de auditoría y monitoreo con rol, ACL y errores seguros [P0/P1] — hallazgo alto (= SEC-05/06)
- **Alcance:** `Auditoria.read/update/delete`; `api/{auditoria,logs,metrics,dashboard/*,alerts GET,health,setup/create-bucket}`.
- **SDD/GWT:** `viewer` y `editor` reciben 403 en cada ruta; anónimo 401; `auditor`/`superadmin` según matriz provisional; `Auditoria.update/delete` = `() => false`; `limit`/`hours` acotados y validados; errores genéricos (sin `error.message`); `create-bucket` pasa a `POST`; consultas con `overrideAccess:false` y `user`.
- **RED:** `guard-route-roles` + una prueba por ruta y rol (anónimo, viewer, editor, auditor, superadmin).
- **Aceptación:** `guard-route-roles` verde; sin PII en respuestas de roles no autorizados; índices de `auditoria` (`usuario`, `fecha_hora`, `coleccion`) vía migración nueva (ver DEP-07).

### DEP-05 · JSON-LD seguro (XSS almacenado) [P0] — hallazgo alto (parte de SEC-10)
- **Resultado:** helper único `safeJsonLd` que escapa `<`, `>`, `&`, U+2028/2029, usado en los 6 sitios (`noticias/[slug]`, `carreras/[slug]`, `layout`).
- **RED:** test con título `</script><script>alert(1)</script>` que debe quedar inerte; `guard-jsonld` rojo hoy.
- **Aceptación:** guard y test verdes; sin otros `dangerouslySetInnerHTML`.

### DEP-06 · Cubrir `/api/*` con límites y CORS reales [P1] — hallazgo alto (= SEC-07)
- **Resultado:** rate limit y validación dentro de cada handler público (`contact`, `preview`, `revalidate`, `monitoring`); IP de cliente tomada de un proxy confiable (`x-real-ip` fijado por nginx), no del primer `x-forwarded-for`.
- **RED:** test de matcher para las rutas listadas; test de 429 que no se evade rotando `x-forwarded-for`; `request.ip` verificado en Next 16.2.12.
- **Aceptación:** `guard-api-coverage` verde; límite de tamaño de cuerpo; decisión documentada sobre store compartido (en memoria no escala a varias instancias).

### DEP-07 · Camino único y reproducible de esquema y migraciones [P0] — hallazgo C4 (= ARCH-DB)
- **Decisión de diseño (bloqueo documentado):** elegir una vía —(a) restaurar seed y registrar el baseline en `payload_migrations`, o (b) `migrate` sobre BD vacía— y descartar la otra. Tradeoff: (a) rápido pero arrastra el estado del dump; (b) reproducible pero exige reimportar datos.
- **Acciones:** paso explícito `payload migrate` en el deploy, con `pg_dump` previo; `down` del baseline solo ejecutable sobre BD vacía; nuevas migraciones para índices de auditoría.
- **RED:** test que importa `migrations` y compara con los archivos del directorio (reemplaza el `toContain` actual); `guard-deploy-steps` rojo hoy.
- **Aceptación:** esquema reproducible en BD sintética (con autorización para levantar Postgres); sin deriva entre colecciones y migración.

### DEP-08 · Backup y restore probados de extremo a extremo [P0/P1] — hallazgo alto
- **Resultado:** `backup.sh`/`restore.sh` con formato coherente (`pg_dump -Fc` + `pg_restore`), contenedor parametrizado (`-prod`), stderr fuera del dump; backup de MinIO (`mc mirror`); cifrado (age/gpg) y copia fuera del host; retención definida; `backup.yml` rediseñado (no exige Postgres público).
- **RED:** ciclo backup→restore sobre BD sintética que hoy falla; verificación de integridad del dump.
- **Aceptación:** restore probado y documentado con fecha y RTO/RPO medidos. Es **condición de release** de TASK-ARCH-DB-001.

### DEP-09 · Health real, despliegue por sha y rollback [P0/P1] — hallazgo alto
- **Resultado:** `/api/health` con `SELECT 1` y timeout sin sesión (liveness/readiness separados, sin datos sensibles) usando `getDatabaseURL()` y el pool de Payload; compose con `image: …:${IMAGE_TAG}`; deploy con `up --wait`, reintentos y rollback al sha anterior; `environment: production` con reviewers.
- **RED:** test del health con BD simulada caída (debe dar 503); `guard-deploy-steps`.
- **Aceptación:** simulación de fallo en staging revierte sola; procedimiento de rollback en `DEPLOY.md`.

### DEP-10 · Variables de entorno alineadas [P1] — hallazgo alto
- **Resultado:** un solo nombre por variable (`SMTP_USER`, `SMTP_PASSWORD`, `SMTP_SECURE`, `SMTP_FROM_ADDRESS`, `SMTP_FROM_NAME`, `CONTACT_TO`, `POSTGRES_SSL`, DSN de Sentry del CMS) en código, compose y `.env.prod.example`, sin valores reales.
- **RED:** `guard-env-parity` rojo hoy.
- **Aceptación:** guard verde; prueba de correo de recuperación y de contacto en Mailpit local.

### DEP-11 · MinIO e imágenes con versión fija y mínimo privilegio [P1] — hallazgo alto
- **Resultado:** tags `RELEASE.*` fijos para MinIO y digest/sha para imágenes propias; usuario de servicio de MinIO con política limitada al bucket (el root no llega al CMS); revisar `disablePayloadAccessControl:true` (ARCH-DB-06).
- **RED:** `guard-deploy-steps` (sin `:latest`) y test de que el CMS no recibe `MINIO_ROOT_*`.
- **Aceptación:** subida y lectura de medios verificadas en staging con la credencial limitada.

### DEP-12 · Nginx: headers, límites y TLS [P2]
- **Resultado:** `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors`, CSP acordado; rate limit también en `forgot-password`, GraphQL y `/admin`; `/admin` con allowlist de IP o segundo factor; `limit_except GET HEAD` en `files.*`; renovación de certificados por webroot con volumen montado; `set_real_ip_from`; `proxy_cache` coherente o comentario corregido.
- **Prueba:** `nginx -t` en contenedor descartable (con autorización) y casos de curl contra staging.

### DEP-13 · Cadena de suministro del CI/CD [P2]
- **Resultado:** actions pineadas por SHA; permisos mínimos por job; secretos fuera de la interpolación del script SSH; `SENTRY_AUTH_TOKEN` con `--mount=type=secret`; jobs de Docker build y `npm audit` en CI sin tolerar errores de typecheck; Node unificado entre CI y ambos Dockerfiles.
- **RED:** lint de workflows (p. ej. `actionlint`, si se aprueba la herramienta) o guard propio.

### DEP-14 · Endurecimiento de contenedores y observabilidad [P2]
- **Resultado:** `no-new-privileges`, `cap_drop`, límites de memoria/CPU, redes separadas (frontend/backend), rotación de logs; Sentry también en el CMS; alerta por tasa de error y monitor externo sobre `/api/health`.
- **Aceptación:** `docker compose config` válido; reinicio ordenado con límites en staging.

### DEP-15 · Frontend: enlaces, caché de 404 e i18n [P2]
- **Resultado:** allowlist de esquema `^(https?:|mailto:|tel:|/|#)` en RichText y componentes con URL de CMS (confirmar cuál de los dos serializadores está vigente); distinguir «no existe» (404) de «CMS caído» (error sin cachear) en detalle de noticias y carreras; `catch` en `generateStaticParams`; archivos i18n faltantes o fallback declarado y probado.
- **RED:** tests de URL `javascript:`, de CMS caído y `guard-i18n-parity`.

### DEP-16 · Secretos y rutas auxiliares [P1/P2]
- **Resultado:** `PAYLOAD_SECRET` ausente = el arranque aborta con mensaje claro; `revalidate` compara longitudes antes de `timingSafeEqual` (401, no 500); preview con token firmado de vida corta en lugar de secreto en query; `/api/monitoring` ignora el DSN del cliente o valida contra lista de hosts; eliminar `my-route`; confirmar cookies/CSRF reales de Payload en staging y el playground GraphQL desactivado.
- **RED:** `guard-secret-required` y tests por ruta.

### DEP-17 · Higiene del repositorio [P3]
- **Resultado:** `git rm --cached` de `.bak`/`.backup`, `apps/cms/test.env`, `package.*.before-*.json`, `app/security-headers.ts` (código muerto y contradictorio), `.claude/worktrees/`; `.gitignore` ampliado (`*.bak`, `*.backup*`, `test_write.txt`); `remotePatterns` sin localhost en producción.
- **Aceptación:** `guard-tracked-secrets` verde. `test_write.txt` no se toca ni se borra: solo se ignora.

### DEP-18 · Gate final go/no-go [bloqueante; depende de DEP-00..17 y SEC-11]
- **Aceptación:**
  - `node harness/check.mjs --full` en verde, con `npm audit` triado.
  - Matriz de permisos aprobada por el Product Owner (SEC-03).
  - Pruebas negativas por rol en REST, GraphQL, Local API y panel, en staging con datos sintéticos.
  - Build y lint del portal y del CMS.
  - Backup y restore probados, y rollback por sha ensayado.
  - Checklist del informe completo, sin secretos en los reportes.
  - Responsable firma el go/no-go. Lo diferido se registra con riesgo, responsable y fecha.

## Trazabilidad hallazgo → tarea

| Hallazgo (informe) | Tarea |
|---|---|
| C1 dump en git / restore destructivo | DEP-01 |
| C2 borradores públicos | DEP-02 (= SEC-02) |
| C3 flujo editorial sin control | DEP-03 (= SEC-04, bloqueada por SEC-03) |
| C4 sin migraciones ni rollback | DEP-07, DEP-09 |
| Auditoría expuesta/mutable; rutas de monitoreo sin rol | DEP-04 (= SEC-05/06) |
| Rate limit/CORS no cubren `/api/*` | DEP-06 (= SEC-07) |
| XSS por JSON-LD | DEP-05 |
| Backup/restore incompatibles | DEP-08 |
| Health engañoso | DEP-09 |
| Variables desalineadas | DEP-10 |
| MinIO sin pin / credencial root | DEP-11 |
| Nginx | DEP-12 |
| Workflows y supply chain | DEP-13 |
| Contenedores, observabilidad | DEP-14 |
| Enlaces RichText, caché 404, i18n | DEP-15 |
| Secreto vacío, preview, revalidate, monitoring | DEP-16 |
| Backups versionados, código muerto | DEP-17 |

## Por dónde empezar

**DEP-00** (arnés con guards rojos reales), luego **DEP-01** y **DEP-02**. DEP-03 no avanza hasta que el Product Owner decida SEC-03. SEC-09 (CMS que no compila ni pasa lint) sigue siendo bloqueo de merge para todo lo anterior.

## Límites de esta tarea

No acredita que ningún hallazgo esté corregido y no sustituye un pentest autorizado. Los hallazgos marcados como hipótesis en el informe (cookies/CSRF de Payload, `draft` anónimo, `request.ip` en Next 16) deben convertirse en hecho o refutarse con prueba antes de cerrar su subtarea. No publicar como issue en GitHub sin confirmar destino y ausencia de duplicados.
