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

DB_NAME=$(grep -E '^POSTGRES_DB=' "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'")
DB_USER=$(grep -E '^POSTGRES_USER=' "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'")

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
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
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

# 6. Limpiar esquema
echo ""
echo "→ Limpiando esquema existente..."
docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -q \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" 2>/dev/null || true
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

rm -f "$SEED_DUMP"
