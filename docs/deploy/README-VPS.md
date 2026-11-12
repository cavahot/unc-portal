# Portal UNC — Instalación en el VPS (guía de traspaso)

Guía única, en orden, para quien recibe el proyecto y debe ponerlo en el servidor. Cada paso dice **qué hace**, **qué
comandos ejecutar**, **cómo saber que salió bien** y **qué hacer si falla**. Las guías detalladas a las que remite siguen
siendo válidas: `docs/deploy/INSTALACION.md` (instalador guiado), `DEPLOY.md` (DNS, certificados, variables),
`docs/deploy/STAGING.md` (ensayo) y `docs/deploy/CHECKLIST-PUBLICACION.md` (lo que debe estar tildado antes de abrir el
sitio). Lo que recibe del propietario y lo que no debe circular está en `docs/deploy/ENTREGA.md`.

> **Tres reglas que no se negocian**
> 1. **Primero staging, después producción.** Staging es una copia de prueba con datos inventados en el mismo VPS.
> 2. **Ningún secreto viaja por chat, correo ni git.** Contraseñas, claves privadas y archivos `.env` se generan en el
>    servidor o se pasan por un gestor de contraseñas.
> 3. **No fusione la rama `chain/rediseno-portal` en `main` por su cuenta.** Fusionar en `main` dispara el despliegue
>    automático a producción (`.github/workflows/deploy.yml`); lo ordena el propietario cuando el checklist esté completo.

---

## Datos del servidor y de la versión

| Dato | Valor |
| --- | --- |
| Servidor | VPS Ubuntu 22.04 x64, 8 GB de RAM, 2 vCPU dedicados, 250 GB SSD NVMe |
| Certificado incluido | Sectigo, válido **solo** para `www.unc.edu.py` (renovación manual anual) |
| Dominios | `www.unc.edu.py` (portal) y `cms.unc.edu.py` (panel; certificado gratuito Let's Encrypt) |
| Capacidad | Producción y staging conviven (≈ 2 GB cada uno). Construir las imágenes tarda 10–20 min con 2 vCPU |
| Repositorio | `https://github.com/cavahot/unc-portal` (público) |
| Versión a instalar | Etiqueta **`v1.0.0-rc.1`** (Release en GitHub, candidata para staging) |
| Carpeta en el servidor | `/opt/unc-portal` (la usan `scripts/setup/rename-certs.sh` y el hook de renovación) |
| Panel del CMS | `https://cms.unc.edu.py/accesoSeguro` (en staging: `http://localhost:3102/accesoSeguro` por túnel) |

En los comandos, reemplace `USUARIO` por su usuario del servidor e `IP_DEL_VPS` por la IP que le pase el propietario.

## Mapa de fases

| Fase | Qué se logra | Tiempo aprox. | Bloquea a |
| --- | --- | --- | --- |
| 0 | Su equipo listo y accesos recibidos | 30 min | todo |
| 1 | Servidor actualizado, Docker y proyecto en `/opt/unc-portal` | 30 min | 2 |
| 2 | SSH endurecido, firewall y fail2ban | 30 min | 4 |
| 3 | Staging ensayado: instalación, contenidos, recorrido, respaldo y restauración | 2–3 h | 4 |
| 4 | DNS y certificados de `www` y `cms` | 1 h (+ propagación DNS) | 6 |
| 5 | `.env.prod` completo | 30 min | 6 |
| 6 | Producción instalada | 1 h | 7 |
| 7 | Administradores y contenidos iniciales | 1–2 h | 9 |
| 8 | Respaldos programados y restauración probada | 1 h | 9 |
| 9 | Verificación final y checklist firmado | 1 h | publicación |
| 10 | Actualizaciones automáticas desde GitHub (después de publicar) | 30 min | — |

---

## Fase 0 — Antes de empezar

**En su computadora necesita:** `git`, `ssh` (con un par de claves propio: `ssh-keygen -t ed25519`), **Node.js 20.9 o
superior** (las siembras de contenido corren desde su equipo) y un navegador.

**Del propietario debe recibir** (detalle en `docs/deploy/ENTREGA.md`):
- Su usuario en el VPS, creado con **su clave pública** (usted le envía `~/.ssh/id_ed25519.pub`, nunca la privada).
- La IP del VPS y el contacto de quien administra el DNS de `unc.edu.py`.
- Los archivos del certificado Sectigo (`.crt`, `.ca-bundle` y la clave privada del CSR) por un canal seguro.
- Los datos del correo saliente (SMTP) y la casilla que recibe los formularios de contacto.

**Compruebe:**
```bash
ssh USUARIO@IP_DEL_VPS 'lsb_release -ds; nproc; free -h | head -2; df -h / | tail -1'
```
**Salió bien si** responde Ubuntu 22.04, 2 CPU, cerca de 8 GB de memoria y unos 250 GB de disco, **sin pedir la
contraseña del servidor** (entra con su clave).

---

## Fase 1 — Preparar el servidor (una vez)

```bash
# 1.1 Actualizar el sistema
sudo apt-get update && sudo apt-get upgrade -y

# 1.2 Docker (script oficial) y uso sin sudo
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
exit                                   # cierre la sesión y vuelva a entrar
```
```bash
docker info >/dev/null && echo "Docker OK"
docker compose version

# 1.3 Descargar el proyecto en la versión a instalar
sudo mkdir -p /opt/unc-portal && sudo chown "$USER": /opt/unc-portal
git clone https://github.com/cavahot/unc-portal.git /opt/unc-portal
cd /opt/unc-portal
git checkout v1.0.0-rc.1
git describe --tags                    # debe decir: v1.0.0-rc.1
```
**Salió bien si** imprime `Docker OK`, una versión de `docker compose` (v2) y `v1.0.0-rc.1`.
**Si falla:** «permission denied» con Docker → no cerró y reabrió la sesión tras el `usermod`.

---

## Fase 2 — Proteger el acceso (una vez, antes de producción)

Siga **`docs/deploy/INSTALACION.md`, sección «1 bis»**, en su orden exacto. Resumen de comandos:

```bash
# 2.1 Sin contraseñas ni root por SSH (no cierre la sesión actual hasta probar en otra ventana)
sudo tee /etc/ssh/sshd_config.d/00-unc-hardening.conf >/dev/null <<'EOF'
PasswordAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
MaxAuthTries 3
LoginGraceTime 30
EOF
sudo sshd -t && sudo systemctl reload ssh

# 2.2 Firewall: SSH limitado, 80 y 443 abiertos
sudo ufw limit OpenSSH && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw enable

# 2.3 fail2ban y actualizaciones de seguridad automáticas
sudo apt-get install -y fail2ban unattended-upgrades
sudo systemctl enable --now fail2ban
sudo dpkg-reconfigure -plow unattended-upgrades
```
**Salió bien si**, desde **otra ventana**, `ssh USUARIO@IP_DEL_VPS` entra con su clave, y en el servidor:
```bash
sudo sshd -T | grep -E 'passwordauthentication|permitrootlogin'   # no / no
sudo ufw status                                                     # 22 LIMIT, 80 y 443 ALLOW
sudo fail2ban-client status sshd                                    # cárcel «sshd» activa
```
**Si falla:** si `sshd -t` muestra un error, **no recargue**; corrija el archivo. Si quedó fuera, entre por la consola
web del proveedor del VPS.

---

## Fase 3 — Ensayo completo en staging

Staging usa los puertos 3100 (portal) y 3102 (CMS) **solo dentro del servidor**; se entra por túnel SSH. No toca
producción. Detalle: `docs/deploy/STAGING.md` y `docs/deploy/INSTALACION.md` §2.

```bash
cd /opt/unc-portal
# 3.1 Revisión sin cambios
bash scripts/deploy/instalar.sh --solo-verificar
# 3.2 Instalación (genera los secretos de staging sin mostrarlos y construye las imágenes: 10–20 min)
bash scripts/deploy/instalar.sh --generar-secretos
```
**Salió bien si** termina con **«Todo listo»** y el resumen muestra los 9 pasos en `[ OK ]`.
**Si se detiene con «FALTA COMPLETAR»:** abra `infrastructure/docker/.env.staging`, complete las variables que el
instalador nombra y repita el mismo comando (sigue donde quedó). Tabla de errores: `INSTALACION.md` §4.

**3.3 Entrar por túnel** (en **su** computadora, déjelo abierto):
```bash
ssh -L 3100:127.0.0.1:3100 -L 3102:127.0.0.1:3102 USUARIO@IP_DEL_VPS
```
Abra `http://localhost:3102/accesoSeguro` y cree un **superadmin sintético** (por ejemplo `admin-staging@example.test`
con una contraseña larga que solo usted conoce).

**3.4 Cargar los contenidos iniciales** (en su computadora, con un clon del repositorio en la misma versión
`v1.0.0-rc.1` y el túnel abierto). En PowerShell:
```powershell
$env:CMS_URL='http://localhost:3102'; $env:CMS_EMAIL='admin-staging@example.test'; $env:CMS_PASSWORD=Read-Host 'Clave'
foreach ($s in 'seed-tramites','seed-calendario','seed-legales','seed-legalizaciones','seed-dependencias','seed-pilares-academicos','seed-navegacion') { node "scripts/$s.mjs" --apply }
```
En bash: `export CMS_URL=http://localhost:3102 CMS_EMAIL=admin-staging@example.test; read -rs CMS_PASSWORD; export CMS_PASSWORD`
y luego `for s in seed-tramites seed-calendario seed-legales seed-legalizaciones seed-dependencias seed-pilares-academicos seed-navegacion; do node scripts/$s.mjs --apply; done`.

**Salió bien si** cada siembra termina con `Resumen: {... "errores":0}`. **Repítalas:** la segunda vez deben informar
«omitido» (no pisan nada).

**3.5 Recorrido** en `http://localhost:3100`, en español y en `/en` y `/gn`: portada (tarjetas de Docencia,
Investigación y Extensión), `/calendario-academico`, `/legalizaciones`, `/titulos`, `/contacto/dependencias`,
`/docencia` (aviso «En construcción»), `/mapa-sitio`, `/buscar`. El megamenú «Academia» debe incluir Docencia y Tesis
Académicas. Al cambiar de idioma la página debe empezar arriba, en el hero.
```bash
docker logs unc-portal-staging --tail 50       # sin errores repetidos
docker logs unc-cms-staging --tail 50
```

**3.6 Prueba del menú con una página del CMS** (con el túnel abierto, desde su computadora). El guion crea una página,
la pasa por el flujo editorial con **tres cuentas distintas** (autor, revisor y publicador; créelas antes en el CMS de
staging), la agrega al menú, comprueba que el portal la muestra y deja todo como estaba:
```bash
export CMS_URL=http://localhost:3102 PORTAL_URL=http://localhost:3100
export CMS_EMAIL=... CMS_REVIEWER_EMAIL=... CMS_PUBLISHER_EMAIL=...
read -rs CMS_PASSWORD; read -rs CMS_REVIEWER_PASSWORD; read -rs CMS_PUBLISHER_PASSWORD
export CMS_PASSWORD CMS_REVIEWER_PASSWORD CMS_PUBLISHER_PASSWORD
node scripts/smoke-menu-pagina.mjs --apply
```
**Salió bien si** termina con todos los pasos en verde (detalle en `docs/specs/portal/MENU-PAGINAS.md` §5).

**3.7 Permisos por rol:** cree en el CMS de staging una cuenta sintética por rol (`editor`, `publisher`, `viewer`) y
compruebe a mano las filas P1–P11 de `docs/security/SEC-027-MATRIZ-ROLES.md` (lo que cada rol puede y no puede hacer).
El guion `probe-roles.ts` solo trabaja contra una base local, no contra staging.

**3.8 Respaldo y restauración** (obligatorio): ejecute los cuatro comandos de `docs/deploy/STAGING.md` §6.
**Salió bien si** el `select count(*)` sobre la copia restaurada devuelve el mismo número que la base original.

**3.9 Apagar staging** al terminar (conserva sus datos de prueba):
```bash
docker compose -f infrastructure/docker/compose.staging.yaml --env-file infrastructure/docker/.env.staging down
```
Anote en `docs/deploy/CHECKLIST-PUBLICACION.md` las casillas de staging que quedaron cumplidas.

---

## Fase 4 — DNS y certificados

Siga **`DEPLOY.md` pasos 4 a 7** al pie de la letra. Orden obligatorio: **certificados antes de levantar producción**
(nginx no arranca sin ellos y certbot necesita el puerto 80 libre).

1. **DNS:** registros A `www.unc.edu.py` y `cms.unc.edu.py` → `IP_DEL_VPS`.
   **Salió bien si** `dig +short www.unc.edu.py` y `dig +short cms.unc.edu.py` devuelven la IP del VPS.
2. **`www` (Sectigo):** en `/opt/unc-portal/infrastructure/nginx/certs/` (créela con `mkdir -p` si no existe):
   ```bash
   cat www_unc_edu_py.crt www_unc_edu_py.ca-bundle > www_fullchain.pem
   cp CLAVE_PRIVADA_DEL_CSR.key www_privkey.pem && chmod 640 www_privkey.pem
   openssl x509 -noout -modulus -in www_fullchain.pem | openssl md5
   openssl rsa  -noout -modulus -in www_privkey.pem  | openssl md5   # mismo resultado que la línea anterior
   ```
3. **`cms` (Let's Encrypt):** `sudo apt-get install -y certbot && sudo mkdir -p /var/www/certbot && sudo certbot certonly --standalone -d cms.unc.edu.py`
4. **Copiar con los nombres que espera nginx:** `cd /opt/unc-portal && bash scripts/setup/rename-certs.sh`
   **Salió bien si** imprime «✅ Certs copiados correctamente».
5. **Renovación automática** del de `cms`: cree el hook de `DEPLOY.md` paso 7. Ponga un recordatorio anual para el
   Sectigo (`openssl x509 -noout -enddate -in infrastructure/nginx/certs/www_fullchain.pem`).

---

## Fase 5 — Variables de producción

```bash
cd /opt/unc-portal
bash scripts/deploy/instalar.sh --entorno produccion --solo-verificar
bash scripts/deploy/instalar.sh --entorno produccion --generar-secretos --solo-verificar
```
El segundo comando crea `infrastructure/docker/.env.prod` con secretos aleatorios **distintos** de los de staging y
lista lo que falta completar a mano. Complete con `nano infrastructure/docker/.env.prod`:

| Variable | Qué poner |
| --- | --- |
| `PORTAL_PUBLIC_URL` | `https://www.unc.edu.py` |
| `CMS_PUBLIC_URL` | `https://cms.unc.edu.py` |
| `MEDIA_PUBLIC_ORIGIN` / `MEDIA_HOSTNAME` | según el comentario del propio archivo (la media se sirve bajo `www`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_ADDRESS`, `SMTP_FROM_NAME` | datos del correo saliente que entrega el propietario |
| `CONTACT_TO` | casilla que recibe los formularios de contacto |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_*` | opcional (monitoreo); vacío si no se usa |

`MEDIA_STORAGE` queda en `local` (las imágenes en un volumen del servidor). **Nunca copie valores de `.env.staging`.**
**Salió bien si** `--entorno produccion --solo-verificar` ya no informa «FALTA COMPLETAR».

---

## Fase 6 — Instalar producción

```bash
cd /opt/unc-portal
bash scripts/deploy/instalar.sh --entorno produccion --construir
```
El instalador pide escribir **`PRODUCCION`** para continuar. Construye las imágenes en el servidor (no hacen falta
imágenes publicadas ni tokens de GitHub), migra la base con las migraciones versionadas y levanta los servicios.
**Salió bien si** termina con «Todo listo» y:
```bash
curl -sI https://www.unc.edu.py | head -1          # HTTP/2 200
curl -sI https://cms.unc.edu.py/accesoSeguro | head -1
docker ps --format '{{.Names}} {{.Status}}'        # todos «Up» y «(healthy)» donde aplique
```
**Si falla:** lea el mensaje del instalador (explica la causa y el arreglo), corrija y **repita el mismo comando**.
Registro completo, con secretos ocultos: `instalacion-produccion-FECHA.log`.

---

## Fase 7 — Administradores y contenidos

1. **Primer superadmin:** abra `https://cms.unc.edu.py/accesoSeguro` y créelo con el correo institucional del
   propietario. La contraseña la elige el propietario, no usted.
   **Segundo superadmin de respaldo:** con el primero, cree otra cuenta superadmin (por ejemplo, institucional, guardada
   en un gestor de contraseñas). Ya no existe «olvidé mi contraseña» por correo: si el único superadmin pierde su
   contraseña, solo queda la recuperación de emergencia por SSH (`docs/manual/CONTRASENAS-Y-CUENTAS.md`, sección
   «Recuperación de emergencia»). Toda cuenta creada por un superadmin cambia su contraseña en el primer ingreso.
2. **Cuentas `web-admin`** para quienes editarán contenidos (lista que entrega el propietario). Cada persona define su
   contraseña.
3. **Siembras** desde su computadora, igual que en 3.4 pero contra producción:
   ```bash
   export CMS_URL=https://cms.unc.edu.py CMS_EMAIL=correo-del-superadmin; read -rs CMS_PASSWORD; export CMS_PASSWORD
   for s in seed-tramites seed-calendario seed-legales seed-legalizaciones seed-dependencias seed-pilares-academicos seed-navegacion; do node scripts/$s.mjs --apply --allow-remote; done
   ```
   La credencial la escribe el propietario en la terminal (`read -rs` no la muestra ni la guarda).
4. **Contenido existente (noticias de WordPress, autoridades, facultades, etc.) — DECISIÓN DEL PROPIETARIO.** El
   volcado `setup/seed.dump.gz` que menciona `DEPLOY.md` paso 15 **no existe** en el repositorio. Caminos posibles:
   - **(Recomendado)** Cargar módulo por módulo con las siembras de `scripts/seed-*.mjs` (hay 27; muchas dependen de
     otras, p. ej. `seed-titulos` usa la fila de `seed-aranceles-rectorado`) y migrar las noticias con
     `node scripts/migrate-wordpress.mjs --xml=RUTA_DEL_VOLCADO.xml --cms=https://cms.unc.edu.py --allow-remote` (usa
     `CMS_EMAIL`/`CMS_PASSWORD` y las cuentas de revisión y publicación que indica el encabezado del guion), a partir del
     volcado de WordPress que entrega el propietario. Pruébelo primero con `--dry-run` y **ensáyelo en staging** (fase 3).
   - Copiar los datos de la base local del propietario con `scripts/setup/restore-data-prod.sh`: arrastra las cuentas
     locales (con contraseñas que deben rotarse) y datos personales; exige una revisión de privacidad previa.

---

## Fase 8 — Respaldos

Siga `docs/deploy/INSTALACION.md` §4 bis:
```bash
cp scripts/backup/crontab.example /tmp/unc-crontab && nano /tmp/unc-crontab   # ajuste PROJECT_DIR=/opt/unc-portal
crontab /tmp/unc-crontab && crontab -l
bash scripts/backup/configure-offsite.sh                                      # copia externa, clave SSH de solo escritura
```
- Los ajustes de los respaldos (destino, retención, frase de paso) van en `/opt/unc-portal/.env.backup` (modo 600),
  como explican los comentarios de `crontab.example`; no en la línea de cron.
- La **frase de paso** de los respaldos la guarda el propietario fuera del servidor (gestor de contraseñas o papel).
- **Pruebe una restauración** con `docs/BACKUP_RECOVERY.md` antes de abrir el sitio.
**Salió bien si** al día siguiente hay un respaldo nuevo cifrado y la restauración de prueba devuelve los mismos datos.

---

## Fase 9 — Verificación final

1. Recorrido de 3.5 contra `https://www.unc.edu.py`, en español e inglés, en computadora y en un **celular real**.
2. Candado HTTPS en `www` y `cms`, sin contenido mixto; cabeceras de seguridad presentes (`curl -sI https://www.unc.edu.py`).
3. Formulario de contacto: llega el correo a `CONTACT_TO`.
4. **`docs/deploy/CHECKLIST-PUBLICACION.md` completo**, con fecha y responsable en cada casilla. Sin todas las casillas
   tildadas, el sitio no se anuncia.

---

## Fase 10 — Actualizaciones desde GitHub (después de publicar)

Las versiones se publican como **Releases** en GitHub (`docs/deploy/VERSIONES.md`). Para que cada versión nueva se
despliegue sola:
1. En el servidor, cree una clave SSH **solo para el despliegue** y agregue la pública a `~/.ssh/authorized_keys`.
2. En GitHub → *Settings → Secrets and variables → Actions* cargue `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`,
   `GHCR_READ_TOKEN` (y `SSH_PORT` si cambió el 22). Detalle: `DEPLOY.md` pasos 9–11.
3. El entorno **`Production`** ya exige la aprobación del propietario: ningún despliegue corre sin su visto bueno.
4. Cuando el propietario lo ordene, se fusiona `chain/rediseno-portal` en `main` y se publica la Release `v1.0.0`.
   Desde entonces: rama de trabajo → PR → CI en verde → fusión en `main` → aprobación → despliegue.

**Volver atrás:** redespliegue la versión anterior (`git checkout vX.Y.Z` y `instalar.sh --entorno produccion
--construir`, o `--tag sha-…` si hay imágenes publicadas). Si una migración ya se aplicó, **no** la deshaga a mano:
restaure el respaldo (`docs/BACKUP_RECOVERY.md`).

---

## Si algo no está en esta guía

1. Lea el mensaje del instalador: dice qué pasó y qué hacer.
2. Busque el síntoma en `docs/deploy/INSTALACION.md` §4.
3. No borre volúmenes (`docker compose down -v`) ni ejecute `restore-db-prod.sh` sin un respaldo verificado y la
   autorización del propietario.
4. Anote lo que encontró en un issue del repositorio (sin secretos ni datos personales).
