#!/bin/bash

# Entrypoint para servicio de backup automático en Docker
# Ejecuta backup el 1ro de cada mes a las 02:00 AM

echo "Iniciando servicio de backup automático..."

# Crear directorio de backups si no existe
mkdir -p /backups

# Crear script ejecutable de backup
cat > /backup-monthly.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="backup_monthly_$TIMESTAMP"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

mkdir -p "$BACKUP_PATH"

echo "[$(date)] Iniciando backup automático mensual..."

# PostgreSQL backup
pg_dump -h postgres -U unc_cms -d unc_portal --format=custom --compress=9 \
  --file="$BACKUP_PATH/database.sql.gz" 2>&1 || echo "Error en PostgreSQL backup"

# MinIO snapshot
docker exec unc-minio-local bash -c "tar -czf - /data/unc-media" > "$BACKUP_PATH/media-snapshot.tar.gz" 2>&1 || echo "Error en MinIO backup"

# Metadata
echo "backup_type: monthly_automated" > "$BACKUP_PATH/metadata.txt"
echo "timestamp: $TIMESTAMP" >> "$BACKUP_PATH/metadata.txt"
echo "size: $(du -sh "$BACKUP_PATH" | cut -f1)" >> "$BACKUP_PATH/metadata.txt"

# Checksums
cd "$BACKUP_PATH"
sha256sum * > checksums.sha256 2>/dev/null

# Limpieza: mantener solo últimos 3 backups mensuales
echo "[$(date)] Limpiando backups antiguos..."
ls -t "$BACKUP_DIR"/backup_monthly_* -d 2>/dev/null | tail -n +4 | xargs -r rm -rf

echo "[$(date)] Backup automático completado: $BACKUP_PATH"
EOF

chmod +x /backup-monthly.sh

# Configurar cron para ejecutar el 1ro de cada mes a las 02:00
echo "0 2 1 * * /backup-monthly.sh >> /var/log/backup.log 2>&1" > /etc/cron.d/backup-monthly

# Ejecutar cron en foreground
exec crond -f -l 2
