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

- [x] T1 Colección + validadores + migración + registro + tipos (S2, S3, S7) · inline · commit: e54ff94
- [x] T2 Modelo, consulta y siembra (S4, S5) · inline · commit: b15595a
- [x] T3 Página, error, esqueleto y mensajes (S6) · inline · commit: (siguiente)
- [ ] T4 Verificación: migración en base sintética, suite, tipos, navegador (S1-S7) · inline · commit: —

Ruta: todas inline (unidades dependientes; sin subagentes pagos por regla del usuario). Risk: ítem 1 (migración con tablas nuevas) → T1 en su propio commit. Tras `migrate:create` correr la suite completa (el `prevId` del snapshot sale en cero).

## Log

- L1 (2026-11-08) Pedido del usuario: «sigue» (tras dejar `contacto/dependencias` identificada como la página con el directorio escrito en el código).
- L2 Evidencia: `app/[locale]/contacto/dependencias/page.tsx` trae 7 dependencias con 10 sedes en el código, sin `getT` (español fijo, voseo «Encontrá»), enlaces `/contacto` sin prefijo de idioma, sin estados.
- L3 Evidencia T1: `migrate:create` generó solo objetos nuevos (cuatro tablas y la columna de bloqueo); SQL vuelto idempotente y `prevId` corregido a mano. Verificada en una base sintética (ya borrada): (0) la cadena completa sube desde vacío; (1) reaplicar el SQL no da errores; (2) `down` con una fila se rechaza y deja la fila; (3) `down` sin filas borra solo las tablas de dependencias; (4) volver a subir funciona. Honestidad de proceso: el código de la colección, el modelo y la siembra se escribió antes que parte de sus pruebas (el rojo previo se observó solo en el modelo y en la página).
- L4 Evidencia T2-T3: la siembra convierte de forma programática las 7 dependencias y 10 sedes del código anterior (sin copiar a mano); el contenido sembrado pasa por el mapeador sin perder teléfonos ni correos. La página usa `PageHero`/`StatePanel`, 4 idiomas, español en «usted»; se quitó su excepción de `safe-url.spec.ts`. Suite completa: 178 archivos, 2901 pruebas; `tsc` del portal y del CMS y eslint sin errores. **Aviso:** los datos se cargan tal como estaban, sin revisión de la fuente; cada unidad debe confirmarlos. Siembra real en el CMS local y vista en navegador: pendientes de las credenciales del usuario.
