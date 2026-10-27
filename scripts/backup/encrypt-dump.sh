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

DUMP="${1:-}"
if [ -z "$DUMP" ]; then
  echo "Uso: encrypt-dump.sh --check | <archivo.dump>" >&2
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
