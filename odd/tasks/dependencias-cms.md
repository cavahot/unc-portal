# Contactos por dependencia desde el CMS (INST-12)

Objetivo: mover `/contacto/dependencias` al CMS (colección) y rediseñarla con el sistema visual del portal. Rama: `feat/dependencias-cms` (sobre el tracker). Estrategia de entrega: PR al tracker. Runner: `npx vitest run`.

## Specs

Spec completa: `docs/specs/portal/DEPENDENCIAS.md`.

- S1 «sigue» — pasar `contacto/dependencias` al CMS (directorio escrito en el código); regla del proyecto: contenido en CMS + BD + portal.
- S2 Colección `dependencias-contacto` con sedes, teléfonos, correos y web validados.
- S3 Migración idempotente; `down` se niega con filas; solo hacia adelante.
- S4 Consulta con estados `ok`/`empty`/`unavailable`; el mapeador descarta lo inválido.
- S5 Siembra idempotente de las 7 dependencias actuales, sin pisar ediciones.
- S6 Página con `PageHero`/`StatePanel`, 4 idiomas, español sin voseo, enlaces con prefijo.
- S7 Etiqueta de revalidación y auditoría.

## Tasks

- [ ] T1 Colección + validadores + migración + registro + tipos (S2, S3, S7) · inline · commit: —
- [ ] T2 Modelo, consulta y siembra (S4, S5) · inline · commit: —
- [ ] T3 Página, error, esqueleto y mensajes (S6) · inline · commit: —
- [ ] T4 Verificación: migración en base sintética, suite, tipos, navegador (S1-S7) · inline · commit: —

Ruta: todas inline (unidades dependientes; sin subagentes pagos por regla del usuario). Risk: ítem 1 (migración con tablas nuevas) → T1 en su propio commit. Tras `migrate:create` correr la suite completa (el `prevId` del snapshot sale en cero).

## Log

- L1 (2026-11-08) Pedido del usuario: «sigue» (tras dejar `contacto/dependencias` identificada como la página con el directorio escrito en el código).
- L2 Evidencia: `app/[locale]/contacto/dependencias/page.tsx` trae 7 dependencias con 10 sedes en el código, sin `getT` (español fijo, voseo «Encontrá»), enlaces `/contacto` sin prefijo de idioma, sin estados.
