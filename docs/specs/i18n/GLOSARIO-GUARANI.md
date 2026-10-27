# GLO-GN-01 — Glosario guaraní en el CMS, actualizador de fuentes oficiales y revisión de catálogos `gn`

**Estado:** implementado en local (rama `security/rbac-foundation`), sin commit. **Pedido del PO (25-10-2026):** «Usa todo lo que puedas para la traducción en guaraní y crea tu propio glosario dentro de la BD para la traducción y un script para impactar y actualizar tu vocabulario solo sobre fuentes oficiales.»
**Regla permanente:** todo contenido queda enlazado CMS + BD + portal. **Límite declarado:** ninguna traducción de este cambio fue revisada por un hablante nativo; ver `GUARANI-REVISION.md`.

## 1. Problema y alcance

| | |
|---|---|
| Problema | Los catálogos `messages/gn/*.json` tenían 435 de 1.156 cadenas idénticas al español y no había un vocabulario controlado: cada traductor decidía la forma guaraní de «universidad», «estudiante», etc. El glosario del PO (128 términos con fuente y confianza) vivía fuera del repositorio y de la BD. |
| Usuarios | PO / superadmin y web-admin (mantienen el glosario en el panel); traductores y revisores nativos (consultan); visitantes de `/gn` (leen las cadenas). |
| Dentro | Colección `glosario-guarani` (privada), migración, siembra desde el CSV del PO, actualizador de fuentes oficiales con política probada, biblioteca pura de cobertura de términos, revisión y traducción de catálogos `gn`, pruebas de paridad y ortografía, hoja de revisión para hablante nativo. |
| Fuera | Publicar el glosario en el portal (es una herramienta interna); traducción automática; importar corpus de investigación (Jojajovai) de forma automática; fijar normas ortográficas que corresponden a la ALG; contenido del CMS (noticias, convenios) en guaraní. |

## 2. Modelo de datos (`apps/cms/src/collections/GlosarioGuarani.ts`)

| Campo | Tipo | Regla | Por qué |
|---|---|---|---|
| `terminoEs` | texto, obligatorio, índice, máx. 200 | — | Término de búsqueda en español (puede llevar acepción entre paréntesis: «técnico (persona)»). |
| `terminoGn` | texto, máx. 300 | vacío permitido | Vacío = «sin evidencia» (confianza X): el término se registra como laguna, no se inventa. |
| `variantesGn` | arreglo de `{ valor }` | máx. 200 c/u | Formas alternativas atestiguadas (plural, sinónimos de la fuente). |
| `tipo` | select | `diccionario`, `oficial`, `prestamo`, `neologismo`, `institucional`, `corpus`, `localizacion` | `corpus` y `localizacion` se agregan porque el CSV del PO los usa (41 y 1 filas). |
| `categoria` | select opcional | `universidad`, `academico`, `administrativo`, `tecnologia`, `general` | Filtro del panel. |
| `fuente` | texto, obligatorio, máx. 300 | — | Nombre de la fuente tal como la cita el PO. |
| `fuenteUrl` | texto | https + host **exacto** en la lista oficial (§4) | Solo una URL oficial puede respaldar una entrada `oficial`. |
| `evidenciaUrl` | texto | https sin credenciales (cualquier host) | URL de evidencia **no oficial** (Jojajovai, Dialnet, Wikipedia). Separarla evita que un corpus se haga pasar por fuente oficial. |
| `confianza` | select obligatorio | `A`, `B`, `C`, `X` | Escala del §5. `C` existe porque el CSV del PO la usa (10 filas). |
| `oficial` | checkbox | si es `true`, `fuenteUrl` es obligatoria y oficial | Marca de procedencia oficial. |
| `revisado` | checkbox, `false` por defecto | — | Revisión por hablante nativo / PO. El actualizador y la siembra nunca tocan una fila revisada. |
| `origen` | select | `glosario-po`, `actualizador`, `panel` (por defecto) | Permite que el actualizador modifique solo sus propias filas. |
| `fechaConsulta` | fecha | — | Fecha de consulta/importación de la fuente. |
| `nota` | textarea, máx. 2.000 | — | Acepción, advertencias, «pendiente de revisión». |
| `activo` | checkbox, `true` | — | Retirar sin borrar. |

- **Unicidad:** índice único compuesto (`terminoEs`, `fuente`): el mismo término puede tener una fila por fuente; nunca dos de la misma fuente.
- **Acceso:** lectura, alta, edición y borrado **solo** `superadmin` y `web-admin` (`canWriteInstitutional`). Anónimo y demás roles: denegado (no es contenido público).
- **Auditoría:** `makeAuditAfterChange/AfterDelete('glosario-guarani', …)`. Sin revalidación del portal (el portal no lee esta colección).
- **Migración:** `20261025_190000_glo_gn_01_glosario_guarani` (idempotente; `down` se niega si hay filas).

## 3. Siembra (`scripts/seed-glosario-guarani.mjs`)

- Datos: `scripts/lib/glosarioGnSeedData.mjs`, **generado** por `scripts/lib/generate-glosario-gn-seed.mjs` a partir de `glosario_es_gn.csv` (parser CSV propio con comillas y BOM; cabecera de procedencia: archivo, fecha, filas). La ruta del PO es solo el valor por defecto documentado del argumento `--csv`.
- Mapeo: URL del CSV en host oficial → `fuenteUrl` y `oficial=true`; en otro host → `evidenciaUrl` y `oficial=false`. `origen=glosario-po`, `revisado=false`, `fechaConsulta=2026-10-11` (fecha de consulta declarada por el PO en `fuentes_guarani.md`).
- Idempotente por (`terminoEs`, `fuente`); solo crea, nunca modifica; `--dry-run` sin red; solo localhost salvo `--allow-remote` (https); `requireCmsPassword`; pausa entre escrituras.

## 4. Fuentes oficiales y actualizador (`scripts/update-glosario-guarani.mjs`)

**Lista de hosts oficiales** (exacta, sin comodines), con la evidencia de dónde salen:

| Host | Institución | Evidencia (archivos del PO) |
|---|---|---|
| `www.datos.gov.py`, `datos.gov.py` | Portal de Datos Abiertos del Gobierno (dataset de la SPL) | `fuentes_guarani.md` fila 1 |
| `repositorio.conacyt.gov.py` | Repositorio del CONACYT (libro y diccionario de Yvy Marãe'ỹ/CONACYT 2017) | `fuentes_guarani.md` fila 2 |
| `spl.gov.py`, `www.spl.gov.py` | Secretaría de Políticas Lingüísticas (portal de diccionarios) | `fuentes_guarani.md` §2 |

**Excluidos a propósito:** sitio de la ALG (el PO no localizó un sitio oficial verificable: `fuentes_guarani.md` §2), `www.conacyt.gov.py` (sin evidencia de recurso léxico en los archivos del PO), GitHub/Jojajovai, Dialnet, Wikipedia y traductores automáticos (no oficiales). Agregar un host exige decisión del PO y una prueba.

**Política (funciones puras, probadas en `tests/unit/glosario-guarani-updater.spec.ts`):**
1. Registro (`scripts/lib/glosarioSources.mjs`): cada fuente tiene `id`, `nombre`, `url`, `kind` (`ckan` | `file` | `page`), formato, licencia y `minIntervalMs`. Un registro con host fuera de la lista no carga (falla cerrada).
2. Modo por defecto `--dry-run` (muestra el diff sin escribir); `--apply` escribe por REST en el CMS local (o remoto https con `--allow-remote`).
3. Descarga cortés: User-Agent `unc-portal-glosario/1.0 (actualización autorizada de vocabulario oficial)`, ≥ 1 s entre pedidos (10 s en datos.gov.py por su `robots.txt`, según el PO), tiempo límite 30 s, tope 25 MB, tipos `text/csv`, `application/csv`, `application/json`, `text/plain`; TLS verificado (se niega si `NODE_TLS_REJECT_UNAUTHORIZED=0`); redirecciones seguidas a mano solo dentro de la lista. `xlsx`/`pdf`: **manual** (sin dependencias nuevas no hay parser).
4. Reglas de fusión: la fila del actualizador lleva `oficial=true`, `confianza=A`, `origen=actualizador`, `fuente`=nombre del registro, `fuenteUrl`, `fechaConsulta`. Nunca modifica filas `revisado=true` ni filas de otro `origen` (las del PO y las del panel); si la glosa oficial ya existe en otra fila del mismo término → `ya-cubierto`; si difiere → crea su fila con `nota` «Pendiente de revisión: …» y la informa como `conflicto`; si su propia fila cambia → agrega la glosa nueva como variante y marca pendiente (no reemplaza). Idempotente.
5. `--file <ruta> --source <id>`: usa una copia descargada a mano de un recurso **del registro** (cuando el sitio oficial no responde desde la red de la UNC). El informe lo declara.
6. Informe JSON fuera de git: `--report-dir` (por defecto `%TEMP%/unc-portal-glosario/`), `update-report-<fecha>.json`; se niega a escribirlo dentro del repositorio.

## 5. Escala de confianza

| Nivel | Significado | Uso en traducción |
|---|---|---|
| A | Entrada de diccionario/vocabulario oficial (SPL, CONACYT) o rótulo coincidente en fuente ALG | Obligatorio salvo acepción distinta (anotada) |
| B | Corpus humano o diccionario con salvedades, varias fuentes coincidentes | Preferido |
| C | Una sola aparición o alineación dudosa | Solo con marca de incertidumbre |
| X | Sin evidencia | No inventar: préstamo ya usado o término en español |

## 6. Catálogos `gn` (biblioteca `scripts/lib/glosarioGn.mjs`)

- Encuentra términos del glosario en una cadena española (sin tildes ni mayúsculas, coincidencia más larga, palabras completas) y devuelve las formas guaraníes exigidas; informa lagunas.
- Ortografía adoptada: puso = apóstrofo ASCII `'` (U+0027), igual que el CSV del PO y que las 582 apariciones previas de los catálogos; vocales nasales precompuestas `ã ẽ ĩ õ ũ ỹ` en NFC; `g̃` = `g` + U+0303; prohibidos `ä ë ï ö ü ÿ`, `ĝ`, `’ ‘ ´ ꞌ`. En ICU un `'` antes de `{`, `}` o `#` abre un literal: la prueba lo prohíbe.
- Se conservan marcadores ICU, etiquetas HTML, URL, números y nombres propios (UNC, MITIC, ANEAES, CONACYT, Drive, PDF, «Universidad Nacional de Concepción»).

## 7. Escenarios (Given/When/Then)

| # | Given | When | Then |
|---|---|---|---|
| 1 | visitante anónimo | GET `/api/glosario-guarani` (REST/Local API) | acceso denegado (`read` = false) |
| 2 | usuario `editor`, `publisher`, `reviewer`, `correspondent`, `media-manager`, `auditor`, `viewer` | leer o escribir | denegado |
| 3 | `superadmin` o `web-admin` | crear/leer/editar | permitido y queda fila en `auditoria` |
| 4 | `fuenteUrl = https://github.com/…` | guardar | rechazo «Dominio no permitido» (negativo) |
| 5 | `fuenteUrl = http://www.datos.gov.py/…` o `https://www.datos.gov.py.evil.example/` | guardar | rechazo (negativo) |
| 6 | `oficial = true` sin `fuenteUrl` | guardar | rechazo |
| 7 | dos filas con el mismo `terminoEs` y `fuente` | crear la segunda | la BD la rechaza (índice único) |
| 8 | CSV del PO de 128 filas | sembrar dos veces | 128 creadas, luego 0 creadas / 128 existentes |
| 9 | fila con `revisado = true` o `origen = glosario-po` | el actualizador trae otra glosa | la fila no cambia; se informa `conflicto` |
| 10 | registro con host no oficial o redirección a host ajeno | ejecutar el actualizador | se niega antes de descargar / al redirigir (negativo) |
| 11 | respuesta > 25 MB o tipo `text/html` | descargar | se aborta (negativo) |
| 12 | sitio oficial caído | `--dry-run` | informe con `inalcanzable`, sin escribir y sin probar otros sitios |
| 13 | catálogo `gn` | pruebas | mismas claves que `es`, mismos marcadores ICU y etiquetas, ninguna cadena vacía, sin mezcla de apóstrofos ni `'` delante de `{` |

## 8. RDD — afirmación → evidencia

| Afirmación | Evidencia | Límite |
|---|---|---|
| El vocabulario SPL está en datos.gov.py con licencia de información pública | `fuentes_guarani.md` fila 1 (PO, 11-10-2026) | El 25-10-2026 `www.datos.gov.py` devolvió la página de error genérica (HTTP 404, «Ha ocurrido un error») para la API CKAN, la ficha del dataset, `robots.txt` y el CSV; `datos.gov.py` redirige 301 a `www`. No se probó otro sitio. |
| El CSV SPL trae vocales nasales degradadas (ä ë ï ü ÿ) | `notas_ortografia.md` fila 10; `fuentes_guarani.md` §4.1 | Observación del PO; el actualizador normaliza y lo declara en la nota |
| La ALG fija la ortografía (Ley 4251/2010, arts. 45–46) | `notas_ortografia.md` fila 1 | Solo versión francesa de la ley |
| No hay sitio oficial verificable de la ALG | `fuentes_guarani.md` §2 | Puede existir; requiere verificación del PO |
| Jojajovai es un corpus de investigación (MIT), no fuente oficial | `fuentes_guarani.md` fila 3 | Se usa solo como evidencia (`evidenciaUrl`) |
| El puso se escribe con un carácter único | `notas_ortografia.md` fila 8; `critica_v2.md` | La ALG no fija el carácter Unicode; se eligió U+0027 por coherencia con el CSV y el catálogo |
| La versión «guaraní» de www.unc.edu.py es traducción automática | `fuentes_guarani.md` §3 | No usada |

## 9. Pasos en el panel (PO)

Ver la sección 10 («Panel»).

## 10. Uso

```text
# Siembra (CSV del PO -> CMS local)
node scripts/lib/generate-glosario-gn-seed.mjs --csv "<ruta>\glosario_es_gn.csv"   # regenera el dataset versionado
node scripts/seed-glosario-guarani.mjs --dry-run
CMS_EMAIL=... CMS_PASSWORD=... node scripts/seed-glosario-guarani.mjs

# Actualizador de fuentes oficiales
node scripts/update-glosario-guarani.mjs                       # --dry-run implícito: muestra el diff
node scripts/update-glosario-guarani.mjs --source spl-vocabulario-es-gn --apply
node scripts/update-glosario-guarani.mjs --source spl-vocabulario-es-gn --file "<copia oficial>.csv" --apply
node scripts/update-glosario-guarani.mjs --list-sources
```

**Panel** (`/accesoSeguro` → grupo «Traducción» → «Glosario guaraní»):
1. Filtrar por `Revisado = No` y `Confianza`; abrir una entrada, corregir `Término en guaraní`/variantes y marcar **Revisado** (desde ese momento ningún script la toca).
2. Agregar un término: «Crear nuevo», completar término, fuente (texto) y, si es oficial, la URL oficial; si la evidencia es un corpus, usar «URL de evidencia (no oficial)».
3. Conflictos del actualizador: buscar «Pendiente de revisión» en la nota; decidir cuál forma vale, editar y marcar Revisado (o desmarcar «Activo»).

## 11. Resultados de la ejecución local (25-10-2026)

- Siembra contra `http://localhost:3002`: 1.ª ejecución 128 creadas, 0 errores; 2.ª ejecución 0 creadas, 128 existentes. Anónimo: GET/POST → 403. Duplicado (`terminoEs`+`fuente`), `fuenteUrl` de GitHub y `oficial` sin URL → 400.
- Actualizador, `--dry-run` (dos intentos): `spl-vocabulario-es-gn` **inalcanzable** (API CKAN y CSV de respaldo: HTTP 404 con la página de error genérica del portal); `conacyt-diccionario-informatico` y `spl-portal-diccionarios`: **manual** (PDF/HTML). No se ejecutó `--apply`: no hubo datos oficiales que aplicar.
- Catálogos `gn`: 355 cadenas registradas en `GUARANI-REVISION.md` (232 traducidas, 73 correcciones de traducciones previas, 31 ortográficas, 19 de estructura); incertidumbre alto 143, medio 129, bajo 64.
- Hallazgo: los rótulos del menú principal (Inicio, Institucional, Facultades…) no salen de `nav.json` sino del global `navegacion` del CMS (o del respaldo en `lib/cms/queries/navigation.ts`), sin campo guaraní: en `/gn` siguen en español aunque `nav.items.*` esté traducido.

## 12. Decisiones pendientes del PO

1. Confirmar el carácter del puso (U+0027 hoy; U+A78C lo usa el libro de Yvy Marãe'ỹ y la traducción v2 del PO).
2. Confirmar la lista de hosts oficiales (¿agregar el sitio de la ALG si existe uno verificable? ¿`www.conacyt.gov.py`?).
3. Revisión nativa de las cadenas marcadas `alto` en `GUARANI-REVISION.md` antes de publicar `/gn`.
4. Obtener el CSV del vocabulario SPL desde otra red (o pedirlo a la SPL) y aplicarlo con `--file`.
5. Traducir el menú principal: agregar rótulos por idioma al global `navegacion` (cambio de modelo del CMS) o usar `nav.items.*` del catálogo.
6. Autorizar una revisión nativa de **todo** el catálogo `gn` (la traducción previa tiene errores de sentido, no solo las cadenas de este cambio).
