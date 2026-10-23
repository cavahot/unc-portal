# Migraciones Payload/PostgreSQL

Fuente única del esquema de cualquier entorno persistente (DEP-07). Prohibido `push` fuera de dev local.

## Contenido

- `20261017_021341_arch_db_02_baseline.ts` y `.json`: línea base (64 tablas) generada en una BD vacía.
- `20261022_134500_dep_03_created_by.ts` y `.json`: DEP-03, añade `createdBy` (autoría, NULLABLE, FK `ON DELETE set null`,
  índice) a `noticias`, `paginas` y sus tablas de versiones. Solo hacia adelante, sin `DROP`, sin tocar datos; su `down`
  no hace nada. El relleno de autores heredados es un script aparte, revisado y NO ejecutado (ver la spec DEP-03).
- `index.ts`: índice que Payload importa. Debe coincidir con los `.ts` y `.json` del directorio
  (lo verifica `tests/deploy/dep07-schema-path.red.test.mjs`).

## Reglas

- Las migraciones corren solo hacia adelante en producción: `payload migrate` desde el servicio
  `cms-migrate` (imagen `migrator` de `apps/cms/Dockerfile`), después de un `pg_dump` verificado.
- `down` del baseline lanza error si alguna tabla de datos tiene filas (solo BD vacía). Nunca se ejecuta
  en el deploy automático (`migrate:down|reset|refresh|fresh` están prohibidos en CI/deploy).
- Una BD con una fila `batch = -1` en `payload_migrations` (esquema creado por push en dev) no se migra:
  el CLI preguntaría de forma interactiva y sin TTY saldría con 0 sin aplicar nada.
- Los datos iniciales se cargan con `scripts/setup/restore-data-prod.sh` (solo datos, tablas vacías).
- Una migración nueva se crea con `npm run payload --workspace=@unc/cms -- migrate:create <nombre>`,
  se revisa a mano y se prueba con `up` en una BD sintética vacía antes de mergear.
