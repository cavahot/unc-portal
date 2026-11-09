// MIG-WP-NORM-01: normalizador de título, slug y resumen para scripts/migrate-wordpress.mjs.
// JS puro, sin dependencias y sin red: se prueba con textos sintéticos (tests/unit/wp-normalize.spec.ts).
// Qué hace: (1) pasa las «letras matemáticas» de Unicode a texto común, (2) ordena espacios y longitud del título,
//   (3) regenera el slug cuando WordPress lo trae codificado en porcentaje, (4) deriva el resumen de 20-300 caracteres.
// Por qué existe: auditoría del volcado de 2026-11-09 (docs/specs/migration/AUDITORIA-VOLCADO-WP-2026-11-09.md): 16 títulos
//   con letras matemáticas (inaccesibles para lectores de pantalla y no encontrables por el buscador), 16 slugs `%f0%9d…`,
//   106 títulos en mayúsculas y 278 de 281 noticias sin extracto con un `summary` obligatorio en el CMS.
// Amenazas que evita: texto ilegible o no buscable en el portal público; URL ilegibles; noticias descartadas sin aviso;
//   cambiar el sentido de un título. Límites: no valida la calidad editorial del resumen derivado (por eso se informa su
//   origen); pasar mayúsculas a formato de oración es una decisión del Product Owner y por defecto NO se aplica.
import { stripShortcodes, stripWpComments } from './wpContent.mjs'

/** Rango Unicode «Mathematical Alphanumeric Symbols» (𝗔 𝘢 𝒚 …), usado por las publicaciones con letra decorativa. */
const MATH_ALNUM = /[\u{1D400}-\u{1D7FF}]/gu

export const TITLE_MAX = 150
export const SUMMARY_MIN = 20
export const SUMMARY_MAX = 300
const SLUG_MAX = 100

/** Siglas que se conservan en mayúsculas al pasar un título a formato de oración (ampliable con `opts.siglas`). */
export const SIGLAS = new Set([
  'UNC', 'UNA', 'UNP', 'FCEA', 'FACEN', 'FHCE', 'AUPP', 'ANEAES', 'ARCUSUR', 'CONEU', 'CONES', 'MEC', 'MITIC', 'COVID',
  'UNESCO', 'HAMK', 'CSU', 'OPS', 'OMS', 'ONU', 'IICA', 'MERCOSUR', 'ISBN', 'DOI', 'PDF', 'TIC', 'TICS', 'CIES',
])

// Numerales romanos del I al XXXIX (ediciones y congresos). No incluye L, C, D ni M para no confundir palabras como CIVIL o MI.
const ROMAN = /^(?=[IVX])X{0,3}(?:IX|IV|V?I{0,3})$/

/** Corta en una palabra completa y cierra con «…» sin pasar de `max` caracteres. */
function cutAtWord(text, max) {
  if (text.length <= max) return text
  let base = text.slice(0, max - 1)
  const space = base.lastIndexOf(' ')
  if (space > max * 0.5) base = base.slice(0, space)
  return base.replace(/[\s,;:.\-–—]+$/, '') + '…'
}

/** true si el título no tiene ninguna minúscula y tiene al menos 8 letras (todo en mayúsculas). */
function isAllCaps(text) {
  const letters = text.replace(/[^\p{L}]/gu, '')
  return letters.length >= 8 && letters === letters.toUpperCase() && letters !== letters.toLowerCase()
}

/** Formato de oración conservador: siglas, numerales romanos y tokens con dígitos se respetan. */
function toSentenceCase(text, siglas) {
  let first = true
  return text
    .split(' ')
    .map((token) => {
      const core = token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
      const keep =
        /\d/.test(core) || siglas.has(core.replace(/-/g, '')) || siglas.has(core) || (ROMAN.test(core) && core.length > 0)
      const out = keep ? token : token.toLowerCase()
      if (first && core) {
        first = false
        if (!keep) return out.replace(/\p{L}/u, (c) => c.toUpperCase())
      }
      return out
    })
    .join(' ')
}

/**
 * Normaliza un título. `opts.caps`: `'mantener'` (por defecto) o `'oracion'`. Devuelve `{ title, notes }`; las notas
 * (`titulo_unicode_normalizado`, `titulo_recortado`, `titulo_vacio`, `titulo_mayusculas_a_oracion`) alimentan el informe.
 * Solo se convierten los caracteres del bloque de letras matemáticas: NFKC sobre todo el texto cambiaría `º`, `ª` y otros
 * signos legítimos del español.
 */
export function normalizeTitle(raw, opts = {}) {
  const notes = []
  let t = String(raw ?? '')
  if (MATH_ALNUM.test(t)) {
    MATH_ALNUM.lastIndex = 0
    t = t.replace(MATH_ALNUM, (c) => c.normalize('NFKC'))
    notes.push('titulo_unicode_normalizado')
  }
  MATH_ALNUM.lastIndex = 0
  t = t.normalize('NFC').replace(/[\s ]+/g, ' ').trim()
  if (!t) return { title: 'Sin título', notes: ['titulo_vacio'] }
  if (opts.caps === 'oracion' && isAllCaps(t)) {
    t = toSentenceCase(t, opts.siglas ? new Set([...SIGLAS, ...opts.siglas]) : SIGLAS)
    notes.push('titulo_mayusculas_a_oracion')
  }
  if (t.length > TITLE_MAX) {
    t = cutAtWord(t, TITLE_MAX)
    notes.push('titulo_recortado')
  }
  return { title: t, notes }
}

/** Slug en ASCII (sin tildes) de hasta 100 caracteres. */
function slugify(text, max = SLUG_MAX) {
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/, '')
}

/**
 * Slug de la noticia. Conserva el de WordPress si es legible (las URL existentes no cambian); si viene codificado en
 * porcentaje lo regenera desde el título ya normalizado; si falta, usa el título más el ID.
 * Límite: una colisión con otra noticia la resuelve el importador (sufijo con el ID).
 */
export function slugForPost({ wpSlug, title, id }) {
  const wp = String(wpSlug ?? '').trim()
  const encoded = /%[0-9a-f]{2}/i.test(wp)
  if (wp && !encoded) return { slug: wp.slice(0, SLUG_MAX), notes: [] }
  if (encoded) return { slug: slugify(title) || `noticia-${id}`, notes: ['slug_regenerado'] }
  const suffix = `-${id}`
  return { slug: (slugify(title, SLUG_MAX - suffix.length) || 'noticia') + suffix, notes: [] }
}

/** Texto plano del cuerpo: sin comentarios de Gutenberg, shortcodes de la lista blanca ni etiquetas. */
function plainText(html) {
  return stripShortcodes(stripWpComments(html || ''))
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Resumen de 20 a 300 caracteres. Orden: extracto de WordPress → primer texto del cuerpo → título. Devuelve el origen
 * (`extracto`, `cuerpo`, `titulo`, `insuficiente`) para que el informe marque lo que debe revisar una persona.
 */
export function deriveSummary({ excerpt, content, title }) {
  const ex = String(excerpt ?? '').trim()
  if (ex.length >= SUMMARY_MIN) return { summary: ex.slice(0, SUMMARY_MAX), source: 'extracto' }
  const text = plainText(content)
  if (text.length >= SUMMARY_MIN) return { summary: cutAtWord(text, SUMMARY_MAX), source: 'cuerpo' }
  const t = String(title ?? '').trim()
  if (t.length >= SUMMARY_MIN) return { summary: t.slice(0, SUMMARY_MAX), source: 'titulo' }
  return { summary: null, source: 'insuficiente' }
}

const SUMMARY_NOTE = { cuerpo: 'resumen_desde_cuerpo', titulo: 'resumen_desde_titulo', insuficiente: 'resumen_insuficiente' }

/** Une título, slug y resumen normalizados de una entrada de WordPress, con las notas para el informe. */
export function normalizePost({ id, title, wpSlug, excerpt, content, caps }) {
  const t = normalizeTitle(title, { caps })
  const s = slugForPost({ wpSlug, title: t.title, id })
  const d = deriveSummary({ excerpt, content, title: t.title })
  const notes = [...t.notes, ...s.notes]
  if (SUMMARY_NOTE[d.source]) notes.push(SUMMARY_NOTE[d.source])
  return { title: t.title, slug: s.slug, summary: d.summary, summarySource: d.source, notes }
}
