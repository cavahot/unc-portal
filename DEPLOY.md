# Portal UNC — Guía de Deploy en Producción

Esta guía cubre el **primer deploy** en el servidor VPS y los deploys subsiguientes
(manejados automáticamente por CI/CD). Seguila en orden — el orden importa.

---

## Requisitos previos

Antes de empezar necesitás:

- [ ] Acceso SSH al VPS (Ubuntu 22.04)
- [ ] Los secretos de producción (`.env.prod` — solicitarlos al equipo)
- [ ] Acceso de administrador al repositorio GitHub (`cavahot/unc-portal`)
- [ ] Docker Engine `>= 26.0` instalado en el servidor (ver paso 1)

---

## Parte 1 — Preparar el servidor

### Paso 1 — Instalar Docker Engine

```bash
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER
newgrp docker
```

Verificar:

```bash
docker --version          # Docker version 26.x.x
docker compose version    # Docker Compose version v2.x.x
```

### Paso 2 — Crear la estructura de directorios

```bash
mkdir -p /opt/unc-portal/infrastructure/nginx/certs
```

### Paso 3 — Clonar el repositorio

```bash
cd /opt/unc-portal
git clone https://github.com/cavahot/unc-portal.git .
```

---

## Parte 2 — DNS y certificados SSL

> ⚠️ **Orden crítico**: los certificados SSL deben obtenerse ANTES de levantar
> Docker Compose. Nginx no arranca sin ellos, y certbot necesita el puerto 80 libre
> (que nginx estaría ocupando si ya estuviera corriendo).

### Paso 4 — Configurar DNS

En el panel del proveedor DNS, crear 3 registros A apuntando a la IP del VPS:

| Nombre | Tipo | Valor |
|--------|------|-------|
| `portal.unc.edu.py` | A | `<IP_DEL_VPS>` |
| `cms.unc.edu.py` | A | `<IP_DEL_VPS>` |
| `files.unc.edu.py` | A | `<IP_DEL_VPS>` |

Verificar propagación antes de continuar (puede tardar hasta 24h, usualmente minutos):

```bash
dig +short portal.unc.edu.py
dig +short cms.unc.edu.py
dig +short files.unc.edu.py
```

Los tres deben devolver la misma IP del VPS.

### Paso 5 — Obtener certificados SSL (Let's Encrypt)

Instalar certbot y obtener un certificado por dominio:

```bash
apt install -y certbot

certbot certonly --standalone -d portal.unc.edu.py
certbot certonly --standalone -d cms.unc.edu.py
certbot certonly --standalone -d files.unc.edu.py
```

### Paso 6 — Copiar certificados al directorio de nginx

El script copia cada cert con el nombre exacto que nginx espera:

```bash
cd /opt/unc-portal
bash scripts/setup/rename-certs.sh
```

Resultado esperado:

```
✓  portal.unc.edu.py → infrastructure/nginx/certs/portal_fullchain.pem + portal_privkey.pem
✓  cms.unc.edu.py    → infrastructure/nginx/certs/cms_fullchain.pem    + cms_privkey.pem
✓  files.unc.edu.py  → infrastructure/nginx/certs/files_fullchain.pem  + files_privkey.pem
✅ Certs copiados correctamente
```

### Paso 7 — Configurar renovación automática

Certbot se renueva automáticamente via systemd. Solo hay que agregar un deploy hook
para que nginx recargue la configuración después de cada renovación:

```bash
cat > /etc/letsencrypt/renewal-hooks/deploy/unc-portal.sh << 'EOF'
#!/usr/bin/env bash
set -e
cd /opt/unc-portal
bash scripts/setup/rename-certs.sh
docker compose \
  -f infrastructure/docker/compose.prod.yaml \
  --env-file infrastructure/docker/.env.prod \
  exec nginx nginx -s reload
EOF

chmod +x /etc/letsencrypt/renewal-hooks/deploy/unc-portal.sh
```

---

## Parte 3 — Variables de entorno

### Paso 8 — Crear `.env.prod`

```bash
cp infrastructure/docker/.env.prod.example infrastructure/docker/.env.prod
nano infrastructure/docker/.env.prod
```

Completar **todos** los valores marcados como `REEMPLAZAR_*`. Los campos críticos:

| Variable | Descripción |
|----------|-------------|
| `POSTGRES_PASSWORD` | Mínimo 32 caracteres aleatorios |
| `MINIO_ROOT_USER` | Access key de MinIO (mínimo 3 chars) |
| `MINIO_ROOT_PASSWORD` | Secret key de MinIO (mínimo 8 chars) |
| `PAYLOAD_SECRET` | Mínimo 32 caracteres aleatorios |
| `PREVIEW_SECRET` | Mínimo 32 caracteres aleatorios |
| `REVALIDATION_SECRET` | Mínimo 32 caracteres aleatorios |
| `S3_PUBLIC_URL` | `https://files.unc.edu.py` |
| `POSTGRES_SSL` | `false` (Postgres está en la misma red Docker) |
| `SMTP_HOST` | Host del servidor de correo de la UNC |

Para generar valores aleatorios seguros:

```bash
openssl rand -base64 48 | tr -d '=+/' | head -c 48
```

---

## Parte 4 — GitHub Actions (CI/CD)

El deploy automático se activa cada vez que pasa el CI en `main`. Para que funcione
necesitás configurar los siguientes secrets y el environment en GitHub.

### Paso 9 — Crear SSH key para el deploy

```bash
ssh-keygen -t ed25519 -C "github-deploy@unc.edu.py" -f ~/.ssh/github_deploy -N ""
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/github_deploy      # <- esto es SSH_PRIVATE_KEY
```

### Paso 10 — Configurar GitHub Secrets

En GitHub → repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Valor |
|--------|-------|
| `SSH_HOST` | IP del VPS |
| `SSH_USER` | usuario SSH (`root` o el usuario creado) |
| `SSH_PRIVATE_KEY` | contenido de `~/.ssh/github_deploy` (clave privada) |
| `SSH_PORT` | `22` (o el configurado por el proveedor) |
| `GHCR_READ_TOKEN` | PAT de GitHub con scope `read:packages` (ver abajo) |
| `NEXT_PUBLIC_SENTRY_DSN` | DSN de Sentry (puede quedar vacío si no se usa) |
| `SENTRY_AUTH_TOKEN` | Token de Sentry (puede quedar vacío si no se usa) |
| `SENTRY_ORG` | `unc` |
| `SENTRY_PROJECT` | `portal-unc` |

**Crear el GHCR_READ_TOKEN:**
1. GitHub → tu perfil → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Nombre: `unc-portal-deploy-read`
3. Scope: `Read access to packages`
4. Copiar el token como `GHCR_READ_TOKEN`

### Paso 11 — Crear el environment de producción

En GitHub → repo → **Settings → Environments → New environment**:
- Nombre: `production`
- (Opcional) Agregar required reviewers para aprobación manual antes de cada deploy

---

## Parte 5 — Primer arranque

### Paso 12 — Autenticar el servidor en ghcr.io

El servidor necesita poder bajar las imágenes Docker privadas:

```bash
echo "<GHCR_READ_TOKEN>" | docker login ghcr.io -u cavahot --password-stdin
```

### Paso 13 — Levantar el stack

```bash
cd /opt/unc-portal

docker compose \
  -f infrastructure/docker/compose.prod.yaml \
  --env-file infrastructure/docker/.env.prod \
  pull

docker compose \
  -f infrastructure/docker/compose.prod.yaml \
  --env-file infrastructure/docker/.env.prod \
  up -d
```

Verificar que todos los contenedores estén healthy (puede tardar ~2 minutos):

```bash
docker ps
```

Deberías ver 5 contenedores con estado `healthy`:
`unc-postgres-prod`, `unc-minio-prod`, `unc-cms-prod`, `unc-portal-prod`, `unc-nginx-prod`

### Paso 14 — Inicializar MinIO (solo primera vez)

```bash
bash scripts/setup/init-minio.sh
```

Crea el bucket `unc-media` y habilita acceso público de lectura (necesario para que
los navegadores carguen las imágenes directamente desde MinIO/CDN).

### Paso 15 — Restaurar la base de datos (solo primera vez)

El repo incluye un seed con todos los datos de producción (noticias, tesis, convenios, etc.):

```bash
bash scripts/setup/restore-db-prod.sh
```

---

## Parte 6 — Verificación

```bash
# Portal público
curl -s -o /dev/null -w "%{http_code}" https://portal.unc.edu.py/api/health
# Debe responder: 200

# CMS admin
curl -s -o /dev/null -w "%{http_code}" https://cms.unc.edu.py/api/health
# Debe responder: 200

# Media (verifica que MinIO y nginx funcionen)
curl -sI https://files.unc.edu.py
# Debe responder: HTTP/2 200 o 403 (403 es correcto si el bucket está vacío)
```

---

## Deploys posteriores (CI/CD automático)

Una vez configurado todo, los deploys son automáticos:

1. Hacer push a `main` → el CI corre los tests
2. Si el CI pasa → el workflow de deploy construye las imágenes Docker y las publica en ghcr.io
3. El servidor baja las nuevas imágenes y reinicia los contenedores
4. Se ejecuta un health check automático

No es necesario acceder al servidor para deploys de rutina.

---

## Troubleshooting

### Nginx no arranca

```bash
docker logs unc-nginx-prod
```

Causa más común: certificados SSL faltantes o con nombres incorrectos.
Verificar que existan los 6 archivos en `infrastructure/nginx/certs/`.

### CMS no conecta a la base de datos

```bash
docker logs unc-cms-prod
```

Verificar que `DATABASE_URI` en `.env.prod` tenga las credenciales correctas y
que el contenedor `unc-postgres-prod` esté en estado `healthy`.

### Las imágenes no cargan

Verificar que `S3_PUBLIC_URL=https://files.unc.edu.py` esté en `.env.prod` y que
el bucket `unc-media` exista con política pública:

```bash
bash scripts/setup/init-minio.sh
```

### Ver logs en tiempo real

```bash
docker compose \
  -f infrastructure/docker/compose.prod.yaml \
  --env-file infrastructure/docker/.env.prod \
  logs -f --tail=100
```

---

## Preguntas

Equipo de desarrollo: **cesarvargas@unc.edu.py**
