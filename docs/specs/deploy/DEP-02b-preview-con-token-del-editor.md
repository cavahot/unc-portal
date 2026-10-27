# DEP-02b — Preview del portal con el token del editor

**Estado:** implementación local; pendiente de validación en staging. **Backlog:** regresión derivada de DEP-02 (`docs/specs/deploy/DEP-02-lectura-publica-solo-publicado.md`, nota «Preview del portal»). **RDD:** `docs/research/evidence-register.md` (RDD-DEP-10). Formato como SEC-005 (contrato + Given/When/Then, negativos primero).

## Problema

Tras DEP-02 el CMS no entrega borradores a anónimos. El preview del portal (`getNewsBySlugDraft`, `getPageBySlug(slug, true)`) consultaba el CMS sin credencial, por lo que dejó de ver borradores (regresión funcional).

## Contrato

- `cmsFetch` acepta una opción `authToken`. Solo si se recibe, añade `Authorization: JWT <token>`; además fuerza `cache: 'no-store'` y omite `next.revalidate`/`tags` para que ni el borrador ni la petición autenticada se cacheen entre usuarios.
- Con `authToken`, `cmsFetch` exige que el endpoint empiece por `/` y que la URL final tenga el mismo origen que la base configurada (`CMS_URL`); si no, lanza error **antes** de llamar a `fetch`. Evita enviar el token a otro host. No se añaden fallbacks nuevos a localhost.
- `getNewsBySlugDraft(slug, authToken?)` y `getPageBySlug(slug, draft, authToken?)`:
  - Consulta de borrador (`draft=true`) solo cuando hay `draft` activo **y** `authToken`. Sin token se degrada a la consulta de publicados (sin `Authorization`).
  - Las consultas de publicados nunca llevan `Authorization`, aunque se pase un token.
- Páginas: `cookies()` solo se invoca dentro de la rama `draftMode().isEnabled`. La cookie `payload-token` se lee en el servidor y se pasa únicamente a las funciones de borrador. Nunca se registra, ni se incluye en URL, respuesta o props de cliente.
- Si el CMS responde 401/403 (o falla) en la consulta de borrador, la página degrada al contenido publicado o a 404, sin error 500 ni contenido ajeno. Se elimina la llamada previa a `/api/users/me` con `NEXT_PUBLIC_CMS_URL` (y su fallback a localhost): la autorización la decide el CMS (DEP-02) al recibir el token.

## Escenarios Given/When/Then

a. **Sin token:** dado draftMode activo y sin cookie `payload-token`, cuando se pide el borrador, entonces no se envía `Authorization` y se consulta solo lo publicado (o 404).
b. **Con token y draftMode:** dado un token del editor, cuando se pide el borrador, entonces la petición lleva `Authorization: JWT <token>`, `draft=true` y `cache: 'no-store'`.
c. **Consulta pública:** dado un token disponible, cuando se llama `getNewsBySlug`/`getPageBySlug(slug)` publicado, entonces NUNCA lleva `Authorization`.
d. **Otra base URL:** dado un endpoint que pretende cambiar el host (`//host`, `@host`, URL absoluta), cuando hay token, entonces `cmsFetch` lanza error y no se llama a `fetch`.
e. **CMS 403:** dado que el CMS rechaza el token, cuando se pide el borrador, entonces la página muestra lo publicado o 404, sin 500 ni fuga.
f. **ISR:** dadas las páginas públicas, entonces `cookies()` solo aparece dentro de la rama de preview (prueba estática).
g. **Caché:** dada una petición con token, entonces es `no-store` aunque el llamador pida `force-cache` o `revalidate`.

## Fuera de alcance

- Reemplazar el secreto de preview en query por un token de vida corta (DEP-16).
- Matriz de roles (SEC-03), `TribunalDocumentos`, `Tesis`, `Media`, y cualquier cambio a DEP-02.

## Hipótesis a validar en staging

- H1: Payload 3.87.1 acepta `Authorization: JWT <token>` en REST con el valor de la cookie `payload-token`.
- H2: la cookie `payload-token` llega al portal (mismo sitio/dominio); si CMS y portal están en dominios distintos, la cookie no estará y el preview degradará a publicados.
- H3: con token inválido Payload responde como anónimo (publicados) y no 500.

## Riesgos y rollback

- El token puede expirar durante el preview: degrada a publicados.
- El token vive en memoria del servidor durante la petición; no se loguea.
- Rollback: `git checkout` de `lib/cms/client.ts`, `lib/cms/queries/news.ts`, `lib/cms/queries/pages.ts`, `app/[locale]/noticias/[slug]/page.tsx`, `app/[locale]/[...slug]/page.tsx`; borrar `tests/unit/cms-preview-token.spec.ts` y la ficha RDD-DEP-10.
