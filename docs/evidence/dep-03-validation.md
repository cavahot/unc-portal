# DEP-03 — Validación empírica con Payload real y Postgres sintético

**Fecha:** 2026-10-22. **Alcance autorizado por el dueño:** Postgres SINTÉTICO y AISLADO en Docker local, solo para esta validación (AGENTS.md). **Spec:** `docs/specs/security/DEP-03-flujo-editorial-servidor.md` (hipótesis H1–H8). **RDD:** RDD-DEP-57 … RDD-DEP-66. **Formato:** el de `dep-07-validation.md`. No se modificó código del repo (apps/, lib/, app/, scripts, compose, migraciones, tests), no hubo commit y no se usó `test_write.txt`, ningún `.env`, `setup/seed.dump.gz` ni base real.

## Entorno

| Elemento | Valor |
|---|---|
| Host | Windows 11, Node v24.18.0, Payload 3.87.1 (`node_modules` del repo), `tsx` y CLI `payload` del repo ejecutados en el host (no en contenedor) |
| Docker | 28.0.4; imagen `postgres:16-alpine` (ya local, sin pull) |
| Recursos | contenedor `unc-dep03-synth-pg`, red `unc-dep03-synth-net`; sin volúmenes (`--tmpfs` como datadir); puerto publicado solo en `127.0.0.1:55433` |
| Credenciales | contraseña de Postgres y `PAYLOAD_SECRET`/`REVALIDATION_SECRET`/`PREVIEW_SECRET` aleatorios (hex de 32 bytes) en un `env.sh` del scratchpad, cargados solo en el proceso hijo; `REVALIDATION_SECRET` se quitó en las pruebas funcionales para no llamar al portal |
| SMTP / S3 / N8N | SMTP a `127.0.0.1:1` (nada escucha: el log muestra el error no fatal `Error verifying Nodemailer transport`, ya conocido como D5 de DEP-07); `payload.sendEmail` se sustituyó en el proceso de prueba por una función que solo registra destinatario y asunto (no sale ningún correo); sin variables S3 (plugin desactivado) ni `N8N_WEBHOOK_URL` |
| Datos | exclusivamente sintéticos: 9 usuarios `*@example.invalid` (correspondent ×2, editor, reviewer, publisher, web-admin, superadmin, auditor, viewer), noticias/páginas inventadas, 3 filas «heredadas» insertadas por SQL |
| Pre-existentes (no tocados) | `unc-postgres-local`, `unc-minio-local`, `unc-mailpit-local`, `welcome-to-docker`, red `unc-local_default`, volúmenes `unc_*` |

Scripts (scratchpad, no versionados): `run1.mjs` (Local API: matriz, lectura, heredadas, H5/H8, páginas, auditoría, correo), `run2.mjs` (REST con `handleEndpoints` de Payload, el mismo handler que usa la ruta REST de Next), `run3.mjs` (GraphQL), `run4.mjs` (SQL de la migración). Todos arrancan Payload con `getPayload({ config })` sobre `apps/cms/src/payload.config.ts` real y `NODE_ENV=production` (sin `push` de esquema). Cada escenario usa `overrideAccess: false` y el `user` del rol, salvo las comprobaciones marcadas con `overrideAccess: true`.

**Límites del método (importantes):** (1) no se ejercitó la interfaz del admin en un navegador: H5 se prueba con el cuerpo del formulario completo enviado por Local API; (2) `@payloadcms/next/routes` no se pudo importar bajo `tsx` (se queda colgado), por eso REST se probó con `handleEndpoints` y GraphQL ejecutando el esquema construido por `configToSchema` (la misma función que usa la ruta `/api/graphql`), no por HTTP real; (3) el esquema GraphQL de la config real NO se construye (ver D2), por lo que las pruebas GraphQL se hicieron con una copia de `src/` en el scratchpad con un único cambio (`graphQL.singularName` en el bloque FAQ); (4) los datos son pocos (≈16 noticias, 1 página) y no sustituyen una prueba de carga.

## Resultado por punto

| # | Punto | Resultado |
|---|---|---|
| 1a | `payload migrate` aplica baseline + dep_03 sobre BD vacía | **CONFIRMADO** |
| 1b | 64 tablas; `created_by_id` / `version_created_by_id` nullable, FK `ON DELETE set null` e índice en las 4 tablas | **CONFIRMADO** |
| 1c | Idempotencia (2.ª ejecución sin cambios; SQL de `up` reaplicado dos veces sin cambios) | **CONFIRMADO** |
| 1d | Sin deriva (H6): migraciones == lo que Payload dibuja desde la config | **CONFIRMADO** |
| 1e | `down` de dep_03 y re-`up` | **CONFIRMADO** (el `down` es un no-op documentado: las columnas permanecen) |
| 2 | Las 6 negativas de SEC-03 y la tabla transición × rol con Payload real (Local API, REST, GraphQL) | **CONFIRMADO** (0 fallos) |
| 2-H1/H2 | `where` con `createdBy` en `update`/`read`; `readVersions` devuelve `Where` | **CONFIRMADO** |
| 2-H3 | `beforeOperation` fuerza `draft:true` y la operación lo respeta | **CONFIRMADO** |
| 2-H4 | `reviewComment` virtual llega al hook | **CONFIRMADO** |
| 2-H5 | Revisor con formulario completo no rompe arrays/bloques | **CONFIRMADO con cuerpo de formulario completo; UI del admin NO CONCLUYENTE** |
| 2-H7 | GraphQL/REST no exponen `createdBy` a no editoriales | **CONFIRMADO con matiz** (D1: `sort=createdBy` sí se acepta; D2: GraphQL no construye con la config real) |
| 2-H8 | Comparación de contenido sin falsos negativos/positivos con richText/bloques | **CONFIRMADO** (para el contenido probado) |
| 3 | Datos heredados sin `created_by` | **CONFIRMADO** (con la observación D4) |
| 4 | Auditoría y notificaciones | **CONFIRMADO** |
| 5 | Defectos nuevos / regresiones de lectura pública | 2 defectos y 3 observaciones (D1–D6); **sin regresión de lectura pública** |

Recuento: 117 comprobaciones en Local API/SQL, 46 en REST y 23 en GraphQL = 186, 0 FAIL, más 23 notas informativas. Comprobaciones que no son probatorias y no deben contarse como evidencia: `G8` y `PG3b` (verdaderas por construcción), `GH7c` (solo informativa) y `GM9` (la mutación de prueba quedó mal formada y falló por validación de esquema, no por acceso; la negativa «anónimo no crea» está probada por REST, `RC3b`, y Local API, `C5b`). Un primer `G1` falló por un error mío de prueba (esperaba ver una heredada publicada sin versiones con `draft:true`); se corrigió el criterio, ver D4.

### Punto 1 — Migraciones

Comandos (desde `apps/cms`, entorno del hijo): `../../node_modules/.bin/payload migrate`.

- 1.ª ejecución: `Migrated: 20261017_021341_arch_db_02_baseline (887ms)`, `Migrated: 20261022_134500_dep_03_created_by (39ms)`, `Done.`, exit 0. `payload_migrations`: 2 filas, ambas `batch=1`. **64 tablas**.
- 2.ª ejecución: solo `Done.`, sin `Migrating:`, sigue en 2 filas.
- Columnas (`information_schema`): `noticias.created_by_id`, `paginas.created_by_id`, `_noticias_v.version_created_by_id`, `_paginas_v.version_created_by_id`, todas `integer`, `is_nullable = YES`, sin default.
- FK (`pg_constraint`): `noticias_created_by_id_users_id_fk`, `paginas_created_by_id_users_id_fk`, `_noticias_v_version_created_by_id_users_id_fk`, `_paginas_v_version_created_by_id_users_id_fk`, todas `FOREIGN KEY (...) REFERENCES users(id) ON DELETE SET NULL`.
- Índices (`pg_indexes`): `noticias_created_by_idx`, `paginas_created_by_idx`, `_noticias_v_version_version_created_by_idx`, `_paginas_v_version_version_created_by_idx`, todos `btree` sobre la columna. `\d _paginas_v` muestra la columna, el índice y la FK con los mismos nombres.
- Deriva, dos métodos independientes:
  1. **Esquema por `push` vs migraciones.** BD B creada solo por Payload desde la config (`push` en modo desarrollo) y BD A creada por `payload migrate`: columnas (tabla, columna, tipo, default, nulabilidad: 530 filas), índices y restricciones (436 filas) **idénticos**. La única diferencia del `pg_dump --schema-only` es el orden físico de las columnas `created_by_id`/`version_created_by_id` (en la migración se añaden con `ALTER TABLE`, al final; `push` las crea inline): sin efecto funcional.
  2. **`payload migrate:create` en una COPIA** de `apps/cms/src` dentro del scratchpad (la config copiada apunta a su propio `migrations/`, el repo no se tocó): `--skip-empty` no creó archivo; sin `--skip-empty` Payload respondió «No schema changes detected. Would you like to create a blank migration file?». Es decir, el snapshot `.json` de dep_03 coincide con la config.
- SQL de `up` reaplicado dos veces sobre una BD ya migrada (`run4.mjs`): catálogo de columnas/índices/FK idéntico antes y después (IF NOT EXISTS / `duplicate_object` funcionan). `down` llamado: sin cambios.
- `down` por CLI (BD aparte; baseline en lote 1 y dep_03 en lote 2): `payload migrate:down` → `Migrated down: 20261022_134500_dep_03_created_by (7ms)`, `payload_migrations` queda con el baseline, las 4 columnas y 64 tablas siguen, y el re-`migrate` vuelve a registrar dep_03 (lote 2) con 4 columnas, 4 índices y 4 FK. (Con ambas migraciones en el mismo lote, `migrate:down` también revertiría el baseline, cuyo `down` está protegido contra BD con filas; no se repitió, ya cubierto en DEP-07.)
- Observación operativa: arrancar Payload en modo desarrollo (sin `NODE_ENV=production`) contra una BD migrada insertó la fila `('dev', -1)` en `payload_migrations`: es el riesgo D4 de DEP-07 (un `migrate` posterior se cuelga o se bloquea). Esa BD de prueba se recreó antes de las pruebas funcionales.

### Punto 2 — Matriz editorial con Payload real

Se ejecutó el flujo completo (crear → revisión → aprobado → publicado → editar → despublicar → rechazo) por Local API (117 comprobaciones), REST (46) y GraphQL (23). Resumen de lo que quedó demostrado; los códigos son los HTTP devueltos por Payload:

| Escenario SEC-03 / spec | Resultado observado |
|---|---|
| Corresponsal fija `aprobado`, `publicado`, `_status: published` (y combinados), propio y con/sin `?draft=true` | 403 en Local API, REST y GraphQL; el documento queda `draft/draft` |
| Crear con `aprobado` / `publicado` / `published` / `rechazado` | 403; `en_revision` → 422; sin estado → `draft/draft` y `createdBy` = sesión (aunque el cliente envíe otro) |
| Editor publica / aprueba | 403 (también con `?draft=true`) |
| Revisor aprueba con título, resumen y contenido alterados | aprueba y el contenido vuelve al original (título, resumen, richText idénticos); pide `publicado`/`published` → 403; envía a revisión → 403; `draft → aprobado` → 422 |
| Revisor aprueba lo propio (`createdBy` = revisor, simulado por SQL) | 403 |
| Publicador publica `en_revision`, `draft` o `rechazado` | 422; pone `aprobado`/`rechazado` → 403 |
| Publicador/superadmin publica lo propio | superadmin → 403; otro publicador sí puede |
| `approvalHistory` enviado por el cliente (Local API, REST, GraphQL, y con `overrideAccess: true`) | ignorado: el historial solo contiene entradas del servidor con `revisor` = email de la sesión |
| Rechazo sin comentario (`undefined`, `""`, `"   "`) | 422 en los tres canales; con `reviewComment` queda en el historial |
| `_status published ⇔ approvalStatus publicado` | tras publicar, fila principal y última versión `publicado/published` |
| Editar `aprobado` | `draft/draft` |
| Editar `publicado` (autor, editor, web-admin) | última versión `draft/draft`; **la fila principal queda intacta** (`publicado/published`, título viejo) y el anónimo sigue viendo el título publicado |
| Autor pide solo `_status: draft` sobre publicado | 403; publicador sí despublica (fila principal `draft/draft`, contenido igual, el anónimo deja de verlo) |
| Superadmin edita publicado sin `draft` | 422 (D8 de la spec) |
| `web-admin` | crea/edita páginas como autor (no publica: 403); ya no edita noticias (403) |
| Lectura | anónimo/viewer/auditor/media: solo publicados, sin `createdBy`, sin versiones (403); corr1 y corr2: solo publicados + lo propio; editor/revisor/publicador/web-admin/superadmin: todo |
| H1/H2 | `update` del corresponsal con `where createdBy` sobre la última versión funciona (propio sí, ajeno 403/404); `findVersions`/`GET /noticias/versions` aceptan el `Where` `version.createdBy` y devuelven solo versiones propias (corr1 54, corr2 0 por REST) |
| H3 | `beforeOperation` forzó borrador en `PATCH` sin `?draft`, con `?draft=true` y con `?draft=false` explícito; con `?draft=true` + `_status: published` el editor recibe 403 (no se cuela una publicación); un solo `latest=true` por documento |
| H4 | `reviewComment` llega al hook por Local API, REST y GraphQL; no hay columna `review_comment` ni el campo aparece en el documento leído |
| H5 | Revisor reenvía el documento completo (id de fila de `tags`, richText) con título y tags manipulados: pasa a `aprobado` y `tags` (con sus ids) y richText quedan idénticos. Páginas: igual con `layout` de dos bloques (richText y CTA) más un bloque añadido: `layout` idéntico byte a byte al original |
| H8 | Reenviar el documento completo sin cambios sobre `aprobado` no lo degrada; cambiar un carácter del richText sí (`draft/draft`) |

### Punto 3 — Datos heredados (3 filas SQL sin `created_by_id`, sin versiones)

| Fila | Prueba | Resultado |
|---|---|---|
| A (`draft/en_revision`) | corresponsal con `draft:true` | no la ve; no la edita (403) |
| A | editor edita; revisor aprueba; publicador publica | los tres funcionan (parte de la fila principal al no haber versiones: confirma RDD-DEP-58 «cae a la fila principal»); nadie queda bloqueado por «lo propio» |
| A | aviso al aprobar | **ninguno** (sin autor, sin destinatario) |
| B (`published/publicado`) | corresponsal sin `draft` la ve; no la edita (403) | coincide con lo documentado |
| B | editor la edita | borrador nuevo `draft/draft`, fila principal publicada intacta |
| C (`draft/aprobado`) | publicador la publica | funciona |

### Punto 4 — Auditoría y notificaciones

- Cada transición dejó una fila en `auditoria` con la acción documentada: `crear`, `revisar` (envío a revisión), `aprobar`, `rechazar`, `publicar`, `actualizar` (corregir, vuelve a Borrador, despublicar). 83 filas tras la fase Local API; todos los valores pertenecen al enum existente.
- Los 403 quedan con `resultado: error` (22 filas), con la acción intentada.
- Sin datos sensibles: búsqueda de `password|hash|salt|secret|token|jwt|apikey|authorization|cookie` en las 83 filas (58 KB): 0 coincidencias. `cambiosRelevantes` contiene solo claves del documento (`title, createdBy, updatedAt, approvalStatus, approvalHistory, _status, content, layout`); IP `unknown` (las pruebas no traen cabeceras).
- Notificaciones (con `sendEmail` simulado): aprobada, rechazada (con el texto del comentario) y publicada van a `corr1@example.invalid`, el autor, nunca al revisor ni al publicador; un documento cuyo autor es el superadmin avisa al superadmin; el envío a revisión avisa a `web-admin`, `publisher` y `reviewer` (conducta previa de `getEditorialEmails`; no incluye al superadmin); una heredada sin autor aprobada no envía nada.

### Punto 5 — Lectura pública (H1/H2 de DEP-02) y GraphQL

- REST anónimo, viewer y auditor: `GET /noticias?draft=true` solo devuelve publicados; `GET /noticias/:borrador?draft=true` → 404; `GET /noticias/versions` y `/versions/:id` → 403; ningún documento trae `createdBy` (tampoco con `depth=1`); `where[createdBy][equals]=…` → 400 «The following path cannot be queried: createdBy».
- Local API anónimo/viewer/auditor con `draft:true`: solo publicados, `findVersions` denegado.
- GraphQL (esquema de la copia corregida, ver D2): anónimo/viewer/auditor ven solo publicados con `createdBy` nulo; `versionsNoticias` → 403; `Noticia(id: borrador, draft: true)` → 404; el editor sí recibe `createdBy`. `reviewComment` aparece como entrada opcional (`String` nullable) en `mutationNoticiaUpdateInput`. `createdBy` existe en el esquema (type e input): el control es el access de campo, no el esquema. Mutaciones: corresponsal `publicado` y `_status: published` → 403; rechazo sin comentario → 422; con comentario queda en el historial; `approvalHistory` del cliente no altera el historial; publicador sobre rechazado → 422; viewer no actualiza.
- El portal solo usa `draft=true` con token (`lib/cms/queries/news.ts:160`, `pages.ts:41-48`), así que D5 no afecta a la lectura pública.

## Defectos y observaciones

| ID | Severidad | Hallazgo | Evidencia | Arreglo sugerido (no aplicado) |
|---|---|---|---|---|
| D1 | BAJA (nueva, relacionada con DEP-03/H7) | `sort=createdBy` y `sort=-createdBy` se aceptan para anónimo, viewer y auditor (200) aunque `where[createdBy]` se rechaza con 400. El orden resultante (`10,8,1,5,13,12,11` frente a `1,5,8,10,11,12,13` por id) agrupa los documentos publicados por autor sin revelar ids: un canal lateral sobre autoría. No filtra ni `createdBy` ni identidades. | REST `GET /noticias?sort=createdBy`, notas RR6/RR6b | En `beforeOperation` de `find` (o `beforeRead`) descartar `createdBy`/`-createdBy` de `args.sort` para usuarios fuera de `EDITORIAL_READ_ROLES`+`correspondent`; añadir prueba negativa. |
| D2 | MEDIA (pre-existente, ajena a DEP-03; bloquea validar H7 en la config real) | `configToSchema` falla con la config del repo: `Schema must contain uniquely named types but contains multiple types named "Faq"` (el bloque `slug: 'faq'` de `blocks/FAQ.ts` choca con la colección `faqs`). La ruta `/api/graphql` llama a esa misma función, así que GraphQL no responde en el CMS actual (cierra la superficie por accidente, pero también rompe cualquier consumidor). Archivos sin modificar en git. | Llamada directa a `configToSchema(payload.config)`; con `graphQL: { singularName: 'FaqBlockSynth' }` en el bloque (solo en la copia del scratchpad) el esquema se construye y pasan las 23 pruebas GraphQL | Dar `graphQL.singularName` distinto al bloque `faq` (o a la colección), o desactivar GraphQL (`graphQL: { disable: true }`) si no se usa; en ambos casos, prueba que construya el esquema. No se probó la ruta Next real (la importación cuelga bajo `tsx`). |
| D3 | INFORMATIVA/BAJA | Con `depth` por defecto, `POST/GET` devuelve `createdBy` poblado con el documento de usuario completo (incluye `sessions`, email, teléfono) cuando quien lee es el propio autor corresponsal. Es su propio registro. Editor y revisor reciben solo el id (no pueden leer `users`). | Nota RC2b / RR10 / RR11 | Opcional: `maxDepth: 0` en el campo `createdBy` para devolver siempre el id. |
| D4 | INFORMATIVA (comportamiento de Payload; NO CONCLUYENTE sobre los datos reales) | Las filas de `noticias` **sin ninguna versión** no aparecen en consultas con `draft:true` ni siquiera para el editor (con `draft:false` sí). Sí se pueden actualizar (originalDoc cae a la fila principal) y tras la primera edición ya tienen versión. Si las 271 noticias importadas carecen de versiones, no aparecerían en un listado que consulte con `draft`. | Nota G1c / GL1 | Contar en una copia: `select count(*) from noticias n where not exists (select 1 from _noticias_v v where v.parent_id = n.id)`; si no es 0, crear una versión inicial por documento en un paso de datos revisado. |
| D5 | INFORMATIVA | Un anónimo con `?draft=true` no ve un documento publicado que tiene un borrador más reciente (la consulta de versiones exige `_status = published` en la última versión). No filtra nada; sin `draft` el anónimo sigue viendo lo publicado. | Nota E2d | Ninguno; documentarlo. |
| D6 | INFORMATIVA | Arrancar Payload fuera de producción contra una BD migrada escribe `('dev', -1)` en `payload_migrations` (D4 de DEP-07). | Observado en la BD de deriva | Ya cubierto por el precheck de `deploy.yml`. |

Sin defectos CRÍTICOS ni ALTOS en la lógica de DEP-03.

## Estado de las hipótesis (aplicado a la spec y a las fichas RDD)

| Hip. | Estado |
|---|---|
| H1 | CONFIRMADO |
| H2 | CONFIRMADO |
| H3 | CONFIRMADO |
| H4 | CONFIRMADO |
| H5 | CONFIRMADO con cuerpo de formulario completo; UI del admin NO CONCLUYENTE |
| H6 | CONFIRMADO |
| H7 | CONFIRMADO con matiz (D1, D2) |
| H8 | CONFIRMADO |

## Limpieza (verificada)

`docker rm -fv unc-dep03-synth-pg`, `docker network rm unc-dep03-synth-net`; se eliminó la unión (`rmdir` de la junction `node_modules` del scratchpad, sin tocar el destino: el `node_modules` del repo sigue intacto) y se borraron del scratchpad `env.sh`, la contraseña, las copias de `src/`, los resultados JSON, las salidas y los volcados de esquema. Quedan en el scratchpad solo los scripts sin secretos ni datos.

```
docker ps -a      : unc-mailpit-local, unc-minio-local, unc-postgres-local, welcome-to-docker   (idéntico al inicio)
docker network ls : bridge, host, none, unc-local_default                                       (idéntico)
docker volume ls  : unc_mailpit_data, unc_minio_data, unc_postgres_data                         (idéntico)
docker images     : postgres:16-alpine, axllent/mailpit, quay.io/minio/minio, docker/welcome-to-docker (idéntico)
recursos con prefijo unc-dep03-synth (contenedores, redes, volúmenes, imágenes): 0
```

No se creó ningún archivo en el repo salvo este documento y las ediciones de estado indicadas abajo. Durante la sesión se escribieron por error `reset.sh` y `run1.out` en la raíz del repo (comando lanzado desde ese directorio); se detectaron y se retiraron de inmediato (`git status` ya no los muestra). `test_write.txt` (del 11-ago, ajeno) sigue sin tocar.

## Rollback

Borrar este archivo y revertir las ediciones de estado de H1–H8 en `docs/specs/security/DEP-03-flujo-editorial-servidor.md` (sección «Hipótesis a validar…», línea de estado del encabezado y «Cierre pendiente») y de la última columna de las fichas RDD-DEP-57 … RDD-DEP-66 en `docs/research/evidence-register.md`. No hubo otros cambios.
