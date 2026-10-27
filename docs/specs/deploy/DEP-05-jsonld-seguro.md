# DEP-05 — JSON-LD seguro contra XSS almacenado

**Estado:** implementación local propuesta; pendiente de verificación en navegador/staging. **Backlog:** DEP-05 (hallazgo alto «Stored XSS through JSON-LD» de `docs/security/AUDIT-DEPLOY-2026-10-19.md`; parte de SEC-10). **Spec de formato:** `docs/specs/security/SEC-005-guardia-rutas-cms.md`. **RDD:** `docs/research/evidence-register.md` (RDD-DEP-04 = hallazgo; RDD-DEP-13 = remediación). No autoriza pentest.

## Contrato

- Existe un único helper `safeJsonLd(value: unknown): string` en `lib/seo/jsonld.ts`. Es la **única** vía permitida para poner un esquema JSON-LD dentro de `dangerouslySetInnerHTML` en un `<script type="application/ld+json">`.
- Serializa con `JSON.stringify` y reemplaza en la salida los caracteres `<`, `>`, `&`, U+2028 y U+2029 por las secuencias `<`, `>`, `&`, ` `, ` `.
- La salida es JSON válido y `JSON.parse(safeJsonLd(x))` es semánticamente igual a `JSON.parse(JSON.stringify(x))`. Los caracteres reemplazados solo pueden aparecer dentro de cadenas JSON (la sintaxis estructural no los usa), por lo que el reemplazo en la cadena completa es seguro.
- Valores no serializables (decisión): el helper **nunca lanza** con datos del CMS, porque un fallo de SEO no debe tumbar el render de la página.
  - `undefined`, función o símbolo en la raíz → `"null"` (JSON válido; `JSON.stringify` devolvería `undefined`, que no es `string`).
  - `BigInt` en cualquier posición → su representación decimal como cadena (`"123"`); `JSON.stringify` lanzaría `TypeError`.
  - Propiedades `undefined`/función dentro de objetos se omiten y en arrays pasan a `null` (comportamiento estándar de `JSON.stringify`).
  - Cualquier otro fallo de serialización (referencia circular, `toJSON` que lanza) → `"null"`. Límite: esto oculta el error; los datos del CMS son JSON plano y no deberían llegar aquí.
- Los 6 sitios (`app/[locale]/layout.tsx` ×2, `app/[locale]/noticias/[slug]/page.tsx` ×2, `app/[locale]/carreras/[slug]/page.tsx` ×2) usan `safeJsonLd(...)`. No cambia el contenido de ningún esquema.

## Escenarios Given/When/Then (negativos primero)

1. **Cierre de script:** dado un título `</script><script>alert(1)</script>`, cuando se serializa y se inserta en `<script type="application/ld+json">…</script>`, entonces el cuerpo no contiene `</script` ni `<script` (sin distinguir mayúsculas) y el HTML tiene un único cierre `</script>`.
2. **Comentario HTML:** dado `<!--`, entonces la salida no contiene `<!--`.
3. **CDATA:** dado `]]>`, entonces la salida no contiene `]]>`.
4. **Separadores de línea:** dados U+2028 y U+2029 en un valor, entonces la salida no contiene esos caracteres crudos y sí ` `/` `.
5. **Ampersand:** dado `&`, la salida contiene `&` y ningún `&` crudo.
6. **Anidado:** dados objetos anidados y arrays con payloads en claves y valores, entonces ningún `<`, `>`, `&` crudo en la salida.
7. **Equivalencia:** dado cualquier valor JSON (incluidos Unicode, comillas, barras invertidas), entonces `JSON.parse(safeJsonLd(x))` deep-equals `x`.
8. **No serializables:** `undefined` → `"null"`; `{ n: 10n }` → `{"n":"10"}`; objeto circular → `"null"`; ninguno lanza.
9. **Esquemas reales:** los builders existentes, alimentados con títulos hostiles, producen salida sin `<` crudo.
10. **Uso obligatorio (estático):** ningún `dangerouslySetInnerHTML` en `app/`, `components/` ni `lib/` usa `JSON.stringify` directamente; los 6 sitios invocan `safeJsonLd`.
11. **Arnés:** `guard-jsonld` pasa a OK sobre el repo.

## Fuera de alcance

- CSP/nonce y retirada de `'unsafe-inline'` (SEC-10 / DEP-16).
- Otros sinks de HTML (no se encontraron otros `dangerouslySetInnerHTML` en `app/`, `components/` ni `lib/`).
- Escapar para atributos HTML o contextos distintos de `<script type="application/ld+json">`: el helper **no** es un sanitizador general.

## Pruebas y rollback

- `tests/unit/seo-jsonld-safe.spec.ts` (helper + test estático de fuentes), `harness/guards.test.mjs` (regla ya existente), `node harness/check.mjs --quick`.
- Rollback: revertir `lib/seo/jsonld.ts` (helper y comentario de uso), los 3 archivos de página/layout a `JSON.stringify(...)` y borrar `tests/unit/seo-jsonld-safe.spec.ts`. Sin migraciones ni datos.
