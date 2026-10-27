# MLG-01 — Marco legal conectado al CMS

**Estado:** implementado en local (rama `security/rbac-foundation`), sin commit. **Ámbito:** página pública
`/[locale]/marco-legal`, colección Payload `marco-legal`, consulta `lib/cms/queries/marcoLegal.ts`, siembra
`scripts/seed-marco-legal.mjs`. **Fuera de alcance:** migrar los PDF desde Google Drive al almacenamiento propio
(decisión pendiente del PO, §8), versionado/historial de documentos, búsqueda en el contenido de los PDF.

## 1. Problema

- El sitio publicado (`https://www.unc.edu.py/marco-legal/`, consultado por el orquestador el 24-10-26) muestra
  una tabla plana de 44 documentos (`Documento | Enlace «Descargar»`), todos en Google Drive, sin agrupación,
  búsqueda ni estado de vigencia.
- En el portal nuevo la colección existe pero estaba vacía (0 filas en la BD local), la lectura era
  `read: () => true` (un anónimo leía también las filas `active=false` por REST/GraphQL; brecha SEC-10),
  `externalUrl` aceptaba cualquier texto (`javascript:`, `http:`, cualquier host) y no había auditoría ni
  revalidación al guardar.

## 2. Comportamiento

1. **Fuente única:** la página lista solo filas `active=true` del CMS. Nunca muestra documentos escritos en el
   código. Tres estados: `ok` (lista), `empty` (aviso «aún no hay documentos publicados») y `unavailable`
   (aviso neutro; nunca un 500 ni datos viejos inventados).
2. **Agrupación:** por categoría en el orden canónico `CATEGORY_ORDER` (ley de creación → protocolos); dentro de
   cada categoría por `order` ascendente y luego por título (`localeCompare('es')`). Categorías sin
   documentos no se muestran.
3. **Enlace de descarga:** si hay `file` (upload a `media`) se usa su URL resuelta con `resolveMediaUrl`; si no,
   `externalUrl` solo si es https y su host está en la allowlist (`drive.google.com`, `docs.google.com`,
   `www.unc.edu.py`, `unc.edu.py`). Una fila sin enlace válido no se publica (se descarta en el mapeo).
   El enlace pasa además por `safeHref`, abre en pestaña nueva con `rel="noopener noreferrer"` y su nombre
   accesible incluye el título del documento y el aviso de pestaña nueva.
4. **Formato:** se deduce del nombre de archivo, del `mimeType` o de la URL: `pdf`, `doc`, `xls`, `drive`,
   `link`. Se muestra como etiqueta corta.
5. **Estado normativo:** `estado` = `vigente` (por defecto) | `derogado` | `historico`. La etiqueta solo se
   muestra cuando NO es vigente. `fechaDocumento` (fecha de la resolución) se muestra si existe.
6. **Búsqueda en el cliente:** el servidor renderiza todos los documentos (funciona sin JS). Con JS, un campo
   filtra por título, descripción y nota sin distinguir mayúsculas ni tildes; anuncia el número de resultados
   en una región `aria-live="polite"`; tiene botón para borrar y un mensaje si no hay resultados.
7. **Índice:** lista de categorías con su número de documentos que ancla a cada sección (lateral fijo en
   pantallas anchas, fila desplazable en móvil); durante una búsqueda refleja los conteos filtrados.

## 3. Modelo de datos (colección `marco-legal`)

| Campo | Tipo | Regla |
|---|---|---|
| `title` | text, obligatorio | Título visible; clave natural del seed (coincidencia exacta). |
| `category` | select, obligatorio | 10 valores de `DocCategory`. |
| `description` | textarea | Opcional. |
| `file` | upload → `media` | Prioridad sobre `externalUrl`. |
| `externalUrl` | text | https + host en allowlist (`validateAllowedHostUrl`). |
| *(regla de fila)* | — | Al menos uno de `file`/`externalUrl` (validación de `externalUrl` con `siblingData`). |
| `fechaDocumento` | date (solo día) | NUEVO, opcional. |
| `estado` | select `vigente|derogado|historico` | NUEVO, por defecto `vigente`, obligatorio. |
| `nota` | textarea (≤ 280) | NUEVO, opcional; aclaración breve pública. |
| `order` | number | Posición dentro de la categoría (seed: posición en la tabla del sitio publicado). |
| `active` | checkbox | Publicado. Lectura anónima limitada a `true` (SEC-10). |

Acceso: `read: readActiveOrInstitutional`; `create/update/delete: canWriteInstitutional` (superadmin, web-admin).
Hooks: auditoría (`makeAuditAfterChange/AfterDelete('marco-legal', 'Documento del marco legal')`) y
revalidación de la etiqueta `marco-legal` (añadida a `ALLOWED_TAGS` de `app/api/revalidate/route.ts`).
Migración: `20261024_140000_mlg_01_marco_legal_campos` (aditiva, idempotente; encadenada tras
`20261024_120000_mig_img_02_media_provenance`; `down` se niega si hay datos en los campos nuevos).

## 4. Escenarios (Given / When / Then)

1. **Anónimo solo ve activos.** Given una fila `active=false`, When un anónimo hace `GET /api/marco-legal`,
   Then la fila no aparece (el `where` de acceso es `{active: {equals: true}}`).
2. **Rol no institucional no escribe.** Given un usuario `editor`, When hace `POST /api/marco-legal`, Then 403.
3. **URL peligrosa rechazada.** Given `externalUrl = "javascript:alert(1)"` | `"http://drive.google.com/x"` |
   `"https://evil.example/x"` | `"https://drive.google.com.evil.example/x"` | `"https://u:p@drive.google.com/x"`,
   When se guarda, Then la validación devuelve un mensaje en español y no se guarda.
4. **Sin enlace no se guarda.** Given sin `file` y sin `externalUrl`, When se guarda, Then error
   «Suba un archivo o indique una URL externa».
5. **Retirar un documento.** Given un documento publicado, When el PO desmarca «Publicado», Then el CMS
   revalida la etiqueta `marco-legal` y el documento desaparece de la página y de la API anónima.
6. **CMS vacío.** Given 0 filas activas, Then la página muestra el aviso de estado vacío (sin documentos de
   respaldo).
7. **CMS caído.** Given el CMS no responde o responde con forma inesperada, Then aviso neutro, HTTP 200.
8. **Búsqueda.** Given los 44 documentos, When se escribe `becas`, Then 1 resultado y se anuncia «1 documento
   de 44». When se escribe `ÉTICA`, Then coincide con «Código de Ética UNC». When se escribe un texto sin
   coincidencias, Then mensaje de vacío y botón para ver todos.
9. **Fila inválida en el CMS.** Given una fila con `externalUrl` de un host fuera de la allowlist (dato
   heredado) o categoría desconocida, Then no se muestra.
10. **Seed idempotente.** Given los 44 documentos ya cargados, When se re-ejecuta el seed, Then 0 creados y
    0 actualizados si nada cambió (solo PATCH si difiere un campo del seed); `--dry-run` no usa red; destino
    no local rechazado sin `--allow-remote` y, con él, solo https.

## 5. Datos sembrados

44 documentos en el orden del sitio publicado, `active=true` (ya son públicos), `estado=vigente`,
`externalUrl=https://drive.google.com/file/d/<ID>/view`. Conteo por categoría (probado):
estatuto 1, reglamento-general 12, reglamentos-especiales 7, codigos 3, politicas 7, planes 6, manuales 2,
procedimientos 3, protocolos 2, ley-creacion 1. El título 7 se conserva literal del sitio
(«Título VI » Del Régimen Disciplinario»»): errata a corregir desde el panel.

## 6. RDD — afirmación → evidencia

| ID | Afirmación | Evidencia | Límite |
|---|---|---|---|
| RDD-MLG-01 | La colección permitía lectura anónima de filas inactivas. | `apps/cms/src/collections/MarcoLegal.ts` antes del cambio: `read: () => true`; patrón corregido en `access/roles.ts:291` (`readActiveOrInstitutional`). | Observado en código; no se probó con una fila inactiva antes del cambio. |
| RDD-MLG-02 | `externalUrl` aceptaba cualquier esquema y host. | Campo `text` sin `validate` en la versión previa. | Riesgo condicionado a una cuenta institucional comprometida o a un error de pegado. |
| RDD-MLG-03 | El sitio publicado lista 44 documentos en Google Drive, en el orden sembrado. | Inventario del orquestador (24-10-26); contraste propio con UNA descarga de `https://www.unc.edu.py/marco-legal/` (24-10-26, HTTP 200): los 44 ids de Drive coinciden y en el mismo orden. | No se abrió cada archivo de Drive: no se sabe si todos siguen compartidos públicamente. |
| RDD-MLG-04 | La BD local tenía 0 filas. | `GET http://localhost:3002/api/marco-legal?limit=1` → `totalDocs: 0` (24-10-26). | Solo BD local. |
| RDD-MLG-05 | `Reveal` oculta el contenido sin JS (opacity 0 hasta el IntersectionObserver). | `components/motion/Reveal.tsx`. | Por eso la lista de documentos no va dentro de `Reveal`. |
| RDD-MLG-06 | `<ul>` en vez de `<table>`: cada documento es una unidad con una sola acción, sin columnas comparables; una tabla con `display:block` en móvil pierde la semántica en algunos lectores. | Decisión de diseño; WCAG 1.3.1 (información y relaciones). | Revisable si el PO pide columnas comparables (p. ej. número de resolución). |

## 7. Rollback

Revertir los archivos de este cambio. La migración es aditiva: si se revierte el código, las columnas
`fecha_documento`, `estado` y `nota` quedan sin uso y no rompen Payload; su `down` solo las quita si están
vacías. Las 44 filas se pueden desactivar desde el panel (sin borrar).

## 8. Decisiones pendientes del PO

1. Migrar los PDF de Google Drive al almacenamiento propio (MinIO/`media`): hoy el portal depende de que los
   archivos de Drive sigan compartidos públicamente.
2. Corregir en el panel la errata del título 7 y confirmar si «Código de Ética UNC» (v1) sigue vigente frente a
   la «Versión 2» (marcar `historico` si corresponde), igual que el «Plan Estratégico 2017-2022».
3. Cargar `fechaDocumento` y número de resolución si se desea mostrarlos.
