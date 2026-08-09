#!/usr/bin/env bash
# =============================================================
# restore-db.sh — Restaura el seed de BD para desarrollo local
# =============================================================
# Uso:
#   bash scripts/setup/restore-db.sh
#   bash scripts/setup/restore-db.sh --url <url-del-dump>
#
# El script busca el dump en este orden:
#   1. setup/seed.dump.gz  (incluido en el repo)
#   2. --url <url>         (descarga desde GitHub Release)
# =============================================================
set -euo pipefail

CONTAINER="unc-postgres-local"
DB_NAME="unc_portal"
DB_USER="unc_cms"
SEED_GZ="setup/seed.dump.gz"
SEED_DUMP="setup/seed.dump"
RELEASE_URL="${SEED_RELEASE_URL:-}"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --url) RELEASE_URL="$2"; shift 2 ;;
    *) echo "Argumento desconocido: $1"; exit 1 ;;
  esac
done

echo "======================================"
echo "  Restauración de BD — Portal UNC"
echo "======================================"

# 1. Verificar que la infra esté corriendo
echo ""
echo "→ Verificando infraestructura..."
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "✗  El contenedor $CONTAINER no está corriendo."
  echo "   Ejecutá primero: npm run infra:up"
  exit 1
fi
echo "✓  Contenedor $CONTAINER activo"

# 2. Obtener el dump
echo ""
echo "→ Buscando archivo seed..."

if [[ -f "$SEED_GZ" ]]; then
  echo "✓  Encontrado: $SEED_GZ ($(du -sh $SEED_GZ | cut -f1))"
  echo "   Descomprimiendo..."
  gunzip -fk "$SEED_GZ"

elif [[ -n "$RELEASE_URL" ]]; then
  echo "   Descargando desde: $RELEASE_URL"
  mkdir -p setup
  curl -L --progress-bar "$RELEASE_URL" -o "$SEED_GZ"
  echo "✓  Descargado: $SEED_GZ ($(du -sh $SEED_GZ | cut -f1))"
  gunzip -fk "$SEED_GZ"

else
  echo ""
  echo "✗  No se encontró el archivo seed."
  echo ""
  echo "   Opciones:"
  echo "   A) Si tenés acceso al repositorio con Git LFS:"
  echo "      git lfs pull"
  echo ""
  echo "   B) Descargar manualmente y re-ejecutar:"
  echo "      bash scripts/setup/restore-db.sh --url <url-del-dump>"
  echo ""
  echo "   C) Pedirle el archivo seed al equipo y colocarlo en setup/seed.dump.gz"
  exit 1
fi

# 3. Verificar el dump
if [[ ! -f "$SEED_DUMP" ]]; then
  echo "✗  No se pudo obtener el archivo dump descomprimido."
  exit 1
fi

DUMP_SIZE=$(du -sh "$SEED_DUMP" | cut -f1)
echo "✓  Dump listo: $SEED_DUMP ($DUMP_SIZE)"

# 4. Esperar que PostgreSQL esté ready
echo ""
echo "→ Esperando que PostgreSQL esté listo..."
for i in $(seq 1 15); do
  if docker exec "$CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" -q 2>/dev/null; then
    echo "✓  PostgreSQL listo"
    break
  fi
  if [[ $i -eq 15 ]]; then
    echo "✗  PostgreSQL no respondió en 15 intentos. Abortando."
    exit 1
  fi
  echo "   Intento $i/15..."
  sleep 2
done

# 5. Limpiar la BD antes de restaurar (para evitar conflictos)
echo ""
echo "→ Limpiando esquema existente..."
docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -q \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" 2>/dev/null || true
echo "✓  Esquema limpio"

# 6. Restaurar
echo ""
echo "→ Restaurando datos (esto puede tardar 30-60 segundos)..."
docker exec -i "$CONTAINER" pg_restore \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-acl \
  --single-transaction \
  < "$SEED_DUMP"

echo ""
echo "✓  Restauración completa"

# 7. Verificar
NOTICIA_COUNT=$(docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" \
  -tAc "SELECT COUNT(*) FROM noticias;" 2>/dev/null || echo "?")

echo ""
echo "======================================"
echo "  ✅ BD restaurada exitosamente"
echo "======================================"
echo "  Noticias: $NOTICIA_COUNT"
echo ""
echo "  Próximo paso: npm run dev:all"
echo "======================================"

# Limpiar el dump sin comprimir
rm -f "$SEED_DUMP"
