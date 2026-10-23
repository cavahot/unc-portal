# DEP-19b — Frontend y CMS: enlaces de navegación, datos demo en producción y revalidación fiable

**Estado:** implementación local propuesta; pendiente de verificación con `next build`/staging (no ejecutado: sin red, Docker ni build en esta tarea). **Origen:** revisiones frescas de riesgo y resiliencia posteriores a DEP-15/DEP-16. **Spec de formato:** `DEP-15-frontend-enlaces-404-i18n.md` (formato SEC-005). **RDD:** `docs/research/evidence-register.md` (RDD-DEP-50 a RDD-DEP-56). **No** toca `.github/`, `infrastructure/`, `tests/deploy/` ni `DEPLOY.md` (DEP-19a).

## Frente 5 — `safeHref` en la navegación del CMS

### Contrato

- `resolveHref` de `components/navigation/MegaMenu.tsx` deja de devolver `link.url` tal cual: toda URL de un enlace `manual` pasa por `safeHref`. Un editor del global Navegación (o una cuenta comprometida) ya no puede publicar `javascript:` ejecutable en el menú.
- Además, cada `href` renderizado en `MegaMenu` (6 sitios) y en `AcademicSectionPage` (migas y acciones) pasa por `safeHref` en el propio JSX (defensa en profundidad; `safeHref` es idempotente).
- `Footer`, `app/[locale]/page.tsx`, `contacto`, `informacion-publica`, `institucional`, `mapa-sitio`, `InstitutionalAccessSection`, `contacto/dependencias`, `noticias` (paginación) y `LocaleSwitcher` **no** reciben URLs del CMS (listas literales del propio archivo, constantes o rutas calculadas): quedan como excepciones documentadas en el test estático, cada una con su justificación.
- Test estático ampliado: recorre **todos** los `.tsx` de `app/` y `components/`; todo `href={expr}` no literal debe contener `safeHref(`, ser un identificador asignado con `const x = safeHref(`, o estar en la lista de excepciones con razón. Las excepciones no pueden importar `@unc/cms-types` ni leer campos de documentos del CMS en el `href` (se comprueba con un patrón).
- Límite: `href` en objetos (`{ pathname }`) y atributos `src` quedan fuera. Una ruta relativa sin barra (`contacto`) queda en `#` (heredado de DEP-15).

### Escenarios Given/When/Then (negativos primero)

1. Dado un enlace de navegación `manual` con `javascript:alert(1)`, ` JaVaScRiPt:alert(1)`, `data:text/html,…` o `//evil.com`, cuando se mapea con `mapCmsNavigation`, entonces `href` es `#`.
2. Ídem para un hijo (`children`).
3. Dado el mismo enlace hostil, cuando se renderiza `MegaMenu`, entonces el HTML no contiene `javascript:` ni `//evil.com` en ningún `href`.
4. Dados `https://unc.edu.py/x`, `mailto:a@unc.edu.py`, `tel:+595123`, `/noticias`, `#ancla`, entonces se conservan.
5. Dado un enlace `relationship` con página relacionada, entonces `/<slug>` (sin cambios).
6. Estático: introducir `href={algo.url}` sin `safeHref` en cualquier `.tsx` de `app/` o `components/` hace fallar el test.

## Frente 6 — Sin datos demo en producción

### Contrato

- Funciones afectadas: `getNews`, `getTribunalMiembros`, `getTribunalDocumentos`, `getConvenios`, `getFAQs`, `getCarreras`, `getCarrerasByFacultadAndTipo`, `getCarrerasByFacultad`.
- Producción (y test): CMS caído (red, timeout, 5xx, 401/403) → **propaga `CmsError`** (distinguible con `isCmsOutage`). CMS responde 200 con lista vacía → **lista vacía real** (nunca datos inventados). Solo `NODE_ENV === 'development'` devuelve demo/fallback, tanto ante error como ante lista vacía donde ya ocurría (tribunal).
- `app/[locale]/convenios/page.tsx` y `app/[locale]/tribunal-electoral/page.tsx` dejan de capturar el error para sustituirlo por demo; el error llega a `app/[locale]/error.tsx`.
- Corrección colateral: `getConvenios` llamaba a `cmsFetch('/api/convenios…')` y el cliente ya antepone `/api` (URL final `/api/api/convenios`, 404 siempre) y usaba `next: { tags }` que el cliente ignora. Antes el demo lo ocultaba; ahora se llama a `/convenios…` con `tags`.
- **No** se tocan (decisión): `FALLBACK_NAVIGATION` (menú institucional real, sin datos personales), `FALLBACK_STATS`, `FALLBACK_ARANCELES` y `FALLBACK_FACULTADES` (datos institucionales estáticos, no personas ni contenido inventado; **riesgo**: pueden quedar desactualizados, requiere decisión editorial) y `institutional.ts` (cada página captura y muestra estado vacío).
- Límite: los datos demo del tribunal contienen nombres reales; nunca deben servirse como si el CMS los hubiera publicado.

### Escenarios Given/When/Then (negativos primero)

1. Dado `NODE_ENV=production` y `fetch` con 503, cuando se llama a cada función afectada, entonces lanza `CmsError` con `status 503` e `isCmsOutage` true.
2. Dado `production` y `fetch` que rechaza (`TypeError`) o aborta, entonces lanza `CmsError`.
3. Dado `production` y 200 `{ docs: [] }`, entonces devuelve lista vacía (`getNews`: `docs: []`).
4. Dado `development` y 503, entonces devuelve demo (no lanza).
5. Dado `development` y tribunal vacío, entonces devuelve demo (comportamiento heredado para sembrar).
6. Dado `production`, `getConvenios` llama a `<CMS_URL>/api/convenios?…` (una sola vez `/api`).
7. Estático: las páginas de convenios y tribunal no contienen `.catch(() => DEMO_`.

## Frente 7 — Revalidación CMS → portal fiable y no bloqueante

### Contrato

- Un único helper en `apps/cms/src/utilities/revalidation.ts` (ampliado; no importa nada de `lib/` del portal). `revalidatePortalTag`/`revalidatePortalPath` lo usan; los hooks de `Convenios`, `TribunalDocumentos` y `TribunalMiembros` dejan de hacer `fetch` propio.
- Cada intento usa `AbortSignal.timeout(3000)`. Hasta 2 reintentos (3 intentos) para error de red/timeout, 5xx y 429; espera corta (200 ms × intento) o `Retry-After` en segundos con tope de 2 s. 4xx distinto de 429 (401, 400, 403) **no** se reintenta.
- Log (`console.error`) con colección/etiqueta, `status` o motivo y nº de intento; **nunca** el secreto, el `Authorization` ni el cuerpo. Un fallo final se registra como fallo, no se oculta.
- La función **nunca lanza**: un fallo del portal no puede romper el guardado/publicación del editor.
- Secreto ausente o débil (mismo criterio que el portal: ≥ 32 caracteres, sin marcadores de ejemplo): **0 llamadas**, un único log claro por proceso (no un log por guardado) y salida. Nunca se envía `Bearer ` vacío.
- Se lee el secreto en cada llamada (no al importar el módulo), para que un cambio de entorno en caliente o un test lo vea.
- Corrección colateral: el portal rechazaba (400) las etiquetas `paginas:*` que enviaba el hook de Páginas y no entendía `paginas:list`; ahora el hook envía `paginas-slugs` (la que consume `getPageSlugs`) y la ruta acepta `paginas-slugs` y `paginas:<slug>` (`^[a-z0-9-]{1,80}$`).
- Límites: no hay cola ni persistencia: si el portal cae más de ~10 s la invalidación se pierde y el contenido se actualiza al vencer `revalidate`. El `await` del helper puede añadir hasta ~10 s al guardado en el peor caso (3 intentos × 3 s + esperas); es el coste de no ocultar el fallo sin cola. Las etiquetas por documento de noticias (`noticias:<slug>`) no se revalidan desde el hook (pendiente, ver riesgos).

### Escenarios Given/When/Then (negativos primero)

1. Dado secreto vacío, cuando se revalida, entonces 0 llamadas a `fetch` y un log claro (una vez).
2. Dado secreto débil (`changeme…`), entonces 0 llamadas.
3. Dado `fetch` que aborta por timeout en los 3 intentos, entonces 3 llamadas, log final con motivo, y no lanza.
4. Dado 401, entonces 1 llamada, log con `status 401`, no reintenta, no lanza.
5. Dado 429 con `Retry-After: 1`, entonces reintenta y, si luego 200, termina con 2 llamadas.
6. Dado 503 y luego 200, entonces 2 llamadas y sin log de error final.
7. Dado 200, entonces 1 llamada, con `signal` presente y `Authorization: Bearer <secreto>`.
8. Ningún log contiene el secreto ni el cuerpo de la petición.
9. Los hooks `afterChange` de Convenios/TribunalDocumentos/TribunalMiembros, con `fetch` que lanza, resuelven sin lanzar.
10. Estático: los tres hooks no contienen `fetch(` y usan `revalidatePortalTag`.

## Pruebas y rollback

- Pruebas: `tests/unit/dep19b-nav-href.spec.ts`, `tests/unit/dep19b-demo-prod.spec.ts`, `tests/unit/dep19b-revalidate.spec.ts`, y el test estático ampliado en `tests/unit/safe-url.spec.ts`.
- Rollback por bloques: (5) revertir `MegaMenu.tsx`, `AcademicSectionPage.tsx` y el bloque estático de `safe-url.spec.ts`; (6) revertir `lib/cms/queries/{news,tribunal,convenios,faqs,carreras}.ts` y las dos páginas; (7) revertir `apps/cms/src/utilities/revalidation.ts`, los tres hooks, `Paginas.ts` y `app/api/revalidate/route.ts`. Sin migraciones ni datos.
