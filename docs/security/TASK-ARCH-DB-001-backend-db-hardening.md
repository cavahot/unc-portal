# TASK-ARCH-DB-001 — Endurecer arquitectura backend, PostgreSQL y auditoría del Portal UNC

**Estado:** Propuesto; no aplicar cambios de base ni despliegue desde este documento.  
**Alcance:** `C:\Users\UNC\unc-portal`, backend Next.js/Payload, PostgreSQL, MinIO/S3, migraciones y modelo de auditoría.  
**Rama de trabajo sugerida:** `arch-db-hardening`.  
**Auditoría base:** `C:\Users\UNC\Downloads\Auditoria_Arquitectura_Backend_Base_UNC_2026-10-17.md`.  
**Metodología obligatoria:** SDD + RDD + TDD + arnés local.  
**No incluido:** producción, datos reales, credenciales, pentest externo ni migraciones irreversibles sin respaldo y autorización.

## Objetivo de cierre

El backend debe tener una conexión de producción verificable sin secretos expuestos, un esquema PostgreSQL evolucionable mediante migraciones versionadas, una auditoría de eventos confiable y trazable, separación clara entre datos/archivos públicos y privados, y un arnés que pueda comprobar estas condiciones en una base sintética.

No marcar el task como terminado solo porque compile o pasen pruebas unitarias. El cierre exige evidencia reproducible, revisión humana, respaldo/restauración probados y una decisión explícita de release.

## Reglas comunes para todas las subtareas

1. **SDD antes de código:** definir contrato, actores, estados, entradas, salidas, invariantes y criterios Given/When/Then.
2. **RDD:** registrar archivo/línea, configuración, documentación oficial, prueba y limitaciones. Separar hecho confirmado, hipótesis y riesgo condicionado.
3. **TDD:** escribir primero una prueba que falle por el defecto exacto; verificar RED; aplicar el cambio mínimo; verificar GREEN; refactorizar después.
4. **Comentarios:** toda función, hook, guardia, migración, prueba de seguridad o regla nueva/modificada debe tener un comentario breve en español indicando qué hace, qué amenaza evita y cuál es su límite. Incluir `ARCH-DB-XX`.
5. **Aislamiento:** no ejecutar seeds, migraciones, restauraciones, E2E destructivas ni pruebas adversariales sobre producción. Usar PostgreSQL/MinIO sintéticos.
6. **Rollback:** toda migración o cambio de almacenamiento debe tener reversión o procedimiento de recuperación probado.
7. **No secretos:** no imprimir, registrar ni incluir contraseñas, tokens, `.env`, dumps ni datos personales en el repositorio o en el informe.

## Bloqueadores de release

- `DATABASE_URI` no resuelve correctamente en producción.
- No existe un esquema de migración reproducible.
- No puede restaurarse una copia de PostgreSQL y MinIO.
- Eventos de auditoría falsificables o sin actor/recurso trazable.
- Datos privados expuestos por media/bucket público.
- Build, typecheck, lint o pruebas de seguridad negativas fallan sin riesgo aceptado.
- Se ejecuta una migración con datos reales sin aprobación y backup comprobado.

# Orden de ejecución: urgente → menos urgente

## ARCH-DB-00 — Preparar baseline y entorno aislado [P0, bloqueante]

**Resultado:** entorno de prueba reproducible, separado de producción, con inventario y plan de rollback.

**Acciones:**

- Crear rama sin incluir `test_write.txt`, `.env`, bases ni backups.
- Registrar versiones de Node, npm, Payload, PostgreSQL y Docker.
- Confirmar qué configuración corre realmente en producción sin leer secretos.
- Definir un `.env.example` sin valores sensibles y una base sintética.
- Documentar los servicios necesarios: PostgreSQL, MinIO, CMS, portal y Mailpit.
- No iniciar Docker automáticamente; requerirá autorización del usuario.

**SDD — aceptación:** Given una máquina limpia, When se siguen las instrucciones, Then se puede preparar un entorno sintético sin credenciales de producción.

**RDD:** auditoría de arquitectura, `AGENTS.md`, `docs/engineering/SDD-RDD-HARNESS.md`, Compose local/producción.

**Pruebas/arnés:** `node harness/check.mjs --plan`, `node --test harness/check.test.mjs`, verificación de `.env.example` y estado de Git.

---

## ARCH-DB-01 — Corregir la conexión PostgreSQL de producción [P0]

**Estado:** implementación local parcial; conectividad contra PostgreSQL sintético pendiente.  
**Hallazgo:** `infrastructure/docker/compose.prod.yaml:94` contenía una URI aparentemente incompleta con `***`.

**Resultado:** CMS obtiene `DATABASE_URI` válida mediante secreto/variable segura, sin contraseña escrita en Compose ni logs.

**Acciones:**

- Definir una sola fuente de verdad para `DATABASE_URI`.
- No construir la contraseña mediante texto literal dentro del YAML.
- Validar que Compose interpola las variables sin revelar el valor.
- Añadir un check de arranque que falle de manera segura si la URI contiene `***`, valores de ejemplo o está vacía.
- Comprobar conexión con `pg_isready` y una consulta de salud sintética.

**SDD — aceptación:** Given una configuración con valor de ejemplo, When arranca CMS, Then falla antes de servir tráfico y no imprime el secreto. Given una configuración válida sintética, Then conecta a PostgreSQL.

**TDD/RDD:** prueba de validación de configuración primero; evidencia `compose.prod.yaml`, `payload.config.ts:37-40`, `DEPLOY.md`.

**Requiere Docker:** sí, para verificar conexión real. No levantarlo sin autorización.

---

## ARCH-DB-02 — Versionar migraciones de Payload/PostgreSQL [P0]

**Estado:** línea base inicial generada y probada en dos bases sintéticas con esquema equivalente; rollback sintético verificado; fixtures, automatización del arnés y revisión final pendientes.

**Acciones:**

- Confirmar la estrategia oficial de migraciones de la versión instalada de Payload.
- Generar una migración inicial o registrar el esquema existente de forma segura.
- Versionar migraciones en el repositorio.
- Probar `up` sobre base vacía y base con fixtures.
- Definir rollback o procedimiento de restauración para cambios destructivos.
- Prohibir cambios manuales en producción fuera del procedimiento documentado.

**SDD — aceptación:** Given dos bases vacías, When se aplican las mismas migraciones, Then el esquema resultante coincide en tablas, índices, relaciones y columnas relevantes.

**TDD/RDD:** prueba de esquema esperado; registrar versión Payload/Drizzle y resultado de introspección.

**Bloqueo:** no avanzar a cambios estructurales de auditoría sin esta estrategia.

---

## ARCH-DB-03 — Diseñar el contrato de auditoría relacional [P0, decisión de diseño]

**Resultado:** modelo aprobado para eventos de auditoría, sin inventar campos incompatibles con la política institucional.

**Propuesta inicial:**

- `actorUser`: relación nullable a `users`.
- `actorEmailSnapshot`: snapshot histórico.
- `actorRoleSnapshot`: snapshot histórico.
- `action`: enumeración controlada.
- `resourceType`: enumeración o catálogo controlado.
- `resourceId`: ID del recurso afectado.
- `resourceVersion`: versión Payload si aplica.
- `requestId`/`correlationId`: trazabilidad de la petición.
- `occurredAt`: fecha/hora escrita por el servidor.
- `ipHash` o IP con política de retención definida.
- `result`: enumeración.
- `metadata`: JSON validado, limitado y sin secretos/PII innecesaria.

**Decisiones pendientes del Product Owner:** retención, quién puede leer, si se permite borrar/corregir, tratamiento de eventos anónimos y si se conservará IP completa, truncada o hash.

**SDD — aceptación:** tabla aprobada `evento × actor × recurso × acción × resultado × retención` y casos de auditoría documentados.

**RDD:** `apps/cms/src/collections/Auditoria.ts`, `apps/cms/src/utilities/audit.ts`, auditoría estructural, política de privacidad institucional.

---

## ARCH-DB-04 — Implementar eventos de auditoría server-owned [P0]

**Depende de:** ARCH-DB-02 y ARCH-DB-03.

**Resultado:** clientes no pueden falsificar identidad, fecha, rol, recurso ni cambios; los hooks/servicios escriben eventos desde servidor.

**Acciones:**

- Sustituir textos ambiguos por campos relacionales/snapshots aprobados.
- Mantener `create: () => false` para REST/GraphQL de clientes.
- Centralizar escritura en `logAudit()` con contrato validado.
- Proteger `occurredAt`, actor, rol, IP y resultado de entrada cliente.
- Validar tamaño y contenido de `metadata`.
- Definir si update/delete se deshabilitan o se convierten en eventos de compensación.
- Añadir `requestId` desde handlers/hooks.

**Pruebas negativas:** viewer, editor y superadmin no crean eventos directos; solo el servicio interno registra; evento sin actor se marca como sistema/anónimo según política.

**Comentarios obligatorios:** cada hook/guardia nuevo explica amenaza y límite.

---

## ARCH-DB-05 — Añadir integridad y trazabilidad de recursos [P1]

**Resultado:** un evento permite localizar de forma segura qué recurso fue afectado, incluso si el documento se modifica o elimina.

**Acciones:**

- Definir `resourceType + resourceId` con catálogo permitido.
- Guardar título/slug como snapshot opcional, nunca como identidad primaria.
- Registrar colección, ID y versión Payload desde el servidor.
- Crear índices para actor, recurso, acción, fecha y correlación.
- No intentar una FK polimórfica inválida; documentar la decisión.

**Aceptación:** consulta por usuario, documento, acción y ventana temporal devuelve eventos consistentes; un recurso inexistente no se presenta como relación válida sin marcarlo como eliminado.

---

## ARCH-DB-06 — Separar media pública y privada [P1]

**Hallazgo:** `payload.config.ts:181-184` deshabilita control de acceso de Payload para S3/MinIO.

**Resultado:** contenido público se sirve públicamente; documentos privados requieren autorización o URL firmada.

**Acciones:**

- Clasificar media por visibilidad.
- Separar bucket/prefix público y privado o usar URLs firmadas.
- Prohibir que borradores, tesis privadas o documentos administrativos compartan ruta pública.
- Añadir pruebas anónimas para archivo público, privado y borrador.
- Documentar ciclo de expiración y revocación de URLs firmadas.

**Requiere Docker:** sí, para probar MinIO local con fixtures sintéticas.

**Bloquea release:** cualquier archivo no público servido sin autorización.

---

## ARCH-DB-07 — Fijar versiones de infraestructura [P1]

**Resultado:** despliegues reproducibles.

**Acciones:**

- Reemplazar `quay.io/minio/minio:latest` por versión probada o digest.
- Registrar versiones de PostgreSQL, Nginx, Mailpit y Node.
- Añadir verificación CI de imágenes no fijadas.
- Probar backup/restore con las versiones declaradas.

**Aceptación:** dos despliegues del mismo commit usan las mismas imágenes y pasan healthchecks.

---

## ARCH-DB-08 — Endurecer SSL, cuentas y permisos PostgreSQL [P1]

**Resultado:** el CMS usa un usuario de aplicación con mínimo privilegio y SSL obligatorio cuando la base está fuera de la red Docker confiable.

**Acciones:**

- Separar usuario de migración y usuario runtime si el despliegue lo permite.
- Revocar permisos innecesarios de la cuenta de aplicación.
- Activar `sslmode=verify-full` o equivalente en base externa.
- Validar certificados sin `rejectUnauthorized: false`.
- Documentar por qué el tráfico interno local puede ir sin TLS, si se mantiene esa excepción.

**Aceptación:** el usuario runtime no puede crear usuarios ni alterar tablas fuera del esquema necesario; conexión externa sin TLS falla.

---

## ARCH-DB-09 — Normalizar datos que requieran relaciones [P1/P2]

**Resultado:** las entidades que necesitan búsqueda, permisos o trazabilidad no quedan como texto libre.

**Candidatos:**

- `Tesis.autor`: decidir si persona/autoría requiere entidad propia.
- `Tesis.urlPdf`: migrar a `media` o documento controlado.
- `Convenios.parties`: modelar participantes si se requieren consultas.
- `TribunalDocumentos.driveUrl`: migrar a media/documento con estado y visibilidad.

**Regla:** no normalizar por estética. Cada migración debe justificar búsqueda, integridad, permisos, retención o trazabilidad.

**Aceptación:** decisión documentada por campo; migración de datos sintéticos; no se pierde contenido ni se rompen URLs públicas autorizadas.

---

## ARCH-DB-10 — Eliminar configuración histórica ambigua [P2]

**Resultado:** existe una única configuración activa y la documentación no sugiere MongoDB si el backend usa PostgreSQL.

**Acciones:**

- Mover backups de configuración fuera de rutas que puedan confundirse con runtime o documentar claramente su estado.
- Actualizar comentarios de `apps/cms/docker-compose.yml`.
- Añadir prueba/chequeo que confirme el adaptador activo.
- Revisar scripts de seed, backup y restore para que apunten a la misma base declarada.

**Aceptación:** un desarrollador nuevo identifica sin ambigüedad adaptador, base, servicios y procedimiento de restauración.

---

## ARCH-DB-11 — Completar el arnés de arquitectura y base [P1, bloqueante para cierre]

**Problema conocido:** la documentación promete `--quick` y `--full`, pero el ejecutor actual solo acepta `--plan`; además, una prueba del runner falla con `runner is not a function`.

**Resultado:** el arnés ejecuta y registra comprobaciones sin ocultar fallos.

**Acciones:**

- Corregir primero la prueba del runner mediante TDD.
- Implementar `--quick` con artefactos, unitarias y typecheck del portal.
- Implementar `--full` con typecheck/lint CMS y `npm audit --omit=dev --json`, sin auto-fix.
- Añadir modo `--db-synthetic` que solo funcione con una base explícitamente aislada.
- Añadir checks de:
  - URI de base sin placeholder;
  - migraciones presentes;
  - imágenes Docker fijadas;
  - colecciones y relaciones esperadas;
  - auditoría sin create público;
  - media público/privado según contrato.
- Guardar salida resumida y ruta de evidencia, sin secretos.

**Aceptación:** `--plan`, `--quick` y `--full` ejecutan lo documentado; un fallo de una comprobación se reporta y no se maquilla como éxito global.

**No iniciar Docker automáticamente.** El modo sintético requerirá autorización explícita.

---

## ARCH-DB-12 — Gate final de arquitectura y base [P0, cierre]

**Depende de:** ARCH-DB-00 a ARCH-DB-11.

**Criterios de cierre:**

- conexión PostgreSQL validada sin secretos en código/Compose/logs;
- migraciones versionadas y probadas desde base vacía y fixture;
- backup y restore de PostgreSQL y MinIO comprobados;
- auditoría server-owned, trazable y con política de retención aprobada;
- permisos de auditoría probados por rol;
- media privada no accesible anónimamente;
- imágenes fijadas;
- SSL y mínimos privilegios definidos;
- arnés verde o fallos aceptados formalmente con responsable y fecha;
- portal y CMS pasan los gates disponibles;
- revisión humana y decisión go/no-go registradas.

# Evidencia RDD inicial

| ID | Afirmación | Fuente | Estado | Límite |
|---|---|---|---|---|
| RDD-ARCH-DB-001 | El CMS usa PostgreSQL mediante `postgresAdapter` | `apps/cms/src/payload.config.ts:1,156-169` | Observado | No demuestra que producción esté conectada |
| RDD-ARCH-DB-002 | El Compose local usa PostgreSQL 16 | `infrastructure/docker/compose.yaml:4-23` | Observado | Docker local no estaba activo |
| RDD-ARCH-DB-003 | Producción declara una URI con `***` literal en el archivo inspeccionado | `infrastructure/docker/compose.prod.yaml:94` | Observado; verificar intención | Puede existir sustitución externa, no verificada |
| RDD-ARCH-DB-004 | Auditoría no declara relaciones con users/documentos | `apps/cms/src/collections/Auditoria.ts` | Observado | No se inspeccionó esquema físico |
| RDD-ARCH-DB-005 | Hay relaciones Payload hacia facultades/media | `apps/cms/src/collections/*.ts`, tipos generados | Observado | La FK física requiere introspección |
| RDD-ARCH-DB-006 | No se encontraron migraciones Payload versionadas visibles | búsqueda del repositorio | Observado; verificar proceso | Pueden mantenerse fuera del repositorio |
| RDD-ARCH-DB-007 | Media S3 deshabilita control de acceso Payload | `payload.config.ts:173-212` | Observado; riesgo condicionado | Depende del contenido real del bucket |
| RDD-ARCH-DB-008 | Docker CLI no conecta con el motor local | `docker info` | Observado el 2026-10-17 | Estado puede cambiar |
| RDD-ARCH-DB-009 | El arnés documenta quick/full pero el ejecutor actual solo acepta plan | `docs/engineering/SDD-RDD-HARNESS.md`, `harness/check.mjs` | Observado | Debe corregirse antes de usarlo como gate |

# Comandos de verificación previstos

```text
node harness/check.mjs --plan
node --test harness/check.test.mjs
node harness/check.mjs --quick
node harness/check.mjs --full
npm test
npm run typecheck
node node_modules/typescript/bin/tsc --noEmit --project apps/cms/tsconfig.json
```

Para la parte de base, después de autorizar Docker y usar datos sintéticos:

```text
docker compose -f infrastructure/docker/compose.yaml config
docker compose -f infrastructure/docker/compose.yaml up -d postgres minio mailpit
# introspección con credenciales obtenidas por el entorno seguro, nunca escritas en el task
docker compose -f infrastructure/docker/compose.yaml down
```

El task no autoriza por sí solo ejecutar comandos destructivos, restaurar datos ni modificar producción.
