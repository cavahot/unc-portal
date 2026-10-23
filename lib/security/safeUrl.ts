// DEP-15 (Frente A): neutraliza URLs del CMS antes de ponerlas en un `href`.
// Evidencia RDD: RDD-DEP-23 (docs/research/evidence-register.md). Spec: docs/specs/deploy/DEP-15-frontend-enlaces-404-i18n.md.

/** Longitud máxima aceptada; una URL mayor es abuso o dato corrupto. */
const MAX_URL_LENGTH = 2048

/** Allowlist de esquema (DEP-15): http(s), mailto, tel, ruta absoluta propia y ancla. */
const ALLOWED = /^(https?:|mailto:|tel:|\/|#)/i

/** Caracteres de control C0/C1 (incluye tab, CR, LF, NUL): los navegadores los ignoran dentro del esquema. */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/

/**
 * Devuelve la URL recortada si pertenece a la allowlist; en cualquier otro
 * caso devuelve '#'. Es la única vía permitida para poner datos del CMS en un
 * `href` (DEP-15).
 *
 * Amenaza que evita: `javascript:`, `data:` y `vbscript:` (también con
 * mayúsculas mezcladas, tab/salto de línea dentro del esquema o espacio
 * inicial) ejecutan código en el origen del portal al hacer clic; React 19 solo
 * advierte. También rechaza `//host` y `/\host` (salida silenciosa a otro
 * origen) y cualquier `\` (los navegadores lo normalizan a `/`).
 *
 * Límites: no valida que el destino exista ni que sea de confianza (un
 * `https://` hostil sigue siendo un enlace externo); una ruta relativa sin
 * barra inicial (`contacto`) también se descarta; no protege atributos `src`.
 */
export function safeHref(url: unknown): string {
  if (typeof url !== 'string') return '#'
  const value = url.trim()
  if (!value || value.length > MAX_URL_LENGTH) return '#'
  if (CONTROL_CHARS.test(value) || value.includes('\\')) return '#'
  if (value.startsWith('//')) return '#'
  if (!ALLOWED.test(value)) return '#'
  return value
}
