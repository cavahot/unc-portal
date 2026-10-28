# S3-SEAWEEDFS-01 — Almacén S3 opcional: de MinIO a SeaweedFS

**Estado:** implementado en local, sin commit. **Tarea:** S3-SEAWEEDFS-01 (continúa MIN-01 y SEC-MINIO-01; cierra DEP-11 para la imagen del almacén).
**Alcance:** infraestructura (Compose, nginx, scripts, deploy.yml, backup, harness, docs). El código del CMS no cambia: ya usa `@payloadcms/storage-s3` con `endpoint` y `forcePathStyle: true`.

## 1. Contexto

- El almacén S3 es **opcional** (perfil `s3` de `compose.prod.yaml`; solo se usa con `MEDIA_STORAGE=s3`). Por defecto los archivos van al volumen `cms_media`.
- La imagen `quay.io/minio/minio` ya no se puede descargar (HTTP 401) y las imágenes comunitarias de MinIO dejaron de publicarse, de modo que el servicio no arrancaba y quedaba sin fijar (`:latest`, DEP-11), lo que mantenía en rojo `guard-deploy-steps`.

## 2. Decisión

Reemplazar MinIO por **SeaweedFS** (S3 compatible), imagen `chrislusf/seaweedfs:4.51` **fijada por digest**:

```
chrislusf/seaweedfs:4.51@sha256:f7a49e3f3972ebed5be2ed4befa4a0c68eb7bdddba6e692d42729ceb545134b8
```

Alternativas descartadas: seguir con MinIO (sin imagen descargable); construir MinIO desde fuentes (mantenimiento propio de una pieza de seguridad); almacenamiento local únicamente (ya es el valor por defecto, pero se quiere conservar la opción S3).

## 3. Evidencia (RDD)

| Tipo | Hecho |
|---|---|
| Hecho observado | `quay.io/minio/minio` responde 401 al intentar descargarla. |
| Hecho observado (spike local, 12/12 comprobaciones) | Con el comando de §4: bucket creado por la API S3 con la identidad Admin; PutObject; multipart (11 MiB) con `@aws-sdk/lib-storage`; Get/Delete; path-style; `GET /healthz` = 200 sin credenciales; `GET /` = 403; la identidad `anonymous` con `Read:<bucket>` permite GET de objetos y **deniega** listado, PUT y DELETE anónimos. |
| Hecho observado (verificación de esta tarea, proyecto Compose aislado `unc-s3-verify`) | El servicio queda `healthy`; `scripts/s3/setup-bucket.mjs` crea el bucket y es idempotente (`--check` devuelve 1 antes y 0 después); con `S3_PUBLIC_READ=1` el GET anónimo da 200 y listado/PUT/DELETE anónimos dan 403; con `S3_PUBLIC_READ=0` el GET anónimo da 403; el entrypoint falla cerrado con claves vacías o cortas. |
| Hecho observado | La imagen trae `wget` (healthcheck) y su `/entrypoint.sh` corrige permisos de `/data` y baja a `seaweed` con `su-exec`. |
| Hipótesis / riesgo | La estabilidad en carga real, el rendimiento con 237+ imágenes y la compatibilidad de futuras versiones de `@payloadcms/storage-s3` no se midieron. |

## 4. Contrato

- Servicio `s3`: `unc-s3-local` (`infrastructure/docker/compose.yaml`) y `unc-s3-prod` (`compose.prod.yaml`, perfil `s3`, **no** se nombra en el `up -d` de `deploy.yml`). Ningún servicio por defecto depende de él.
- Comando efectivo (vía `infrastructure/docker/s3/entrypoint.sh`): `server -s3 -dir=/data -ip.bind=0.0.0.0 -s3.config=/tmp/s3.json -volume.max=0 -master.volumeSizeLimitMB=1024`; S3 en el puerto 8333.
- Puertos: local `127.0.0.1:9100 -> 8333` (mismo puerto que tenía MinIO, así `S3_ENDPOINT` no cambia); producción **no publica** puerto: nginx y el CMS lo alcanzan en `unc-s3-prod:8333` / `s3:8333` por la red `internal`. No hay consola web.
- Healthcheck: `wget -qO- http://127.0.0.1:8333/healthz`. **No** sondear `/` (403 sin firma).
- Variables: `S3_ACCESS_KEY_ID` (>= 16 caracteres), `S3_SECRET_ACCESS_KEY` (>= 32), `S3_BUCKET` (por defecto `unc-media`), `S3_PUBLIC_READ` (`1` abre lectura anónima; por defecto `0`). Caracteres admitidos en las claves: `A-Z a-z 0-9 + / = _ . -`. Los nombres `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` desaparecen.
- El JSON de identidades **no se versiona**: `entrypoint.sh` (montado de solo lectura en `/s3-entrypoint.sh`; si se montara en `/entrypoint.sh` pisaría el de la imagen y entraría en bucle) lo renderiza en `/tmp/s3.json` (modo 600) desde el entorno. Falla cerrado, sin imprimir valores, si faltan o son cortas las claves. `.gitattributes` fuerza finales LF en ese archivo.
- Identidades: `cms` con `Admin, Read, Write, List, Tagging`; `anonymous` **solo** con `S3_PUBLIC_READ=1` y `Read:<bucket>`.
- Bucket: se crea por la API S3 con `node scripts/s3/setup-bucket.mjs` (`--check` solo verifica) antes de arrancar el CMS con `MEDIA_STORAGE=s3`. Sustituye a `scripts/minio/*` y `scripts/setup/init-minio.sh`.
- nginx (`files.unc.edu.py`): destino `unc-s3-prod:8333` resuelto por petición (`resolver 127.0.0.11`, sin `upstream` estático), `limit_except GET HEAD { deny all; }` y las cabeceras `Strict-Transport-Security` y `X-Content-Type-Options: nosniff` repetidas dentro del `location` (SeaweedFS no las añade y un `add_header` local anula las del `server`).
- Volúmenes: `minio_data` pasa a `s3_data` (`unc_s3_data`, `unc_s3_data_prod`).
- `guard-minio-secrets` pasa a `guard-s3-secrets` (cualquier asignación literal de clave secreta S3, incluida la forma JSON `"secretKey"`); `tests/unit/sec-minio-01.spec.ts` pasa a `sec-s3-01.spec.ts` y conserva la detección del valor filtrado en `c331a50`.

## 5. Escenarios de aceptación (Given/When/Then)

1. **Sin claves.** *Given* `S3_ACCESS_KEY_ID` vacío o `S3_SECRET_ACCESS_KEY` < 32 caracteres, *When* arranca el contenedor, *Then* termina con código distinto de 0 y un mensaje que no contiene ningún valor (`tests/deploy/s3-entrypoint.test.mjs`).
2. **Por defecto cerrado.** *Given* `S3_PUBLIC_READ` distinto de `1`, *Then* el JSON solo contiene `cms` y el GET anónimo responde 403.
3. **Lectura pública acotada.** *Given* `S3_PUBLIC_READ=1`, *Then* `anonymous` solo tiene `Read:<bucket>`: GET de objetos 200; listado, PUT y DELETE anónimos 403.
4. **Perfil opcional.** *Given* el `up -d` por defecto, *Then* `s3` no se arranca, el CMS no depende de él y `files.*` responde 502 si no existe (esperado).
5. **Imagen fijada.** *Then* ninguna imagen del compose usa `:latest` y `guard-deploy-steps` queda sin hallazgos.
6. **Bucket idempotente.** *When* se ejecuta dos veces `setup-bucket.mjs`, *Then* ambas terminan con código 0; `--check` falla (1) si el bucket no existe.
7. **Solo lectura pública en nginx.** *Then* `files.*` rechaza métodos distintos de GET/HEAD y conserva nosniff y HSTS.

## 6. Rollback

- Revertir el commit restaura el compose con MinIO, pero esa imagen **no se descarga**: el rollback real es `MEDIA_STORAGE=local` (valor por defecto) y recrear el CMS; los archivos subidos a S3 quedan en el volumen `s3_data` (no se borran).
- Los volúmenes antiguos `unc_minio_data` / `unc_minio_data_prod` no se tocan ni se migran.

## 7. Límites y riesgos remanentes

- **Datos previos.** El volumen de MinIO **no se migra** automáticamente (formato de almacenamiento distinto). MinIO nunca se usó en producción según el dueño; si hubiera datos, copiarlos con `aws s3 sync` o `rclone` hacia el nuevo endpoint.
- **Mismo destino de fallo.** El volumen `s3_data` está en el mismo disco que Postgres: la copia **fuera del servidor** sigue siendo obligatoria (`docs/BACKUP_RECOVERY.md`). La instantánea `tar` de `/data` se toma en caliente y puede no ser consistente con subidas en curso; `aws s3 sync` es consistente por objeto.
- La longitud de las claves no mide su entropía: generarlas con `openssl rand`.
- No se probó el servicio `s3` del `compose.prod.yaml` con el stack completo ni con certificados reales; sí se validó su configuración (`docker compose config`) y el equivalente local.
- El tamaño de la imagen y el consumo de memoria de SeaweedFS no se evaluaron para el servidor de producción.

## 8. Cómo actualizar la imagen

1. Elegir el tag (p. ej. `4.52`), descargarlo y leer su digest: `docker pull chrislusf/seaweedfs:<tag>` y `docker image inspect chrislusf/seaweedfs:<tag> --format '{{index .RepoDigests 0}}'`.
2. Repetir el spike (§3: arranque, healthcheck, bucket, put/get, multipart, anónimo permitido/denegado) en un proyecto Compose aislado (`docker compose -p unc-s3-verify ...`, `down -v` al terminar).
3. Cambiar el mismo `image:` en `compose.yaml` y `compose.prod.yaml` (los tests exigen que coincidan y que sea `tag@sha256:...`), ejecutar `tests/deploy/compose-s3-optional.test.mjs` y `node harness/check.mjs --quick`.
4. Revisar de nuevo `entrypoint.sh` frente al `/entrypoint.sh` de la nueva imagen (hereda el ajuste de permisos y la bajada de privilegios).

## 9. Pruebas

`tests/deploy/compose-s3-optional.test.mjs` (perfil, dependencias, digest, defaults vacíos, entrypoint, healthcheck, puertos, volumen), `tests/deploy/s3-entrypoint.test.mjs` (falla cerrada, JSON de identidades, flags), `tests/deploy/nginx-cms-limits.test.mjs` (upstream perezoso, GET/HEAD, cabeceras), `tests/deploy/deploy-warmup-and-media-guard.test.mjs` (guard `S3_ACCESS_KEY_ID` sin `MEDIA_STORAGE`), `tests/deploy/backup-s3-conditional.test.mjs`, `tests/unit/sec-s3-01.spec.ts`, `harness/guards.test.mjs` (`guard-s3-secrets`, `guard-deploy-steps` en verde). Se escribieron antes del cambio y fallaron (RED).
