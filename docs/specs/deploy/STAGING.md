# Staging con datos sintéticos (SEC-027, opción B)

**Tarea:** SEC-027 — ensayo previo a publicar. **Decisión del propietario (2026-11-07):** opción B (mismo servidor que producción, otros puertos y otra base) y entrada por túnel SSH, sin subdominio público.

## 1. Objetivo y límites

Ensayar, con datos inventados, las migraciones (`calendario_01`, `legales_01`, `legalizaciones_01`), las siembras y el recorrido de las páginas nuevas antes de fusionar a `main` (que dispara `deploy.yml`).

**Qué cubre:** migraciones sobre una base con las migraciones anteriores ya aplicadas, siembras, páginas con CMS real, ISR/revalidación, respaldo y restauración de la base de staging.
**Qué NO cubre (sigue «no cubierto» en SEC-027):** nginx, TLS, `x-real-ip`, límite de tasa por IP, ruta pública `/api/media/file`, S3, correo y Sentry.

## 2. Reglas de aislamiento (las vigila `tests/deploy/staging-isolation.test.mjs`)

- S1 Proyecto `unc-staging`, contenedores `*-staging`, volúmenes `*_staging` y red `unc-staging-internal`; nada compartido con producción.
- S2 Solo el portal (`127.0.0.1:3100`) y el CMS (`127.0.0.1:3102`) publican puertos, y solo en loopback. Sin 80/443.
- S3 Sin nginx, sin S3 y sin imágenes de `ghcr.io`: las imágenes se construyen en el servidor desde el commit a ensayar.
- S4 Postgres propio; secretos propios generados nuevos; `.env.staging` fuera del repositorio; nunca se lee `.env.prod`.
- S5 Sin SMTP, sin Sentry y sin webhook: no se envía nada a personas ni se mezcla con producción.
- S6 Solo datos sintéticos; ningún dato real, ningún respaldo de producción restaurado aquí.

## 3. Aceptación (Given/When/Then)

- **Dado** staging levantado, **cuando** corre `cms-migrate`, **entonces** termina con código 0 y la base queda con las tres migraciones registradas.
- **Dado** el CMS de staging con un `superadmin` sintético, **cuando** se corren las siembras con `--apply` por el túnel, **entonces** cada una informa «creados» y una segunda corrida informa «omitidos».
- **Dado** el portal de staging, **cuando** se abren `/calendario-academico`, `/privacidad`, `/accesibilidad`, `/legalizaciones`, `/mapa-sitio`, `/buscar` y `/revistas` (en es y en un idioma más), **entonces** muestran contenido, sin errores de servidor en los registros.
- **Dado** un respaldo `pg_dump` de la base de staging, **cuando** se restaura en una base vacía de staging, **entonces** el conteo de filas de las tablas nuevas coincide.
- **Dado** staging detenido (`down`), **entonces** los contenedores, volúmenes y la red de producción siguen intactos.

## 4. Riesgos y rollback

- **Riesgo:** compartir máquina con producción (CPU, memoria y disco durante la construcción de imágenes). Mitigación: construir fuera del horario de mayor uso y apagar staging al terminar.
- **Rollback:** `down -v` con el archivo de staging borra solo recursos `*staging*`.

## 5. Supuestos verificados

Verificado el 2026-11-08 con Docker real (instalador, desde cero): el CMS en `NODE_ENV=production` con URLs `http://localhost` y sin SMTP **sí arranca**, queda sano y responde; las migraciones se aplican y el portal sirve las páginas nuevas. Detalle en `odd/tasks/paquete-despliegue.md` (L6).
