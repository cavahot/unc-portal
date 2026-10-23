#!/usr/bin/env bash
# =============================================================
# restore-db-prod.sh — Restaura el seed en PostgreSQL de producción
# =============================================================
# Uso:
#   bash scripts/setup/restore-db-prod.sh
#
# Diferencias con restore-db.sh (dev):
#   - Usa el contenedor unc-postgres-prod (no unc-postgres-local)
#   - Lee las credenciales desde infrastructure/docker/.env.prod
#   - Incluye confirmación explícita antes de borrar datos existentes
#
# ⚠️  DEPRECADO para el primer deploy (DEP-07, vía C): este script trae el ESQUEMA del dump (dev),
#     no el de las migraciones versionadas. Usar: migrate (cms-migrate) y luego
#     `bash scripts/setup/restore-data-prod.sh` (solo datos, sobre tablas vacías).
#     Se conserva únicamente como recuperación manual de un estado completo conocido.
# ⚠️  DESTRUCTIVO: borra y recrea el esquema public de la base de datos.
#     Usarlo solo en el primer deploy o para restaurar un estado conocido.
# =============================================================
set -euo pipefail

CONTAINER="unc-postgres-prod"
SEED_GZ="setup/seed.dump.gz"
SEED_DUMP="setup/seed.dump"
ENV_FILE="infrastructure/docker/.env.prod"

echo "============================================"
echo "  Restauración de BD Producción — UNC"
echo "============================================"
echo ""

# 1. Leer credenciales del env de producción
if [[ ! -f "$ENV_FILE" ]]; then
  echo "✗  No se encontró $ENV_FILE"
  exit 1
fi

# DEP-01: 'tr -d CR' evita que un .env.prod con fin de línea CRLF filtre CR al usuario/BD
# (si no, pg_isready/psql recibirían 'usuario' con CR y fallarían de forma confusa).
DB_NAME=$(grep -E '^POSTGRES_DB=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r' | tr -d '"' | tr -d "'")
DB_USER=$(grep -E '^POSTGRES_USER=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r' | tr -d '"' | tr -d "'")

DB_NAME="${DB_NAME:-unc_portal}"
DB_USER="${DB_USER:-unc_cms}"

# 2. Confirmación explícita
echo "  ⚠️  Este comando borrará TODOS los datos actuales en producción"
echo "  Base: $DB_NAME  |  Contenedor: $CONTAINER"
echo ""
read -rp "  ¿Confirmar restauración? Escribí 'SI' en mayúsculas para continuar: " CONFIRM
if [[ "$CONFIRM" != "SI" ]]; then
  echo ""
  echo "  Cancelado."
  exit 0
fi
echo ""

# 3. Verificar contenedor
echo "→ Verificando contenedor PostgreSQL..."
# DEP-01: se captura la salida y luego se compara; 'docker ps | grep -q' con pipefail puede
# fallar por SIGPIPE cuando grep -q cierra la tubería antes de que docker termine de escribir.
RUNNING_CONTAINERS="$(docker ps --format '{{.Names}}')"
if ! grep -qx "$CONTAINER" <<< "$RUNNING_CONTAINERS"; then
  echo "✗  El contenedor $CONTAINER no está corriendo."
  echo "   Levantá el stack: docker compose -f infrastructure/docker/compose.prod.yaml up -d"
  exit 1
fi
echo "✓  Contenedor activo"

# 4. Obtener el dump
echo ""
echo "→ Buscando archivo seed..."
if [[ -f "$SEED_GZ" ]]; then
  echo "✓  Encontrado: $SEED_GZ ($(du -sh "$SEED_GZ" | cut -f1))"
  gunzip -fk "$SEED_GZ"
  # DEP-01 (MEDIO-2): el dump descomprimido contiene datos de producción; se borra al salir
  # por cualquier camino (éxito, set -e, exit explícito). Límite: no cubre SIGKILL.
  trap 'rm -f "$SEED_DUMP"' EXIT
else
  echo "✗  No se encontró $SEED_GZ"
  echo "   El archivo debe estar en el repositorio."
  exit 1
fi

# 5. Esperar PostgreSQL
echo ""
echo "→ Esperando que PostgreSQL esté listo..."
for i in $(seq 1 15); do
  if docker exec "$CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" -q 2>/dev/null; then
    echo "✓  PostgreSQL listo"
    break
  fi
  [[ $i -eq 15 ]] && echo "✗  PostgreSQL no respondió. Abortando." && exit 1
  sleep 2
done

# 5b. Backup previo obligatorio si la BD tiene datos (DEP-01)
# Qué hace: cuenta las tablas del esquema public; si hay alguna, genera un pg_dump -Fc
#   en el host (backups/pre-restore-<UTC>.dump) y lo verifica (no vacío + pg_restore --list).
# Amenaza que evita: perder datos de producción por un DROP SCHEMA sin respaldo
#   (hallazgo C1, RDD-DEP-01). Cualquier fallo aborta ANTES del DROP.
# Límite: es un respaldo local en el mismo host; NO sustituye un backup cifrado
#   fuera del servidor (DEP-08). backups/ puede contener PII y no se versiona.
echo ""
echo "→ Comprobando si la base tiene datos..."
TABLE_COUNT=$(docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc   "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';")
TABLE_COUNT="$(echo "$TABLE_COUNT" | tr -d '[:space:]')"
if [[ ! "$TABLE_COUNT" =~ ^[0-9]+$ ]]; then
  echo "✗  No se pudo contar las tablas (respuesta: '$TABLE_COUNT'). Abortando antes de borrar."
  exit 1
fi

if [[ "$TABLE_COUNT" -gt 0 ]]; then
  echo "  La base tiene $TABLE_COUNT tablas. Generando backup previo..."
  # DEP-01 (MEDIO-1): el dump contiene PII. umask 077 antes de crear carpeta y archivo, y chmod
  # explícito por si backups/ ya existía con permisos amplios. Límite: en NTFS/Git Bash chmod
  # no aplica ACLs reales; el control efectivo es el de un host Linux.
  umask 077
  mkdir -p backups
  chmod 700 backups
  BACKUP_FILE="backups/pre-restore-$(date -u +%Y%m%dT%H%M%SZ).dump"
  (umask 077; : > "$BACKUP_FILE")
  chmod 600 "$BACKUP_FILE"

  if ! docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc > "$BACKUP_FILE"; then
    rm -f "$BACKUP_FILE"
    echo "✗  pg_dump falló. No se borra nada. Abortando."
    exit 1
  fi
  if [[ ! -s "$BACKUP_FILE" ]]; then
    echo "✗  El backup $BACKUP_FILE está vacío. No se borra nada. Abortando."
    exit 1
  fi
  if ! docker exec -i "$CONTAINER" pg_restore --list < "$BACKUP_FILE" > /dev/null; then
    echo "✗  El backup $BACKUP_FILE no es legible (pg_restore --list falló). No se borra nada. Abortando."
    exit 1
  fi
  echo "✓  Backup verificado: $BACKUP_FILE"
  echo "   Guardalo fuera del servidor si necesitás conservarlo (contiene datos de producción)."
else
  echo "✓  Base vacía (0 tablas en public): no se requiere backup"
fi

# 6. Limpiar esquema
# Sin '|| true' ni silenciar errores: si el DROP falla, set -e aborta y no se restaura (DEP-01).
# ON_ERROR_STOP hace que psql devuelva exit != 0 ante un error SQL.
echo ""
echo "→ Limpiando esquema existente..."
docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -q -v ON_ERROR_STOP=1   -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
echo "✓  Esquema limpio"

# 7. Restaurar
echo ""
echo "→ Restaurando datos (puede tardar 1-2 minutos)..."
docker exec -i "$CONTAINER" pg_restore \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-acl \
  --single-transaction \
  < "$SEED_DUMP"

# 8. Verificar
NOTICIA_COUNT=$(docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" \
  -tAc "SELECT COUNT(*) FROM noticias;" 2>/dev/null || echo "?")

echo ""
echo "============================================"
echo "  ✅ BD de producción restaurada"
echo "============================================"
echo "  Noticias: $NOTICIA_COUNT"
echo ""
echo "  Verificá el portal: https://portal.unc.edu.py"
echo "============================================"

# El trap EXIT elimina setup/seed.dump; este rm queda como limpieza explícita en el camino feliz.
rm -f "$SEED_DUMP"
