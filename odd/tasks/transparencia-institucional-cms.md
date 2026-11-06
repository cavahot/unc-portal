# transparencia-institucional-cms

Objetivo: rediseñar `/informacion-publica`, `/institucional` y `/transparencia` con el sistema visual del portal y contenido CMS → base de datos → portal.
Rama: `feat/transparencia-institucional-cms` (desde `feat/titulos-cms`). Entrega: `ask-on-risk`. Ejecutor de pruebas: `npx vitest run`.
Spec: `docs/specs/portal/INSTITUCIONAL-TRANSPARENCIA.md`.

## Specs

- S1 Global `informacion-publica` en el CMS con vías, datos requeridos, cita, portal oficial y correo (spec §2.1); URL interna o https de host oficial.
- S2 Global `institucional` con sobre, secciones (destino de lista cerrada) y valores (spec §2.2).
- S3 `/transparencia` mantiene las leyes desde el CMS y suma el enlace a Información Pública (spec §2.3).
- S4 Acceso de lectura pública y escritura `canUpdateGlobal`, revalidación por etiqueta y auditoría (spec §2.4).
- S5 Estados `ok`/`empty`/`unavailable` y manejo de errores en el diseño, sin modales (spec §2.5).
- S6 Diseño coincide con `/titulos` y facultades; reglas de `impeccable`; redacción neutra, sin voseo (spec §2.6).
- S7 Mensajes en `es`, `gn`, `en` y `pt-BR` con los mismos marcadores; guaraní pendiente de revisión.
- S8 Semilla idempotente con el contenido hoy publicado, sin pisar ediciones; sin datos fijos en el código.

## Tasks

- [x] T0 Spec y documento ODD (S1-S8) · inline · commit: 26276ee
- [x] T1 Globals `informacion-publica` e `institucional` + migración + validadores + auditoría (S1, S2, S4) · inline · commit: 5239375
- [x] T2 Consulta, semilla y página `/informacion-publica` con error y mensajes (S1, S5-S8) · inline · commit: 80b9a15
- [x] T3 Consulta + página `/institucional` (S2, S5-S8; el global y la semilla ya existen) · inline · commit: ce0718b
- [ ] T4 Rediseño de `/transparencia` con el enlace a Información Pública (S3, S5-S7) · inline · commit: pendiente
- [ ] T5 Verificación final: suite, detector de diseño, navegador, docs (S1-S8) · inline · commit: pendiente

Ruta: todas inline (unidades dependientes y de ~400 líneas cada una; sin razón de escritor delegado).

## Log

- L1 (2026-11-06) Pedido del usuario: «ok ahora rediseña esta parte con los nuevos standares Transparencia e Información Institucional»
- L2 (2026-11-06) Respuesta del usuario al alcance: «Las 3 (Recomendado)» = `/transparencia`, `/informacion-publica` e `/institucional`.
- L3 (2026-11-06) Evidencia: `/informacion-publica` tiene `CHANNELS` y `REQUIRED_DATA` en el código y fondo `slate-950` con voseo; `/institucional` lee `about`, `sections` y `values` de mensajes; `/transparencia` ya lee las leyes del CMS. Patrón: `TITULOS.md`.
- L4 Hipótesis: el contenido del CMS es solo español (sin localización en `payload.config.ts`), como en `/titulos`.
- L5 (2026-11-06) Hallazgo en T3: las tarjetas de `/institucional` enlazan a `/institucional/historia` y `/institucional/mision`, rutas que no existen; las reales son `/historia` y `/mision-vision-y-valores`. La lista cerrada de destinos del global lo corrige.
- L6 Evidencia T1: migración verificada en base sintética (subir, repetir, `down` rechazado con contenido); 25 pruebas del CMS. Evidencia T2: 26 pruebas de la página; detector de diseño sin hallazgos; sin desbordamiento horizontal a 375 px; semilla local idempotente. No se observó RED previo para el esquema de los globals (se escribió junto con sus pruebas).
- L7 Evidencia T3: 35 pruebas del hub (mapeo con lista cerrada, consulta, render, errores, mensajes); detector de diseño sin hallazgos; los 4 destinos responden 200 en el portal local (`/historia`, `/mision-vision-y-valores`, `/autoridades`, `/organigrama`) con prefijo de idioma; se retiraron 2 excepciones obsoletas de la guarda `safe-url`.
