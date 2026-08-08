/**
 * Generates a URL-safe slug from arbitrary text.
 *
 * - Strips diacritics (NFD decomposition)
 * - Lowercases and trims
 * - Replaces non-alphanumeric runs with a single hyphen
 * - Strips leading / trailing hyphens
 * - Truncates to `maxLength` characters (default 100)
 *
 * @example
 * slugify('Ciencias Agrarias') // → 'ciencias-agrarias'
 * slugify('CONVOCATORIA — 2026')  // → 'convocatoria-2026'
 */
export function slugify(text: string, maxLength = 100): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
}
