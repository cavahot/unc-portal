// GLO-GN-01: biblioteca pura del glosario español → guaraní (sin red, sin Payload).
// Spec: docs/specs/i18n/GLOSARIO-GUARANI.md §6. La usan el generador de la siembra, el actualizador de
// fuentes oficiales y las pruebas de los catálogos messages/gn/*.json.

/** Carácter elegido para el puso (saltillo): apóstrofo ASCII, como el CSV del PO y los catálogos previos. */
export const PUSO = "'"

/** Variantes del puso que circulan en corpus y PDF (ver notas_ortografia.md fila 8) y se unifican en PUSO. */
const PUSO_VARIANTS = /[’‘´ꞌʼ]/g

/** Vocales con diéresis que el CSV de la SPL usa por error en lugar de la tilde nasal (notas fila 10). */
const DEGRADED_NASALS = { ä: 'ã', ë: 'ẽ', ï: 'ĩ', ö: 'õ', ü: 'ũ', ÿ: 'ỹ', Ä: 'Ã', Ë: 'Ẽ', Ï: 'Ĩ', Ö: 'Õ', Ü: 'Ũ', Ÿ: 'Ỹ' }

/**
 * Normaliza un texto guaraní: NFC, puso único, nasales con tilde y `g̃` (g + U+0303) en lugar de `ĝ`.
 * Por qué: la misma palabra escrita con caracteres distintos rompe la búsqueda y la coherencia del portal.
 * Límite: no corrige errores léxicos ni acentuación; las diéresis se convierten siempre (en guaraní
 * paraguayo no se usan), lo que sería incorrecto en un préstamo alemán, que el glosario no contiene.
 */
export function normalizeGn(text) {
  if (typeof text !== 'string') return text
  let s = text.normalize('NFC').replace(PUSO_VARIANTS, PUSO)
  s = s.replace(/[äëïöüÿÄËÏÖÜŸ]/g, (c) => DEGRADED_NASALS[c])
  s = s.replace(/ĝ/g, 'g̃').replace(/Ĝ/g, 'G̃')
  return s.normalize('NFC')
}

/** Clave de comparación: minúsculas, sin diacríticos ni puso, espacios simples. */
export function foldKey(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’‘´ꞌʼ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Quita la acepción entre paréntesis del término («técnico (persona)» → «técnico»). */
export function baseTerm(terminoEs) {
  return String(terminoEs).replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Entradas gramaticales del glosario del PO (conjunciones, posposiciones, cifras) que no son terminología:
 * se excluyen del índice porque coincidirían en casi todas las cadenas y taparían los términos reales.
 */
const FUNCTION_WORDS = new Set(['y', 'o', 'segun', 'mediante', 'a partir de', 'sin que', '2020'])

const isWordChar = (ch) => ch !== undefined && /[\p{L}\p{N}]/u.test(ch)

/**
 * Prepara un índice de búsqueda a partir de entradas `{ terminoEs, terminoGn, variantesGn, confianza, activo }`
 * (forma del CMS o de la siembra). Entradas inactivas se ignoran; varias acepciones del mismo término base
 * quedan agrupadas como candidatas.
 */
export function buildIndex(entries) {
  const byKey = new Map()
  for (const e of entries) {
    if (e.activo === false) continue
    const key = foldKey(baseTerm(e.terminoEs))
    if (!key || FUNCTION_WORDS.has(key)) continue
    const list = byKey.get(key) ?? []
    list.push({
      terminoEs: e.terminoEs,
      terminoGn: e.terminoGn ?? '',
      variantesGn: (e.variantesGn ?? []).map((v) => (typeof v === 'string' ? v : v.valor)).filter(Boolean),
      confianza: e.confianza,
      oficial: e.oficial === true,
    })
    byKey.set(key, list)
  }
  const keys = [...byKey.keys()].sort((a, b) => b.length - a.length || a.localeCompare(b))
  return { byKey, keys }
}

/**
 * Busca términos del glosario en una cadena española.
 * Reglas: comparación sin tildes ni mayúsculas, solo palabras completas y, ante solapamiento, gana la
 * coincidencia más larga («entorno virtual de aprendizaje» antes que «entorno»). Ignora el contenido de
 * marcadores ICU `{…}` y etiquetas `<…>`, que no se traducen.
 * Devuelve `[{ termKey, start, end, candidatos }]` ordenado por posición.
 * Límite: no lematiza (no encuentra «universidades» con la entrada «universidad» salvo por prefijo de
 * plural simple -s/-es, que sí se admite).
 */
export function findTerms(text, index) {
  const masked = String(text).replace(/\{[^{}]*\}|<[^>]*>/g, (m) => ' '.repeat(m.length))
  const folded = foldKeyKeepLength(masked)
  const taken = new Array(folded.length).fill(false)
  const hits = []
  for (const key of index.keys) {
    let from = 0
    while (from <= folded.length) {
      const at = folded.indexOf(key, from)
      if (at < 0) break
      let end = at + key.length
      const plural = folded.slice(end).match(/^(es|s)(?![\p{L}\p{N}])/u)
      if (plural) end += plural[0].length
      const okBounds = !isWordChar(folded[at - 1]) && !isWordChar(folded[end])
      const free = !taken.slice(at, end).some(Boolean)
      if (okBounds && free) {
        for (let k = at; k < end; k++) taken[k] = true
        hits.push({ termKey: key, start: at, end, texto: String(text).slice(at, end), candidatos: index.byKey.get(key) })
      }
      from = at + 1
    }
  }
  return hits.sort((a, b) => a.start - b.start)
}

/** Como `foldKey` pero conserva la longitud (para que los índices apunten al texto original). */
function foldKeyKeepLength(text) {
  let out = ''
  for (const ch of text) {
    const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '')
    const piece = (base.length === ch.length ? base : ch).toLowerCase()
    out += piece.length === ch.length ? piece : ch
  }
  return out
}

/**
 * Formas guaraníes que el glosario exige o admite para los términos de una cadena española.
 * `requeridos`: términos con confianza A o B y forma guaraní; `lagunas`: términos X o sin forma.
 */
export function coverage(textEs, index) {
  const hits = findTerms(textEs, index)
  const requeridos = []
  const lagunas = []
  for (const h of hits) {
    const usable = h.candidatos.filter((c) => c.terminoGn && (c.confianza === 'A' || c.confianza === 'B'))
    if (usable.length) requeridos.push({ ...h, formas: usable.flatMap((c) => [c.terminoGn, ...c.variantesGn]) })
    else lagunas.push(h)
  }
  return { requeridos, lagunas }
}

/**
 * Comprueba si una traducción guaraní usa alguna forma del glosario para cada término A/B encontrado.
 * Coincidencia por raíz: la forma del glosario (sin diacríticos) debe aparecer al inicio de una palabra
 * del texto, para admitir sufijos guaraníes (-kuéra, -pe, -gua…). También se acepta el término español
 * conservado como préstamo. Devuelve `[{ termKey, confianza, formas }]` con los términos NO cubiertos.
 * Límite: es un informe para revisión humana, no una prueba de corrección.
 */
export function checkConsistency(textEs, textGn, index) {
  const { requeridos } = coverage(textEs, index)
  const gnWords = foldKey(textGn).split(/[^\p{L}\p{N}]+/u).filter(Boolean)
  const gnFolded = ` ${gnWords.join(' ')} `
  const faltan = []
  for (const r of requeridos) {
    const formas = [...new Set(r.formas.map((f) => foldKey(f)).filter(Boolean))]
    const prestamo = foldKey(r.texto)
    const ok = [...formas, prestamo].some((f) => {
      const first = f.split(' ')[0]
      // Raíces de 4+ letras pueden llevar prefijo personal (e-, o-, ai-…: «eikuaa» contiene «kuaa»).
      if (f.includes(' ')) return gnFolded.includes(` ${f}`)
      return gnWords.some((w) => (first.length >= 4 ? w.includes(first) : w.startsWith(first)))
    })
    if (!ok) faltan.push({ termKey: r.termKey, confianza: r.candidatos.map((c) => c.confianza).sort()[0], formas })
  }
  return faltan
}
