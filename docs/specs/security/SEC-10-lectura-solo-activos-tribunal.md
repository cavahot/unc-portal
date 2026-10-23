# SEC-10 — Lectura pública solo de registros activos (Tribunal Electoral)

**Estado:** implementación local con política PROVISIONAL de solo estrechamiento (como DEP-02); pendiente de decisión del Product Owner y de validación contra Postgres/staging. **Alcance:** `TribunalDocumentos` y `TribunalMiembros`.

## Problema (hecho observado)

Ambas colecciones tenían `read: () => true` y un checkbox `active` (default `true`). Un anónimo leía también los registros inactivos por REST, GraphQL y Local API. El portal ya filtra `where[active][equals]=true` (`lib/cms/queries/tribunal.ts`), pero ese filtro es del cliente, no un control de acceso.

## Regla

- `superadmin` y `web-admin` (los mismos de `canWriteInstitutional`): leen todo.
- Anónimo y cualquier otro rol (incluido nulo o desconocido): solo filas con `active = true`.
- No se crean roles ni permisos nuevos; create/update/delete no cambian.

## Escenarios Given/When/Then

1. **Anónimo / inactivo:** dado un miembro o documento con `active = false`, cuando un anónimo lo pide por REST, GraphQL o Local API con ACL, entonces no aparece en la respuesta.
2. **Anónimo / activo:** dado un registro con `active = true`, cuando se consulta sin sesión, entonces sigue disponible (el portal no cambia).
3. **Rol sin escritura institucional:** dado un `editor`, `viewer`, `auditor` u otro rol, cuando consulta, entonces recibe solo activos.
4. **Rol institucional:** dado `superadmin` o `web-admin`, cuando consulta, entonces ve activos e inactivos (necesario para gestionarlos en el panel).
5. **`active` nulo:** una fila heredada con `active` nulo queda oculta al público a propósito.

## Hipótesis a validar contra Postgres (no validadas)

- H1: el `where` sobre `active` se aplica también vía REST y GraphQL.
- H2: se aplica en relaciones populadas desde otras colecciones.

## Qué NO cubre

- `Tesis`: sin campo de estado; decisión del dueño pendiente.
- `Media`: bucket público; un archivo es accesible por URL directa, independiente de esta ACL.
- SVG en uploads de `Media`.

## Evidencia y verificación

- Código: `apps/cms/src/access/roles.ts` (`readActiveOrInstitutional`), `TribunalDocumentos.ts:17`, `TribunalMiembros.ts:17`.
- Prueba: `tests/unit/cms-active-read-access.spec.ts` (ACL con req sintético, sin DB). RDD: `RDD-DEP-67`.

## Rollback

Restaurar `read: () => true` en las dos colecciones; no hay migración ni cambio de esquema.
