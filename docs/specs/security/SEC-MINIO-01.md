# SEC-MINIO-01 — Clave de MinIO filtrada, lint roto y política pública del bucket

**Estado:** implementado en local, sin commit. **Tarea:** SEC-MINIO-01. **Alcance:** solo archivos versionados; no se tocó ningún `.env`, no se encendió Docker/MinIO, no hubo pruebas contra producción.

## 1. Alcance

| Parte | Problema | Cambio |
|---|---|---|
| A | `npm run lint` llamaba a `next lint`, que no existe en Next 16.4.3 | `package.json`: `eslint app components lib i18n proxy.ts --ext .ts,.tsx,.js,.mjs` (mismos directorios que cubría `next lint`, más `i18n` y `proxy.ts`). `harness/check.mjs --full` invoca `npm run lint`, por lo que no requiere cambios. Se corrigieron los 5 errores previos (3 comillas sin escapar en `informacion-publica/page.tsx`, 2 comentarios `eslint-disable` de una regla inexistente en `lib/i18n/server.ts`). |
| B | La clave secreta y el usuario de MinIO estaban en 3 archivos versionados | `scripts/minio/setup-bucket.sh`, `scripts/minio/check-minio.ps1` y `docs/FASE-4-MINIO-DIAGNOSTICO.md` usan variables de entorno o marcadores `<MINIO_SECRET_KEY>`; fallan con mensaje claro si faltan. Guard nuevo `guard-minio-secrets`. |
| C | Dos scripts publicaban el bucket completo | Ver §3. |

## 2. Evidencia (RDD)

- **Hecho observado:** el valor estaba en `HEAD` en las 3 rutas anteriores y entró en los commits `c331a50` y `b44e3a4` (`git log -S`). Tras el cambio, `git grep` del valor en el árbol de trabajo no da resultados.
- **Hecho observado:** `apps/cms/.env` e `infrastructure/docker/.env` (no versionados) contienen el mismo valor. No se editaron ni se imprimieron.
- **Hecho observado:** `Media` no usa `prefix` (`apps/cms/src/collections/Media.ts:120-121`; MIG-IMG §4.1 y fila `prefix`: «mantener así»), y `s3Storage` solo registra la colección `media` (`apps/cms/src/payload.config.ts:239-246`). Las claves son nombres de archivo planos. No existe un prefijo de media que acotar con evidencia.
- **Hecho observado:** `mc anonymous set download` concede únicamente lectura de objetos (`s3:GetObject`); no concede listado ni escritura. Esto proviene de la definición de la política `download` de MinIO Client (sin ListBucket); **no se probó contra un MinIO real** (sin Docker autorizado). Verificación pendiente: `curl` anónimo a `https://files.unc.edu.py/<bucket>/` debe devolver 403/AccessDenied, y un objeto conocido 200.
- **Contexto:** MIG-IMG §«Media.read»: las 237 imágenes ya eran públicas en WordPress y se decidió mantener lectura pública de media; `files.unc.edu.py` (nginx) es opcional y con `MEDIA_STORAGE=local` responde 502 (MIN-01).

## 3. Decisiones

1. **Dev (`setup-bucket.sh`):** el bucket queda **privado por defecto**. `MINIO_PUBLIC_READ=1` lo publica (con ADVERTENCIA en el log) y usa `mc anonymous set download` en vez de la política `public` anterior (que además permitía escritura anónima en versiones de `mc` antiguas).
2. **Producción (`init-minio.sh`):** la lectura anónima pasa a **opt-in** (`MINIO_PUBLIC_READ=1`) y se aplica sobre `prod/$S3_BUCKET/${MINIO_PUBLIC_MEDIA_PREFIX}`. Como el prefijo de media **no puede establecerse con evidencia** (claves planas), el prefijo por defecto es vacío, es decir toda la raíz, con ADVERTENCIA. Esto es aceptable solo mientras el bucket contenga únicamente `media`. Si cambia, definir `prefix` en Media (cambia esquema, ver MIG-IMG §4.1) y `MINIO_PUBLIC_MEDIA_PREFIX` a la vez.
3. **Efecto operativo:** quien despliegue con S3 debe exportar `MINIO_PUBLIC_READ=1` al ejecutar `init-minio.sh`; sin eso el bucket queda privado y las imágenes públicas darán 403. Es deliberado (falla cerrada).

## 4. Pruebas

`tests/unit/sec-minio-01.spec.ts` (6 pruebas: lint sin `next lint`, valor filtrado ausente de archivos versionados —el valor se lee de `HEAD` y de `apps/cms/.env` y nunca se imprime—, sin literales largos de clave, helpers que exigen entorno, política dev opt-in, política prod con opt-in y prefijo) y `harness/guards.test.mjs` (`guard-minio-secrets`, ahora 12 guards). Todas se escribieron antes del cambio y fallaron (RED).

## 5. Rollback

`git checkout` de los archivos listados (los cambios están sin commit; no usar en archivos de otras personas). Para volver al comportamiento previo de producción basta ejecutar `init-minio.sh` con `MINIO_PUBLIC_READ=1`.

## 6. Riesgo remanente y acciones del PO

La clave **sigue en el historial público de git** (commits `c331a50`, `b44e3a4`) y en los `.env` locales. Quitarla del árbol no la invalida.

1. **Rotar** la credencial de MinIO en todo entorno que la haya usado (usuario/clave raíz y `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY`), y actualizar `apps/cms/.env`, `infrastructure/docker/.env` y los secretos del servidor.
2. Decidir si se reescribe el historial (`git filter-repo`); sin eso la clave es irrecuperable, por lo que la rotación es obligatoria igualmente.
3. Confirmar que el bucket de producción solo aloja `media` (si no, definir prefijo).
4. Probar en staging autorizado que el listado anónimo está denegado.
5. Revisar si MinIO estuvo alguna vez expuesto en Internet con esa clave (logs de acceso).
