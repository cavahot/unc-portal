# titulos-cms — /titulos desde CMS + base de datos + portal, con el diseño del portal
Objetivo: rediseñar `/titulos` (Inscripción de Títulos) con contenido del CMS y estilos iguales al resto del portal. Rama: `feat/titulos-cms`.
Entrega: `ask-on-risk` (rama propia hacia `feat/desarrollo-pagina-referencia`; solo local, sin despliegue). Runner de pruebas: `npm test` (vitest). Spec: `docs/specs/portal/TITULOS.md`.

## Specs
- S1. Datos: «siempre esto de debe partir de la base de datos al cms y que impacte en el portal». Global del CMS `titulos-inscripcion`; el portal lo lee de ahí; sin datos fijos ni demostración en el código.
- S2. Arancel: una sola fuente. El monto sale de la fila «Inscripción de Títulos Universitarios» de `aranceles-rectorado` (relación), nunca escrito en el global. *Asunción mía, pendiente de aprobación del diseño de datos.*
- S3. Estados de la página: `ok`, `empty` y `unavailable`, sin respaldo de demostración; sin error 500 si el CMS no responde.
- S4. Estilos: «todos lo stilos deben coincidir». La página usa el sistema visual del portal (verdes institucionales, patrón de facultades), no el `slate-950` actual.
- S5. Proceso: «ten en cuenta siempre los arnes oDD y las skill de diseño impecable y busca las herremientas necesarias». Arnés ODD completo y skill `impeccable` (init → new-work → detector).
- S6. Seguridad: lectura pública sin datos privados; escritura con `canUpdateGlobal`; auditoría de cambios (hook de global, nuevo); `acento` de lista cerrada; URL del CONES validada; revalidación por etiqueta `titulos-inscripcion`.
- S7. Semilla idempotente con el contenido real hoy publicado (3 tipos, 8 pasos, plazo 8–24 h, nota del CONES, vínculo al arancel).
- S8. Textos de interfaz en `messages/{es,gn,en,pt-BR}/pages.titulos.json`, redacción neutra (sin voseo); el guaraní sigue el flujo de aprobación del glosario.

## Tasks
- [x] T0 · S5 · inline · commit: — (sin commit aún) · `PRODUCT.md` con `impeccable init`: escrito en la raíz; hechos inferidos marcados como tales porque la pregunta de confirmación quedó en «[No preference]».
- [ ] T1 · S1 S2 S6 · inline · commit: — · Global `titulos-inscripcion` + migración a mano + tipos + auditoría + etiqueta (TDD).
- [ ] T2 · S3 · inline · commit: — · Consulta del portal con estados `ok`/`empty`/`unavailable` (TDD).
- [ ] T3 · S7 · inline · commit: — · Semilla `scripts/seed-titulos.mjs` idempotente (TDD).
- [ ] T4 · S4 S8 · inline · commit: — · Página y componentes con `impeccable` new-work, mensajes en 4 idiomas (TDD).
- [ ] T5 · S4 · inline · commit: — · Verificación en navegador (escritorio y móvil) y detector de `impeccable`.

Route declaration: todas inline. Ninguna cumple un motivo de writer (las unidades dependen unas de otras, no son paralelas); además el usuario pidió no gastar cuota en subagentes.

## Log
- L1 (2026-11-05, usuario): con las skill de diseño que tienes podemos hacer http://localhost:3000/titulos
- L2 (2026-11-05, usuario): siempre esto de debe partir de la base de datos al cms y que impacte en el portal
- L3 (2026-11-05, usuario): ten en cuenta siempre los arnes oDD y las skill de diseño impecable y busca las herremientas necesarias, todos lo stilos deben coincidir
- Análisis: la página actual tiene todo fijo en el código (`page.tsx`, 435 líneas) y el arancel duplicado respecto de `aranceles-rectorado` (`scripts/lib/arancelesSeedData.mjs:23`).
- Verificado: existen `ALLOWED_TAGS` (`app/api/revalidate/route.ts`), `validateOfficialSourceUrl`, `canUpdateGlobal`; ningún global audita cambios hoy.
- `impeccable context`: sin PRODUCT.md ni DESIGN.md; hay implementación visual vigente. Sin generación de imágenes disponible (solo `ffmpeg`), así que el camino es code-first.
- Pregunta de confirmación del producto: respuesta «[No preference]» (2026-11-05). Se dedujo del repo y se marcó como inferido en `PRODUCT.md`; no se guardó ajuste de `.impeccable/config.json` ni se configuró el modo live (toca CSP).
- Siguiente paso: `impeccable` new-work para el diseño (extensión del sistema visual del portal) y T1.
