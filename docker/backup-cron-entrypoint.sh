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

# Snapshot del almacén S3 (SeaweedFS), instantánea en caliente de /data (ver scripts/backup/backup.sh)
docker exec unc-s3-local sh -c "tar -czf - -C / data" > "$BACKUP_PATH/media-snapshot.tar.gz" 2>&1 || echo "Error en S3 backup"

# BACKUP-MEDIA-01: media del CMS (volumen unc_cms_media_prod) cifrada + copia externa opcional.
# Qué hace: si el contenedor tiene montado el repo en /scripts/backup (opcional) y la frase de paso está
# configurada, ejecuta backup-prod.sh (BD cifrada + media cifrada + offsite-push.sh). Por qué: este cron mensual
# del contenedor no cubría la media local. Límite: sin /scripts/backup o sin BACKUP_ENCRYPTION_PASSPHRASE solo avisa;
# el trabajo diario de producción es el crontab del host (scripts/backup/crontab.example).
if [ -x /scripts/backup/backup-prod.sh ] || [ -f /scripts/backup/backup-prod.sh ]; then
  bash /scripts/backup/backup-prod.sh 2>&1 || echo "AVISO: backup-prod.sh terminó con error (revise BACKUP_ENCRYPTION_PASSPHRASE / BACKUP_REMOTE)"
else
  echo "AVISO: scripts/backup no está montado en /scripts/backup: media del CMS y copia externa NO respaldadas por este cron"
fi

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
