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

# Restaurar el almacén S3 (SeaweedFS). Los snapshots antiguos de MinIO (minio-snapshot.tar.gz) NO son
# compatibles: el formato de volumen es distinto; si existen, restaurarlos con `aws s3 sync` hacia un MinIO
# temporal o recuperar los objetos por otra vía. Amenaza: extraer archivos de volumen con el servidor encendido
# corrompe el almacén, por eso se detiene el contenedor antes y se arranca después. Límite: restaura la
# instantánea completa de /data (sobrescribe lo actual).
echo ""
echo "[3/3] Restaurando almacenamiento..."
if [ -f "$BACKUP_PATH/media/s3-snapshot.tar.gz" ]; then
  echo "Restaurando S3 (SeaweedFS) desde snapshot..."
  S3_IMAGE="$(docker inspect -f '{{.Config.Image}}' unc-s3-local)"
  docker stop unc-s3-local
  docker run --rm -i --volumes-from unc-s3-local --entrypoint tar "$S3_IMAGE" -xzf - -C / < "$BACKUP_PATH/media/s3-snapshot.tar.gz" 2>&1
  docker start unc-s3-local
  echo -e "${GREEN}✓ Almacenamiento restaurado${NC}"
else
  echo -e "${YELLOW}⚠ S3 snapshot no encontrado, omitiendo${NC}"
fi

# BACKUP-MEDIA-01: este script restaura el formato LEGADO (carpeta backup_*/ con database.sql.gz). Los respaldos
# cifrados de producción (db-*.dump.gpg y media-*.tar.gz.gpg) se restauran con el procedimiento de
# docs/BACKUP_RECOVERY.md (BD con pg_restore y, DESPUÉS, la media con scripts/backup/restore-media.sh, que
# verifica sha256, descifra, extrae en /app/media del CMS y corrige el dueño a 1001:1001). Restaurar solo la BD
# deja filas `media` sin archivo.
echo ""
echo -e "${GREEN}[✓] Restauración completada${NC}"
echo ""
echo "Próximos pasos:"
echo "1. Verifica que el sistema funcione correctamente"
echo "2. Revisa los logs: tail -f logs/app.log"
echo "3. Accede al portal: http://localhost:3000"
echo ""
