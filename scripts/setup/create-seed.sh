#!/usr/bin/env bash
# =============================================================
# create-seed.sh — Exporta la BD local como seed para el repo
# =============================================================
# Uso:
#   bash scripts/setup/create-seed.sh
#
# Requisitos:
#   - Docker corriendo con el contenedor unc-postgres-local
#   - infra levantada (npm run infra:up)
#
# Resultado:
#   setup/seed.dump.gz  (~2-8 MB comprimido)
# =============================================================
set -euo pipefail

CONTAINER="unc-postgres-local"
DB_NAME="unc_portal"
DB_USER="unc_cms"
OUT_DIR="setup"
OUT_FILE="$OUT_DIR/seed.dump"

echo "→ Verificando que el contenedor esté corriendo..."
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "✗  El contenedor $CONTAINER no está corriendo."
  echo "   Ejecutá: npm run infra:up"
  exit 1
fi

mkdir -p "$OUT_DIR"

echo "→ Exportando base de datos $DB_NAME..."
docker exec "$CONTAINER" pg_dump \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-acl \
  > "$OUT_FILE"

SIZE=$(du -sh "$OUT_FILE" | cut -f1)
echo "✓  Dump generado: $OUT_FILE ($SIZE)"

# Comprimir adicionalmente con gzip para el repo
gzip -f "$OUT_FILE"
FINAL="${OUT_FILE}.gz"
FSIZE=$(du -sh "$FINAL" | cut -f1)
echo "✓  Comprimido:    $FINAL ($FSIZE)"

echo ""
echo "Próximos pasos:"
echo "  1. Subir al GitHub Release:"
echo "     gh release create v0.1-datos-iniciales $FINAL \\"
echo "       --title 'Datos iniciales de producción' \\"
echo "       --notes 'Seed con $(date +%Y-%m-%d) — $(docker exec $CONTAINER psql -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM noticias" 2>/dev/null || echo "N") noticias'"
echo ""
echo "  2. O commitear directamente (si el archivo es < 50MB):"
echo "     git add $FINAL && git commit -m 'chore(setup): add initial seed data'"
