# ARCH-DB-00 — Baseline del entorno y alcance

**Fecha de captura:** 2026-10-16 22:11 hora local observada por el entorno.  
**Repositorio:** `C:\Users\UNC\unc-portal`  
**Rama:** `security/rbac-foundation`  
**Commit observado:** `815e6ee`  
**Método:** comandos locales de solo lectura; sin conexión a producción, sin credenciales y sin iniciar Docker.

## Estado confirmado

| Control | Resultado | Evidencia / límite |
|---|---|---|
| Rama de trabajo | `security/rbac-foundation` | No se creó otra rama para no separar los cambios RBAC ya existentes |
| Cambios previos | Hay modificaciones RBAC y varios archivos no versionados | No se incorporarán automáticamente al trabajo de arquitectura |
| Node.js | `v26.7.0` | Verificar compatibilidad con CI antes de fijar runtime |
| npm | `11.19.0` | Capturado localmente |
| Docker CLI | `28.0.4` | El cliente está instalado |
| Docker Compose | `v2.34.0-desktop.1` | El motor no respondió a `docker info` |
| Docker Engine | No disponible | No se levantaron PostgreSQL, MinIO ni Mailpit |
| Portal | `next@16.2.12` | `npm ls` local |
| CMS | `payload@3.87.1` | `npm ls` local |
| Adaptador DB | `@payloadcms/db-postgres@3.87.1` | Configuración y árbol instalado |
| Storage | `@payloadcms/storage-s3@3.87.1` | Configuración y árbol instalado |
| Arnés plan | Funciona | `node harness/check.mjs --plan` |
| Arnés unitario | 4 pasan, 1 falla | Falla conocida `runner is not a function` |
| Arnés quick/full | No implementados en el ejecutor actual | La documentación los declara, pero el script rechaza `--quick`/`--full` |
| PostgreSQL local | No verificado | Docker Engine no disponible; no se consultaron tablas |
| Producción | No verificada | No se accedió a VPS, DNS ni base real |

## Archivos de entorno

Se detectaron plantillas y archivos de entorno en el repositorio. No se leyeron valores secretos ni se copiarán al informe:

- `.env.example`
- `infrastructure/docker/.env.example`
- `infrastructure/docker/.env.prod.example`
- `apps/cms/.env.example`
- archivos locales históricos de configuración

Antes de cualquier ejecución con base, se debe seleccionar explícitamente un archivo sintético y comprobar que no contiene credenciales de producción.

## Estado Git y regla de preservación

El árbol contiene cambios RBAC previos y archivos no versionados, incluido `test_write.txt`. Este baseline no los modifica ni los incluye. Antes de hacer un commit de arquitectura se debe separar:

1. cambios RBAC ya realizados;
2. documentación/armazón SDD-RDD ya creada;
3. cambios nuevos de `ARCH-DB-*`.

## Decisiones bloqueadas

- No se inicia Docker sin autorización explícita.
- No se usa una base real para migraciones o E2E.
- No se corrige `DATABASE_URI` con una contraseña escrita en YAML.
- No se cambia el modelo de auditoría hasta aprobar `ARCH-DB-03`.
- No se afirma que PostgreSQL tenga las tablas esperadas hasta hacer introspección en entorno sintético.

## Próximo paso autorizado por el task

El baseline local quedó terminado. Además, se corrigió el runner del arnés como primer corte de **ARCH-DB-11**: ahora acepta `--plan`, `--quick` y `--full`, ejecuta el runner real de forma segura en Windows y conserva la salida de cada gate. La prueba del arnés quedó en **5/5** y `--quick` pasó con unitarias **16/16** y typecheck del portal.

El siguiente cambio de arquitectura de base es **ARCH-DB-01**, pero cualquier prueba real de conexión requiere Docker o un PostgreSQL de staging aislado. ARCH-DB-11 aún no se considera cerrado hasta ejecutar y revisar `--full`.

## Criterio de cierre de ARCH-DB-00

- [x] Alcance y repositorio fijados.
- [x] Rama y commit registrados.
- [x] Versiones locales registradas.
- [x] Docker detectado sin motor activo.
- [x] Estado Git preservado.
- [x] Producción declarada fuera de alcance.
- [x] No se leyeron secretos.
- [ ] Base sintética disponible.
- [ ] Backup/restore sintético probado.

ARCH-DB-00 queda **parcialmente completado**: baseline local terminado; entorno de base aislado pendiente de autorización para iniciar Docker o de acceso a un staging equivalente.
