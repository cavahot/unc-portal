# Manual: carga inicial de contenidos en producción (www.unc.edu.py)

**Para:** el desarrollador que administra el VPS. **Prepara los archivos:** César (Parte 0).
**Objetivo:** poblar una sola vez el CMS de producción con los contenidos institucionales y las noticias históricas.
Todos los pasos se pueden repetir: si algo falla a mitad de camino, se vuelve a correr el mismo comando y **no
se crean duplicados** (excepciones indicadas con ⚠). Ningún paso borra ni sobrescribe contenido que ya esté cargado.

Tiempo estimado: 1 a 2 horas. Hacerlo en un horario de poco tráfico.

---

## Antes de empezar: cómo está hoy producción (evidencia del 17-11-2026)

La lectura pública `https://cms.unc.edu.py/api/<colección>?limit=1` devuelve **0 documentos** en las 24 colecciones
públicas (noticias, facultades, carreras, autoridades, convenios, trámites, media…). Los globals `legalizaciones`,
`navegacion`, `politica-privacidad`, `declaracion-accesibilidad` y `transparencia` están vacíos. `institucional`,
`informacion-publica`, `pilares-academicos` y `estadisticas` ya tienen texto: los guiones **no** los tocan.

## Resumen del recorrido

| Parte | Dónde | Qué |
|---|---|---|
| 0 | Equipo de César | Generar el extracto de noticias y entregar los archivos |
| A | VPS (SSH) | Ver dónde están los datos, consultar la base y hacer el respaldo |
| B | Computadora del desarrollador | Ejecutar la siembra contra `https://cms.unc.edu.py` |
| C | VPS + navegador | Verificar en la base, en el CMS y en el portal |
| D | VPS | Revertir, solo si algo salió mal |

La siembra (Parte B) se ejecuta **desde la computadora del desarrollador** y no dentro del servidor: los guiones
hablan con la API pública del CMS por https, solo necesitan Node.js y se niegan a ejecutarse con
`NODE_ENV=production` (control SEC-08). Así no hay que instalar Node en el VPS ni copiar las imágenes al servidor.

---

## Parte 0 — César prepara y entrega los archivos

El volcado completo de WordPress (`m1gr4unc_dbWP.xml`) contiene usuarios con hashes de contraseña, secretos 2FA,
registros de acceso con IP y claves de Wordfence. **No se entrega.** Se entrega un extracto que solo tiene las
noticias publicadas, sus imágenes destacadas y sus categorías.

En el equipo de César, desde la carpeta del repositorio:

```bash
node scripts/wp-export-noticias.mjs --xml="<carpeta del volcado>/m1gr4unc_dbWP.xml" --out="<carpeta de entrega, fuera del repositorio>/noticias-wp.xml"
```

Resultado esperado: `Resumen: {"noticias":273,"protegidas":0,"adjuntos":115,...}`. El guion se niega a escribir
dentro del repositorio. Deja afuera las noticias protegidas con contraseña y los adjuntos que no pertenecen a una noticia.

Opcional, antes de entregar: recuperar del Internet Archive (Wayback Machine) las imágenes de 2016 a 2023 que
todavía existen allí, guardándolas en la misma carpeta `uploads/` (88 archivos disponibles; solo descarga de
`web.archive.org`, una cada 2 segundos, y nunca sobrescribe):

```bash
OUT0=$(mktemp -d)
node scripts/load-news-images.mjs --xml=<entrega>/02-noticias/noticias-wp.xml --uploads=<entrega>/03-imagenes/uploads --out=$OUT0 --dry-run
node scripts/recover-wayback-images.mjs --manifest=$OUT0/manifest.json --uploads=<entrega>/03-imagenes/uploads            # plan
node scripts/recover-wayback-images.mjs --manifest=$OUT0/manifest.json --uploads=<entrega>/03-imagenes/uploads --apply    # descarga
```

Entregar al desarrollador la carpeta `entrega-desarrollador` (o su .zip) por un canal privado, no por el repositorio:

| Carpeta | Contenido | Se usa en |
|---|---|---|
| `01-manual/` | Este manual y `consulta-datos-bd.sql` | Todo el proceso |
| `02-noticias/noticias-wp.xml` | Extracto saneado de noticias (1,6 MB) | B9 y B10 |
| `03-imagenes/uploads/` | Imágenes de noticias por `AAAA/MM/` (237 + las recuperadas) | B10 |
| `04-transparencia/` | CSV con las 11 carpetas de Drive de la Ley 5189 | B8 |
| `05-glosario/` | Glosario guaraní completado (propuestas para revisión) | B8 |
| `06-fotos-autoridades/` | Fotos de 5 decanos y la tabla de a quién corresponde cada una | B11 |

---

## Parte A — En el VPS: dónde están los datos, consulta y respaldo

Conectarse al VPS por SSH y ubicarse en la carpeta del despliegue:

```bash
cd /opt/unc-portal
```

### A1. Dónde están alojados los datos

| Dato | Contenedor | Volumen Docker | Ruta dentro del contenedor |
|---|---|---|---|
| Base de datos PostgreSQL 16 (`unc_portal`, usuario `unc_cms`) | `unc-postgres-prod` | `unc_postgres_data_prod` | `/var/lib/postgresql/data` |
| Archivos subidos al CMS (imágenes, PDF) | `unc-cms-prod` | `unc_cms_media_prod` | `/app/media` |
| Respaldos locales | — | carpeta del host | `/opt/unc-portal/backups` |

Ver la carpeta real del disco del servidor donde Docker guarda cada volumen:

```bash
docker volume inspect unc_postgres_data_prod --format '{{ .Mountpoint }}'
docker volume inspect unc_cms_media_prod --format '{{ .Mountpoint }}'
```

(Si `.env.prod` tiene `MEDIA_STORAGE=s3`, los archivos están en el volumen `unc_s3_data_prod` del contenedor `unc-s3-prod`.)

```bash
grep '^MEDIA_STORAGE' infrastructure/docker/.env.prod
```

### A2. Consulta de la base (solo lectura)

El repositorio trae la consulta en `docs/deploy/consulta-datos-bd.sql`. Muestra la base, su carpeta y tamaño, los
conteos de las colecciones principales y todas las tablas con datos:

```bash
docker exec -i unc-postgres-prod sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < docs/deploy/consulta-datos-bd.sql
```

Antes de la carga, la sección 2 debe mostrar **0** en todo salvo `users` (las cuentas creadas a mano). Guardar
esta salida: es la evidencia del estado inicial.

```bash
docker exec -i unc-postgres-prod sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < docs/deploy/consulta-datos-bd.sql > backups/estado-antes-de-la-carga.txt
```

Si `docs/deploy/consulta-datos-bd.sql` no está en el VPS (el clon del servidor es anterior), copiarlo desde la
computadora del desarrollador: `scp docs/deploy/consulta-datos-bd.sql usuario@servidor:/opt/unc-portal/backups/`
y usar esa ruta.

### A3. Respaldo previo (obligatorio)

**Opción 1, si los respaldos cifrados ya están configurados** (existe `/opt/unc-portal/.env.backup` con la frase de paso):

```bash
bash scripts/backup/backup-prod.sh
```

Anotar las rutas que imprime (`DB_BACKUP=...` y `MEDIA_BACKUP=...`).

**Opción 2, si todavía no están configurados:**

```bash
UTC=$(date -u +%Y%m%dT%H%M%SZ); echo "$UTC"
docker exec unc-postgres-prod sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > backups/pre-carga-$UTC.dump
docker exec unc-cms-prod tar -czf - -C /app/media . > backups/pre-carga-media-$UTC.tar.gz
ls -lh backups/pre-carga-*
docker exec -i unc-postgres-prod pg_restore --list < backups/pre-carga-$UTC.dump | head -5
```

El último comando debe listar el contenido del respaldo sin errores. **Anotar el valor de `UTC`**: lo pide la
Parte D. Borrar estos dos archivos sin cifrar cuando la carga esté verificada.

---

## Parte B — En la computadora del desarrollador: la siembra

### B1. Requisitos

- Node.js 20.9 o superior (`node --version`). No hace falta `npm install`: los guiones solo usan módulos de Node.
- Una terminal bash (Linux, macOS o Git Bash en Windows).
- El repositorio actualizado en la rama que contiene este manual:

```bash
git clone https://github.com/cavahot/unc-portal.git
cd unc-portal
git checkout feat/carga-inicial-produccion   # hasta que se fusione; después, la rama que se despliega
```

- La carpeta `entrega-desarrollador` de la Parte 0, descomprimida, por ejemplo en `~/entrega-desarrollador/`. Definir:

```bash
E=~/entrega-desarrollador
```

### B2. Cuentas del CMS

En `https://cms.unc.edu.py/accesoSeguro`, con el superadmin, crear (si no existen) **tres** cuentas distintas:

| Para qué | Rol | Variables |
|---|---|---|
| Sembrar y ser autor de las noticias | `superadmin` o `web-admin` | `CMS_EMAIL`, `CMS_PASSWORD` |
| Revisar las noticias | revisor | `CMS_REVIEWER_EMAIL`, `CMS_REVIEWER_PASSWORD` |
| Publicar las noticias | publicador | `CMS_PUBLISHER_EMAIL`, `CMS_PUBLISHER_PASSWORD` |

Contraseñas de al menos 12 caracteres. Sin las cuentas de revisor y publicador, las noticias quedan en **borrador**.

### B3. Variables de entorno

Escribirlas con `read` para que no queden en el historial de la terminal. Se usan en todos los pasos siguientes,
así que hay que ejecutar todo **en la misma terminal**:

```bash
export CMS_URL=https://cms.unc.edu.py
unset NODE_ENV
read -rp  "CMS_EMAIL: " CMS_EMAIL && export CMS_EMAIL
read -rsp "CMS_PASSWORD: " CMS_PASSWORD && echo && export CMS_PASSWORD
```

Comprobar el acceso (debe responder `200`):

```bash
curl -s -o /dev/null -w "%{http_code}\n" "$CMS_URL/api/health"
```

### Cómo leer cada paso

- Primero se ejecuta el **simulacro**: muestra qué haría y no escribe nada. Revisar que no haya errores.
- Después se ejecuta la **carga real**. Al final, cada guion imprime un `Resumen` con lo creado, lo que ya existía y los errores.
- Todos los comandos llevan `--allow-remote`: sin ese parámetro, los guiones solo aceptan un CMS local. Con él,
  exigen https.
- Si un paso termina con errores, corregir la causa y repetir **el mismo** comando: lo que ya se creó se omite.

### B4. Paso 1 — Facultades, carreras y aranceles por facultad

Es el primer paso porque autoridades, trámites y acreditaciones se enlazan con las facultades.

```bash
for F in odontologia medicina humanidades cienciasExactas cienciasEconomicas agrarias; do
  node scripts/seed-facultad.mjs --faculty=$F --allow-remote
done
```

Simulacro esperado: 6 bloques `[dry-run] facultad facultad-de-...` (carreras 8, 3, 26, 5, 12 y 8).

```bash
for F in odontologia medicina humanidades cienciasExactas cienciasEconomicas agrarias; do
  node scripts/seed-facultad.mjs --faculty=$F --apply --allow-remote || break
done
```

Resultado esperado: 6 facultades, 62 carreras y 130 aranceles. **No usar** `seed-agrarias.mjs`, `seed-medicina.mjs`,
`seed-humanidades.mjs` ni `seed-ciencias-*.mjs` (versiones anteriores), ni los `npm run seed:*`.

### B5. Paso 2 — Aranceles del Rectorado

> **Atención:** hay dos tipos de guion. Los de los pasos 1 y 3 (y `seed-tramites` y `seed-titulos`) **simulan** si
> no se les pasa `--apply`. Los de los pasos 2, 4 (`seed-autoridades`, reconocimientos) y 5 **escriben** si no se les
> pasa `--dry-run`. Copiar cada comando tal como está en este manual.

Este guion escribe por defecto; el simulacro va con `--dry-run`:

```bash
node scripts/seed-aranceles-rectorado.mjs --dry-run --allow-remote
node scripts/seed-aranceles-rectorado.mjs --allow-remote
```

Esperado: 24 aranceles.

### B6. Paso 3 — Páginas institucionales y listas sin dependencias

Estos guiones simulan por defecto y escriben con `--apply`:

```bash
for S in seed-calendario seed-legales seed-legalizaciones seed-dependencias seed-pilares-academicos seed-navegacion seed-institucional seed-transparencia-items; do
  echo "== $S"; node scripts/$S.mjs --allow-remote || break
done
```

```bash
for S in seed-calendario seed-legales seed-legalizaciones seed-dependencias seed-pilares-academicos seed-navegacion seed-institucional seed-transparencia-items; do
  echo "== $S"; node scripts/$S.mjs --apply --allow-remote || break
done
```

Esperado: calendario 3, dependencias 7, ítems de transparencia 28. Se llenan los globals de privacidad,
accesibilidad, legalizaciones y navegación. `pilares-academicos` e `institucional` se informan como
«ya tiene contenido» y no se tocan.

### B7. Paso 4 — Lo que depende de facultades o de aranceles

```bash
node scripts/seed-autoridades.mjs --dry-run --allow-remote
node scripts/seed-autoridades.mjs --allow-remote
node scripts/seed-tramites.mjs --allow-remote
node scripts/seed-tramites.mjs --apply --allow-remote
node scripts/seed-titulos.mjs --allow-remote
node scripts/seed-titulos.mjs --apply --allow-remote
node scripts/seed-reconocimientos-acreditaciones.mjs --dry-run
node scripts/seed-reconocimientos-acreditaciones.mjs --allow-remote
```

Esperado: 8 autoridades, 18 trámites, el global de inscripción de títulos, 1 reconocimiento y 7 acreditaciones.
Las acreditaciones se crean **inactivas y sin verificar**: las activa la unidad responsable desde el CMS. En
producción, el guion de reconocimientos no crea facultades; si falta alguna, lo informa como `faltantes` (el Paso 1
debe haber dado 6). En las facultades existentes solo completa `siglas` y la ruta del logo cuando esos campos están vacíos.

### B8. Paso 5 — Convenios, línea de tiempo, marco legal, glosario, tribunal y preguntas frecuentes

```bash
for S in seed-convenios seed-linea-tiempo seed-marco-legal seed-glosario-guarani; do
  echo "== $S"; node scripts/$S.mjs --dry-run --allow-remote && node scripts/$S.mjs --allow-remote || break
done
node scripts/apply-convenios-corrections.mjs --allow-remote
node scripts/seed-tribunal.mjs --allow-remote
node scripts/seed-faqs.mjs --allow-remote
```

Esperado: 149 convenios (la siembra ya excluye el duplicado conocido; las correcciones informan
«Duplicado ya ausente» y solo ajustan textos), 6 hitos, 44 documentos del
marco legal, 128 términos del glosario, 5 miembros y 8 documentos del tribunal, y las preguntas frecuentes.

- ⚠ No pasar `--update` a `seed-marco-legal`: sobrescribe campos.
- `seed-tribunal` y `seed-faqs` no tienen simulacro.
- `seed-faqs` funciona en modo todo o nada: si ya hay alguna pregunta, no crea ninguna.

Documentos de la Ley 5189 (las 11 carpetas de Drive que publicaba el sitio anterior; necesita el Paso 3) y propuestas
del glosario guaraní (entran como «pendiente»: el portal solo las usa cuando un superadmin las aprueba). Los dos
simulan sin `--apply`:

```bash
node scripts/seed-transparencia-leyes.mjs --file $E/04-transparencia/transparencia-ley5189-sitio-anterior.csv --allow-remote
node scripts/seed-transparencia-leyes.mjs --file $E/04-transparencia/transparencia-ley5189-sitio-anterior.csv --apply --allow-remote
node scripts/import-glosario-completado.mjs --file $E/05-glosario/UNC-Glosario-Guarani-completado.md --allow-remote
node scripts/import-glosario-completado.mjs --file $E/05-glosario/UNC-Glosario-Guarani-completado.md --apply --allow-remote
```

Esperado: 11 documentos de la Ley 5189 (`filas válidas: 11 | con error: 0` en el simulacro). El importador del
glosario solo completa términos sin traducción; el número exacto lo informa su resumen.

### B9. Paso 6 — Noticias históricas

Agregar las cuentas de revisor y publicador en la misma terminal:

```bash
read -rp  "CMS_REVIEWER_EMAIL: " CMS_REVIEWER_EMAIL && export CMS_REVIEWER_EMAIL
read -rsp "CMS_REVIEWER_PASSWORD: " CMS_REVIEWER_PASSWORD && echo && export CMS_REVIEWER_PASSWORD
read -rp  "CMS_PUBLISHER_EMAIL: " CMS_PUBLISHER_EMAIL && export CMS_PUBLISHER_EMAIL
read -rsp "CMS_PUBLISHER_PASSWORD: " CMS_PUBLISHER_PASSWORD && echo && export CMS_PUBLISHER_PASSWORD
X=$E/02-noticias/noticias-wp.xml
U=$E/03-imagenes/uploads
```

```bash
node scripts/migrate-wordpress.mjs --xml=$X --only=posts --cms=$CMS_URL --allow-remote --dry-run
node scripts/migrate-wordpress.mjs --xml=$X --only=posts --cms=$CMS_URL --allow-remote
```

Esperado al final: `✅ 273`. Si se interrumpe, repetir el comando: busca cada noticia por su slug y retoma las
que quedaron a medias.

- ⚠ **No** usar `--only=pages` ni omitir `--only=posts`: las páginas se crean sin buscar si ya existen.
- ⚠ No usar `patch-news-images.mjs`, `patch-missing-images.mjs`, `fix-wp-titulos-unicode.mjs`, ni los guiones de
  `apps/cms/scripts/seed/` (`init.ts`, `create-news.ts`, `publish-news.ts`…). Son de desarrollo o ya no corresponden.

### B10. Paso 7 — Imágenes de las noticias

```bash
OUT=$(mktemp -d); echo "Progreso en $OUT"
node scripts/load-news-images.mjs --xml=$X --uploads=$U --out=$OUT --dry-run
node scripts/load-news-images.mjs --xml=$X --uploads=$U --out=$OUT --cms=$CMS_URL --allow-remote --only-upload --link
```

Sin las imágenes del Internet Archive, el simulacro dice: `archivos: 237 (válidos 237, rechazados 0); noticias: 273
(con imagen 49, sin imagen 224)` y la carga sube 76 imágenes (49 destacadas y 11 galerías). Si César agregó las
recuperadas (Parte 0), los números suben: anotar los que dé el simulacro, porque son los que se verifican en la Parte C.

- Código de salida `3`: hubo errores transitorios de red. Repetir **el mismo** comando con el mismo `$OUT`.
- De las noticias sin imagen, 148 nunca tuvieron una referencia de imagen en el volcado. El resto apunta a archivos que
  no están en ninguna fuente disponible (ver la Parte E).

### B11. Paso 8 — Fotos de los decanos (a mano, en el CMS)

La siembra de autoridades no sube fotos. En `$E/06-fotos-autoridades/` están las fotos de 5 decanos y
`fotos-decanos.csv`, que dice a quién corresponde cada archivo. Para cada fila: CMS → Media → subir el archivo con su
texto alternativo; luego CMS → Autoridades → abrir la persona → campo Foto → elegir la imagen → guardar.

Al terminar, cerrar la terminal para que se borren las contraseñas de la memoria de la sesión.

---

## Parte C — Verificación

### C1. En la base (VPS)

```bash
docker exec -i unc-postgres-prod sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < docs/deploy/consulta-datos-bd.sql
```

Sección 2, valores esperados:

| tabla | filas |
|---|---|
| facultades | 6 |
| carreras | 62 |
| aranceles_facultad | 130 |
| aranceles_rectorado | 24 |
| autoridades | 8 |
| tramites | 18 |
| calendario_academico | 3 |
| dependencias_contacto | 7 |
| convenios | 149 |
| linea_tiempo | 6 |
| marco_legal | 44 |
| transparencia_items | 28 |
| glosario_guarani | 128 + las que agregue el importador del glosario (su resumen) |
| ley5189 | 11 |
| reconocimientos | 1 |
| acreditaciones | 7 |
| tribunal_miembros | 5 |
| tribunal_documentos | 8 |
| noticias | 273 |
| media | 76 + las recuperadas del Internet Archive + 5 fotos (según B10 y B11) |
| tesis | 0 (sin fuente, ver la Parte E) |

### C2. Prueba de no duplicación

Repetir el Paso 3 (B6, la carga real) y el Paso 6 (B9). Todos deben informar 0 creados («ya existe» u «omitido»), y
la consulta C1 debe dar los mismos números.

### C3. En el CMS y en el portal

- CMS (`https://cms.unc.edu.py/admin`): Noticias muestra 273 publicadas, y Facultades muestra 6.
- Portal: abrir `/es/facultades`, una facultad, `/es/autoridades`, `/es/tramites`, `/es/calendario-academico`,
  `/es/convenios`, `/es/noticias` (una noticia de 2025 con imagen) y `/es/legalizaciones`. Si una página sigue mostrando
  «sin contenido», esperar 1 minuto (caché) y recargar.

---

## Parte D — Revertir (solo si algo salió mal)

Devuelve la base y los archivos al estado de la Parte A3. Se pierde todo lo cargado después del respaldo.

**Si se usó la opción 1 de A3 (respaldo cifrado):** seguir `docs/BACKUP_RECOVERY.md`, sección de restauración
(primero la base y después `scripts/backup/restore-media.sh`).

**Si se usó la opción 2 de A3:**

```bash
cd /opt/unc-portal
COMPOSE="docker compose -f infrastructure/docker/compose.prod.yaml --env-file infrastructure/docker/.env.prod"
UTC=<el valor anotado en A3>
# Comprobar que los dos respaldos se pueden leer ANTES de tocar nada (si alguno falla, detenerse):
docker exec -i unc-postgres-prod pg_restore --list < backups/pre-carga-$UTC.dump > /dev/null && echo "BD ok"
tar -tzf backups/pre-carga-media-$UTC.tar.gz > /dev/null && echo "media ok"
$COMPOSE stop portal cms
docker exec -i unc-postgres-prod sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --single-transaction' < backups/pre-carga-$UTC.dump
$COMPOSE up -d cms
docker exec unc-cms-prod sh -c 'find /app/media -mindepth 1 -delete'
docker exec -i unc-cms-prod tar -xzf - -C /app/media < backups/pre-carga-media-$UTC.tar.gz
$COMPOSE up -d portal
```

Después, repetir la consulta A2: debe coincidir con `backups/estado-antes-de-la-carga.txt`.

---

## Parte E — Lo que esta carga no incluye

| Pendiente | Por qué | Quién |
|---|---|---|
| Imágenes de noticias que no están en el Internet Archive | El sitio anterior ya no las sirve. Además, 199 noticias tienen un `_thumbnail_id` cuyo adjunto no está en el volcado, así que ni siquiera se conoce el nombre del archivo | César pide al hosting anterior (MITIC o el respaldo de WPvivid) la carpeta `wp-content/uploads` y un volcado completo de la base; con eso se repiten la Parte 0 y el Paso 7 |
| Tesis | No hay tesis en el WordPress anterior, ni en el volcado de 2026-08-08, ni en la base local | Dirección de Posgrado o Biblioteca: definir la fuente (lista o repositorio institucional) |
| Documentos de la Ley 5282 | La página del sitio anterior era un ejemplo sin enlaces | Unidad de transparencia: completar `docs/specs/portal/plantilla-transparencia-leyes.csv` |
| Autoridades de la FACET (29) y sus fotos | Su guion (`seedFacetAutoridades.ts`) usa la API local de Payload y no puede apuntar a producción | Pendiente de portarlo a la API REST |
| Fotos del rector, el vicerrector y el decano de la FACET | No están en la carpeta de imágenes recuperadas | Se suben desde el CMS cuando se tengan |

**No usar** `setup/seed.dump.gz` ni `scripts/setup/restore-data-prod.sh` (DEPLOY.md, Paso 15). Ese volcado copia la
tabla `users` de desarrollo, que tiene datos personales y hashes, no coincide con el esquema actual y ya no está en
el repositorio.
