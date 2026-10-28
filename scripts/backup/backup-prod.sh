#!/usr/bin/env bash
# BACKUP-MEDIA-01 — Trabajo programado de producción: BD cifrada + media cifrada + copia externa.
#
# Uso (cron): bash scripts/backup/backup-prod.sh
# Variables: ver backup-lib.sh / backup-media.sh; POSTGRES_DB y POSTGRES_USER salen del entorno o de
#   infrastructure/docker/.env.prod; PG_CONTAINER (def. unc-postgres-prod).
# Salida: `DB_BACKUP=<ruta>` y `MEDIA_BACKUP=<ruta>`. Código != 0 si falla la copia LOCAL de la BD o de la media.
#
# Qué hace: (1) `docker exec <pg> pg_dump -Fc` canalizado a gpg: `db-<UTC>.dump.gpg`, sin .dump en claro;
# (2) backup-media.sh; (3) retención de db-*.dump.gpg; (4) offsite-push.sh con SOLO los .gpg nuevos
# (no fatal) y, si no hay BACKUP_REMOTE, el aviso «COPIA EXTERNA NO CONFIGURADA».
# Por qué: un único punto de entrada para cron que cubre BD + archivos y empuja ambos fuera del servidor.
# Límites: si la media falla pero la BD sale bien, igual se sube la BD y el código final es != 0 (alerta);
# un contenedor de media inexistente (código 3) no se considera fallo.
set -euo pipefail
umask 077
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=backup-lib.sh
. "$HERE/backup-lib.sh"
bk_load_env

PG="${PG_CONTAINER:-unc-postgres-prod}"
DAYS="${BACKUP_RETENTION_DAYS:-14}"
case "$DAYS" in '' | *[!0-9]*) echo "ERROR: BACKUP_RETENTION_DAYS debe ser un entero." >&2; exit 1 ;; esac
"$HERE/encrypt-dump.sh" --check > /dev/null || { echo "ERROR: backup abortado (cifrado no disponible)." >&2; exit 1; }
DB="${POSTGRES_DB:-}"; DBUSER="${POSTGRES_USER:-}"
if [ -z "$DB" ] || [ -z "$DBUSER" ]; then echo "ERROR: faltan POSTGRES_DB / POSTGRES_USER (entorno o .env.prod)." >&2; exit 1; fi

DIR="$(bk_local_dir)"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DBOUT="$DIR/db-$STAMP.dump.gpg"
RC=0
PUSH=()

# 1) BD: pg_dump -> gpg, sin archivo en claro. Si algo falla se borra el .gpg parcial.
if docker exec "$PG" pg_dump -U "$DBUSER" -d "$DB" -Fc | "$HERE/encrypt-dump.sh" --encrypt-stream "$DBOUT" > /dev/null \
   && "$HERE/encrypt-dump.sh" --verify-archive "$DBOUT" pgdump > /dev/null; then
  (cd "$DIR" && sha256sum --text -- "$(basename -- "$DBOUT")") > "$DBOUT.sha256"
  chmod 600 "$DBOUT" "$DBOUT.sha256"
  echo "DB_BACKUP=$DBOUT"
  PUSH+=("$DBOUT")
  # Retención solo sobre el patrón propio de la BD.
  find "$DIR" -maxdepth 1 -type f \( -name 'db-*.dump.gpg' -o -name 'db-*.dump.gpg.sha256' \) -mtime "+$DAYS" -delete
else
  rm -f -- "$DBOUT" "$DBOUT.sha256"
  echo "ERROR: el respaldo cifrado de la BD falló." >&2
  RC=1
fi

# 2) Media: 0 = ok, 3 = sin contenedor (no es fallo), otro = fallo.
set +e
MEDIA_OUT="$("$HERE/backup-media.sh")"; MRC=$?
set -e
printf '%s\n' "$MEDIA_OUT"
if [ "$MRC" -eq 0 ]; then
  # La línea `MEDIA_BACKUP=<ruta>` de la salida es la ruta del .gpg nuevo.
  PUSH+=("$(printf '%s\n' "$MEDIA_OUT" | sed -n 's/^MEDIA_BACKUP=//p' | tail -n1)")
elif [ "$MRC" -ne 3 ]; then
  RC=1
fi

# 3) Copia externa (no fatal; con lista vacía solo se registra el estado).
if [ "${#PUSH[@]}" -gt 0 ]; then
  "$HERE/offsite-push.sh" "${PUSH[@]}" || RC=1
else
  echo "AVISO: no hay archivos nuevos que enviar fuera del servidor." >&2
fi
exit "$RC"
