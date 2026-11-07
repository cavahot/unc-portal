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

- [ ] T0 Spec y documento ODD (S1-S7) · inline · commit:
- [ ] T1 Colección + migración idempotente + etiqueta de revalidación + tipos (S1-S3) · inline · commit:
- [ ] T2 Modelo, formato de fechas y consulta con estados (S4) · inline · commit:
- [ ] T3 Siembra desde las fechas actuales (S5) · inline · commit:
- [ ] T4 Página, error, esqueleto y mensajes (S6, S7) · inline · commit:
- [ ] T5 Verificación: migración en base sintética, siembra local, suite, tipos, HTML y navegador (S1-S7) · inline · commit:

Ruta: todas inline (unidades dependientes; sin razón de escritor delegado). Risk: ítem 1 (migración con tablas nuevas) → T1 en su propio commit. Sin subagentes pagos (regla del usuario): la verificación de la migración la hago yo en una base descartable. Tras `migrate:create` correr la suite completa (lección de trámites: el `prevId` del snapshot salió en cero).

## Log

- L1 (2026-11-07) Pedido del usuario: «vamos por el siguiente» (siguiente página sin rediseñar tras `/biblioteca`: `/calendario-academico`).
- L2 (2026-11-07) Decisión del usuario ante el hallazgo de que las fechas están en los mensajes y no se pueden comprobar: «CMS y rediseño (Recomendado)»
- L3 Evidencia: las fechas (2 semestres de 5 eventos y 4 mesas de exámenes finales) están en `messages/{es,gn,en,pt-BR}/pages.calendario-academico.json`; la página las lee con `t()` y solo pinta. No existe colección de calendario en el CMS, ni documento fuente en `docs/` u `odd/`; entraron en el commit masivo `c6c5d6b` (2026-08-07). Los textos dicen «fechas orientativas»: **no se pueden verificar como oficiales**.
- L4 Decisión de diseño: fechas estructuradas (inicio y fin) y no texto libre, para formatearlas con el idioma de la persona (antes cada idioma las traducía a mano) y poder ordenarlas y validarlas. Los cinco eventos estándar de un semestre son un `select` con etiquetas traducibles en los mensajes; `otro` admite una descripción libre (solo en español: el CMS no tiene localización). Las mesas de exámenes no llevan etiqueta: el período sale de las fechas («diciembre de 2025»).
- L5 Riesgo conocido y no resuelto por mí: la siembra publica las fechas actuales tal cual; alguien de Secretaría Académica debe confirmarlas antes de publicar.
