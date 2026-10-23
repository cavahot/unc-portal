# DEP-03 — Flujo editorial impuesto en el servidor (noticias y páginas)

**Estado:** IMPLEMENTADO EN LOCAL (F1-F4 cerradas, ver «Progreso»), validado empíricamente con Payload y Postgres sintético el 2026-10-22 (H1-H8 en «Hipótesis»; evidencia en `docs/evidence/dep-03-validation.md`); pendiente de revisión humana, de la prueba en staging con el admin en navegador y de los defectos D1/D2 de esa evidencia. No hay commit. **Backlog:** DEP-03 = SEC-04 (hallazgo C3 de `docs/security/AUDIT-DEPLOY-2026-10-19.md`). **Base de decisión:** `docs/specs/security/SEC-03-matriz-editorial.md` (matriz APROBADA el 2026-10-22). **Guía de usuario:** `docs/manual/ROLES-Y-PERMISOS.md`. **RDD:** `docs/research/evidence-register.md` (RDD-DEP-57 … RDD-DEP-66). **Formato:** SEC-005 / DEP-04. No autoriza pentest externo.

## Progreso (se actualiza al cerrar cada fase)

| Fase | Estado | Qué quedó hecho |
|---|---|---|
| SDD + RDD | hecho | Esta spec y las fichas RDD-DEP-57…66. |
| F1 — RED | hecho | `tests/unit/cms-editorial-transitions.spec.ts` (hooks y access reales de Noticias/Paginas, req sintético), `cms-editorial-createdby.spec.ts` (F3) y `dep03-created-by-migration.spec.ts` (F3); `cms-drafts-read-access.spec.ts` actualizado (correspondent sin lectura completa; auditor/viewer sin borradores). Medido: 131 fallan / 59 pasan sobre 190, todos por la razón correcta (no existen `hooks.beforeChange`/`beforeOperation`, ni campo `createdBy`, ni migración, ni access por operación, ni audit/notify por transición). 516 tests previos intactos. |
| F2 — GREEN sin esquema | hecho | `apps/cms/src/hooks/editorial/{transitions,enforceTransition,afterTransition}.ts` (tabla de transiciones pura, hook `beforeChange`, hook `beforeOperation`, auditoría y notificación al autor); `fields/approvalHistory.ts` (access `create/update=false` y campo virtual `reviewComment`); `access/roles.ts` (create/update/read/readVersions por la matriz; se eliminó `canWriteEditorial`); `Noticias.ts` y `Paginas.ts` cableados; tipos `reviewComment` en los dos `payload-types.ts`. Medido: 156/156 verdes en `cms-editorial-transitions` + `cms-drafts-read-access`; suite sin las specs de F3: 624/624; `tsc` del CMS 12 errores (los mismos de la línea base). **Estado intermedio hasta F3:** el `correspondent` solo lee publicados y no edita (fail-closed) porque aún no existe `createdBy`; las specs de F3 (`cms-editorial-createdby`, `dep03-created-by-migration`) siguen en rojo a propósito. |
| F3 — `createdBy` + migración | hecho | `fields/createdBy.ts` (relación nullable a `users`, solo lectura para clientes, lectura solo personal editorial); `access/roles.ts` (corresponsal: `read` = publicados o suyos, `update` = `createdBy` suyo, `readVersions` = `version.createdBy` suyo); hook: `createdBy` = sesión al crear, intocable después; validador: «no aprueba ni publica lo propio» y defensa del corresponsal; migración `20261022_134500_dep_03_created_by.ts` + snapshot `.json` (generado desde el baseline, `prevId` encadenado) + `index.ts` + README; tipos: `apps/cms/src/payload-types.ts` **regenerado con `npm run generate:types --workspace=@unc/cms`** (sin BD; solo con secretos efímeros en el entorno del proceso, no escritos) y `packages/cms-types/src/payload-types.ts` alineado a mano (ya estaba desfasado del de apps). Specs verdes: `cms-editorial-createdby`, `dep03-created-by-migration`. |
| F4 — verificación y documentación | hecho | Esta spec completa, fichas RDD-DEP-57…66, nota de estado en `docs/manual/ROLES-Y-PERMISOS.md`. Verificación final en «Pruebas y rollback». |

## Problema

Hoy cualquier rol que pasa `canWriteEditorial` puede, por REST/GraphQL/Local API, escribir `approvalStatus`, `_status` y `approvalHistory` directamente: saltar de `draft` a `publicado`, publicar sin revisión, o falsificar el historial. Los hooks `afterChange` de `Noticias`/`Paginas` solo registran lo ocurrido; no impiden nada. La matriz SEC-03 ya está aprobada, de modo que ahora se codifica.

## Contrato

1. **Una sola fuente de verdad en el servidor.** Un hook `beforeChange` compartido (`apps/cms/src/hooks/editorial/enforceTransition.ts`) decide, con la tabla de transiciones de abajo, si el cambio de `approvalStatus`/`_status` es válido para el rol y el estado actual. La UI y los demás hooks no sustituyen este control.
2. **Códigos de error.**
   - **403** (`APIError`, mensaje público): el actor no tiene autoridad para esa transición *o* intenta aprobar/publicar algo propio *o* un corresponsal toca algo ajeno.
   - **422**: el actor sí tendría autoridad sobre el estado destino, pero el estado actual no lo admite (p. ej. publicar algo en `en_revision`), la petición es incoherente (`_status` y `approvalStatus` contradictorios) o falta un dato obligatorio (comentario de rechazo).
   - Criterio: *quién eres* se evalúa antes que *en qué estado está el documento*; así un rol sin autoridad no obtiene información sobre el estado del documento.
3. **Invariante.** `_status = 'published'` ⇔ `approvalStatus = 'publicado'`. El hook calcula ambos valores finales; ninguna combinación incoherente llega a la base de datos.
4. **Creación.** Siempre nace en `draft`/`draft`. Pedir otro estado en la creación es 403 (aprobado, rechazado, publicado) o 422 (`en_revision`).
5. **`approvalHistory` es solo del servidor.** Field access `create`/`update` = `false` (Payload elimina el valor enviado: `beforeValidate/promise.js:217-228`) **y** el hook lo reconstruye siempre desde `originalDoc` más la entrada nueva, ignorando cualquier valor recibido (defensa en profundidad para Local API con `overrideAccess`). Cada entrada: `revisor = req.user.email`, `fecha = ahora`, `accion` según la transición, `comentario` solo en rechazo.
6. **Comentario de rechazo.** Campo `reviewComment` con `virtual: true` (sin columna: `@payloadcms/drizzle/dist/schema/traverseFields.js:35-37`, `transform/write/traverseFields.js:22-24`). Es obligatorio (no vacío, ≤ 2000 caracteres) al rechazar; el hook lo copia a la entrada del historial y no se persiste en otro lugar.
7. **El Revisor y el Publicador no cambian contenido.** En una transición de revisión o publicación el hook restaura todos los campos de contenido desde `originalDoc`; solo cambian los campos de estado.
8. **Nadie aprueba ni publica lo propio.** Si `createdBy` coincide con el actor, 403. Con `createdBy` nulo (las 271 noticias heredadas) no se infiere autor y nadie queda bloqueado por esta regla (ver «Autor nulo»).
9. **Editar vuelve a Borrador.** Ver «Comportamiento de Payload con drafts». Un autor que edita un documento `aprobado` o `publicado` produce un **borrador nuevo** (`approvalStatus = 'draft'`) sin retirar la versión pública vigente.
10. **Despublicar** solo Publicador y Superadministrador (fila `publicado → draft`).
11. **Auditoría.** Cada transición se registra con `logAudit` usando solo valores existentes del enum `accion`: `revisar` (envío a revisión), `aprobar`, `rechazar`, `publicar`, `actualizar` (despublicar, corregir, vuelve a Borrador). Los intentos denegados (403) se registran con `resultado: 'error'`.
12. **Notificaciones.** El destinatario de «aprobada», «rechazada» y «publicada» es el **autor** (`createdBy`), no el actor. Sin autor conocido no se envía nada a nadie.
13. **Alcance acotado de esta iteración.** La publicación de emergencia del Superadministrador **no** se implementa (**DEP-03c, pendiente**). El Superadministrador se comporta como Publicador para publicar lo aprobado y como autor para redactar; las reglas «nadie publica lo propio» y «no aprueba» le aplican igual. `canDeleteEditorial` no cambia (punto 1 de «por confirmar» de SEC-03).

## Tabla de transiciones (`approvalStatus`, noticias y páginas)

Autor = `correspondent`, `editor`, `superadmin` (+ `web-admin` solo en `paginas`). Revisor = `reviewer`. Publicador = `publisher`, `superadmin`. «Propio» = `createdBy` = actor.

| Desde | Hacia | Quién | Condiciones | Efecto en `_status` | Historial | Auditoría |
|---|---|---|---|---|---|---|
| (crear) | `draft` | Autor | siempre | `draft` | — | `crear` |
| `draft` | `en_revision` | Autor | — | `draft` | `sent_to_review` | `revisar` |
| `en_revision` | `aprobado` | Revisor | no propio | `draft` | `approved` | `aprobar` |
| `en_revision` | `rechazado` | Revisor | no propio; `reviewComment` obligatorio | `draft` | `rejected` + comentario | `rechazar` |
| `rechazado` | `draft` | Autor | — | `draft` | — | `actualizar` |
| `aprobado` | `publicado` | Publicador | no propio; el cliente envía `_status: 'published'` | `published` | — (el enum no tiene «publicado») | `publicar` |
| `aprobado` | `draft` | Autor | solo por editar contenido (implícita) | `draft` | — | `actualizar` («vuelve a Borrador») |
| `publicado` | `draft` | Publicador | despublicar | `draft` | — | `actualizar` («despublicada») |
| `publicado` | `draft` | Autor | solo por editar contenido (implícita; sin cambios de contenido es un intento de despublicar → 403) | `draft` | — | `actualizar` |
| cualquier otra | cualquier otra | — | — | — | — | 403 si el rol no tiene autoridad sobre el destino; 422 si la tiene pero el origen no lo admite |

Mismo estado → mismo estado: permitido (edición de contenido) para el Autor en `draft`, `en_revision` y `rechazado`; para Revisor y Publicador es una operación vacía (el contenido se restaura).

## Comportamiento de Payload con drafts y versiones (hechos leídos en `node_modules`, Payload 3.87.1)

| # | Hecho | Evidencia |
|---|---|---|
| P1 | `draft=true` y `_status ≠ 'published'` ⇒ `isSavingDraft`: Payload fija `data._status = 'draft'` **antes** de los hooks y **no actualiza la fila principal**; solo crea una versión. | `payload/dist/collections/operations/utilities/update.js:27-33,253-281` |
| P2 | Sin `draft` (o con `_status: 'published'`) escribe la fila principal y crea una versión. | `update.js:253-281` |
| P3 | `originalDoc` y `docWithLocales` salen de la **última versión** (`latest: true`), no de la fila principal; si no hay versiones, de la fila. | `payload/dist/versions/getLatestCollectionVersion.js:9-55`; `updateByID.js:75-85` |
| P4 | Los hooks `beforeChange` de colección corren **después** de `beforeValidate` de campos (que aplica el field access y rellena los campos ausentes con el valor de `originalDoc`) y **antes** de `beforeChange` de campos. | `update.js:90-136`; `beforeValidate/promise.js:217-235`; `getFallbackValue.js:3-17` |
| P5 | El field access `create`/`update` borra la clave enviada (`delete siblingData[name]`); no existe comprobación de field access en `beforeChange` de campos. | `beforeValidate/promise.js:217-228` |
| P6 | El access `update` con `where` se combina con la consulta de la última versión; las claves se prefijan con `version.`. | `updateByID.js:45-85`; `find.js:96-104` (`appendVersionToQueryKey`) |
| P7 | El admin: *Guardar borrador* = `?draft=true` + `_status: 'draft'`; *Publicar* = sin `draft` + `_status: 'published'` + formulario completo; *Despublicar* = `PATCH {_status:'draft'}` sin `draft`. | `@payloadcms/ui/dist/elements/SaveDraftButton/index.js:49-71`; `PublishButton/index.js:140-163`; `UnpublishButton/index.js:74-112` |
| P8 | `hooks.beforeOperation` puede devolver `args` modificados y la operación lee `draft` **después**. | `utilities/buildBeforeOperation.js:3-26`; `updateByID.js:36`; `update.js:40` |
| P9 | Los campos `virtual` no tienen columna ni se escriben en la base. | `@payloadcms/drizzle/dist/schema/traverseFields.js:35-37` |
| P10 | `APIError(msg, status)` es público (mensaje visible) salvo status 500. | `payload/dist/errors/APIError.js` (constructor) |

**Cómo se cumple «editar vuelve a Borrador» sin romper lo publicado.** (1) Un hook `beforeOperation` fuerza `draft: true` en toda actualización de quien **no** es Publicador/Superadministrador (P8): un autor o revisor nunca escribe la fila principal, solo crea versiones (P1), y por tanto lo que ve el público (fila principal con `_status = 'published'`) no cambia. (2) El hook `beforeChange` pone `approvalStatus = 'draft'` en esa versión nueva (la última versión pasa a ser `draft`; P3 hace que el siguiente cambio parta de ella). (3) Para que lo editado salga al público hay que repetir el camino hasta `aprobado` y que el Publicador publique (escritura de la fila principal, P2). (4) Un autor que envía `_status: 'published'` (o `approvalStatus: 'publicado'` sin `_status` publicado) recibe 403/422.

Efecto colateral conocido: mientras un documento no esté publicado, su fila principal conserva el contenido de la creación y la información vigente vive en versiones (esto ya ocurría con *Guardar borrador* del admin). Las consultas que lean `approvalStatus` de la fila principal sin `draft: true` (`/api/dashboard/*`, `PortalDashboard`, `/api/metrics`) pueden mostrar conteos desactualizados. Ver «Riesgos».

## Autor nulo (271 noticias heredadas)

`createdBy` es nullable y no se rellena (el relleno futuro es un script no ejecutado, ver F3). Consecuencias:
- Aprobar/publicar: el validador solo bloquea si `createdBy` **no es nulo y** coincide con el actor. Con autor nulo cualquier Revisor/Publicador puede actuar.
- Corresponsal: el access de lectura y de actualización filtra por `createdBy = actor`; con autor nulo el corresponsal **no** ve borradores ni edita (solo ve lo publicado). Fail-closed.
- Notificaciones «aprobada/rechazada/publicada»: sin destinatario (se omiten).
- No se infiere el autor desde el campo de texto libre `author`.

## Escenarios Given/When/Then (negativos primero)

Los marcados (S) están cubiertos en `tests/unit/cms-editorial-transitions.spec.ts`; (C) en `tests/unit/cms-editorial-createdby.spec.ts`.

1. (S) Dado un `correspondent`, cuando fija `approvalStatus = 'aprobado'`, `'publicado'` o `_status = 'published'`, entonces 403 y los datos no cambian.
2. (S) Dado un `editor`, cuando intenta publicar (`_status = 'published'` sobre un `aprobado`), entonces 403.
3. (S) Dado un `reviewer`, cuando modifica el contenido (título, cuerpo) mientras aprueba, entonces el contenido enviado se descarta (restauración desde `originalDoc`); si pide `publicado` o `en_revision`, 403.
4. (C) Dado un `reviewer`, cuando aprueba un documento cuyo `createdBy` es él mismo, entonces 403.
5. (S) Dado un `publisher`, cuando publica un documento en `en_revision`, `draft` o `rechazado`, entonces 422.
6. (S) Dado un `publisher`, cuando pone `approvalStatus = 'aprobado'` o `'rechazado'`, entonces 403.
7. (C) Dado un `publisher` o `superadmin`, cuando publica un documento propio, entonces 403.
8. (S) Dado cualquier rol, cuando envía `approvalHistory` en el cuerpo, entonces el hook lo reemplaza por el historial del documento más (como máximo) una entrada del servidor con `revisor = req.user.email`; el field access lo elimina antes (S verifica ambos).
9. (S) Dado un `reviewer`, cuando rechaza sin `reviewComment` (vacío o solo espacios), entonces 422; con comentario, queda registrado en el historial.
10. (S) Dado un autor, cuando crea con cualquier estado ≠ `draft`, entonces 403/422; sin estado, nace `draft`/`draft`.
11. (S) Dado un salto inválido (p. ej. `draft → aprobado` por el Revisor), entonces 422; (`draft → aprobado` por un autor), entonces 403.
12. (S) Dado un documento `aprobado`, cuando un autor edita su contenido, entonces `approvalStatus` pasa a `draft` y `_status` queda `draft`.
13. (S) Dado un documento `publicado`, cuando un autor lo edita, entonces el resultado es `draft`/`draft` y no se admite `_status: 'published'`; un autor que solo pide `_status: 'draft'` sin cambiar contenido (despublicar) recibe 403.
14. (S) Dado un documento `publicado`, cuando el Publicador despublica, entonces `draft`/`draft` y el contenido no cambia.
15. (S) Dado el hook `beforeOperation`, cuando actualiza quien no es Publicador/Superadmin, entonces `args.draft = true`; Publicador y Superadmin no se tocan; sin usuario (Local API del servidor) no se toca.
16. (S) Dado un `viewer`, `auditor`, `media-manager` o anónimo, cuando lee, entonces solo publicados (DEP-02); `auditor` no lee borradores ni versiones.
17. (C) Dado un `correspondent`, cuando lee o actualiza, entonces `where createdBy = su id` (más publicados en lectura); `readVersions` filtra por `version.createdBy`.
18. (C) Dado un `correspondent` que crea, entonces `createdBy` = su id aunque envíe otro; en actualización `createdBy` no cambia.
19. (S) Cada transición exitosa llama a `logAudit` con la acción de la tabla; un intento 403 llama a `logAudit` con `resultado: 'error'`.
20. (S) Aprobada/rechazada/publicada notifican al autor (resuelto por `createdBy`), no al actor; sin autor, nada.
21. (C) La migración nueva añade `created_by_id` nullable con FK `ON DELETE set null` e índice en las cuatro tablas, no contiene `DROP`, y su `down` no hace nada destructivo.

## Decisiones tomadas en esta iteración (no reabrir sin el Product Owner)

| # | Decisión |
|---|---|
| D1 | 403 por autoridad/propiedad; 422 por estado/coherencia/dato faltante (ver Contrato 2). |
| D2 | `paginas` sigue el flujo de `noticias`. `web-admin` conserva crear/editar **páginas** como autor (no publica, no aprueba) y pierde crear/editar **noticias** (la matriz lo restringe a contenido institucional). |
| D3 | `rechazado → en_revision` directo no existe: el autor pasa por `draft` (tabla de la matriz). |
| D4 | Editar contenido en `en_revision` no retira de revisión (la matriz no lo dice); queda como punto por confirmar. |
| D5 | El enum `accion` de `approvalHistory` no se amplía (exigiría migración de enum): la publicación queda en `auditoria` y en las versiones, no en el historial. |
| D6 | Los autores y revisores nunca escriben la fila principal (beforeOperation fuerza `draft: true`). |
| D8 | Un Superadministrador que edita contenido publicado sin guardar como borrador recibe 422 (no se descarta su edición en silencio ni queda publicada). |
| D7 | Una llamada sin `req.user` (Local API del servidor: semillas, scripts) se trata como código de confianza y no pasa por el validador; REST/GraphQL anónimos ya no llegan al hook porque el access los rechaza. |

## Hipótesis a validar con Payload y Postgres reales (no verificadas)

**Estado (2026-10-22):** validadas con Payload 3.87.1 real y Postgres 16 sintético y aislado (Local API, REST con `handleEndpoints`, GraphQL); 186 comprobaciones, 0 fallos. Evidencia: `docs/evidence/dep-03-validation.md`. Defectos nuevos (ninguno crítico): D1 `sort=createdBy` aceptado para no editoriales (baja), D2 el esquema GraphQL de la config real no construye por el tipo duplicado `Faq` (pre-existente, ajeno a DEP-03), más observaciones D3–D6 del documento de evidencia.

- H1 — **CONFIRMADO**: el `where` de `access.update` con `createdBy` se traduce a `version.createdBy` al buscar la última versión (P6) y no falla si el documento aún no tiene versiones (cae a la fila principal).
- H2 — **CONFIRMADO**: `readVersions` devuelve un `Where` con claves `version.createdBy` y Payload lo acepta (no solo booleanos); corr1 y corr2 solo ven versiones propias por Local API y REST.
- H3 — **CONFIRMADO**: `hooks.beforeOperation` fuerza `draft` por REST sin `?draft`, con `?draft=true` y con `?draft=false`, y la operación respeta el valor modificado (la fila principal publicada no cambia).
- H4 — **CONFIRMADO**: el campo `virtual: true` conserva el valor enviado hasta el hook `beforeChange` de colección (Local API, REST y GraphQL), sin error de validación y sin columna.
- H5 — **CONFIRMADO con cuerpo de formulario completo** (noticias con `tags` y richText; páginas con bloques): el Revisor produce `en_revision → aprobado` y el hook restaura el contenido sin romper arrays/bloques ni ids. **NO CONCLUYENTE para la interfaz del admin en un navegador** (no se ejercitó).
- H6 — **CONFIRMADO**: la migración aplica sobre el baseline; `payload migrate:create` en una copia responde «No schema changes detected» y el esquema migrado es idéntico al que Payload crea desde la config. Idempotente; `down` no-op.
- H7 — **CONFIRMADO con matiz**: `reviewComment` es entrada opcional y `createdBy` no se expone a roles no editoriales en REST ni GraphQL (campo ausente/nulo, `where[createdBy]` → 400). Matiz D1: `sort=createdBy` se acepta. Matiz D2: el GraphQL de la config real no construye (tipo `Faq` duplicado); H7 se validó con una copia con `graphQL.singularName` en el bloque FAQ.
- H8 — **CONFIRMADO**: reenviar el documento completo sin cambios no degrada (sin falso positivo) y cambiar un carácter del richText sí (sin falso negativo), en noticias y páginas con bloques.

## Riesgos y regresiones conocidas

- Los paneles que escribían `approvalStatus` desde el cliente (select del admin) siguen funcionando, pero ahora el servidor puede rechazar o normalizar el valor. La edición de `approvalStatus` en el admin deja de ser libre.
- `scripts/migrate-wordpress.mjs` crea noticias con `approvalStatus: 'publicado'` y `_status: 'published'` iniciando sesión por REST: con DEP-03 recibiría 403/422 (importación única ya realizada; los scripts `patch-*` solo actualizan imágenes y, con un autor, quedarían como borrador).
- Conteos de `/api/dashboard/*` y `PortalDashboard` pueden quedar desactualizados (fila principal sin versión más reciente).
- Editores y Revisores que usaban el botón *Publicar* ya no podrán (era el objetivo).
- Superadministrador único: no puede publicar lo que él mismo creó hasta que exista DEP-03c (emergencia) o un segundo usuario.

## Pendientes y fuera de alcance

- **DEP-03c:** publicación de emergencia del Superadministrador con motivo obligatorio y auditoría reforzada.
- Unidad/facultad del usuario para filtrar corresponsales (segunda fase de SEC-03).
- Script de relleno de `createdBy` (no se ejecuta aquí; ver F3).
- ~~Validación en Postgres real de la migración~~ hecha en Postgres sintético (2026-10-22); falta staging.
- Reescritura de `docs/FLUJO_EDITORIAL.md`.

## Relleno futuro de `createdBy` (NO ejecutado)

Las 271 noticias (y las páginas existentes) quedan con `created_by_id` nulo. Rellenar es una decisión humana (¿quién redactó cada una?) y requiere un mapa revisado `slug → email`. Propuesta de procedimiento, para staging primero y con backup verificado (DEP-01/DEP-07):

```sql
-- NO EJECUTAR sin autorización, backup verificado y mapa de autores aprobado.
BEGIN;
-- tmp_autores(slug text, email text) cargada desde el CSV revisado
UPDATE noticias n SET created_by_id = u.id
  FROM tmp_autores m JOIN users u ON u.email = m.email
 WHERE n.slug = m.slug AND n.created_by_id IS NULL;
UPDATE _noticias_v v SET version_created_by_id = n.created_by_id
  FROM noticias n
 WHERE v.parent_id = n.id AND v.version_created_by_id IS NULL AND n.created_by_id IS NOT NULL;
-- Verificar antes de confirmar: conteos por autor y filas que siguen nulas.
COMMIT;
```

Solo escribe donde la columna es nula (no pisa autorías reales), es transaccional y se revierte con el backup previo. Efecto esperado: el corresponsal recupera acceso a lo suyo y «lo propio» pasa a aplicarse a esos documentos.

## Pruebas y rollback

**Pruebas (todas sin Docker, Postgres ni red):** `tests/unit/cms-editorial-transitions.spec.ts` (hooks y access reales de Noticias y Páginas, `req` sintético, incluye barrido rol × origen × destino del invariante), `tests/unit/cms-editorial-createdby.spec.ts`, `tests/unit/dep03-created-by-migration.spec.ts` (migración y snapshot), `tests/unit/cms-drafts-read-access.spec.ts` (DEP-02 actualizado). Los invariantes de migraciones existentes (`payload-migrations-config.spec.ts`, `baseline-down-guard.spec.ts`, `tests/deploy/dep07-schema-path.red.test.mjs`) son genéricos y siguen verdes con la migración nueva sin modificarlos.

**Cierre pendiente:** hecho en local el 2026-10-22 (Local API, REST, GraphQL, migraciones y deriva en Postgres sintético; ver `docs/evidence/dep-03-validation.md`). D1 (`sort=createdBy`, hook `stripAuthorshipSort`) y D2 (GraphQL desactivado con `graphQL.disable`, el portal no lo consume) corregidos el 2026-10-23 con prueba unitaria; falta repetirlos contra Postgres. Queda: pruebas en staging con el admin en navegador (H5) y la revisión humana.

**Rollback por fase** (ningún dato ni esquema se toca hasta aplicar la migración):

| Fase | Revertir |
|---|---|
| F1 | Borrar `tests/unit/cms-editorial-transitions.spec.ts`, `cms-editorial-createdby.spec.ts`, `dep03-created-by-migration.spec.ts`; restaurar `tests/unit/cms-drafts-read-access.spec.ts` (`git checkout`). |
| F2 | Borrar `apps/cms/src/hooks/editorial/`; restaurar `access/roles.ts` (recuperar `canWriteEditorial`), `fields/approvalHistory.ts`, `collections/Noticias.ts`, `collections/Paginas.ts` y los dos `payload-types.ts`. |
| F3 | Borrar `fields/createdBy.ts` y la migración `20261022_134500_dep_03_created_by.{ts,json}`; quitar su entrada de `migrations/index.ts` y la línea del README; revertir los tipos. **Si la migración ya se aplicó en un entorno:** NO hay `down` (solo hacia adelante); la columna nullable es inofensiva y puede quedarse, o se restaura el `pg_dump` previo al deploy (DEP-07). |
| F4 | Borrar esta spec y las filas RDD-DEP-57…66; restaurar la nota de estado de `docs/manual/ROLES-Y-PERMISOS.md`. |
