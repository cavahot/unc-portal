# Migración de datos de WordPress al CMS (ronda nov-2026)

Objetivo: auditar el volcado de WordPress y llevar al CMS lo que falta (noticias, imágenes, títulos, resúmenes) para que el portal lo consuma sin depender del WordPress institucional. Ramas: hijos del tracker `chain/rediseno-portal`. Entrega: PR por unidad al tracker. Runner: `npx vitest run` (portal) y `node --test tests/deploy/*.test.mjs`.

## Specs

- S1 «te paso el archivo de la bd de wordpress para que lo proceses y veas que falta en nuestro cms».
- S2 «Revisa la consistencia de los datos, las iamgenes, titulos, descripcion y todo para volcarlo a la base de datos y pueda consumirlos el cms para impactar en el portal debe serguir nuestra ruta de desarrollo».
- S3 (de «Revisa la consistencia…» y «sin depender del wordpress institucional») Ninguna noticia queda con imagen o PDF apuntando a `www.unc.edu.py`; todo pasa a Medios.
- S4 (de «ruta de desarrollo») Todo cambio sigue SDD → RDD → TDD, primero en local, con copia de la base antes de escribir, y las noticias avanzan por el flujo editorial con identidades distintas (autor, revisor, publicador). Nada se escribe en staging o producción sin autorización explícita.
- S5 (supuesto) Los datos del volcado se leen en solo lectura; el volcado no se versiona ni se imprimen datos personales.

## Tasks

| ID | S# | Ruta | Tarea | Estado / evidencia |
| --- | --- | --- | --- | --- |
| T1 | S1, S2 | inline | Auditoría de consistencia (títulos, imágenes, resúmenes, categorías, páginas, menú) | Hecha: `docs/specs/migration/AUDITORIA-VOLCADO-WP-2026-11-09.md` |
| T2 | S2 | — | Decisiones del Product Owner (informe §7): mayúsculas, categorías, resúmenes, duplicados, páginas, corrección de los 16 existentes | Pendiente (bloquea T3-T6) |
| T3 | S2, S4 | inline | Normalizador del importador: títulos (NFKC, espacios, ≤150), slug legible, resumen derivado (20-300), con pruebas que fallen primero | Hecha: PR #50 (78a23a5) |
| T3b | S4 | inline | El importador también busca el slug anterior para no duplicar noticias ya cargadas | Hecha: rama `fix/wp-import-slug-anterior` |
| T4 | S3 | inline | Obtener `wp-content/uploads` del hosting y cargar imágenes y PDF a Medios con `scripts/load-news-images.mjs` | Parcial (local): imágenes 2024-2026 cargadas, 57 noticias con imagen; faltan las de 2016-2023 (no están en la copia) y los 13 PDF |
| T5 | S4 | inline | Importar las 9 noticias faltantes como borrador y avanzarlas por el flujo (local) | Hecha en local: 281 noticias publicadas |
| T6 | S2, S4 | inline | Corregir los 16 títulos y slugs con letras matemáticas ya cargados | Pendiente (T2) |
| T7 | S3 | inline | Reescribir enlaces a PDF y las 14 imágenes de otros dominios del cuerpo | Pendiente (T4) |
| T8 | S2 | inline | Páginas sin equivalente: migrar, recrear o descartar | Pendiente (T2) |
| T9 | S4 | inline | Verificar en el portal local y repetir el recuento contra el volcado | Pendiente |

## Log

- L1 (2026-11-09, mensaje del usuario, textual): «te paso el archivo de la bd de wordpress para que lo proceses y veas que falta en nuestro cms» y, después, «Revisa la consistencia de los datos, las iamgenes, titulos, descripcion y todo para volcarlo a la base de datos y pueda consumirlos el cms para impactar en el portal debe serguir nuestra ruta de desarrollo».
- L2 (2026-11-09) T1 hecha. Hallazgos: 9 noticias faltan (272 de 281 coinciden por título y fecha; por slug parecían 48 por 16 slugs codificados); 148 de 272 noticias del CMS sin imagen y 124 con URL externa a `www.unc.edu.py`; 199 miniaturas apuntan a adjuntos que el volcado no trae (solo hay 2024-2026); 106 títulos en mayúsculas; 16 títulos con letras matemáticas de Unicode, ya cargados así; 278 de 281 sin extracto; 245 con categoría genérica; 2021 sin noticias en el origen. El importador en `--dry-run` sobre el XML nuevo: 280 correctas, 1 advertencia («COMUNICADO - RECTORADO», sin extracto), 0 errores.
- L3 (2026-11-09) Una petición de prueba a `/wp-json/wp/v2/posts` fue bloqueada por el firewall del sitio (502 «Request Denied», OPNsense); no se reintentó ni se intentó eludir. Alternativa propuesta: copiar `wp-content/uploads` desde el hosting.
- L4 (2026-11-09) T3 hecha (PR #50). Copia de `uploads` recibida: solo carpetas 2024, 2025 y 2026; 57 de 281 noticias tienen imagen disponible.
- L5 (2026-11-09) Carga local con las tres identidades: 25 noticias creadas, de las cuales 16 eran duplicados (ids 274-289) de las noticias con título en letras matemáticas. Causa: el importador busca solo por slug y el normalizador cambió esos slugs. Medios pasó de 91 a 130 archivos.
- L6 (2026-11-09, usuario, textual): «Sí, corrige y borra». Copia previa `respaldo-local-2026-11-09/unc_portal_post-carga.dump`; borradas en una transacción las 16 copias y sus 64 versiones. Resultado: 281 noticias, 0 fechas duplicadas, 57 con imagen. T3b: el importador prueba también el slug anterior (4 pruebas nuevas, RED observado; suite 2994 en verde).
- Siguiente paso: T2 (decisiones del Product Owner) y T6 (limpiar los 16 títulos y slugs originales).
