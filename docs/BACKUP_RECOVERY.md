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
├── media-snapshot.tar.gz        # MinIO S3 snapshot (solo si MEDIA_STORAGE=s3)
├── media-volume.tar.gz          # Volumen local de media del CMS (MEDIA_STORAGE=local, MIG-IMG fase 1)
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

### Scenario 2b: Pérdida del volumen de media local (MEDIA_STORAGE=local)

Desde MIG-IMG fase 1 los archivos de `media` viven en el volumen Docker `unc_cms_media_prod`
(montado en `/app/media` del CMS) y la BD solo guarda los metadatos. Respaldar solo Postgres NO
alcanza: las filas `media` quedarían sin archivo (404 en las imágenes).

```bash
# Respaldo: lo hace scripts/backup/backup.sh (paso 2b) como media-volume.tar.gz y lo incluye en
# checksums.sha256. Manual equivalente:
docker exec unc-cms-prod tar -czf - -C /app/media . > media-volume.tar.gz
sha256sum media-volume.tar.gz > media-volume.tar.gz.sha256

# Restauración (el CMS debe estar levantado; tar corre como el usuario nextjs, uid 1001):
sha256sum -c media-volume.tar.gz.sha256            # verificar ANTES de extraer
tar -tzf media-volume.tar.gz > /dev/null           # el archivo es legible
docker exec -i unc-cms-prod tar -xzf - -C /app/media < media-volume.tar.gz
# Comprobar: GET /api/media/file/<un archivo conocido> responde 200 con la imagen.
```

Límites: el respaldo queda en el mismo host (copiarlo fuera es DEP-08, pendiente). Restaurar
sobre un volumen con archivos de otro dueño exige `chown -R 1001:1001` previo. Probar la restauración
en staging antes de confiar en ella. Nota: `.github/workflows/backup.yml` sube el volcado de la BD como
artefacto de GitHub Actions; en un repositorio PÚBLICO eso expone el dump a quien pueda descargar
artefactos (riesgo registrado en la spec MIG-IMG §16.5; no se modificó en esta tarea).

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

## 🔐 Copia diaria cifrada (GitHub Actions, BKP-01)

`.github/workflows/backup.yml` (diario 06:00 UTC) hace `pg_dump` con el secreto `DATABASE_URL`. **El repositorio es
público**, así que el volcado (usuarios, hashes de contraseña, datos personales) **se cifra dentro del runner** antes de
salir: `scripts/backup/encrypt-dump.sh` usa `gpg --symmetric --cipher-algo AES256`, comprueba que el `.gpg` descifra
byte a byte al original, escribe el `sha256` y **borra el `.dump` en claro** (también si algo falla; un paso final
`if: always()` lo vuelve a borrar). Solo se sube como artefacto `unc_portal_<fecha>.dump.gpg` + `.gpg.sha256`
(retención 14 días).

### Secreto requerido

| Secreto (GitHub → Settings → Secrets and variables → Actions) | Valor |
|---|---|
| `BACKUP_ENCRYPTION_PASSPHRASE` | Frase de paso de **al menos 20 caracteres** (recomendado: `openssl rand -base64 32`). Si falta o es corta, el job **falla antes de tocar la BD** con un mensaje que nombra el secreto sin mostrar su valor |
| `DATABASE_URL` | URI de Postgres alcanzable desde el runner (ver «Riesgo residual») |

**Custodia de la frase de paso:** sin ella la copia es irrecuperable; con ella cualquiera con el artefacto lo descifra.
Guárdala en **dos lugares independientes y por dos personas distintas** (p. ej. gestor de contraseñas institucional y
sobre cerrado del responsable de TI); **nunca** en el repositorio, en issues, en chats ni en `.env` versionados. Para
rotarla: cambia el secreto en GitHub; las copias anteriores siguen necesitando la frase **anterior**, así que
conserva las frases antiguas mientras existan copias que las usen.

### Restaurar desde un artefacto

```bash
# 1. Descargar el artefacto db-backup-<run_id> (Actions → ejecución → Artifacts) y descomprimir el zip.
# 2. Integridad del archivo cifrado:
sha256sum -c unc_portal_YYYYMMDD_HHMMSS.dump.gpg.sha256

# 3. Descifrar. La frase se lee sin eco y viaja por stdin (no queda en el historial ni en `ps`):
umask 077
read -rs BACKUP_PASS
printf '%s' "$BACKUP_PASS" | gpg --batch --pinentry-mode loopback --passphrase-fd 0 \
  --decrypt -o unc_portal_YYYYMMDD_HHMMSS.dump unc_portal_YYYYMMDD_HHMMSS.dump.gpg
unset BACKUP_PASS

# 4. Comprobar que el volcado es legible (no restaura nada):
pg_restore --list unc_portal_YYYYMMDD_HHMMSS.dump | head

# 5. Ensayo: restaurar en una BD VACÍA de prueba (nunca directamente sobre producción):
createdb unc_restore_test
pg_restore --no-owner --no-acl -d unc_restore_test unc_portal_YYYYMMDD_HHMMSS.dump

# 6. Borrar el texto plano al terminar:
shred -u unc_portal_YYYYMMDD_HHMMSS.dump 2>/dev/null || rm -f unc_portal_YYYYMMDD_HHMMSS.dump
```

La restauración sobre **producción** requiere aprobación humana y sigue el procedimiento de «Scenario 1» y
`scripts/setup/restore-db-prod.sh` (DEP-01): se pierden las escrituras posteriores al volcado.

### Riesgo residual y camino recomendado

- **`DATABASE_URL` debe ser alcanzable desde el runner.** Si Postgres corre solo dentro de la red de Docker del VPS
  (como en `compose.prod.yaml`, red `internal`, sin puertos publicados), este job **no puede conectarse** y fallará: no se
  debe exponer la BD a Internet solo para esto. Esta modificación protege la confidencialidad del artefacto; **no
  garantiza que el job pueda ejecutarse** con la topología actual (no verificado: requiere runner real).
- **Camino recomendado a largo plazo:** ejecutar `pg_dump` **en el VPS** con `scripts/backup/backup.sh` + `cron`
  (`scripts/backup/crontab.example`), cifrar con el mismo `encrypt-dump.sh` (o `age`) y enviar la copia cifrada a un
  destino **externo al host**. El destino externo **no está implementado**: es una decisión pendiente del Product Owner.
- La frase de paso vive en GitHub como secreto: quien administre el repositorio puede leerla indirectamente (un workflow
  modificado podría exfiltrarla). El cifrado protege frente a quien solo puede **leer** el repositorio público.
- Los artefactos ya generados **antes** de este cambio (hasta 30 días de retención) están **en claro**. Bórralos en
  Actions → Artifacts si el repositorio ha sido público durante ese tiempo y considera rotar credenciales.
- `gpg` simétrico es tan fuerte como la frase de paso; sin clave pública no hay recuperación si se pierde.

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
