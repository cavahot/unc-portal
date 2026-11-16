# tramites-cms

Objetivo: pasar al CMS los requisitos de `/tramites` (hoy escritos en `components/tramites/FacultadTabs.tsx`) y rediseñar la página con el sistema visual del portal.
Rama: `feat/tramites-cms` (desde `feat/carreras-rediseno`). Entrega: `ask-on-risk`. Ejecutor de pruebas: `npx vitest run`.
Spec: `docs/specs/portal/TRAMITES.md`.

## Specs

- S1 Colección `tramites` en el CMS: facultad (relación), título, descripción, requisitos (lista de textos), nota, etiqueta, orden y activa (spec §2.1).
- S2 Lectura pública solo de los activos; escritura con `canWriteInstitutional`; revalidación por etiqueta `tramites` al guardar y al borrar (spec §2.2).
- S3 Migración idempotente: crea `tramites` y `tramites_requisitos`; `down` se niega a correr si hay filas (spec §2.3).
- S4 Consulta del portal con estados `ok`/`empty`/`unavailable` agrupada por facultad, sin datos en el código (spec §2.4).
- S5 Siembra idempotente con el contenido hoy publicado (18 trámites con 84 requisitos de 6 facultades), copiado del componente actual sin retranscribir, sin pisar ediciones (spec §2.5).
- S6 `/tramites` en el sistema visual: cabecera compartida, índice de facultades, trámites como filas legibles sin pestañas, aviso en línea, `error.tsx`, 4 idiomas, sin voseo (spec §2.6).
- S7 Se retira `FacultadTabs.tsx` y las claves de mensajes que ya nadie usa; el aviso de ayuda enlaza a `/contacto` en lugar de un correo escrito en la página.

## Tasks

- [x] T0 Spec y documento ODD (S1-S7) · inline · commit: 13f57d9
- [x] T1 Colección + migración idempotente + etiquetas de revalidación + tipos (S1-S3) · inline · commit: d806bab
- [x] T2 Modelo y consulta del portal con estados (S4) · inline · commit: 5a3563b
- [x] T3 Siembra desde los datos actuales (S5) · inline · commit: 60dd5d2
- [x] T4 Página, error, esqueleto, mensajes y retiro de `FacultadTabs` (S6, S7) · inline · commit: (siguiente)
- [ ] T5 Verificación: migración en base sintética, siembra local, suite, tipos, HTML y navegador (S1-S7) · inline · commit:

Ruta: todas inline (unidades dependientes; sin razón de escritor delegado). Risk: ítem 1 (migración con tablas nuevas) → T1 en su propio commit. Sin subagentes pagos (regla del usuario): la verificación de la migración la hago yo en una base descartable.

## Log

- L1 (2026-11-07) Pedido del usuario: «sigamos con tramites»
- L2 (2026-11-07) Decisión del usuario ante el hallazgo de que el contenido está en el código: «Pasarlo al CMS y rediseñar (Recomendado)»
- L3 Evidencia: `components/tramites/FacultadTabs.tsx` (529 líneas, cliente) contiene 6 facultades con 18 trámites y 84 requisitos (notas, artículos, horarios y contactos) y logos/acento por facultad; la página solo agrega un hero oscuro y un aviso con `secgral@unc.edu.py`. No existe colección ni global de trámites en el CMS. Los mensajes `tramites.t1..t6` y `seeMore` no los usa ninguna página.
- L4 Decisión de diseño: sin pestañas (ocultan contenido a buscadores e impresión); índice de facultades en la cabecera con anclas, igual que `/carreras`. Se omite `accent` y los logos por facultad (decoración). El enlace opcional por trámite (`linkHref`) no tiene ningún dato en el código actual, así que no se modela (se agrega si se necesita).
- L5 Evidencia T1: migración generada con `migrate:create` y vuelta idempotente. Verificada en una base sintética (`unc_tramites_chk`, ya borrada): (1) toda la cadena sube desde vacío; (2) reaplicar el SQL de `up` no da errores; (3) `down` con una fila se rechaza y deja tabla y fila intactas; (4) `down` sin filas borra `tramites`, `tramites_requisitos` y la columna de bloqueo sin tocar `facultades`; (5) volver a subir funciona. 11 pruebas nuevas (migración, colección, acceso, revalidación); `tsc` del CMS sin errores. RED: las pruebas se escribieron junto con el código (no se observó fallo previo).
- L6 Evidencia T2: `mapTramite`/`agruparTramites`/`getTramites` con 10 pruebas (descarta inactivos, sin título o sin facultad; no inventa nota ni descripción; orden por `orden` y título; `empty` vs `unavailable`; el código no trae requisitos ni facultades). `tsc` del portal sin errores.
- L7 Corrección de cifras: la estimación inicial («≈25 trámites») era errónea; el componente tiene 18 trámites con 84 requisitos (medicina 2, odontología 3, agrarias 5, económicas 3, humanidades 2, exactas 3). Evidencia T3: `scripts/lib/tramitesSeedData.mjs` se genera con un extractor que recorre el arreglo del componente (sin retranscribir) y falla si encuentra un enlace por trámite o una facultad sin slug; 10 pruebas (datos, límites del CMS, dry-run sin red, crea 18 y repetir omite 18 sin PATCH/PUT/DELETE, no pisa existentes, facultad ausente = error sin huérfanos, destino remoto y clave débil rechazados sin imprimir la credencial). Siembra real en el CMS local: pendiente de las credenciales del usuario.
- L8 Hallazgo en T4 (suite completa): la guarda de la cadena de snapshots (`dep-sec-01-reset-password-migration.spec.ts`) falló porque `migrate:create` escribió el UUID nulo como `prevId` del snapshot de `tramites_01`. Corregido para que apunte al `id` del snapshot anterior (2 líneas del JSON; el diff de esquema y el SQL eran correctos). Lección: tras `migrate:create` correr la suite completa, no solo las pruebas de la migración. Evidencia T4: `/tramites` lee de `getTramites()` y muestra todas las facultades a la vez con índice de anclas; 15 pruebas de página; se retiró `FacultadTabs.tsx` (529 líneas) y sus 2 referencias; claves `tramites.t1..t6`, `seeMore` y `hero.label` retiradas de los 4 idiomas. Suite completa: 154 archivos, 2556 pruebas; `tsc` del portal y del CMS y lint sin errores.
