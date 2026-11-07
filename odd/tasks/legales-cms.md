# Privacidad y accesibilidad desde el CMS (INST-08)

Objetivo: mover `/privacidad` y `/accesibilidad` al CMS (un texto por idioma) y rediseñarlas con el sistema visual del portal. Rama: `feat/legales-cms` (apilada sobre #30). Estrategia de entrega: PR apilado. Runner: `npx vitest run`.

## Specs

Spec completa: `docs/specs/portal/LEGALES.md`.

- S1 «Pasar a CMS y rediseñar» — dos globals (`politica-privacidad`, `declaracion-accesibilidad`) con el contenido hoy en los mensajes.
- S2 «CMS con un texto por idioma (Recomendado)» — localización de Payload solo en los campos de estos globals; es, en, pt-BR, gn.
- S3 Migración idempotente; `down` se niega con filas; solo hacia adelante.
- S4 Consulta con estados `ok`/`empty`/`unavailable`, respaldo al español con aviso, correo validado.
- S5 Siembra idempotente desde los mensajes actuales (español en «usted»), sin pisar ediciones.
- S6 Páginas con `PageHero`, fondo claro, sin emojis, estados en línea, `error.tsx`, esqueleto claro, 4 idiomas, español sin voseo.
- S7 Etiquetas de revalidación y auditoría de los globals.

## Tasks

- [ ] T1 Globals + localización + migración + revalidación + tipos (S2, S3, S7) · inline · commit:
- [ ] T2 Modelo y consultas con estados (S4) · inline · commit:
- [ ] T3 Siembra (S5) · inline · commit:
- [ ] T4 Páginas, error, esqueleto y mensajes (S6) · inline · commit:
- [ ] T5 Verificación: migración en base sintética, suite, tipos, navegador (S1-S7) · inline · commit:

Ruta: todas inline (unidades dependientes; sin razón de escritor delegado; sin subagentes pagos por regla del usuario). Risk: ítem 1 (migración con tablas nuevas y activación de localización en el CMS) → T1 en su propio commit. Tras `migrate:create` correr la suite completa (el `prevId` del snapshot sale en cero) y comprobar en una base sintética que la migración no toca tablas existentes.

## Log

- L1 (2026-11-07) Pedido del usuario: «Sí, siguiente» (siguiente página sin rediseñar: `/privacidad` y `/accesibilidad`).
- L2 (2026-11-07) Decisión del usuario sobre el origen del texto: «Pasar a CMS y rediseñar».
- L3 (2026-11-07) Decisión del usuario sobre los idiomas: «CMS con un texto por idioma (Recomendado)».
- L4 Evidencia: 7 secciones de privacidad y 6 características de accesibilidad en `messages/*/pages.{privacidad,accesibilidad}.json`; el correo `secgral@unc.edu.py` está escrito en `app/[locale]/accesibilidad/page.tsx`; el español de accesibilidad usa voseo («Podés», «Usá», «encontrás», «escribinos»). El CMS no tenía localización (los globals existentes, p. ej. `titulos-inscripcion`, son solo en español).
