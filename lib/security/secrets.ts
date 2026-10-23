/**
 * DEP-16 (RDD-DEP-38): validación de secretos del portal (PREVIEW_SECRET, REVALIDATION_SECRET).
 *
 * Amenaza: un handler que acepta cualquier cosa (o compara contra cadena vacía) cuando el secreto
 * falta o es de ejemplo. Los handlers responden 503 genérico y registran solo el NOMBRE de la
 * variable, nunca su valor.
 * Límite: copia deliberada de `apps/cms/src/config/secrets.ts` (el portal no importa del CMS,
 * RDD-DEP-31); `tests/unit/dep16-secrets.spec.ts` falla si las listas divergen. Heurística de
 * forma; no mide entropía real.
 */

/** Longitud mínima aceptada (igual que en el CMS y DEPLOY.md). */
export const MIN_SECRET_LENGTH = 32

/** Fragmentos (minúsculas) de valores de ejemplo; mantener idéntica a la del CMS. */
export const WEAK_SECRET_MARKERS = [
  'changeme',
  'change-this',
  'change_me',
  'reemplazar',
  'replace-me',
  'replace_me',
  'placeholder',
  'your-',
  'secret-here',
] as const

const MIN_DISTINCT_CHARS = 8

/** true si el valor cumple longitud, no contiene marcadores de ejemplo y tiene diversidad mínima. */
export function isStrongSecret(value: string | undefined | null): boolean {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  if (trimmed.length < MIN_SECRET_LENGTH) return false
  const lower = trimmed.toLowerCase()
  if (WEAK_SECRET_MARKERS.some((marker) => lower.includes(marker))) return false
  return new Set(trimmed).size >= MIN_DISTINCT_CHARS
}

/**
 * Valida el valor de un secreto ya leído por el llamador (lectura explícita del entorno, para que
 * guard-env-parity vea la lectura). Devuelve el valor si es fuerte; si falta o es débil devuelve null y
 * registra (por `log`, `console.error` por defecto) únicamente el NOMBRE de la variable.
 * Amenaza: operar con secreto débil y filtrarlo en logs. Límite: el log no distingue ausente de débil.
 */
export function readStrongSecret(
  name: string,
  value: string | undefined,
  log: (...args: unknown[]) => void = console.error,
): string | null {
  if (!isStrongSecret(value)) {
    log(`[DEP-16] ${name} ausente o débil: el endpoint responde 503 hasta corregirlo`)
    return null
  }
  // Se devuelve el valor tal cual (sin trim): el CMS envía el Bearer con el valor crudo de la misma variable.
  return value as string
}
