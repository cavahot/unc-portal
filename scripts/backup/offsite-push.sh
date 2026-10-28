#!/usr/bin/env bash
# BACKUP-MEDIA-01 (C) — Sube a un destino EXTERNO solo archivos cifrados (.gpg) y registra el resultado.
#
# Uso: offsite-push.sh <archivo.gpg> [<archivo.gpg> ...]
# Variables: BACKUP_REMOTE (vacío = no configurado), BACKUP_SSH_KEY (opcional), BACKUP_LOCAL_DIR.
#
# Qué hace: sin BACKUP_REMOTE avisa y registra state=not_configured; con destino rclone (`remoto:ruta`) usa
# `rclone copyto`; con destino SSH (`ssh://user@host[:p]/ruta` o `user@host:/ruta`) usa rsync sobre SSH con
# BatchMode. Escribe `.offsite-status` (ok|failed|not_configured).
# Por qué: el disco del VPS comparte destino con los datos; sin copia externa perder el servidor es perder todo.
# Reglas duras: (1) NUNCA se sube texto plano: cualquier argumento que no termine en .gpg aborta con código 2 antes
# de invocar ningún transporte; (2) un fallo de red NO es fatal (código 0): la copia local ya existe y un respaldo
# que falla por la red no debe tumbar el trabajo programado; se avisa fuerte y se registra state=failed.
# Límites: no verifica que el destino conserve el archivo ni su retención; la llave nunca se imprime.
set -euo pipefail
umask 077
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=backup-lib.sh
. "$HERE/backup-lib.sh"
bk_load_env

if [ "$#" -eq 0 ]; then echo "Uso: offsite-push.sh <archivo.gpg>..." >&2; exit 2; fi

# Regla dura: solo cifrados. Se revisan TODOS antes de tocar la red.
for f in "$@"; do
  case "$f" in
    *.gpg) [ -f "$f" ] || { echo "ERROR: $f no existe." >&2; exit 2; } ;;
    *) echo "ERROR: se rechaza subir '$(basename -- "$f")': solo se envían archivos .gpg (cifrados). Nada fue enviado." >&2; exit 2 ;;
  esac
done

REMOTE="${BACKUP_REMOTE:-}"
if [ -z "$REMOTE" ]; then
  bk_notice_not_configured
  bk_status not_configured "sin BACKUP_REMOTE"
  exit 0
fi

# Falla de forma no fatal: advertencia fuerte + estado, sin imprimir el destino completo ni la llave.
fail_soft() {
  echo "ADVERTENCIA: la copia EXTERNA FALLÓ ($1). La copia local se conserva, pero NO hay copia fuera del servidor." >&2
  bk_status failed "$1"
  exit 0
}

KIND="$(bk_remote_kind "$REMOTE")" || fail_soft "BACKUP_REMOTE con formato no válido"
KEY="${BACKUP_SSH_KEY:-}"
if [ -n "$KEY" ] && ! bk_valid_key_path "$KEY"; then fail_soft "BACKUP_SSH_KEY no es una ruta absoluta válida"; fi

if [ "$KIND" = "rclone" ]; then
  command -v rclone > /dev/null 2>&1 || fail_soft "rclone no está instalado"
  base="$REMOTE"
  case "$base" in *: | */) ;; *) base="$base/" ;; esac
  for f in "$@"; do
    rclone copyto "$f" "${base}$(basename -- "$f")" > /dev/null 2>&1 || fail_soft "rclone copyto falló"
  done
else
  command -v rsync > /dev/null 2>&1 || fail_soft "rsync no está instalado"
  PORT=""; DEST="$REMOTE"
  if [[ "$REMOTE" == ssh://* ]]; then
    rest="${REMOTE#ssh://}"; userhost="${rest%%/*}"; path="/${rest#*/}"
    if [[ "$userhost" == *:* ]]; then PORT="${userhost##*:}"; userhost="${userhost%:*}"; fi
    DEST="${userhost}:${path}"
  fi
  case "$DEST" in */) ;; *) DEST="$DEST/" ;; esac
  SSH_CMD="ssh -o BatchMode=yes -o ConnectTimeout=15 -o StrictHostKeyChecking=accept-new"
  if [ -n "$KEY" ]; then SSH_CMD="$SSH_CMD -i $KEY"; fi
  if [ -n "$PORT" ]; then SSH_CMD="$SSH_CMD -p $PORT"; fi
  rsync -a --timeout=120 -e "$SSH_CMD" -- "$@" "$DEST" > /dev/null 2>&1 || fail_soft "rsync sobre SSH falló"
fi

bk_status ok "$# archivo(s) cifrados enviados"
echo "Copia externa OK: $# archivo(s) .gpg enviados."
