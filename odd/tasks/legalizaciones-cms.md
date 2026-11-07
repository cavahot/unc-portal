# Legalizaciones desde el CMS (INST-11)

Objetivo: mover `/legalizaciones` al CMS (global con el patrón de `/titulos`) y rediseñarla con el sistema visual del portal. Rama: `feat/legalizaciones-cms` (apilada sobre #32). Estrategia de entrega: PR apilado. Runner: `npx vitest run`.

## Specs

Spec completa: `docs/specs/portal/LEGALIZACIONES.md`.

- S1 «Sí, legalizaciones» — rediseñar `/legalizaciones`; regla del proyecto: contenido en CMS + BD + portal.
- S2 Global `legalizaciones` con los campos de `titulos-inscripcion` (sin nota del CONES), compartidos y no copiados.
- S3 Migración idempotente; `down` se niega con filas; solo hacia adelante.
- S4 Consulta con estados `ok`/`empty`/`unavailable`, mismo mapper que `/titulos`, arancel solo de la fila enlazada.
- S5 Siembra idempotente (3 categorías, 10 pasos, plazo 12–24 h), enlaza el arancel «Legalizaciones», sin pisar ediciones.
- S6 Página con los componentes de `/titulos`, estados en línea, `error.tsx`, esqueleto claro, 4 idiomas, español sin voseo.
- S7 Etiqueta de revalidación y auditoría del global.

## Tasks

- [ ] T1 Global + campos compartidos + migración + revalidación + tipos (S2, S3, S7) · inline · commit:
- [ ] T2 Consulta con estados (S4) · inline · commit:
- [ ] T3 Siembra (S5) · inline · commit:
- [ ] T4 Página, error, esqueleto y mensajes (S6) · inline · commit:
- [ ] T5 Verificación: migración en base sintética, suite, tipos, navegador (S1-S7) · inline · commit:

Ruta: todas inline (unidades dependientes; sin razón de escritor delegado; sin subagentes pagos por regla del usuario). Risk: ítem 1 (migración con tablas nuevas) → T1 en su propio commit. `TitulosInscripcion` se toca solo para exportar sus campos (ítem 3: código compartido); sus pruebas existentes deben seguir en verde. Tras `migrate:create` correr la suite completa (el `prevId` del snapshot sale en cero).

## Log

- L1 (2026-11-07) Pedido del usuario: «Sí, legalizaciones» (última página sin rediseñar de la tanda).
- L2 Evidencia: contenido íntegro en `app/[locale]/legalizaciones/page.tsx` (constantes `DOCUMENT_TYPES` y `STEPS`, plazo «12–24 hs», arancel «G. 50.000» escrito a mano aunque existe `Legalizaciones — 50000` en `scripts/lib/arancelesSeedData.mjs:35`); la página no usa `getT` (no cambia con el idioma) y `messages/*/pages.legalizaciones.json` describe otros servicios; voseo en «querés», «Identificá».
- L3 Decisión: contenido del CMS solo en español, como `/titulos` (la localización de Payload se activó solo para privacidad y accesibilidad por decisión expresa del usuario para textos legales); se traduce la interfaz.
