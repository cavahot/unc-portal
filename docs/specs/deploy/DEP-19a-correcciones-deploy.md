# DEP-19a — Correcciones de `deploy.yml` (disparador, segundo deploy, concurrencia, secretos)

**Estado:** implementación local propuesta; **nada de esto se ha probado con Docker, ssh-action, `flock` del host ni GitHub Actions reales** (ver «Pendientes de validación real»). **Origen:** revisiones fresca de riesgo y de resiliencia sobre DEP-07/DEP-09 (hallazgos: disparador por fork, segundo deploy, concurrencia, secretos en el script). **Formato:** SEC-005. **RDD:** `docs/research/evidence-register.md` (RDD-DEP-43 … RDD-DEP-49). No autoriza pentest ni despliegue. Tarea relacionada: `docs/security/TASK-SEC-001-hardening-portal-unc.md`.

## Problema (hecho observado)

1. **Segundo deploy roto.** `compose.prod.yaml` fija `container_name: unc-cms-migrate-prod` en `cms-migrate` y `cms` depende de él (`service_completed_successfully`). El `up -d` del deploy lo relanza **sin `timeout`** y lo deja `Exited`; el siguiente deploy ejecuta `run --rm --name unc-cms-migrate-prod` → «name already in use» y el deploy aborta (RDD-DEP-43).
2. **Disparador.** `on.workflow_run.branches: [main]` filtra por el *nombre* de la rama de cabeza; un PR desde un fork cuya rama se llame `main` también lo cumple. El job `check-ci` solo miraba `conclusion == 'success'` (RDD-DEP-44).
3. **Concurrencia y cortes.** No hay `concurrency`, ni exclusión en el host, ni registro de salidas anormales; `appleboy/ssh-action` corta la sesión a los 10 min por defecto, menos que un `migrate` legítimo (600 s + 30 s) más el gate (RDD-DEP-45, RDD-DEP-46).
4. **Secretos en el texto del script.** `${{ secrets.GHCR_READ_TOKEN }}` y `${{ github.actor }}` se expanden **antes** de enviar el script: el token queda en su texto y un valor con comillas o `$(…)` se ejecutaría como shell (RDD-DEP-47).

## Contrato

### A. Segundo deploy (decisión)

Se aplican **ambas** correcciones, porque cubren causas distintas:

- **A1 — `up -d --no-deps … ` explícito.** El `up` final lista los servicios **sin `cms-migrate`**: `up -d --no-deps --remove-orphans postgres minio cms portal nginx`. El esquema solo se toca en el paso con backup previo y `timeout`; el `up` ya no puede relanzar el migrador.
- **A2 — limpieza previa del residuo.** Antes del `run`, se eliminan con `docker ps -aq --filter … | xargs -r docker rm -f` el contenedor de nombre exacto `unc-cms-migrate-prod` y cualquiera con la etiqueta `com.docker.compose.service=cms-migrate`. Si la limpieza falla → `exit 1` antes de migrar (el `run` fallaría igual). Sin residuo no hay ni error ni aviso.

**Alternativas descartadas (justificación):**

| Alternativa | Por qué no |
|---|---|
| Solo A1 | No arregla el residuo que ya existe en el servidor (de un deploy anterior o del arranque manual de `DEPLOY.md`); el primer deploy tras este cambio chocaría. |
| Solo A2 | El `up` seguiría relanzando el migrador sin `timeout` ni backup vigente (la ambigüedad del `depends_on` persiste). |
| Quitar `cms → cms-migrate` de `depends_on` | Elimina la barrera DEP-07 C8 para el arranque manual (`up -d` sin migrar sobre una BD vacía). El arranque manual documentado se mantiene intacto dejando el `depends_on` como está. |
| `up -d --no-deps cms portal nginx` (solo esos) | Un cambio de configuración de `postgres`/`minio` en el compose dejaría de aplicarse en los deploys. Por eso se listan también (RDD-DEP-43). |

`compose.prod.yaml` **no se modifica**. Un `up -d` manual sin `--no-deps` (DEPLOY.md) relanza `cms-migrate` (idempotente, forward-only) y lo deja `Exited`; el siguiente deploy de CI lo limpia (A2).

**Invariante de mantenimiento:** si se añade un servicio a `compose.prod.yaml`, debe añadirse a la lista del `up` (la prueba compara ambas listas).

### B. Disparador endurecido

`check-ci.if` exige, unidas con `&&`: `workflow_run.conclusion == 'success'`, `workflow_run.event == 'push'`, `workflow_run.head_repository.full_name == github.repository` y `workflow_run.head_branch == 'main'`. `build-images` depende de `check-ci` y `deploy` de `build-images`; si el gate se omite, se omite toda la cadena. **Límite:** confía en que CI solo corre en `push` a `main`/`develop` del propio repositorio y no verifica protección de rama.

### C. Concurrencia, lock, trap y timeout

- **Workflow:** `concurrency: { group: deploy-prod, cancel-in-progress: false }` a nivel de workflow (no de job): los runs se encolan en orden de disparo y un commit viejo no despliega después de uno nuevo; nunca se cancela un deploy en curso. GitHub conserva un solo pendiente por grupo (el más reciente reemplaza al pendiente anterior): aceptable, gana el último commit.
- **Host (`flock`):** tras validar `IMAGE_TAG`/credenciales y `cd /opt/unc-portal`: `exec 9>".deploy.lock"` + `flock -n 9`. Lock tomado → `exit 1` con «Hay otro deploy en curso», **sin llamar a docker ni escribir estado**. Sin binario `flock` → falla cerrado. El kernel libera el lock al morir el proceso (incluida una sesión huérfana).
- **Trap:** `trap … EXIT` (más `TERM`/`INT`/`HUP` → `exit 143/130/129` para que el trap corra) escribe `.deploy-last-failure` (`<UTC> tag=<tag> rc=<n>`, archivo temporal + `mv`) ante cualquier salida != 0. **Nunca** toca `.deploy-previous-tag`. Se arma **después** del lock para que un deploy rechazado no pise el registro del que está corriendo. Un deploy sano borra `.deploy-last-failure`. Límite: `SIGKILL` no ejecuta trap.
- **`command_timeout: 35m`** del `ssh-action` (defecto 10 m). Cota de peor caso con los valores por defecto del script:

  | Tramo | s |
  |---|---|
  | pull + backup (supuesto) | 600 |
  | migrate: `timeout` 600 + `--kill-after` 30 | 630 |
  | `up -d` (supuesto) | 120 |
  | gate: 12 intentos × (5 s + 2 × `wget -T 3`) | 132 |
  | rollback: `up -d` 120 + 2.º gate 132 | 252 |
  | **Total** | **1734 s ≈ 29 min** → 35 m = 2100 s (≈ 20 % de margen) |

  La prueba recalcula la cota desde los valores por defecto del script y exige `cota ≤ command_timeout ≤ 1,5 × cota`. Los 600 s de pull/backup y 120 s de `up` son **supuestos**, no medidos.

### D. Secretos fuera del texto del script

El paso define `env: GHCR_USER: ${{ github.actor }}` y `GHCR_TOKEN: ${{ secrets.GHCR_READ_TOKEN }}` y `envs: IMAGE_TAG,GHCR_USER,GHCR_TOKEN`. El script no contiene ninguna expresión `${{ }}` (ni en comentarios, que también se expanden); hace `printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin`. Si falta alguna variable → `exit 1` antes de tocar docker, sin imprimir su valor. **Límite:** el token sigue existiendo en el entorno del proceso remoto y en el `export` que genera la acción; protege contra inyección y contra su aparición en el texto del script/`ps` del login, no contra un administrador del servidor.

## Escenarios Given/When/Then (negativos primero)

1. **Segundo deploy:** dado un primer deploy exitoso, cuando se ejecuta el segundo con otro `sha`, entonces termina con 0, no hay `migrate-conflict` y `.deploy-previous-tag` pasa al tag nuevo.
2. **El `up` no relanza el migrador:** dado el `up -d` final, entonces lleva `--no-deps`, no nombra `cms-migrate` y no queda un `cms-migrate` `Exited`; la lista = servicios del compose − `cms-migrate`.
3. **Residuo heredado:** dado un `unc-cms-migrate-prod` `Exited` previo, cuando corre el deploy, entonces se elimina **antes** del `run` y el deploy termina con 0.
4. **Sin residuo:** no hay error ni aviso «no se pudo limpiar».
5. **Fork con rama `main`:** dado `workflow_run.event == 'pull_request'` o `head_repository.full_name != github.repository` o `head_branch != 'main'`, entonces `check-ci` se omite y la cadena no corre (verificado como condición del YAML parseado, no ejecutando Actions).
6. **`||` en la condición:** una condición con `||` falla la prueba.
7. **Lock tomado:** dado otro deploy en curso, cuando arranca un segundo script, entonces `exit != 0`, mensaje «otro deploy», 0 llamadas a docker, estado intacto y sin `.deploy-last-failure`.
8. **Sin `flock`:** falla cerrado, sin docker.
9. **Falla el migrate o el gate:** `exit != 0`, `.deploy-previous-tag` **sin cambios**, `.deploy-last-failure` con el tag y el `rc`. Un deploy sano posterior lo borra.
10. **Lockfile:** se crea `.deploy.lock` junto al compose.
11. **`concurrency`:** `group: deploy-prod`, `cancel-in-progress: false` (booleano).
12. **`command_timeout`:** presente, ≥ cota de peor caso y ≤ 1,5 × cota.
13. **Secretos:** el bloque `script:` no contiene `${{`; el token entra por stdin (no por argumentos ni en la salida); `GHCR_TOKEN`/`GHCR_USER` salen de `secrets.GHCR_READ_TOKEN`/`github.actor` vía `env` y están en `envs`.
14. **Credenciales ausentes:** `GHCR_TOKEN` vacío → `exit != 0` sin llamadas a docker y el mensaje no contiene el valor.

## Trazabilidad escenario → prueba

| Escenario | Prueba (`tests/deploy/dep19a-deploy-fixes.test.mjs`) |
|---|---|
| 1–4 | bloque «(1)» (script real + shim `docker` con estado de contenedores) |
| 5–6 | bloque «(2)» (YAML parseado con el paquete `js-yaml`, dependencia declarada) |
| 7–10 | bloque «(3)» (shim `flock` y archivos de estado) |
| 11–12 | bloque «(3)» estático |
| 13–14 | bloque «(4)» |
| Regresión | `dep07-deploy-script.test.mjs` y `dep09-deploy-rollback.test.mjs` (ahora con shim `flock` y `GHCR_*` por entorno) |

## Extra evaluado y NO aplicado: `SENTRY_AUTH_TOKEN` en la caché de build (hallazgo MEDIO-3)

`deploy.yml` pasa `SENTRY_AUTH_TOKEN` como `build-args` y publica la caché con `cache-to: type=registry,…,mode=max`: un `ARG` usado en un `RUN` puede quedar en el historial de capas y en la caché publicada en ghcr.io. Opciones: `mode=min` (no exporta capas intermedias, pierde reutilización) o `--mount=type=secret` en el `Dockerfile` (+ `secrets:` en `build-push-action`). **No se cambia** sin poder construir la imagen y comprobar que `next.config.mjs` sigue subiendo sourcemaps; queda **pendiente de DEP-13** (secretos de build) con rotación del token si se confirma la fuga. Esto es un hecho de lectura, no una explotación medida.

## Pendientes de validación real (no verificables sin Docker/servidor)

- Dos deploys consecutivos reales con Docker/Compose: que `docker ps -aq --filter 'name=^…$'` y el filtro por etiqueta devuelvan el residuo, y que `docker rm -f` lo elimine.
- Que `docker compose up -d --no-deps postgres minio cms portal nginx` no relance `cms-migrate`, respete el orden entre servicios listados y aplique cambios de configuración de postgres/minio (el comportamiento de `--no-deps` con `depends_on` condicionales es supuesto de documentación).
- Que `appleboy/ssh-action@v1.2.0` propague `GHCR_USER`/`GHCR_TOKEN` con `envs`, acepte `command_timeout: 35m` y que el token con caracteres especiales no rompa el `export`.
- `flock` real en el host (paquete `util-linux`; el shim solo prueba la lógica del script, no la exclusión del kernel) y la liberación del lock al cortar la sesión.
- Señales `SIGTERM`/`SIGHUP` hacia el script remoto al cortar la sesión (la prueba solo ejercita salidas por `exit`).
- Que un run de fork con rama `main` se omita en GitHub Actions real (`workflow_run.event`/`head_repository` son campos documentados del payload, no medidos aquí).
- Los 600 s de pull/backup y 120 s de `up` de la cota de `command_timeout`.

## Riesgos remanentes

- El rollback sigue siendo de imagen (DEP-09); sin cambios.
- `--no-deps` en el `up` final cambia la semántica de arranque ordenado; el gate de readiness es la red de seguridad.
- `.deploy.lock` y `.deploy-last-failure` viven en `/opt/unc-portal`, fuera de git; `scp-action` solo copia `infrastructure/`, así que no los pisa.
- Un usuario con acceso SSH que ejecute el deploy a mano sin `flock` no queda cubierto.
- `github.actor` como usuario de login con un PAT ajeno es el comportamiento previo; no se cambia aquí.

## Rollback de este cambio (por bloques)

1. **Segundo deploy:** en `deploy.yml` quitar el bloque «DEP-19a (1)» de limpieza previa y volver el `up` a `up -d --remove-orphans` (con el riesgo conocido de «name already in use»).
2. **Disparador:** devolver `check-ci.if` a `github.event.workflow_run.conclusion == 'success'`.
3. **Concurrencia:** quitar `concurrency` y `command_timeout`; en el script, los bloques de `flock` y `trap`, y la línea `rm -f "$FAILURE_FILE"`.
4. **Secretos:** volver a interpolar token y actor en el script (reintroduce el hallazgo) o, mejor, revertir solo `env/envs` junto con el login.
5. **Pruebas:** borrar `tests/deploy/dep19a-deploy-fixes.test.mjs` y revertir el shim `flock`/`GHCR_*` de `dep07-deploy-script.test.mjs` y `dep09-deploy-rollback.test.mjs`.
6. **Documentación:** revertir las notas de `DEPLOY.md`. En el servidor se pueden borrar `.deploy.lock` y `.deploy-last-failure`; no hay migraciones ni datos que revertir.
