# Entorno SDD + RDD + arnés — Portal UNC

**Estado:** baseline local, sin cambios de producción. **Ámbito:** `C:\Users\UNC\unc-portal`. El arnés no instala dependencias, no migra bases ni despliega. Su salida roja inicial es evidencia de deuda, no permiso para ocultarla.

## Mapa de archivos y motivo

| Lugar | Para qué se usa | Qué no hace |
|---|---|---|
| `AGENTS.md` | Contrato de trabajo, comentarios y límites para cualquier agente/desarrollador | No modifica el servidor |
| `docs/specs/security/` | Especificación SDD verificable antes de editar acceso | No adjudica roles por cuenta propia |
| `docs/research/evidence-register.md` | Registro RDD de afirmaciones, fuentes y límites | No sustituye pruebas de campo |
| `docs/security/ATTACK-BOUNDARIES.md` | Alcance de pruebas adversariales y autorización pendiente para sitio publicado | No autoriza pentest de producción |
| `harness/check.mjs` y su test | Ejecutor de comprobaciones de solo lectura, con plan previo | No instala, corrige ni despliega |
| `docs/security/TASK-SEC-001-hardening-portal-unc.md` | Backlog SEC-00..SEC-11 y criterios de cierre | No acredita tareas como completadas |

## Ciclo de una tarea (SDD)

1. Definir `ID`, problema, usuario/rol afectado, alcance y fuera de alcance; registrar contrato de entrada/salida y estados permitidos.
2. Escribir ejemplos Given/When/Then, incluidos **casos negativos** y acceso por API directa. Marcar decisiones pendientes como bloqueo, no como supuesto.
3. Registrar en RDD cada afirmación importante: fuente exacta (archivo/línea o documento oficial), fecha, límites y prueba que puede refutarla.
4. Escribir primero una prueba que reproduzca el fallo (RED); implementar el cambio mínimo con comentarios en español que expliquen **qué hace y por qué** (GREEN); refactorizar sin perder cobertura.
5. Ejecutar arnés rápido, pruebas afectadas y revisión independiente; antes de release, arnés completo, staging sintético y rollback probado.
6. Guardar evidencia: comando, salida, entorno, commit, revisión humana y riesgos aceptados. No marcar la tarea «done» por número de tests solamente.

## Umbrales y decisiones

- **Bloquea release:** acceso anónimo a borradores, permisos editoriales no aprobados, avisos críticos aplicables sin mitigar, build/lint roto o pruebas negativas faltantes.
- **No es un certificado:** `npm audit`, checks estáticos y tests unitarios no prueban invulnerabilidad. Evaluar aplicabilidad de avisos y probar controles reales en staging autorizado.
- **Decisión reservada al Product Owner:** quién revisa/aprueba/publica, posibilidad de autorrevisión, acceso de auditor y visibilidad de media no publicada. `docs/FLUJO_EDITORIAL.md` hoy se contradice y no se reescribe hasta decidirlo.
- **Docker:** no hace falta para este baseline documental y unitario. Para PostgreSQL/MinIO, pruebas de integración y simulación dinámica completa se requiere Docker Desktop activo o un staging aislado equivalente.

## Ejecución local

```text
node harness/check.mjs --plan
node --test harness/check.test.mjs
node harness/check.mjs --quick
node harness/check.mjs --full
```

`--full` consulta npm para advisories, pero no instala paquetes. Sus comandos ejecutan pruebas y análisis que pueden crear cachés temporales propias de Node/Next; no escriben en la base de datos. No correr suites de integración/E2E de Payload contra bases reales desde este arnés.

## Referencias de método

- NIST SSDF (SP 800-218): prácticas para preparar, proteger, producir y responder a vulnerabilidades de software.
- OWASP ASVS: catálogo de requisitos verificables de seguridad de aplicaciones (usar especialmente control de acceso y validación de entrada).
- Documentación oficial de Payload: Access Control, Local API Access Control y Drafts.
- Documentación oficial de Next.js: Proxy/matcher y rutas API.

Las referencias orientan la especificación; la política institucional concreta y el nivel exigido siguen pendientes de aprobación.
