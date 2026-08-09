# Portal UNC — Guía de Onboarding

Bienvenido al proyecto. Esta guía te lleva desde cero hasta el entorno de desarrollo
completo en menos de 15 minutos.

---

## Requisitos previos

### 🖥️ Para desarrollo local

| Herramienta | Versión requerida | Verificar | Instalar |
|-------------|-------------------|-----------|----------|
| **Node.js** | `>= 24.0.0` | `node --version` | [nodejs.org](https://nodejs.org) · recomendado via `nvm install 24` |
| **npm** | `>= 10.0.0` | `npm --version` | Incluido con Node.js |
| **Docker Engine** | `>= 26.0` | `docker --version` | [docs.docker.com/engine/install](https://docs.docker.com/engine/install/) |
| **Docker Compose** | `v2.x` (plugin, NO standalone) | `docker compose version` | Incluido con Docker Desktop / Engine v26+ |
| **Git** | `>= 2.40` | `git --version` | [git-scm.com](https://git-scm.com) |

> ⚠️ **Compose v2 vs v1**: este proyecto usa `docker compose` (sin guión).
> Si tu sistema solo tiene `docker-compose` (con guión), actualizá Docker.
>
> **Windows**: Docker Desktop requiere WSL2 habilitado (`wsl --install` desde PowerShell como administrador).
> **macOS/Linux**: Docker Engine sin Desktop también funciona.

---

### 🚀 Para implementación en producción (servidor)

El ingeniero que realice el deploy al servidor necesita adicionalmente:

| Herramienta | Versión requerida | Verificar | Para qué se usa |
|-------------|-------------------|-----------|-----------------|
| **Docker Engine** | `>= 26.0` | `docker --version` | Correr los contenedores |
| **Docker Compose** | `v2.27+` | `docker compose version` | Orquestar el stack completo |
| **Certbot** | `>= 2.0` | `certbot --version` | Obtener certificados SSL Let's Encrypt |
| **Nginx** | N/A (corre en Docker) | — | Incluido como imagen en el compose |
| **Git** | `>= 2.40` | `git --version` | Clonar el repo en el servidor |
| **SSH** | cualquiera | `ssh -V` | Acceso remoto al servidor |

#### Instalar en Ubuntu 22.04 (servidor)

```bash
# Docker Engine + Compose plugin (método oficial)
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER        # Agregar usuario al grupo docker
newgrp docker                   # Activar sin reiniciar

# Verificar instalación
docker --version                # Docker version 26.x.x
docker compose version          # Docker Compose version v2.27.x

# Certbot (para SSL Let's Encrypt)
apt install -y certbot
certbot --version               # certbot 2.x.x
```

#### Versiones mínimas del servidor

| Recurso | Mínimo | Recomendado | Actual (VPS contratado) |
|---------|--------|-------------|------------------------|
| RAM | 4 GB | 8 GB | ✅ 8 GB |
| vCPUs | 2 | 4 | ✅ 2 vCPUs |
| Disco | 50 GB SSD | 200 GB NVMe | ✅ 250 GB NVMe |
| OS | Ubuntu 20.04 | Ubuntu 22.04 LTS | ✅ Ubuntu 22.04 |
| Puertos abiertos | 22, 80, 443 | — | Verificar con proveedor |

---

## Setup inicial (primera vez)

### 1. Clonar el repositorio

```bash
git clone https://github.com/cavahot/unc-portal.git
cd unc-portal
```

### 2. Instalar dependencias

```bash
npm ci
```

### 3. Configurar variables de entorno

Hay dos archivos de entorno — uno para el portal y otro para el CMS:

```bash
# Portal (Next.js raíz)
cp .env.example .env.local

# CMS (Payload)
cp apps/cms/.env.example apps/cms/.env
```

> **Importante**: Los valores de `.env.example` funcionan para desarrollo local
> sin cambios. Solo necesitás modificarlos si tenés credenciales propias de
> servicios externos (Sentry, S3, SMTP real).

### 4. Levantar la infraestructura

Inicia PostgreSQL, MinIO y Mailpit en Docker:

```bash
npm run infra:up
```

Verificá que los tres contenedores estén healthy:

```bash
docker ps
```

Deberías ver `unc-postgres-local`, `unc-minio-local` y `unc-mailpit-local` con estado `healthy`.

### 5. Restaurar la base de datos

El proyecto incluye un seed con los datos reales de producción (noticias, tesis, convenios, etc.):

```bash
npm run setup:db
```

Este comando:
1. Verifica que la infraestructura esté corriendo
2. Descarga o usa el dump incluido en el repo
3. Restaura todos los datos en PostgreSQL local
4. Confirma el recuento de registros al terminar

> Si el comando falla con "No se encontró el archivo seed", contactá al equipo
> para obtener el archivo `setup/seed.dump.gz` o la URL de descarga.

### 6. Iniciar el entorno de desarrollo

```bash
npm run dev:all
```

Esto levanta en paralelo el portal y el CMS. Esperá a ver:
```
PORTAL  ▶ Ready on http://localhost:3000
CMS     ▶ Ready on http://localhost:3002
```

---

## URLs de desarrollo

| Servicio | URL | Descripción |
|----------|-----|-------------|
| Portal | http://localhost:3000 | Sitio web institucional |
| CMS Admin | http://localhost:3002/accesoSeguro | Panel de administración |
| Mailpit | http://localhost:8025 | Bandeja de emails locales |
| MinIO Console | http://localhost:9101 | Administrador de archivos S3 |

---

## Primer acceso al CMS

1. Abrí http://localhost:3002/accesoSeguro
2. El primer usuario superadmin se crea automáticamente si la BD está vacía.
   Si restauraste el seed, usá las credenciales que te provea el equipo.
3. Si necesitás resetear la contraseña:
   ```bash
   # Desde el panel de Mailpit (localhost:8025) llegará el email de reset
   ```

---

## Comandos disponibles

```bash
npm run dev:all          # Levanta portal + CMS + infra
npm run dev:portal       # Solo el portal (puerto 3000)
npm run dev:cms          # Solo el CMS (puerto 3002)
npm run infra:up         # Levanta Docker (postgres, minio, mailpit)
npm run infra:status     # Estado de los contenedores

npm run setup:db         # Restaura la BD desde el seed
npm run build:all        # Build completo (CMS + portal)

npm run typecheck        # TypeScript check del portal
npm run lint             # ESLint
npm run test             # Tests unitarios

npm run generate:types   # Regenera tipos de Payload después de cambiar colecciones
```

---

## Estructura del proyecto

```
unc-portal/
├── app/                    # Next.js App Router (portal)
│   ├── [locale]/           # Rutas internacionalizadas (es/)
│   └── api/                # API routes del portal
├── apps/
│   └── cms/                # Payload CMS (admin + API)
│       └── src/
│           ├── collections/ # Definición de colecciones (Noticias, Tesis, etc.)
│           ├── globals/     # Globales (Navegación, Estadísticas, etc.)
│           └── payload.config.ts
├── components/             # Componentes React del portal
├── lib/
│   └── cms/queries/        # Funciones tipadas para consumir el CMS
├── packages/
│   └── cms-types/          # Tipos auto-generados por Payload
├── infrastructure/
│   ├── docker/             # Docker Compose (dev y prod)
│   └── nginx/              # Config de nginx para producción
└── scripts/
    └── setup/              # Scripts de onboarding
```

---

## Flujo de trabajo con el CMS

1. **Editar colecciones**: modificar archivos en `apps/cms/src/collections/`
2. **Regenerar tipos**: `npm run generate:types` (actualiza `packages/cms-types/`)
3. **El portal recibe los cambios** automáticamente via los tipos en `lib/cms/queries/`

### Revalidación de caché

Cuando publicás contenido en el CMS, el portal se actualiza automáticamente
via el webhook de revalidación configurado en `REVALIDATION_SECRET`.

---

## Solución de problemas frecuentes

### "Cannot connect to database"
```bash
# Verificá que la infra esté corriendo
npm run infra:up
docker ps  # debe mostrar unc-postgres-local healthy
```

### "Port 3002 already in use"
```bash
# Encontrá y terminá el proceso
npx kill-port 3002
```

### "Module not found @unc/cms-types"
```bash
# Regenerá los tipos
npm run generate:types
```

### Los emails no llegan
Los emails de desarrollo se capturan en Mailpit — no salen a internet.
Revisá http://localhost:8025 para verlos.

### El CMS tarda mucho en arrancar (primera vez)
Payload compila el admin panel en el primer arranque. Podría tardar 60-90 segundos.
Esto solo ocurre una vez por sesión.

---

## Preguntas

Cualquier duda al equipo de desarrollo: **cesarvargas@unc.edu.py**
