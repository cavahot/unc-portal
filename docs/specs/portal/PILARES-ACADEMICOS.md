# PILARES-01 — Pilares académicos (Docencia, Investigación, Extensión)

Seguimiento: `odd/tasks/pilares-academicos.md`. Diseño de referencia: «Propuesta 02 • Editorial & Métricas» (Stitch,
2026-11-10), adaptada a la línea del portal (fuentes y verdes del portal, decisión del propietario del 2026-11-10).

## 1. Comportamiento

- **Portada:** dentro de la franja «Excelencia académica, investigación e innovación» (`#institucional`), debajo del
  título, una grilla con una tarjeta por pilar publicable, en el orden Docencia, Investigación, Extensión (una columna en
  celular, tres desde `lg`).
- **Tarjeta:** ícono en recuadro verde claro, título serif, bajada en mayúsculas verdes, descripción, recuadro blanco
  con hasta dos métricas separadas por un divisor y un botón a todo el ancho con flecha que lleva a la página del pilar.
  Sombra suave siempre; al pasar el cursor (o con foco de teclado) la tarjeta sube 4 px, la sombra crece, el borde
  toma el verde del portal y el botón pasa a verde con texto blanco. Sin movimiento si el usuario pide reducirlo.
  Toda la tarjeta es clicable (un solo enlace, el del botón).
- **Métricas:** cada una sale de «Estadísticas» (cifra mayor que cero) o se carga a mano con valor, etiqueta y fuente.
  Sin métricas válidas el recuadro no se dibuja. Nunca hay cifras en el código.
- **Páginas** `/docencia`, `/investigacion`, `/extension`: mientras el estado sea «En construcción» (o no haya
  contenido) muestran solo el aviso «En construcción» con el título del pilar y un enlace al inicio. Publicadas,
  muestran la descripción, las estadísticas de la página y el contenido.
- **Megamenú:** Academia incluye Docencia, Investigación y Extensión, con el mismo estilo que el resto de los enlaces.

## 2. Contrato

- Global `pilares-academicos` (tabla `pilares`): pestañas `docencia`, `investigacion`, `extension`, cada una con
  `titulo` (≤ 60), `bajada` (≤ 60), `descripcion` (≤ 260), `icono` (`birrete|matraz|personas`), `metricas` (≤ 2),
  `enlaceTexto` (≤ 40) y `pagina` { `estado` (`construccion|publicada`, por defecto `construccion`), `contenido`
  (editor común), `estadisticas` (≤ 8) }. Métrica: `origen` (`estadistica|manual`), `estadistica`, `valor`, `fuente`,
  `etiqueta`.
- Lectura pública; escritura con `canUpdateGlobal`; auditoría y revalidación de la etiqueta `pilares-academicos`.
- Portal: `getPilaresAcademicos(locale)` → `ok` (al menos un pilar publicable) | `empty` | `unavailable`; nunca lanza.
  Con `empty` o `unavailable` la franja se ve como antes (sin tarjetas) y las páginas muestran el aviso.

## 3. Pruebas

`tests/unit/pilares-academicos-cms.spec.ts`, `tests/unit/pilares-academicos-model.spec.ts`,
`tests/unit/pilares-academicos-portal.spec.ts`.

## 4. Riesgos y pendientes

- Los textos sembrados (propuesta de diseño y contenido previo de /investigacion y /extension) no están confirmados
  por las dependencias.
- Las cifras de «Estadísticas» del CMS local coinciden con `DEMO_STATS`: confirmar su origen antes de publicar.
- Rollback: revertir el PR; el `down` de la migración se niega si el global tiene contenido.
