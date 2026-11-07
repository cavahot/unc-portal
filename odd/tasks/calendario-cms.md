# calendario-cms

Objetivo: pasar al CMS las fechas de `/calendario-academico` (hoy en `messages/*/pages.calendario-academico.json`) y rediseñar la página con el sistema visual del portal.
Rama: `feat/calendario-rediseno` (desde `chain/rediseno-portal`). Entrega: `ask-on-risk`. Ejecutor de pruebas: `npx vitest run`.
Spec: `docs/specs/portal/CALENDARIO.md`.

## Specs

- S1 Colección `calendario-academico` en el CMS: título, tipo (`semestre` | `examenes`), año, orden, activa y una lista de entradas con evento, descripción, fecha de inicio y fecha de fin opcional (spec §2.1).
- S2 Lectura pública solo de los activos; escritura con `canWriteInstitutional`; revalidación por etiqueta `calendario-academico` al guardar y al borrar (spec §2.2).
- S3 Migración idempotente: crea `calendario_academico` y `calendario_academico_entradas`; `down` se niega a correr si hay filas (spec §2.3).
- S4 Consulta del portal con estados `ok`/`empty`/`unavailable`; muestra el año académico más reciente; sin fechas en el código (spec §2.4).
- S5 Siembra idempotente con las fechas hoy publicadas, convertidas de forma programática (no retranscritas), sin pisar ediciones (spec §2.5).
- S6 `/calendario-academico` en el sistema visual: cabecera compartida, semestres como listas de fechas, mesas de exámenes en tabla accesible, fechas con el formato del idioma, aviso en línea, `error.tsx`, 4 idiomas, sin voseo (spec §2.6).
- S7 Se retiran de los mensajes las fechas escritas (`semesters`, `finals`) y la etiqueta sobre el título.

## Tasks

- [x] T0 Spec y documento ODD (S1-S7) · inline · commit: 79ee6d5
- [x] T1 Colección + migración idempotente + etiqueta de revalidación + tipos (S1-S3) · inline · commit: 41726a4
- [x] T2 Modelo, formato de fechas y consulta con estados (S4) · inline · commit: e1c94d5
- [x] T3 Siembra desde las fechas actuales (S5) · inline · commit: cf0b81c
- [x] T4 Página, error, esqueleto y mensajes (S6, S7) · inline · commit: 604bf45
- [x] T5 Verificación: migración en base sintética, siembra local, suite, tipos, HTML y navegador (S1-S7) · inline · commit: (este)

Ruta: todas inline (unidades dependientes; sin razón de escritor delegado). Risk: ítem 1 (migración con tablas nuevas) → T1 en su propio commit. Sin subagentes pagos (regla del usuario): la verificación de la migración la hago yo en una base descartable. Tras `migrate:create` correr la suite completa (lección de trámites: el `prevId` del snapshot salió en cero).

## Log

- L1 (2026-11-07) Pedido del usuario: «vamos por el siguiente» (siguiente página sin rediseñar tras `/biblioteca`: `/calendario-academico`).
- L2 (2026-11-07) Decisión del usuario ante el hallazgo de que las fechas están en los mensajes y no se pueden comprobar: «CMS y rediseño (Recomendado)»
- L3 Evidencia: las fechas (2 semestres de 5 eventos y 4 mesas de exámenes finales) están en `messages/{es,gn,en,pt-BR}/pages.calendario-academico.json`; la página las lee con `t()` y solo pinta. No existe colección de calendario en el CMS, ni documento fuente en `docs/` u `odd/`; entraron en el commit masivo `c6c5d6b` (2026-08-07). Los textos dicen «fechas orientativas»: **no se pueden verificar como oficiales**.
- L4 Decisión de diseño: fechas estructuradas (inicio y fin) y no texto libre, para formatearlas con el idioma de la persona (antes cada idioma las traducía a mano) y poder ordenarlas y validarlas. Los cinco eventos estándar de un semestre son un `select` con etiquetas traducibles en los mensajes; `otro` admite una descripción libre (solo en español: el CMS no tiene localización). Las mesas de exámenes no llevan etiqueta: el período sale de las fechas («diciembre de 2025»).
- L5 Riesgo conocido y no resuelto por mí: la siembra publica las fechas actuales tal cual; alguien de Secretaría Académica debe confirmarlas antes de publicar.
- L6 Evidencia T1: migración generada con `migrate:create` (primer intento falló por mi comentario: `messages/*/` contiene `*/` y cerró el JSDoc de `validators.ts`; reescrito). Vuelta idempotente y con el `prevId` del snapshot corregido a mano (salió en cero, igual que en trámites; ahora una prueba lo comprueba). Verificada en una base sintética (`unc_calendario_chk`, ya borrada): (0) la cadena completa sube desde vacío; (1) reaplicar el SQL de `up` no da errores; (2) `down` con una fila se rechaza y deja tabla y fila; (3) `down` sin filas borra tablas, enumerados y columna de bloqueo sin tocar `tramites`; (4) volver a subir funciona. 17 pruebas nuevas (migración, colección, acceso, revalidación y tres validadores); suite completa: 155 archivos, 2577 pruebas; `tsc` del CMS sin errores. RED: las pruebas se escribieron junto con el código.
- L7 Evidencia T2: `armarCalendario`, `formatFechas`, `formatPeriodo` y `getCalendario` con 19 pruebas (día en UTC sin corrimiento, `fin` ≤ `inicio` ignorado, evento desconocido y «otro» sin descripción descartados, año más reciente, `empty` vs `unavailable`, el guaraní se formatea en español porque `Intl` no lo soporta y su resultado dependería de la máquina). Decisión: la lista de eventos se repite en el portal (no se importa código del CMS) y una prueba comprueba que coincida con la del CMS. Verifiqué antes en Node qué devuelve `Intl` por idioma (es «16–27 mar», en «Mar 16 – 27», pt-BR «16 – 27 de mar.»). `tsc` del portal sin errores.
- L8 Evidencia T3: `scripts/lib/calendarioSeedData.mjs` se genera con un extractor que convierte el texto de `messages/es` a fechas reales y falla si un formato no se reconoce, si un rango cruza de año o si un evento no coincide con su etiqueta; resultado: 3 bloques y 14 fechas (semestres: 5 eventos cada uno; finales: 4 períodos). 11 pruebas (datos exactos, de ida y vuelta por el modelo del portal, mediodía UTC, dry-run sin red con aviso, crea 3 y repetir omite 3 sin PATCH/PUT/DELETE, no pisa existentes, error de escritura contado, destino remoto y clave débil rechazados sin imprimir la credencial). **Observación para Secretaría:** las mesas de finales de diciembre 2026 (1–19 dic) se solapan con los parciales del 2.º turno (23 nov – 4 dic) y con el cierre del semestre (11 dic); puede ser intencional, pero conviene confirmarlo. Siembra real en el CMS local: pendiente de las credenciales del usuario.
- L9 Evidencia T4: `/calendario-academico` lee de `getCalendario()`; semestres como listas de definición, mesas de exámenes en tabla con `<caption>` y cabeceras de columna y de fila (el período sale de las fechas), fechas con el formato del idioma (es «16–27 mar», en «Mar 16 – 27», pt-BR «16 – 27 de mar.», gn en español), aviso de «fechas orientativas» movido del pie a la cabecera, estados vacío y no disponible, `error.tsx` y esqueleto claro; se conservan las etiquetas ya traducidas de los cinco eventos; retiradas de los 4 idiomas las fechas escritas (`semesters`, `finals`) y la etiqueta sobre el título. 18 pruebas de página. Suite completa: 158 archivos, 2626 pruebas; `tsc` del portal y del CMS y lint sin errores. Cambio de comportamiento: el texto libre de un evento «otro» solo se publica en español (el CMS no tiene localización).
- L10 Evidencia T5: el usuario sembró el CMS local; `/calendario-academico` muestra 2 semestres con 10 fechas y 4 mesas de exámenes (2 listas de definición, 1 tabla) con el formato esperado («2 mar», «16–27 mar», «23 jun – 4 jul», «Diciembre de 2026 · 1–19 dic»). Escritorio y 375 px sin desborde horizontal (tabla 335 px dentro de su contenedor); aviso de «fechas orientativas» en la cabecera. No revisado en navegador: en, pt-BR y gn (solo cubiertos por pruebas). Pendiente fuera del repositorio: Secretaría Académica debe confirmar las fechas y el solapamiento de diciembre 2026 (L8) antes de publicar. Orden de despliegue: migración `calendario_01`, siembra, portal.
