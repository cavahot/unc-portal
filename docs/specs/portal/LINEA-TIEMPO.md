# LT-01 — Línea de tiempo de /historia conectada al CMS

**Estado:** implementado en local (rama `security/rbac-foundation`), sin commit. **Ámbito:** sección «Línea de
tiempo» de `/[locale]/historia`, colección Payload `linea-tiempo`, módulo puro `lib/cms/lineaTiempo.ts`, consulta
`lib/cms/queries/lineaTiempo.ts`, siembra `scripts/seed-linea-tiempo.mjs`. **Fuera de alcance:** el resto de la
página Historia (intro, cifras, misión), traducción automática, verificación histórica de los hitos (§8).

## 1. Problema

- `app/[locale]/historia/page.tsx` dibujaba 5 hitos escritos en el código (años 2007, 2008, 2010, 2015 y 2024)
  cuyos textos vivían en `messages/{es,en,pt-BR,gn}/pages.historia.json` (`timeline.m1..m5`). Los editores no
  podían agregar, corregir ni retirar un hito sin un desarrollador y un deploy.
- No había colección en el CMS para ese contenido.

## 2. Comportamiento

1. **Fuente única:** la sección lista solo filas `active=true` de `linea-tiempo`. Nunca muestra hitos escritos en
   el código (tampoco los 5 antiguos como respaldo: un hito obsoleto o corregido en el panel no debe reaparecer).
2. **Orden:** `anio` ascendente, luego `orden` ascendente, luego `titulo` (`localeCompare('es')`).
3. **Idioma:** en `es` se usan `titulo`/`descripcion`. En `en`, `pt-BR` y `gn` se usa
   `traducciones.<en|ptBR|gn>.<campo>` si no está vacío; si lo está, el texto en español **por campo**, y ese
   elemento lleva `lang="es"` para que el lector de pantalla lo pronuncie bien (WCAG 3.1.2). Sin traducción
   automática.
4. **Fecha:** el año es el dato visible principal (`<time dateTime="AAAA">`). `etiquetaFecha` (p. ej. «Marzo de
   2008», ≤ 40) es una precisión opcional que se muestra junto al año; no se traduce (es texto del editor).
5. **Imagen opcional:** `imagen` (upload a `media`) se resuelve con `resolveMediaUrl`; si no resuelve, el hito se
   muestra sin imagen. `alt` viene de la media (obligatorio en Media); con `alt` vacío la imagen es decorativa.
6. **Enlace opcional «Más información»:** solo `https://` sin credenciales (CMS: `validateHttpsUrl`; portal:
   comprobación https + `safeHref`). Abre en pestaña nueva con `rel="noopener noreferrer"`; el nombre accesible
   incluye el título del hito y el aviso de pestaña nueva. Un enlace inválido se omite, el hito se muestra.
7. **Estados:**
   - `ok`: se dibuja la línea de tiempo.
   - `empty` (CMS respondió, 0 hitos publicables): **la sección se oculta** completa. Motivo: es una sección de
     apoyo de una página institucional; un aviso «aún no hay hitos» en la historia pública parece un error y el
     PO lo produce a propósito al retirar todos los hitos. El resto de la página no cambia.
   - `unavailable` (CMS caído o forma inesperada): se muestra el encabezado de la sección y un aviso neutro con
     `role="status"`. Motivo: distinguir una caída (temporal) de un retiro deliberado. Nunca un 500.
8. **Movimiento:** aparición por CSS (`animation-timeline: view()`) solo si el navegador la soporta y el usuario
   no pidió menos movimiento; sin JS o sin soporte el contenido está visible desde el inicio (evita RDD-MLG-05).
   En impresión no hay animación y los hitos no se parten entre páginas.
9. **Filas inválidas** (sin `titulo`, sin `descripcion`, `anio` no entero o fuera de 1800..año actual+1, id
   ausente) se descartan en el mapeo sin romper la página.

## 3. Modelo de datos (colección `linea-tiempo`, grupo «Institucional»)

| Campo | Tipo | Regla |
|---|---|---|
| `anio` | number, obligatorio, índice | Entero 1800..(año actual + 1). |
| `etiquetaFecha` | text | Opcional, ≤ 40 caracteres. |
| `titulo` | text, obligatorio | ≤ 120. `useAsTitle`. Clave natural del seed junto con `anio`. |
| `descripcion` | textarea, obligatorio | ≤ 600. |
| `imagen` | upload → `media` | Opcional. Las fotos se normalizan al subir (pipeline de Media). |
| `enlace` | text | Opcional; `validateHttpsUrl` (solo https, sin credenciales ni espacios). |
| `orden` | number, por defecto 99 | Desempate dentro de un mismo año. |
| `active` | checkbox, por defecto `true`, índice | Etiqueta «Publicado». |
| `traducciones.{en,ptBR,gn}.{titulo,descripcion}` | group de text/textarea | Opcionales, mismos topes que el español. |

Acceso: `read: readActiveOrInstitutional`; `create/update/delete: canWriteInstitutional` (superadmin, web-admin;
sin permisos nuevos). Hooks: auditoría (`makeAuditAfterChange/AfterDelete('linea-tiempo', 'Hito de la línea de
tiempo')`) y revalidación de la etiqueta `linea-tiempo` (agregada a `ALLOWED_TAGS`). Panel: columnas `anio,
titulo, active, orden`; orden por defecto `anio`, `orden`.
Migración: `20261024_160000_lt_01_linea_tiempo` (crea tabla, índices, FK a media y la columna de bloqueo en
`payload_locked_documents_rels`; idempotente; `down` se niega si la tabla tiene filas).

## 4. Escenarios (Given / When / Then)

1. **Anónimo solo ve publicados.** Given un hito `active=false`, When un anónimo hace `GET /api/linea-tiempo`,
   Then no aparece (`where` de acceso `{active: {equals: true}}`).
2. **Escritura restringida.** Given un anónimo o un `editor`, When `POST /api/linea-tiempo`, Then 403.
3. **Validaciones del panel.** Given `anio = 1799 | 2.5 | año actual + 2`, `titulo` de 121 caracteres,
   `descripcion` de 601, `etiquetaFecha` de 41 o `enlace = javascript:alert(1) | http://x | https://u:p@x`,
   When se guarda, Then mensaje en español y no se guarda.
4. **Orden.** Given hitos (2010, orden 2), (2008), (2010, orden 1), Then se muestran 2008, 2010/1, 2010/2.
5. **Traducción ausente.** Given un hito con `traducciones.en.titulo` vacío, When se ve `/en/historia`, Then se
   muestra el título en español con `lang="es"`; con la traducción cargada, el texto en inglés sin `lang`.
6. **CMS vacío.** Given 0 hitos publicados, Then la sección no se renderiza y la página responde 200.
7. **CMS caído.** Given el CMS no responde, Then aviso neutro `role="status"` y HTTP 200; nunca los 5 hitos viejos.
8. **Enlace o imagen inválidos en una fila heredada.** Given `enlace = javascript:…` o una media con URL fuera de
   `/api/media/file/`, Then el hito se muestra sin enlace / sin imagen.
9. **Revalidación.** Given un hito nuevo guardado en el panel, Then el CMS envía la etiqueta `linea-tiempo` y la
   página lo muestra sin redeploy; `linea-tiempo:1` es rechazada (400).
10. **Seed idempotente.** Given los 5 hitos ya cargados, When se re-ejecuta el seed, Then 0 creados (clave natural
    `anio` + `titulo`; nunca pisa filas existentes); `--dry-run` no usa red; destino no local rechazado sin
    `--allow-remote` y con él solo https; sin `CMS_PASSWORD` fuerte no hay llamadas.

## 5. Datos sembrados

Los 5 hitos que ya publicaba el portal, con los textos **literales** de los catálogos (`es` como base; `en`,
`pt-BR` y `gn` como traducciones), `active=true` (conserva el comportamiento de hoy), `orden=1`:
2007 «Creación por Ley N° 3.399», 2008 «Inicio de actividades académicas», 2010 «Primera promoción de
graduados», 2015 «Apertura de nuevas facultades», 2024 «Más de 5.000 estudiantes activos». Tras sembrarlos se
eliminaron `timeline.m1..m5` de los 4 catálogos (el texto vive ahora en el CMS).

Sexto hito, aprobado por el PO el 24-10-26 (fuente oficial: CONACYT, 27-04-2026): 2026, «Abril de 2026»,
«Premio Nacional a la Calidad y Excelencia en la Gestión», con la frase aprobada (edición 2025, categoría Sector
Público, otorgado por el CONACYT) y enlace a la nota del CONACYT; traducciones en/pt-BR fieles a esa frase, gn
replica el español. No se afirma la distinción exacta dentro de la categoría (pendiente de confirmar por el PO).

## 6. RDD — afirmación → evidencia

| ID | Afirmación | Evidencia | Límite |
|---|---|---|---|
| RDD-LT-01 | Los hitos estaban escritos en el código. | `app/[locale]/historia/page.tsx` (antes del cambio, líneas 46-52) y `messages/*/pages.historia.json` `timeline.m1..m5`. | Observado en código. |
| RDD-LT-02 | Los textos de los hitos no están verificados contra una fuente oficial. | No hay referencia en el repo. La Biblioteca del Congreso (bacn.gov.py, ficha 10576) registra la creación de la UNC como **Ley N° 3.201** (2007), no 3.399 (búsqueda web, 24-10-26). | Solo se contrastó el número de ley por la ficha del buscador; fecha, 2008, 2010, 2015 y la cifra de 2024 sin verificar. Decisión del PO (§8). |
| RDD-LT-03 | `Reveal` oculta contenido sin JS. | RDD-MLG-05 (`components/motion/Reveal.tsx`). | Por eso la línea de tiempo usa animación solo CSS con `@supports`. |
| RDD-LT-04 | La traducción `gn` de los hitos parece de baja calidad (frases sin sentido claro). | Lectura de `messages/gn/pages.historia.json` `timeline.m*`. | Juicio no experto; se sembró literal para no inventar, revisión pendiente de un hablante. |
| RDD-LT-05 | Ocultar la sección en `empty` y avisar en `unavailable`. | Decisión de diseño (§2.7). | Revisable por el PO. |

## 7. Rollback

Revertir los archivos del cambio y restaurar `timeline.m1..m5` desde git en los 4 catálogos. La migración es
aditiva: la tabla `linea_tiempo` queda sin uso si se revierte el código; su `down` solo la quita si está vacía.
Los hitos se retiran desde el panel desmarcando «Publicado» (sin borrar).

## 8. Decisiones pendientes del PO

1. **Número de ley (crítico):** el hito 2007 y la intro de la página dicen «Ley N° 3.399»; la BACN registra la Ley
   N° 3.201/2007. Confirmar y corregir desde el panel (hito) y en `intro.body1`/`meta.description` (código).
2. Confirmar fecha (4 de julio de 2007) y los hechos de 2008, 2010, 2015 y la cifra «más de 5.000» de 2024;
   agregar `etiquetaFecha` y enlace a la fuente cuando se confirmen.
3. Revisar las traducciones guaraní con un hablante.
