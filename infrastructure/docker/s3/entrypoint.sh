#!/bin/sh
# Entrypoint del almacén S3 (SeaweedFS) — S3-SEAWEEDFS-01.
# Qué hace: genera el JSON de identidades de SeaweedFS DESDE EL ENTORNO al arrancar el contenedor y delega en el
#   entrypoint de la imagen (que corrige permisos de /data y baja privilegios a `seaweed` antes de ejecutar weed).
# Por qué: el JSON de identidades lleva las claves; versionarlo repetiría la filtración de SEC-MINIO-01 (una clave
#   en git queda legible para siempre). Aquí solo viven las plantillas; las claves llegan por S3_ACCESS_KEY_ID y
#   S3_SECRET_ACCESS_KEY (archivo .env / .env.prod, fuera de git).
# Amenazas que evita: (1) arrancar con credenciales vacías o débiles (falla cerrado); (2) inyección en el JSON por
#   comillas/barras en las claves o el bucket (se rechazan antes de renderizar); (3) lectura anónima por omisión
#   (la identidad `anonymous` solo existe con S3_PUBLIC_READ=1 y se limita a Read:<bucket>: GET de objetos; el
#   listado, la escritura y el borrado anónimos quedan denegados).
# Límites: no imprime nunca las claves; el archivo generado (modo 600, solo `seaweed` lo lee) vive en /tmp del
#   contenedor y desaparece con él. Comprobar la longitud no mide la entropía: generar las claves con
#   `openssl rand -hex 16` (access) y `openssl rand -hex 32` (secret).
# Variables de prueba: S3_CONFIG_PATH (destino del JSON) y S3_IMAGE_ENTRYPOINT (entrypoint a ejecutar).
set -eu

CONFIG="${S3_CONFIG_PATH:-/tmp/s3.json}"
IMAGE_ENTRYPOINT="${S3_IMAGE_ENTRYPOINT:-/entrypoint.sh}"
BUCKET="${S3_BUCKET:-unc-media}"
ACCESS="${S3_ACCESS_KEY_ID:-}"
SECRET="${S3_SECRET_ACCESS_KEY:-}"

fail() {
  echo "s3-entrypoint: $1" >&2
  exit 1
}

# Fallo cerrado: sin claves o demasiado cortas el almacén no arranca (mensaje sin valores).
[ -n "$ACCESS" ] || fail "S3_ACCESS_KEY_ID está vacío: defínalo en el archivo de entorno (mínimo 16 caracteres)."
[ -n "$SECRET" ] || fail "S3_SECRET_ACCESS_KEY está vacío: defínalo en el archivo de entorno (mínimo 32 caracteres)."
[ "${#ACCESS}" -ge 16 ] || fail "S3_ACCESS_KEY_ID tiene menos de 16 caracteres."
[ "${#SECRET}" -ge 32 ] || fail "S3_SECRET_ACCESS_KEY tiene menos de 32 caracteres."

# Solo caracteres seguros: una comilla o una barra rompería (o inyectaría en) el JSON que se renderiza abajo.
case "$ACCESS" in *[!A-Za-z0-9+/=_.-]*) fail "S3_ACCESS_KEY_ID contiene caracteres no permitidos (use A-Z a-z 0-9 + / = _ . -)." ;; esac
case "$SECRET" in *[!A-Za-z0-9+/=_.-]*) fail "S3_SECRET_ACCESS_KEY contiene caracteres no permitidos (use A-Z a-z 0-9 + / = _ . -)." ;; esac
# Nombre de bucket S3 (minúsculas, dígitos, punto y guion; 3-63 caracteres).
case "$BUCKET" in
  *[!a-z0-9.-]*|-*|.*|*-|*.) fail "S3_BUCKET no es un nombre de bucket válido." ;;
esac
[ "${#BUCKET}" -ge 3 ] && [ "${#BUCKET}" -le 63 ] || fail "S3_BUCKET debe tener entre 3 y 63 caracteres."

# Identidad anónima: SOLO con S3_PUBLIC_READ=1 (opt-in explícito) y solo lectura de objetos del bucket.
ANON=""
if [ "${S3_PUBLIC_READ:-0}" = "1" ]; then
  ANON=',{"name":"anonymous","actions":["Read:'"$BUCKET"'"]}'
fi

# Archivo legible solo por su dueño; se crea vacío con umask 077 antes de escribir las claves.
umask 077
{
  printf '{"identities":[{"name":"cms","credentials":[{"accessKey":"%s","secretKey":"%s"}],' "$ACCESS" "$SECRET"
  printf '"actions":["Admin","Read","Write","List","Tagging"]}%s]}\n' "$ANON"
} > "$CONFIG"

# Como root (contenedor real) el archivo debe pertenecer a `seaweed`, el usuario al que baja la imagen.
if [ "$(id -u)" = "0" ] && id seaweed >/dev/null 2>&1; then
  chown seaweed:seaweed "$CONFIG"
fi

# Mismos flags que superaron el spike: S3 en 8333, volumen sin tope de cantidad y volúmenes de 1 GiB.
exec "$IMAGE_ENTRYPOINT" server -s3 -dir=/data -ip.bind=0.0.0.0 -s3.config="$CONFIG" \
  -volume.max=0 -master.volumeSizeLimitMB=1024
