# TRANS-02 — Ítems de transparencia editables en el CMS

**Estado:** en implementación local (rama `security/rbac-foundation`), sin commit. Extiende
`TRANSPARENCIA-LEYES.md` (TRANS-01). **Ámbito:** colección `transparencia-items`, relación de `ley5189`/`ley5282`
con su ítem, migración con relleno de los 19 documentos existentes, seed de los 28 ítems oficiales, y el portal
(`/ley-5189`, `/ley-5282`, `/transparencia`) leyendo ítems desde el CMS. **Fuera de alcance:** cargar documentos
reales (los tiene la institución), traducción jurídica de los títulos.

## 1. Problema (hecho observado)

En TRANS-01 la categoría de cada documento era un `select` fijo en código (`transparenciaLey.ts`,
`lib/cms/transparenciaLeyes.ts`, `scripts/seed-transparencia-leyes.mjs`: tres copias de la misma lista). Para agregar,
renombrar u ordenar un ítem, o para preparar un ítem sin documento (p. ej. 2, 3 y 4 de la Ley 5282), había que cambiar
código y migrar el esquema. Regla del dueño: todo contenido vive en CMS + Postgres y el portal solo lo lee.

## 2. Comportamiento

### 2.1 Colección `transparencia-items` (grupo «Transparencia»)

Una fila por ítem de ley.

| Campo | Tipo | Regla |
|---|---|---|
| `ley` | select `5189`/`5282`, obligatorio, índice | Inmutable tras crear (cambiarla movería el ítem de ley) |
| `codigo` | texto, obligatorio | Slug estable `^[a-z0-9]+(-[a-z0-9]+)*$`, máx. 60. Inmutable tras crear: es el vínculo con la clave natural de los documentos y con las anclas `#cat-<codigo>` de la página |
| `titulo` | texto, obligatorio | Denominación oficial, en español en todos los idiomas |
| `descripcion` | texto, opcional | Nota breve (referencia legal, letra o artículo) |
| `orden` | número, def. 0 | Menor primero; desempate por `id` |
| `active` | checkbox, def. true | Desmarcar oculta el ítem **y sus documentos** del portal sin borrar nada |
| `naturalKey` | texto oculto, único | `ley|codigo` calculado por el servidor (pisa lo enviado) |

Acceso: lectura `readActiveOrInstitutional` (anónimo solo `active=true`), escritura `canWriteInstitutional`.
Hooks: auditoría y `revalidatePortalTag('transparencia-items')` más las etiquetas `ley5189`/`ley5282` de la ley
afectada (el cambio de un título o de `active` cambia las páginas de esa ley).

### 2.2 Documentos (`ley5189`, `ley5282`)

- Nuevo campo `item` (relación a `transparencia-items`, obligatorio, filtrado a la ley de la colección). Reemplaza al
  `select` fijo.
- `category` **se conserva** como texto oculto de solo lectura, derivado en servidor de `item.codigo` (hook
  `beforeValidate`). Por qué: mantiene intacta la semántica de `naturalKey = categoría|período|descripción`, el índice
  `category`, el cargador y cualquier consumidor externo. No se recalcula ninguna clave ni se pierde ningún dato.
- Un `item` de otra ley (p. ej. un ítem 5282 en `ley5189`) o inexistente -> 400.
- `category` ya no es un `select`: en BD pasa de enum a `varchar` nullable (los valores no cambian).

### 2.3 Borrado de un ítem (decisión)

**Se bloquea** si algún documento (de cualquiera de las dos colecciones) lo referencia: hook `beforeDelete` lanza 400
con el número de documentos. Alternativa descartada: `SET NULL` dejaría documentos huérfanos invisibles (sin ítem no
se agrupan). Para retirar un ítem se desmarca `active`. Respaldo en BD: `item_id` es NOT NULL (relación obligatoria),
así que un `DELETE` SQL directo también falla aunque la FK declare `ON DELETE set null` (valor por defecto de Payload).
Límite: un `DELETE` que elimine a la vez ítem y documentos sí procede (es una decisión explícita).

### 2.4 Portal

`getLeyDocuments(ley)` nunca lanza. Pide a la API (a) los ítems activos de la ley ordenados por `orden`, y (b) los
documentos activos (`depth=0`), y agrupa por id de ítem:

- `ok`: hay ≥1 documento visible; todos los ítems activos aparecen en orden, los vacíos con «Documentos aún no
  publicados».
- `empty`: hay ítems pero ningún documento (aviso «Todavía no se publicaron documentos») o no hay ítems (aviso y sin
  lista). Sin datos de demostración.
- `unavailable`: red caída, HTTP de error o forma inesperada en cualquiera de las dos consultas.

No existe lista de categorías en código del portal. Ítem inactivo -> no se muestra y sus documentos tampoco. Documento
cuyo ítem no está entre los activos -> descartado.

### 2.5 Seed `scripts/seed-transparencia-items.mjs`

Fuente de los 28 ítems oficiales (11 + 17; títulos exactamente los de TRANS-01), `orden` = posición × 10.
Dry-run por defecto (sin red); `--apply` con `CMS_EMAIL`/`CMS_PASSWORD` (SEC-08), solo CMS local salvo
`--allow-remote`. Idempotente: busca por `naturalKey` (`ley|codigo`); si existe lo **omite y nunca lo modifica**
(respeta renombres y reordenamientos del PO). No carga documentos.
El cargador de documentos (`seed-transparencia-leyes.mjs`) resuelve la columna `categoria` contra los ítems (slug o
título normalizado): en `--apply` contra los ítems reales del CMS (así reconoce ítems que el PO agregó), en dry-run
contra la lista oficial; envía `item` (id) en el POST.

## 3. Escenarios Given/When/Then

1. **Alta de ítem.** Given web-admin; When crea `{ley:5282, codigo:'item-18', titulo, orden}`; Then 201 y aparece
   en `/ley-5282` con «Documentos aún no publicados».
2. **Ítem sin documentos visible.** Given ítem 2 sin documentos; Then `/ley-5282` muestra su título y el mensaje neutro.
3. **Renombrar.** When el PO cambia `titulo`; Then la página muestra el nuevo título tras la revalidación.
4. **Reordenar.** When cambia `orden`; Then la página y el índice siguen `orden`.
5. **Desactivar ítem.** When `active=false`; Then desaparece de la API anónima y de la página, con sus documentos.
6. **Lectura anónima de inactivos.** Then `GET /api/transparencia-items` no devuelve inactivos; `GET /:id` 404. (Negativo)
7. **Escritura anónima o editor.** `POST/PATCH/DELETE` -> 401/403. (Negativo)
8. **Duplicado `ley|codigo`** (aun con otras mayúsculas) -> 400. Mismo `codigo` en otra ley -> 201.
9. **`codigo` inválido** (`Item 1`, `a_b`, `-x`, vacío, 61 caracteres) -> 400. (Negativo)
10. **Cambiar `codigo` o `ley` de un ítem existente** -> el valor no cambia (campo inmutable). (Negativo)
11. **`naturalKey` forjada** -> se recalcula.
12. **Documento con ítem de otra ley o inexistente** -> 400. (Negativo)
13. **Documento hereda `category`** del `item.codigo`; `naturalKey` igual a la de TRANS-01 para los mismos datos.
14. **Borrar ítem con documentos** -> 400, el ítem y los documentos siguen. Sin documentos -> se borra. (Negativo)
15. **Migración sobre datos existentes:** los 19 documentos quedan con `item_id` del ítem cuyo `codigo` = su `category`,
    sin cambiar `natural_key`; segunda ejecución = 0 filas cambiadas.
16. **Seed dos veces:** 1.ª = 28 creados, 2.ª = 0 creados / 28 omitidos; un título editado por el PO no se revierte.
17. **CSV:** `categoria` por slug o título resuelve contra los ítems; ítem desconocido o de otra ley -> error de fila.
18. **CMS caído** (cualquiera de las dos consultas) -> `unavailable`, página 200.
19. **Sin ítems en el CMS** -> `empty`, sin lista inventada.
20. **i18n:** las claves de los cuatro idiomas siguen idénticas.

## 4. Migración `20261026_200000_trans_02_items` (encadenada a `trans_01_leyes_natural_key`)

Escrita a mano, idempotente (`IF NOT EXISTS`, `duplicate_object`), aditiva salvo un cambio de tipo no destructivo:

1. `CREATE TABLE transparencia_items` + índices (`ley`, `naturalKey` único, `active`, `updated_at`, `created_at`) + enum
   `enum_transparencia_items_ley`.
2. `ley5189`/`ley5282`: `ADD COLUMN item_id integer` (pasa a `NOT NULL` tras el relleno del paso 4), FK a
   `transparencia_items` (`ON DELETE set null`), índice `*_item_idx`.
3. `category`: `ALTER COLUMN ... TYPE varchar USING category::text` y `DROP NOT NULL` (pasa de enum a texto derivado);
   no se pierde ni se reescribe ningún valor. Se conserva el índice `*_category_idx`. El tipo enum viejo se elimina
   solo si nada lo usa.
4. **Relleno (backfill):** inserta los 28 ítems oficiales **solo para las leyes/códigos que ya tengan documentos**
   (para no inventar contenido en una BD de producción vacía; el resto lo crea el seed) y enlaza cada documento por
   `category = codigo`. `UPDATE ... WHERE item_id IS NULL` => segunda ejecución no cambia nada.
5. `payload_locked_documents_rels.transparencia_items_id` (+ FK e índice).

`down`: se niega si existen ítems o documentos con `item_id` (datos del PO); si no, deshace en orden inverso. El deploy
nunca ejecuta `migrate:down`. Probada desde cero en una transacción con ROLLBACK (§7).

Decisión sobre el backfill mínimo: el seed es la vía normal de crear los 28 ítems; el backfill de la migración crea
únicamente los ítems imprescindibles para no dejar documentos sin ítem en una BD que ya los tiene.

## 5. Evidencia RDD

| ID | Afirmación | Fuente | Refutable con |
|---|---|---|---|
| RDD-TRANS-06 | Categorías duplicadas en tres archivos | `transparenciaLey.ts`/`Ley5189.ts`/`Ley5282.ts`, `lib/cms/transparenciaLeyes.ts`, `scripts/seed-transparencia-leyes.mjs` | Una sola fuente en el CMS |
| RDD-TRANS-07 | Local: 11 + 8 documentos en `ley5189`/`ley5282` | `SELECT category, count(*)` | Otra cifra |
| RDD-TRANS-08 | Payload usa `<campo>_id` + FK `<tabla>_<campo>_id_<destino>_id_fk` + índice `<tabla>_<campo>_idx` para relaciones simples | Snapshot `linea_tiempo.imagen_id` | Diferencia al arrancar el CMS con el esquema aplicado (dev push sin cambios) |
| RDD-TRANS-09 | Los títulos oficiales son los de TRANS-01 | `LEYES` previo | Cambio del PO |

## 6. Rollback

- Código: revertir. Datos: `pg_dump` antes de producción. Con la migración aplicada y datos cargados, `down` se niega a
  propósito; el rollback de datos es restaurar el dump. El deploy nunca ejecuta `migrate:down`.
- Si solo hay que ocultar un ítem: `active=false` desde el panel.

## 7. Decisiones pendientes del Product Owner

1. Títulos y orden definitivos de los ítems (hoy los de TRANS-01; el PO puede renombrarlos desde el panel).
2. Letras/artículos para `descripcion` (vacía hoy: no se inventa referencia legal).
3. Si un ítem retirado debe ocultar también sus documentos (hoy sí, decisión de este cambio).
4. Traducción jurídica de títulos (en español en los 4 idiomas).

## 8. Verificación (26-10-26, local)

**RED -> GREEN.** `tests/unit/transparencia-items-cms.spec.ts` falló antes de implementar (módulos inexistentes:
`collections/TransparenciaItems` y `scripts/seed-transparencia-items.mjs`); las pruebas de TRANS-01 (`-cms`, `-queries`,
`-loader`) se reescribieron al nuevo contrato (ítems desde el CMS). Tras implementar: las 4 specs de transparencia en verde.
Las cifras de la suite completa están en el informe de cierre (ver abajo).

**Migración** `20261026_200000_trans_02_items` sobre PostgreSQL local con 11 + 8 documentos: se ejecutó dos veces dentro de
una transacción con ROLLBACK (19 ítems de relleno, 19 documentos enlazados, `category = codigo` en los 19, claves naturales
intactas, segunda ejecución sin cambios); `down` probado en ROLLBACK (con tablas vacías). Luego se aplicó una vez con COMMIT.

**Seed:** `seed-transparencia-items.mjs --apply` -> 9 creados / 19 omitidos (los 19 ya los creó la migración); 2.ª ejecución
0 creados / 28 omitidos. BD: 11 ítems 5189 + 17 ítems 5282.

**En vivo** (`trans02-live.mjs`, superadmin QA, CMS :3002 y portal :3000): 34/34 comprobaciones: 28 ítems y 11 + 8
documentos al inicio y al final; cada documento apunta a su ítem; alta de ítem TEST visible y ordenado por `orden`;
códigos inválidos 400; duplicado 400; mismo código en otra ley 201; `naturalKey` forjada recalculada; `ley`/`codigo`
inmutables; POST anónimo 403 (ítem y documento); documento con ítem de otra ley o inexistente 400; documento TEST visible
bajo su ítem; borrar ítem con documentos 400; desactivar -> ítem y documentos ocultos, REST anónimo no lo lista y GET
`/:id` 404; renombrar y reactivar se refleja; borrado de las filas TEST.

**Visual:** `/ley-5282` (17 secciones, 9 con «Documentos aún no publicados») y `/ley-5189` (11 secciones, 11 documentos) sin
desborde horizontal a 375, 768 y 1440 px.

## 9. Incidencias del entorno

- Los servidores de desarrollo existentes (CMS :3002 y portal :3000) dejaron de responder tras aplicar la migración (el CMS
  llevaba corriendo desde el 23-10 con el esquema anterior). Se reinició el CMS con un `PAYLOAD_SECRET` aleatorio de sesión
  (el de `apps/cms/.env` mide 24 caracteres y el CMS lo rechaza desde SEC-08). Las sesiones anteriores del panel quedan
  invalidadas; hay que volver a iniciar sesión.
