# SEC-027 — Matriz de roles probada con cuentas reales (CMS local)

Cierra el punto abierto de `SEC-027-ADENDA-2026-11-07.md` §3 y §4: «matriz de roles con cuentas reales» y «casos que deben devolver 401/403» (anónimo, editor, publisher…). Lista de publicación: «Pruebas con roles no administrativos».

## Pedido y autorización (textual)

- «ok vamos por tu recomendacion»: autoriza crear cuentas sintéticas **solo en el CMS local** (correos `@example.invalid`, contraseñas generadas que no se imprimen) y borrarlas al terminar (`AGENTS.md`, límites de las pruebas adversariales).

## Alcance

- Destino: CMS local (`http://localhost:3002`). El guion rechaza cualquier otro host.
- Actores: anónimo y los 8 roles no superadmin: `web-admin`, `publisher`, `reviewer`, `editor`, `correspondent`, `media-manager`, `auditor`, `viewer`.
- Canales: REST y GraphQL. La Local API se usa solo para preparar y limpiar (crear y borrar las cuentas y lo que creen las sondas) y para leer el rol después del intento de escalada.
- Sin fuerza bruta ni volumen: una petición por sonda y actor.

## Matriz esperada (fuente: `apps/cms/src/access/roles.ts`)

| ID | Sonda | Permitido | Resto (y anónimo) |
| --- | --- | --- | --- |
| P1 | `GET /api/users` | cada rol ve **solo su cuenta** (`canReadUsers`) | anónimo 401/403 |
| P2 | `POST /api/users` (crear cuenta) | nadie (solo superadmin, `canCreateUsers`) | 401/403 |
| P3 | `PATCH /api/users/<propia>` con `role: superadmin` | nadie cambia su rol (`canManageUserRoles`) | el rol sigue igual |
| P4 | `GET /api/auditoria` | `auditor` (`canReadAuditLog`) | 401/403 |
| P5 | `POST /api/globals/navegacion` (mismo contenido) | `web-admin` (`canUpdateGlobal`) | 401/403 |
| P6 | `POST /api/noticias` (borrador) | `editor`, `correspondent` (`editorialAuthorRoles`) | 401/403 |
| P7 | `DELETE /api/noticias/<inexistente>` | `web-admin`, `publisher` → 404 (`canDeleteEditorial`) | 401/403 |
| P8 | `DELETE /api/media/<inexistente>` | `web-admin`, `media-manager` → 404 (`canDeleteMedia`) | 401/403 |
| P9 | `GET /api/noticias/<borrador de otro>?draft=true` | `web-admin`, `publisher`, `editor`, `reviewer` (`EDITORIAL_READ_ROLES`) | 403/404; el corresponsal no ve borradores ajenos |
| P10 | `GET /api/noticias/<publicada>?depth=1`: datos del creador | nadie no superadmin recibe correo, sesiones ni teléfono de otra cuenta; anónimo no recibe `createdBy` | — |
| P11 | GraphQL `Users { docs { id email } }` | GraphQL está **desactivado** (`payload.config.ts`, `graphQL.disable`): 404 para todos. Si se reactiva: cada rol ve solo su cuenta | anónimo sin datos |

P5, P7 y P8 no pueden dañar datos aunque el control fallara: P5 reescribe el mismo menú y P7/P8 apuntan a un id inexistente. Lo que creen P2 y P6 se borra al terminar.

## Uso

```
npx tsx apps/cms/scripts/security/probe-roles.ts            # sin cambios: muestra el plan
npx tsx apps/cms/scripts/security/probe-roles.ts --apply    # crea cuentas, sondea, informa y limpia
npx tsx apps/cms/scripts/security/probe-roles.ts --cleanup  # solo borra cuentas y restos de una corrida cortada
```

Código de salida 0 solo si todas las sondas cumplen. El informe no incluye contraseñas ni tokens.

## Resultado (2026-11-09, CMS local, rama del tracker)

`npx tsx apps/cms/scripts/security/probe-roles.ts --apply` → **«Resultado: TODO CUMPLE»**: las 11 sondas en los 9 actores (99 casos). Limpieza: 2 noticias y 8 cuentas de sonda borradas; consulta posterior a la base: 0 cuentas `sonda-%` y 0 noticias `sonda-%`.

| Sonda | anónimo | web-admin | publisher | reviewer | editor | correspondent | media-manager | auditor | viewer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1 | 403 | 200 (solo la propia) | 200 | 200 | 200 | 200 | 200 | 200 | 200 |
| P2 | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 403 |
| P3 | 403 | 200, rol sin cambios | ídem | ídem | ídem | ídem | ídem | ídem | ídem |
| P4 | 401 | 403 | 403 | 403 | 403 | 403 | 403 | 200 | 403 |
| P5 | 403 | 200 | 403 | 403 | 403 | 403 | 403 | 403 | 403 |
| P6 | 403 | 403 | 403 | 403 | 201 | 201 | 403 | 403 | 403 |
| P7 | 403 | 404 | 404 | 403 | 403 | 403 | 403 | 403 | 403 |
| P8 | 403 | 404 | 403 | 403 | 403 | 403 | 404 | 403 | 403 |
| P9 | 404 | 200 | 200 | 200 | 200 | 404 | 404 | 404 | 404 |
| P10 | 200, sin `createdBy` | 200, sin datos personales ajenos | ídem | ídem | ídem | ídem | ídem | ídem | ídem |
| P11 | 404 (GraphQL desactivado) | 404 | 404 | 404 | 404 | 404 | 404 | 404 | 404 |

Primera corrida: P11 «fallaba» con 404 en todos los roles. No era un defecto del CMS sino de la sonda: GraphQL está desactivado a propósito. Se corrigió el juez (con prueba) y se repitió.

Clasificación: **confirmado** para el alcance probado (CMS local, REST, 9 actores). Sigue pendiente: la misma corrida en staging y la revisión independiente de otra persona que exige `security-27-gate`.

Observaciones:
- `superadmin` sí recibe el usuario creador completo (correo, teléfono, sesiones) al leer con `depth` ≥ 1, y la auditoría guarda ese objeto en `cambios_relevantes`. No lo ve ningún otro rol (P10), pero conviene acotar los campos que se pueblan y los que se guardan en la auditoría (minimización de datos).
- Al iniciar Payload desde el guion se ve «Pulling schema from database» (modo desarrollo): compara el esquema, no lo cambia si coincide.

## Límites

- Prueba el CMS local con la configuración actual; staging y producción necesitan su propia corrida autorizada.
- No prueba la UI del panel ni superadmin (lo revisó el propietario el 07-11).
- La matriz refleja la política **provisional** del código (SEC-03 sigue pendiente de decisión del Product Owner).
