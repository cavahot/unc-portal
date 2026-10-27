import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * DEP-16 (RDD-DEP-39): comparación de secretos en tiempo constante que no lanza ni filtra la longitud.
 * Amenaza: `timingSafeEqual` lanza RangeError (500) si los buffers difieren en longitud, y comparar
 * `a.length !== b.length` antes revela la longitud del secreto por temporización. Se comparan los
 * digests SHA-256 (siempre 32 bytes) de ambas entradas.
 * Límite: protege contra oráculos de temporización/longitud, no sustituye el límite de tasa ni la
 * fortaleza del secreto.
 */
export function safeEqual(a: string, b: string): boolean {
  const digestA = createHash('sha256').update(a, 'utf8').digest()
  const digestB = createHash('sha256').update(b, 'utf8').digest()
  return timingSafeEqual(digestA, digestB)
}
