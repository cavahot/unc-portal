# SEC-03-D0 — Enmienda: el Revisor aprueba y, con ello, publica

**Estado:** PROPUESTA de especificación (SDD + plan TDD). **No se cambió código, pruebas, configuración ni base de datos.** Enmienda a `docs/specs/security/SEC-03-matriz-editorial.md` (aprobada el 2026-10-22) y a `docs/specs/security/DEP-03-flujo-editorial-servidor.md`. Fecha: 2026-10-23. Aprobación de implementación: pendiente del Product Owner (ver §12).
**Relacionado:** `docs/specs/editorial/FLUJOGRAMA-EDITORIAL.md` (diagrama del flujo), `docs/manual/ROLES-Y-PERMISOS.md` (texto para usuarios, a actualizar tras implementar), `scripts/lib/wpPublishFlow.mjs` (importador).

## 1. Registro de decisión

| Campo | Contenido |
|---|---|
| Decisión D0 | Product Owner, 2026-10-23: «el revisor da el check y solo ahí se publica en el portal». Alternativa más rápida elegida frente a la matriz de 3 personas. |
| Sustituye | SEC-03 decisión 3 («¿El Publicador aprueba? No. Aprueba el Revisor y publica el Publicador, personas distintas») **solo en lo relativo a quién ejecuta el paso de publicar una noticia o página en revisión**. |
| No cambia | Nadie aprueba ni publica lo propio (`notOwn`); rechazar exige comentario y devuelve a Borrador; crean Editor y Corresponsal (el Corresponsal solo lo suyo); toda transición queda en auditoría; el historial lo escribe solo el servidor; lo nuevo nace en Borrador; el Auditor no lee borradores. |
| Alcance | `noticias` y `paginas` (comparten el mismo hook, `Paginas.ts:116`). |
| Fuera de alcance | Publicación de emergencia del Superadministrador (DEP-03c), filtro por unidad del Corresponsal, borrar contenido. |

## 2. Reglas vigentes (hechos observados)

Matriz de transiciones, `apps/cms/src/hooks/editorial/transitions.ts:42-51`:

| Línea | Desde → Hacia | Quién | Marcas |
|---|---|---|---|
| 43 | `draft` → `en_revision` | author | historial `sent_to_review`, auditoría `revisar` |
| 44 | `en_revision` → `aprobado` | reviewer | `notOwn`, `restoreContent`, historial `approved`, auditoría `aprobar` |
| 45 | `en_revision` → `rechazado` | reviewer | `notOwn`, `requiresComment`, `restoreContent`, historial `rejected`, auditoría `rechazar` |
| 46 | `rechazado` → `draft` | author | auditoría `actualizar` |
| 47 | `aprobado` → `publicado` | publisher | `notOwn`, `restoreContent`, auditoría `publicar` (sin historial) |
| 48 | `aprobado` → `draft` | author | edición implícita |
| 49 | `publicado` → `draft` | publisher | despublicar, `restoreContent` |
| 50 | `publicado` → `draft` | author | solo si cambió el contenido (`authorNeedsContentChange`) |

Piezas relacionadas:

- Autoridades por rol: autor = `superadmin`, `editor`, `correspondent` (+ `web-admin` solo en `paginas`) (`access/roles.ts:138-141`); revisor = `reviewer` (`roles.ts:144`); publicador = `superadmin`, `publisher` (`roles.ts:150`); `actorsOf` los combina (`transitions.ts:170-176`). Por eso el Superadministrador es autor **y** publicador, **no** revisor.
- `notOwn` se aplica en `applyRule` (`transitions.ts:347-349`). Solo bloquea si `createdBy` no es nulo y coincide con el actor (`transitions.ts:263-264`); las noticias heredadas sin autor no quedan bloqueadas (`DEP-03 §Autor nulo`).
- Elección de regla: `findRule` (`transitions.ts:307-317`). Si existen reglas hacia el destino pero el rol no ejerce ninguna, responde 403 (`transitions.ts:301-302`); si no existe ninguna regla `from→to` y el rol tiene autoridad sobre el destino, responde 422 (`transitions.ts:289-298`).
- `forceDraftSaveUnlessPublisher` (`enforceTransition.ts:129-133`): todo usuario que no sea publicador guarda **siempre** con `draft: true`; Payload crea solo una versión y no toca la fila principal, que es la que lee el público (RDD-DEP-57, RDD-DEP-62).
- El hook `beforeChange` restaura el contenido cuando `restoreContent` (`enforceTransition.ts:82`) y escribe el historial desde la sesión (`enforceTransition.ts:91-96`).
- Efectos posteriores a cualquier guardado de `noticias`: revalidación de `noticias`, `noticias-slugs` y `noticias:<slug>` (`collections/Noticias.ts`, `afterChange`), auditoría (`afterTransition.ts:22`) y aviso al AUTOR en aprobado/rechazado/publicado (`afterTransition.ts:76-95`).
- `approvalHistory.accion` admite `sent_to_review`, `reviewed`, `approved`, `rejected` (`fields/approvalHistory.ts`); no existe un valor «publicado». El enum de Postgres de `approval_status` incluye `aprobado` (`migrations/20261017_021341_arch_db_02_baseline.ts:10,14,20,25`).

## 3. Opciones comparadas

| | a) Autoridad `publisher` al revisor y acción única encadenada | b) Regla directa `en_revision → publicado`, `aprobado` queda como estado heredado | c) Fusionar estados (eliminar `aprobado`) |
|---|---|---|---|
| Cambio en `TRANSITION_RULES` | Se mantienen `en_revision→aprobado` y `aprobado→publicado`; `reviewer` pasa a ser actor también de la segunda; el hook encadena dos pasos en una petición. | Se **agrega** una regla: `{ from: 'en_revision', to: 'publicado', actors: ['reviewer'], notOwn, restoreContent, history: 'approved', audit: 'publicar' }`. `aprobado→publicado` (publisher) y `aprobado→draft` se conservan para documentos que ya estén aprobados. | Se elimina `aprobado` del tipo, del enum de Postgres y de las reglas. |
| Cambio de esquema | No | No | **Sí**: `ALTER TYPE ... DROP VALUE` no existe en Postgres; hay que recrear 4 enums (`noticias`, `_noticias_v`, `paginas`, `_paginas_v`) y migrar filas. Migración irreversible en producción (DEP-07: solo hacia adelante). |
| Complejidad del validador | Alta: `evaluateTransition` hoy modela **un salto por petición** (`transitions.ts:288-303`); encadenar exige inventar un estado intermedio no persistido y un historial doble. | Baja: una fila más en la tabla; reutiliza `applyRule`, `notOwn`, `restoreContent`. | Media-alta: toca tipos, enum, tableros, métricas y pruebas. |
| Superficie de tableros | Sin cambio | Sin cambio; el conteo `aprobado` pasa a ser residual (`PortalDashboard.tsx:69`, `dashboard/stats/route.ts:34`, `metrics/route.ts:37`, `dashboard/page.tsx:127`) | Hay que quitar el estado de 4 vistas/rutas y de `notifications.ts:226` |
| Separación de funciones | Igual que b | Autor ≠ quien aprueba-y-publica; sin estado intermedio de dos personas | Igual |
| Rollback | Medio (código) | **Bajo**: borrar una fila y el cambio de `beforeOperation`; sin datos ni esquema | Alto (migración de datos) |

### Recomendación: opción b, con actor `['reviewer']` únicamente

Razones de seguridad y de ingeniería:

1. **Separación de funciones preservada.** La decisión de publicar la toma una persona distinta del autor (`notOwn`), igual que antes se exigían dos terceros. Se pierde la segunda verificación independiente; es la contrapartida aceptada por el PO (§11, riesgo R1).
2. **Un salto por petición.** La regla b mantiene el modelo «una transición = una petición» que el validador ya prueba; la opción a lo rompe.
3. **Sin migración.** `aprobado` sigue existiendo en la base de datos y en las versiones históricas (`_noticias_v`); c obligaría a reescribir datos sin necesidad.
4. **El Publicador no se convierte en aprobador.** La nueva regla NO incluye `publisher`: SEC-03 decisión 3 (el Publicador no aprueba) sigue vigente salvo para el Revisor. El Publicador conserva `aprobado→publicado` (vaciar lo que haya quedado aprobado) y despublicar. *Alternativa que el PO puede elegir:* añadir `publisher` a `actors` de la nueva regla; haría que el Publicador también apruebe-publique lo que está en revisión, sin ser revisor (se desaconseja: contradice la decisión 3 y la prueba 3b; ver §10).
5. **Rollback trivial** (§9).

Qué pasa con el **Superadministrador** (es autor y publicador, pero no revisor, `roles.ts:140-150`, prueba 1c):

- Si **redacta** un contenido, no puede aprobarlo ni publicarlo: lo debe publicar un `reviewer` distinto (no es un autor-revisor, y `notOwn` bloquea de todos modos). El contenido no se «cuela» por su doble función.
- Si **no** redactó el contenido y está `en_revision`, tampoco puede publicarlo: la regla nueva es solo de `reviewer`. Sigue pudiendo publicar lo que esté en `aprobado` (heredado) y despublicar.
- Consecuencia práctica: el Superadministrador **no tiene hoy un atajo de emergencia** para publicar contenido en revisión. Eso es DEP-03c (motivo obligatorio y auditoría reforzada), pendiente. Hasta entonces, una unidad con un solo usuario revisor y sin segundo Revisor no podrá publicar lo que redactó ese revisor (no puede redactar: el Revisor no es autor, `roles.ts:140`).

## 4. Cambio propuesto (especificación, no implementado)

1. **`TRANSITION_RULES`** (`transitions.ts`): añadir

   `{ from: 'en_revision', to: 'publicado', actors: ['reviewer'], notOwn: true, restoreContent: true, history: 'approved', audit: 'publicar', message: 'aprobada y publicada' }`

   Mantener las líneas 44, 45, 47 (ver nota de legado), 48, 49, 50.
2. **`forceDraftSaveUnlessPublisher`** (`enforceTransition.ts:129-133`): hoy el Revisor siempre guarda con `draft: true`, así que su acción **no escribiría la fila principal** y la noticia no se vería en el portal aunque el validador la aprobara. Cambio mínimo: no forzar `draft` cuando el rol sea `reviewer` **y** el cuerpo pida `_status: 'published'`. En cualquier otro caso (incluido rechazar) sigue forzado a borrador. El validador `beforeChange` decide si ese `published` es legítimo (estado origen `en_revision`, no propio). Hipótesis H-OP1: `args.data` está disponible en `beforeOperation` de `update` (en `updateByID.js` se lee `const { data } = args` después de `buildBeforeOperation`, líneas 25-36 de `node_modules/payload/dist/collections/operations/updateByID.js`); falta ejercitarlo en 3.87.1.
3. **Historial:** la regla reutiliza `approved` (el enum no se amplía). La publicación se distingue en `auditoria` con la acción `publicar` y el mensaje «aprobada y publicada». Ampliar el enum para registrar «publicado» exigiría migración y queda fuera.
4. **Estado heredado `aprobado`:** no se elimina. Un documento que ya esté `aprobado` se publica con la regla de la línea 47 (Publicador), sin cambio.
5. **`describeChange`** (`transitions.ts:373-389`): busca la primera regla `from→to`; con la regla nueva devuelve `publicar`/«aprobada y publicada» sin más cambios.
6. **Notificación:** `to === 'publicado'` ya avisa al autor (`afterTransition.ts:83-86`); no cambia.
7. **Documentación de usuario:** actualizar `docs/manual/ROLES-Y-PERMISOS.md` y la pista de `docs/specs/security/SEC-03-matriz-editorial.md` con un puntero a esta enmienda (a hacer junto con la implementación, no ahora).

## 5. Escenarios Given/When/Then (negativos primero)

Todas las pruebas se corren para `noticias` y `paginas`.

**Negativos**

1. Dado un `reviewer` que **es** el autor del documento (`createdBy` = su id; hoy imposible porque el revisor no crea, pero posible con datos manipulados), cuando pide `_status: published` en `en_revision`, entonces 403 y se registra «Intento denegado (403)» en auditoría (`enforceTransition.ts:67`).
2. Dado un `editor`/`correspondent`, cuando pide publicar un documento `en_revision` (o `draft`), entonces 403 y nada cambia.
3. Dado un `publisher`, cuando pide publicar un documento `en_revision`, entonces **403** (antes 422): tiene reglas hacia `publicado` pero no desde ese origen y no es revisor.
4. Dado un `superadmin` (autor, publicador, no revisor), cuando pide publicar un documento `en_revision`, entonces 403, haya redactado él o no.
5. Dado un `reviewer`, cuando pide `_status: published` sobre un documento en `draft`, `rechazado` o `publicado`, entonces 422 (tiene autoridad sobre el destino, el origen no lo admite).
6. Dado un `reviewer`, cuando pide `approvalStatus: publicado` **sin** `_status: published`, entonces 422 («Para publicar use la acción Publicar»).
7. Dado un `reviewer` que publica y envía además `title` manipulado, entonces el contenido se restaura del original (`restoreContent`) y la versión publicada tiene el título original.
8. Dado un `reviewer`, cuando rechaza sin `reviewComment`, entonces 422; con comentario, pasa a `rechazado` y **no** toca la fila principal (sigue `draft: true`).
9. Dado un `reviewer` que rechaza una noticia ya publicada que fue editada (nuevo borrador `en_revision`), entonces la versión pública vigente no se retira (la escritura sigue siendo `draft: true`).
10. Dado cualquier rol, cuando envía `approvalHistory` en el cuerpo, entonces se descarta y se escribe el del servidor.
11. Dado un `reviewer` que pide `draft: false` con `_status: draft` sobre `en_revision`, entonces `beforeOperation` mantiene `draft: true` (sin esto despublicaría la fila principal; ver §11 R3).

**Positivos**

12. Dado un `editor` que envía a revisión y un `reviewer` distinto, cuando el revisor pide `_status: published`, entonces `approvalStatus = publicado`, `_status = published`, historial `['sent_to_review','approved']`, auditoría `publicar`, aviso al autor, y se revalidan `noticias`, `noticias-slugs` y `noticias:<slug>`.
13. Dado un documento heredado en `aprobado`, cuando un `publisher` distinto del autor pide publicar, entonces se publica (regla de la línea 47 intacta).
14. Dado un documento `publicado`, cuando un `publisher` despublica, entonces vuelve a `draft` (sin cambio).
15. Dado un `reviewer` y un documento heredado con `createdBy` nulo, cuando publica, entonces se permite (comportamiento ya documentado en `DEP-03 §Autor nulo`; riesgo R4).

## 6. Pruebas existentes que cambian (archivo → prueba)

Fuente: `tests/unit/cms-editorial-transitions.spec.ts` (618 líneas) salvo indicación.

| Prueba | Línea | Cambio |
|---|---|---|
| `2b. revisor no publica…` | 180-188 | Reescribir: el revisor sí publica desde `en_revision` (403 solo desde `aprobado`/otros). El caso `aprobado→publicado` por revisor sigue en 403. |
| `3. publicador no publica lo que no está aprobado (422)` | 190-198 | Para `en_revision` pasa de 422 a **403**; `draft` y `rechazado` siguen en 422. |
| `1c. web-admin y superadmin tampoco aprueban ni rechazan` | 154-163 | Se amplía: tampoco publican desde `en_revision` (403). |
| `8. flujo feliz` | 340-352 | Nuevo camino: `draft → en_revision (editor) → publicado (reviewer)`; historial `['sent_to_review','approved']`. Se conserva un segundo flujo feliz heredado vía `aprobado` con publisher. |
| `fuerza draft: true para %s` (`reviewer`) | 498-500 | El revisor se saca de la lista «siempre `draft`» y se prueba aparte: `draft` forzado salvo `_status: published`. |
| Tabla de auditoría | 580-587 | Añadir fila `['en_revision','publicado','reviewer','publicar']`. |
| `«aprobada»… notifican al AUTOR` | 598-607 | Añadir el caso `en_revision→publicado` por revisor. |
| `tests/unit/cms-editorial-createdby.spec.ts` | 195-250 | Revisar los casos de revisor/publicador con `notOwn` y añadir el equivalente para la regla nueva. |
| `tests/unit/wp-publish-flow.spec.ts` | 12, 38, 42-44, 63, 75 | Consumidor del importador; ver §8. Fuera de la edición de esta tarea. |
| `tests/unit/cms-monitoring-routes.spec.ts` | 320-322 | Sin cambio (el filtro `aprobado` sigue siendo válido). |

## 7. Tabla de evidencia (RDD)

Convención: **Observado** = leído en código o `node_modules` en esta sesión (sin ejecutar); **Hipótesis** = por refutar; **Decisión** = humana.

| ID | Afirmación | Evidencia | Estado |
|---|---|---|---|
| RDD-D0-01 | La publicación hoy exige `aprobado → publicado` por `publisher`, no propio. | `transitions.ts:47` | Observado |
| RDD-D0-02 | Aprobar es solo del revisor, no propio. | `transitions.ts:44`; `roles.ts:144` | Observado |
| RDD-D0-03 | El superadmin es autor y publicador, no revisor. | `roles.ts:138-150`; `tests/unit/cms-editorial-transitions.spec.ts:154-163` | Observado |
| RDD-D0-04 | `notOwn` solo bloquea con `createdBy` no nulo e igual al actor. | `transitions.ts:263-264,347-349` | Observado |
| RDD-D0-05 | Un rol sin regla utilizable hacia el destino recibe 403; sin ninguna regla `from→to` y con autoridad sobre el destino, 422. | `transitions.ts:289-302` | Observado |
| RDD-D0-06 | El revisor guarda siempre como borrador y no escribe la fila principal. | `enforceTransition.ts:129-133`; RDD-DEP-57/62 | Observado |
| RDD-D0-07 | La publicación visible requiere escritura de la fila principal con `_status: published`. | RDD-DEP-61; `transitions.ts:338,358` | Observado |
| RDD-D0-08 | `approvalHistory` no tiene valor «publicado» y el enum de estado incluye `aprobado`. | `fields/approvalHistory.ts`; `migrations/20261017_021341_arch_db_02_baseline.ts:10,14` | Observado |
| RDD-D0-09 | `Paginas` usa el mismo hook y `maxPerDoc: 10`. | `collections/Paginas.ts:91,116` | Observado |
| RDD-D0-10 | Los tableros leen el conteo `aprobado`. | `PortalDashboard.tsx:69`; `dashboard/stats/route.ts:34`; `metrics/route.ts:37` | Observado |
| RDD-D0-11 | `beforeOperation` puede leer `args.data` de `update`. | `payload/dist/collections/operations/updateByID.js:36` (`const { data } = args`, tras `buildBeforeOperation`) | Hipótesis H-OP1 (falta ejercitar en 3.87.1) |
| RDD-D0-12 | El botón Publicar del admin se muestra a un `reviewer` con `access.update`. | No verificado | Hipótesis H-UI1 (probar en staging con el panel en navegador) |
| RDD-D0-13 | El importador exige tres identidades distintas. | `scripts/lib/wpPublishFlow.mjs:44-52,86-93` | Observado |
| RDD-D0-14 | Decisión de reemplazar el paso aprobar→publicar por un único paso del revisor. | César, 2026-10-23, en chat | Decisión |

## 8. Impacto en Páginas y en el importador

- **`paginas`:** comparte hook, tabla y `maxPerDoc: 10`; el cambio aplica igual. Además de `superadmin`, `editor`, `correspondent`, `web-admin` redacta páginas (`roles.ts:138-141`); una página redactada por `web-admin` también la publica un `reviewer`. Aumenta el poder del Revisor sobre contenido institucional (no solo noticias): el PO debe confirmarlo (§12, pregunta 1).
- **Importador** (`scripts/lib/wpPublishFlow.mjs` y `scripts/migrate-wordpress.mjs`; archivos de otra tarea, **no modificados aquí**): pasa de 3 identidades (autor, revisor, publicador) a **2** (autor y revisor). `STEPS` (`wpPublishFlow.mjs:21-25`) quedaría `draft→en_revision` (autor) y `en_revision→publicado` (revisor); `checkIdentities` (`:86-93`) deja de pedir publicador y de exigir tres ids distintos; `remainingSteps` trata `aprobado` como estado de reanudación heredado (lo termina un publicador, o se omite). `CMS_PUBLISHER_*` pasa a opcional/obsoleto. Hasta que se implemente D0, el importador sigue siendo correcto con la regla vigente; no debe cambiarse antes que el servidor.

## 9. Plan TDD (pruebas en rojo primero)

Ejecutar solo `tests/unit` con req sintético; sin Docker ni red.

1. RED: `en_revision→publicado` por `reviewer` ajeno devuelve `approvalStatus: publicado` / `_status: published` (hoy 422).
2. RED: ídem con autor = revisor devuelve 403.
3. RED: `publisher`, `superadmin`, `editor`, `correspondent` y `web-admin` piden publicar `en_revision` → 403.
4. RED: `reviewer` pide publicar desde `draft`, `rechazado`, `publicado` → 422.
5. RED: `forceDraftSaveUnlessPublisher` no fuerza `draft` para `reviewer` con `_status: published`, sí en cualquier otro caso (incluye rechazo).
6. RED: contenido manipulado por el revisor se restaura.
7. RED: historial `['sent_to_review','approved']` y auditoría `publicar`.
8. GREEN: aplicar la fila nueva y el cambio de `beforeOperation`.
9. Regresión: invariante de la prueba 10 (`_status published ⇔ approvalStatus publicado`) y todas las pruebas de §6 actualizadas.
10. Fuera de unidad (staging autorizado, con cuentas sintéticas): ejercer en el panel real que el botón Publicar aparece al revisor y que el portal muestra la noticia (H-OP1, H-UI1).

## 10. Rollback

Quitar la fila nueva de `TRANSITION_RULES` y la excepción del revisor en `forceDraftSaveUnlessPublisher`. No hay migración ni datos que revertir. Las noticias ya publicadas por revisores quedan como `publicado` (estado válido) y se pueden despublicar con la regla vigente. Si se hubiera añadido `publisher` a la regla (variante desaconsejada), quitarlo con el mismo cambio.

## 11. Riesgos

| ID | Riesgo | Mitigación |
|---|---|---|
| R1 | Una sola persona distinta del autor decide qué se publica: sin segundo control; un revisor comprometido o con error publica de inmediato. | Auditoría `publicar` con usuario, IP e historial; despublicar inmediato (Publicador/Superadmin); pocas cuentas `reviewer`, con contraseña fuerte y sin compartir. Riesgo condicionado a la gestión de cuentas. |
| R2 | El Revisor gana capacidad de publicar páginas institucionales. | Pregunta 1 al PO; si se rechaza, acotar la regla a `noticias` (cambio de una condición). |
| R3 | Una petición del revisor con `draft: false` y `_status: draft` sobre un documento publicado despublicaría la fila principal. | `beforeOperation` mantiene `draft: true` salvo `_status: published`; prueba negativa 11. |
| R4 | `createdBy` nulo (271 noticias heredadas) anula `notOwn`: cualquier revisor publica. | Documentado en DEP-03; relleno de autoría es tarea aparte con decisión humana. |
| R5 | Tableros siguen mostrando una columna `aprobado` residual. | Es un conteo válido para heredados; ocultarla es opcional y posterior. |
| R6 | Confusión con el texto de `FLUJO_EDITORIAL.md`. | Puntero de reemplazo añadido en ese archivo; ver `FLUJOGRAMA-EDITORIAL.md`. |
| R7 | H-OP1/H-UI1 sin verificar: el revisor podría no ver el botón Publicar o `args.data` no existir. | Pruebas en staging (§9.10); la unidad de prueba no basta. |

## 12. Preguntas abiertas para el Product Owner

1. ¿El Revisor publica también `paginas` (contenido institucional) o solo `noticias`? (Recomendación: ambas por simplicidad y paridad; reducible a solo noticias.)
2. ¿El Publicador conserva solo despublicar y vaciar lo `aprobado`, o también debe poder publicar lo `en_revision` (variante desaconsejada en §3)?
3. ¿Se acepta que el Superadministrador no tenga atajo de emergencia hasta DEP-03c?

## 13. Inconsistencias detectadas (documentos vs. código)

- `docs/FLUJO_EDITORIAL.md` asigna publicar al Editor y al Publicador y deja al Editor aprobar con «Publicado» directo; el código no lo permite (`transitions.ts:47`; `editorialAuthorRoles`, `roles.ts:138`). Reemplazado para la publicación por `FLUJOGRAMA-EDITORIAL.md`.
- `FLUJO_EDITORIAL.md` nombra «Editor (correspondent)» y «Admin (web-admin) control total»; en el código son roles distintos y `web-admin` solo redacta `paginas`.
- `FLUJO_EDITORIAL.md` muestra la acción `reviewed` en el historial; el servidor nunca la escribe (solo `sent_to_review`, `approved`, `rejected`).
- `SEC-03-matriz-editorial.md` lista como «por confirmar» que `FLUJO_EDITORIAL.md` está desactualizado; sigue sin reescribirse el cuerpo (solo se añade el puntero).
