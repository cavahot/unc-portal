# ARR-01 — Aranceles del Rectorado conectados al CMS

**Estado:** implementado en local (rama `security/rbac-foundation`), sin commit. **Ámbito:** página pública
`/[locale]/aranceles-rectorado`, colección Payload `aranceles-rectorado`, módulo puro `lib/cms/aranceles.ts`,
consulta `lib/cms/queries/aranceles.ts`, siembra `scripts/seed-aranceles-rectorado.mjs` +
`scripts/lib/arancelesSeedData.mjs`, migración `20261025_180000_arr_01_aranceles_rectorado` (encadenada tras
`20261024_230000_cnv_01_convenios_campos`; la de GLO-GN-01 `20261025_190000` encadena tras esta). **Fuera de alcance:**
historial de montos por resolución, pago en línea, aranceles de las facultades (cada facultad publica los suyos).

## 1. Problema (auditoría del estado al 25-10-26)

| # | Hecho observado | Evidencia |
|---|---|---|
| A1 | La colección existía con `read: () => true`: un anónimo leía también filas `activo=false` por REST/GraphQL (brecha SEC-10). | `apps/cms/src/collections/ArancelesRectorado.ts` (versión anterior, `access.read`) |
| A2 | `create/update` permitidos a `editor` y `publisher`; los montos son información financiera institucional. | mismo archivo, `access.create/update` |
| A3 | Sin validación: `monto` aceptaba negativos, decimales y cualquier tamaño; `concepto` sin tope; se podían duplicar conceptos en un grupo. | mismo archivo, `fields` |
| A4 | `afterChange` revalidaba la etiqueta, pero no había revalidación al borrar ni rastro de auditoría. | mismo archivo, `hooks` |
| A5 | La tabla `aranceles_rectorado` tenía 0 filas en la BD local. | consulta `select count(*)` (script local, 25-10-26) |
| A6 | `lib/cms/queries/aranceles.ts` devolvía 24 aranceles ESCRITOS EN EL CÓDIGO (`FALLBACK_ARANCELES`, con montos y conceptos parafraseados) cuando el CMS estaba vacío y cuando fallaba. Una lista de precios en el código es un dato institucional que nadie puede corregir desde el panel y que puede quedar desactualizado sin aviso. | `lib/cms/queries/aranceles.ts` (versión anterior) |
| A7 | La página usaba un tema oscuro (`#0c1c0c`) distinto al de las páginas rediseñadas (/marco-legal, /convenios), sin búsqueda, sin fecha de actualización y con `formatMonto` dependiente del ICU de Node (`toLocaleString('es-PY')`). | `app/[locale]/aranceles-rectorado/page.tsx` (versión anterior) |
| A8 | Solo existían mensajes `es`, `pt-BR` y `gn`; faltaba `en` y el espacio de nombres no estaba en `lib/i18n/server.ts`. | `messages/*/pages.aranceles-rectorado.json`, `lib/i18n/server.ts` |
| A9 | La siembra usaba los textos parafraseados y un correo por defecto (`admin@unc.edu.py`). | `scripts/seed-aranceles-rectorado.mjs` (versión anterior) |
| A10 | En el menú, «Aranceles Rectorado» cuelga de «Facultades» (igual que en el sitio publicado). | `lib/cms/queries/navigation.ts:45`, `components/navigation/MegaMenu.tsx:98` |

Fuente oficial: `https://www.unc.edu.py/aranceles-rectorado/` (consultada por el orquestador el 25-10-26): 24 filas
en 3 grupos (3 multas, 8 venta de bienes y servicios, 13 aranceles educativos). La página no indica fecha ni
resolución; los montos no llevan símbolo de moneda (se asumen guaraníes enteros, «.» = separador de miles).

## 2. Comportamiento

1. **Fuente única:** la página muestra solo filas `active=true` del CMS. Nunca montos escritos en el código.
   Estados: `ok` (tablas), `empty` (aviso «aún no hay aranceles publicados») y `unavailable` (aviso neutro; nunca
   un 500 ni datos inventados). Tras una carga correcta, la caché de datos de Next sigue sirviendo la última
   respuesta buena si el CMS cae después.
2. **Agrupación:** orden canónico `multas → venta → educativos`; dentro de cada grupo por `orden` ascendente y luego
   por `concepto` (`localeCompare('es')`). Grupos sin filas no se muestran. Filas con monto no entero, negativo,
   grupo desconocido o concepto vacío se descartan en el mapeo (defensa si el CMS devuelve algo inesperado).
3. **Formato del monto:** `Gs. 50.000`, con «.» de miles calculado sin depender de los datos ICU del motor
   (`formatGuaranies`). En la tabla el símbolo va en `<abbr title="guaraníes">` y el número en
   `<data value="50000">`: el lector de pantalla tiene el nombre de la moneda (también en el encabezado de la
   columna) y al copiar se obtiene exactamente lo que se ve.
4. **Tablas reales:** una `<table>` por grupo con `<caption>`, `<th scope="col">` y el concepto como
   `<th scope="row">`; montos alineados a la derecha con cifras tabulares. Decisión: con dos columnas la tabla
   cabe a 375 px, así que NO se convierte en tarjetas (las tarjetas de /convenios responden a 6 columnas).
5. **Búsqueda en el cliente:** el servidor renderiza todas las filas (funciona sin JS). Con JS filtra por concepto,
   grupo y monto (con o sin puntos), sin distinguir mayúsculas ni tildes; estado en `aria-live="polite"`; Escape y
   botón borran; `?q=` (≤100 caracteres) se refleja en la URL sin crear historial; sin resultados muestra aviso y
   «Ver todos».
6. **Índice:** los tres grupos con su número de conceptos y su rango de montos (dato real), como enlaces de salto;
   fijo en pantallas anchas y fila desplazable fija en móvil.
7. **Última actualización:** la fecha más reciente de `updatedAt` entre las filas publicadas (dato real, no texto
   fijo), en el idioma de la página (`gn` usa `es-PY`), zona `America/Asuncion`.
8. **Impresión:** sin buscador ni índice, todas las tablas, texto negro.
9. **i18n:** etiquetas de UI en `messages/{es,en,pt-BR,gn}/pages.aranceles-rectorado.json` con las mismas claves.
   Los conceptos son contenido del CMS y quedan en español.

## 3. Modelo de datos (colección `aranceles-rectorado`)

| Campo | Tipo | Regla |
|---|---|---|
| `concepto` | text, obligatorio | ≤ 200 caracteres; espacios recortados y colapsados al guardar; único por grupo (validación con mensaje en español + índice único `concepto_grupo_idx`). |
| `monto` | number, obligatorio | Entero, 0 ≤ monto ≤ 100.000.000 (Gs.). |
| `grupo` | select, obligatorio | `multas | venta | educativos`. Sin valor por defecto (un valor por defecto archivaba en silencio un arancel en un grupo equivocado). |
| `orden` | number | Entero ≥ 0; por defecto 99. Seed: posición en la tabla del sitio publicado. |
| `active` | checkbox | «Publicado». Por defecto `true`. Lectura anónima limitada a `true` (SEC-10). Antes se llamaba `activo`. |

Panel: grupo «Institucional»; columnas `concepto, grupo, monto, orden, active`; orden por `grupo` (orden del enum =
orden canónico) y `orden`; búsqueda por concepto; descripciones en español.
Acceso: `read: readActiveOrInstitutional`; `create/update/delete: canWriteInstitutional` (superadmin, web-admin).
Hooks: auditoría `makeAuditAfterChange/AfterDelete('aranceles-rectorado', 'Arancel del Rectorado')` y revalidación de
la etiqueta `aranceles-rectorado` al guardar y al borrar (la etiqueta ya está en `ALLOWED_TAGS`).

**Decisión `activo` → `active` (renombrar).** Se renombra en lugar de escribir un `readActive` paralelo: (a) la
tabla está vacía en local, el cambio no pierde datos y la migración es un `RENAME COLUMN` idempotente; (b) se
reutiliza `readActiveOrInstitutional`, ya probado y usado por marco-legal, convenios y tribunal; una segunda función
de acceso casi igual es un sitio más donde puede reaparecer la brecha SEC-10. Costo: actualizar tipo del portal,
consulta, siembra, `payload-types` y migración (hecho en este cambio).

**Decisión `nota` / `vigenciaDesde`: no se agregan.** La fuente no trae notas ni fechas por fila; serían campos
vacíos que el panel muestra sin uso. La fecha visible sale de `updatedAt`. Si el PO pide citar la resolución, se
agrega con una migración aditiva barata (§8).

**Migración** `20261025_*_arr_01_aranceles_rectorado` (escrita a mano, idempotente): renombra `activo` → `active`
solo si existe `activo` y no `active`; quita el DEFAULT de `grupo`; crea `aranceles_rectorado_active_idx` y el
índice único `concepto_grupo_idx`. `down` revierte el renombrado y los índices sin borrar filas. En dev el SQL se
aplicó a la BD local antes de cambiar la colección para que el push del CMS no tuviera que resolver un renombrado
de forma interactiva.

## 4. Escenarios (Given / When / Then)

1. **Anónimo solo ve publicados.** Given una fila `active=false`, When un anónimo hace `GET /api/aranceles-rectorado`,
   Then la fila no aparece (`where` de acceso `{active: {equals: true}}`).
2. **Editor y publisher no escriben.** Given un usuario `editor`, `publisher` o `reviewer`, When hace `POST`,
   `PATCH` o `DELETE`, Then 403. Anónimo: 403.
3. **Monto inválido.** Given `monto` = `-1` | `1500.5` | `100000001` | `NaN`, When se guarda, Then mensaje en español
   y no se guarda.
4. **Concepto duplicado.** Given «Constancias Varias» en `venta`, When se crea otra fila igual en `venta`, Then
   mensaje «ya existe» (y el índice único lo impide aunque se salte la validación). En otro grupo sí se permite.
5. **Concepto largo.** Given 201 caracteres, Then mensaje en español.
6. **CMS vacío.** Given 0 filas publicadas, When se abre la página, Then aviso `empty` y CERO montos en el HTML.
7. **CMS caído.** Given `fetch` falla o devuelve una forma inesperada, Then aviso `unavailable`, HTTP 200, sin montos.
8. **Agrupación.** Given filas desordenadas, Then multas → venta → educativos y por `orden`.
9. **Formato.** Given 2500000, Then «2.500.000» y «Gs. 2.500.000» en cualquier motor; 0 → «0».
10. **Búsqueda.** Given «didactica» Then encuentra «Didáctica»; Given «50000» o «50.000» Then filas de Gs. 50.000;
    Given «zzz» Then aviso sin resultados y «Ver todos».
11. **Cambio de monto.** Given un PATCH de `monto` desde el panel, When termina, Then el CMS audita, revalida
    `aranceles-rectorado` y la página muestra el nuevo valor.
12. **Retiro.** Given `active=false`, Then desaparece de la API anónima y de la página; al restaurar vuelve.
13. **Siembra idempotente.** Given CMS vacío, When se ejecuta dos veces, Then 24 creados y luego 0; una fila
    existente nunca se modifica (ediciones del PO).
14. **Siembra segura.** `--dry-run` sin red; destino no local rechazado salvo `--allow-remote` con https; sin
    `CMS_PASSWORD` fuerte falla antes de la red; sin correo por defecto.

## 5. Datos sembrados

24 filas, `active=true`, `orden` = número de la fila en el sitio publicado, conceptos con la redacción oficial.
Única corrección: «Didactica» → «Didáctica» (errata ortográfica inequívoca; regla del PO del 25-10-26). Conteos:
multas 3, venta 8, educativos 13.

## 6. RDD — afirmación → evidencia

| Afirmación | Evidencia | Cómo refutarla |
|---|---|---|
| 24 aranceles oficiales, montos y redacción | `https://www.unc.edu.py/aranceles-rectorado/` (25-10-26, orquestador) | Comparar `scripts/lib/arancelesSeedData.mjs` con la página publicada |
| El fallback estaba en el código | `git show HEAD:lib/cms/queries/aranceles.ts` | — |
| Lectura anónima de inactivos | `read: () => true` en la versión anterior | `tests/unit/aranceles-cms.spec.ts` «acceso» |
| Payload admite índice compuesto único y lo nombra `concepto_grupo_idx` | `node_modules/@payloadcms/drizzle/dist/schema/build.js` (bloque `compoundIndexes`) | Comparar con `pg_indexes` tras el push |
| El push de dev no pide confirmación tras aplicar el SQL | Diff vacío entre esquema y BD (consulta a `information_schema`) | Log del CMS al recargar la colección |
| Revalidación al borrar | `hooks.afterDelete` + prueba de hooks | Borrar una fila y observar la página |

## 7. Rollback

Revertir los archivos de este cambio y ejecutar el `down` de la migración (renombra `active` → `activo`, quita los
índices, repone el DEFAULT). Las filas sembradas pueden quedarse: el código anterior las lee igual (con `activo`).

## 8. Decisiones pendientes del PO

1. **Permisos (estrechamiento):** antes `editor` y `publisher` podían crear y editar aranceles; ahora solo
   superadmin y web-admin. Recomendado por tratarse de montos oficiales. Confirmar o pedir un rol específico.
2. **Fecha/resolución:** la fuente no cita la resolución que fija los montos. ¿Se agrega un campo para citarla?
3. **Ubicación en el menú:** cuelga de «Facultades» como en el sitio publicado; por contenido encaja mejor en
   «Institucional» o «Trámites». La miga de pan sigue el menú actual.
4. **Moneda:** el sitio no muestra símbolo; se asumió guaraníes.
