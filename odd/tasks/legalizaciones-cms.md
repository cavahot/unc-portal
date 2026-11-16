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

- [x] T1 Global + campos compartidos + migración + revalidación + tipos (S2, S3, S7) · inline · commit: 77acf59
- [x] T2 Consulta con estados (S4) · inline · commit: 9e6303d
- [x] T3 Siembra (S5) · inline · commit: 9e6303d
- [x] T4 Página, error, esqueleto y mensajes (S6) · inline · commit: 2a8264e
- [x] T5 Verificación: migración en base sintética, suite, tipos, navegador (S1-S7) · inline · commit: (siguiente)

Ruta: todas inline (unidades dependientes; sin razón de escritor delegado; sin subagentes pagos por regla del usuario). Risk: ítem 1 (migración con tablas nuevas) → T1 en su propio commit. `TitulosInscripcion` se toca solo para exportar sus campos (ítem 3: código compartido); sus pruebas existentes deben seguir en verde. Tras `migrate:create` correr la suite completa (el `prevId` del snapshot sale en cero).

## Log

- L1 (2026-11-07) Pedido del usuario: «Sí, legalizaciones» (última página sin rediseñar de la tanda).
- L2 Evidencia: contenido íntegro en `app/[locale]/legalizaciones/page.tsx` (constantes `DOCUMENT_TYPES` y `STEPS`, plazo «12–24 hs», arancel «G. 50.000» escrito a mano aunque existe `Legalizaciones — 50000` en `scripts/lib/arancelesSeedData.mjs:35`); la página no usa `getT` (no cambia con el idioma) y `messages/*/pages.legalizaciones.json` describe otros servicios; voseo en «querés», «Identificá».
- L3 Decisión: contenido del CMS solo en español, como `/titulos` (la localización de Payload se activó solo para privacidad y accesibilidad por decisión expresa del usuario para textos legales); se traduce la interfaz.
- L4 Evidencia T1: `TitulosInscripcion` exporta `TRAMITE_FIELDS` (sin cambio de comportamiento: sus 15 pruebas siguen en verde) y `Legalizaciones` los reutiliza sin la nota del CONES, con los textos de ayuda de categorías y arancel ajustados. `migrate:create` generó solo objetos nuevos (sin efectos sobre tablas existentes, a diferencia de `legales_01`); SQL vuelto idempotente y `prevId` corregido a mano. Verificada en una base sintética (ya borrada): (0) la cadena completa sube desde vacío; (1) reaplicar el SQL no da errores; (2) `down` con una fila se rechaza y deja tabla y fila; (3) `down` sin filas borra solo las tablas de legalizaciones sin tocar `titulos_inscripcion` ni `politica_privacidad`; (4) volver a subir funciona. 11 pruebas nuevas; suite 169 archivos, 2788 pruebas.
- L5 Evidencia T2-T3: `getLegalizaciones` reutiliza `mapTitulosInscripcion` (los dos globals comparten forma) con 13 pruebas junto con la siembra (estados, arancel solo de la fila enlazada, nota del CONES nula, idempotencia, no pisa lo editado, solo GET/POST, destino remoto y clave débil rechazados sin imprimir la credencial). Honestidad de proceso: el código de la consulta y la siembra se escribió antes que sus pruebas (no se observó el rojo previo en estos dos). **Aviso:** requisitos, pasos, plazo y arancel se cargan tal como estaban, sin revisión de la fuente. Siembra real en el CMS local: pendiente de las credenciales del usuario.
- L6 Evidencia T4: `/legalizaciones` reutiliza `TitulosHero`, `TiposDocumentos` (props del CONES ahora opcionales) y `PasosProcedimiento`; usa los mensajes (la anterior no cambiaba con el idioma), español en «usted», salidas a /titulos, aranceles y Contacto; se retira el pie con la dirección escrita. 15 pruebas de página; suite completa: 171 archivos, 2817 pruebas; `tsc` y eslint sin errores.
- L7 Evidencia T5: el usuario sembró el CMS local; el global trae 3 categorías, 10 pasos, plazo 12–24 y el arancel enlazado (50000, de la fila de aranceles). `/legalizaciones` (vista en inglés) muestra el título del CMS, los datos del trámite («12 to 24 business hours», «Gs. 50.000», unidad), el índice de categorías, las tres categorías con sus requisitos y los pasos, con las salidas a /titulos, aranceles y Contacto con prefijo de idioma; sin voseo ni desborde horizontal. No revisado en navegador: móvil, gn y pt-BR, ni el estado con el CMS caído (cubiertos por pruebas). Pendiente fuera del repositorio: Secretaría General debe confirmar requisitos, pasos, plazo y arancel antes de publicar. Orden de despliegue: migración `legalizaciones_01` → siembra → portal.
