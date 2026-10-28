# BACKUP-MEDIA-01 — Respaldo cifrado de la media del CMS y gancho de copia externa

**Estado:** implementado y probado con shims (docker/rsync/rclone/ssh simulados; gpg y tar reales). **Nada se ejecutó contra Docker, el VPS ni un servidor externo reales** (ver «Límites»). **Formato:** SDD. **Evidencia (RDD):** hallazgo de revisión «la media NO se respalda antes de un deploy y el rollback nunca la restaura» (`.github/workflows/deploy.yml`, bloque de backup previo); `docs/BACKUP_RECOVERY.md` Scenario 2b (el volumen `unc_cms_media_prod` no está en la BD).

## Contexto

Producción es un único VPS (Ubuntu 22, 8 GB, 250 GB). El CMS guarda las subidas en el volumen Docker `unc_cms_media_prod` (`/app/media` de `unc-cms-prod`, `MEDIA_STORAGE=local`); Postgres guarda solo las filas `media`. Restaurar solo Postgres deja filas sin archivo. El dueño aún no tiene un segundo servidor.

## Decisión

1. **Respaldo local cifrado** (`scripts/backup/backup-media.sh`): `docker exec unc-cms-prod tar -czf - -C /app/media .` se canaliza (modo exec; con el CMS caído, modo volumen: contenedor desechable con el volumen `:ro`, ver abajo) a gpg simétrico AES256 (`encrypt-dump.sh --encrypt-stream`); no queda texto plano en disco. Salida `media-<UTC>.tar.gz.gpg` (+ `.sha256`) en `${BACKUP_LOCAL_DIR:-/opt/unc-portal/backups}` (dir 700, archivos 600). Verificación: descifrado a tubería + `tar -tzf` no vacío. Retención `BACKUP_RETENTION_DAYS` (14) solo sobre su patrón.
2. **Trabajo programado** (`backup-prod.sh`): BD cifrada (`db-<UTC>.dump.gpg`) + media + `offsite-push.sh`.
3. **Pre-deploy** (`deploy.yml`): tras el pg_dump verificado y antes de migrar/levantar, ejecuta `backup-media.sh`; falla cerrado.
4. **Gancho externo** (`offsite-push.sh`, `BACKUP_REMOTE`): rclone (`remoto:ruta`) o rsync sobre SSH (`ssh://user@host[:p]/ruta`, `user@host:/ruta`, `BACKUP_SSH_KEY` opcional). **Solo `.gpg`**; fallo de red no fatal; estado en `.offsite-status`.
5. **Asistente** (`configure-offsite.sh`): pregunta, prueba sin destruir, escribe `BACKUP_REMOTE` solo si la prueba pasa; `--non-interactive`, `--check`.
6. **Restauración** (`restore-media.sh`): verifica sha256 y descifrado, pide confirmación, extrae al volumen y corrige dueño `1001:1001`.

## Escenarios de aceptación (Given/When/Then)

1. *Given* sin `BACKUP_ENCRYPTION_PASSPHRASE`, *When* corre `backup-media.sh`, *Then* sale != 0 sin llamar a `docker exec` ni crear archivos.
2. *Given* frase válida, *When* corre, *Then* existe un único `media-<UTC>.tar.gz.gpg` (600) que descifra a un tar legible, no hay `.tar`/`.tar.gz` en claro y la frase no aparece en la salida.
3b. *Given* el CMS está detenido y el volumen existe, *When* corre `backup-media.sh`, *Then* usa `docker run --rm -v unc_cms_media_prod:/app/media:ro --entrypoint tar <imagen>` (imagen ya presente: BACKUP_MEDIA_IMAGE, la del contenedor del CMS, ghcr.io/cavahot/unc-portal-cms:$IMAGE_TAG, o postgres:16-alpine / nginx:1.27-alpine / alpine / busybox) y produce el mismo `.gpg` cifrado; *Given* ninguna imagen local con tar, *Then* falla cerrado (no se descarga nada durante un deploy).
3. *Given* tar falla a medias, *Then* no queda `.gpg` parcial y el código es != 0. *Given* el contenedor no existe, *Then* código 3.
4. *Given* archivos viejos `media-*.gpg`, `db-*.gpg` y ajenos, *When* corre con retención 14, *Then* solo se borran los `media-*` viejos.
5. *Given* sin `BACKUP_REMOTE`, *When* corre el respaldo, *Then* imprime «COPIA EXTERNA NO CONFIGURADA…» y `state=not_configured`.
6. *Given* un argumento no `.gpg`, *When* se invoca `offsite-push.sh`, *Then* sale != 0 y no se invoca rsync/rclone/ssh.
7. *Given* fallo de red, *Then* exit 0, advertencia, `state=failed`, copia local intacta.
8. *Given* la prueba de conexión falla, *When* corre el asistente, *Then* no escribe el archivo de entorno y sale != 0.
9. *Given* pre-deploy con volumen (CMS en marcha o caído) y el respaldo falla, *Then* el deploy aborta sin migrar ni levantar; si el CMS está caído y el respaldo en modo volumen funciona, el deploy continúa. *Given* sin volumen, *Then* se omite con mensaje.
10. *Given* un `.gpg` manipulado o frase equivocada, *When* corre `restore-media.sh`, *Then* aborta antes de extraer.

## Rollback

Revertir el commit: el deploy vuelve a no respaldar media. Los `*.gpg` y `.offsite-status` ya creados quedan inertes en `BACKUP_LOCAL_DIR`. Para quitar la copia externa: borrar `BACKUP_REMOTE` de `/opt/unc-portal/.env.backup`.

## Límites (honestos)

- Mientras `BACKUP_REMOTE` esté vacío, **los respaldos comparten disco y destino con el servidor**: protegen de borrados/corrupción lógica, no de la pérdida del VPS.
- En modo volumen la lectura es de solo lectura pero igualmente en caliente si algo más escribe en el volumen.
- La copia es **en caliente**: un archivo subido durante el `tar` puede quedar a medias.
- **Sin la frase de paso los respaldos son ilegibles**; custodiarla fuera del servidor (gestor de contraseñas del dueño).
- El `pg_dump` pre-deploy (`backups/pre-deploy-*.dump`) sigue sin cifrar (DEP-08); lo cifrado es el trabajo programado y la media.
- La prueba del asistente no sube un respaldo real ni verifica la retención del destino.
- El rollback de imagen no restaura media ni BD: la restauración es manual con aprobación humana.
- Obligatorio en el host: `gpg`; `rsync` (SSH) o `rclone`; `BACKUP_ENCRYPTION_PASSPHRASE` en `/opt/unc-portal/.env.backup` (modo 600), de lo contrario el deploy aborta (fail-closed intencional).
