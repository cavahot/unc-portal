#!/usr/bin/env bash
# BKP-01 — Cifra un volcado de PostgreSQL ANTES de que salga del runner de GitHub Actions.
#
# Uso:
#   BACKUP_ENCRYPTION_PASSPHRASE=... encrypt-dump.sh --check          # solo valida (falla cerrado)
#   BACKUP_ENCRYPTION_PASSPHRASE=... encrypt-dump.sh <archivo.dump>   # cifra, verifica y borra el original
#
# Qué hace: valida la frase de paso (>= 20 caracteres), cifra con gpg simétrico AES256 a
# `<archivo>.gpg`, comprueba que el .gpg descifra byte a byte al original, escribe
# `<archivo>.gpg.sha256` y BORRA el volcado en claro (también ante cualquier fallo, vía trap).
# Por qué: el repositorio es público; un artefacto de Actions con el .dump en claro (usuarios, hashes,
# datos personales) podría ser descargado por terceros. Amenaza que evita: exposición del volcado.
# Límites: la protección es la de la frase de paso (su custodia es humana); el secreto vive en GitHub;
# no valida que el volcado sea restaurable (eso lo hace `pg_restore --list` en el workflow).
# Seguridad de la frase: solo entra por entorno y se entrega a gpg por stdin (--passphrase-fd 0);
# nunca va en argv, no se imprime y este script no activa `set -x`.
set -euo pipefail
umask 077

MIN_LEN=20
VAR=BACKUP_ENCRYPTION_PASSPHRASE
PASS="${BACKUP_ENCRYPTION_PASSPHRASE:-}"

# Falla cerrado: nombra la variable y la longitud mínima, jamás el valor.
check_secret() {
  if [ -z "$PASS" ]; then
    echo "::error::Falta el secreto $VAR en GitHub (Settings > Secrets and variables > Actions). Backup abortado." >&2
    return 1
  fi
  if [ "${#PASS}" -lt "$MIN_LEN" ]; then
    echo "::error::El secreto $VAR es demasiado corto (mínimo $MIN_LEN caracteres). Backup abortado." >&2
    return 1
  fi
  if ! command -v gpg > /dev/null 2>&1; then
    echo "::error::gpg no está disponible en el runner. Backup abortado." >&2
    return 1
  fi
}

# gpg con la frase por stdin. printf es builtin: la frase no aparece en la lista de procesos.
gpg_pass() { printf '%s' "$PASS" | gpg --batch --yes --no-tty --pinentry-mode loopback --passphrase-fd 0 "$@"; }

if [ "${1:-}" = "--check" ]; then
  check_secret
  echo "Secreto de cifrado válido (longitud >= $MIN_LEN)."
  exit 0
fi

# BACKUP-MEDIA-01: gpg con la frase por el descriptor 3, dejando stdin libre para los DATOS (modo flujo).
# Por qué: en el modo archivo stdin lleva la frase; aquí stdin lleva el tar/pg_dump que se cifra al vuelo, de
# modo que NINGÚN texto plano toca el disco. Límite: igual que arriba, la frase solo vive en entorno y fd.
gpg_fd3() { gpg --batch --yes --no-tty --pinentry-mode loopback --passphrase-fd 3 "$@" 3< <(printf '%s' "$PASS"); }

# --encrypt-stream <salida.gpg>: cifra lo que llegue por stdin (AES256 simétrico, sin recomprimir porque el
# flujo ya viene en .gz o en formato custom de pg_dump). Deja la salida en modo 600 y su sha256. Si gpg falla
# borra la salida parcial. Quien lo invoca debe usar `set -o pipefail` para detectar que falló el productor.
if [ "${1:-}" = "--encrypt-stream" ]; then
  STREAM_OUT="${2:-}"
  if [ -z "$STREAM_OUT" ]; then echo "Uso: encrypt-dump.sh --encrypt-stream <salida.gpg>" >&2; exit 2; fi
  check_secret
  if ! gpg_fd3 --symmetric --cipher-algo AES256 --compress-algo none -o "$STREAM_OUT"; then
    rm -f -- "$STREAM_OUT"
    echo "::error::gpg falló al cifrar el flujo. Backup abortado." >&2
    exit 1
  fi
  chmod 600 "$STREAM_OUT"
  if [ ! -s "$STREAM_OUT" ]; then rm -f -- "$STREAM_OUT"; echo "::error::El cifrado produjo un archivo vacío. Backup abortado." >&2; exit 1; fi
  echo "ENCRYPTED_FILE=$(basename -- "$STREAM_OUT")"
  exit 0
fi

# --decrypt-stream <archivo.gpg>: descifra a STDOUT (para tuberías de restauración, p. ej. hacia `docker exec tar -x`).
# Por qué: restaurar sin escribir el texto plano en el host. Frase equivocada o archivo dañado = salida != 0.
if [ "${1:-}" = "--decrypt-stream" ]; then
  D_FILE="${2:-}"
  if [ -z "$D_FILE" ] || [ ! -s "$D_FILE" ]; then echo "::error::Archivo a descifrar inexistente o vacío." >&2; exit 1; fi
  check_secret
  gpg_fd3 --decrypt "$D_FILE" 2> /dev/null
  exit $?
fi

# --verify-archive <archivo.gpg> <tar|pgdump>: descifra a una tubería (nunca a disco) y comprueba que el
# contenido es legible y no está vacío: `tar` = lista al menos una entrada; `pgdump` = firma PGDMP. Un .gpg que
# no pasa esto no es una copia. Límite: no restaura la BD ni compara byte a byte con el original (no existe
# original en claro por diseño); pg_restore --list completo queda para una restauración de prueba en staging.
if [ "${1:-}" = "--verify-archive" ]; then
  V_FILE="${2:-}"; V_KIND="${3:-}"
  if [ -z "$V_FILE" ] || [ ! -s "$V_FILE" ]; then echo "::error::Archivo a verificar inexistente o vacío." >&2; exit 1; fi
  check_secret
  case "$V_KIND" in
    tar)
      n="$(gpg_fd3 --decrypt "$V_FILE" 2> /dev/null | tar -tzf - 2> /dev/null | wc -l | tr -d ' ')" || n=0
      if [ "${n:-0}" -lt 1 ]; then echo "::error::La verificación falló: el .gpg no descifra a un tar.gz con contenido." >&2; exit 1; fi
      echo "Verificado: $n entradas en el archivo." ;;
    pgdump)
      magic="$(gpg_fd3 --decrypt "$V_FILE" 2> /dev/null | head -c 5 || true)"
      if [ "$magic" != "PGDMP" ]; then echo "::error::La verificación falló: el .gpg no descifra a un volcado PGDMP." >&2; exit 1; fi
      echo "Verificado: volcado PGDMP legible." ;;
    *) echo "Uso: encrypt-dump.sh --verify-archive <archivo.gpg> <tar|pgdump>" >&2; exit 2 ;;
  esac
  exit 0
fi

DUMP="${1:-}"
if [ -z "$DUMP" ]; then
  echo "Uso: encrypt-dump.sh --check | --encrypt-stream <salida.gpg> | --verify-archive <f.gpg> <tar|pgdump> | <archivo.dump>" >&2
  exit 2
fi

OUT="${DUMP}.gpg"
SUM="${OUT}.sha256"
# Pase lo que pase (éxito, error, señal) el texto plano no se queda en disco; ante fallo se
# retiran también los restos del cifrado para que el workflow no suba un artefacto a medias.
STATUS=1
cleanup() {
  rm -f -- "$DUMP"
  if [ "$STATUS" -ne 0 ]; then rm -f -- "$OUT" "$SUM"; fi
}
trap cleanup EXIT

check_secret
if [ ! -s "$DUMP" ]; then
  echo "::error::El volcado '$DUMP' no existe o está vacío. Backup abortado." >&2
  exit 1
fi

gpg_pass --symmetric --cipher-algo AES256 --compress-algo none -o "$OUT" "$DUMP"
# Verificación ida y vuelta: un .gpg que no descifra al original no es una copia.
if ! gpg_pass --decrypt "$OUT" 2> /dev/null | cmp -s - "$DUMP"; then
  echo "::error::La verificación de descifrado falló: el cifrado no reproduce el volcado. Backup abortado." >&2
  exit 1
fi

# Formato `sha256sum -c`: «hash  nombre» (--text fuerza dos espacios también en Git Bash; nombre sin ruta).
(cd "$(dirname -- "$OUT")" && sha256sum --text -- "$(basename -- "$OUT")") > "$SUM"

STATUS=0
echo "ENCRYPTED_FILE=$(basename -- "$OUT")"
echo "Volcado cifrado y verificado ($(wc -c < "$OUT" | tr -d ' ') bytes); texto plano eliminado."
