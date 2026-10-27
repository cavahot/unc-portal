# TRANS-01 — Leyes 5189/2014 y 5282/2014 conectadas al CMS

**Actualización TRANS-02:** las categorías ya no son un `select` fijo: pasaron a la colección `transparencia-items` y
los documentos las referencian (`docs/specs/portal/TRANSPARENCIA-ITEMS.md`). Donde este documento habla de «categorías en
código» (§2.1, §4, §8.3) rige TRANSPARENCIA-ITEMS.md.

**Estado:** implementado en local (rama `security/rbac-foundation`), sin commit. **Ámbito:** páginas públicas
`/[locale]/ley-5189` (11 categorías) y `/[locale]/ley-5282` (17 ítems del Art. 8°), el hub `/[locale]/transparencia`,
las colecciones Payload `ley5189` y `ley5282`, el módulo `lib/cms/transparenciaLeyes.ts`, la consulta
`lib/cms/queries/ley5189.ts` / `ley5282.ts`, el cargador `scripts/seed-transparencia-leyes.mjs` y la plantilla
`docs/specs/portal/plantilla-transparencia-leyes.csv`. **Fuera de alcance:** conseguir los documentos reales (los
tiene la institución, §1.1), migrar PDF fuera de Google Drive, y borrar el global `transparencia` (§8).

## 1. Problema y auditoría del estado anterior

### 1.1 Sitio publicado (verificado 26-10-26, solo lectura)

`https://www.unc.edu.py/transparencia/ley-5189-2014/` y `/ley-5282-2014/` muestran únicamente el texto «Esta es sólo
una página de ejemplo» y una lista de artículos a–i, **sin ningún enlace a documento** (ni Drive ni PDF). Por lo
tanto NO existen datos reales que importar: el trabajo es dejar las colecciones listas para que la institución
cargue los documentos, sin inventar ninguno.

### 1.2 Portal antes de TRANS-01 (verificado en el código)

| # | Hallazgo (archivo) | Riesgo | Clase |
|---|---|---|---|
| H1 | `Ley5189.ts` / `Ley5282.ts`: `access.read: () => true` | SEC-10: un anónimo lee por REST las filas con `active=false` (retiradas) | Hecho observado |
| H2 | `driveUrl` sin `validate` | Se pueden guardar `javascript:`, `http:` o hosts ajenos con la marca UNC | Hecho observado |
| H3 | Sin hooks de auditoría ni de revalidación | Cambios sin rastro; el portal tarda en reflejar un alta o un retiro | Hecho observado |
| H4 | Sin clave natural | Cargar dos veces el mismo documento duplica filas (el seed anterior no deduplicaba) | Hecho observado |
| H5 | `scripts/seed-ley5189.mjs` y `seed-ley5282.mjs` insertan `https://drive.google.com/drive/folders/REEMPLAZAR` | Enlace de relleno publicado como si fuera institucional (regla «todo contenido CMS + BD», sin enlaces de relleno) | Hecho observado |
| H6 | Páginas: ante `catch` muestran todas las categorías «Sin documentos» + nota «Mostrando datos del sistema» | Una caída del CMS parece «no hay documentos»: se oculta el fallo (estado unavailable ≠ empty) | Hecho observado |
| H7 | Contraste de textos secundarios `#B0BDB7` sobre blanco (≈2:1) | Falla WCAG 1.4.3 | Hecho observado (cálculo) |
| H8 | `/transparencia` lee el global `transparencia` (arrays `ley5189`/`ley5282`), una segunda fuente paralela que nadie alimenta; su seed `apps/cms/scripts/seed/transparencia.ts` tiene `url: ''` y `TODO` | Dos lugares para lo mismo; la portada de transparencia siempre vacía | Hecho observado |
| H9 | Catálogos `messages/en` y `messages/pt-BR` no tienen `pages.ley-5189/5282` (caen a `es`) | Páginas en inglés/portugués con texto en español | Hecho observado |
| H10 | La BD local tiene 0 filas en `ley5189`, `ley5282` y `transparencia` | No hay datos que migrar | Hecho observado (consulta SQL) |

Hipótesis (no verificadas): que en producción existan filas con la URL `REEMPLAZAR` si alguien ejecutó los seeds
antiguos. Se debe contar antes del despliegue (§7, rollback) y borrar esas filas desde el panel.

## 2. Comportamiento

### 2.1 Colecciones

- Campos conservados (renombrar rompería datos): `category` (select), `period`, `description`, `driveUrl`, `order`,
  `active`. Se agrega `naturalKey` (oculto, único, calculado por el servidor).
- **Lectura pública solo de filas con `active=true`** (`readActiveOrInstitutional`, igual que `convenios`). Los
  roles institucionales (superadmin, web-admin) ven también las retiradas. Escritura: `canWriteInstitutional`.
- **`driveUrl`**: obligatorio, `https`, sin credenciales, host exacto en la allowlist `drive.google.com`,
  `docs.google.com`, `www.unc.edu.py`, `unc.edu.py` (la misma de `convenios`).
- **Clave natural** `naturalKey = categoría | período | descripción`, normalizada (minúsculas, sin acentos,
  espacios colapsados). Índice único: dos documentos solo pueden coincidir en categoría y período si su descripción
  difiere. La calcula un hook `beforeValidate` y pisa cualquier valor enviado por el cliente.
- Hooks `afterChange` / `afterDelete`: auditoría (`auditoria`) y `revalidatePortalTag('ley5189' | 'ley5282')`.
  El aviso no lanza: publicar no depende del portal.

### 2.2 Portal (estados)

`getLeyDocuments(ley)` nunca lanza y devuelve:

- `ok`: hay ≥1 documento publicado; se muestran las categorías en orden canónico; las vacías llevan el mensaje
  neutro «Documentos aún no publicados».
- `empty`: el CMS respondió sin filas; se muestran las categorías oficiales (la estructura legal) con un aviso
  claro «Todavía no se publicaron documentos»; **sin datos de demostración ni enlaces de relleno**.
- `unavailable`: red caída, HTTP de error o forma inesperada; panel neutro «No pudimos cargar la información»,
  sin lista de categorías (no se insinúa que no existan documentos). La página no devuelve 500.

Defensa en profundidad: el mapeador descarta filas con categoría fuera de la ley, período vacío o `driveUrl` fuera
de la allowlist, aunque el CMS las hubiera guardado (datos previos a la validación). Los `href` pasan por `safeHref`.

### 2.3 Cargador `scripts/seed-transparencia-leyes.mjs`

`node scripts/seed-transparencia-leyes.mjs --file docs/....csv|json [--dry-run | --apply] [--allow-remote]`.
Columnas: `ley,categoria,periodo,descripcion,url,orden`. `ley` = `5189` o `5282`; `categoria` = el slug (p. ej.
`organigrama`, `item-8`) o el nombre oficial. Por defecto **dry-run** (sin red). `--apply` exige `CMS_EMAIL` y
`CMS_PASSWORD` (SEC-08), solo CMS local salvo `--allow-remote` (https). Idempotente: busca por la clave natural; si
existe, la omite (nunca pisa lo que el PO editó). Rechaza (error por fila, no inserta) URL fuera de la allowlist,
`REEMPLAZAR`/`EJEMPLO` o vacías, categoría desconocida y período vacío. Informa creados / omitidos / errores.

## 3. Escenarios Given/When/Then

1. **Lectura anónima oculta retiradas.** Given una fila `active=false`; When un anónimo hace `GET /api/ley5189`;
   Then no la recibe. (Negativo) Un editor tampoco la ve; solo superadmin/web-admin.
2. **Escritura anónima.** When un anónimo hace `POST /api/ley5282`; Then 401/403. (Negativo)
3. **URL fuera de la allowlist.** When se crea una fila con `https://evil.example/x`, `http://drive.google.com/x`,
   `javascript:alert(1)` o `https://drive.google.com.evil.example/x`; Then 400. (Negativo)
4. **Duplicado.** Given una fila (categoría, período, descripción); When se crea otra igual (aun con otras
   mayúsculas/acentos); Then 400 por clave única. Con otra descripción: se acepta.
5. **Alta visible.** When un web-admin crea una fila válida y activa; Then aparece en `/ley-5189` en la categoría
   correcta tras la revalidación de la etiqueta `ley5189`.
6. **Retiro.** When se desmarca `active`; Then desaparece de la API anónima y de la página.
7. **Categoría vacía.** Given documentos en una categoría pero no en otra; Then la otra muestra «Documentos aún
   no publicados» (no «error»).
8. **CMS vacío.** Given 0 filas; Then estado `empty`: aviso claro y categorías oficiales, sin enlaces.
9. **CMS caído.** Given error de red o HTTP 500; Then estado `unavailable` y la página responde 200. (Negativo:
   no se muestra «sin documentos»).
10. **Fila corrupta.** Given una fila previa con `driveUrl` fuera de la allowlist; Then el portal no la muestra.
11. **Cargador, dry-run.** Then no hay llamadas de red y se informan los conteos.
12. **Cargador, fila inválida.** Given una URL `https://drive.google.com/drive/folders/REEMPLAZAR`; Then error de
    esa fila y no se inserta. Re-ejecución con filas válidas: segundo run = 0 creados, N omitidos.
13. **Revalidación.** `POST /api/revalidate {tag:'ley5189'}` → 200; `ley5189:1` (prefijo libre) → 400.
14. **i18n.** Los cuatro idiomas tienen las mismas claves en `pages.ley-5189` y `pages.ley-5282`.

## 4. Contrato de datos

| Campo | Tipo | Regla |
|---|---|---|
| `category` | select | 11 valores (5189) o `item-1`…`item-17` (5282); igual a la lista del portal (test de paridad) |
| `period` | texto, obligatorio | Texto libre: «2024», «Enero 2024», «I Trimestre 2024» |
| `description` | texto | Opcional; distingue documentos del mismo período |
| `driveUrl` | texto, obligatorio | §2.1 |
| `order` | número | Menor primero dentro de la categoría; desempate por creación |
| `active` | checkbox | Por defecto publicado; desmarcar retira sin borrar |
| `naturalKey` | texto oculto, único | §2.1; columna `natural_key` |

## 5. Decisiones de diseño (por qué)

- **Clave en una columna oculta** (y no un índice compuesto): los índices compuestos con `description` nula no
  deduplican en PostgreSQL (los NULL son distintos). La columna calculada deja una sola regla, probable sin BD.
- **Nombres oficiales en español en las 4 lenguas:** son denominaciones legales (Art. 8° Ley 5282; Ley 5189). No
  se traducen sin revisión jurídica; sí se traduce toda la interfaz (estados, botones, avisos).
- **Un componente servidor compartido** (`components/transparencia/LeyDocumentos.tsx`) para ambas leyes: evita
  dos páginas de 288 líneas que divergen (ya divergían en el número de ítem).
- **Hub `/transparencia` desde las colecciones:** muestra por ley cuántas categorías ya tienen documentos; deja
  de leer el global duplicado (H8).

## 6. Evidencia RDD

| ID | Afirmación | Fuente | Refutable con |
|---|---|---|---|
| RDD-TRANS-01 | El sitio actual no publica documentos de las leyes | GET 26-10-26 de las dos URL (texto «Esta es sólo una página de ejemplo», sin `<a>` de Drive/PDF) | Un enlace a documento en esas páginas |
| RDD-TRANS-02 | Lectura pública sin filtro | `Ley5189.ts:28`, `Ley5282.ts:28` (`read: () => true`) | Test `transparencia-leyes-cms` (RED→GREEN) |
| RDD-TRANS-03 | Seeds antiguos publican `REEMPLAZAR` | `scripts/seed-ley5189.mjs`, `seed-ley5282.mjs` | `grep REEMPLAZAR scripts/` |
| RDD-TRANS-04 | BD local con 0 filas | `SELECT count(*)` en `ley5189`, `ley5282`, `transparencia` | Filas > 0 |
| RDD-TRANS-05 | Allowlist = la de convenios | `Convenios.ts` `CONVENIOS_ALLOWED_HOSTS`, `lib/cms/convenios.ts` | Test de paridad |

## 7. Rollback

- Código: revertir el commit; los seeds antiguos se pueden recuperar de git (no se deben volver a usar).
- Migración `20261026_100000_trans_01_leyes_natural_key`: `up` aditivo e idempotente (`ADD COLUMN IF NOT EXISTS`,
  `CREATE UNIQUE INDEX IF NOT EXISTS`). `down` quita el índice y la columna **solo** si ninguna fila tiene clave
  (si hay datos del PO se niega; el deploy nunca ejecuta `migrate:down`).
- Antes de producción: `SELECT count(*) FROM ley5189; SELECT count(*) FROM ley5282;` y respaldo (`pg_dump`). Si hay
  filas con `REEMPLAZAR`, borrarlas desde el panel. Las filas previas quedan con `natural_key` NULL (no se
  deduplican hasta volver a guardarlas: al editarlas el hook calcula la clave).

## 8. Decisiones pendientes del Product Owner

1. **Documentos reales:** enlace de Drive por categoría y período (ver plantilla). Hoy no existen en el sitio.
2. **Responsable** de mantenerlos y periodicidad (mensual para nómina/viáticos/ejecución según la ley 5189).
3. **Ley 5282:** ¿la lista oficial debe seguir exactamente los 17 ítems del Art. 8°? El portal usa los 17 de la
   colección; si el PO añade o cambia ítems, es un cambio de esquema (enum), no de contenido.
4. **Global `transparencia`:** queda sin uso en el portal; confirmar su retiro (requiere migración destructiva, no
   incluida).
5. **Traducción jurídica** de las denominaciones de las categorías (hoy en español en todas las lenguas) y revisión
   nativa de las cadenas nuevas en guaraní (`docs/specs/i18n/GUARANI-REVISION.md`).
6. **Enlaces a carpetas de Drive:** se admiten (host permitido); el PO decide si prefiere un archivo por período.

## 9. Verificación (26-10-26, local)

**RED -> GREEN.** Antes de implementar, las tres pruebas nuevas fallaron por módulos inexistentes
(`apps/cms/src/collections/transparenciaLey`, `lib/cms/transparenciaLeyes`, `scripts/seed-transparencia-leyes.mjs`).
Después: `transparencia-leyes-cms.spec.ts`, `-queries.spec.ts` y `-loader.spec.ts` = 59 pruebas en verde.

| Control | Resultado |
|---|---|
| `npx vitest run` | 87 archivos, 1819 pruebas, 0 fallos |
| `npm run typecheck` (portal) y `tsc -p apps/cms/tsconfig.json` | sin errores |
| `node --test tests/deploy/*.test.mjs` | 152 pasan, 0 fallan |
| `node harness/check.mjs --quick` | unit y typecheck verdes; **falla** `guard-deploy-steps`: `compose.prod.yaml:111 usa :latest` (deuda previa de otro cambio, no tocada por TRANS-01) |
| SQL de la migración sobre PostgreSQL local | `up` aplica desde cero y se revierte (transacción con ROLLBACK); el push de dev ya creó los mismos nombres de columna e índices |

**En vivo (CMS :3002, portal :3000, superadmin QA; script del scratchpad `trans-live.mjs`, 30/30):** crear una fila de
prueba por ley (201) -> aparece en `/ley-5189` y `/ley-5282` (la revalidación por etiqueta tarda ~3 s); duplicado con otras
mayúsculas -> 400; misma categoría y período con otra descripción -> 201; `https://evil.example`, `http://drive...`,
`javascript:` y `drive.google.com.evil.example` -> 400; POST anónimo -> 403; `naturalKey` forjada -> se recalcula;
desactivar -> REST anónimo no la lista, `GET /:id` anónimo -> 404 y la página deja de mostrarla; borrado final: las tres
tablas (`ley5189`, `ley5282`, `transparencia`) terminan en 0 filas. Cargador: `--apply` creó 2 y rechazó 1 URL ajena;
la segunda ejecución omitió 2 (idempotente); filas de prueba borradas.

**Visual (navegador integrado):** 1440, 768 y 375 px sin desborde horizontal; estados vacío (0 de 17), con documentos y
categorías vacías con el mensaje neutro; en inglés, portugués y guaraní se resuelven las claves sin `MISSING_MESSAGE`.
No se midió contraste con herramienta: los colores secundarios pasaron a `#3F514B`/`#4A5C56` sobre blanco/`#F4F7F5`.

## 10. Hallazgos y pendientes técnicos

- El panel del CMS en dev aplica el esquema por *push*; en producción lo aplica la migración (`migrate` en el deploy).
- Cadenas nuevas en guaraní (`docs.*`, hub) son un borrador: revisión nativa pendiente (`GUARANI-REVISION.md`). El hub en
  `gn` ya estaba copiado en español antes de TRANS-01; solo las claves nuevas están en guaraní.
- `openspec/specs/institutional/spec.md` (REQ-18) describe el seed del global `transparencia`; es histórico y queda
  obsoleto con este cambio.
- `getTransparencia` (`lib/cms/queries/institutional.ts`) y `DocumentCard` ya no se usan en el portal; se dejan hasta
  decidir el retiro del global (§8.4).
