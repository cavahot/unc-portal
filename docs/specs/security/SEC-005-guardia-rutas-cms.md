# SEC-005 — Primer corte de autorización en servidor para CMS

**Estado:** implementación local propuesta, pendiente de decisión institucional y pruebas de integración en staging. **Backlog:** SEC-03/05. **RDD:** `docs/research/evidence-register.md` (RDD-SEC-002, RDD-SEC-005). No autoriza pentest externo.

## Contrato

- Una ruta administrativa no se protege por CORS, UI ni por una URL oculta. El handler autentica por `payload.auth` y comprueba el rol **antes** de leer cuerpo, cambiar estado o devolver datos sensibles.
- Para el primer corte, `POST /api/alerts` (`resolve`, `set-threshold`) permite únicamente `superadmin`. Es una política provisional de privilegio mínimo: no habilita otros roles mientras SEC-03 no apruebe la matriz final. El `GET` queda pendiente de definición de quién ve alertas; no confundir esa deuda con un control completo.
- Anónimo recibe 401; sesión con rol desconocido o distinto de `superadmin` recibe 403; superadmin conserva el flujo actual. Una cookie, header `Origin` o navegación de panel por sí solos no conceden el permiso.
- El panel solo reconoce sesiones con un rol definido en `USER_ROLE_OPTIONS`; usuarios sin rol o con rol no reconocido no acceden. **No** se decide aún si `viewer` puede entrar al panel: requiere SEC-03.
- El registro `auditoria` rechaza creación desde REST/GraphQL incluso para `superadmin`: los eventos deben producirse desde `logAudit()` en servidor por Local API. Esto no hace al registro inmutable: actualizar/borrar y la lectura siguen sujetos a revisión SEC-03/SEC-05.

## Escenarios mínimos Given/When/Then

1. Dado un `viewer`, cuando hace POST `set-threshold` con JSON válido, entonces recibe 403 y no se llama al mutador.
2. Dado un anónimo, cuando hace POST `resolve`, entonces recibe 401 sin procesar su cuerpo.
3. Dado un `superadmin`, cuando hace POST `resolve`, entonces se aplica la operación y se devuelve éxito.
4. Dado un usuario con rol nulo/desconocido, cuando intenta acceso al admin de Payload, entonces se deniega.
5. Dado un rol válido, cuando entra al panel, se preserva el acceso previo; permisos de cada recurso siguen siendo responsabilidad de ACL/handlers.
6. Dado un usuario autenticado, incluso superadmin, cuando intenta crear directamente un evento en `auditoria`, entonces la ACL deniega; `logAudit` del servidor mantiene el canal interno bajo revisión.

## Fuera de alcance y pruebas de liberación

Este corte NO protege las demás rutas, no limita intentos de login, no corrige versiones vulnerables ni el flujo editorial. No usar `middleware.ts` para llamar a base de datos en cada petición; preferir guardias en los handlers y ACL Payload. Verificar REST/GraphQL/Local API con fixtures sintéticas y versiones reales en staging antes de desplegar. No ejecutar pruebas contra producción ni iniciar Docker sin autorización.
