# tramites-cms

Objetivo: pasar al CMS los requisitos de `/tramites` (hoy escritos en `components/tramites/FacultadTabs.tsx`) y rediseñar la página con el sistema visual del portal.
Rama: `feat/tramites-cms` (desde `feat/carreras-rediseno`). Entrega: `ask-on-risk`. Ejecutor de pruebas: `npx vitest run`.
Spec: `docs/specs/portal/TRAMITES.md`.

## Specs

- S1 Colección `tramites` en el CMS: facultad (relación), título, descripción, requisitos (lista de textos), nota, etiqueta, orden y activa (spec §2.1).
- S2 Lectura pública solo de los activos; escritura con `canWriteInstitutional`; revalidación por etiqueta `tramites` al guardar y al borrar (spec §2.2).
- S3 Migración idempotente: crea `tramites` y `tramites_requisitos`; `down` se niega a correr si hay filas (spec §2.3).
- S4 Consulta del portal con estados `ok`/`empty`/`unavailable` agrupada por facultad, sin datos en el código (spec §2.4).
- S5 Siembra idempotente con el contenido hoy publicado (≈25 trámites de 6 facultades), copiado del componente actual sin retranscribir, sin pisar ediciones (spec §2.5).
- S6 `/tramites` en el sistema visual: cabecera compartida, índice de facultades, trámites como filas legibles sin pestañas, aviso en línea, `error.tsx`, 4 idiomas, sin voseo (spec §2.6).
- S7 Se retira `FacultadTabs.tsx` y las claves de mensajes que ya nadie usa; el aviso de ayuda enlaza a `/contacto` en lugar de un correo escrito en la página.

## Tasks

- [ ] T0 Spec y documento ODD (S1-S7) · inline · commit:
- [ ] T1 Colección + migración idempotente + etiquetas de revalidación + tipos (S1-S3) · inline · commit:
- [ ] T2 Modelo y consulta del portal con estados (S4) · inline · commit:
- [ ] T3 Siembra desde los datos actuales (S5) · inline · commit:
- [ ] T4 Página, error, esqueleto, mensajes y retiro de `FacultadTabs` (S6, S7) · inline · commit:
- [ ] T5 Verificación: migración en base sintética, siembra local, suite, tipos, HTML y navegador (S1-S7) · inline · commit:

Ruta: todas inline (unidades dependientes; sin razón de escritor delegado). Risk: ítem 1 (migración con tablas nuevas) → T1 en su propio commit. Sin subagentes pagos (regla del usuario): la verificación de la migración la hago yo en una base descartable.

## Log

- L1 (2026-11-07) Pedido del usuario: «sigamos con tramites»
- L2 (2026-11-07) Decisión del usuario ante el hallazgo de que el contenido está en el código: «Pasarlo al CMS y rediseñar (Recomendado)»
- L3 Evidencia: `components/tramites/FacultadTabs.tsx` (529 líneas, cliente) contiene 6 facultades con ≈25 trámites (requisitos, notas, artículos, horarios y contactos) y logos/acento por facultad; la página solo agrega un hero oscuro y un aviso con `secgral@unc.edu.py`. No existe colección ni global de trámites en el CMS. Los mensajes `tramites.t1..t6` y `seeMore` no los usa ninguna página.
- L4 Decisión de diseño: sin pestañas (ocultan contenido a buscadores e impresión); índice de facultades en la cabecera con anclas, igual que `/carreras`. Se omite `accent` y los logos por facultad (decoración). El enlace opcional por trámite (`linkHref`) no tiene ningún dato en el código actual, así que no se modela (se agrega si se necesita).
