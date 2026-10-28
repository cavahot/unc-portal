#!/usr/bin/env bash
# BACKUP-MEDIA-01 (A) — Respaldo CIFRADO del volumen de media del CMS (unc_cms_media_prod) en este mismo VPS.
#
# Uso: BACKUP_ENCRYPTION_PASSPHRASE=... backup-media.sh
# Variables: BACKUP_LOCAL_DIR (def. /opt/unc-portal/backups), BACKUP_RETENTION_DAYS (def. 14), CMS_CONTAINER
#   (def. unc-cms-prod), BACKUP_ENV_FILE (def. /opt/unc-portal/.env.backup; solo claves permitidas).
# Salida: imprime `MEDIA_BACKUP=<ruta>`. Códigos: 0 ok | 1 fallo | 3 sin contenedor ni volumen (nada que respaldar).
# Modos: exec (CMS en marcha) o volume (CMS caído: contenedor desechable con el volumen `:ro`); ver paso 2.
#
# Qué hace: `docker exec <cms> tar -czf - -C /app/media .` y lo CANALIZA directo a gpg simétrico (AES256) en
# `media-<UTC>.tar.gz.gpg`: ningún .tar/.tar.gz en claro toca el disco del host. Verifica (descifra y lista el
# tar, no vacío), escribe sha256 (600), aplica retención por antigüedad solo sobre su propio patrón y falla
# cerrado si falta la frase de paso (se valida ANTES de llamar a docker).
# Por qué: la BD guarda solo las filas `media`; restaurar solo Postgres deja imágenes sin archivo. Cifrar evita que
# una copia legible de las imágenes/PII quede en el disco del servidor o viaje en claro a un destino externo.
# Límites: copia EN CALIENTE (un archivo escrito durante el tar puede quedar a medias); el respaldo comparte disco
# con el servidor hasta configurar BACKUP_REMOTE (ver offsite-push.sh); sin la frase de paso la copia es ilegible.
# Seguridad de la frase: solo por entorno/archivo 600 y por fd 3 (encrypt-dump.sh); jamás en argv ni en la salida.
set -euo pipefail
umask 077
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=backup-lib.sh
. "$HERE/backup-lib.sh"
bk_load_env

CMS="${CMS_CONTAINER:-unc-cms-prod}"
DAYS="${BACKUP_RETENTION_DAYS:-14}"
case "$DAYS" in '' | *[!0-9]*) echo "ERROR: BACKUP_RETENTION_DAYS debe ser un entero." >&2; exit 1 ;; esac

# 1) Falla cerrado ANTES de tocar docker: frase presente, >= 20 caracteres y gpg disponible.
"$HERE/encrypt-dump.sh" --check > /dev/null || { echo "ERROR: backup de media abortado (cifrado no disponible)." >&2; exit 1; }

# 2) Modo de lectura (BACKUP_MEDIA_MODE=exec|volume fuerza uno; por defecto auto):
#    - exec: el CMS corre -> `docker exec <cms> tar` (como siempre).
#    - volume: el CMS está caído/ausente pero el volumen existe -> contenedor DESECHABLE con el volumen en SOLO
#      LECTURA (`:ro`, no puede alterarlo). Por qué: el deploy que arregla un CMS caído no debe quedar bloqueado
#      por no poder respaldar, y tampoco debe saltarse el respaldo.
#    - sin contenedor y sin volumen = primer despliegue: código 3 (nada que respaldar), el llamador decide.
VOLUME="${MEDIA_VOLUME:-unc_cms_media_prod}"
MODE="${BACKUP_MEDIA_MODE:-auto}"
case "$MODE" in auto | exec | volume) ;; *) echo "ERROR: BACKUP_MEDIA_MODE debe ser auto, exec o volume." >&2; exit 1 ;; esac
if [ "$MODE" = auto ]; then
  if [ "$(docker inspect -f '{{.State.Running}}' "$CMS" 2> /dev/null || true)" = "true" ]; then
    MODE=exec
  elif docker volume inspect "$VOLUME" > /dev/null 2>&1; then
    MODE=volume
  else
    echo "AVISO: no existe el contenedor $CMS ni el volumen $VOLUME: no hay media que respaldar." >&2
    exit 3
  fi
fi

# Imagen para el modo volumen: NUNCA se descarga nada a mitad de un deploy; solo se usa lo ya presente en el host.
# Orden: (1) BACKUP_MEDIA_IMAGE si se fija; (2) la imagen del contenedor del CMS (aunque esté detenido);
# (3) ghcr.io/cavahot/unc-portal-cms:$IMAGE_TAG (la que el deploy acaba de bajar); (4) cualquier imagen local con
# `tar` de esta lista: postgres:16-alpine, nginx:1.27-alpine, alpine, busybox. Si no hay ninguna: falla cerrado.
pick_image() {
  local cand img
  cand=()
  [ -z "${BACKUP_MEDIA_IMAGE:-}" ] || cand+=("$BACKUP_MEDIA_IMAGE")
  img="$(docker inspect -f '{{.Config.Image}}' "$CMS" 2> /dev/null || true)"
  [ -z "$img" ] || cand+=("$img")
  [ -z "${IMAGE_TAG:-}" ] || cand+=("ghcr.io/cavahot/unc-portal-cms:${IMAGE_TAG}")
  cand+=("postgres:16-alpine" "nginx:1.27-alpine" "alpine" "busybox")
  for img in "${cand[@]}"; do
    if docker image inspect "$img" > /dev/null 2>&1; then printf '%s' "$img"; return 0; fi
  done
  return 1
}
if [ "$MODE" = volume ]; then
  MEDIA_IMAGE="$(pick_image)" || {
    echo "ERROR: el CMS no corre y no hay ninguna imagen local con tar para leer el volumen (no se descarga nada durante un deploy). Inicie $CMS o cargue una imagen (docker pull alpine) y reintente." >&2
    exit 1
  }
fi

DIR="$(bk_local_dir)"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$DIR/media-$STAMP.tar.gz.gpg"
STATUS=1
# Pase lo que pase, un cifrado a medias (o su suma) no se queda: solo se conserva la copia verificada.
cleanup() { if [ "$STATUS" -ne 0 ]; then rm -f -- "$OUT" "$OUT.sha256"; fi; }
trap cleanup EXIT

# 3) tar desde dentro del contenedor -> gpg, sin archivo intermedio. pipefail detecta un tar que falla a medias.
if [ "$MODE" = volume ]; then
  # Contenedor desechable: volumen `:ro`, sin red, entrypoint forzado a tar (no arranca la app de la imagen).
  docker run --rm --network none -v "$VOLUME:/app/media:ro" --entrypoint tar "$MEDIA_IMAGE" -czf - -C /app/media . \
    | "$HERE/encrypt-dump.sh" --encrypt-stream "$OUT" > /dev/null
else
  docker exec "$CMS" tar -czf - -C /app/media . | "$HERE/encrypt-dump.sh" --encrypt-stream "$OUT" > /dev/null
fi

# 4) Verificación: descifra a tubería y lista el tar (no vacío). Un .gpg que no lista contenido no es una copia.
"$HERE/encrypt-dump.sh" --verify-archive "$OUT" tar > /dev/null

# Formato `sha256sum -c`: «hash  nombre» (sin ruta).
(cd "$DIR" && sha256sum --text -- "$(basename -- "$OUT")") > "$OUT.sha256"
chmod 600 "$OUT" "$OUT.sha256"
STATUS=0

# 5) Retención: solo archivos con SU patrón (media-*.tar.gz.gpg y su .sha256) y más viejos que DAYS días. No toca
# nada más del directorio (BD, notas, otros montajes). Se ejecuta tras crear el nuevo, así nunca queda sin copia.
find "$DIR" -maxdepth 1 -type f \( -name 'media-*.tar.gz.gpg' -o -name 'media-*.tar.gz.gpg.sha256' \) -mtime "+$DAYS" -delete

echo "MEDIA_BACKUP=$OUT"
echo "Respaldo de media cifrado y verificado ($(wc -c < "$OUT" | tr -d ' ') bytes); sin texto plano en disco."
