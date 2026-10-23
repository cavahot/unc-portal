#!/usr/bin/env bash
# =============================================================
# restore-data-prod.sh — Carga SOLO LOS DATOS del seed en producción (DEP-07, vía C)
# =============================================================
# Uso (el esquema ya debe estar migrado: `cms-migrate` / `payload migrate`):
#   bash scripts/setup/restore-data-prod.sh
#
# Flujo del primer deploy (DEPLOY.md): migrate -> restore-data -> up.
#
# Qué hace: `pg_restore --data-only --single-transaction` del seed sobre tablas VACÍAS, con una lista
#   filtrada (-L) que excluye las tablas de setup/restore-data.exclude.txt (payload_migrations,
#   sesiones, bloqueos, preferencias, payload_kv).
# Por qué (amenaza): el esquema debe salir SIEMPRE de las migraciones versionadas (un único camino).
#   El restore completo antiguo (restore-db-prod.sh) hace DROP SCHEMA y trae el esquema de dev, que
#   Payload no distingue del baseline (solo compara nombres de migración).
# Falla en voz alta: si el dump no es compatible con el esquema (columna/enum/FK/secuencia), la
#   carga es una sola transacción, aborta con exit != 0 y no deja datos parciales.
# Límites: NO verificado contra Postgres real (HIPÓTESIS en docs/specs/deploy/DEP-07-...md):
#   compatibilidad dump (2026-08-08) vs baseline (2026-10-17), orden de datos/FK sin
#   --disable-triggers, enums y secuencias. El dump trae PII (DEP-01). Backup local sin cifrar (DEP-08).
# =============================================================
set -euo pipefail

# Git Bash/MSYS convierte argumentos que empiezan con '/' en rutas de Windows (rompería -L /tmp/...).
# En Linux no tiene efecto.
export MSYS_NO_PATHCONV=1

CONTAINER="unc-postgres-prod"
SEED_GZ="setup/seed.dump.gz"
SEED_DUMP="setup/seed.dump"
ENV_FILE="infrastructure/docker/.env.prod"
EXCLUDE_FILE="${RESTORE_DATA_EXCLUDE_FILE:-setup/restore-data.exclude.txt}"
# Nombre del baseline; debe coincidir con apps/cms/src/migrations/index.ts (lo verifica un test).
BASELINE_NAME="20261017_021341_arch_db_02_baseline"
REMOTE_LIST="/tmp/restore-data.list"
TOC_FILE=""
LIST_FILE=""

# Limpieza en cualquier salida (éxito, set -e, exit explícito): el dump descomprimido contiene datos
# de producción (DEP-01 MEDIO-2). Límite: no cubre SIGKILL.
cleanup() {
  rm -f "$SEED_DUMP" "$TOC_FILE" "$LIST_FILE"
  docker exec "$CONTAINER" rm -f "$REMOTE_LIST" > /dev/null 2>&1 || true
}
trap cleanup EXIT

die() { echo "✗  $1"; exit 1; }

echo "============================================"
echo "  Carga de DATOS en BD Producción — UNC"
echo "============================================"
echo ""

# 1. Credenciales (DEP-01: 'tr -d CR' evita filtrar CR de un .env.prod con CRLF)
[[ -f "$ENV_FILE" ]] || die "No se encontró $ENV_FILE"
DB_NAME=$(grep -E '^POSTGRES_DB=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r' | tr -d '"' | tr -d "'")
DB_USER=$(grep -E '^POSTGRES_USER=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r' | tr -d '"' | tr -d "'")
DB_NAME="${DB_NAME:-unc_portal}"
DB_USER="${DB_USER:-unc_cms}"

psql_q() { docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -tAc "$1"; }

# 2. Contenedor activo (DEP-01: se captura la salida; 'docker ps | grep -q' con pipefail da SIGPIPE)
echo "→ Verificando contenedor PostgreSQL..."
RUNNING_CONTAINERS="$(docker ps --format '{{.Names}}')"
if ! grep -qx "$CONTAINER" <<< "$RUNNING_CONTAINERS"; then
  echo "✗  El contenedor $CONTAINER no está corriendo."
  echo "   Levantá solo la base: docker compose -f infrastructure/docker/compose.prod.yaml --env-file infrastructure/docker/.env.prod up -d postgres"
  exit 1
fi
echo "✓  Contenedor activo"

echo ""
echo "→ Esperando que PostgreSQL esté listo..."
for i in $(seq 1 15); do
  if docker exec "$CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" -q 2>/dev/null; then
    echo "✓  PostgreSQL listo"
    break
  fi
  [[ $i -eq 15 ]] && die "PostgreSQL no respondió. Abortando."
  sleep 2
done

# 3. El esquema debe venir de las migraciones (DEP-07 C-1): payload_migrations con el baseline
#    registrado y SIN fila de dev (batch = -1). Si no, no se carga nada.
echo ""
echo "→ Verificando que el esquema esté migrado..."
HAS_MIG=$(psql_q "SELECT to_regclass('public.payload_migrations') IS NOT NULL;" | tr -d '[:space:]')
if [[ "$HAS_MIG" != "t" ]]; then
  echo "✗  No existe payload_migrations: el esquema NO está migrado."
  echo "   Ejecutá primero: docker compose -f infrastructure/docker/compose.prod.yaml --env-file infrastructure/docker/.env.prod run --rm -T cms-migrate"
  exit 1
fi
BASELINE_ROWS=$(psql_q "SELECT COUNT(*) FROM payload_migrations WHERE name = '$BASELINE_NAME' AND batch > 0;" | tr -d '[:space:]')
DEV_ROWS=$(psql_q "SELECT COUNT(*) FROM payload_migrations WHERE batch = -1;" | tr -d '[:space:]')
[[ "$BASELINE_ROWS" =~ ^[0-9]+$ && "$DEV_ROWS" =~ ^[0-9]+$ ]] || die "Respuesta inesperada al leer payload_migrations (baseline='$BASELINE_ROWS', dev='$DEV_ROWS')."
if [[ "$BASELINE_ROWS" -ne 1 ]]; then
  die "El baseline $BASELINE_NAME no está registrado en payload_migrations (filas: $BASELINE_ROWS). Migrá antes de cargar datos."
fi
if [[ "$DEV_ROWS" -ne 0 ]]; then
  die "payload_migrations tiene $DEV_ROWS fila(s) batch = -1 (esquema de dev). No es un esquema migrado limpio. Abortando."
fi
echo "✓  Esquema migrado (baseline $BASELINE_NAME registrado)"

# 4. Dump y lista filtrada (-L)
echo ""
echo "→ Buscando archivo seed..."
[[ -f "$SEED_GZ" ]] || die "No se encontró $SEED_GZ (el archivo debe estar en el repositorio)."
[[ -f "$EXCLUDE_FILE" ]] || die "No se encontró la lista de exclusión $EXCLUDE_FILE"
echo "✓  Encontrado: $SEED_GZ ($(du -sh "$SEED_GZ" | cut -f1))"
umask 077
gunzip -fk "$SEED_GZ"

# Lista de exclusión: un nombre de tabla por línea; se validan para que nunca se inyecten en un patrón.
EXCL_CSV=""
while IFS= read -r line || [[ -n "$line" ]]; do
  line="$(echo "$line" | tr -d '\r' | sed -e 's/#.*$//' -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
  [[ -z "$line" ]] && continue
  [[ "$line" =~ ^[a-z_][a-z0-9_]*$ ]] || die "Nombre inválido en $EXCLUDE_FILE: '$line'"
  EXCL_CSV="${EXCL_CSV:+$EXCL_CSV,}$line"
done < "$EXCLUDE_FILE"
[[ -n "$EXCL_CSV" ]] || die "La lista de exclusión $EXCLUDE_FILE está vacía (debe excluir al menos payload_migrations)."
case ",$EXCL_CSV," in *,payload_migrations,*) ;; *) die "$EXCLUDE_FILE debe excluir payload_migrations." ;; esac

TOC_FILE="$(mktemp)"
LIST_FILE="$(mktemp)"
if ! docker exec -i "$CONTAINER" pg_restore --list < "$SEED_DUMP" > "$TOC_FILE"; then
  die "El seed no es legible (pg_restore --list falló). Abortando."
fi
tr -d '\r' < "$TOC_FILE" > "$TOC_FILE.tmp" && mv "$TOC_FILE.tmp" "$TOC_FILE"

# Solo entradas de DATOS del esquema public (TABLE DATA y SEQUENCE SET), sin las tablas excluidas
# ni sus secuencias <tabla>_id_seq. Si el formato de `pg_restore -l` cambiara, la lista quedaría
# vacía y el script aborta (no falla en silencio).
awk -v excl="$EXCL_CSV" '
  BEGIN { n = split(excl, a, ","); for (i = 1; i <= n; i++) { ex[a[i]] = 1; ex[a[i] "_id_seq"] = 1 } }
  /^;/ { next }
  {
    n = split($0, f, " ")
    for (i = 1; i <= n - 3; i++) {
      if ((f[i] == "TABLE" && f[i+1] == "DATA" && f[i+2] == "public") || (f[i] == "SEQUENCE" && f[i+1] == "SET" && f[i+2] == "public")) {
        if (!(f[i+3] in ex)) print
        next
      }
    }
  }' "$TOC_FILE" > "$LIST_FILE"

LOAD_TABLES="$(awk '{ n = split($0, f, " "); for (i = 1; i <= n - 3; i++) if (f[i] == "TABLE" && f[i+1] == "DATA" && f[i+2] == "public") { print f[i+3]; next } }' "$LIST_FILE")"
[[ -n "$LOAD_TABLES" ]] || die "La lista filtrada no tiene ninguna entrada TABLE DATA: el dump o su formato no es el esperado."
echo "✓  Tablas a cargar: $(echo "$LOAD_TABLES" | wc -l | tr -d '[:space:]')  |  Excluidas por lista: $EXCL_CSV"

# 5. Las tablas a cargar deben existir en el esquema migrado y estar VACÍAS (DEP-07 C-1).
#    Una tabla ausente = el dump trae datos de un esquema que el baseline no tiene -> aborta.
echo ""
echo "→ Verificando que las tablas de destino existan y estén vacías..."
NONEMPTY=""
while IFS= read -r t; do
  [[ -z "$t" ]] && continue
  [[ "$t" =~ ^[a-z_][a-z0-9_]*$ ]] || die "Nombre de tabla inesperado en el dump: '$t'"
  if ! HAS_ROWS="$(psql_q "SELECT EXISTS (SELECT 1 FROM public.\"$t\");" 2>&1)"; then
    die "La tabla '$t' del dump no existe en el esquema migrado (deriva dump vs baseline). Detalle: $HAS_ROWS"
  fi
  HAS_ROWS="$(echo "$HAS_ROWS" | tr -d '[:space:]')"
  [[ "$HAS_ROWS" == "t" ]] && NONEMPTY="${NONEMPTY:+$NONEMPTY, }$t"
done <<< "$LOAD_TABLES"
if [[ -n "$NONEMPTY" ]]; then
  echo "✗  Hay datos en: $NONEMPTY"
  echo "   Esta carga solo corre sobre tablas vacías. No se modificó nada."
  exit 1
fi
echo "✓  Esquema compatible por nombre de tabla y todas vacías"

# 6. Confirmación explícita
echo ""
echo "  ⚠️  Se cargarán los datos del seed (incluye PII) en producción, en una sola transacción."
echo "  Base: $DB_NAME  |  Contenedor: $CONTAINER"
echo ""
read -rp "  ¿Confirmar carga de datos? Escribí 'SI' en mayúsculas para continuar: " CONFIRM
if [[ "$CONFIRM" != "SI" ]]; then
  echo ""
  echo "  Cancelado."
  exit 0
fi

# 7. Backup previo verificado (patrón DEP-01). El esquema migrado siempre tiene tablas, así que se
#    respalda siempre: es el punto de retorno si la carga o lo posterior sale mal. Cualquier fallo
#    aborta ANTES de cargar. Límite: respaldo local sin cifrar (DEP-08); backups/ no se versiona.
echo ""
echo "→ Generando backup previo..."
mkdir -p backups
chmod 700 backups
BACKUP_FILE="backups/pre-restore-data-$(date -u +%Y%m%dT%H%M%SZ).dump"
(umask 077; : > "$BACKUP_FILE")
chmod 600 "$BACKUP_FILE"
if ! docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc > "$BACKUP_FILE"; then
  rm -f "$BACKUP_FILE"
  die "pg_dump falló. No se carga nada. Abortando."
fi
[[ -s "$BACKUP_FILE" ]] || die "El backup $BACKUP_FILE está vacío. No se carga nada. Abortando."
if ! docker exec -i "$CONTAINER" pg_restore --list < "$BACKUP_FILE" > /dev/null; then
  die "El backup $BACKUP_FILE no es legible (pg_restore --list falló). No se carga nada. Abortando."
fi
echo "✓  Backup verificado: $BACKUP_FILE"

# 8. Carga solo de datos, atómica. Sin --disable-triggers a propósito: omitiría las FK y un dump
#    incompatible quedaría cargado en silencio. Si el orden/FK/enums no encajan, falla y revierte.
echo ""
echo "→ Cargando datos (una transacción; puede tardar 1-2 minutos)..."
docker cp "$LIST_FILE" "$CONTAINER:$REMOTE_LIST" > /dev/null
if ! docker exec -i "$CONTAINER" pg_restore \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --data-only \
  --single-transaction \
  --exit-on-error \
  --no-owner \
  --no-acl \
  -L "$REMOTE_LIST" \
  < "$SEED_DUMP"; then
  echo "✗  pg_restore falló. La transacción se revirtió: no quedaron datos parciales."
  echo "   Posible incompatibilidad dump/esquema (hipótesis DEP-07). Backup previo: $BACKUP_FILE"
  exit 1
fi
echo "✓  Datos cargados"

# 9. Secuencias: se restauran con SEQUENCE SET del dump; esto es la red de seguridad. Para cada
#    columna serial, si last_value < max(col) (o igual sin is_called) se corrige con setval y luego
#    se COMPRUEBA; si aún queda atrasada, se aborta (un INSERT futuro chocaría con un id existente).
echo ""
echo "→ Verificando secuencias..."
if ! docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -q -v ON_ERROR_STOP=1 -f - <<'SQL'
DO $$
DECLARE
  r record;
  mx bigint;
  lv bigint;
  called boolean;
BEGIN
  FOR r IN
    SELECT c.table_name AS t, c.column_name AS col,
           pg_get_serial_sequence(format('%I.%I', c.table_schema, c.table_name), c.column_name) AS seq
    FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.column_default LIKE 'nextval(%'
  LOOP
    CONTINUE WHEN r.seq IS NULL;
    EXECUTE format('SELECT COALESCE(MAX(%I), 0) FROM public.%I', r.col, r.t) INTO mx;
    CONTINUE WHEN mx = 0;
    EXECUTE format('SELECT last_value, is_called FROM %s', r.seq) INTO lv, called;
    IF lv < mx OR (lv = mx AND NOT called) THEN
      PERFORM setval(r.seq, mx, true);
      EXECUTE format('SELECT last_value, is_called FROM %s', r.seq) INTO lv, called;
      IF lv < mx OR NOT called THEN
        RAISE EXCEPTION 'secuencia % sigue atrasada (last_value=%, max=%)', r.seq, lv, mx;
      END IF;
    END IF;
  END LOOP;
END $$;
SQL
then
  die "La verificación de secuencias falló. Revisá el esquema; backup previo: $BACKUP_FILE"
fi
echo "✓  Secuencias coherentes con los datos"

# 10. Verificaciones finales (C-5): payload_migrations conserva solo lo creado por migrate
DEV_AFTER=$(psql_q "SELECT COUNT(*) FROM payload_migrations WHERE batch = -1;" | tr -d '[:space:]')
[[ "$DEV_AFTER" == "0" ]] || die "payload_migrations quedó con filas batch = -1 tras la carga (no debería: está excluida)."
NOTICIA_COUNT=$(psql_q "SELECT COUNT(*) FROM noticias;" 2>/dev/null || echo "?")

echo ""
echo "============================================"
echo "  ✅ Datos cargados en producción"
echo "============================================"
echo "  Noticias: $(echo "$NOTICIA_COUNT" | tr -d '[:space:]')"
echo "  Backup previo: $BACKUP_FILE"
echo ""
echo "  Siguiente paso: levantar el stack (up -d) y verificar el portal."
echo "============================================"
