# T6 — Títulos con letras decorativas y slugs codificados (migración nov-2026)

Tarea: T6 de `odd/tasks/migracion-wordpress-nov-2026.md`. Rama: `fix/wp-titulos-unicode`.

## Pedido (textual)

- «vamos por el t6»

## Evidencia (RDD, 2026-11-09, base local)

| Hecho observado | Dónde |
| --- | --- |
| 16 noticias publicadas tienen el título escrito con «letras matemáticas» de Unicode (𝗨𝗡𝗖…) y el slug codificado en porcentaje (`%f0%9d%97%a8…`); son las mismas 16 | consulta a `noticias` |
| Las cargó el importador anterior al normalizador (PR #50); el importador nuevo ya no las crea así | `scripts/lib/wpNormalize.mjs` |
| Los lectores de pantalla las leen letra por letra y el buscador no las encuentra | auditoría `AUDITORIA-VOLCADO-WP-2026-11-09.md` |
| Editar una noticia publicada crea un borrador nuevo; lo que ve el público no cambia hasta que se revisa, aprueba y publica | `apps/cms/src/hooks/editorial/transitions.ts` (regla `publicado → draft` del autor con cambio de contenido) |

## Decisión sobre las URL

El portal todavía no está publicado: las direcciones `/noticias/%f0%9d…` solo existen en bases locales o de prueba, así que cambiar el slug no rompe enlaces públicos. Las direcciones del WordPress institucional son otro asunto (redirecciones de la migración) y quedan fuera.

## Comportamiento

### S1 — Qué se corrige

- Objetivo: cada noticia cuyo título tiene letras del bloque Unicode U+1D400–U+1D7FF **o** cuyo slug está codificado en porcentaje.
- Título nuevo: `normalizeTitle(título, { caps: 'mantener' })` (mismo normalizador que el importador; no cambia mayúsculas).
- Slug nuevo: si estaba codificado, el que da `slugForPost` con el título nuevo; si ya era legible, no se toca. Si choca con otra noticia (o con otra de la misma corrida), se agrega `-<id>`.
- Ninguna otra noticia ni ningún otro campo cambia.

### S2 — Cómo se aplica (flujo editorial, tres identidades)

1. Autor (superadmin), guardando como borrador (`?draft=true`): título y slug nuevos. El público sigue viendo la versión publicada.
2. Autor: `en_revision`. 3. Revisor: `aprobado`. 4. Publicador: `publicado`.
5. Comprobación: la lectura pública de la noticia devuelve el título y el slug nuevos, publicada.

Si una corrida se interrumpe, la siguiente retoma desde el estado de la última versión, sin repetir la edición.

### S3 — Guion

- `node scripts/fix-wp-titulos-unicode.mjs --xml=<volcado>`: sin `--apply` solo LEE la API pública y el volcado, y muestra el plan (antes → después). No escribe.
- El título se toma del **volcado de WordPress** (clave: el slug anterior). Hallazgo de la primera corrida sin escribir: el importador anterior recortaba a 150 unidades UTF-16 y cada letra decorativa ocupa 2, así que #104 y #67 quedaron **cortados** en la base (#67 con un carácter partido al final). `--apply` exige `--xml`.
- `--apply` con `CMS_EMAIL/CMS_PASSWORD`, `CMS_REVIEWER_*`, `CMS_PUBLISHER_*`. `--limit=N` corrige solo las N primeras (para probar con una).
- Solo CMS local, salvo `--allow-remote` con https. No imprime contraseñas.

## Límites

- `load-news-images.mjs --link` busca las noticias por el slug anterior: después de T6 no encontrará estas 16. Solo una de ellas (la del 2024-06-11) tiene imagen disponible y ya está enlazada.
- La página del slug anterior puede quedar en la caché del portal hasta su vencimiento.

## Rollback

Restaurar la copia de la base tomada antes de `--apply`, o editar de nuevo cada noticia por el mismo flujo.
