# Manual de migración completa del contenido a producción

**Para:** el desarrollador que hace el deploy. **Tiempo:** unos 20 minutos, con el portal fuera de línea durante 5 a
10 minutos. **Resultado:** producción queda con **todo** el contenido de la base de trabajo: noticias, imágenes,
transparencia, Ley 5189, reconocimientos, acreditaciones, carreras, aranceles, glosario guaraní, usuarios, etc.

## Cómo funciona, en tres frases

1. César genera en su PC un **paquete** con todos los datos de la base y todas las imágenes.
2. En el servidor, la base actual **no se borra**: se renombra y queda como respaldo. Después se crea una base nueva
   cuyas tablas crean las migraciones del CMS, igual que en cualquier deploy.
3. El script carga los datos del paquete en esa base nueva y **verifica** que cada tabla tenga las mismas filas y cada
   imagen el mismo tamaño que en el origen. Si algo no coincide, se detiene y lo dice.

> El paquete contiene contraseñas cifradas de usuarios y datos personales. No lo subas a git, a Drive ni a ningún
> chat. Cópialo solo con `scp` y bórralo al terminar (paso 9).

---

## Parte 1 — En la PC de César (Git Bash, en la carpeta `unc-portal`)

```bash
U=$(docker exec unc-postgres-local sh -c 'echo $POSTGRES_USER')
SOURCE_DATABASE_URL="postgresql:///unc_portal?user=$U" \
SOURCE_PG_CONTAINER=unc-postgres-local \
MEDIA_SOURCE_DIR=apps/cms/media \
  scripts/migrate/full-migration.sh export ~/paquete-migracion
```

Al final debe decir: `Exportado: 109 tablas, … filas, 130 archivos de media.` (los números pueden crecer).

Copiar el paquete y el script al servidor:

```bash
scp -r ~/paquete-migracion scripts/migrate/full-migration.sh usuario@servidor:/tmp/
```

---

## Parte 2 — En el servidor (desarrollador)

Cada paso trae lo que **debe** aparecer en pantalla. Si aparece otra cosa, no sigas: ve a «Si algo sale mal».

### Paso 1. Entrar y preparar

```bash
ssh usuario@servidor
cd /opt/unc-portal
sudo mkdir -p backups/migracion && sudo mv /tmp/paquete-migracion /tmp/full-migration.sh backups/migracion/
COMPOSE="docker compose -f infrastructure/docker/compose.prod.yaml --env-file infrastructure/docker/.env.prod"
export IMAGE_TAG=$(docker inspect -f '{{.Config.Image}}' unc-cms-prod | cut -d: -f2)
echo "$IMAGE_TAG"
```

Debe mostrar la versión en uso, por ejemplo `sha-1a2b3c4`. Si sale vacío, pregunta qué versión está desplegada.

### Paso 2. Detener el portal y el CMS

```bash
$COMPOSE stop portal cms
```

Debe decir `Stopped` para los dos. Desde aquí el sitio queda fuera de línea.

### Paso 3. Apartar la base actual (respaldo) y crear una vacía

```bash
docker exec unc-postgres-prod sh -c 'psql -U "$POSTGRES_USER" -d postgres -c "ALTER DATABASE \"$POSTGRES_DB\" RENAME TO \"${POSTGRES_DB}_pre_migracion\"" && createdb -U "$POSTGRES_USER" "$POSTGRES_DB"'
```

Debe decir `ALTER DATABASE`. Si dice `is being accessed by other users`, algo sigue conectado: repite el paso 2 y
espera 10 segundos.

### Paso 4. Apartar las imágenes actuales (respaldo) y dejar la carpeta vacía

```bash
V=$(docker volume inspect -f '{{.Mountpoint}}' unc_cms_media_prod)
sudo tar -czf backups/migracion/media-pre-migracion.tar.gz -C "$V" .
sudo find "$V" -mindepth 1 -delete
sudo ls -A "$V" | wc -l
```

El último comando debe mostrar `0`.

### Paso 5. Crear las tablas con las migraciones del CMS

```bash
$COMPOSE run --rm cms-migrate
```

Debe terminar en `Done.` sin errores.

### Paso 6. Cargar los datos y las imágenes

```bash
U=$(docker exec unc-postgres-prod sh -c 'echo $POSTGRES_USER'); D=$(docker exec unc-postgres-prod sh -c 'echo $POSTGRES_DB')
sudo TARGET_DATABASE_URL="postgresql:///$D?user=$U" TARGET_PG_CONTAINER=unc-postgres-prod MEDIA_TARGET_DIR="$V" \
  bash backups/migracion/full-migration.sh import backups/migracion/paquete-migracion
sudo chown -R 1001:1001 "$V"
```

La última línea del script debe decir:
`OK: 109 tablas con conteo idéntico, … filas, 130 archivos de media idénticos en nombre y tamaño.`

### Paso 7. Arrancar

```bash
$COMPOSE up -d cms portal
$COMPOSE ps
```

`cms` y `portal` deben quedar `running` (o `healthy` al minuto).

### Paso 8. Comprobar en el navegador

- `https://cms.unc.edu.py/admin`: entrar, abrir **Noticias** y **Transparencia**, que deben tener contenido.
- `https://www.unc.edu.py/noticias`: una noticia con su imagen visible.
- `https://www.unc.edu.py/transparencia`, `/facultades` y `/autoridades`: ninguna dice «sin contenido».
  Si alguna lo dice, espera 1 minuto (caché) y recarga.

**Importante:** los usuarios del CMS ahora son los de la base de César, con sus contraseñas. Avisa a César para que
cada uno entre y cambie su contraseña.

### Paso 9. Limpiar

Cuando César confirme que todo está bien (sugerido: después de 7 días):

```bash
sudo rm -rf backups/migracion/paquete-migracion
docker exec unc-postgres-prod sh -c 'dropdb -U "$POSTGRES_USER" "${POSTGRES_DB}_pre_migracion"'
```

César borra también `~/paquete-migracion` de su PC.

---

## Si algo sale mal

| Mensaje | Qué significa | Qué hacer |
|---|---|---|
| `las sumas no coinciden` | El paquete se dañó al copiarlo | Repetir el `scp` de la Parte 1 |
| `la base de destino no tiene tablas` | Faltó el paso 5 | Hacer el paso 5 y repetir el 6 |
| `la base de destino YA tiene N filas` | La base no es la nueva | Revisar el paso 3 |
| `MEDIA_TARGET_DIR no está vacía` | Faltó vaciar las imágenes | Repetir el paso 4 |
| `column "…" … does not exist` u otro error de SQL | El CMS desplegado es más viejo que la base de César | No reintentar. Volver atrás y pedir a César que se despliegue primero la versión actual del código |
| `DIFERENCIA en …` | La copia quedó incompleta | Volver atrás y avisar a César con el texto completo del error |

Si el paso 6 falla, la base nueva queda **sin datos**: la carga es todo o nada.

## Volver atrás (deja producción como estaba antes del paso 2)

```bash
$COMPOSE stop portal cms
docker exec unc-postgres-prod sh -c 'dropdb -U "$POSTGRES_USER" "$POSTGRES_DB" && psql -U "$POSTGRES_USER" -d postgres -c "ALTER DATABASE \"${POSTGRES_DB}_pre_migracion\" RENAME TO \"$POSTGRES_DB\""'
sudo find "$V" -mindepth 1 -delete
sudo tar -xzf backups/migracion/media-pre-migracion.tar.gz -C "$V" && sudo chown -R 1001:1001 "$V"
$COMPOSE up -d cms portal
```

---

## Para quien quiera saber más

- Script: `scripts/migrate/full-migration.sh` (comandos `export`, `import` y `verify`). `verify` repite solo la
  comprobación del paso 6 sin tocar nada.
- **Por qué no se copia el esquema de la base de César:** esa base se creó en modo desarrollo (`payload_migrations`
  contiene solo «dev»). Si se copiara su esquema, el `cms-migrate` de los próximos deploys intentaría crear tablas que
  ya existen y fallaría. Por eso el esquema lo crean las migraciones (paso 5) y el script solo carga los datos, sin
  la tabla `payload_migrations`.
- La carga usa `--disable-triggers` para no depender del orden de las tablas. Necesita el usuario `POSTGRES_USER` del
  contenedor, que es superusuario.
- Prueba local del 19-11-2026:
  - La carga sobre una base creada con las 25 migraciones dio 109 tablas, 11 953 filas y 130 imágenes idénticas.
  - Después de la carga, `payload migrate` no tuvo nada que aplicar.
  - Las secuencias quedaron por encima del id máximo.
  - El script rechazó una base sin tablas, una base con datos, un archivo faltante y un paquete alterado.
