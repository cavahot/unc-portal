# Paquete de entrega para quien instala el Portal UNC

Qué recibe el desarrollador que hará la instalación en el VPS, por qué canal, qué **no** debe circular y cómo se da
por terminado el trabajo. La guía paso a paso es `docs/deploy/README-VPS.md`.

## 1. Documentos (están en el repositorio; basta con el enlace)

Repositorio público: `https://github.com/cavahot/unc-portal`, versión **`v1.0.0-rc.1`**
(`https://github.com/cavahot/unc-portal/releases/tag/v1.0.0-rc.1`).

| Orden de lectura | Documento | Para qué |
| --- | --- | --- |
| 1 | `docs/deploy/README-VPS.md` | La guía única, en orden, con comprobaciones en cada fase |
| 2 | `docs/deploy/CHECKLIST-PUBLICACION.md` | Lo que debe quedar tildado, con fecha y responsable, antes de abrir el sitio |
| 3 | `docs/deploy/INSTALACION.md` | Instalador guiado, endurecimiento de SSH y tabla de errores |
| 4 | `DEPLOY.md` | DNS, certificados (Sectigo y Let's Encrypt), variables y GitHub Actions |
| 5 | `docs/deploy/STAGING.md` | Ensayo en staging: siembras, recorrido, respaldo y restauración |
| 6 | `docs/BACKUP_RECOVERY.md` | Respaldos cifrados y restauración |
| 7 | `docs/deploy/VERSIONES.md` y `CHANGELOG.md` | Cómo se numeran y publican las versiones |
| 8 | `docs/security/SEC-027-MATRIZ-ROLES.md` y `docs/security/SEC-027-ADENDA-2026-11-10.md` | Permisos esperados por rol y acta de revisión pendiente |

## 2. Lo que entrega el propietario por un canal seguro (gestor de contraseñas, nunca chat ni correo)

| Qué | Cómo | Nota |
| --- | --- | --- |
| Usuario en el VPS | El propietario lo crea y agrega la **clave pública** que le envía el desarrollador | Nadie comparte contraseñas del servidor; la clave privada no sale del equipo del desarrollador |
| IP del VPS y acceso a la consola web del proveedor | Mensaje aparte | La consola sirve si el SSH queda mal configurado |
| Certificado Sectigo de `www` | Archivos `.crt`, `.ca-bundle` y la **clave privada del CSR** | La clave privada nunca va a git, chat ni tickets |
| Contacto de quien administra el DNS de `unc.edu.py` | Nombre y medio de contacto | Para crear los registros A de `www` y `cms` |
| Datos del correo saliente (SMTP) y casilla de contacto | Gestor de contraseñas | Variables `SMTP_*` y `CONTACT_TO` de `.env.prod` |
| Lista de personas que tendrán cuenta `web-admin` | Nombres y correos institucionales | Cada una elige su contraseña al entrar |
| Volcado de WordPress (si se migran las noticias en producción) | Copia directa al desarrollador, fuera del repositorio | Contiene datos personales: no subirlo a git ni compartirlo |
| Acceso de colaborador en GitHub (opcional) | Invitación al repositorio | Solo si el desarrollador hará PRs o cargará los secretos de despliegue |

## 3. Lo que NO se entrega ni circula

- Archivos `.env`, `.env.prod`, `.env.staging`, `.env.backup` de nadie: se generan en el servidor con el instalador.
- Respaldos de la base (`*.dump`) ni copias de la base local: contienen cuentas y datos personales.
- Contraseñas de cuentas personales del CMS: cada persona define la suya. Las contraseñas de superadmin, reviewer y
  publisher que se usaron en desarrollo se consideran **expuestas** y no se reutilizan.
- La frase de paso de los respaldos: la genera y la guarda el propietario.

## 4. Decisiones que el desarrollador debe pedir al propietario (no las toma solo)

1. **Cómo se carga el contenido existente** en producción (noticias de WordPress, autoridades, facultades): siembras
   por módulo y migración de WordPress (recomendado) o copia de la base local. Ver `README-VPS.md` fase 7.4.
2. **Cuándo se fusiona en `main`** y se publica `v1.0.0` (dispara el despliegue automático).
3. **Si el guaraní se publica** con los textos marcados como pendientes de revisión nativa.
4. **Quién hace la revisión de seguridad independiente** (acta en `SEC-027-ADENDA-2026-11-10.md` §4). El propio
   desarrollador que instala puede hacerla, porque no implementó los cambios.

## 5. Cómo se da por terminado

- Staging ensayado (fase 3 completa, incluido respaldo y restauración) y apagado.
- Producción respondiendo en `https://www.unc.edu.py` y `https://cms.unc.edu.py/accesoSeguro` con candado válido.
- Respaldo diario programado, copia externa activa y una restauración probada.
- `docs/deploy/CHECKLIST-PUBLICACION.md` con todas las casillas tildadas, fecha y responsable.
- Un informe breve al propietario: qué se hizo, qué quedó pendiente y dónde están los registros de instalación
  (`instalacion-*.log`, con los secretos ocultos).
