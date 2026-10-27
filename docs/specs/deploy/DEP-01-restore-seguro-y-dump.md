# DEP-01 — Restore de producción con backup verificado previo

**Estado:** implementación local propuesta; pendiente de revisión humana. **Backlog:** DEP-01 (hallazgo C1). **RDD:** `docs/research/evidence-register.md` (RDD-DEP-01). **Tarea:** `docs/security/TASK-DEPLOY-001-remediacion-auditoria-predeploy.md`.

## Contrato

- `scripts/setup/restore-db-prod.sh` no ejecuta `DROP SCHEMA public CASCADE` sobre una base con datos sin antes tener un respaldo propio, no vacío y legible.
- "Base con datos" significa: al menos una tabla en el esquema `public` (conteo vía `psql` dentro del contenedor). Con 0 tablas no se exige respaldo.
- El respaldo se genera con `pg_dump -Fc` vía `docker exec`, se escribe en el host en `backups/pre-restore-<UTC timestamp>.dump` (formato `YYYYMMDDTHHMMSSZ`) y el script informa la ruta.
- Verificación del respaldo: archivo con tamaño > 0 y `pg_restore --list` exitoso. Cualquier fallo aborta con exit distinto de 0 **antes** del `DROP`.
- El `DROP SCHEMA` no se silencia ni usa `|| true`: si falla, el script aborta (`set -e`) y `pg_restore` no se ejecuta.
- La confirmación explícita `SI` se mantiene sin cambios.
- Límite del control: el respaldo local no sustituye un backup cifrado fuera del host (DEP-08) ni protege ante pérdida del servidor. `backups/` puede contener PII: no se versiona (`.gitignore`/`.dockerignore`).

## Escenarios Given/When/Then

1. (a) Dado una BD con tablas en `public` y `pg_dump` que falla, cuando el operador confirma `SI`, entonces el script sale con código != 0 y no se invoca el `DROP` ni `pg_restore`.
2. (b) Dado `pg_dump` exitoso pero con salida vacía, o un dump que `pg_restore --list` no puede leer, cuando se confirma `SI`, entonces aborta con código != 0 antes del `DROP`.
3. (c) Dado un respaldo válido y un `DROP SCHEMA` que falla, cuando se continúa, entonces el script aborta con código != 0 y `pg_restore` no se ejecuta.
4. (d) Dado una BD con 0 tablas en `public`, cuando se confirma `SI`, entonces no se invoca `pg_dump`, se ejecuta el `DROP` y el restore, y sale con 0.
5. (e) Dado una BD con tablas y todo correcto, cuando se restaura, entonces existe `backups/pre-restore-<UTC>.dump` en el host, el script imprime esa ruta y el orden es: pg_dump, `pg_restore --list`, DROP, pg_restore.
6. (f) Dado cualquier entrada distinta de `SI`, cuando se ejecuta, entonces cancela con exit 0 sin tocar Docker más allá de lo previo a la confirmación.

## Escenarios adicionales (revisión: MEDIO-1, MEDIO-2, MEDIO-4, BAJO)

7. (g) Permisos del backup: dado una BD con tablas, cuando se genera `backups/pre-restore-<UTC>.dump`, entonces el script aplica `umask 077`, `chmod 700 backups` (aunque la carpeta ya existiera con 755) y `chmod 600` al dump. Prueba (i): el shim registra `umask` en el momento del `pg_dump` y, si el FS refleja `chmod`, el modo de `backups/` y del dump.
8. (h) Limpieza ante fallo: dado cualquier salida del script (éxito o aborto por pg_dump, listado, DROP), entonces `setup/seed.dump` no existe (`trap ... EXIT` tras `gunzip -k`). Prueba (j) y aserción en (a), (b1), (b2), (c), (d), (e), (f).
9. (k) CRLF: dado `.env.prod` con fin de línea CRLF, entonces usuario y BD llegan a `docker` sin retorno de carro (`tr -d '\r'`).
10. (l) Contenedor ausente: dado `docker ps` sin `unc-postgres-prod` (la salida se captura en una variable en vez de `| grep -q` bajo `pipefail`), entonces aborta antes de cualquier acción.
11. Prueba del propio test (h): `GIT_BASH` usa `String.raw` y la prueba falla si la ruta se corrompe; el test imprime qué `bash` ejecutó.

**Límites:** (1) en NTFS/Git Bash `chmod` no se refleja de forma fiable; allí sólo se verifica `umask 077` y la comprobación de modos se omite con una nota (verificación real de 700/600 pendiente en Linux/staging). (2) Git Bash recorta CR en `$(...)`, por lo que la prueba CRLF no es RED en Windows; se añade una aserción estática sobre el script. (3) `trap EXIT` no cubre SIGKILL.

## Fuera de alcance (decisión humana pendiente)

- Purga del historial git y decisión de sacar `setup/seed.dump.gz` del repo (`git rm --cached` es acción humana; ignorar el archivo no lo desversiona, por lo que `guard-tracked-secrets` sigue rojo).
- Rotación de credenciales/sesiones si el dump las contiene (contenido del dump no inspeccionado).
- Backup cifrado off-host (DEP-08).
- Pruebas con Docker/Postgres reales: las pruebas usan un shim `docker` sintético.
