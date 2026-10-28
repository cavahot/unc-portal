#!/usr/bin/env bash
# BACKUP-MEDIA-01 — Funciones comunes de los scripts de respaldo (se cargan con `source`, no se ejecutan).
#
# Qué hace: carga la configuración permitida desde el archivo de entorno del respaldo, resuelve el directorio
# local, escribe el estado de la copia externa (`.offsite-status`) y valida el destino BACKUP_REMOTE.
# Por qué: backup-media.sh, backup-prod.sh, offsite-push.sh y configure-offsite.sh necesitan lo mismo; duplicarlo
# haría que una corrección de seguridad llegue a unos y a otros no.
# Límites: no abre `source` sobre el archivo de entorno (se leen solo claves de una lista cerrada, así un archivo
# editado con `$(...)` no ejecuta código); no imprime NUNCA frase de paso, llave ni el valor completo de BACKUP_REMOTE.
# Spec: docs/specs/backup/BACKUP-MEDIA-01.md

# Archivo de entorno del respaldo (lo escribe el asistente configure-offsite.sh). Modo 600, fuera de git.
BACKUP_ENV_FILE="${BACKUP_ENV_FILE:-/opt/unc-portal/.env.backup}"

# Lee la clave $1 del archivo $2 (última aparición), sin `source`: quita CR y comillas simples/dobles externas.
bk_read_key() {
  local key="$1" file="$2" line
  [ -r "$file" ] || return 0
  line="$({ grep -E "^${key}=" "$file" || true; } | tail -n1)"
  line="${line#*=}"
  line="${line%$'\r'}"
  case "$line" in
    \"*\") line="${line#\"}"; line="${line%\"}" ;;
    \'*\') line="${line#\'}"; line="${line%\'}" ;;
  esac
  printf '%s' "$line"
}

# Carga solo las claves de la lista cerrada y SOLO si no vienen ya en el entorno (el entorno manda sobre el archivo).
bk_load_env() {
  local key val
  for key in BACKUP_ENCRYPTION_PASSPHRASE BACKUP_REMOTE BACKUP_SSH_KEY BACKUP_LOCAL_DIR BACKUP_RETENTION_DAYS CMS_CONTAINER; do
    if [ -z "${!key+x}" ]; then
      val="$(bk_read_key "$key" "$BACKUP_ENV_FILE")"
      if [ -n "$val" ]; then export "$key=$val"; fi
    fi
  done
  # Credenciales de la BD: del archivo de entorno de producción (el mismo que usa el deploy).
  local prod="${PROD_ENV_FILE:-/opt/unc-portal/infrastructure/docker/.env.prod}"
  for key in POSTGRES_DB POSTGRES_USER; do
    if [ -z "${!key+x}" ]; then
      val="$(bk_read_key "$key" "$prod")"
      if [ -n "$val" ]; then export "$key=$val"; fi
    fi
  done
}

# Directorio local de respaldos: 700 (contiene PII aunque esté cifrado). Puede apuntar a otro montaje.
bk_local_dir() {
  local d="${BACKUP_LOCAL_DIR:-/opt/unc-portal/backups}"
  mkdir -p -- "$d"
  chmod 700 -- "$d" 2> /dev/null || true
  printf '%s' "$d"
}

# Escribe `.offsite-status` (state=ok|failed|not_configured, timestamp UTC, detail sin secretos) de forma atómica.
# Por qué: un monitor (o `configure-offsite.sh --check`) debe poder saber si la copia externa funciona sin leer logs.
bk_status() {
  local state="$1" detail="${2:-}" d
  d="$(bk_local_dir)"
  { printf 'state=%s\n' "$state"
    printf 'timestamp=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    printf 'detail=%s\n' "$detail"; } > "$d/.offsite-status.tmp"
  chmod 600 "$d/.offsite-status.tmp" 2> /dev/null || true
  mv -f -- "$d/.offsite-status.tmp" "$d/.offsite-status"
}

# Aviso prominente cuando no hay copia externa: el disco del VPS comparte destino con los datos.
bk_notice_not_configured() {
  echo "============================================================" >&2
  echo "COPIA EXTERNA NO CONFIGURADA: los respaldos solo existen en este servidor. Ejecute scripts/backup/configure-offsite.sh" >&2
  echo "============================================================" >&2
}

# Clasifica y valida un destino: imprime ssh|rclone y devuelve 0, o devuelve 1 si es inválido o tiene
# metacaracteres. Formas: ssh://user@host[:puerto]/ruta | user@host:/ruta | remoto-rclone:ruta.
# Amenaza: un valor con `;`, `$()`, espacios o comillas llegaría a un comando; la lista blanca lo impide.
bk_remote_kind() {
  local r="$1"
  local ssh_url='^ssh://[A-Za-z0-9._-]+@[A-Za-z0-9._-]+(:[0-9]{1,5})?/[A-Za-z0-9._/~+-]*$'
  local scp_form='^[A-Za-z0-9._-]+@[A-Za-z0-9._-]+:[A-Za-z0-9._/~+-]*$'
  local rclone_form='^[A-Za-z0-9_.-]+:[A-Za-z0-9._/+-]*$'
  if [[ "$r" =~ $ssh_url ]]; then echo ssh; return 0; fi
  if [[ "$r" =~ $scp_form ]]; then echo ssh; return 0; fi
  if [[ "$r" != *@* && "$r" =~ $rclone_form ]]; then echo rclone; return 0; fi
  return 1
}

# Llave SSH: ruta absoluta con caracteres seguros (no se imprime nunca).
bk_valid_key_path() { [[ "$1" =~ ^/[A-Za-z0-9._/@+-]+$ ]]; }
