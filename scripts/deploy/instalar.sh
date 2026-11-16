#!/usr/bin/env bash
# =============================================================================
# instalar.sh — Instalador guiado del Portal Institucional UNC (staging o producción)
# =============================================================================
# Qué hace: lleva a quien instala por nueve pasos numerados (requisitos, archivos, entorno, certificados, imágenes,
#   base de datos y migraciones, servicios, prueba de humo y siguientes pasos). En cada paso dice qué comprueba y qué logró.
#   Si algo falla lo CAPTURA y lo explica como una guía: «Qué pasó» (el significado del error, nunca solo un número de
#   salida) y «Qué hacer» (pasos numerados con los comandos), y dice cómo reanudar.
# Por qué existe: el propietario va a configurar el servidor solo; un error críptico de Docker no debe detener la instalación.
# Amenazas que evita: (1) un secreto en pantalla o en el registro (los valores se enmascaran y nunca se imprimen);
#   (2) un comando destructivo (no existe `down -v`, `prune`, ni borrado de volúmenes; solo se SUGIEREN limpiezas, las hace la
#   persona); (3) instalar producción por error (pide escribir PRODUCCION); (4) avanzar con un entorno incompleto o con
#   valores de ejemplo; (5) repetir pasos costosos al reanudar.
# Límite: no instala Docker ni abre puertos del firewall; no siembra el CMS (necesita credenciales de una persona: muestra los
#   comandos); la prueba de humo comprueba salud, no el contenido. Los errores que no reconoce se muestran con su último texto
#   (enmascarado) y la ruta del registro.
# Códigos de salida del instalador: 0 terminó bien · 1 falló un paso (ver «Qué hacer») · 2 uso incorrecto ·
#   3 falta completar el archivo de entorno · 4 cancelado por la persona.
# Tarea: paquete de despliegue | Spec: odd/tasks/paquete-despliegue.md
# =============================================================================
set -u
set -o pipefail

TOTAL=9
RAIZ="${INSTALAR_RAIZ:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
DOCKER="${DOCKER_BIN:-docker}"

ENTORNO="staging"
SOLO_VERIFICAR=0
GENERAR_SECRETOS=0
CONSTRUIR=0
REHACER=0
SIN_CONFIRMAR=0
TAG=""
ARGS_ORIGINALES=("$@")

# ---------- presentación -----------------------------------------------------
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  C_B=$'\033[1m'; C_OK=$'\033[32m'; C_AV=$'\033[33m'; C_ERR=$'\033[31m'; C_0=$'\033[0m'
else
  C_B=""; C_OK=""; C_AV=""; C_ERR=""; C_0=""
fi
PASO_ACTUAL=0
LAST_OUT=""
LAST_CODE=0

dice()  { printf '  %s\n' "$*"; }
ok()    { printf '  %s[ OK ]%s %s\n' "$C_OK" "$C_0" "$*"; }
aviso() { printf '  %s[AVISO]%s %s\n' "$C_AV" "$C_0" "$*"; }
paso_titulo() { PASO_ACTUAL=$1; printf '\n%s[%s/%s] %s%s\n' "$C_B" "$1" "$TOTAL" "$2" "$C_0"; }
envolver() { fold -s -w 72 | sed 's/^/    /'; }

# ---------- argumentos -------------------------------------------------------
uso() {
  cat <<'AYUDA'
Instalador guiado del Portal UNC.

Uso:
  bash scripts/deploy/instalar.sh [opciones]

Opciones:
  --entorno staging|produccion   Dónde instalar (por defecto: staging, el más seguro).
  --solo-verificar               Revisa requisitos, archivos y entorno (pasos 1 a 4) sin cambiar nada.
  --generar-secretos             Rellena con valores aleatorios los secretos que sigan con el valor de ejemplo
                                 (no los muestra; deja una copia del archivo anterior).
  --construir                    Construye las imágenes en este servidor (obligatorio en staging; en producción
                                 úselo si todavía no hay imágenes publicadas por el CI).
  --tag SHA                      Versión de las imágenes a descargar en producción (por ejemplo sha-1a2b3c4).
  --rehacer                      Repite también los pasos costosos que ya se hicieron (imágenes, migraciones, servicios).
  --sin-confirmar                No pide la confirmación escrita de producción (para uso automatizado).
  --ayuda                        Muestra esta ayuda.

Códigos de salida: 0 terminó · 1 falló un paso · 2 uso incorrecto · 3 falta completar el entorno · 4 cancelado.
Guía completa: docs/deploy/INSTALACION.md
AYUDA
}

while [ $# -gt 0 ]; do
  case "$1" in
    --entorno) shift; ENTORNO="${1:-}";;
    --solo-verificar) SOLO_VERIFICAR=1;;
    --generar-secretos) GENERAR_SECRETOS=1;;
    --construir) CONSTRUIR=1;;
    --rehacer) REHACER=1;;
    --sin-confirmar) SIN_CONFIRMAR=1;;
    --tag) shift; TAG="${1:-}";;
    --ayuda|-h|--help) uso; exit 0;;
    *) printf 'Opción desconocida: %s\n\n' "$1"; uso; exit 2;;
  esac
  shift
done

case "$ENTORNO" in
  staging|produccion) ;;
  *) printf 'El entorno debe ser «staging» o «produccion» (recibió «%s»).\n\n' "$ENTORNO"; uso; exit 2;;
esac

# ---------- rutas y nombres según el entorno ---------------------------------
DOCK="$RAIZ/infrastructure/docker"
if [ "$ENTORNO" = "produccion" ]; then
  COMPOSE_FILE="$DOCK/compose.prod.yaml"; ENV_FILE="$DOCK/.env.prod"; ENV_EJEMPLO="$DOCK/.env.prod.example"; SUF="prod"
else
  COMPOSE_FILE="$DOCK/compose.staging.yaml"; ENV_FILE="$DOCK/.env.staging"; ENV_EJEMPLO="$DOCK/.env.staging.example"; SUF="staging"
fi
C_PG="unc-postgres-$SUF"; C_CMS="unc-cms-$SUF"; C_PORTAL="unc-portal-$SUF"; C_NGINX="unc-nginx-$SUF"
ESTADO="$RAIZ/.instalacion-$ENTORNO.estado"
LOG="$RAIZ/instalacion-$ENTORNO-$(date +%Y%m%d-%H%M%S).log"
: > "$LOG" 2>/dev/null || LOG="/tmp/instalacion-$ENTORNO-$$.log"
TMP_OUT="$(mktemp 2>/dev/null || echo "/tmp/instalar-$$.out")"
trap 'rm -f "$TMP_OUT"' EXIT

REPETIR="bash scripts/deploy/instalar.sh"
[ ${#ARGS_ORIGINALES[@]} -gt 0 ] && REPETIR="$REPETIR ${ARGS_ORIGINALES[*]}"

# ---------- registro con enmascarado de secretos -----------------------------
enmascarar() {
  sed -E \
    -e 's/((PASSWORD|SECRET|TOKEN|DSN|ACCESS_KEY|SECRET_KEY)[A-Z_]*=)[^[:space:]]+/\1***/g' \
    -e 's#(postgres(ql)?://[^:/@ ]+:)[^@ ]+@#\1***@#g' \
    -e 's/(password|contraseña)[ =:]+[^ ]+/\1 ***/Ig'
}
log() { printf '%s %s\n' "$(date '+%F %T')" "$*" | enmascarar >> "$LOG"; }

# Ejecuta un comando capturando su salida (para poder explicar el error) y la deja enmascarada en el registro.
corre() {
  local desc="$1"; shift
  log "EJECUTA: $desc :: $*"
  "$@" > "$TMP_OUT" 2>&1
  LAST_CODE=$?
  LAST_OUT="$TMP_OUT"
  enmascarar < "$TMP_OUT" >> "$LOG"
  log "CODIGO DE SALIDA: $LAST_CODE"
  return $LAST_CODE
}

dc() { "$DOCKER" compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"; }

# ---------- explicación de errores -------------------------------------------
# problema "título" "qué pasó" "paso 1" "paso 2" ...
problema() {
  local titulo="$1" que="$2"; shift 2
  printf '\n%s[ERROR] %s%s\n' "$C_ERR" "$titulo" "$C_0"
  printf '\n  Qué pasó:\n'
  printf '%s\n' "$que" | envolver
  printf '\n  Qué hacer:\n'
  local i=1 s
  for s in "$@"; do
    printf '%s\n' "$s" | fold -s -w 68 | sed "1s/^/    $i. /; 2,\$s/^/       /"
    i=$((i + 1))
  done
  printf '\n  Cuando lo haya corregido, vuelva a ejecutar el mismo comando:\n    %s\n' "$REPETIR"
  printf '  El instalador conserva lo que ya hizo y continúa desde el paso %s.\n' "$PASO_ACTUAL"
  printf '  Registro detallado (con los secretos ocultos): %s\n\n' "$LOG"
  log "ERROR EXPLICADO: $titulo"
}

# Significado de un código de salida (el número solo va al registro, nunca a la pantalla).
significado_codigo() {
  case "$1" in
    125) echo "Docker no pudo iniciar el comando o el contenedor.";;
    126) echo "El comando existe pero no se puede ejecutar (falta de permisos).";;
    127) echo "El comando no existe en este equipo.";;
    130) echo "La instalación se interrumpió con Ctrl+C.";;
    137) echo "El proceso se quedó sin memoria o el sistema lo detuvo.";;
    139) echo "El programa falló por un error interno.";;
    143) echo "El sistema terminó el proceso.";;
    *)   echo "El programa terminó con un error que el instalador no reconoce.";;
  esac
}

coincide() { [ -n "$LAST_OUT" ] && grep -qiE "$1" "$LAST_OUT" 2>/dev/null; }

ultimas_lineas() { [ -n "$LAST_OUT" ] && tail -n "${1:-8}" "$LAST_OUT" 2>/dev/null | enmascarar | sed 's/^/      | /'; }

# Convierte lo que salió mal en una guía. $1 = contexto (docker, compose, config, build, pull, migrar, up, salud).
diagnosticar() {
  local ctx="$1" nombre
  if coincide 'permission denied.*docker|got permission denied|access is denied.*docker'; then
    problema "El usuario no tiene permiso para usar Docker" \
      "Docker está instalado y encendido, pero el usuario con el que ejecuta el instalador no tiene permiso para hablar con él." \
      "Agregue su usuario al grupo de Docker: sudo usermod -aG docker \$USER" \
      "Cierre la sesión y vuelva a entrar (o ejecute: newgrp docker) para que el cambio tenga efecto." \
      "Compruebe con: docker info (no debe pedir sudo)."
  elif coincide 'cannot connect to the docker daemon|is the docker daemon running|error during connect|docker daemon is not running|pipe/docker_engine|docker_engine.*(cannot|no se puede)'; then
    problema "Docker está instalado pero no está encendido" \
      "El programa de Docker existe, pero su servicio no responde. Sin ese servicio no se pueden crear los contenedores." \
      "En Linux, encienda el servicio: sudo systemctl start docker (y para que arranque siempre: sudo systemctl enable docker)." \
      "En Windows o Mac, abra Docker Desktop y espere a que diga «Engine running»." \
      "Compruebe con: docker info"
  elif coincide "'compose' is not a docker command|unknown shorthand flag|docker: unknown command: docker compose"; then
    problema "Falta Docker Compose v2" \
      "Docker no tiene el complemento «compose» (versión 2), que este instalador usa para levantar todos los servicios juntos." \
      "En Linux (Debian/Ubuntu): sudo apt-get install docker-compose-plugin" \
      "En Windows o Mac, Docker Desktop ya lo incluye: actualícelo a la última versión." \
      "Compruebe con: docker compose version"
  elif coincide 'no space left on device|disk quota exceeded|not enough space'; then
    problema "No hay espacio en el disco" \
      "El disco se llenó mientras Docker descargaba o construía las imágenes." \
      "Vea cuánto ocupa Docker: docker system df" \
      "Libere espacio (esto borra imágenes sin uso; revise antes lo que ofrece): docker image prune" \
      "Si el disco es chico, amplíelo: la construcción necesita al menos 10 GB libres."
  elif [ "$LAST_CODE" = "137" ] || coincide 'out of memory|oomkilled|^killed$|cannot allocate memory'; then
    problema "El proceso se quedó sin memoria" \
      "El servidor no tiene memoria suficiente para esta operación y el sistema detuvo el proceso (típico al construir las imágenes en un servidor chico)." \
      "Compruebe la memoria libre: free -h (se recomiendan al menos 2 GB libres para construir)." \
      "Agregue espacio de intercambio (swap) de 2 GB: sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile" \
      "Construya de a una imagen: COMPOSE_PARALLEL_LIMIT=1 $REPETIR"
  elif coincide 'port is already allocated|address already in use|only one usage of each socket|ports are not available|bind for .* failed'; then
    problema "Un puerto necesario ya está ocupado" \
      "Otro programa (o un contenedor anterior) ya está usando un puerto que este sistema necesita." \
      "Vea quién lo usa: sudo ss -ltnp | grep -E ':(80|443|3100|3102)\\b'" \
      "Si es otro servidor web del equipo (apache, nginx), deténgalo: sudo systemctl stop apache2 nginx" \
      "Si es un contenedor de una prueba anterior, véalo con: docker ps y deténgalo con: docker stop NOMBRE"
  elif coincide 'cannot load certificate|bio_new_file|certs/.*no such file|ssl_certificate'; then
    problema "Nginx no encuentra los certificados" \
      "Nginx necesita los archivos del certificado HTTPS y no los pudo leer." \
      "Copie los certificados a infrastructure/nginx/certs/ con los nombres que pide nginx.conf (www_fullchain.pem, www_privkey.pem, cms_fullchain.pem, cms_privkey.pem)." \
      "Revise que los archivos tengan permiso de lectura: ls -l infrastructure/nginx/certs/" \
      "Si solo quiere probar sin HTTPS, use --entorno staging."
  elif coincide 'password authentication failed|fatal:.*password'; then
    problema "La contraseña de la base de datos no coincide" \
      "El servicio intentó entrar a la base de datos con una contraseña distinta de la que la base tiene guardada. Pasa cuando se cambió POSTGRES_PASSWORD después de crear la base: el volumen conserva la contraseña vieja." \
      "Si es una instalación nueva y no hay datos que conservar, borre SOLO el volumen de esta base (no lo hace el instalador): docker volume ls y luego docker volume rm NOMBRE_DEL_VOLUMEN_DE_POSTGRES." \
      "Si ya hay datos, vuelva a poner en el archivo de entorno la contraseña original, o cámbiela dentro de la base con ALTER USER." \
      "Revise que DATABASE_URI use el mismo usuario, contraseña y base que POSTGRES_USER, POSTGRES_PASSWORD y POSTGRES_DB."
  elif coincide 'pull access denied|unauthorized|authentication required|denied: requested access|denied: denied|denied:'; then
    problema "El servidor no tiene permiso para descargar las imágenes" \
      "El registro de imágenes (ghcr.io) rechazó la descarga: las imágenes son privadas o todavía no existen." \
      "Inicie sesión con un token de GitHub con permiso «read:packages»: docker login ghcr.io -u SU_USUARIO_DE_GITHUB" \
      "O construya las imágenes en este mismo servidor, sin descargar nada: agregue --construir al comando." \
      "Confirme que el repositorio cavahot/unc-portal ya publicó imágenes (solo lo hace el CI al fusionar a main)."
  elif coincide 'manifest unknown|manifest for .* not found|not found: manifest'; then
    problema "La versión de la imagen no existe" \
      "La versión (${TAG:-IMAGE_TAG}) de la imagen no existe en el registro: puede estar mal escrita o el CI todavía no la publicó." \
      "Revise la versión exacta en GitHub, pestaña Actions, ejecución «Deploy» (tiene la forma sha-1a2b3c4)." \
      "Si todavía no hay imágenes publicadas, use --construir para construirlas aquí." \
      "Vuelva a ejecutar con --tag CORRECTO."
  elif coincide 'no such host|temporary failure in name resolution|i/o timeout|tls handshake timeout|network is unreachable|could not resolve|dial tcp.*lookup|context deadline exceeded|connection timed out'; then
    problema "No se pudo llegar a internet o al registro de imágenes" \
      "El servidor no logró conectarse al servicio externo que necesita (descarga de imágenes o paquetes). Suele ser internet caído, DNS mal configurado o un firewall." \
      "Compruebe la conexión: ping -c 3 1.1.1.1 y luego ping -c 3 registry-1.docker.io" \
      "Si responde la primera y no la segunda, es el DNS: revise /etc/resolv.conf (pruebe con 1.1.1.1 o 8.8.8.8)." \
      "Si hay firewall o proxy, permita la salida a los puertos 80 y 443."
  elif coincide 'variable is not set|required variable|is missing a required|obligatori[ao]|invalid interpolation'; then
    nombre="$(grep -oE '[A-Z][A-Z0-9_]{3,}' "$LAST_OUT" 2>/dev/null | grep -vE '^(IMAGE_TAG|ERROR|WARN)$' | head -1)"
    [ -z "$nombre" ] && nombre="$(grep -oE '[A-Z][A-Z0-9_]{3,}' "$LAST_OUT" 2>/dev/null | head -1)"
    problema "Falta una variable obligatoria en el archivo de entorno" \
      "La configuración necesita la variable ${nombre:-(ver el registro)} y no tiene valor." \
      "Abra el archivo $ENV_FILE y agregue o complete ${nombre:-la variable indicada} (el ejemplo ${ENV_EJEMPLO##*/} muestra cómo)." \
      "Si es IMAGE_TAG, pase la versión con --tag, o use --construir." \
      "Guarde el archivo y vuelva a ejecutar el instalador."
  elif coincide 'yaml:|invalid compose project|must be a mapping|additional propert|services\..* is invalid'; then
    problema "El archivo de configuración tiene un error de formato" \
      "Docker Compose no pudo leer el archivo ${COMPOSE_FILE##*/}: tiene un error de sintaxis, normalmente por un cambio manual." \
      "Vea qué cambió: git status y git diff infrastructure/docker/" \
      "Restaure el archivo original: git checkout -- infrastructure/docker/${COMPOSE_FILE##*/}" \
      "Si necesita ese cambio, revise la sangría (espacios) de la línea que indica el registro."
  elif coincide 'no configuration file provided|no such file or directory.*compose|compose.*no such file'; then
    problema "No se encuentra el archivo de configuración" \
      "El instalador no halló el archivo ${COMPOSE_FILE##*/}. Normalmente se ejecutó desde otra carpeta o el repositorio está incompleto." \
      "Entre a la carpeta raíz del repositorio (donde está la carpeta scripts/): cd /ruta/del/repositorio" \
      "Compruebe que existe: ls infrastructure/docker/" \
      "Si falta, actualice el repositorio: git pull"
  else
    case "$ctx" in
      migrar)
        problema "La migración no terminó bien" \
          "Las migraciones preparan la base de datos para esta versión y se detuvieron antes de terminar. La base no quedó a medias: las migraciones se aplican de a una y se pueden repetir sin riesgo." \
          "Lea el detalle del error en el registro: $LOG" \
          "Vea el último mensaje del contenedor: docker logs $C_PG --tail 30" \
          "Si no entiende el mensaje, no siga: envíe el registro a quien mantiene el sistema." ;;
      up)
        problema "Los servicios no pudieron arrancar" \
          "Docker no pudo dejar en marcha uno de los servicios." \
          "Vea cuál falló: docker ps -a" \
          "Lea su mensaje: docker logs NOMBRE_DEL_CONTENEDOR --tail 30" \
          "Detalle en el registro: $LOG" ;;
      build)
        problema "No se pudieron construir las imágenes" \
          "La construcción se detuvo por una causa que el instalador no reconoce." \
          "Lea las últimas líneas del registro: $LOG" \
          "Reintente de a una imagen: COMPOSE_PARALLEL_LIMIT=1 $REPETIR" \
          "Si se repite, envíe el registro a quien mantiene el sistema." ;;
      *)
        problema "Un comando falló por una causa que el instalador no reconoce" \
          "$(significado_codigo "$LAST_CODE")" \
          "Lea las últimas líneas del registro: $LOG" \
          "Corrija lo que indique el mensaje y vuelva a ejecutar." \
          "Si no lo entiende, envíe el registro a quien mantiene el sistema." ;;
    esac
    printf '  Lo último que dijo el programa:\n'
    ultimas_lineas 6
    printf '\n'
  fi
}

# Falla del paso actual: explica y sale con código 1.
fallo() { diagnosticar "$1"; exit 1; }

# ---------- estado (reanudación) ---------------------------------------------
hecho() { [ "$REHACER" = 0 ] && grep -qx "paso$1=ok" "$ESTADO" 2>/dev/null; }
marcar() { grep -qx "paso$1=ok" "$ESTADO" 2>/dev/null || echo "paso$1=ok" >> "$ESTADO"; }
desmarcar_todo() { rm -f "$ESTADO"; }

# ---------- utilidades de entorno --------------------------------------------
env_get() { grep -E "^$1=" "$ENV_FILE" 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '\r' | sed -E 's/^"(.*)"$/\1/; s/^'"'"'(.*)'"'"'$/\1/'; }
env_tiene() { grep -qE "^$1=" "$ENV_FILE" 2>/dev/null; }
env_set() { # clave valor (los valores generados son hexadecimales: no necesitan escape)
  local tmp="$ENV_FILE.tmp.$$"
  awk -v k="$1" -v v="$2" 'BEGIN{FS=OFS="="} $1==k {print k "=" v; next} {print}' "$ENV_FILE" > "$tmp" && mv "$tmp" "$ENV_FILE"
  chmod 600 "$ENV_FILE" 2>/dev/null
}

REQ_COMUN="POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD DATABASE_URI PAYLOAD_SECRET PREVIEW_SECRET REVALIDATION_SECRET PORTAL_PUBLIC_URL CMS_PUBLIC_URL MEDIA_PUBLIC_ORIGIN MEDIA_HOSTNAME CONTACT_TO"
REQ_PROD="SMTP_HOST SMTP_PORT SMTP_SECURE SMTP_USER SMTP_PASSWORD SMTP_FROM_ADDRESS SMTP_FROM_NAME"
SECRETOS_LARGOS="PAYLOAD_SECRET PREVIEW_SECRET REVALIDATION_SECRET"

puerto_ocupado() { (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null; }

esperar_sano() { # contenedor
  local c="$1" max="${INSTALAR_ESPERA_MAX:-180}" intervalo=3 t=0 estado
  [ "$max" -le 10 ] && intervalo=1
  while [ "$t" -lt "$max" ]; do
    estado="$("$DOCKER" inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$c" 2>/dev/null)"
    case "$estado" in healthy|running) printf '\n'; return 0;; esac
    printf '.'; sleep "$intervalo"; t=$((t + intervalo))
  done
  printf '\n'
  return 1
}

falla_salud() { # contenedor descripción adjetivo(sano|sana)
  local c="$1" que="$2" adj="${3:-sano}"
  "$DOCKER" logs --tail 20 "$c" > "$TMP_OUT" 2>&1; LAST_OUT="$TMP_OUT"; LAST_CODE=1
  enmascarar < "$TMP_OUT" >> "$LOG"
  problema "$que no llegó a estar $adj" \
    "$que no pasó su comprobación de salud en ${INSTALAR_ESPERA_MAX:-180} segundos. Puede seguir arrancando (si es la primera vez tarda más) o estar fallando." \
    "Mire lo último que dijo el servicio (abajo) o con: docker logs $c --tail 50" \
    "Espere un par de minutos y vuelva a ejecutar el instalador: si solo estaba lento, continuará." \
    "Si el mensaje habla de la base de datos, revise POSTGRES_* y DATABASE_URI en $ENV_FILE."
  printf '  Lo último que dijo el servicio:\n'
  ultimas_lineas 8
  printf '\n'
  exit 1
}

# =============================================================================
printf '%sInstalador guiado del Portal UNC%s — entorno: %s%s%s\n' "$C_B" "$C_0" "$C_B" "$ENTORNO" "$C_0"
dice "Registro de esta instalación: $LOG"
dice "Si algo falla, el instalador le explicará qué pasó y qué hacer."
log "INICIO entorno=$ENTORNO solo_verificar=$SOLO_VERIFICAR construir=$CONSTRUIR rehacer=$REHACER raiz=$RAIZ"

if [ "$ENTORNO" = "produccion" ] && [ "$SIN_CONFIRMAR" = 0 ] && [ "$SOLO_VERIFICAR" = 0 ]; then
  printf '\n%sVa a instalar en PRODUCCION%s (el sitio real de la universidad).\n' "$C_AV" "$C_0"
  dice "Si todavía no probó esto en staging, cancele (Ctrl+C) y use --entorno staging."
  printf '  Escriba PRODUCCION para continuar: '
  RESP=""; read -r RESP || true
  if [ "$RESP" != "PRODUCCION" ]; then
    printf '\n  No se confirmó. Instalación cancelada; no se cambió nada.\n'
    exit 4
  fi
fi

# ---------- [1/9] Requisitos --------------------------------------------------
paso_titulo 1 "Comprobando los requisitos del servidor"
dice "Qué comprueba: Docker encendido, Docker Compose v2, espacio en disco, memoria y puertos libres."
if ! command -v "$DOCKER" > /dev/null 2>&1; then
  LAST_OUT=""; LAST_CODE=127
  problema "Docker no está instalado" \
    "No se encontró el programa «$DOCKER» en este equipo. Sin Docker no se pueden crear los contenedores del portal." \
    "En un servidor Linux, instálelo con el script oficial: curl -fsSL https://get.docker.com | sudo sh" \
    "En Windows o Mac, instale Docker Desktop desde https://www.docker.com/products/docker-desktop" \
    "Compruebe con: docker --version" \
    "Si Docker ya estaba instalado, cierre y abra la terminal para que encuentre el programa."
  exit 1
fi
ok "Docker está instalado."
corre "docker info" "$DOCKER" info || fallo docker
ok "Docker está encendido y responde."
corre "docker compose version" "$DOCKER" compose version || fallo compose
ok "Docker Compose v2 disponible."

LIBRE_KB="$(df -Pk "$RAIZ" 2>/dev/null | awk 'NR==2 {print $4}')"
if [ -n "${LIBRE_KB:-}" ]; then
  if [ "$LIBRE_KB" -lt 5242880 ]; then
    LAST_OUT=""; LAST_CODE=1
    problema "Espacio en disco insuficiente" \
      "Quedan menos de 5 GB libres en el disco donde está el repositorio; construir las imágenes necesita al menos 10 GB." \
      "Vea el uso del disco: df -h" \
      "Libere espacio (por ejemplo, imágenes de Docker sin uso: docker image prune) o amplíe el disco." \
      "Vuelva a ejecutar el instalador."
    exit 1
  elif [ "$LIBRE_KB" -lt 10485760 ]; then
    aviso "Hay menos de 10 GB libres; la construcción podría quedarse sin espacio."
  else
    ok "Espacio en disco suficiente."
  fi
fi
if [ -r /proc/meminfo ]; then
  MEM_KB="$(awk '/MemAvailable/ {print $2}' /proc/meminfo)"
  if [ -n "${MEM_KB:-}" ] && [ "$MEM_KB" -lt 1572864 ]; then
    aviso "Hay menos de 1,5 GB de memoria libre: si la construcción se detiene, agregue swap (ver la guía)."
  else
    ok "Memoria suficiente."
  fi
fi

CORRIENDO="$("$DOCKER" ps --format '{{.Names}}' 2>/dev/null)"
if [ "$ENTORNO" = "produccion" ]; then PUERTOS="80 443"; else PUERTOS="3100 3102"; fi
if printf '%s\n' "$CORRIENDO" | grep -qx "$C_PORTAL"; then
  ok "El portal de este entorno ya está en marcha: se omite la comprobación de puertos."
else
  for P in $PUERTOS; do
    if puerto_ocupado "$P"; then
      LAST_OUT=""; LAST_CODE=1
      problema "El puerto $P ya lo está usando otro programa" \
        "El portal necesita el puerto $P y otro programa del servidor ya lo ocupa, así que no podría arrancar." \
        "Vea quién lo usa: sudo ss -ltnp | grep ':$P'" \
        "Si es otro servidor web (apache, nginx) que no necesita, deténgalo: sudo systemctl stop apache2 nginx" \
        "Si es un contenedor viejo, véalo con docker ps y deténgalo con docker stop NOMBRE."
      exit 1
    fi
  done
  ok "Puertos libres ($PUERTOS)."
fi

# ---------- [2/9] Archivos ---------------------------------------------------
paso_titulo 2 "Comprobando los archivos del proyecto"
dice "Qué comprueba: que estén la configuración de Docker y el ejemplo de variables de entorno."
for F in "$COMPOSE_FILE" "$ENV_EJEMPLO"; do
  if [ ! -f "$F" ]; then
    LAST_OUT=""; LAST_CODE=1
    problema "Falta un archivo del proyecto" \
      "No se encontró ${F#$RAIZ/}. El repositorio está incompleto o el instalador no se ejecutó desde su carpeta." \
      "Entre a la carpeta raíz del repositorio (donde está scripts/): cd /ruta/del/repositorio" \
      "Actualice el repositorio: git pull" \
      "Vuelva a ejecutar el instalador."
    exit 1
  fi
done
ok "Archivos de configuración presentes (${COMPOSE_FILE##*/})."

# ---------- [3/9] Entorno -----------------------------------------------------
paso_titulo 3 "Revisando el archivo de entorno (${ENV_FILE##*/})"
dice "Qué comprueba: que existan las variables obligatorias, que no queden valores de ejemplo y que los secretos sean largos."
if [ ! -f "$ENV_FILE" ]; then
  cp "$ENV_EJEMPLO" "$ENV_FILE" && chmod 600 "$ENV_FILE" 2>/dev/null
  aviso "No existía ${ENV_FILE##*/}; se creó a partir del ejemplo (solo lectura para su usuario)."
  log "CREADO $ENV_FILE desde el ejemplo"
fi

if [ "$GENERAR_SECRETOS" = 1 ]; then
  if ! command -v openssl > /dev/null 2>&1; then
    LAST_OUT=""; LAST_CODE=127
    problema "Falta openssl para generar los secretos" \
      "La opción --generar-secretos usa openssl para crear valores aleatorios y no está instalado." \
      "En Linux: sudo apt-get install openssl" \
      "O genere los valores a mano con: openssl rand -hex 32 en otro equipo y péguelos en $ENV_FILE." \
      "Vuelva a ejecutar."
    exit 1
  fi
  COPIA="$ENV_FILE.copia-$(date +%Y%m%d%H%M%S)"
  cp "$ENV_FILE" "$COPIA" && chmod 600 "$COPIA" 2>/dev/null
  GEN=0
  necesita() { local v; v="$(env_get "$1")"; [ -z "$v" ] || printf '%s' "$v" | grep -q 'REEMPLAZAR_'; }
  for K in $SECRETOS_LARGOS S3_SECRET_ACCESS_KEY; do
    if env_tiene "$K" && necesita "$K"; then env_set "$K" "$(openssl rand -hex 32)"; GEN=$((GEN + 1)); fi
  done
  if env_tiene S3_ACCESS_KEY_ID && necesita S3_ACCESS_KEY_ID; then env_set S3_ACCESS_KEY_ID "$(openssl rand -hex 16)"; GEN=$((GEN + 1)); fi
  REGEN_URI=0
  if env_tiene POSTGRES_PASSWORD && necesita POSTGRES_PASSWORD; then env_set POSTGRES_PASSWORD "$(openssl rand -hex 24)"; GEN=$((GEN + 1)); REGEN_URI=1; fi
  if [ "$REGEN_URI" = 1 ] || { env_tiene DATABASE_URI && printf '%s' "$(env_get DATABASE_URI)" | grep -q 'REEMPLAZAR_'; }; then
    env_set DATABASE_URI "postgresql://$(env_get POSTGRES_USER):$(env_get POSTGRES_PASSWORD)@postgres:5432/$(env_get POSTGRES_DB)"
  fi
  ok "Se generaron $GEN secretos nuevos (no se muestran; quedan en el archivo). Copia del anterior: ${COPIA##*/}"
  log "SECRETOS GENERADOS: $GEN"
fi

PENDIENTES=()
REQ="$REQ_COMUN"; [ "$ENTORNO" = "produccion" ] && REQ="$REQ $REQ_PROD"
for K in $REQ; do
  if ! env_tiene "$K"; then PENDIENTES+=("$K  (falta la línea en el archivo)"); continue; fi
  V="$(env_get "$K")"
  if printf '%s' "$V" | grep -q 'REEMPLAZAR_'; then PENDIENTES+=("$K  (todavía tiene el valor de ejemplo)"); continue; fi
  case " $SECRETOS_LARGOS " in *" $K "*) [ "${#V}" -lt 32 ] && PENDIENTES+=("$K  (muy corto: mínimo 32 caracteres)");; esac
  case "$K" in
    POSTGRES_DB|POSTGRES_USER|POSTGRES_PASSWORD|DATABASE_URI|CONTACT_TO) [ -z "$V" ] && PENDIENTES+=("$K  (está vacío)");;
  esac
done
if [ "$ENTORNO" = "produccion" ]; then
  for K in PORTAL_PUBLIC_URL CMS_PUBLIC_URL MEDIA_PUBLIC_ORIGIN; do
    case "$(env_get "$K")" in https://*) ;; *) env_tiene "$K" && PENDIENTES+=("$K  (en producción debe empezar con https://)");; esac
  done
fi
URI="$(env_get DATABASE_URI)"; PASS="$(env_get POSTGRES_PASSWORD)"
if [ -n "$URI" ] && [ -n "$PASS" ] && ! printf '%s' "$URI" | grep -qF "$PASS"; then
  aviso "DATABASE_URI no contiene la contraseña de POSTGRES_PASSWORD tal cual; si la codificó con %, es normal. Si no, revíselas."
fi
OPCIONALES_EJEMPLO="$(grep -E '^(S3_|SENTRY_|NEXT_PUBLIC_SENTRY_DSN)[A-Z_]*=.*REEMPLAZAR_' "$ENV_FILE" 2>/dev/null | cut -d= -f1 | tr '\n' ' ')"
[ -n "$OPCIONALES_EJEMPLO" ] && aviso "Variables opcionales con valor de ejemplo (no bloquean): ${OPCIONALES_EJEMPLO}"

if [ ${#PENDIENTES[@]} -gt 0 ]; then
  printf '\n%s[FALTA COMPLETAR]%s El archivo de entorno todavía no está listo.\n' "$C_AV" "$C_0"
  printf '\n  Complete el archivo: %s\n' "$ENV_FILE"
  printf '  Variables pendientes (solo se muestran los nombres, nunca los valores):\n'
  for L in "${PENDIENTES[@]}"; do printf '    - %s\n' "$L"; done
  printf '\n  Qué hacer:\n'
  printf '    1. Para los secretos, deje que el instalador los genere: %s --generar-secretos\n' "$REPETIR"
  printf '    2. Las direcciones, el correo y el resto complételos usted en el archivo (abra %s con un editor).\n' "${ENV_FILE##*/}"
  printf '    3. Guarde y vuelva a ejecutar: %s\n' "$REPETIR"
  printf '\n  Registro: %s\n\n' "$LOG"
  log "ENTORNO INCOMPLETO: ${#PENDIENTES[@]} variables"
  exit 3
fi
ok "Variables obligatorias completas y sin valores de ejemplo."

[ "$ENTORNO" = "staging" ] && CONSTRUIR=1
[ -z "$TAG" ] && [ "$CONSTRUIR" = 1 ] && TAG="local-$(git -C "$RAIZ" rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M)"
export IMAGE_TAG="${TAG:-pendiente}"
corre "docker compose config" dc config -q || fallo config
ok "La configuración de Docker Compose es válida."

# ---------- [4/9] Certificados ----------------------------------------------
paso_titulo 4 "Comprobando los certificados HTTPS"
if [ "$ENTORNO" = "produccion" ]; then
  dice "Qué comprueba: que estén en infrastructure/nginx/certs/ los archivos que pide nginx.conf."
  FALTAN=()
  for C in $(grep -oE '/etc/nginx/certs/[A-Za-z0-9_.-]+' "$RAIZ/infrastructure/nginx/nginx.conf" 2>/dev/null | sort -u | sed 's#.*/##'); do
    [ -f "$RAIZ/infrastructure/nginx/certs/$C" ] || FALTAN+=("$C")
  done
  if [ ${#FALTAN[@]} -gt 0 ]; then
    LAST_OUT=""; LAST_CODE=1
    problema "Faltan los certificados HTTPS" \
      "Nginx necesita estos certificados en infrastructure/nginx/certs/ y no están: ${FALTAN[*]}" \
      "Copie el certificado de www.unc.edu.py como www_fullchain.pem y www_privkey.pem." \
      "Para cms.unc.edu.py, obtenga el certificado (Let's Encrypt) y copie cms_fullchain.pem y cms_privkey.pem; la guía docs/deploy/INSTALACION.md explica el paso." \
      "Si solo quiere probar sin HTTPS por ahora, use --entorno staging."
    exit 1
  fi
  ok "Certificados presentes."
else
  ok "No aplica en staging (se entra por túnel SSH, sin HTTPS)."
fi

if [ "$SOLO_VERIFICAR" = 1 ]; then
  printf '\n%sRevisión terminada.%s Los pasos 1 a 4 están bien y no se cambió nada.\n' "$C_OK" "$C_0"
  dice "Para instalar de verdad, ejecute: bash scripts/deploy/instalar.sh --entorno $ENTORNO"
  exit 0
fi

# ---------- [5/9] Imágenes ---------------------------------------------------
paso_titulo 5 "Preparando las imágenes de los servicios"
if hecho 5; then
  ok "Ya se hizo en una ejecución anterior (use --rehacer para repetirlo)."
else
  if [ "$CONSTRUIR" = 1 ]; then
    dice "Se construyen en este servidor desde el código del repositorio. Puede tardar varios minutos."
    corre "docker compose build" dc build || fallo build
    ok "Imágenes construidas (versión $IMAGE_TAG)."
  else
    if [ -z "$TAG" ]; then
      LAST_OUT=""; LAST_CODE=1
      problema "Falta la versión de las imágenes" \
        "En producción las imágenes se descargan del registro y hay que decir cuál versión (la publica el CI al fusionar a main)." \
        "Busque la versión en GitHub, pestaña Actions, ejecución «Deploy» (tiene la forma sha-1a2b3c4)." \
        "Vuelva a ejecutar con: --tag sha-1a2b3c4" \
        "Si todavía no hay imágenes publicadas, use --construir para construirlas aquí."
      exit 1
    fi
    dice "Se descargan del registro (versión $IMAGE_TAG)."
    corre "docker compose pull" dc pull || fallo pull
    ok "Imágenes descargadas."
  fi
  marcar 5
fi

# ---------- [6/9] Base de datos y migraciones -------------------------------
paso_titulo 6 "Preparando la base de datos y las migraciones"
if hecho 6; then
  ok "Ya se hizo en una ejecución anterior (use --rehacer para repetirlo)."
else
  if [ "$ENTORNO" = "produccion" ] && "$DOCKER" volume ls -q 2> /dev/null | grep -qx "unc_postgres_data_prod"; then
    aviso "Ya existe una base de datos de una instalación anterior. Antes de migrar, haga un respaldo (scripts/backup/backup-prod.sh)."
    if [ "$SIN_CONFIRMAR" = 0 ]; then
      printf '  ¿Ya hizo el respaldo? Escriba SI para continuar: '
      RESP=""; read -r RESP || true
      [ "$RESP" = "SI" ] || { printf '\n  Cancelado; no se cambió nada. Haga el respaldo y vuelva a ejecutar.\n'; exit 4; }
    fi
  fi
  corre "docker compose up -d postgres" dc up -d postgres || fallo up
  printf '  Esperando que la base de datos esté sana'
  esperar_sano "$C_PG" || falla_salud "$C_PG" "La base de datos (postgres)" sana
  ok "La base de datos está sana."
  dice "Aplicando las migraciones (solo crean o ajustan tablas; se pueden repetir)."
  corre "docker compose run --rm cms-migrate" dc run --rm cms-migrate || fallo migrar
  ok "Migraciones aplicadas."
  marcar 6
fi

# ---------- [7/9] Servicios --------------------------------------------------
paso_titulo 7 "Encendiendo los servicios"
if hecho 7; then
  ok "Ya se hizo en una ejecución anterior (use --rehacer para repetirlo)."
else
  corre "docker compose up -d" dc up -d || fallo up
  printf '  Esperando al CMS'
  esperar_sano "$C_CMS" || falla_salud "$C_CMS" "El CMS"
  ok "El CMS está sano."
  printf '  Esperando al portal'
  esperar_sano "$C_PORTAL" || falla_salud "$C_PORTAL" "El portal"
  ok "El portal está sano."
  if [ "$ENTORNO" = "produccion" ]; then
    printf '  Esperando a nginx'
    esperar_sano "$C_NGINX" || falla_salud "$C_NGINX" "Nginx"
    ok "Nginx está sano."
  fi
  marcar 7
fi

# ---------- [8/9] Prueba de humo ---------------------------------------------
paso_titulo 8 "Prueba de humo"
dice "Qué comprueba: que el portal y el CMS contesten por dentro del servidor."
if ! corre "salud del portal" "$DOCKER" exec "$C_PORTAL" wget -qO- http://127.0.0.1:3000/api/health; then
  problema "El portal no contesta" \
    "El contenedor del portal está encendido pero su dirección de salud no responde." \
    "Mire su registro: docker logs $C_PORTAL --tail 50" \
    "Si dice que no alcanza al CMS, espere un minuto y reintente." \
    "Detalle: $LOG"
  exit 1
fi
ok "El portal responde."
if ! corre "salud del CMS" "$DOCKER" exec "$C_CMS" wget -qO- http://127.0.0.1:3000/api/health/ready; then
  problema "El CMS no está listo" \
    "El CMS contesta pero no logra conectarse a su base de datos, o todavía está arrancando." \
    "Mire su registro: docker logs $C_CMS --tail 50" \
    "Revise DATABASE_URI en $ENV_FILE." \
    "Detalle: $LOG"
  exit 1
fi
ok "El CMS responde y llega a su base de datos."
if [ "$ENTORNO" = "produccion" ]; then
  corre "nginx -t" "$DOCKER" exec "$C_NGINX" nginx -t || fallo up
  ok "La configuración de nginx es válida."
fi

# ---------- [9/9] Siguientes pasos -------------------------------------------
paso_titulo 9 "Siguientes pasos"
printf '\n%sLa instalación terminó. Todo listo.%s\n\n' "$C_OK" "$C_0"
if [ "$ENTORNO" = "staging" ]; then
  dice "1. Desde SU equipo abra un túnel (así nada queda público):"
  dice "     ssh -L 3100:127.0.0.1:3100 -L 3102:127.0.0.1:3102 usuario@servidor"
  dice "2. Portal: http://localhost:3100    CMS: http://localhost:3102/accesoSeguro"
  dice "3. En el CMS cree el primer superadmin (con datos de prueba, nunca reales)."
  CMS_URL_EJ="http://localhost:3102"; PERM=""
else
  dice "1. Abra https://cms.unc.edu.py/accesoSeguro y cree el primer superadmin."
  dice "2. Cree las cuentas web-admin de quienes editarán los contenidos."
  dice "3. Programe los respaldos EN ESTE SERVIDOR (la base no se expone a internet, por eso no se respalda desde GitHub):"
  dice "     a) Copie scripts/backup/crontab.example, ajuste PROJECT_DIR y péguelo con: crontab -e"
  dice "     b) Active la copia EXTERNA una vez: bash scripts/backup/configure-offsite.sh"
  dice "     c) Guarde la frase de paso de los respaldos FUERA de este servidor (gestor de contraseñas o papel)."
  dice "     d) Pruebe una restauración antes de dar el sitio por bueno: docs/BACKUP_RECOVERY.md"
  CMS_URL_EJ="https://cms.unc.edu.py"; PERM=" --allow-remote"
fi
dice "4. Cargue los contenidos iniciales (una sola vez; cada comando es repetible sin riesgo). Desde la carpeta del repositorio:"
for S in seed-tramites seed-calendario seed-legales seed-legalizaciones seed-dependencias seed-pilares-academicos seed-navegacion; do
  dice "     CMS_URL=$CMS_URL_EJ CMS_EMAIL=su-correo CMS_PASSWORD=su-clave node scripts/$S.mjs --apply$PERM"
done
dice "   Hay más siembras en scripts/seed-*.mjs (aranceles, glosario, etc.); la guía indica el orden completo."
dice "5. Pida a cada unidad que confirme sus datos (calendario, textos legales, contactos, trámites) desde el CMS."
printf '\n  Registro de esta instalación: %s\n' "$LOG"
log "FIN OK entorno=$ENTORNO"
exit 0
