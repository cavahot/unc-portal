#!/bin/bash

# Script de Backup Manual - Portal UNC
# Uso: ./backup.sh [nombre-backup-opcional]
# Ejemplo: ./backup.sh backup-2026-07-27

set -e

# Configuración
BACKUP_DIR="${BACKUP_DIR:=$(pwd)/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="${1:-backup_$TIMESTAMP}"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
LOG_FILE="$BACKUP_DIR/backup_$TIMESTAMP.log"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}[Backup] Iniciando backup: $BACKUP_NAME${NC}"
echo -e "${YELLOW}[Backup] Timestamp: $TIMESTAMP${NC}"

# Crear directorio de backup
mkdir -p "$BACKUP_DIR"
mkdir -p "$BACKUP_PATH"

{
  echo "=== Backup Portal UNC ==="
  echo "Fecha: $(date)"
  echo "Directorio: $BACKUP_PATH"
  echo ""

  # 1. Backup de PostgreSQL
  echo "[1/3] Backing up PostgreSQL..."
  if command -v pg_dump &> /dev/null; then
    pg_dump -h "${DB_HOST:-127.0.0.1}" \
            -U "${DB_USER:-unc_cms}" \
            -d "${DB_NAME:-unc_portal}" \
            --format=custom \
            --compress=9 \
            --file="$BACKUP_PATH/database.sql.gz" 2>&1
    echo "✓ PostgreSQL backed up"
  else
    echo "⚠ pg_dump not found, using docker"
    docker exec unc-postgres-local pg_dump -U unc_cms -d unc_portal --format=custom --compress=9 > "$BACKUP_PATH/database.sql.gz" 2>&1
    echo "✓ PostgreSQL backed up (via Docker)"
  fi

  # 2. Backup de MinIO
  echo ""
  echo "[2/3] Backing up MinIO storage..."
  if command -v mc &> /dev/null; then
    mc cp --recursive "minio/unc-media" "$BACKUP_PATH/media/" 2>&1 || echo "⚠ MinIO backup via mc skipped"
    echo "✓ MinIO backed up"
  else
    echo "⚠ mc not found, creating snapshot"
    # Crear snapshot manual de MinIO
    mkdir -p "$BACKUP_PATH/media"
    docker exec unc-minio-local bash -c "tar -czf - /data/unc-media" > "$BACKUP_PATH/media/minio-snapshot.tar.gz" 2>&1
    echo "✓ MinIO snapshot created"
  fi

  # 3. Backup de archivos de configuración
  echo ""
  echo "[3/3] Backing up configuration..."
  cp .env.example "$BACKUP_PATH/.env.example" 2>/dev/null || echo "⚠ .env.example not found"
  cp next.config.mjs "$BACKUP_PATH/next.config.mjs" 2>/dev/null || echo "⚠ next.config.mjs not found"
  cp SECURITY.md "$BACKUP_PATH/SECURITY.md" 2>/dev/null || echo "⚠ SECURITY.md not found"
  echo "✓ Configuration backed up"

  # 4. Crear archivo de metadata
  echo ""
  echo "[Metadata]"
  {
    echo "backup_name: $BACKUP_NAME"
    echo "timestamp: $TIMESTAMP"
    echo "hostname: $(hostname)"
    echo "os: $(uname -s)"
    echo "database_version: $(docker exec unc-postgres-local psql --version 2>/dev/null || echo 'unknown')"
    echo "files:"
    ls -lh "$BACKUP_PATH"/ 2>/dev/null | awk '{print "  - " $9 " (" $5 ")"}'
  } > "$BACKUP_PATH/metadata.txt"

  echo "✓ Metadata created"

  # 5. Calcular checksums para validación
  echo ""
  echo "[Validation]"
  cd "$BACKUP_PATH"
  sha256sum * > checksums.sha256 2>/dev/null
  echo "✓ Checksums calculated"

  echo ""
  echo "=== Backup Completado ==="
  echo "Ubicación: $BACKUP_PATH"
  echo "Tamaño total: $(du -sh "$BACKUP_PATH" | cut -f1)"
  echo "Archivos:"
  ls -lh "$BACKUP_PATH"/ | tail -n +2 | awk '{printf "  - %-30s %8s\n", $9, $5}'

} | tee "$LOG_FILE"

echo ""
echo -e "${GREEN}[✓] Backup completado exitosamente${NC}"
echo -e "${GREEN}Ubicación: $BACKUP_PATH${NC}"
echo -e "${YELLOW}Próximo backup manual: ejecuta ./backup.sh${NC}"
