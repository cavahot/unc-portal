# DEP-02 — Lectura pública solo de contenido publicado (noticias y páginas)

**Estado:** implementación local propuesta con política **PROVISIONAL de solo estrechamiento**; pendiente de decisión del Product Owner (SEC-03) y de pruebas de integración en staging. **Backlog:** DEP-02 = SEC-02 (hallazgo C2). **Spec base:** `docs/specs/security/SEC-001-anonimo-no-lee-borradores.md`. **RDD:** `docs/research/evidence-register.md` (RDD-SEC-001, RDD-DEP-09). No autoriza pentest externo.

## Contrato

- Alcance de código: `Noticias.access.read`, `Paginas.access.read` y `access.readVersions` de ambas. Nada más cambia (campos, hooks, `create/update/delete`).
- Principio: **solo estrechar**. Ningún rol gana permisos que hoy no tenga. Hoy `read: () => true` y `readVersions` queda al valor por defecto de Payload (requiere sesión); el cambio no abre `readVersions` a nadie nuevo.
- Política provisional de lectura (`read`):
  - **Lectura completa (`true`, incluye borradores):** `superadmin`, `web-admin`, `publisher`, `editor`, `correspondent` (los que ya pueden escribir contenido editorial, `canWriteEditorial`) y `reviewer`.
  - **Lectura restringida:** anónimo y cualquier sesión sin función editorial (`viewer`, `auditor`, `media-manager`, rol nulo o desconocido) reciben el filtro `{ _status: { equals: 'published' } }`.
- `readVersions`: `true` solo para los mismos roles de lectura completa; `false` para el resto (incluido anónimo).
- El filtro `_status equals published` **oculta por seguridad** los registros heredados sin `_status` (decisión pendiente 2 de SEC-001: se opta por no exponerlos hasta una migración que fije su estado). Puede haber contenido legítimo antiguo que deje de verse en el portal: verificar en staging.
- `reviewer` se incluye en lectura completa porque SEC-001 (criterio 4) le reconoce leer borradores; **no** puede escribir (sin cambio en `create/update`).

> **Actualización DEP-03 (2026-10-22):** con la matriz SEC-03 aprobada, `correspondent` deja de tener lectura completa: lee publicados y lo que él creó (`createdBy`), y sus versiones solo si son suyas. `auditor` y `viewer` siguen solo con publicados y sin versiones (decisión 7). Ver `docs/specs/security/DEP-03-flujo-editorial-servidor.md`; las pruebas de este documento se actualizaron en `tests/unit/cms-drafts-read-access.spec.ts`.

## Escenarios Given/When/Then (negativos primero)

1. **Anónimo / draft:** dado un documento en borrador, cuando un anónimo consulta `noticias` o `paginas`, entonces `read` devuelve el filtro `_status = published` y el borrador no se entrega.
2. **Anónimo / `draft=true` o versiones:** dado un anónimo que pide `draft=true` o la ruta de versiones, entonces `read` sigue devolviendo el mismo filtro y `readVersions` devuelve `false`.
3. **Viewer / auditor / media-manager:** dado un usuario autenticado sin función editorial, cuando consulta, entonces recibe el filtro de publicados y `readVersions` es `false`.
4. **Rol nulo o desconocido:** dado un usuario con `role` ausente o no incluido en `USER_ROLE_OPTIONS`, entonces se trata como anónimo.
5. **Publicado visible:** dado un documento `published`, cuando lo consulta un anónimo, entonces sigue disponible (el filtro lo incluye).
6. **Editorial conserva acceso:** dado `superadmin`, `web-admin`, `publisher`, `editor`, `correspondent` o `reviewer`, entonces `read` devuelve `true` y `readVersions` devuelve `true`.
7. **Heredado sin `_status`:** dado un registro sin `_status`, cuando lo consulta un anónimo, entonces no se expone (el filtro no lo cumple).

## Hipótesis a validar en staging (no verificadas)

- H1: comportamiento real de `draft=true` anónimo en Payload 3.87.1 (si el `Where` devuelto por `read` se combina con la consulta de borradores o se omite).
- H2: que el filtro `where` de `read` se aplique a la consulta de versiones y a GraphQL (no solo a REST). Mientras tanto, `readVersions` se cierra con `false`.
- H3: que no haya contenido publicado legítimo sin `_status` que el filtro oculte.

## Pendientes y fuera de alcance

- **SEC-10 (pendiente, NO modificados aquí):** `TribunalDocumentos` (campo `active`), `Tesis` y `Media`. Siguen con su lectura actual.
- **DEP-03 / SEC-04:** flujo editorial, transiciones y `approvalStatus` como condición adicional (decisión pendiente 1 de SEC-001). Fuera de alcance.
- **SEC-03 (Product Owner):** matriz final. Esta política no la decide; en particular, `reviewer` y `correspondent` leen borradores ajenos, y la decisión de si deben limitarse por autoría o ámbito queda abierta.
- **Preview del portal:** `getNewsBySlugDraft` y `getPageBySlug(slug, true)` en `lib/cms/queries/` consultan el CMS sin cabecera de autorización; tras este cambio el preview de borradores deja de devolver datos hasta que el portal reenvíe el token del editor. Se registra como deuda; no se modifica el portal en este corte.

## Pruebas y rollback

- Pruebas: `tests/unit/cms-drafts-read-access.spec.ts` (funciones de acceso reales, req sintéticos, sin base de datos).
- Cierre: pruebas REST/GraphQL/Local API en staging con cuentas sintéticas y revisión humana.
- Rollback: `git checkout` de `apps/cms/src/access/roles.ts`, `Noticias.ts`, `Paginas.ts`; borrar el spec, la prueba y las fichas RDD añadidas.
