# Guía de instalación del Portal UNC (paso a paso)

Para quien va a poner el portal en un servidor propio (VPS). Se usa el **instalador guiado** `scripts/deploy/instalar.sh`: avanza por nueve pasos, dice qué hace en cada uno y, si algo falla, explica **qué pasó** y **qué hacer**.

> ¿Recibe el proyecto para instalarlo? Empiece por **`docs/deploy/README-VPS.md`**: ordena esta guía y las demás en fases, con comprobaciones en cada paso.

> Regla de oro: **primero staging, después producción.** Staging es una copia de prueba con datos inventados; sirve para ensayar sin riesgo.

## 0. Qué necesita

**Su servidor:** Ubuntu 22 x64, 8 GB de RAM, 2 vCPU dedicados, 250 GB SSD NVMe y certificado SSL Sectigo. Con eso:
- **Sobra para todo:** producción y staging pueden convivir (cada uno usa cerca de 2 GB) y las imágenes se construyen en el servidor sin necesitar swap.
- **Con 2 vCPU la construcción tarda varios minutos** (la primera vez, de 10 a 20). Hágala fuera del horario de mayor uso y no la ejecute a la vez que pruebas pesadas en staging.
- **El certificado Sectigo cubre `www.unc.edu.py`.** Para `cms.unc.edu.py` se necesita aparte un certificado gratuito de Let's Encrypt (DEPLOY.md y `scripts/setup/rename-certs.sh` explican el paso). Confirme con el proveedor si el Sectigo incluye también el subdominio `cms`; si lo incluye, úselo y se ahorra ese paso.

Mínimo general (para otro servidor):

| Cosa | Mínimo recomendado |
| --- | --- |
| Servidor | Ubuntu 22.04 o superior, 2 CPU, 4 GB de memoria (con 2 GB, agregue swap), 40 GB de disco |
| Acceso | Un usuario con `sudo` (no trabaje como `root`) |
| Dominios | `www.unc.edu.py` y `cms.unc.edu.py` apuntando a la IP del servidor (solo para producción) |
| Puertos | 80 y 443 abiertos hacia internet (producción); en staging no hace falta abrir nada |
| Certificado | El de `www` (Sectigo) y el de `cms` (Let's Encrypt): ver DEPLOY.md |

## 1. Preparar el servidor (una vez)

```bash
# 1. Actualizar el sistema
sudo apt-get update && sudo apt-get upgrade -y

# 2. Instalar Docker (script oficial) y permitir su uso sin sudo
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# Cierre la sesión y vuelva a entrar. Compruebe:
docker info

# 3. Firewall básico (producción)
sudo ufw limit OpenSSH && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw enable

# 4. Descargar el proyecto
git clone https://github.com/cavahot/unc-portal.git
cd unc-portal
git checkout v1.0.0-rc.1             # la versión a instalar (Releases de GitHub); después, la versión final de main
```

## 1 bis. Proteger el acceso SSH (una vez, antes de producción)

El puerto 22 (SSH) es el más atacado de cualquier servidor con IP pública: los bots prueban contraseñas a los pocos minutos de que existe. Postgres ya queda cerrado y solo se publican 80 y 443; esto cierra lo que falta. **Orden importa: no cierre la sesión que tiene abierta hasta haber entrado por una segunda.**

1. **Cree su usuario y entre con clave.** Desde su computadora (no desde el servidor):
   ```bash
   ssh-copy-id usuario@IP_DEL_SERVIDOR
   ssh usuario@IP_DEL_SERVIDOR     # debe entrar SIN pedir la contraseña del servidor
   ```
   Si no entra con clave, **no siga**: desactivar contraseñas lo dejaría fuera.
2. **Desactive contraseñas y el login de `root`.** Use un archivo que se lea **antes** de `50-cloud-init.conf` (en SSH gana el primer valor, y cloud-init puede reactivar las contraseñas):
   ```bash
   sudo tee /etc/ssh/sshd_config.d/00-unc-hardening.conf >/dev/null <<'EOF'
   PasswordAuthentication no
   PermitRootLogin no
   PubkeyAuthentication yes
   MaxAuthTries 3
   LoginGraceTime 30
   EOF
   sudo sshd -t && sudo systemctl reload ssh
   ```
   `sshd -t` revisa la configuración: si imprime un error, **no recargue** y corrija.
3. **Pruebe en otra ventana (otra terminal) sin cerrar la actual:** `ssh usuario@IP_DEL_SERVIDOR` debe entrar con la clave. Después compruebe lo que quedó vigente:
   ```bash
   sudo sshd -T | grep -E 'passwordauthentication|permitrootlogin'
   # esperado: passwordauthentication no / permitrootlogin no
   ```
4. **Limite los intentos desde la misma IP** con `ufw limit` (ya lo aplica el paso 1.3; si abrió el 22 con `ufw allow OpenSSH`, bórrelo con `sudo ufw delete allow OpenSSH` y use `sudo ufw limit OpenSSH`). Bloquea a quien abre muchas conexiones en poco tiempo.
5. **Bloquee a quien insiste con fail2ban:**
   ```bash
   sudo apt-get install -y fail2ban
   sudo systemctl enable --now fail2ban
   sudo fail2ban-client status sshd      # debe listar la cárcel «sshd» activa
   ```
6. **Actualizaciones de seguridad automáticas:** `sudo apt-get install -y unattended-upgrades` y `sudo dpkg-reconfigure -plow unattended-upgrades`.
7. **Opcional: abra el 22 solo a las IP de la universidad.** Es lo más fuerte si tiene una IP fija: `sudo ufw delete limit OpenSSH` y `sudo ufw allow from IP_FIJA to any port 22 proto tcp`. Si su IP cambia, quedará fuera: téngalo claro antes de hacerlo.

### ¿Hace falta cambiar el puerto?

**No es necesario.** Cambiar el puerto reduce el ruido de los bots (menos intentos en los registros), pero **no sustituye** las medidas de arriba: un escaneo completo lo encuentra en segundos. Con clave obligatoria y fail2ban, el 22 es seguro. Si de todos modos lo quiere cambiar, hágalo en este orden para no quedar fuera:

1. Abra el puerto nuevo en el firewall **antes**: `sudo ufw allow 2222/tcp` (y en el firewall del proveedor, si tiene uno aparte).
2. Agregue `Port 2222` al archivo `00-unc-hardening.conf`, valide con `sudo sshd -t` y recargue.
3. Entre por una ventana nueva con `ssh -p 2222 usuario@IP`. Solo si funciona: `sudo ufw delete limit OpenSSH` (cierra el 22).
4. Cargue el puerto en GitHub como secreto `SSH_PORT` (entorno `production`), o el despliegue automático seguirá intentando el 22.

Cambiar el puerto cuesta recordarlo en cada conexión y en cada herramienta (copias externas, flujo de despliegue). Es una comodidad contra el ruido, no una defensa.

## 2. Ensayo en staging (recomendado antes de producción)

```bash
# Revisa todo sin cambiar nada
bash scripts/deploy/instalar.sh --solo-verificar

# Instala (genera los secretos solo; no los muestra)
bash scripts/deploy/instalar.sh --generar-secretos
```

Si el instalador se detiene con **«FALTA COMPLETAR»**, abra el archivo que indica (`infrastructure/docker/.env.staging`), complete lo que falta y vuelva a ejecutar el mismo comando. Solo muestra los **nombres** de las variables, nunca sus valores.

Al terminar, desde **su** computadora abra el túnel (así staging no queda público):

```bash
ssh -L 3100:127.0.0.1:3100 -L 3102:127.0.0.1:3102 usuario@IP_DEL_SERVIDOR
```

Portal: <http://localhost:3100> · CMS: <http://localhost:3102/accesoSeguro>. Cree un superadmin de prueba y siga la guía `docs/deploy/STAGING.md` (siembras, recorrido, respaldo y restauración).

Cuando termine el ensayo, apague staging: `docker compose -f infrastructure/docker/compose.staging.yaml --env-file infrastructure/docker/.env.staging down` (conserva los datos de prueba; no use `-v` salvo que quiera borrarlos).

## 3. Producción

1. **Certificados:** copie a `infrastructure/nginx/certs/` los archivos `www_fullchain.pem`, `www_privkey.pem`, `cms_fullchain.pem` y `cms_privkey.pem` (DEPLOY.md explica cómo obtenerlos).
2. **Revisión sin cambios:**
   ```bash
   bash scripts/deploy/instalar.sh --entorno produccion --solo-verificar
   ```
   Cree el `.env.prod` con `--generar-secretos` y complete a mano lo que el instalador liste (direcciones `https://`, correo SMTP, `CONTACT_TO`). **Nunca copie valores de staging a producción.**
3. **Instalación.** Mientras no haya imágenes publicadas por el CI, constrúyalas en el servidor:
   ```bash
   bash scripts/deploy/instalar.sh --entorno produccion --construir
   ```
   Cuando el CI ya las publique (al fusionar a `main`), puede descargar una versión concreta: `--tag sha-1a2b3c4`. El instalador pide escribir `PRODUCCION` para continuar.
4. **Primer superadmin:** abra `https://cms.unc.edu.py/accesoSeguro` y créelo. Después cree las cuentas **web-admin** de quienes editarán contenidos.
5. **Cargar los contenidos iniciales** (una sola vez; cada comando se puede repetir sin riesgo). El instalador los muestra al final con sus datos de ejemplo.
6. **Respaldos:** programe `scripts/backup/backup-prod.sh` (hay un ejemplo en `scripts/backup/crontab.example`) y **pruebe una restauración** antes de dar el sitio por bueno.
7. **Lista de verificación:** recórrala completa: `docs/deploy/CHECKLIST-PUBLICACION.md`.

## 4. Si algo falla

El instalador guarda un registro (`instalacion-ENTORNO-FECHA.log`) con los secretos ocultos. Ante un error muestra lo que pasó y los pasos; corrija y **vuelva a ejecutar el mismo comando**: conserva lo ya hecho (no repite imágenes, migraciones ni servicios) y sigue donde se quedó. Use `--rehacer` solo si quiere repetir todo.

| Mensaje del instalador | Qué significa | Qué hace usted |
| --- | --- | --- |
| Docker no está instalado | No existe el programa | Instalarlo (paso 1.2) |
| Docker está instalado pero no está encendido | El servicio está apagado | `sudo systemctl start docker` |
| El usuario no tiene permiso para usar Docker | Falta pertenecer al grupo `docker` | `sudo usermod -aG docker $USER` y reingresar |
| El puerto N ya lo está usando otro programa | Otro servidor web ocupa el puerto | `sudo ss -ltnp \| grep :N` y detenerlo |
| Falta completar el archivo de entorno | Hay variables vacías o con valor de ejemplo | Completarlas (el instalador lista los nombres) |
| No hay espacio en el disco | Disco lleno | `docker system df`, `docker image prune` o ampliar |
| El proceso se quedó sin memoria | El servidor es chico para construir | Agregar swap de 2 GB y reintentar |
| No se pudo llegar a internet o al registro | Red o DNS | `ping 1.1.1.1`, revisar `/etc/resolv.conf` |
| El servidor no tiene permiso para descargar las imágenes | Imágenes privadas | `docker login ghcr.io` o usar `--construir` |
| La versión de la imagen no existe | `--tag` mal escrito o sin publicar | Revisar la versión en GitHub Actions |
| La contraseña de la base de datos no coincide | La base guarda otra contraseña | Restaurar la original (o recrear el volumen, si es instalación nueva) |
| La migración no terminó bien | Falló un cambio de la base | Leer `docker logs`; es repetible sin riesgo |
| Nginx no encuentra los certificados | Faltan archivos en `certs/` | Copiarlos con los nombres exactos |
| El … no llegó a estar sano | Tardó más de lo esperado o falla | Leer `docker logs`; esperar y reintentar |

## 4 bis. Respaldos (siempre en el servidor)

Los respaldos se hacen **en el VPS**, no desde GitHub: la base de datos de producción vive dentro de Docker y no se expone a internet (Postgres cerrado). Para que GitHub la alcanzara habría que abrirla al exterior y dejar su `DATABASE_URL` como secreto, y el volcado de toda la base quedaría como artefacto en un repositorio público. Por eso el flujo `Backup` de GitHub quedó solo manual.

1. Copie `scripts/backup/crontab.example`, ajuste `PROJECT_DIR` y péguelo con `crontab -e` (respaldo diario cifrado de la base y de los medios, con alertas si falta una copia).
2. Active la **copia externa** una vez: `bash scripts/backup/configure-offsite.sh` (use una clave SSH de solo escritura).
3. Guarde la **frase de paso** fuera del servidor (gestor de contraseñas o papel): sin ella no se puede restaurar, y si estuviera solo en el servidor, un atacante la tendría junto a los datos.
4. **Pruebe una restauración** antes de publicar y repítala cada cierto tiempo (`docs/BACKUP_RECOVERY.md`).

## 5. Actualizar y volver atrás

- **Actualizar:** al fusionar a `main`, el flujo `deploy.yml` hace respaldo, migra y reinicia por SSH. Para eso configure en GitHub (Settings → Secrets) `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`, `GHCR_READ_TOKEN` (y los de Sentry si los usa).
- **Volver atrás:** vuelva a desplegar la versión anterior (`--tag` con el sha previo). Si una migración ya se aplicó, **no** la deshaga a mano: restaure el respaldo (`docs/BACKUP_RECOVERY.md`).

## 6. Qué NO hace el instalador (a propósito)

No instala Docker, no abre el firewall, no pide ni guarda contraseñas de personas, no borra volúmenes ni imágenes, no toca datos existentes y no carga los contenidos iniciales (eso requiere la cuenta de una persona). Antes de cualquier cambio sobre una base existente en producción, pide confirmar que hizo un respaldo.
