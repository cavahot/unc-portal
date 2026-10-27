# DEP-15 — Frontend: enlaces del CMS, caché de 404 e i18n

**Estado:** implementación local propuesta; pendiente de verificación con `next build`/staging (no ejecutado: sin red ni build en esta tarea). **Backlog:** DEP-15 de `docs/security/TASK-DEPLOY-001-remediacion-auditoria-predeploy.md` (hallazgos medios de `docs/security/AUDIT-DEPLOY-2026-10-19.md`: RichText `href` sin allowlist, 404 cacheado por caída del CMS, archivos i18n faltantes). **Spec de formato:** `DEP-05-jsonld-seguro.md`. **RDD:** `docs/research/evidence-register.md` (RDD-DEP-23 a RDD-DEP-26). **No** toca preview/token (DEP-02b) ni rutas `/api` (DEP-06).

## Frente A — URLs del CMS (`safeHref`)

### Contrato

- Existe un único helper `safeHref(url: unknown): string` en `lib/security/safeUrl.ts`. Es la **única** vía permitida para poner en un `href` un valor que proviene del CMS (o de datos editables).
- Allowlist de esquema (sin distinguir mayúsculas): `^(https?:|mailto:|tel:|/|#)`.
- Se aplica `trim()` de espacios exteriores; el resultado devuelto es el valor recortado. Cualquier otro valor devuelve `'#'`.
- Rechazos explícitos (devuelven `'#'`): no-cadena; vacío; más de 2048 caracteres; cualquier carácter de control (U+0000–U+001F, U+007F–U+009F) en cualquier posición; cualquier `\` (los navegadores lo tratan como `/`); `//host` y `/\host` (URL relativa al protocolo = salida silenciosa a otro origen); esquemas con espacios intermedios, entidades (`&#106;avascript:`), `javascript:`, `data:`, `vbscript:`, `file:` en cualquier combinación de mayúsculas.
- **Decisión `//host`:** se **rechaza**. El editor que quiera un enlace externo debe escribir `https://…`; permitirlo abre redirecciones de origen sin que el revisor lo note. Límite: un enlace relativo sin barra inicial (`contacto`, `?page=2`) también queda en `'#'` (el CMS debe guardar rutas absolutas).
- Los hrefs son una **defensa en profundidad**: React no neutraliza `javascript:` en `href` (solo advierte), de modo que sin el helper el clic ejecuta código en el origen del portal.
- Sitios cubiertos: ambos serializadores `components/RichText.tsx` (noticias) y `components/blocks/RichText.tsx` (bloque del Page Builder, vía `lib/cms/blocks/registry.ts`), `FAQAccordion`, `DocumentCard`, `ThesisCard`, `JournalCard`, `FacultadTabs`, bloques `CTA`/`Hero`, `ExternalCTA`, `TribunalAcordeonClient`, `ConveniosTabsClient`, y páginas `ley-5189`, `ley-5282`, `tribunal-electoral`, `autoridades` (CV), `marco-legal`.
- Fuera de alcance: atributos `src` (`next/image` y `<img>` no ejecutan `javascript:` en navegadores actuales; `remotePatterns` restringe hosts), `mailto:`/`tel:` construidos con plantilla (el esquema es fijo) y CSP (SEC-10 / DEP-16).

### Escenarios Given/When/Then (negativos primero)

1. Dado `JaVaScRiPt:alert(1)`, cuando se llama `safeHref`, entonces devuelve `#`.
2. Dado `java\tscript:alert(1)` o `java\nscript:…`, entonces `#`.
3. Dado ` javascript:alert(1)` (espacio inicial) o `\u0001javascript:…`, entonces `#`.
4. Dado `&#106;avascript:alert(1)` o `&#x6A;avascript:…`, entonces `#`.
5. Dados `data:text/html,<script>…`, `vbscript:…`, `file:///etc/passwd`, entonces `#`.
6. Dados `//evil.com`, `/\evil.com`, `\\evil.com`, entonces `#`.
7. Dados `undefined`, `null`, `123`, `{}`, `''`, entonces `#`.
8. Dados `https://unc.edu.py/x?a=1`, `HTTP://x.py`, `mailto:a@unc.edu.py`, `tel:+595123`, `/noticias/x`, `#seccion`, entonces se devuelven sin cambios (recortados).
9. Dado un enlace Lexical con `url: 'javascript:alert(1)'` en **cada** serializador, entonces el HTML renderizado no contiene `javascript:` y el `href` es `#`.
10. Uso obligatorio (estático): en `app/` y `components/`, todo `href={…}` cuyo valor mencione un campo de URL del CMS (`driveUrl`, `cvUrl`, `linkHref`, `urlPdf`, `urlOjs`, `ctaUrl`, `buttonUrl`, `externalUrl`, `fileUrl`, `c.url`, `el.url`) pasa por `safeHref(`; los componentes listados importan el helper.

## Frente B — «no existe» (404) vs «CMS caído» (error)

### Contrato

- `lib/cms/errors.ts` expone `isCmsNotFound(error)` (true solo para `CmsError` con `status === 404`) y `isCmsOutage(error)` (cualquier otro error: red caída, timeout/abort, 5xx, 401/403 de configuración).
- Las consultas de detalle `getNewsBySlug`, `getCarreraBySlug` y `getPageBySlug`:
  - lista vacía (200 sin documentos) → `null` (la página llama `notFound()` → 404 legítimo);
  - respuesta 404 del CMS → `null`;
  - red caída, timeout, 5xx u otro error → **propagan `CmsError`**.
- Las páginas `noticias/[slug]`, `carreras/[slug]` y `[...slug]` **no** capturan el error de la consulta publicada: así Next no genera ni cachea un 404 con `revalidate = 3600`; durante la revalidación ISR conserva el último HTML bueno y, sin HTML previo, responde la página de error (500, no cacheada).
- Los datos demo/fallback solo se usan con `NODE_ENV === 'development'`. En producción (y en test) la caída del CMS ya no se enmascara con contenido de demostración ni con `null`.
- `generateStaticParams` de noticias usa `safeStaticParams` (devuelve `[]` si la carga lanza); `getNewsSlugs` ya no devuelve slugs demo fuera de desarrollo. `carreras/[slug]` y `facultades/[slug]` devuelven `[]` literal (no consultan el CMS; no pueden lanzar).
- **No cambia** la lógica de preview/token (DEP-02b): sus `.catch(() => null)` de la rama borrador quedan igual.
- Límite: `generateMetadata` conserva su `.catch` (solo afecta el título; el cuerpo de la página sigue propagando el error). Que Next sirva el HTML anterior ante un error en revalidación es comportamiento documentado pero **no se verificó con `next build`/staging** (hipótesis RDD-DEP-24).

### Escenarios Given/When/Then (negativos primero)

1. Dado un `fetch` que responde 500, cuando se llama `getNewsBySlug('x')`, entonces lanza `CmsError` con `status 500` y `isCmsOutage` es true.
2. Dado `fetch` que rechaza (`TypeError: fetch failed`), entonces lanza `CmsError` (outage).
3. Dado `fetch` que aborta por timeout (`AbortError`), entonces lanza `CmsError` (outage).
4. Ídem 1–3 para `getCarreraBySlug` y `getPageBySlug`.
5. Dado 200 con `docs: []`, entonces devuelve `null` (la página responde 404).
6. Dado respuesta 404 del CMS, entonces devuelve `null`.
7. Dado `getNewsSlugs` con `fetch` caído, entonces `generateStaticParams` devuelve `[]` sin lanzar.
8. Estático: en las tres páginas, el cuerpo del componente por defecto no contiene `getNewsBySlug(slug).catch`, `getCarreraBySlug(slug).catch` ni `try { … } catch { pagina = null }` sobre la consulta publicada.

## Frente C — i18n con archivos faltantes

### Contrato

- Hallazgo: `i18n/request.ts` ya hace **fallback por archivo** a `es` (si `messages/<locale>/<ns>.json` no existe, importa el de `es`). La lógica se extrae a `lib/i18n/loadMessages.ts` (función pura con importador inyectable) para poder probarla; `request.ts` la usa sin cambiar el comportamiento.
- **No hay fallback por clave:** si el archivo del locale existe pero le falta una clave, next-intl muestra `MISSING_MESSAGE`. No se añade en esta tarea (cambio mayor; ver riesgos).
- No se inventan traducciones: los 6 archivos de `en` y los 2 de `pt-BR` siguen faltando (el informe de auditoría también listaba `gn`, pero `messages/gn` ya contiene `ley-5189` y `ley-5282`: hallazgo desactualizado) y se muestran en español. Es deuda editorial.
- Regla del guard `guard-i18n-parity` (decisión): un archivo faltante en un locale **no es fallo** si `lib/i18n/loadMessages.ts` declara `I18N_FALLBACK_LOCALE = 'es'` y `i18n/request.ts` invoca `loadMessages(` (comprobación textual, fuera de comentarios). Esos faltantes se reportan en `informational` como deuda de traducción (visibles, no rojos). Un archivo faltante **sin** fallback comprobable, o un directorio de locale ausente, sigue siendo rojo. El guard no se pone verde si el código no cumple (test negativo).
- Límite: el guard no prueba el runtime; la prueba vitest sí (`/en` de una página faltante entrega los textos de `es`).

### Escenarios Given/When/Then

1. Dado un locale `en` sin `pages.ley-5189.json`, cuando se carga con `loadMessages('en', …)`, entonces `messages.pages['ley-5189']` es el contenido de `es` (sin lanzar ni quedar vacío).
2. Dado un locale con el archivo presente, entonces se usan sus textos (no los de `es`).
3. Dado un namespace ausente también en `es`, entonces se omite sin lanzar.
4. Guard: dado `en` sin `pages.x.json` y fallback declarado → `passed: true` con `informational` listando `en: falta pages.x.json (fallback a es)`.
5. Guard: dado el mismo faltante pero fallback no declarado en el código → `passed: false`.
6. Guard: dado un locale ausente (`null`) → `passed: false`.
7. Guard sobre el repo: sin cambios en rojo/verde reales de otros guards; los 8 faltantes (en: 6, pt-BR: 2) aparecen como informativos.

## Pruebas y rollback

- Pruebas: `tests/unit/safe-url.spec.ts`, `tests/unit/cms-detail-outage.spec.ts`, `tests/unit/i18n-fallback.spec.ts`, `harness/guards.test.mjs`; `npm test`, `npm run typecheck`, `node --test "harness/*.test.mjs"`.
- Rollback: revertir `lib/security/safeUrl.ts`, `lib/cms/errors.ts`, `lib/cms/staticParams.ts`, `lib/i18n/loadMessages.ts`, `i18n/request.ts`, las consultas `news/carreras/pages`, las tres páginas, los componentes listados y `harness/guards.mjs`/test; borrar las tres specs. Sin migraciones ni datos.
