#!/usr/bin/env bash
# BACKUP-MEDIA-01 — Restaura un respaldo cifrado de media (media-<UTC>.tar.gz.gpg) en el volumen del CMS.
#
# Uso: BACKUP_ENCRYPTION_PASSPHRASE=... restore-media.sh <media-*.tar.gz.gpg> [--yes]
# Variables: CMS_CONTAINER (def. unc-cms-prod), BACKUP_ENV_FILE (def. /opt/unc-portal/.env.backup).
#
# Qué hace: (1) exige un .gpg; (2) si existe `<archivo>.sha256` lo comprueba (un archivo manipulado o corrupto
# aborta); (3) verifica que descifra a un tar legible (frase equivocada = aborta ANTES de tocar el volumen);
# (4) pide confirmación (escribir SI, o --yes); (5) descifra a una tubería y extrae en /app/media del contenedor;
# (6) corrige el dueño a 1001:1001 (usuario `nextjs` del CMS).
# Por qué: restaurar la BD sin la media deja filas sin archivo; y extraer un archivo no verificado sobre el volumen
# vivo podría mezclar o dañar contenido. Amenaza: respaldo alterado / frase equivocada.
# Límites: la extracción SUPERPONE archivos (no borra los que ya están y no vienen en el respaldo); es una copia en
# caliente, no un snapshot; el CMS debe estar corriendo (docker exec). Restaurar la BD primero (ver docs/BACKUP_RECOVERY.md).
# La frase de paso nunca se imprime ni va en argv.
set -euo pipefail
umask 077
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=backup-lib.sh
. "$HERE/backup-lib.sh"
bk_load_env

FILE="${1:-}"; YES="${2:-}"
if [ -z "$FILE" ]; then echo "Uso: restore-media.sh <media-*.tar.gz.gpg> [--yes]" >&2; exit 2; fi
case "$FILE" in *.gpg) ;; *) echo "ERROR: se espera un archivo .gpg (respaldo cifrado)." >&2; exit 1 ;; esac
[ -s "$FILE" ] || { echo "ERROR: $FILE no existe o está vacío." >&2; exit 1; }
CMS="${CMS_CONTAINER:-unc-cms-prod}"

# 1) Integridad: la suma sha256 acompaña al respaldo (se escribió con el nombre sin ruta).
if [ -f "$FILE.sha256" ]; then
  (cd "$(dirname -- "$FILE")" && sha256sum -c -- "$(basename -- "$FILE").sha256" > /dev/null 2>&1) \
    || { echo "ERROR: el sha256 no coincide: respaldo corrupto o manipulado. No se restauró nada." >&2; exit 1; }
else
  echo "AVISO: no hay $(basename -- "$FILE").sha256; se continúa solo con la verificación de descifrado." >&2
fi

# 2) Descifrado + listado del tar (falla con frase equivocada o archivo dañado).
"$HERE/encrypt-dump.sh" --verify-archive "$FILE" tar > /dev/null \
  || { echo "ERROR: el respaldo no descifra/lista con la frase actual. No se restauró nada." >&2; exit 1; }

docker inspect "$CMS" > /dev/null 2>&1 || { echo "ERROR: el contenedor $CMS no existe/corre." >&2; exit 1; }

# 3) Confirmación humana: la extracción sobrescribe archivos del volumen vivo.
if [ "$YES" != "--yes" ]; then
  printf "ATENCIÓN: se extraerá el respaldo sobre /app/media de %s. Escriba SI para continuar: " "$CMS" >&2
  ANS=""; IFS= read -r ANS || true
  if [ "$ANS" != "SI" ]; then echo "Restauración cancelada." >&2; exit 0; fi
fi

# 4) Extracción: gpg -> tubería -> tar dentro del contenedor; luego dueño 1001:1001 (como root del contenedor).
"$HERE/encrypt-dump.sh" --decrypt-stream "$FILE" | docker exec -i "$CMS" tar -xzf - -C /app/media
docker exec -u 0 "$CMS" chown -R 1001:1001 /app/media
echo "Media restaurada en $CMS:/app/media (dueño 1001:1001). Compruebe GET /api/media/file/<archivo conocido> = 200."
