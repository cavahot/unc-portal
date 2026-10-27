# CNV-01 — Convenios nacionales conectados al CMS

**Estado:** implementado en local (rama `security/rbac-foundation`), sin commit. **Ámbito:** páginas públicas
`/[locale]/convenios` (nacionales) y `/[locale]/convenios/internacionales`, colección Payload `convenios`, módulo
puro `lib/cms/convenios.ts`, consulta `lib/cms/queries/convenios.ts`, siembra `scripts/seed-convenios.mjs` con el
dataset generado `scripts/lib/conveniosSeedData.mjs` (nacionales e internacionales). **Fuera de alcance:** migrar
los PDF desde Google Drive al almacenamiento propio, corregir las erratas del contenido (las corrige el PO en el
panel, §8) y un campo `pais` para los internacionales (mejora futura: no se inventan países).

## 1. Problema y auditoría del estado anterior

Fuentes, descargadas una vez cada una el 24-10-26 con User-Agent `unc-portal-migration/1.0 (inventario autorizado)`
(HTML crudo fuera del repositorio): `https://www.unc.edu.py/convenios-nacionales/` (HTTP 200, 164 521 bytes) y
`https://www.unc.edu.py/convenios-internacionales-de-la-unc/` (HTTP 200, 124 454 bytes; 3 tablas, 44 filas, misma
estructura de 7 columnas, NO ordenada por año: 2014, 2011, 2010, 2011…).

### 1.1 Sitio publicado, columna por columna

| Columna del sitio | Qué contiene en realidad | Campo en el CMS | Decisión |
|---|---|---|---|
| Año | Entero de 4 cifras, 2005–2024 (faltan 2006 y 2008) | `year` (número, obligatorio) | Agrupa la lista; orden descendente |
| Denominación | Texto libre; 2 erratas («Covenio», «Colaboación»); la mayoría termina en punto | `title` | Verbatim; el punto final solo se omite al mostrar |
| Instituciones/Participantes | Texto libre; a veces con anexos y facultades; 8 erratas | `parties` | Verbatim |
| Fecha de Firma | Texto libre: «11 de Junio.», «Enero», «N», «diciembre, 2018»; la fila 2012 trae 3 fechas | `signedMonth` (texto) | Texto libre; NO se agrega fecha ISO (no mejora el orden: el orden es `year` + `orden`) |
| Duración | Texto libre: «5 Años.», «Indefinido.», «Hasta tanto culmine la obra.», «31 de Diciembre.» | `duration` (texto) | Texto libre |
| Finalidad del Convenio | Párrafo libre (hasta ~700 caracteres) | `objective` | Verbatim, completo (sin recortar) |
| Link | «Descargar» → Drive (92), un href con dos URL pegadas (1), host antiguo `softcon.wnpower.host` (1), sin enlace (12) | `driveUrl` | https + allowlist; el host antiguo no se migra (§3.2) |

Hallazgos de estructura: la «tabla» son 6 tablas Gutenberg consecutivas (108 `<tr>`): 106 filas con datos, 2 filas
vacías y 2 filas con 6 celdas (sin columna de enlace). Sin búsqueda, filtros, agrupación ni versión móvil
(la tabla de 7 columnas desborda en un teléfono). Mezcla 78 convenios institucionales/académicos con 28 acuerdos
comerciales de descuentos para estudiantes (2022–2024). Internacionales: 44 filas, 2010–2024, una sin finalidad
(2024, Salamanca) y duraciones como «0» o «____________»; ninguna es un acuerdo comercial (la regla lo confirma).

### 1.1.1 Enlaces «Descargar» (href exacto del HTML, `scripts/lib/driveLinks.mjs`)

| Motivo | Nacionales | Internacionales |
|---|---|---|
| `ok` (Drive `/file/d/<id>`) | 92 | 41 |
| `ok-href-pegado` (dos URL pegadas; se usa el primer id) | 1 (fila 12, 2012 Boquerón) | 0 |
| `host-no-permitido` (`softcon.wnpower.host`) | 1 (fila 52, 2019 CONATEL) | 2 (fila 1, 2014 Deusto; fila 24, 2019 Paraguay–Brasil) |
| `sin-enlace` (sin ancla) | 12 | 1 (fila 39, 2023 UFPR) |
| `carpeta` / `open?id=` / `uc?id=` | 0 | 0 (soportados y probados) |

Comprobación de disponibilidad (24-10-26, 1 petición/s, solo la página `/view`, sin descargar archivos; CSV en el
scratchpad): de 134 enlaces, 119 `ok` (título con nombre de archivo), 14 `privado` (HTTP 401: piden acceso; todos
nacionales de 2023, filas 82, 85, 86 y 88–98) y 1 `no-encontrado` (HTTP 404: fila 12, 2012 Boquerón; el segundo
id pegado también da 404). Sin limitación ni CAPTCHA.

Duplicados del origen: filas nacionales 38 y 40 (2016, FCA y Asociación de Docentes, «04/4 de Noviembre»): el
mismo convenio cargado dos veces (una sin enlace). Se siembran ambas (verbatim) y se listan para el PO. Las filas 72
y 73 (2023, MSPyBS) son convenios hermanos de dos facultades, no duplicados. Otras coincidencias son renovaciones
de años distintos. La fila nacional 5 (2009, Universidade Federal da Grande Dourados, Brasil) parece internacional.

### 1.2 Portal antes de CNV-01 (verificado en el código)

| Aspecto | Estado anterior | Riesgo |
|---|---|---|
| Datos | La BD local tenía 0 convenios; en desarrollo se veían 29 filas `DEMO_CONVENIOS` con `REEMPLAZAR_CON_ID_REAL` | Datos ficticios con apariencia institucional |
| Lectura | `access.read: () => true` | SEC-10: un anónimo lee por REST/GraphQL las filas con `active=false` |
| Enlaces | `driveUrl` sin validación en el CMS; el portal solo pasaba `safeHref` | Un enlace http o a un host ajeno se publicaría con la marca UNC |
| Consulta | `limit=100` (el sitio ya tiene 106), sin `select`, lanzaba error en producción | Filas perdidas y página de error ante una caída |
| Diseño | Fondo `slate-950` ajeno a la identidad, tarjetas con `line-clamp` que cortaban la finalidad, pestañas client-only | Contenido truncado, sin búsqueda ni agrupación |
| Auditoría | Sin hook de auditoría | Cambios sin rastro |
| Seed | 29 filas tipeadas a mano con enlaces falsos | No reproducible |

## 2. Comportamiento

1. **Fuente única:** las páginas leen solo el CMS. Sin datos de demostración en ningún entorno (se eliminan
   `DEMO_CONVENIOS` y el uso de `demoFallbackAllowed` para convenios).
2. **Estados** de `getConveniosPage(type)`: `ok` (≥1 fila activa), `empty` (el CMS respondió sin filas) y
   `unavailable` (red caída, 5xx o forma inesperada). Nunca lanza: la página no da 500.
3. **Consulta:** `where[active][equals]=true` + `where[type][equals]=<tipo>`, `select` mínimo, `limit=500`, etiqueta
   ISR `convenios` y revalidación de seguridad de 1 h.
4. **Agrupación:** por año descendente; dentro del año por `orden` ascendente y luego por denominación.
5. **Búsqueda** (isla cliente sobre HTML ya renderizado): sin tildes ni mayúsculas, todas las palabras (AND) sobre
   denominación + participantes + finalidad + año; contador `aria-live`; botón «Borrar»; Escape limpia; estado
   en la URL (`?q=`, `?categoria=`, `?anio=`), máximo 100 caracteres, nunca viaja al CMS.
6. **Filtros:** categoría (Todos / Institucionales / Beneficios para estudiantes) y año (selector). Se combinan
   con la búsqueda. Resultado vacío: mensaje con la consulta y botón «Ver todos los convenios».
7. **Enlace del documento:** solo si pasa `safeHref` y la allowlist exacta de hosts; botón «Ver documento» con
   nombre accesible «Ver documento: <denominación> (se abre en una pestaña nueva)», `target=_blank`,
   `rel="noopener noreferrer"`. Sin enlace válido: texto «Documento no disponible».
8. **Selector Nacionales / Internacionales:** dos enlaces reales (`/convenios`, `/convenios/internacionales`), URL
   compartible y sin JS; misma vista con `type=internacional`. El título, la introducción y el resumen («104 convenios
   nacionales · 2005–2024» / «45 convenios internacionales · 2009–2024») dependen de la pestaña; búsqueda y filtros
   aplican por pestaña; el filtro de categoría se oculta si la pestaña no tiene acuerdos de beneficios.

### 2.1 Diseño (decisiones)

- **Portada:** campo plano `#004700` (sin degradados ni manchas difusas, regla anti-plantilla), migas
  `Inicio / Institucional / Convenios nacionales` (en `navigation.ts` «Convenios» cuelga de Institucional), título
  serif, una frase de contexto y el conteo real calculado de los datos («104 convenios nacionales · 2005–2024»).
- **Firma:** «registro por año», una tira de columnas, una por año del período, con altura proporcional a la
  cantidad y dos tonos (institucional / beneficios). Cada columna es un enlace al año. Cuenta algo cierto de los
  datos (el pico de 2023 es por los acuerdos comerciales) y sirve de índice. Solo en pantallas anchas.
- **Lista:** desde `lg` una `<table>` real con `<caption>`, `<th scope="col">` y un `<tbody>` por año cuyo
  encabezado es `<th scope="rowgroup">`. 6 columnas: el año, que en el sitio es la 1.ª columna, pasa a ser el
  encabezado del grupo. Debajo de `lg` la misma tabla se apila en tarjetas con CSS (`display:block` y
  `data-label` en cada celda), así la semántica de tabla se mantiene en el DOM (RDD-CNV-06).
- **Controles e índice de años:** barra de búsqueda/filtros arriba y fila de chips de años pegajosa en todos los
  anchos. Se descartó la columna lateral de /marco-legal: con 6 columnas a 1440 px la denominación se partía palabra
  por palabra (visto en captura); la tabla necesita el ancho completo.
- **Aparición:** CSS `.lt-reveal` (animation-timeline) solo en el encabezado de cada año; sin soporte, sin JS o con
  `prefers-reduced-motion` todo se ve desde el inicio (no se usa `Reveal`, RDD-MLG-05).
- **Impresión:** sin portada de color ni controles; la tabla se imprime completa con la URL de cada documento.

## 3. Modelo de datos (colección `convenios`)

| Campo | Tipo | Notas |
|---|---|---|
| `title`, `type`, `year`, `parties`, `objective`, `signedMonth`, `duration` | sin cambio de nombre | Se conservan los nombres existentes (renombrar rompería datos) |
| `objective` | textarea, ahora **opcional** | Migración `cnv_01`: `DROP NOT NULL` (una fila internacional sin finalidad; la página muestra «Sin finalidad registrada») |
| `driveUrl` | texto | **Nuevo:** `validateAllowedHostUrl` con `CONVENIOS_ALLOWED_HOSTS` |
| `categoria` | select `institucional` \| `beneficios`, opcional, por defecto `institucional` | Nuevo |
| `nota` | textarea ≤ 280 | Nuevo; aclaración pública breve |
| `orden` | número, por defecto 99 | Nuevo; posición dentro del año |
| `active` | checkbox «Publicado» | Nombre real verificado en el código: `active` (etiqueta antes «Activo») |

### 3.1 Acceso

`read: readActiveOrInstitutional` (SEC-10), `create/update/delete: canWriteInstitutional` (sin cambio). Hooks:
auditoría `afterChange`/`afterDelete` y `revalidatePortalTag('convenios')`.

### 3.2 Enlaces

Hosts permitidos (exactos): `drive.google.com`, `docs.google.com`, `www.unc.edu.py`, `unc.edu.py`. El enlace a
`softcon.wnpower.host` (fila 2019 CONATEL) **no** se migra: la fila se siembra sin enlace con la nota pública
«Documento pendiente de nueva carga.» para que el PO vuelva a subir el archivo.

### 3.3 Categorías

`beneficios` = acuerdos comerciales de descuentos/beneficios con comercios locales; `institucional` = todo lo
demás. Nombres de valor cortos y estables; la etiqueta visible la puede cambiar el PO. Regla inicial en
`scripts/lib/conveniosClassify.mjs` (RDD-CNV-04).

## 4. Escenarios (Given / When / Then)

1. **Lista completa:** Given 104 filas activas nacionales, When un anónimo abre `/convenios`, Then ve 104 filas en
   18 grupos de año, de 2024 a 2005, y el texto «104 convenios nacionales · 2005–2024».
2. **Búsqueda sin tildes:** Given la lista, When escribe «becas», Then ve 3 resultados y el lector de pantalla oye
   «3 convenios para "becas"»; con «MSPyBS», 2.
3. **Filtro de categoría:** When elige «Beneficios para estudiantes», Then ve 28 filas (2022–2024).
4. **Filtro de año:** When elige 2014, Then ve 10 filas.
5. **Sin resultados (negativo):** When busca «zzzz», Then ve «Ningún convenio coincide con "zzzz"» y un botón que
   restablece todo.
6. **Retiro (negativo):** Given un convenio con `active=false`, When un anónimo consulta `GET /api/convenios`,
   Then no lo recibe; un `superadmin`/`web-admin` sí. La página deja de mostrarlo tras la revalidación.
7. **Escritura anónima (negativo):** When un anónimo hace `POST /api/convenios`, Then 403.
8. **Enlace ajeno (negativo):** When un editor institucional guarda `driveUrl` = `http://…`, `javascript:…`,
   `https://drive.google.com.evil.example/…` o `https://softcon.wnpower.host/…`, Then el CMS rechaza con un mensaje
   en español; si una fila antigua lo tuviera, el portal muestra «Documento no disponible».
9. **CMS caído (negativo):** When el CMS no responde, Then la página muestra el aviso neutro de indisponibilidad
   (200, sin datos inventados).
10. **Seed idempotente:** When se ejecuta dos veces, Then la segunda crea 0 filas y no modifica ninguna existente;
    `--fill-empty` solo completa `nota`/`driveUrl` vacíos y nunca reemplaza un valor del PO.
11. **Internacionales:** When se abre `/convenios/internacionales`, Then ve 45 filas en 15 años (2024→2009) aunque el
    origen no esté ordenado; sin datos, el estado vacío ofrece volver a Nacionales.

## 5. Datos sembrados

Sembradas 150 filas `active=true`; tras las decisiones del PO (§9) quedan 149: 104 nacionales (76 `institucional`, 28 `beneficios`; 92 con enlace, 12 sin enlace) y 45
internacionales (todas `institucional`; 42 con enlace, 3 sin enlace). Toda fila sin enlace lleva la nota pública
«Documento pendiente de carga.». `sourceHref` (href exacto) y `sourceRow` quedan en el dataset como procedencia y no
se envían al CMS. Internacionales por año: 2009:1, 2010:1, 2011:3, 2013:1, 2014:5, 2015:2, 2016:1, 2017:3, 2018:4, 2019:8,
2020:1, 2021:1, 2022:5, 2023:4, 2024:5. Nacionales por año: Por año: 2005:1, 2007:2, 2009:2, 2010:2, 2011:3,
2012:5, 2013:5, 2014:10, 2015:4, 2016:4, 2017:4, 2018:7, 2019:4, 2020:2, 2021:2, 2022:12, 2023:27, 2024:8.
Clave natural del seed: `type + year + title + parties` (exacta). El seed nunca pisa filas existentes.

## 6. RDD — afirmación → evidencia

| ID | Afirmación | Evidencia | Límite |
|---|---|---|---|
| RDD-CNV-01 | El sitio publica 106 convenios nacionales en una tabla de 7 columnas sin filtros. | HTML descargado el 24-10-26; parser: 6 tablas, 108 `<tr>`, 106 con datos; test `conveniosSeedData` = 106. | Foto de esa fecha; el sitio puede cambiar. |
| RDD-CNV-02 | `access.read: () => true` exponía filas retiradas. | `apps/cms/src/collections/Convenios.ts` (versión anterior, línea 17). | Corregido con `readActiveOrInstitutional`; test de acceso. |
| RDD-CNV-03 | El portal mostraba datos ficticios en desarrollo. | `lib/cms/queries/convenios.ts` anterior: `DEMO_CONVENIOS` con `REEMPLAZAR_CON_ID_REAL`; BD local con 0 filas. | — |
| RDD-CNV-04 | 28 filas son acuerdos comerciales de beneficios. | Regla `classifyConvenio` + test que la aplica a cada fila; lista en el informe. | Heurística; el PO puede reclasificar en el panel. El PO estimaba ~40: el conteo verificable es 28. |
| RDD-CNV-05 | Un enlace del sitio apunta a `softcon.wnpower.host` y otro tiene dos URL pegadas. | Parser (`report.json` en el scratchpad): fila 2019 CONATEL; fila 2012 Boquerón. | Del href pegado se conserva el primer id (el que abre el navegador). |
| RDD-CNV-06 | Una tabla real con `<caption>`/`th scope` es accesible y se puede apilar en móvil con CSS sin perder semántica. | WAI Tables Tutorial (W3C) para `scope="rowgroup"`; las celdas conservan `role` implícito salvo `display:block` en algunos motores: se agregan `role="row"`/`role="cell"` explícitos en la vista apilada. | No se probó con lectores de pantalla reales. |
| RDD-CNV-08 | 15 documentos de Drive no son públicos o no existen. | Comprobación paced del 24-10-26 (CSV en el scratchpad). | Foto de esa fecha; Drive puede responder distinto con sesión iniciada. |
| RDD-CNV-07 | `.lt-reveal` no oculta contenido sin soporte de `animation-timeline`. | `app/globals.css` LT-01 (bajo `@supports` y `prefers-reduced-motion: no-preference`). | — |

## 7. Rollback

Revertir los archivos de CNV-01; la migración `cnv_01` tiene `down` que elimina solo `categoria`, `nota` y `orden`
(y el tipo enum). Las filas sembradas se retiran desmarcando «Publicado» o borrándolas desde el panel.

## 8. Decisiones pendientes del PO

1. ~~Corregir las erratas listadas en el informe~~ — resuelto: §9.1.
2. Volver a subir los documentos sin enlace (15 filas tras borrar el duplicado, §9.2) y revisar la fila 2012 Boquerón (dos URL pegadas, ambas 404).
   Volver a compartir como «Cualquier persona con el enlace» los 14 documentos privados de 2023.
6. ~~Duplicado 2016 y fila UFGD~~ — resuelto: §9.2 y §9.3.
3. (Confirmado, §9.4) Confirmar las 28 filas `beneficios` y la etiqueta «Beneficios para estudiantes» (la fila 2022 de transporte también beneficia a funcionarios).
4. (Siguen publicados, §9.4) Decidir si los acuerdos comerciales vencidos (duración 1 año, 2022–2024) siguen publicados.
5. Migrar los PDF de Drive al almacenamiento de la UNC (dependencia de terceros).

## 9. Decisiones del PO 2026-10-24

Decididas por el Product Owner y aplicadas con TDD (`tests/unit/convenios-corrections.spec.ts`). La capa vive en
`scripts/lib/conveniosCorrections.mjs` (tabla revisada: tipo + `sourceRow`, valor verbatim en `antes`); el dataset conserva
el texto original en `CONVENIOS_*_ORIGEN` y `CONVENIOS_NACIONALES`/`CONVENIOS_INTERNACIONALES` son el resultado ya corregido.
La procedencia (`original`, `reclasificadoDesde`) solo existe en el dataset, no en el CMS.

1. **Erratas corregidas directamente (47 campos en 43 filas).** Solo ortografía, tildes, signos, espacios y conectores; los
   valores de relleno «N», «____________» y «0» pasan a vacío; el prefijo «‘- » de las finalidades 2012 y 2014 Boquerón se
   quita. No se reescribe el sentido ni se agregan hechos. Se agregaron tres arreglos que el informe no listaba y que son del
   mismo tipo: tildes de «Convenio Específico de Cooperación» en las filas internacionales 2020 y 2021 (mismo título que la
   nacional 2021). Dejados sin tocar por ambigüedad: «Nacional» en «Universidad Nacional Latinoamericana S.C (México)» (podría
   sobrar) y «Tecnologicas» en la fila 2022 de Exactas (no estaba en la lista).
2. **Duplicado borrado.** 2016, «UNC – FCA y Asociación de Docentes de la FCA»: las filas de origen 38 («04 de Noviembre») y 40
   («4 de Noviembre») carecían de enlace; se borró la posterior (fila 40) y se conserva la 38. `CONVENIOS_DUPLICADOS_EXCLUIDOS`
   impide que el seed la recree.
3. **Traslado.** 2009, Universidade Federal da Grande Dourados (Brasil; primera enmienda 25/06/2010), fila de origen nacional 5,
   pasa a internacionales (`orden` 1 de 2009; conserva enlace y categoría `institucional`).
4. **Confirmado:** las 28 filas `beneficios` y que los acuerdos comerciales vencidos siguen publicados (sin cambios).
5. **Aplicación en la BD:** `scripts/apply-convenios-corrections.mjs` (idempotente, solo localhost salvo `--allow-remote`
   https; busca por clave original verbatim o ya corregida; omite y informa campos que el PO editó; nunca toca `active`,
   `categoria`, `nota` ni `driveUrl`). El seed también reconoce la clave original: una BD sin corregir no recibe copias.
6. **Conteos resultantes:** 149 filas = 104 nacionales (76 `institucional`, 28 `beneficios`; 2005–2024, 18 años) + 45
   internacionales (todas `institucional`; 2009–2024, 15 años). Con enlace: 92 nacionales y 42 internacionales.
