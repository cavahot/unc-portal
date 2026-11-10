# Cambios del Portal UNC

Formato: una sección por versión, la más nueva arriba. Numeración y flujo en `docs/deploy/VERSIONES.md`. Las notas
completas de cada versión están en su Release de GitHub.

## [Sin publicar]

- Guía de instalación para el traspaso (`docs/deploy/README-VPS.md`), paquete de entrega (`docs/deploy/ENTREGA.md`) y
  esquema de versiones (`docs/deploy/VERSIONES.md`).

## [1.0.0-rc.1] — 2026-11-10 — candidata para staging

Commit `6d41c22` de `chain/rediseno-portal`. Notas completas:
https://github.com/cavahot/unc-portal/releases/tag/v1.0.0-rc.1

- Portal con contenido desde el CMS y estados claros en calendario, revistas, privacidad, accesibilidad, mapa del sitio,
  buscador, legalizaciones, títulos, contactos por dependencia y preguntas frecuentes.
- Pilares académicos en la portada (Docencia, Investigación, Extensión) y páginas en construcción administradas desde
  el CMS.
- Megamenú editable desde el CMS (vista de estructura, selectores de páginas y secciones, Docencia y Tesis Académicas).
- Traducciones de menú, mapa del sitio, pie y secciones académicas; título de pestaña sin marca repetida; al cambiar
  de idioma la página empieza en el hero.
- Migración de WordPress: normalización y sin duplicados.
- Seguridad SEC-027: matriz de roles 99/99 con cuentas sintéticas locales y minimización de datos de cuentas.
- Despliegue: instalador guiado, staging aislado, endurecimiento de SSH, respaldos en el servidor.

Pendiente antes de producción: ensayo en staging, revisión de seguridad independiente, rotación de contraseñas
expuestas, revisión del guaraní y confirmación de contenidos.
