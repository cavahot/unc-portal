# Instrucciones para desarrolladores y agentes — Portal Institucional UNC

## Alcance y fuente de verdad

- Antes de editar, leer `docs/engineering/SDD-RDD-HARNESS.md`, la especificación de la tarea y la evidencia RDD vinculada. La tarea de seguridad vigente es `docs/security/TASK-SEC-001-hardening-portal-unc.md`.
- `docs/ROADMAP_STATUS.md` y `SECURITY.md` son documentos históricos: no interpretar sus casillas «completado» como pruebas de seguridad actuales. Contrastar con código, tests y configuración del entorno.
- Trabajar en ramas; no incluir `test_write.txt`, archivos `.env`, bases de datos, backups ni cambios de otra persona en un commit.
- La política editorial tiene una decisión pendiente: `docs/FLUJO_EDITORIAL.md` asigna la publicación de manera contradictoria a editor y publisher. Registrar bloqueo y pedir decisión del Product Owner; no inventar un permiso.

## Ciclo SDD + RDD

1. **SDD:** redactar el comportamiento, límites, contrato, transiciones de estado y criterios Given/When/Then antes de modificar la aplicación. Si falta una decisión funcional, detener solo esa parte.
2. **RDD:** registrar por qué se propone la regla: archivo y línea, documentación oficial, advisory, prueba o decisión humana. Separar hecho observado, hipótesis y riesgo condicionado. No convertir un resultado de `npm audit` en prueba de explotación.
3. **TDD:** escribir una prueba negativa que falle por el problema antes de implementar el cambio, luego hacer el cambio mínimo y ejecutar prueba específica y suite afectada.
4. **Revisión:** registrar diffs, pruebas, riesgos remanentes y un rollback. No anunciar «corregido» sin verificar el efecto sobre el objetivo exacto.

## Comentarios en código nuevo o modificado

- Cada función, hook, test de seguridad y regla de autorización **nueva o modificada** debe llevar un comentario breve o docstring en español que explique **qué hace y por qué existe**. En controles de seguridad, indicar la amenaza que evita y el límite del control.
- Comentar decisiones no obvias, invariantes, excepciones y dependencias de roles; evitar comentarios que repitan literalmente la instrucción. Si una firma o contrato cambia, actualizar comentario, pruebas y consumidores.
- JSON no admite comentarios: documentar su significado en el `.md` vecino o en el código que lo usa. No incrustar secretos ni datos personales en ejemplos, tests, logs o comentarios.
- Incluir referencia a la tarea (`SEC-XX`) y evidencia RDD cuando la regla cambie el acceso, la publicación, la retención o la privacidad.

## Límites de las pruebas adversariales

- Están permitidos análisis estáticos y pruebas controladas con cuentas y datos sintéticos en entorno local o staging autorizado. Probar anónimo y cada rol por REST, GraphQL, Local API y UI, incluyendo casos que **deben** devolver 401/403.
- No ejecutar escaneos agresivos, fuzzing de alta tasa, fuerza bruta, extracción de datos reales, creación/eliminación de usuarios, alteración de contenidos ni pruebas sobre producción sin URL, autorización y alcance explícitos.
- Docker Desktop no se inicia, instala ni configura por iniciativa del agente. Si una prueba necesita Postgres/MinIO o staging, señalarlo y pedir autorización antes de encender servicios o usar datos.

## Comandos de este arnés

- `node harness/check.mjs --plan`: mostrar qué se ejecutaría sin ejecutar nada.
- `node harness/check.mjs --quick`: verificar artefactos y ejecutar unitarias y typecheck del portal, sin Docker ni red externa.
- `node harness/check.mjs --full`: además ejecutar typecheck/lint de CMS y `npm audit --omit=dev --json` (este último consulta el registro npm). Un resultado rojo refleja deuda existente; no modificar paquetes automáticamente.
- `node --test harness/check.test.mjs`: pruebas unitarias del propio arnés.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
