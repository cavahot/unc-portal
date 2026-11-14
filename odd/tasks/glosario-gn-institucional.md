# Glosario guaraní: aprobación de traducciones institucionales de la UNC
Objetivo: que una traducción hecha por la UNC, sin fuente oficial, pueda aprobarse y usarse en el portal con responsables identificados y auditada.
Rama `feat/glosario-gn-institucional` (desde `chain/rediseno-portal`). Entrega: un PR al tracker. Pruebas: `npx vitest run` y `npx tsc --noEmit -p apps/cms`.

## Specs
- S1 — Aprobación institucional: «Sí, habilítala», respuesta a la propuesta «un tipo "Institucional (UNC)" que exija nombre y cargo del traductor, revisión de un hablante nativo y aprobación de un superadmin, todo auditado». Una glosa de `tipo = institucional` puede aprobarse sin fuente oficial si tiene traducción, confianza A o B, `traductorNombre`, `traductorCargo` y `revisorNativo`. Si falta alguno, 400 con el motivo. Los demás tipos siguen exigiendo fuente oficial y su URL.
- S2 — Solo superadmin aprueba (sin cambios: rol que autoriza, no el crudo).
- S3 — El portal (`/api/guarani-dictionary`) usa las glosas aprobadas oficiales **y** las institucionales aprobadas; nunca expone los nombres del traductor ni del revisor.
- S4 — Auditoría: la aprobación de una glosa institucional registra traductor, cargo y revisor nativo.
- S5 — Panel: los tres campos se muestran solo para `tipo = institucional`; migración con las tres columnas nuevas.

## Tasks
| ID | Specs | Ruta | Estado | Evidencia |
| --- | --- | --- | --- | --- |
| T1 | S1–S5 | inline (unidad única, ~200 líneas; riesgo ítem 1 por la migración) | pendiente | |
| T2 | S1–S5 | inline | pendiente | prueba real en el panel local, documentación, PR |

## Log
- L1 (2026-11-14, pedido original): «seguimos y ademas revisa la parte del diccionario en guaraní en el cms para poder hacer la traduccion de la palabra del castellano en guaraní e insertarlo en la bd»
- L2 (2026-11-14): revisión: 375 términos, 0 aprobados, 41 oficiales. Cargar funciona; aprobar exige fuente oficial (`validateGuaraniApproval`), así que una traducción de la UNC no podía aprobarse nunca. Propuesta presentada al propietario.
- L3 (2026-11-14, decisión del propietario): «Sí, habilítala».
