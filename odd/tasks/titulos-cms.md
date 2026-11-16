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
- S9. Errores: «no te olvides de capturar los errores en el diseño para que el usuario sepa habia una alternativa a alertswet 2». *Interpretación mía, no confirmada:* los errores se capturan y se muestran en el diseño, en línea, accesibles y con una salida, sin ventanas modales (alternativa a SweetAlert2); los toasts (Sonner) quedan como alternativa documentada pendiente de aprobación. El ejemplo de Express pegado por el usuario se tomó como patrón: capturar donde ocurre, registrar, ocultar detalles internos y centralizar la respuesta.

## Tasks
- [x] T0 · S5 · inline · commit: — (sin commit aún) · `PRODUCT.md` con `impeccable init`: escrito en la raíz; hechos inferidos marcados como tales porque la pregunta de confirmación quedó en «[No preference]».
- [x] T1 · S1 S2 S6 · inline · commit: b523dbd · Global `titulos-inscripcion` + migración a mano + tipos + auditoría + etiqueta (TDD). Evidencia: RED por módulo inexistente; 14 pruebas; migración aplicada en una BD sintética vacía (up, up repetido, down negado con contenido; BD eliminada); `dep07` 9/9.
- [x] T2 · S3 · inline · commit: 0651746 · Consulta del portal con estados `ok`/`empty`/`unavailable` (TDD). Evidencia: RED por módulo inexistente; 27 pruebas con las de T1 (mapeo, estados, etiquetas, paridad de listas cerradas).
- [x] T3 · S7 · inline · commit: 0a37def · Semilla `scripts/seed-titulos.mjs` idempotente (TDD). Evidencia: 12 pruebas; dry-run real correcto. **Aún no aplicada** a la BD de desarrollo (falta reiniciar el CMS para que cree las tablas).
- [x] T4 · S4 S8 S9 · inline · commit: 8a2178c · Página, componentes y límite de error con el sistema visual del portal; mensajes en 4 idiomas (TDD). Evidencia: pruebas por estado (ok, vacío, no disponible), límite de error, registro de fallos y paridad de catálogos; suite 2271/2271; ESLint y tipos limpios; el guardián `safe-url` detectó 3 `href` sin `safeHref` y se corrigieron.
- [x] T5 · S4 · inline · commit: 8a2178c · Detector de `impeccable`: 0 hallazgos. Navegador: escritorio (cabecera, índice con salto a `#tipo-publica`, tipos, pasos, cierre) y móvil 375 px (sin desbordes ni scroll horizontal). **Límites:** el estado `unavailable`, el estado `empty` y el límite de error se verificaron con pruebas, no en el navegador; no hubo revisión de cierre por un agente aparte (decisión del usuario de no gastar cuota en subagentes).

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
- T1 (2026-11-05): `migrate:create` generó SQL no idempotente, un `down` que borra sin comprobar datos, un renombre de índices ajeno (`ley5189`/`ley5282`, deriva de TRANS-02) y un `prevId` en ceros que rompía la cadena de snapshots (lo detectó `dep-sec-01-reset-password-migration.spec.ts`). Se reescribió a mano y se corrigió el `prevId`.
- T3 (2026-11-05): la prueba de la semilla se escribió antes del módulo (RED por módulo inexistente), pero no se ejecutó por separado antes de implementar. La nota del CONES se redactó en tono neutro («Consulte…» en vez de «Consultá…»): es el único cambio de redacción respecto del contenido publicado.
- Estado: suite completa 2231/2231. Siguiente: aplicar la semilla en local, `impeccable` new-work (extensión del portal, modo Read), T4 y T5.
- L4 (2026-11-06, usuario, a mitad de turno): no te olvides de capturar los errores en el diseño para que el usuario sepa habia una alternativa a alertswet 2
- L5 (2026-11-06, usuario): «ejemplo:» y un fragmento de Express pegado (try/catch en la ruta asíncrona, middleware centralizado de errores, registro, ocultar el stack en producción y manejadores de proceso). Se usó como patrón de diseño, no se copió código.
- T4 (2026-11-06): `PRODUCT.md` y el brief de la superficie (`.impeccable/surfaces/app-locale-titulos-page-tsx.md`) se escribieron antes del código; el brief incluye la regla de errores. Camino de `impeccable`: extensión de una superficie establecida (sin concurso de conceptos), modo Read, code-first (no hay generación de imágenes).
- T4: desvío frente a la página hermana: no se usa la etiqueta en mayúsculas sobre el título (el piso de calidad de `impeccable` la prohíbe); el resto de la cabecera es igual.
- T4: se reemplazó el `pages.titulos.json` anterior (de un diseño viejo, sin ningún uso en el código) por las claves nuevas. `gn` conserva el texto en español (pendiente de traducción y revisión nativa, como indica el flujo del glosario).
- T4: `instrumentation.ts` con `onRequestError` no existe en el repo; no se agregó (cambio de infraestructura). Recomendado como seguimiento.
- Pendiente fuera de esta tarea: la captura de pantalla del panel del navegador salía en blanco al desplazarse (herramienta); se verificó con medidas del DOM y capturas en las posiciones que sí funcionaron.
