# Lista de verificación de publicación

Marque cada punto. Un punto sin marcar **bloquea** la publicación (regla SEC-027: sin evidencia no se publica). Guía: `docs/deploy/INSTALACION.md`.

## A. Antes de instalar

- [ ] CI del tracker (#13) en verde sobre el último commit.
- [ ] Se ensayó todo en **staging** con datos de prueba (`bash scripts/deploy/instalar.sh`), sin errores.
- [ ] En staging se probó un **respaldo y su restauración** (`docs/deploy/STAGING.md`, sección 6).
- [ ] Pruebas con roles no administrativos: anónimo, `editor` y `publisher` reciben 401/403 donde corresponde.
- [ ] Cuentas **web-admin** creadas para los responsables de contenido.
- [ ] Revisión del guaraní por un hablante nativo (o se acepta publicar con el marcador en español, por escrito).
- [ ] Acta de la revisión de seguridad adjunta a `docs/security/SEC-027-ADENDA-2026-11-07.md` (quién, qué, cuándo, hallazgos).
- [ ] Acceso SSH endurecido (`docs/deploy/INSTALACION.md`, sección 1 bis): `sudo sshd -T | grep -E 'passwordauthentication|permitrootlogin'` muestra `no` en ambos, se entra solo con clave y no hay login de `root`.
- [ ] `fail2ban` activo (`sudo fail2ban-client status sshd` lista la cárcel) y `ufw` con `limit` o IP permitidas para el 22; solo 22, 80 y 443 abiertos al público.
- [ ] Certificados HTTPS de `www` y `cms` vigentes y copiados.
- [ ] DNS de `www.unc.edu.py` y `cms.unc.edu.py` apuntando al servidor.
- [ ] `.env.prod` completo, sin valores de ejemplo y **distinto** del de staging.
- [ ] Respaldo reciente de la base y de los medios si ya existía una instalación.

## B. Durante la instalación

- [ ] `bash scripts/deploy/instalar.sh --entorno produccion --solo-verificar` termina sin errores.
- [ ] `bash scripts/deploy/instalar.sh --entorno produccion` (con `--construir` o `--tag`) termina en «Todo listo».
- [ ] Primer superadmin creado en `https://cms.unc.edu.py/accesoSeguro`.
- [ ] Siembras ejecutadas, **en este orden** y sin errores: `seed-tramites`, `seed-calendario`, `seed-legales`, `seed-legalizaciones`, `seed-dependencias` (y las demás de `scripts/seed-*.mjs` que correspondan).

## C. Después de instalar (primeras 24 horas)

- [ ] Prueba de humo en el navegador, en español e inglés: inicio, noticias, trámites, calendario, legalizaciones, contactos por dependencia, preguntas frecuentes, mapa del sitio, buscar y un 404.
- [ ] Vista en un celular real de las páginas principales.
- [ ] Cabeceras de seguridad y HTTPS correctos (candado, sin contenido mixto).
- [ ] Límite de tasa y nginx verificados (`x-real-ip`): lo que staging no cubre.
- [ ] Respaldo programado en el VPS (`crontab`, `scripts/backup/backup-prod.sh`) y **restauración probada** en producción o en una copia.
- [ ] **Copia externa** activa (`scripts/backup/configure-offsite.sh`) con una clave SSH de solo escritura.
- [ ] La **frase de paso** de los respaldos guardada fuera del servidor (gestor de contraseñas o papel).
- [ ] El flujo `Backup` de GitHub sigue solo manual y el secreto `DATABASE_URL` **no** está cargado en GitHub (la base no se expone a internet).
- [ ] Cada unidad confirmó sus datos (calendario, textos legales, requisitos, teléfonos y correos) y los corrigió en el CMS.
- [ ] Monitoreo activo (Sentry) y un responsable que lo mira.
- [ ] Plan de retroceso entendido: versión anterior (`--tag`) y restauración del respaldo.

## D. Registro

| Fecha | Quién | Versión (sha) | Resultado | Observaciones |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |
