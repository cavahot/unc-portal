# PRA-01 — Sección «Premios y acreditaciones» en la portada (editable desde el CMS)

**Estado:** investigación y diseño; **no implementado**. **Solicitud:** Product Owner (actualización: los premios, las acreditaciones y los logos deben poder gestionarse desde el panel del CMS, sin despliegue). **Evidencia:** `docs/research/evidence-register-premios.md` (IDs `RDD-PRA-xx`). **Regla rectora:** el portal no muestra ningún año, distinción, carrera, organismo ni vigencia que no tenga fuente citada en el CMS; lo no verificado queda «por confirmar» y **no se renderiza**.

## 1. Propósito y alcance

Mostrar, antes de la franja «Universidad pública / Excelencia académica, investigación e innovación» (`app/[locale]/page.tsx:612-639`, RDD-PRA-02), una sección con (1) el logo del Premio Nacional a la Calidad y Excelencia en la Gestión, (2) las ediciones en que la UNC fue distinguida y (3) un bloque «Acreditaciones» con el logo de cada facultad y sus carreras/programas acreditados.

**Dentro:** dos colecciones nuevas en Payload (`reconocimientos`, `acreditaciones`), campos nuevos en `facultades` (`siglas`, `logo`, `logoPath`, `orden`, `active`), migración manual, tipos, consulta del portal con fallback, componente de servidor, claves i18n, etiquetas de revalidación, pruebas.

**Fuera (no objetivos):** página de detalle de acreditaciones; consulta automática a ANEAES/IDEAS; corregir los subtítulos «acreditados por el CONES» de las páginas de facultad (RDD-PRA-09, tarea aparte); resolver el almacenamiento de media (MIG-IMG); carrusel o animaciones de entrada propias; enlazar o incrustar imágenes de `conacyt.gov.py` o `aneaes.gov.py`.

## 2. Diseño visual (una propuesta)

**Concepto: «placa de honor» en verde noche que desemboca en la franja.** La sección usa fondo `#001A00` con un degradado radial muy tenue `#004700` hacia abajo; la franja siguiente empieza en `#004700` (`page.tsx:615`), así ambas se leen como un único cierre institucional, mientras el corte con transparencia (`#F4F7F5`, `page.tsx:495`) marca el cambio de tema. Se eligió oscuro porque los logos disponibles son PNG/JPG con fondo blanco (RDD-PRA-03): sobre fondo claro se diluyen; en placas blancas sobre verde noche resaltan sin recortarlos ni alterarlos.

- **Cabecera** (centrada, mismo patrón que `page.tsx:499-514`): etiqueta `text-xs font-extrabold uppercase tracking-[0.23em] text-[#8AFF8A]`, título `font-serif … sm:text-5xl lg:text-6xl text-white`, descripción `text-white/75`.
- **Bloque premio** (rejilla `lg:grid-cols-[0.9fr_1.1fr]`): izquierda, placa blanca `rounded-[1.45rem]` con el logo del premio (`object-contain`, alto máx. 220 px) y debajo el otorgante («CONACYT») y enlace «Sitio oficial» (externo). Derecha, **línea de tiempo vertical** de ediciones: punto `#00A300` sobre línea `#8AFF8A/30`, año en `font-serif text-4xl text-white`, chip de distinción (`premio` = fondo `#00A300` texto `#001A00`; `mención especial` = borde `#8AFF8A` texto `#8AFF8A`), categoría en `text-white/70` y enlace «Fuente» (externo, `rel="noopener noreferrer"`). Si solo hay una edición, la línea se reduce a una tarjeta destacada (sin línea huérfana).
- **Bloque acreditaciones**: subtítulo «Acreditaciones» + una línea con el organismo («Agencia Nacional de Evaluación y Acreditación de la Educación Superior — ANEAES»). Rejilla `sm:grid-cols-2 xl:grid-cols-3` de **tarjetas por facultad**: disco blanco 64 px con el logo, siglas en `text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-[#8AFF8A]`, nombre de la facultad en blanco, y debajo una **lista siempre visible** (`<ul>`) de carreras: nombre, sede/filial y un **sello** pequeño (`rounded-full border border-[#8AFF8A]/40 px-2 text-[0.68rem]`) con «ANEAES · Modelo Nacional» y, solo si existe, «hasta 2029». Se descarta acordeón/carrusel: pocas carreras por facultad, contenido sin ocultar, sin JavaScript (componente de servidor) y mejor para lectores de pantalla.
- **Estados**: tarjetas con `border-white/10 bg-white/[0.04]`; hover/focus-within `border-[#8AFF8A]/60` y `-translate-y-1` (solo con movimiento permitido); enlaces con `focus-visible:ring-2 ring-[#8AFF8A] ring-offset-2 ring-offset-[#001A00]`. Reutilizar `Reveal` (ya respeta `prefers-reduced-motion`, RDD-PRA-20); **no** usar `TiltCard` (el 3D compite con logos ajenos y distorsiona su lectura).
- **Móvil**: todo en una columna; placa del premio a ancho completo con logo máx. 160 px; línea de tiempo debajo; tarjetas de facultad apiladas; sin desplazamiento horizontal.
- **Movimiento reducido**: sin traslaciones ni transiciones (`motion-reduce:transform-none motion-reduce:transition-none`).

## 3. Modelo de datos en el CMS

### 3.1 Comparación

| Opción | Qué es | A favor | En contra | Veredicto |
|---|---|---|---|---|
| A | Grupo `acreditacion` dentro de `Carreras` + global `Premios` | 1 consulta; pocas tablas | Una carrera puede tener a la vez Modelo Nacional y ARCU-SUR y reacreditaciones sucesivas (RDD-PRA-31/33): un grupo solo guarda una; `Carreras.read` es público sin filtro (RDD-PRA-05) y cambiarlo afecta otras páginas; los postgrados acreditados (RDD-PRA-32/33) no siempre existen como carrera | No |
| **B** | Colecciones nuevas `reconocimientos` y `acreditaciones` + campos de logo/siglas en `facultades` | Historial y varios organismos por carrera; fuente obligatoria por fila; reutiliza SEC-10 (`active`) sin tocar lecturas existentes; borrar/ocultar una acreditación no toca la carrera | 2 tablas + 1 de array; consulta con `depth=2` | **Recomendada** |
| C | Módulo TypeScript estático (sin CMS) | Simple, sin migración | Contradice el pedido del PO (editar sin despliegue) | Descartada; solo como fallback de desarrollo |

### 3.2 Colecciones y campos (opción B)

**`facultades` (ampliación)** — `siglas` (texto, máx. 12, p. ej. «FCEA»); `logo` (upload → `media`, opcional); `logoPath` (texto, opcional, validado con `^/images/facultades/[a-z0-9-]+\.(png|jpe?g|webp)$`: transitorio mientras no exista volumen persistente, RDD-PRA-19); `orden` (número); **no** se renombra `activa`. El portal usa `logo.url` si existe; si no, `logoPath`; si ninguno, iniciales (`siglas`) en el disco.

**`reconocimientos`** (nueva) — `nombre` (texto, req.); `otorgante` (texto, req., p. ej. «CONACYT»); `sitioOficial` (url, opcional, solo `https:`, validado con `safeHref`); `logo` (upload → media) + `logoPath` (validado `^/images/premios/…`); `logoAlt` (texto, req. si hay logo); `ediciones` (array, mín. 1): `anio` (número 1990-2100, req.), `distincion` (select: `premio`, `premio-categoria`, `mencion-especial`, `reconocimiento`; req.), `categoria` (texto), `motivo` (textarea), `fuenteUrl` (url https, **req.**), `verificado` (checkbox, por defecto `false`); `orden`; `active` (checkbox, por defecto `false`).

**`acreditaciones`** (nueva) — `carrera` (relación → `carreras`, opcional) **o** `programa` (texto, para postgrados sin carrera); validación: exactamente uno de los dos; `facultad` (relación → `facultades`, req.: no se deduce de la carrera para cubrir postgrados y evitar `depth=3`); `sede` (texto); `organismo` (select: `aneaes`, `arcu-sur`, `otro`; req.); `modelo` (select: `modelo-nacional`, `arcu-sur`; req.); `tipo` (select: `acreditacion`, `reacreditacion`); `resolucion` (texto); `vigenciaDesde`, `vigenciaHasta` (fecha); `fuenteUrl` (url https, **req.**); `verificado` (checkbox, por defecto `false`); `orden`; `active` (por defecto `false`).

**Por qué `active` y `verificado` en `false` por defecto:** una fila recién cargada no aparece en la portada hasta que un rol institucional confirma la fuente (evita mostrar datos inventados).

### 3.3 Acceso (SEC-10 y roles existentes)

- `reconocimientos` y `acreditaciones`: `read: readActiveOrInstitutional` (`roles.ts:291-295`); create/update/delete: `canWriteInstitutional` (superadmin, web-admin; `roles.ts:277-280`), igual que Carreras/Facultades/Tribunal. **No** se crean permisos nuevos.
- Logos: suben a `media` con `canWriteMedia` (incluye media-manager, `roles.ts:298-299`); asociarlos a una facultad o premio sigue siendo institucional. Si el PO quiere que media-manager edite estas colecciones, es un permiso nuevo: **decisión del PO**, no se asume.
- `facultades.read` sigue `() => true` (no se estrecha en esta tarea; los campos nuevos no son sensibles).
- La consulta del portal filtra además `verificado = true` (defensa en profundidad: lo filtra el portal, no el access).

### 3.4 Hooks, auditoría y revalidación

- `afterChange` y `afterDelete`: `revalidatePortalTag('reconocimientos')` / `('acreditaciones')` (patrón `TribunalDocumentos.ts:22-29`; nunca lanza). `facultades` ya revalida `facultades`; añadir `afterDelete`.
- `ALLOWED_TAGS` de `app/api/revalidate/route.ts:59-78`: añadir `reconocimientos` y `acreditaciones` (sin prefijos libres).
- Auditoría: hook `auditInstitutionalChange` (nuevo, `apps/cms/src/hooks/audit/`) que escribe en `auditoria` con `accion` `crear|actualizar|eliminar` (opciones existentes, `Auditoria.ts:46-63`), `coleccion`, `documento` (id) y usuario; sin copiar el contenido. Se aplica a las dos colecciones nuevas; extenderlo a otras institucionales queda fuera.

### 3.5 Migración y tipos

- `apps/cms/src/migrations/2026MMDD_HHMMSS_pra_01_premios_acreditaciones.{ts,json}` + registro en `index.ts`, siguiendo `20261022_134500_dep_03_created_by.ts` (RDD-PRA-15): crea `reconocimientos`, `reconocimientos_ediciones`, `acreditaciones`; añade a `facultades` `siglas`, `logo_id` (FK → `media` `ON DELETE set null`), `logo_path`, `orden`; añade `reconocimientos_id` y `acreditaciones_id` a `payload_locked_documents_rels` (baseline `:638`); índices en `active`, `orden`, `facultad_id`, `carrera_id`. Idempotente; `down` elimina **solo** las tablas nuevas si están vacías y deja las columnas de `facultades`. El SQL debe contrastarse con `payload migrate:create` en BD sintética autorizada (no se ejecutó).
- `npm run generate:types --workspace=@unc/cms` y copiar a `packages/cms-types/src/payload-types.ts` (paquete `@unc/cms-types`).
- **Siembra**: script revisado aparte (no parte de la migración) que solo carga filas con `fuenteUrl` de la tabla §6 y `verificado = false`; los logos de facultad por `logoPath` a los archivos existentes. Nada de lo marcado «por confirmar» se siembra.

### 3.6 Consumo en el portal

- `lib/cms/queries/premios.ts`: `getReconocimientos()` → `/reconocimientos?where[active][equals]=true&sort=orden&limit=10&depth=1` con `select` de campos usados; `getAcreditaciones()` → `/acreditaciones?where[active][equals]=true&where[verificado][equals]=true&sort=orden&limit=100&depth=2`. Para no sobrecargar: `defaultPopulate` en `carreras` (`nombre`, `slug`, `sede`, `tipo`), `facultades` (`nombre`, `slug`, `siglas`, `logo`, `logoPath`, `orden`) y `media` (`url`, `alt`, `width`, `height`) (RDD-PRA-16). Etiquetas: `['reconocimientos']`, `['acreditaciones','facultades','carreras']`.
- Filtrado en el portal: ediciones con `verificado`; acreditaciones con `vigenciaHasta` vencida se ocultan; facultades sin acreditaciones visibles se omiten; si no queda nada en un bloque, se oculta el bloque; si no queda nada en total, no se renderiza la sección (ni su título).
- **CMS caído**: a diferencia de Tribunal (`tribunal.ts:65-96`, propaga `CmsError`), en portada la sección devuelve `[]` y se oculta (nunca rompe la home). Solo con `demoFallbackAllowed()` (desarrollo) usa `DEMO_PREMIOS`/`DEMO_ACREDITACIONES` tipados, que contienen únicamente filas de §6 con fuente.
- `totalCarrerasAcreditadas` (RDD-PRA-07): **recomendación** derivarlo del conteo de acreditaciones de grado vigentes y verificadas, y dejar el número manual como respaldo hasta que el PO valide los datos; el fallback `10` no tiene fuente y debería pasar a «sin dato» (decisión del PO, pregunta 6).
- Imágenes: `next/image` con `src` relativo (`/images/...`) o URL de `media` ya permitida por `remotePatterns`/CSP (`MEDIA_HOSTNAME`). **Ningún** host nuevo en `img-src` ni `remotePatterns`; un `logo.url` absoluto cuyo host no esté permitido se descarta (se muestran iniciales).

### 3.7 i18n

Nuevas claves en `messages/{es,en,gn,pt-BR}/pages.home.json` bajo `awards`: `sectionLabel`, `title`, `description`, `awardedBy`, `officialSite`, `source`, `distinction.{premio,premioCategoria,mencionEspecial,reconocimiento}`, `accreditations.title`, `accreditations.body` («Agencia Nacional de Evaluación y Acreditación de la Educación Superior»), `accreditations.model.{modeloNacional,arcuSur}`, `accreditations.validUntil` (`hasta {year}`), `accreditations.campus`, `logoAlt` (`Logo de {name}`), `externalHint` («se abre en una pestaña nueva»). `gn` replica el español, como el resto del catálogo. Los nombres de premio, carrera y facultad vienen del CMS (no se traducen).

## 4. Escenarios Given/When/Then

1. Dado un reconocimiento `active` con una edición `verificado`, cuando se renderiza la portada, entonces aparecen el año, el chip de distinción y el enlace «Fuente» con `target="_blank" rel="noopener noreferrer"`.
2. (neg.) Dada una edición con `verificado = false`, cuando se renderiza, entonces su año no aparece en el HTML.
3. (neg.) Dado el HTML de la sección, cuando se inspeccionan `src`/`srcset`, entonces ninguno apunta a `conacyt.gov.py`, `aneaes.gov.py` ni otro host fuera de `'self'`/`MEDIA_HOSTNAME`.
4. (neg.) Dado cualquier `<img>` de la sección, entonces tiene `alt` no vacío (`logoAlt` o `Logo de {facultad}`).
5. (neg.) Dada una facultad sin acreditaciones visibles, cuando se renderiza, entonces no aparece su tarjeta ni un encabezado vacío.
6. (neg.) Dadas cero filas visibles en ambos bloques, entonces no se emite `<section id="premios">`.
7. (neg.) Dado el CMS caído en producción, cuando se renderiza la portada, entonces la portada responde 200 y la sección no se muestra (no se usan datos demo).
8. (neg.) Dada una acreditación con `vigenciaHasta` anterior a hoy, entonces no se muestra.
9. (neg.) Dado `sitioOficial` o `fuenteUrl` con `javascript:`, `http:` o `//host`, cuando se guarda en el CMS, entonces la validación lo rechaza; y si llegara al portal, `safeHref` lo reduce a `#` y no se renderiza el enlace.
10. (neg.) Dado `logoPath` `../../etc/passwd`, `https://x/y.png` o `/images/otra/x.png`, cuando se valida, entonces se rechaza.
11. (acceso) Dado un anónimo, cuando lee `/api/acreditaciones` y `/api/reconocimientos`, entonces solo recibe filas `active = true`; superadmin y web-admin reciben todas; editor, publisher, reviewer, correspondent, media-manager y auditor solo las activas.
12. (acceso, neg.) Dado editor, publisher, reviewer, correspondent, media-manager, auditor o anónimo, cuando intenta crear, actualizar o borrar, entonces recibe 403 (401 anónimo).
13. Dado un guardado o borrado, entonces se llama `revalidatePortalTag` con la etiqueta de la colección y se escribe una fila en `auditoria` con la acción correcta.
14. Dado `/api/revalidate` con `tag=acreditaciones`, entonces 200; con `tag=acreditaciones:x`, entonces 400.
15. (orden) Dada la portada, entonces `id="premios"` aparece después de `id="transparencia"` y antes de `id="institucional"`.
16. (a11y) La sección tiene `aria-labelledby` a su `h2`; las listas son `<ul>`/`<li>`; la línea de tiempo es `<ol>`; contraste ≥ 4.5:1 sobre `#001A00`; con `prefers-reduced-motion: reduce` no hay transformaciones.

## 5. Tabla RDD (afirmación → evidencia)

| Afirmación | Evidencia | Tipo |
|---|---|---|
| La franja es una sección en línea en la portada | `app/[locale]/page.tsx:612-639` (RDD-PRA-01/02) | Hecho observado |
| Los logos de facultad existen y requieren fondo blanco | `public/images/facultades/*`; `contacto/dependencias/page.tsx:49-50` (RDD-PRA-03) | Hecho observado |
| No hay modelo de acreditación ni de premios en el CMS | `Carreras.ts:79-84`; `Facultades.ts:66-76` (RDD-PRA-04/05) | Hecho observado |
| La UNC tuvo Mención Especial 2016 (no premio) | CONACYT 26-10-2016 (RDD-PRA-22) | Fuente oficial |
| La UNC fue galardonada en la Edición 2025, sector público | CONACYT 27-04-2026 (RDD-PRA-25) | Fuente oficial |
| «Premio máximo» 2025 | Solo prensa (RDD-PRA-26) | Secundaria; por confirmar |
| 5 carreras UNC vigentes en 2015-2019 | Boletín ANEAES 2020 (RDD-PRA-30/31) | Fuente oficial, desactualizada |
| Acreditaciones entregadas a la UNC en dic. 2025 | Presentación ANEAES 19-12-2025 (RDD-PRA-33) | Fuente oficial, sin resolución |
| «10 carreras acreditadas» | Sin fuente (RDD-PRA-07) | Riesgo |
| `readActiveOrInstitutional` sirve para las nuevas colecciones | `roles.ts:282-295` (RDD-PRA-10) | Hecho observado |
| Hotlink a CONACYT no permitido y bloqueado por CSP | `lib/csp.ts:15-21` (RDD-PRA-18) | Hecho observado |
| Logos en Payload pueden perderse sin volumen | MIG-IMG §88 (RDD-PRA-19) | Riesgo condicionado |

## 6. Datos encontrados

### 6.1 Premio Nacional a la Calidad y Excelencia en la Gestión (CONACYT)

| Edición | Distinción UNC | Categoría | Fuente | Estado |
|---|---|---|---|---|
| 2016 | Mención Especial | Pública Grande | https://www.conacyt.gov.py/entrea_del_premio_nacional_a_la_calidad | Verificado (oficial) |
| 2017 | — (no figura) | — | https://www.conacyt.gov.py/conacyt_premio_a_instituciones_empresas_del_sector_publico_privado_por_calidad_excelente_gestion | Verificado: ausente |
| 2018 | — (no figura) | — | https://www.conacyt.gov.py/pnc-2019 | Verificado: ausente |
| 2019-2024 | sin datos | — | — | **Por confirmar** |
| 2025 (entregado 27-04-2026) | Galardonada; prensa: «reconocimiento principal» | Sector Público | https://www.conacyt.gov.py/conacyt-entrego-premio-nacional-calidad-excelencia-gestion-2025 ; https://www.radionacional.gov.py/2026/04/27/conacyt-impulsa-el-premio-nacional-a-la-calidad-y-reconoce-a-organizaciones-destacadas-en-gestion/ | Verificado; nombre exacto de la distinción **por confirmar** |

### 6.2 Carreras y programas acreditados por ANEAES (UNC)

| Facultad | Carrera / programa | Sede | Modelo | Año / vigencia | Fuente | Estado |
|---|---|---|---|---|---|---|
| Humanidades y Ciencias de la Educación (FHyCE) | Ciencias de la Educación | Concepción | Modelo Nacional | Vigente en 2015-2019 | Boletín ANEAES 2020, Tabla 5, n.º 11 | Vigencia actual por confirmar |
| Odontología | Odontología | Concepción | Modelo Nacional | Vigente 2015-2019; acreditada según informe ANEAES nov. 2025 | Boletín 2020 n.º 15; RDN 04-11-2025 | Resolución y vigencia por confirmar |
| Medicina | Medicina | Concepción | Modelo Nacional | Vigente en 2015-2019 | Boletín 2020 n.º 26 (facultad rotulada «Ciencias de la Salud») | Vigencia actual por confirmar |
| Ciencias Económicas y Administrativas (FCEA) | Contaduría Pública | Filial Horqueta | Modelo Nacional (2025: hipótesis) | Vigente 2015-2019; certificado entregado 19-12-2025 | Boletín 2020 n.º 103; Presentación ANEAES 2025 | Resolución y vigencia por confirmar |
| Ciencias Agrarias | (Licenciatura en) Administración Agropecuaria | Filial Horqueta | Modelo Nacional (2025: hipótesis) | Vigente 2015-2019; certificado entregado 19-12-2025 | Boletín 2020 n.º 190; Presentación ANEAES 2025 | Resolución y vigencia por confirmar |
| por confirmar | Maestría en Didáctica de las Ciencias Matemática, Física y Química (postgrado) | Concepción | Modelo Nacional | Vigente 2015-2019 | Boletín 2020, p. 37 | Facultad y vigencia por confirmar |
| por confirmar (¿Medicina?) | Especialización en Medicina Familiar y Comunitaria (postgrado) | Hospital Regional de Concepción | por confirmar | Certificado entregado 19-12-2025 | Presentación ANEAES 2025 | Facultad y modelo por confirmar |
| Ciencias Exactas y Tecnológicas (FACET) | — | — | — | Sin evidencia encontrada | — | Por confirmar |

URLs: Boletín 2020 https://informacionpublica.paraguay.gov.py/public/2162896-BoletnEstadstico-ANEAES2020pdf-BoletnEstadstico-ANEAES2020.pdf · Presentación 2025 https://www.aneaes.gov.py/wp-content/uploads/2025/12/Presentacion_entrega-de-acreditaciones_2025-1_final.pdf_finall.pdf · RDN https://www.rdn.com.py/2025/11/04/carreras-de-odontologia-casi-50-sin-acreditacion-de-aneaes/ · Listado oficial vivo (IDEAS, no consultado): enlazado desde https://www.aneaes.gov.py/carreras-de-grado-acreditadas/ . **Advertencia:** las carreras «sede Concepción» del listado de prensa 2023 son de la UNA, no de la UNC (RDD-PRA-36).

### 6.3 Archivos de logo necesarios

| Archivo propuesto | Origen | Pregunta de licencia/uso |
|---|---|---|
| `public/images/premios/premio-nacional-calidad.(svg→png/webp)` o subida a `media` | Pedir a CONACYT el archivo oficial; candidato no confirmado: https://www.conacyt.gov.py/sites/default/files/upload_editores/u38/00%20logo%20apc%20premio-02_0.jpg (RDD-PRA-28) | ¿Autoriza CONACYT su uso por la UNC en su web (galardonada 2025)? ¿Hay manual de marca o «Guía de visibilidad» aplicable? |
| `public/images/facultades/{agrarias,economicas,exactas,humanidades,medicina,odontologia}.png` | Ya en el repositorio (RDD-PRA-03) | ¿Son las versiones vigentes? ¿Hay versiones vectoriales o de mayor resolución? |
| (opcional) sello ANEAES | ANEAES | Solo con autorización escrita; por defecto se usa texto, no logo |

### 6.4 Preguntas para el Product Owner (máx. 6)

1. **Premio:** ¿se muestran solo la Edición 2025 o también la Mención Especial 2016? ¿Cuál es el nombre exacto de la distinción 2025 según el diploma o la resolución de CONACYT (¿premio máximo del sector público?), y pueden aportar ese documento?
2. **Logo del premio:** ¿pueden obtener de CONACYT el archivo oficial y la autorización de uso (o su manual de marca)? ¿El candidato «00 logo apc premio» es el correcto?
3. **Acreditaciones vigentes:** ¿puede la Dirección de Aseguramiento de la Calidad entregar la lista oficial actual (carrera, sede, modelo, resolución ANEAES, fecha y vigencia), en especial de Medicina, Odontología y Ciencias de la Educación (la última evidencia oficial es de 2015-2019)?
4. **Postgrados y FACET:** ¿se incluyen programas de postgrado (Maestría en Didáctica…, Especialización en Medicina Familiar y Comunitaria: ¿de qué facultad?) y se confirma que FACET no tiene carreras acreditadas hoy?
5. **Edición en el CMS:** ¿basta con superadmin y web-admin (rol institucional actual) para cargar estos datos, o se requiere habilitar a otro rol (sería un permiso nuevo)? ¿Confirman las siglas de cada facultad?
6. **Estadística:** ¿el contador «Carreras acreditadas» debe calcularse desde estas acreditaciones (y retirar el valor fijo 10, sin fuente)?

## 7. Plan TDD (pruebas que deben fallar primero, en orden)

1. `tests/unit/pra-cms-collections.spec.ts`: `reconocimientos` y `acreditaciones` existen con los campos de §3.2; `active`/`verificado` por defecto `false`; `fuenteUrl` requerido; `read === readActiveOrInstitutional`; create/update/delete `=== canWriteInstitutional`; hooks `afterChange`/`afterDelete` llaman `revalidatePortalTag` (mock, como `perf-db-schema.spec.ts:12-19`).
2. `tests/unit/pra-cms-access.spec.ts`: matriz por rol (anónimo, superadmin, web-admin, publisher, editor, reviewer, correspondent, media-manager, auditor, rol desconocido) → `true` o `{ active: { equals: true } }` en read; `false` en escritura salvo superadmin/web-admin.
3. `tests/unit/pra-cms-validation.spec.ts`: validadores de `fuenteUrl`/`sitioOficial` (solo `https:`, sin credenciales) y de `logoPath` (regex, sin `..`); `carrera` xor `programa`.
4. `tests/unit/pra-cms-audit.spec.ts`: `auditInstitutionalChange` crea fila `auditoria` con `crear|actualizar|eliminar`, sin copiar contenido; nunca lanza.
5. `tests/unit/pra-migration.spec.ts`: SQL con `IF NOT EXISTS`/`duplicate_object`; crea las 3 tablas, columnas de `facultades`, columnas de `payload_locked_documents_rels`; `down` no borra columnas de `facultades`; registrado en `index.ts`; snapshot `.json` coherente (patrón `perf-db-schema.spec.ts`).
6. `tests/unit/pra-revalidate-tags.spec.ts`: `ALLOWED_TAGS` incluye `reconocimientos` y `acreditaciones`; rechaza `acreditaciones:x`.
7. `tests/unit/pra-queries.spec.ts`: URL con `where[active]`, `where[verificado]`, `depth` y `select` esperados; CMS caído en producción → `[]`; en desarrollo → demo; filtra vencidas y no verificadas; descarta `logo.url` de host no permitido.
8. `tests/unit/pra-section-component.spec.ts` (render estático, como `campus-map-component.spec.ts`): G/W/T 1-6, 8, 9, 16; ningún `src` externo; todo `<img>` con `alt`; enlaces externos con `rel="noopener noreferrer"`.
9. `tests/unit/pra-home-order.spec.ts`: aserción estática sobre `app/[locale]/page.tsx` (`#transparencia` < `#premios` < `#institucional`).
10. `tests/unit/pra-i18n.spec.ts`: las claves `awards.*` existen en los 4 catálogos.
11. (opcional, tras decisión 6) `stats.unit.spec.ts`: total derivado de acreditaciones vigentes.

Verificación manual posterior: navegador local a 375 px y 1440 px, `prefers-reduced-motion` y lector de pantalla sobre las listas. El modo oscuro del sistema no cambia nada: la sección siempre es oscura.

## 8. Archivos a implementar

- CMS: `apps/cms/src/collections/Reconocimientos.ts`, `apps/cms/src/collections/Acreditaciones.ts` (nuevos); `apps/cms/src/collections/Facultades.ts` (campos + `afterDelete` + `defaultPopulate`); `Carreras.ts` y `Media.ts` (solo `defaultPopulate`); `apps/cms/src/hooks/audit/auditInstitutionalChange.ts` (nuevo); `apps/cms/src/utilities/validators.ts` (o equivalente; `https` y `logoPath`); `apps/cms/src/payload.config.ts` (registro); migración `.ts` + `.json` + `migrations/index.ts`; `apps/cms/src/payload-types.ts` y `packages/cms-types/src/payload-types.ts`.
- Portal: `lib/cms/queries/premios.ts` (nuevo); `components/home/AwardsAccreditationsSection.tsx` (nuevo, servidor); `app/[locale]/page.tsx` (consulta en el `Promise.all` de `:137-143` e inserción entre `:606` y `:608`); `app/api/revalidate/route.ts` (`ALLOWED_TAGS`); `messages/{es,en,gn,pt-BR}/pages.home.json`; logo del premio en `public/images/premios/` **solo** tras autorización (pregunta 2).
- Pruebas: §7.

## 9. Riesgos y límites

- Datos oficiales desactualizados: la última foto completa es de 2020; sin la lista del PO la sección mostrará pocas filas (por diseño, mejor vacía que inventada).
- Logos subidos a `media` sin volumen persistente se pierden en un redeploy (MIG-IMG); mitigación: `logoPath` a archivos versionados hasta que se cierre MIG-IMG. SVG en `media` no recomendado (MIG-IMG §93).
- Uso de marca de terceros (CONACYT, ANEAES) sin autorización: no se publica hasta tener respuesta (pregunta 2).
- `depth=2` puede traer más campos de los necesarios si `defaultPopulate` no aplica en REST como se espera (hipótesis RDD-PRA-16): medir tamaño de respuesta en local.
- La migración manual no se ejecutó contra Postgres; requiere BD sintética autorizada.

## 10. Rollback

Quitar la sección de `page.tsx` (la portada vuelve a su estado previo); revertir consultas, componente, claves i18n y etiquetas. En el CMS, des-registrar las colecciones; el `down` elimina solo tablas nuevas vacías y conserva las columnas añadidas a `facultades` (aditivas, sin datos perdidos).

## 11. Decisión del PO (2026-10-23) — fase 1: solo CMS + siembra

**Alcance aprobado ahora:** colecciones `reconocimientos` y `acreditaciones`, campos `siglas` y `logoPath` en `facultades`, hooks (auditoría y revalidación), etiquetas de revalidación, migración manual, tipos, guion de siembra y logo del premio. **Fuera de esta fase:** la sección pública de la portada (`app/[locale]/page.tsx`, componente, consultas del portal, i18n), que queda para la fase siguiente. El PO abre el panel, ve todos los campos y confirma los datos.

**Decisiones del PO y ajustes respecto de §3.2 (prevalece esta sección):**

1. Logo del premio = el logo del premio de CONACYT publicado en `https://www.conacyt.gov.py/taxonomy/term/35` (archivo «00 logo apc premio-02_0.jpg»); el PO declara que es el correcto. La UNC tiene **dos** distinciones: 2016 (Mención Especial, categoría Pública Grande) y la edición 2025 (sector público; nombre exacto **por confirmar**).
2. Los logos de facultad ya versionados se siembran como `logoPath`; `siglas` solo donde hay evidencia en el repositorio (FCEA, FHyCE, FACET); el resto queda vacío «por confirmar».
3. Acreditaciones: solo las que tienen fuente en §6.2, **una fila por carrera** (se deduplican las que aparecen en 2020 y 2025, citando todas las fuentes en `nota`). La facultad se asigna **solo** si la fuente la nombra; resoluciones y vigencias quedan **vacías**.
4. Todo lo sembrado nace con `verificado = false` y `active = false`; el PO los activa en el panel tras confirmar.
5. Ajustes de modelo respecto de §3.2: `acreditaciones.programa` (nombre, obligatorio) siempre existe y `carrera` (relación) es opcional, en lugar del «uno u otro»; `facultad` es opcional porque hay filas sin facultad confirmada; se omite `tipo` (acreditación/reacreditación, sin fuente) y se añaden `nivel` (grado/posgrado) y `ciclo`. `facultades` no recibe `logo` (upload) ni `orden`: solo `siglas` y `logoPath`. La carpeta de logos es `public/images/reconocimientos/` (no `premios`). `reconocimientos` tiene `verificado` a nivel de premio **y** por edición.

### 11.1 Implementado en la fase CMS (2026-10-23)

**Archivos:** `apps/cms/src/collections/{Reconocimientos,Acreditaciones}.ts` (nuevos), `Facultades.ts` (`siglas`, `logoPath`, `afterDelete`), `payload.config.ts` (registro), `utilities/validators.ts` y `hooks/audit/auditInstitutionalChange.ts` (nuevos), migración `20261023_223448_pra_01_premios_acreditaciones.{ts,json}` + `index.ts` + README, `payload-types.ts` (regenerado con `generate:types`, sin BD) y `packages/cms-types/src/payload-types.ts` (sincronizado con `scripts/sync-types.js`; el paquete estaba desactualizado, por eso el diff es grande), `app/api/revalidate/route.ts` (`reconocimientos`, `acreditaciones` en `ALLOWED_TAGS`), `scripts/seed-reconocimientos-acreditaciones.mjs` + `scripts/lib/premiosAcreditacionesData.mjs`, pruebas `tests/unit/pra-*.spec.ts`.

**Ajustes sobre el diseño:** `reconocimientos` añade `nota` interna (origen del logo y confirmación del PO); la auditoría escribe `crear|actualizar|eliminar` sin copiar contenido (verificado en la BD local: filas en `auditoria`); `logoPath` valida `^/images/<carpeta>/[A-Za-z0-9_-]+\.(png|jpe?g|webp)$`.

**Logo del premio (tarea C):** una sola petición GET a `https://www.conacyt.gov.py/sites/default/files/upload_editores/u38/00%20logo%20apc%20premio-02_0.jpg` (archivo enlazado desde `https://www.conacyt.gov.py/taxonomy/term/35`), 2026-10-23, User-Agent descriptivo: HTTP 200, `image/jpeg`, 87 636 bytes, JPEG 1200x1200 (magic `FFD8FF`, cierre `FFD9`; `Last-Modified` 14-12-2017). Guardado en `public/images/reconocimientos/premio-calidad-conacyt.jpg`; el contenido es el logo «Premio Nacional a la Calidad y Excelencia en la Gestión – República del Paraguay». Uso confirmado por el PO (2026-10-23). **Pendiente:** autorización o manual de marca de CONACYT (pregunta 2), si el PO la obtiene.

**Siembra (BD local, `http://localhost:3002`):** 1 reconocimiento con 2 ediciones (2016 Mención Especial / Pública Grande; 2025 «por confirmar» / Sector Público), 7 acreditaciones (4 con facultad respaldada por el Boletín ANEAES 2020; Medicina, Maestría en Didáctica y Esp. en Medicina Familiar sin facultad), 6 facultades con `logoPath` y `siglas` solo FCEA, FACET y FHyCE (evidencia: dominios institucionales y §6.2). Todo `active = false` y `verificado = false`; resoluciones y vigencias vacías. Segunda corrida: 0 creados.

**Faltan (fase siguiente):** consulta del portal, componente, orden en la portada, i18n, `defaultPopulate`; decisiones del PO: nombre exacto de la distinción 2025, ediciones 2019-2024, siglas de Agrarias/Medicina/Odontología, facultad de Medicina (el boletín dice «Ciencias de la Salud»), lista oficial vigente de acreditaciones con resolución y vigencia, y activar/verificar cada fila en el panel.

**Nota MIG-IMG fase 1 (2026-10-23):** los logos subidos a `media` ya pasan por la guardia de bytes y el tope de subida (10 MiB por defecto) y se guardan en el volumen local persistente (`MEDIA_STORAGE=local`), no en MinIO; el SVG ya no se admite en `media` (los logos deben ser JPG/PNG/WebP). El logo real `public/images/reconocimientos/premio-calidad-conacyt.jpg` se sube con 201 por REST y por el panel (RDD-MIG-IMG-42). Mientras el portal no tenga `resolveMediaUrl` (MIG-IMG §16.6), una `logo.url` relativa (`/api/media/file/…`) no se muestra: se sigue usando `logoPath`. Detalle en `docs/specs/migration/MIG-IMG-imagenes-de-noticias.md` §16.

## 12. Implementación fase 2 (portal) — PRA-02 (2026-10-23)

**Qué se construyó.** Consultas `lib/cms/queries/recognitions.ts` y `accreditations.ts` (con `lib/awards/logoPath.ts`), componente de servidor `components/home/AwardsAccreditationsSection.tsx`, inserción en `app/[locale]/page.tsx` entre `#transparencia` y `#institucional` (las dos consultas van dentro del `Promise.all` existente), claves `awards.*` en `messages/{es,en,gn,pt-BR}/pages.home.json` y pruebas `tests/unit/pra02-*.spec.ts`. Fondo `#001A00` con degradado final hacia `#004700` (inicio de la franja siguiente); logos sobre placa blanca; `Reveal` para la entrada (respeta `prefers-reduced-motion`); sin JavaScript propio.

**Regla de visualización (decisión PRA-02, aplica §3.3/§3.6).** El portal muestra una fila solo si el panel la marcó `active` **y** `verificado` (el `where` del CMS lo exige y el mapeo lo revalida). Reconocimiento: además, cada edición necesita su propio `verificado` y una `fuenteUrl` https. Acreditación: se oculta si `vigenciaHasta` es anterior a hoy; la vigencia (`hasta {año}`) se imprime solo si existe; `resolucion`, `ciclo` y `nota` no se piden ni se muestran. Una edición con distinción `por-confirmar` se muestra (año, categoría, fuente) **sin** chip de distinción: no se afirma lo no confirmado. Las acreditaciones sin facultad confirmada van en una tarjeta final «Otros programas acreditados», sin logo. Sin datos activos y verificados la sección no se emite; si el CMS cae devuelve `[]` y la portada sigue (nunca datos demo, tampoco en desarrollo).

**Límites y pendientes.** Solo se usa `logoPath` (archivo versionado `/images/...`); el logo subido a `media` queda para cuando se cierre MIG-IMG. El contador «Carreras acreditadas» **no** se derivó (decisión 6 del PO pendiente). La consulta pide `select` mínimo, `depth=1` y `populate` mínimo de `facultades`; `nota` interna no se descarga. Si cambia el texto de `organismo`/`modelo` en el CMS, ampliar el mapa de etiquetas del componente.

**Cómo hacer que aparezca (panel del CMS, rol superadmin o web-admin).**
1. Grupo «Premios y acreditaciones» → **Reconocimientos** → abrir el premio, confirmar nombre, logo y alt; en cada edición confirmar año, distinción (si «Por confirmar», elegir la real con el diploma) y fuente; marcar **Edición verificada** en cada edición que corresponda; marcar **Datos y logo verificados** y **Activo** en el premio; guardar.
2. **Acreditaciones** → por cada fila confirmar programa, facultad, sede, organismo, modelo y vigencia con su fuente; marcar **Datos verificados** y **Activa**; guardar.
3. La portada se actualiza sola por revalidación de etiqueta (`reconocimientos`, `acreditaciones`, `facultades`); si no, esperar el ciclo de caché.
Desmarcar **Activa** (o **verificado**) oculta la fila de inmediato.

**Rollback.** Quitar el bloque `<AwardsAccreditationsSection>` y las dos consultas de `page.tsx`; el resto es aditivo e inerte sin datos activos.
