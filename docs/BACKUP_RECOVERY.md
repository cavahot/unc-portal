# Backup y Recuperación - Portal UNC

## 📋 Resumen

Sistema de backup flexible que permite:
- ✅ **Backups manuales**: Usuario ejecuta cuando quiera
- ✅ **Backup automático**: 1 vez al mes (01:00 AM, 1ro de cada mes)
- ✅ **Validación**: Checksums SHA256 de integridad
- ✅ **Restauración**: Procedimiento documentado

## 🗂️ Contenido de Backup

Cada backup incluye:

```
backup_YYYYMMDD_HHMMSS/
├── database.sql.gz              # PostgreSQL completa (comprimida)
├── media-snapshot.tar.gz        # MinIO S3 snapshot
├── metadata.txt                 # Información del backup
├── checksums.sha256             # Validación de integridad
├── .env.example                 # Configuración de referencia
├── next.config.mjs              # Configuración del portal
└── SECURITY.md                  # Políticas de seguridad
```

## 🚀 Backup Manual

### Ejecutar manualmente (cualquier momento):

```bash
# Ir al directorio del proyecto
cd /path/to/unc-portal

# Ejecutar backup (crea directorio con timestamp)
./scripts/backup/backup.sh

# Backup con nombre personalizado
./scripts/backup/backup.sh "backup-produccion-2026-07-27"
```

**Salida esperada:**
```
[Backup] Iniciando backup: backup_20260727_150000
[1/3] Backing up PostgreSQL...
✓ PostgreSQL backed up
[2/3] Backing up MinIO storage...
✓ MinIO backed up
[3/3] Backing up configuration...
✓ Configuration backed up
[✓] Backup completado exitosamente
Ubicación: ./backups/backup_20260727_150000
```

## ⏰ Backup Automático (Mensual)

### Configuración:

- **Frecuencia**: Mensual (1ro de cada mes)
- **Hora**: 02:00 AM
- **Ubicación**: `/backups/backup_monthly_*`
- **Retención**: Últimos 3 backups mensuales

### Verificar que está configurado:

```bash
# Ver cron jobs activos
docker exec unc-backup-cron crontab -l

# Ver logs de backup
docker logs unc-backup-cron
```

## 🔄 Restauración de Backup

### Procedimiento paso a paso:

**1. Selecciona el backup:**
```bash
# Listar backups disponibles
ls -la ./backups/

# Elegir uno:
# ./backups/backup_20260727_150000
# ./backups/backup_monthly_20260601_020000
```

**2. Ejecutar restauración:**
```bash
./scripts/backup/restore.sh ./backups/backup_20260727_150000
```

**3. Confirmar acción:**
```
⚠ ADVERTENCIA: Esto sobrescribirá la base de datos actual
¿Estás seguro? (escribe 'SI' para confirmar): SI
```

**4. Esperar a que complete:**
```
[1/3] Validando integridad de archivos...
✓ Checksums válidos
[2/3] Restaurando base de datos...
✓ Base de datos restaurada
[3/3] Restaurando almacenamiento...
✓ Almacenamiento restaurado
[✓] Restauración completada
```

**5. Verificar integridad:**
```bash
# Acceder al portal
http://localhost:3000

# Verificar CMS
http://localhost:3002

# Ver logs si hay errores
docker logs unc-portal
docker logs unc-cms
```

## 🛡️ Validación de Integridad

### Checksums automáticos:

Cada backup genera `checksums.sha256`:
```bash
# Validar backup manualmente
cd ./backups/backup_20260727_150000
sha256sum -c checksums.sha256
```

**Salida esperada:**
```
database.sql.gz: OK
media-snapshot.tar.gz: OK
metadata.txt: OK
.env.example: OK
checksums.sha256: OK
```

## 📊 Políticas de Retención

| Tipo | Frecuencia | Retención |
|------|-----------|-----------|
| Manual | A demanda | Indefinida |
| Automático | 1x/mes | 3 últimos (∼ 3 meses) |
| Total | - | Máx. 500GB recomendado |

**Limpiar backups antiguos:**
```bash
# Listar por antigüedad
ls -lt ./backups/ | head -20

# Eliminar backup específico
rm -rf ./backups/backup_20260701_150000

# Eliminar todo excepto últimos 5
ls -1d backups/* | sort -r | tail -n +6 | xargs rm -rf
```

## 🚨 Recuperación de Emergencia

### Scenario 1: Base de datos corrupta

```bash
# 1. Restaurar desde backup más reciente
./scripts/backup/restore.sh ./backups/backup_monthly_20260601_020000

# 2. Verificar que el portal arranca
npm run dev:all

# 3. Revisar logs de auditoría
curl http://localhost:3002/api/auditoria?limit=10
```

### Scenario 2: Pérdida de archivos (MinIO)

```bash
# El backup restaura automáticamente MinIO
# Solo restaurar la parte de almacenamiento:

# Copiar snapshot de media
tar -xzf ./backups/backup_20260727_150000/media-snapshot.tar.gz \
  -C docker/

# Reiniciar MinIO
docker-compose restart unc-minio-local
```

### Scenario 3: Corrupción completa

```bash
# Restauración total desde 0
./scripts/backup/restore.sh ./backups/backup_monthly_20260601_020000

# Reiniciar todo
docker-compose down
docker-compose up -d

# Verificar servicios
docker ps
```

## 📈 Monitoreo de Backup

### Verificar último backup:

```bash
# Tamaño y fecha del último backup
ls -lh ./backups/ | tail -1

# Contenido del último backup
ls -lh ./backups/$(ls -t ./backups | head -1)/
```

### Alertas (implementar):

```bash
# Script para verificar backups diarios
# Ejecutar cada día a las 03:00 AM

#!/bin/bash
LAST_BACKUP=$(stat -c %Y ./backups/$(ls -t ./backups | head -1))
NOW=$(date +%s)
DAYS_AGO=$(( (NOW - LAST_BACKUP) / 86400 ))

if [ $DAYS_AGO -gt 35 ]; then
  # Enviar alerta: "No hay backup reciente"
  echo "ALERTA: Último backup hace $DAYS_AGO días"
fi
```

## 🔒 Seguridad de Backups

### Almacenamiento:

- ✅ Backups en directorio separado (`./backups/`)
- ✅ Permisos: `755` (lectura protegida)
- ✅ No incluyen `.env` (solo `.env.example`)
- ✅ Validados con SHA256

### Acceso:

```bash
# Proteger directorio de backups
chmod 700 ./backups/
chmod 600 ./backups/*/checksums.sha256
```

### Encriptación (recomendado para producción):

```bash
# Encriptar backup antes de archivar
gpg --symmetric --cipher-algo AES256 backup.tar.gz

# Desencriptar antes de restaurar
gpg --decrypt backup.tar.gz.gpg | tar -xz
```

## 📅 Calendario de Mantenimiento

| Tarea | Frecuencia | Responsable |
|------|-----------|-------------|
| Backup manual | Semanal | DevOps |
| Validación de checksums | Semanal | DevOps |
| Prueba de restauración | Mensual | DevOps |
| Limpieza de backups antiguos | Mensual | DevOps |
| Revisión de política | Trimestral | Admin |

## ❓ FAQ

**P: ¿Puedo pausar el backup automático?**
R: Sí, no ejecutes `docker-compose up` para el servicio de backup cron.

**P: ¿Qué pasa si falla el backup automático?**
R: Se registra en logs. Ejecuta un backup manual: `./scripts/backup/backup.sh`

**P: ¿Puedo restaurar desde un backup antiguo?**
R: Sí, pero perderás datos posteriores al backup.

**P: ¿Dónde almaceno los backups en producción?**
R: En storage externo (S3, Azure Blob, etc.) - implementar después de Deploy.

---

**Última actualización:** 2026-07-27
**Versión:** 1.0 (Fase 14B)
