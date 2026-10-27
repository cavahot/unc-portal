# Bitácora — Migración de noticias WordPress → Portal UNC

**Estado:** registro cronológico, abierto. Última actualización: 2026-10-23. Es un documento de consulta: no autoriza ejecutar nada. Regla de redacción: solo se afirman hechos verificables en el repositorio o dichos en el encargo del Product Owner; lo demás se marca **por confirmar**. No contiene credenciales ni datos personales.

**Documentos hermanos:** `docs/specs/migration/MIG-IMG-imagenes-de-noticias.md` (imágenes y decisiones D1-D4), `docs/research/evidence-register-mig-img.md`, `docs/specs/editorial/SEC-03-D0-revisor-publica.md` y `docs/specs/editorial/FLUJOGRAMA-EDITORIAL.md` (flujo editorial).

## 1. Cronología

| # | Fecha | Paso | Evidencia / estado |
|---|---|---|---|
| 1 | 2026-08-08 | El repositorio ya tenía una carga inicial de **271 noticias** como datos semilla del CMS. | Commit `ca6b463` «add initial seed data (271 noticias, 2026-08-08)». Las 271 noticias heredadas no tienen autor (`createdBy` nulo) según `docs/manual/ROLES-Y-PERMISOS.md`. |
| 2 | 2026-10 (fecha exacta por confirmar) | **Revisión del volcado/XML de WordPress**: **273 entradas publicadas**, tablas con prefijo `uncm1_`, y regla de zona horaria `America/Asuncion` (opción `timezone_string` del sitio). | Cifra 273 y prefijo: encargo del PO; el script lee el XML de phpMyAdmin con prefijo `uncm1_` (`scripts/migrate-wordpress.mjs`, cabecera). Zona: `SITE_TIME_ZONE = 'America/Asuncion'` en `scripts/lib/wpContent.mjs`. **Diferencia 273 frente a 271 por confirmar** (qué dos entradas no estaban en la semilla). |
| 3 | 2026-10 (por confirmar) | **Recuperación de imágenes 2024-2026**: 237 imágenes descargadas **fuera del repositorio** (`Downloads\Plataforma\wp-migration\uploads\`) y verificadas. | Inventario RDD-MIG-IMG-28: 237 archivos (151 jpg, 66 jpeg, 20 png), 35 MB, máximo 1 013 711 bytes; `verify-log.csv` con 237 `formato_ok=True`; `download-log.csv` con 187 adjuntas y 50 embebidas. Las de 2016-2023 **no** se descargaron. |
| 4 | 2026-10 (por confirmar) | **Mejoras del importador**: (a) respaldo de la primera imagen del cuerpo cuando no hay miniatura; (b) eliminación de comentarios HTML de Gutenberg; (c) lista blanca de shortcodes; (d) fechas en hora de Paraguay; (e) idempotencia y reintentos con backoff. | (a) `pickFeaturedImage` y `extractEmbeddedImages`, `scripts/lib/wpContent.mjs:106,129`. (b) `stripWpComments`, `:16`. (c) `stripShortcodes` y `SHORTCODE_NAME`, `:32` y siguientes: se quitó la expresión que borraba cualquier texto entre corchetes. (d) `wpDateInfo`, `:161`: usa `post_date_gmt` solo si difiere de `post_date`; si no, convierte `post_date` desde la zona del sitio. (e) idempotencia: omite si el slug ya existe, `scripts/migrate-wordpress.mjs:633` (consulta `:449`); reintentos: `scripts/lib/retry.mjs` (3 reintentos, 500 ms, 1 s, 2 s; solo red, 429 y 5xx). Pruebas: `tests/unit/wp-migration-content.spec.ts`, `wp-migration-retry.spec.ts`. Estado: archivos sin confirmar en git (aparecen como nuevos). |
| 5 | 2026-10-22 | **Matriz editorial SEC-03 aprobada** y flujo impuesto en el servidor (DEP-03). | `docs/specs/security/SEC-03-matriz-editorial.md`; commit `0196758` «enforce roles, editorial workflow and route guards on the server». |
| 6 | 2026-10-23 | **PERF-DB**: (a) `maxPerDoc: 10` en versiones (noticias y páginas); (b) `getNews` con `select`, `depth` y `limit` acotados; (c) prerender de las 20 noticias más recientes; (d) etiquetas de revalidación `noticias`, `noticias-slugs`, `noticias:<slug>`; (e) migración de índices `20261023_150000_perf_db_indexes`. | (a) `Noticias.ts:259`, `Paginas.ts:91`. (b) `lib/cms/queries/news.ts` (`clampLimit`, 50 por defecto, 100 máximo). (c) `lib/cms/staticParams.ts` (`NEWS_PRERENDER_LIMIT = 20`). (d) `Noticias.ts` (`afterChange` y `afterDelete`). (e) `apps/cms/src/migrations/20261023_150000_perf_db_indexes.ts`: crea `noticias_featured_idx`, `_noticias_v_version_version_featured_idx` y `auditoria_fecha_hora_idx`; solo `CREATE INDEX IF NOT EXISTS`; `down` vacío. **El SQL no se ha ejecutado contra Postgres** (lo dice la propia migración). Pruebas: `tests/unit/perf-db-*.spec.ts` (3 archivos). Cambios sin confirmar en git. |
| 7 | 2026-10-23 | **Conflicto de política editorial descubierto**: el importador intentaba publicar de golpe, pero el servidor exige que todo contenido nuevo nazca en **Borrador** («siempre nace en Borrador», 422) y que publicar requiera varias personas distintas. | `transitions.ts:218-225`; solución del importador: `scripts/lib/wpPublishFlow.mjs` (crea en Borrador y avanza paso a paso con una identidad por rol; exige **tres identidades distintas**: autor, revisor, publicador, `:44-52,86-93`). No se relajó la política. |
| 8 | 2026-10-23 | **Importación local por la cadena real** con **tres identidades de prueba locales** (autor, revisor, publicador) sobre la base de datos **local** únicamente. | Hecho según el encargo del PO. **Estado: «en curso».** Conteos de noticias creadas, publicadas u omitidas: **por confirmar** (no hay registro verificable en el repositorio). Los errores se escribirían en `migration-errors.json` (`scripts/migrate-wordpress.mjs`, cierre). |
| 9 | 2026-10-23 | **Decisiones del PO D0-D4.** | D0: el Revisor aprueba y publica (`docs/specs/editorial/SEC-03-D0-revisor-publica.md`). D1-D4: imágenes (`MIG-IMG` §15). |

## 2. Estado actual de la migración

| Elemento | Estado |
|---|---|
| Noticias 2024-2026 en el CMS local | Importación local **en curso**; conteos por confirmar. |
| Imágenes 2024-2026 | Descargadas y verificadas fuera del repositorio (237). **No cargadas a Media** todavía (el cargador `scripts/load-news-images.mjs` es una propuesta de MIG-IMG §11; no existe en el repo). |
| Noticias y páginas 2016-2023 | Contenido: dentro del volcado (por confirmar el alcance exacto). Imágenes: **no descargadas**. |
| Servidor de pruebas / producción | Sin importación. No autorizado todavía. |
| Importador | Funciona con 3 identidades. Con D0 pasará a 2 (autor y revisor); **no modificar antes que el servidor** (ver la enmienda §8). |

## 3. Pendientes

1. **Confirmar conteos** de la importación local (creadas, omitidas por slug existente, con error) y la diferencia 273 frente a 271.
2. **Implementar D0** en el servidor (reglas, pruebas) y luego simplificar el importador a 2 identidades. Requiere aprobación del PO sobre las 3 preguntas de la enmienda.
3. **Cargar las 237 imágenes** a Media vía el cargador propuesto y enlazarlas a `featuredImage` (MIG-IMG §11), respetando que cada cambio pasa por el flujo editorial.
4. **Obtener las imágenes 2016-2023** desde `www.unc.edu.py` (D3/D4): requiere autorización y alcance explícitos (lista cerrada, tasa baja). Reportar al PO las que no se encuentren.
5. **Medir cuántas noticias no tienen imagen destacada** y entregar la lista al PO.
6. **Implementar el diseño del encabezado de la noticia** (D2): brecha en `MIG-IMG` §15.1.
7. **Volver obsoleto `featuredImageUrl`**, quitar `remotePatterns` y `img-src` de WordPress cuando no queden dependencias (D4).
8. **Pregunta 3 de MIG-IMG (re-publicación de 49+ noticias):** abierta.
9. **Ejecutar la migración de índices** en un ambiente de prueba autorizado y registrar el resultado (RDD pendiente).
10. **Backup del volumen de imágenes** (DEP-08).
11. **Rellenar la autoría (`createdBy`)** de las noticias heredadas: tarea aparte, requiere decisión humana.
12. **Reescribir `docs/FLUJO_EDITORIAL.md`**: se dejó un puntero de reemplazo; el cuerpo sigue contradiciendo el código.

## 4. Decisiones abiertas para el Product Owner

- Las 3 preguntas de la enmienda D0 (Revisor y páginas, rol del Publicador, atajo del Superadministrador).
- Pregunta 3 de MIG-IMG (re-publicación).
- Qué significa «contenido» en D2 (¿solo el resumen sobre la imagen?) y si el hero va detrás del encabezado fijo o debajo.
- Qué hacer con las noticias cuya imagen no exista en `www.unc.edu.py` mientras llega la que aporte el PO.

## 5. Límites de esta bitácora

No se ejecutó nada para escribirla: ni el importador, ni Payload, ni Postgres, ni Docker, ni el portal. Las cifras provienen del repositorio o del encargo del PO. Las fechas «por confirmar» indican que el repositorio no contiene la fecha exacta del paso.
