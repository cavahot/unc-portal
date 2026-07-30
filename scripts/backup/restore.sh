#!/bin/bash

# Script de Restauración - Portal UNC
# Uso: ./restore.sh <ruta-backup>
# Ejemplo: ./restore.sh ./backups/backup_20260727_150000

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ -z "$1" ]; then
  echo -e "${RED}Error: Especifica la ruta del backup${NC}"
  echo "Uso: ./restore.sh <ruta-backup>"
  echo "Ejemplo: ./restore.sh ./backups/backup_20260727_150000"
  exit 1
fi

BACKUP_PATH="$1"

if [ ! -d "$BACKUP_PATH" ]; then
  echo -e "${RED}Error: Directorio de backup no encontrado: $BACKUP_PATH${NC}"
  exit 1
fi

echo -e "${YELLOW}[Restaurar] Iniciando restauración desde: $BACKUP_PATH${NC}"

# Validar checksums
echo ""
echo "[1/3] Validando integridad de archivos..."
if [ -f "$BACKUP_PATH/checksums.sha256" ]; then
  cd "$BACKUP_PATH"
  if sha256sum -c checksums.sha256 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Checksums válidos${NC}"
  else
    echo -e "${RED}✗ Checksums inválidos - Backup corrupto${NC}"
    exit 1
  fi
else
  echo -e "${YELLOW}⚠ checksums.sha256 no encontrado, continuando sin validación${NC}"
fi

# Restaurar PostgreSQL
echo ""
echo "[2/3] Restaurando base de datos..."
if [ -f "$BACKUP_PATH/database.sql.gz" ]; then
  # Confirmación de seguridad
  echo -e "${RED}⚠ ADVERTENCIA: Esto sobrescribirá la base de datos actual${NC}"
  read -p "¿Estás seguro? (escribe 'SI' para confirmar): " confirm

  if [ "$confirm" != "SI" ]; then
    echo "Restauración cancelada"
    exit 0
  fi

  echo "Restaurando desde database.sql.gz..."
  gunzip < "$BACKUP_PATH/database.sql.gz" | \
    docker exec -i unc-postgres-local psql -U unc_cms -d unc_portal 2>&1

  echo -e "${GREEN}✓ Base de datos restaurada${NC}"
else
  echo -e "${RED}Error: database.sql.gz no encontrado${NC}"
  exit 1
fi

# Restaurar MinIO
echo ""
echo "[3/3] Restaurando almacenamiento..."
if [ -f "$BACKUP_PATH/media/minio-snapshot.tar.gz" ]; then
  echo "Restaurando MinIO desde snapshot..."
  docker exec unc-minio-local bash -c "tar -xzf - -C /data" < "$BACKUP_PATH/media/minio-snapshot.tar.gz" 2>&1
  echo -e "${GREEN}✓ Almacenamiento restaurado${NC}"
else
  echo -e "${YELLOW}⚠ MinIO snapshot no encontrado, omitiendo${NC}"
fi

echo ""
echo -e "${GREEN}[✓] Restauración completada${NC}"
echo ""
echo "Próximos pasos:"
echo "1. Verifica que el sistema funcione correctamente"
echo "2. Revisa los logs: tail -f logs/app.log"
echo "3. Accede al portal: http://localhost:3000"
echo ""
