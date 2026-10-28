#!/usr/bin/env bash
# BACKUP-MEDIA-01 (D) — Asistente para configurar la copia EXTERNA de los respaldos (pregunta, prueba, y solo entonces escribe).
#
# Uso:
#   configure-offsite.sh                         # interactivo, en español
#   configure-offsite.sh --check                 # muestra el estado leyendo .offsite-status (sin secretos)
#   configure-offsite.sh --non-interactive --type ssh --host H --user U [--port 22] --path /ruta [--key /ruta/llave]
#   configure-offsite.sh --non-interactive --type rclone --remote nombre:ruta
#   Opción común: --env-file <archivo>   (def. BACKUP_ENV_FILE o /opt/unc-portal/.env.backup)
#
# Qué hace: pregunta si ya existe un servidor/almacenamiento externo; si no, explica las opciones y sale 0 dejando
# un recordatorio (state=not_configured). Si sí, pide tipo y datos, PRUEBA la conexión sin destruir nada (ssh
# BatchMode `mkdir -p`+`test -w` en la ruta / `rclone lsd`) y SOLO si pasa escribe BACKUP_REMOTE (y BACKUP_SSH_KEY)
# en el archivo de entorno del respaldo (modo 600, sin tocar otras variables).
# Por qué: sin copia externa el disco del VPS comparte destino con los datos; una configuración que no se probó
# daría falsa seguridad. Amenazas: inyección por host/ruta con metacaracteres (lista blanca estricta), fuga de la
# llave o de la frase de paso por pantalla (nunca se imprimen; el asistente no lee la frase).
# Límites: la prueba no sube un respaldo real ni verifica la retención del destino; la llave debe existir ya y
# estar autorizada en el servidor remoto (ssh-copy-id lo hace el humano). No instala rsync/rclone.
set -euo pipefail
umask 077
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=backup-lib.sh
. "$HERE/backup-lib.sh"

MODE=interactive; ACTION=configure
TYPE=""; HOST=""; RUSER=""; PORT=""; RPATH=""; KEY=""; RREMOTE=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --check) ACTION=check ;;
    --non-interactive) MODE=flags ;;
    --type) TYPE="${2:-}"; shift ;;
    --host) HOST="${2:-}"; shift ;;
    --user) RUSER="${2:-}"; shift ;;
    --port) PORT="${2:-}"; shift ;;
    --path) RPATH="${2:-}"; shift ;;
    --key) KEY="${2:-}"; shift ;;
    --remote) RREMOTE="${2:-}"; shift ;;
    --env-file) BACKUP_ENV_FILE="${2:-}"; shift ;;
    *) echo "Opción desconocida: $1" >&2; exit 2 ;;
  esac
  shift
done
bk_load_env

# --check: lee el estado registrado por la última corrida; no imprime destino, llave ni frase.
if [ "$ACTION" = check ]; then
  SF="${BACKUP_LOCAL_DIR:-/opt/unc-portal/backups}/.offsite-status"
  if [ -n "${BACKUP_REMOTE:-}" ]; then echo "destino configurado: si"; else echo "destino configurado: no"; fi
  if [ -f "$SF" ]; then
    grep -E '^(state|timestamp|detail)=' "$SF"
  else
    echo "state=not_configured"
    echo "detail=aún no hay corridas registradas"
  fi
  exit 0
fi

ask() { # ask "pregunta" VARIABLE  (lee una línea de stdin; vacío = conserva el valor)
  local ans=""
  printf '%s ' "$1" >&2
  IFS= read -r ans || true
  printf -v "$2" '%s' "$ans"
}

say_no_server() {
  cat >&2 << 'TXT'
Sin un destino externo los respaldos solo existen en este servidor. Opciones:
  1) Un segundo servidor accesible por SSH (rsync sobre SSH, con una llave dedicada solo para respaldos).
  2) Un almacenamiento externo (bucket S3/Backblaze/Drive) usando rclone (`rclone config` crea el «remoto»).
  3) Un disco/NAS montado en otra ubicación: apunte BACKUP_LOCAL_DIR allí (protege del fallo de disco, no del servidor).
Cuando lo tenga, vuelva a ejecutar scripts/backup/configure-offsite.sh.
TXT
  bk_status not_configured "pendiente: el dueño aún no tiene destino externo"
}

if [ "$MODE" = interactive ]; then
  ask "¿Ya tiene un servidor o almacenamiento externo para los respaldos? (si/no):" ANS
  case "$ANS" in
    si | SI | Si | sí | Sí) ;;
    *) say_no_server; exit 0 ;;
  esac
  ask "Tipo de destino (ssh = servidor por SSH/rsync, rclone = bucket/almacenamiento rclone):" TYPE
  if [ "$TYPE" = ssh ] || [ "$TYPE" = rsync ]; then
    TYPE=ssh
    ask "Servidor (host o IP):" HOST
    ask "Usuario SSH:" RUSER
    ask "Puerto SSH [22]:" PORT
    ask "Ruta de destino en el servidor (absoluta, p. ej. /srv/unc-backups):" RPATH
    ask "Ruta de la llave privada SSH (vacío = llave por defecto):" KEY
  else
    ask "Nombre del remoto rclone con ruta (p. ej. miS3:unc-backups):" RREMOTE
  fi
fi

fail() { echo "ERROR: $1. No se guardó ninguna configuración." >&2; exit 1; }

# Validación por lista blanca ANTES de ejecutar nada (los valores llegan a ssh/rclone).
NEW_REMOTE=""
case "$TYPE" in
  ssh | rsync)
    [[ "$HOST" =~ ^[A-Za-z0-9._-]+$ ]] || fail "host no válido"
    [[ "$RUSER" =~ ^[A-Za-z0-9._-]+$ ]] || fail "usuario no válido"
    [ -z "$PORT" ] || [[ "$PORT" =~ ^[0-9]{1,5}$ ]] || fail "puerto no válido"
    [[ "$RPATH" =~ ^/[A-Za-z0-9._/~+-]*$ ]] || fail "la ruta debe ser absoluta y sin caracteres especiales"
    [ -z "$KEY" ] || bk_valid_key_path "$KEY" || fail "la ruta de la llave no es válida"
    [ "$PORT" = 22 ] && PORT=""
    NEW_REMOTE="ssh://${RUSER}@${HOST}${PORT:+:$PORT}${RPATH}"
    [ "$(bk_remote_kind "$NEW_REMOTE" || true)" = ssh ] || fail "destino SSH no válido"
    ;;
  rclone)
    [ "$(bk_remote_kind "$RREMOTE" || true)" = rclone ] || fail "remoto rclone no válido (formato nombre:ruta)"
    NEW_REMOTE="$RREMOTE"; KEY=""
    ;;
  *) fail "tipo de destino desconocido (use ssh o rclone)" ;;
esac

# Prueba NO destructiva. BACKUP_SSH_BIN (opcional) permite fijar el binario ssh (pruebas / rutas no estándar). La llave y el destino completo no se imprimen.
echo "Probando la conexión..." >&2
if [ "$(bk_remote_kind "$NEW_REMOTE")" = ssh ]; then
  command -v rsync > /dev/null 2>&1 || fail "rsync no está instalado en este servidor (apt install rsync)"
  SSH_ARGS=(-o BatchMode=yes -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new)
  [ -z "$KEY" ] || SSH_ARGS+=(-i "$KEY")
  [ -z "$PORT" ] || SSH_ARGS+=(-p "$PORT")
  "${BACKUP_SSH_BIN:-ssh}" "${SSH_ARGS[@]}" "${RUSER}@${HOST}" "mkdir -p -- '${RPATH}' && test -w '${RPATH}'" > /dev/null 2>&1 \
    || fail "la prueba de conexión SSH falló (¿llave autorizada en el servidor? ¿ruta escribible?)"
else
  command -v rclone > /dev/null 2>&1 || fail "rclone no está instalado en este servidor"
  rclone lsd "${NEW_REMOTE%%:*}:" > /dev/null 2>&1 || fail "la prueba rclone lsd falló (revise el remoto con «rclone config»)"
fi

# Escritura atómica en el archivo de entorno: reemplaza solo sus claves, conserva el resto, modo 600.
set_key() { # set_key ARCHIVO CLAVE VALOR   (VALOR vacío = elimina la clave)
  local f="$1" k="$2" v="$3" tmp
  tmp="$(mktemp "${f}.XXXXXX")"
  { [ ! -f "$f" ] || grep -v "^${k}=" "$f" || true; } > "$tmp"
  [ -z "$v" ] || printf '%s=%s\n' "$k" "$v" >> "$tmp"
  chmod 600 "$tmp"
  mv -f -- "$tmp" "$f"
}
mkdir -p -- "$(dirname -- "$BACKUP_ENV_FILE")"
set_key "$BACKUP_ENV_FILE" BACKUP_REMOTE "$NEW_REMOTE"
set_key "$BACKUP_ENV_FILE" BACKUP_SSH_KEY "$KEY"
bk_status ok "asistente: prueba de conexión OK; aún no se ha enviado un respaldo"
echo "Listo: la conexión funciona y BACKUP_REMOTE quedó guardado en $BACKUP_ENV_FILE (modo 600)." >&2
echo "El próximo respaldo programado subirá los archivos cifrados. Compruebe con: configure-offsite.sh --check" >&2
