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

- [x] T1 Globals + localización + migración + revalidación + tipos (S2, S3, S7) · inline · commit: def2d03
- [x] T2 Modelo y consultas con estados (S4) · inline · commit: e31c00b
- [x] T3 Siembra (S5) · inline · commit: (siguiente)
- [ ] T4 Páginas, error, esqueleto y mensajes (S6) · inline · commit:
- [ ] T5 Verificación: migración en base sintética, suite, tipos, navegador (S1-S7) · inline · commit:

Ruta: todas inline (unidades dependientes; sin razón de escritor delegado; sin subagentes pagos por regla del usuario). Risk: ítem 1 (migración con tablas nuevas y activación de localización en el CMS) → T1 en su propio commit. Tras `migrate:create` correr la suite completa (el `prevId` del snapshot sale en cero) y comprobar en una base sintética que la migración no toca tablas existentes.

## Log

- L1 (2026-11-07) Pedido del usuario: «Sí, siguiente» (siguiente página sin rediseñar: `/privacidad` y `/accesibilidad`).
- L2 (2026-11-07) Decisión del usuario sobre el origen del texto: «Pasar a CMS y rediseñar».
- L3 (2026-11-07) Decisión del usuario sobre los idiomas: «CMS con un texto por idioma (Recomendado)».
- L4 Evidencia: 7 secciones de privacidad y 6 características de accesibilidad en `messages/*/pages.{privacidad,accesibilidad}.json`; el correo `secgral@unc.edu.py` está escrito en `app/[locale]/accesibilidad/page.tsx`; el español de accesibilidad usa voseo («Podés», «Usá», «encontrás», «escribinos»). El CMS no tenía localización (los globals existentes, p. ej. `titulos-inscripcion`, son solo en español).
- L5 Evidencia T1: al activar la localización, `migrate:create` generó además el enumerado `_locales` y, en las tablas de versiones `_noticias_v` y `_paginas_v`, las columnas nulas `snapshot` y `published_locale` (con índices y enumerados): es el único efecto sobre tablas existentes, aditivo y sin NOT NULL ni DEFAULT; una prueba lo fija. SQL vuelto idempotente y `prevId` del snapshot corregido a mano (salió en cero). Verificada en una base sintética (`unc_legales_chk`, ya borrada): (0) la cadena completa sube desde vacío; (1) reaplicar el SQL de `up` no da errores; (2) `down` con una fila se rechaza y deja tabla y fila; (3) `down` sin filas borra las tablas de los globals y las columnas de versiones sin tocar `noticias` ni `calendario_academico`; (4) volver a subir funciona. 11 pruebas nuevas; suite completa: 163 archivos, 2688 pruebas; `tsc` del CMS sin errores; tipos regenerados.
- L6 Evidencia T2: `mapPoliticaPrivacidad`, `mapDeclaracionAccesibilidad`, `formatMesAnio`, `paragraphs` y las dos consultas con 15 pruebas (fecha en UTC sin corrimiento de mes, correo inválido sin enlace, idioma desconocido pedido como español, idioma sin texto usa el español y lo marca `fallback`, `empty` vs `unavailable`, el mensaje del error no se registra). Decisión: `fallback-locale=none` y un segundo pedido en español, porque el respaldo automático de Payload no dice si usó el español y un texto legal sin aviso podría confundirse con su traducción.
- L7 Evidencia T3: `scripts/lib/legalesSeedData.mjs` se genera desde los mensajes actuales de los cuatro idiomas (7 secciones y 6 características por idioma); el español se corrigió a «usted» (Puede aumentar, Puede activar, Use Tab para moverse). El guaraní ya tenía traducción propia y se conserva. 11 pruebas (datos, ida y vuelta por el modelo, dry-run sin red con aviso, crea 2 globals en 4 idiomas, repetir omite, no pisa lo editado, solo GET/POST, error de escritura contado, destino remoto y clave débil rechazados sin imprimir la credencial). **Aviso:** textos legales cargados tal cual, sin revisión jurídica; la fecha es el primer día de «agosto de 2026». Siembra real en el CMS local: pendiente de las credenciales del usuario.
