# Guía: levantar y usar staging sintético

Spec: `docs/specs/deploy/STAGING.md`. **Los comandos de servidor los ejecuta usted, tras autorizar el acceso.** Ningún paso toca producción.

> **Atajo recomendado:** el instalador guiado hace los pasos 1 a 3 de esta guía por usted, con mensajes y errores explicados: `bash scripts/deploy/instalar.sh --generar-secretos` (ver `docs/deploy/INSTALACION.md`). Esta guía queda como detalle manual y para el recorrido de prueba.

## 1. Preparación (una vez)

```bash
cd /ruta/del/repositorio
git fetch origin && git checkout chain/rediseno-portal
cp infrastructure/docker/.env.staging.example infrastructure/docker/.env.staging
# Edite .env.staging: reemplace cada REEMPLAZAR_* por un valor nuevo (openssl rand -hex 32). No copie nada de .env.prod.
```

## 2. Levantar

```bash
docker compose -f infrastructure/docker/compose.staging.yaml --env-file infrastructure/docker/.env.staging up -d --build
docker logs unc-cms-migrate-staging | tail -20
```

## 3. Entrar por túnel SSH (desde su equipo)

```bash
ssh -L 3100:127.0.0.1:3100 -L 3102:127.0.0.1:3102 usuario@servidor
```

Portal: `http://localhost:3100`. CMS: `http://localhost:3102/accesoSeguro`. Cree un `superadmin` sintético en el primer ingreso.

## 4. Sembrar (desde su equipo, con el túnel abierto)

```powershell
$env:CMS_URL='http://localhost:3102'; $env:CMS_EMAIL='superadmin-sintetico@example.test'; $env:CMS_PASSWORD='clave-larga-de-staging'
node scripts/seed-calendario.mjs --apply
node scripts/seed-legales.mjs --apply
node scripts/seed-legalizaciones.mjs --apply
```

Repita cada comando: la segunda corrida debe informar «omitidos».

## 5. Recorrido

Abra en `http://localhost:3100`: `/calendario-academico`, `/privacidad`, `/accesibilidad`, `/legalizaciones`, `/mapa-sitio`, `/buscar`, `/revistas`, en es y en `/en`. Revise los registros:

```bash
docker logs unc-portal-staging --tail 50
docker logs unc-cms-staging --tail 50
```

## 6. Respaldo y restauración (ensayo)

```bash
docker exec unc-postgres-staging pg_dump -U unc_cms_staging -d unc_portal_staging -Fc -f /tmp/staging.dump
docker exec unc-postgres-staging sh -c "createdb -U unc_cms_staging unc_portal_staging_chk && pg_restore -U unc_cms_staging -d unc_portal_staging_chk /tmp/staging.dump"
docker exec unc-postgres-staging psql -U unc_cms_staging -d unc_portal_staging_chk -c "select count(*) from calendario_academico;"
docker exec unc-postgres-staging dropdb -U unc_cms_staging unc_portal_staging_chk
```

## 7. Apagar

```bash
docker compose -f infrastructure/docker/compose.staging.yaml --env-file infrastructure/docker/.env.staging down
```

Con `-v` también borra los datos de staging. Verifique que producción sigue igual: `docker ps --filter name=prod`.
