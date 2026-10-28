# DOMINIOS-SSL-01 — Portal en `www.unc.edu.py` con un único certificado comercial

**Estado:** implementado en local, sin commit. **Tarea:** DOMINIOS-SSL-01 (reemplaza los hosts `portal.*` y `files.*` de DEP-10, MIN-01 y S3-SEAWEEDFS-01).
**Alcance:** infraestructura (nginx, Compose, `.env.prod.example`, deploy.yml, scripts, DEPLOY.md, tests). El código de la app lo ajusta otro agente con el mismo contrato de variables (§5).

## 1. Contexto

- El VPS de producción dispone de **un solo certificado comercial (Sectigo) válido únicamente para `www.unc.edu.py`**. No cubre `portal.*`, `cms.*` ni `files.*` (no es comodín ni SAN múltiple).
- El diseño anterior usaba tres hosts con Let's Encrypt (`portal`, `cms`, `files`). Con la restricción de arriba, el portal debe vivir en `www`, y el host `files` deja de existir.
- El portal y el CMS son dos aplicaciones Next.js que chocan en `/_next` y en `/api`: el CMS **no puede compartir host** con el portal. Por eso conserva su propio host `cms.unc.edu.py`, con un certificado gratuito de Let's Encrypt (el propietario crea el registro DNS A).
- La media pública del CMS (`GET /api/media/file/**`) y, si se usa, el almacén S3 opcional deben seguir siendo alcanzables desde el navegador sin un host propio: se publican como **rutas** del host `www`.

## 2. Decisión (propietario, 2026-10-28, «Plan A»)

1. Portal: `https://www.unc.edu.py`, certificado Sectigo (`www_fullchain.pem` + `www_privkey.pem`).
2. CMS (panel y API): `https://cms.unc.edu.py`, certificado Let's Encrypt (`cms_fullchain.pem` + `cms_privkey.pem`).
3. Desaparece `files`: su server block, su certificado, su registro DNS, su `-d` de certbot y su entrada en `rename-certs.sh`.
4. Media pública: nginx en `www` reenvía `^~ /api/media/file/` al upstream del CMS, **solo GET/HEAD**; cualquier otra ruta de `/api` en `www` es del portal.
5. S3 opcional (perfil `s3`, `MEDIA_STORAGE=s3`): objetos públicos bajo `^~ /archivos/` del host `www` (solo GET/HEAD, resolución DNS por petición, reescritura a `/<bucket>/...`).

## 3. Evidencia (RDD)

| Tipo | Hecho |
|---|---|
| Decisión humana | Brief del propietario del 2026-10-28 (la sección 2 de este documento): certificado único para `www`, CMS en `cms` con Let's Encrypt, sin host `files`, media por ruta. |
| Hecho observado | `apps/cms/src/utilities/mediaHeaders.ts` fija en `GET /api/media/file/*`: `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox` (salvo PDF) y `Cache-Control: public, max-age=86400` solo en imágenes (sin `immutable`: el nombre puede reutilizarse). Por eso nginx **no** añade ni oculta `Cache-Control` ni la CSP. |
| Hecho observado | La lectura de `media` es pública en el CMS (`access.read = true`, spec MIG-IMG); aun así la ruta de `www` elimina `Cookie` y `Authorization` hacia el CMS y `Set-Cookie` de vuelta. |
| Hecho observado | `infrastructure/nginx/nginx.conf` montaba el webroot ACME `/var/www/certbot` sin que el contenedor nginx lo tuviera montado (sin volumen en `compose.prod.yaml`): `certbot --webroot` no habría funcionado. Ahora se monta desde el host. |
| Hecho observado | La imagen `nginx:1.27-alpine` renderiza `/etc/nginx/templates/*.template` con `envsubst` a `/etc/nginx/conf.d/<nombre sin sufijo>`; con `NGINX_ENVSUBST_FILTER=^S3_BUCKET$` solo se sustituye esa variable. `nginx -t` con la configuración del repositorio, certificados autofirmados desechables y red desactivada: sintaxis correcta tanto con la plantilla renderizada como sin ella. |
| Hipótesis / riesgo | **Hairpin:** el optimizador de imágenes del portal (`/_next/image`) descarga `https://www.unc.edu.py/api/media/file/...` pasando por la IP pública del VPS (como ya hacía con `cms.unc.edu.py`). Next 16 rechaza imágenes que resuelven a IP privadas, de modo que un alias de red de Docker **no** es una opción. Esto depende de que el VPS pueda conectarse a su propia IP pública (NAT hairpin): **no verificado, debe comprobarse en el VPS** (§8). |
| Hipótesis / riesgo | El comportamiento real de `certbot reconfigure` (cambio de `standalone` a `webroot`) depende de la versión instalada de certbot (>= 2.3). No verificado aquí. |

## 4. Diseño

### 4.1 nginx (`infrastructure/nginx/nginx.conf`)

- `server :80` → `server_name www.unc.edu.py cms.unc.edu.py`; conserva `/.well-known/acme-challenge/` (`root /var/www/certbot`) y el 301 a https.
- `server :443 www.unc.edu.py` → certificados `www_*`. Orden de las locations: `^~ /api/media/file/` (CMS), las rutas generadas de `conf.d/*.location` (`/archivos/`), `/_next/static/` y `/` (portal).
- `^~ /api/media/file/`: `limit_except GET HEAD { deny all; }`; `proxy_pass http://cms_upstream`; `proxy_set_header Cookie ""` y `Authorization ""`; `proxy_hide_header Set-Cookie`; `Host cms.unc.edu.py` (el CMS ve su host canónico); repite HSTS y `X-Content-Type-Options` (un `add_header` en un location anula los del server; se oculta la copia del CMS para no duplicar la cabecera). La CSP y `Cache-Control` del CMS pasan intactos.
- `server :443 cms.unc.edu.py` → certificados `cms_*`; **conserva** `limit_req_zone cms_login`, `cms_media`, `POST /api/media` y `client_max_body_size 12m` (NGX-01). Nada de eso aplica en `www`.
- `/archivos/` vive en `infrastructure/nginx/templates/archivos-s3.location.template` (se renderiza con `S3_BUCKET`, por defecto `unc-media`; nginx no lee variables de entorno). `location = /archivos/ { return 404; }` evita pedir la raíz del bucket; `resolver 127.0.0.11` + `set $s3_backend` resuelven el contenedor `unc-s3-prod` en cada petición, así que **no hay `upstream` estático** y nginx arranca sin el perfil `s3`.

### 4.2 Compose (`infrastructure/docker/compose.prod.yaml`)

- Portal: `NEXT_PUBLIC_CMS_URL: ${MEDIA_PUBLIC_ORIGIN:?...}` (obligatoria; falla con mensaje claro) y `NEXT_PUBLIC_SITE_URL: ${PORTAL_PUBLIC_URL}`. `CMS_PUBLIC_URL` solo alimenta `NEXT_PUBLIC_SERVER_URL` del CMS.
- nginx: monta `/var/www/certbot` (webroot ACME) y `../nginx/templates`; recibe `S3_BUCKET` y `NGINX_ENVSUBST_FILTER=^S3_BUCKET$`.

## 5. Contrato de variables (compartido con la app)

| Variable | Valor de producción | Quién la lee |
|---|---|---|
| `PORTAL_PUBLIC_URL` | `https://www.unc.edu.py` | portal `NEXT_PUBLIC_SITE_URL`; CMS `PORTAL_URL` |
| `CMS_PUBLIC_URL` | `https://cms.unc.edu.py` | **solo** CMS `NEXT_PUBLIC_SERVER_URL` |
| `MEDIA_PUBLIC_ORIGIN` (nueva, obligatoria) | `https://www.unc.edu.py` | portal `NEXT_PUBLIC_CMS_URL` = origen donde se sirve `/api/media/file/**` |
| `MEDIA_HOSTNAME` | `www.unc.edu.py` | portal (imágenes y CSP; relevante con S3) |
| `S3_PUBLIC_URL` | `https://www.unc.edu.py/archivos` | CMS (`generateFileURL`), sin barra final |
| `CMS_URL` (interna) | `http://cms:3000` | portal, servidor a servidor (sin cambio) |

Archivos de certificado en `infrastructure/nginx/certs/` (fuera de git): `www_fullchain.pem`, `www_privkey.pem`, `cms_fullchain.pem`, `cms_privkey.pem`. No quedan referencias a `portal_*` ni `files_*`.

## 6. Escenarios de aceptación (Given/When/Then)

1. **Portal en www.** *Given* los certs `www_*` válidos. *When* se pide `https://www.unc.edu.py/` y `/api/health`. *Then* responde el portal (200) con el certificado Sectigo.
2. **Media pública por ruta.** *Given* una imagen subida al CMS. *When* se hace `GET https://www.unc.edu.py/api/media/file/<archivo>`. *Then* 200, con `nosniff`, HSTS y la CSP del CMS, sin `Set-Cookie`.
3. **Solo lectura.** *When* se hace `POST`/`PUT`/`DELETE` a `https://www.unc.edu.py/api/media/file/x`. *Then* 403 (nginx), nunca llega al CMS.
4. **Sin otras rutas del CMS en www.** *When* se pide `https://www.unc.edu.py/api/users/login` o `/admin`. *Then* responde el portal (no el CMS); el panel solo existe en `https://cms.unc.edu.py/admin`.
5. **Sin credenciales hacia el CMS.** *Given* una petición con `Cookie: payload-token=...` o `Authorization`. *When* llega a `/api/media/file/`. *Then* el CMS la recibe sin esas cabeceras (solo ve lo público).
6. **CMS en su host.** *When* se pide `https://cms.unc.edu.py/api/health` y `POST /api/media` en ráfaga. *Then* 200 con certificado Let's Encrypt, y el límite de tasa 429 sigue vigente solo en `cms`.
7. **HTTP.** *When* se pide `http://www.unc.edu.py/x` o `http://cms.unc.edu.py/x`. *Then* 301 a https; `/.well-known/acme-challenge/<token>` se sirve desde `/var/www/certbot`.
8. **S3 apagado.** *Given* `MEDIA_STORAGE=local` y sin contenedor `s3`. *When* arranca nginx y se pide `/archivos/x`. *Then* nginx arranca y solo esa ruta responde 502.
9. **S3 activo.** *Given* perfil `s3`, `S3_PUBLIC_READ=1`. *When* `GET /archivos/<clave>`. *Then* 200 (objeto de `/<bucket>/<clave>`); `GET /archivos/` → 404; escrituras → 403.
10. **Variable obligatoria.** *When* `MEDIA_PUBLIC_ORIGIN` falta en `.env.prod`. *Then* `docker compose config` falla con «MEDIA_PUBLIC_ORIGIN obligatoria».
11. **Optimizador de imágenes (hairpin).** *When* `GET https://www.unc.edu.py/_next/image?url=<imagen del CMS>&w=640&q=75`. *Then* 200 (el portal descarga la imagen por la IP pública del VPS).

Pruebas automáticas: `tests/deploy/dominios-ssl-01.test.mjs` (escenarios 1–10 a nivel de configuración) y `tests/deploy/nginx-cms-limits.test.mjs` (NGX-01 sin regresión).

## 7. Rollback

- Restaurar `nginx.conf`, `compose.prod.yaml`, `.env.prod` y `deploy.yml` del commit anterior (`git revert`) y recuperar los registros DNS y certificados `portal`/`files` (Let's Encrypt los conserva en `/etc/letsencrypt/live/`). Mientras tanto, mantener `portal.unc.edu.py` y `files.unc.edu.py` resolviendo hasta confirmar el cambio.
- El corte DNS (`www` apuntando al VPS) es el punto de no retorno práctico por HSTS: no subir `max-age` ni pedir preload para nuevos hosts hasta validar.

## 8. Límites y verificaciones pendientes en el VPS

- **Hairpin** (arriba): comprobar desde dentro del contenedor del portal que `https://www.unc.edu.py/api/media/file/<archivo>` responde 200 (por ejemplo `docker exec unc-portal-prod wget -qO- --spider https://www.unc.edu.py/api/health`). Si falla, hay que habilitar NAT hairpin en el VPS o en el firewall; un alias de Docker no sirve porque Next 16 rechaza IP privadas.
- La ruta de media de `www` es pública por diseño: expone **todo** `media` del CMS (también el que un editor no haya enlazado a contenido publicado), igual que ya lo hacía `cms.unc.edu.py`.
- Sin caché en nginx: cada imagen consulta al CMS (el optimizador del portal y el `Cache-Control: max-age=86400` del CMS amortiguan). Si el CMS cae, esas rutas dan 502.
- `HSTS includeSubDomains; preload` en `www` afecta a los subdominios de `www.unc.edu.py` (no a `cms`).
- La renovación del certificado Sectigo es **manual y anual**: reemplazar `www_fullchain.pem` (certificado + intermedios, en ese orden) y `www_privkey.pem` y recargar nginx. Let's Encrypt (solo `cms`) se renueva con `certbot renew` y un deploy hook que copia el certificado y ejecuta `nginx -s reload`.
- Prerrequisitos DNS: registros A de `www.unc.edu.py` y `cms.unc.edu.py` hacia la IP del VPS (el de `cms` lo crea el propietario); se retiran `portal` y `files`.
- No se probó nginx en ejecución (solo `nginx -t`), ni emisión real de certificados, ni el flujo con S3 de punta a punta.
