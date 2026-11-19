#!/usr/bin/env bash
# MIG-FULL — Migración COMPLETA del portal: toda la base PostgreSQL (todos los esquemas, tablas, secuencias,
# índices, restricciones y datos, incluidos usuarios y auditoría) más los archivos de `media` (imágenes y PDF).
#
# Uso (dos fases, porque origen y destino suelen estar en máquinas distintas):
#   full-migration.sh export <carpeta-paquete>   # en la máquina de ORIGEN: genera el paquete
#   full-migration.sh import <carpeta-paquete>   # en la máquina de DESTINO: carga los datos y verifica
#   full-migration.sh verify <carpeta-paquete>   # solo vuelve a verificar el destino contra el manifiesto
#
# Variables de export:
#   SOURCE_DATABASE_URL   postgresql://usuario:clave@host:puerto/base (obligatoria)
#   SOURCE_PG_CONTAINER   opcional: ejecuta pg_dump/psql DENTRO de ese contenedor (la URL se resuelve desde él)
#   MEDIA_SOURCE_DIR      carpeta de media en el host (ej. apps/cms/media), o bien
#   MEDIA_SOURCE_CONTAINER contenedor del CMS cuyo /app/media se copia (ej. unc-cms-prod)
# Variables de import/verify:
#   TARGET_DATABASE_URL   base de destino con el esquema YA CREADO por las migraciones del repositorio y sin
#                         datos (obligatoria); TARGET_PG_CONTAINER análogo al de origen
#   MEDIA_TARGET_DIR o MEDIA_TARGET_CONTAINER  destino de media VACÍO (contenedor: se extrae en /app/media)
#
# Herramientas: si no se indica contenedor, usa pg_dump/pg_restore/psql del PATH; si no existen, usa la imagen
# postgres:16-alpine con `docker run --network host` (PG_DOCKER_IMAGE la cambia).
#
# Por qué existe: los seeds cargan colección por colección y dejan huecos (en producción faltaban noticias, media,
# transparencia, Ley 5189, reconocimientos y acreditaciones). Restaurar la base sin los archivos deja filas de
# `media` sin imagen; por eso el paquete lleva ambos y el import compara conteos exactos y nombres de archivo.
# Seguridad: el paquete contiene TODO, incluidos hashes de contraseñas, sesiones y PII; se crea con permisos 600/700
# y no debe subirse a git ni a servicios externos. Las URL con clave viajan por variable de entorno, nunca en argv.
# Esquema vs. datos: el destino recibe SOLO DATOS. El esquema lo crean antes las migraciones de Payload
# (`cms-migrate`), porque la base de desarrollo se creó con `push` (payload_migrations = «dev»): copiar su esquema
# haría fallar las migraciones de los despliegues siguientes. Por eso `payload_migrations` no se copia.
# Límites: copia en caliente (escrituras durante el export pueden quedar fuera); el import se niega a escribir si
# alguna tabla de destino tiene filas o la media de destino no está vacía (no hay modo «mezclar»); si el origen
# tiene una columna que el destino no tiene, la carga falla entera y el destino queda sin datos.
# Spec: docs/deploy/MIGRACION-COMPLETA.md
set -euo pipefail
umask 077

CMD="${1:-}"; PKG="${2:-}"
usage() { sed -n '4,8p' "$0" | sed 's/^# \{0,1\}//' >&2; exit 2; }
[ -n "$CMD" ] && [ -n "$PKG" ] || usage
die() { echo "ERROR: $*" >&2; exit 1; }
log() { echo "[$(date -u +%H:%M:%SZ)] $*" >&2; }

PG_IMAGE="${PG_DOCKER_IMAGE:-postgres:16-alpine}"

# Ejecuta una herramienta de PostgreSQL ($2...) contra la URL guardada en la variable $1, sin poner la URL en argv.
# Modo contenedor (docker exec -e VAR), PATH local o imagen desechable. stdin/stdout pasan tal cual.
pg_tool() {
  local urlvar="$1" container="$2"; shift 2
  local tool="$1"; shift
  if [ -n "$container" ]; then
    docker exec -i -e "$urlvar" "$container" sh -c "exec $tool -d \"\$$urlvar\" \"\$@\"" _ "$@"
  elif command -v "$tool" > /dev/null 2>&1; then
    "$tool" -d "${!urlvar}" "$@"
  else
    docker run --rm -i --network host -e "$urlvar" "$PG_IMAGE" sh -c "exec $tool -d \"\$$urlvar\" \"\$@\"" _ "$@"
  fi
}

# Ejecuta una herramienta de PostgreSQL SIN conexión (p. ej. pg_restore a script SQL), en el contenedor $1 o local.
pg_offline() {
  local container="$1"; shift
  if [ -n "$container" ]; then docker exec -i "$container" "$@"
  elif command -v "$1" > /dev/null 2>&1; then "$@"
  else docker run --rm -i "$PG_IMAGE" "$@"; fi
}

# Tabla que NO se copia: el historial de migraciones pertenece al destino (ver «Esquema vs. datos» arriba).
SKIP_TABLE='public.payload_migrations'

# Consulta SQL de solo lectura (salida sin alineación, separador |). La consulta va por stdin.
sql() { local u="$1" c="$2"; shift 2; pg_tool "$u" "$c" psql -X -q -At -v ON_ERROR_STOP=1 -F '|' "$@"; }

# Lista "esquema.tabla|filas" con conteo EXACTO de cada tabla de usuario (no estimaciones de pg_class).
# Por qué: el objetivo es demostrar que no falta ni una fila; reltuples puede estar desactualizado.
COUNT_SQL="
CREATE TEMP TABLE _mig_counts(t text, n bigint);
DO \$\$
DECLARE r record; c bigint;
BEGIN
  FOR r IN SELECT n.nspname s, c.relname t FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE c.relkind IN ('r','p') AND n.nspname NOT IN ('pg_catalog','information_schema')
             AND n.nspname NOT LIKE 'pg_toast%' AND n.nspname NOT LIKE 'pg_temp%'
  LOOP
    EXECUTE format('SELECT count(*) FROM %I.%I', r.s, r.t) INTO c;
    INSERT INTO _mig_counts VALUES (r.s || '.' || r.t, c);
  END LOOP;
END \$\$;
SELECT t || '|' || n FROM _mig_counts ORDER BY t;
"

# Nombres de archivo que la base espera encontrar en media: toda columna *filename de cada tabla media* (incluye
# variantes de tamaño de Payload si existieran).
FILES_SQL="
CREATE TEMP TABLE _mig_files(f text);
DO \$\$
DECLARE r record;
BEGIN
  FOR r IN SELECT table_schema s, table_name t, column_name c FROM information_schema.columns
           WHERE table_schema NOT IN ('pg_catalog','information_schema') AND table_name LIKE 'media%'
             AND column_name LIKE '%filename' AND data_type IN ('character varying','text')
  LOOP
    EXECUTE format('INSERT INTO _mig_files SELECT %I FROM %I.%I WHERE %I IS NOT NULL AND %I <> %L', r.c, r.s, r.t, r.c, r.c, '');
  END LOOP;
END \$\$;
SELECT DISTINCT f FROM _mig_files ORDER BY f;
"

# Lista ordenada "ruta|bytes" de los archivos de media dentro de un tar.gz.
tar_listing() { tar -tvzf "$1" | awk '$1 !~ /^d/ { size=$3; $1=$2=$3=$4=$5=""; sub(/^ +/, ""); sub(/^\.\//, ""); print $0 "|" size }' | sort; }

case "$CMD" in
export)
  [ -n "${SOURCE_DATABASE_URL:-}" ] || die "falta SOURCE_DATABASE_URL."
  export SOURCE_DATABASE_URL
  if [ -n "${MEDIA_SOURCE_DIR:-}" ] && [ -n "${MEDIA_SOURCE_CONTAINER:-}" ]; then die "use MEDIA_SOURCE_DIR o MEDIA_SOURCE_CONTAINER, no ambos."; fi
  [ -n "${MEDIA_SOURCE_DIR:-}${MEDIA_SOURCE_CONTAINER:-}" ] || die "falta MEDIA_SOURCE_DIR o MEDIA_SOURCE_CONTAINER (las imágenes son parte de la migración)."
  [ -z "${MEDIA_SOURCE_DIR:-}" ] || [ -d "$MEDIA_SOURCE_DIR" ] || die "MEDIA_SOURCE_DIR no es una carpeta."
  if [ -e "$PKG" ] && [ -n "$(ls -A "$PKG" 2> /dev/null)" ]; then die "la carpeta del paquete ya tiene archivos; use una nueva."; fi
  mkdir -p "$PKG"; chmod 700 "$PKG"
  SC="${SOURCE_PG_CONTAINER:-}"

  log "1/4 Volcado completo de la base (formato custom, con secuencias, sin dueños ni permisos)…"
  pg_tool SOURCE_DATABASE_URL "$SC" pg_dump -Fc --no-owner --no-privileges > "$PKG/db.dump"
  [ -s "$PKG/db.dump" ] || die "el volcado quedó vacío."

  log "2/4 Conteo exacto de filas por tabla…"
  echo "$COUNT_SQL" | sql SOURCE_DATABASE_URL "$SC" | { grep -v "^$SKIP_TABLE|" || true; } > "$PKG/rowcounts.txt"
  [ -s "$PKG/rowcounts.txt" ] || die "la base de origen no tiene tablas."
  echo "$FILES_SQL" | sql SOURCE_DATABASE_URL "$SC" > "$PKG/media-expected.txt"
  echo "SELECT current_setting('server_version_num');" | sql SOURCE_DATABASE_URL "$SC" > "$PKG/source-version.txt"

  log "3/4 Empaquetado de media…"
  if [ -n "${MEDIA_SOURCE_DIR:-}" ]; then
    tar -czf "$PKG/media.tar.gz" -C "$MEDIA_SOURCE_DIR" .
  else
    docker exec "$MEDIA_SOURCE_CONTAINER" tar -czf - -C /app/media . > "$PKG/media.tar.gz"
  fi
  tar_listing "$PKG/media.tar.gz" > "$PKG/media-files.txt"

  # Falla cerrada: si la base nombra un archivo que no está en el tar, el paquete NO es completo.
  MISSING="$(cut -d'|' -f1 "$PKG/media-files.txt" | sort | comm -23 <(sort "$PKG/media-expected.txt") -)"
  if [ -n "$MISSING" ]; then
    echo "$MISSING" > "$PKG/media-missing-in-source.txt"
    die "$(echo "$MISSING" | wc -l | tr -d ' ') archivos referenciados por la base no existen en la media de origen (ver media-missing-in-source.txt)."
  fi

  log "4/4 Sumas de verificación…"
  (cd "$PKG" && sha256sum db.dump media.tar.gz rowcounts.txt media-files.txt media-expected.txt source-version.txt > SHA256SUMS)
  chmod 600 "$PKG"/*
  TABLES=$(wc -l < "$PKG/rowcounts.txt" | tr -d ' ')
  ROWS=$(awk -F'|' '{s+=$2} END {print s}' "$PKG/rowcounts.txt")
  FILES=$(wc -l < "$PKG/media-files.txt" | tr -d ' ')
  echo "PAQUETE=$PKG"
  echo "Exportado: $TABLES tablas, $ROWS filas, $FILES archivos de media. Contiene datos sensibles (usuarios, hashes): no subir a git."
  ;;

import | verify)
  [ -n "${TARGET_DATABASE_URL:-}" ] || die "falta TARGET_DATABASE_URL."
  export TARGET_DATABASE_URL
  if [ -n "${MEDIA_TARGET_DIR:-}" ] && [ -n "${MEDIA_TARGET_CONTAINER:-}" ]; then die "use MEDIA_TARGET_DIR o MEDIA_TARGET_CONTAINER, no ambos."; fi
  [ -n "${MEDIA_TARGET_DIR:-}${MEDIA_TARGET_CONTAINER:-}" ] || die "falta MEDIA_TARGET_DIR o MEDIA_TARGET_CONTAINER."
  for f in db.dump media.tar.gz rowcounts.txt media-files.txt media-expected.txt SHA256SUMS; do
    [ -s "$PKG/$f" ] || die "falta $PKG/$f (paquete incompleto)."
  done
  (cd "$PKG" && sha256sum -c --quiet SHA256SUMS) || die "las sumas no coinciden: paquete dañado o modificado."
  TC="${TARGET_PG_CONTAINER:-}"

  if [ "$CMD" = import ]; then
    # Guardas: el destino debe tener el esquema de las migraciones y NINGUNA fila (salvo payload_migrations), su
    # versión de PostgreSQL debe ser >= origen y la media de destino debe estar vacía.
    # Por qué: cargar sobre datos existentes mezclaría o duplicaría contenido sin forma limpia de deshacerlo.
    echo "$COUNT_SQL" | sql TARGET_DATABASE_URL "$TC" | { grep -v "^$SKIP_TABLE|" || true; } > "$PKG/rowcounts-before.txt"
    [ -s "$PKG/rowcounts-before.txt" ] || die "la base de destino no tiene tablas: primero corra las migraciones (cms-migrate)."
    NROWS=$(awk -F'|' '{s+=$2} END {print s+0}' "$PKG/rowcounts-before.txt")
    [ "$NROWS" = 0 ] || die "la base de destino YA tiene $NROWS filas. Use una base nueva con solo las migraciones; este script no mezcla datos."
    SV=$(cat "$PKG/source-version.txt" 2> /dev/null || echo 0)
    TV=$(echo "SELECT current_setting('server_version_num');" | sql TARGET_DATABASE_URL "$TC")
    [ $((TV / 10000)) -ge $((SV / 10000)) ] || die "el destino ($TV) es de una versión mayor de PostgreSQL anterior al origen ($SV)."
    if [ -n "${MEDIA_TARGET_DIR:-}" ]; then
      mkdir -p "$MEDIA_TARGET_DIR"
      [ -z "$(ls -A "$MEDIA_TARGET_DIR")" ] || die "MEDIA_TARGET_DIR no está vacía."
    else
      [ -z "$(docker exec "$MEDIA_TARGET_CONTAINER" sh -c 'ls -A /app/media')" ] || die "/app/media de $MEDIA_TARGET_CONTAINER no está vacía."
    fi

    log "1/3 Cargando los datos en una sola transacción (si algo falla, el destino queda sin datos)…"
    # pg_restore convierte el volcado en SQL de solo datos (con los setval de las secuencias); awk quita el bloque
    # COPY y el setval de payload_migrations; psql lo aplica todo o nada. --disable-triggers desactiva las claves
    # foráneas durante la carga (el orden de las tablas no importa) y exige un usuario superusuario.
    pg_offline "$TC" pg_restore --data-only --disable-triggers --no-owner --no-privileges -f - < "$PKG/db.dump"       | awk -v t="$SKIP_TABLE" '
          index($0, "COPY " t " ") == 1 { skip = 1; next }
          skip && $0 == "\\." { skip = 0; next }
          skip { next }
          index($0, t "_id_seq") > 0 && index($0, "setval") > 0 { next }
          { print }'       | sql TARGET_DATABASE_URL "$TC" --single-transaction > /dev/null

    log "2/3 Extrayendo media…"
    if [ -n "${MEDIA_TARGET_DIR:-}" ]; then
      tar -xzf "$PKG/media.tar.gz" -C "$MEDIA_TARGET_DIR"
    else
      docker exec -i "$MEDIA_TARGET_CONTAINER" tar -xzf - -C /app/media < "$PKG/media.tar.gz"
      # Dueño 1001:1001 = usuario `nextjs` del CMS (igual que scripts/backup/restore-media.sh).
      docker exec -u 0 "$MEDIA_TARGET_CONTAINER" chown -R 1001:1001 /app/media
    fi
  fi

  log "3/3 Verificando destino contra el manifiesto…"
  FAIL=0
  echo "$COUNT_SQL" | sql TARGET_DATABASE_URL "$TC" | { grep -v "^$SKIP_TABLE|" || true; } > "$PKG/rowcounts-target.txt"
  if ! diff "$PKG/rowcounts.txt" "$PKG/rowcounts-target.txt" > "$PKG/rowcounts.diff"; then
    echo "DIFERENCIA en filas por tabla (origen < > destino):" >&2; cat "$PKG/rowcounts.diff" >&2; FAIL=1
  fi
  if [ -n "${MEDIA_TARGET_DIR:-}" ]; then
    (cd "$MEDIA_TARGET_DIR" && find . -type f -printf '%P|%s\n' | sort) > "$PKG/media-files-target.txt"
  else
    docker exec "$MEDIA_TARGET_CONTAINER" sh -c 'cd /app/media && find . -type f -exec stat -c "%n|%s" {} +' | sed 's#^\./##' | sort > "$PKG/media-files-target.txt"
  fi
  if ! diff "$PKG/media-files.txt" "$PKG/media-files-target.txt" > "$PKG/media.diff"; then
    echo "DIFERENCIA en archivos de media (nombre|bytes):" >&2; cat "$PKG/media.diff" >&2; FAIL=1
  fi
  echo "$FILES_SQL" | sql TARGET_DATABASE_URL "$TC" > "$PKG/media-expected-target.txt"
  MISSING="$(cut -d'|' -f1 "$PKG/media-files-target.txt" | sort | comm -23 "$PKG/media-expected-target.txt" -)"
  if [ -n "$MISSING" ]; then echo "Archivos referenciados por la base que faltan en destino:" >&2; echo "$MISSING" >&2; FAIL=1; fi
  chmod 600 "$PKG"/* 2> /dev/null || true

  [ "$FAIL" = 0 ] || die "la verificación falló; el destino NO es una copia completa."
  echo "OK: $(wc -l < "$PKG/rowcounts.txt" | tr -d ' ') tablas con conteo idéntico, $(awk -F'|' '{s+=$2} END {print s}' "$PKG/rowcounts.txt") filas, $(wc -l < "$PKG/media-files.txt" | tr -d ' ') archivos de media idénticos en nombre y tamaño."
  ;;
*) usage ;;
esac
