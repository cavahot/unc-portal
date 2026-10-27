// MIG-WP: lógica pura de limpieza de contenido para scripts/migrate-wordpress.mjs.
// JS puro, sin dependencias y sin red. La única E/S (existencia de un archivo local) llega por el
// parámetro `fileExists`, para poder probar todo con datos sintéticos.

/** Sitio de origen: los uploads de WordPress se sirven desde este host canónico. */
const CANONICAL_UPLOADS = 'https://www.unc.edu.py/wp-content/uploads'
const UPLOAD_HOSTS = new Set(['www.unc.edu.py', 'unc.edu.py', 'migracion.unc.edu.py'])
/** Zona horaria del sitio según uncm1_options (timezone_string). */
export const SITE_TIME_ZONE = 'America/Asuncion'

/**
 * Elimina TODOS los comentarios HTML (incluidos los `<!-- wp:... -->` de Gutenberg, de cierre y
 * multilínea). Se aplica ANTES de quitar etiquetas para no dejar texto residual.
 * Límite: un `-->` dentro de un atributo de comentario cortaría antes; WordPress no lo genera.
 */
export function stripWpComments(html) {
  return (html || '').replace(/<!--[\s\S]*?-->\n?/g, '')
}

// Nombres de shortcodes conocidos del volcado; los prefijos vc_/us_/mitic_ cubren las familias.
const SHORTCODE_NAME = '(?:vc_[a-z0-9_]+|us_[a-z0-9_]+|mitic_[a-z0-9_]+|caption|pdf-embedder|contact-form-7|Ingresar)'
// Apertura: nombre + atributos opcionales de hasta 500 caracteres que no contienen corchetes.
const SHORTCODE_OPEN = new RegExp(`\\[${SHORTCODE_NAME}(?:\\s[^\\[\\]]{0,500})?\\/?\\]`, 'g')
const SHORTCODE_CLOSE = new RegExp(`\\[\\/${SHORTCODE_NAME}\\]`, 'g')

/**
 * Quita solo shortcodes de la lista blanca (apertura y cierre) conservando el texto interno, p. ej.
 * `[caption]Pie[/caption]` -> `Pie`. Corchetes legítimos como "[sic]", "[1]" o "[...]" no se tocan.
 * Amenaza que evita: la expresión anterior `/\[.*?\]/gs` borraba texto real entre corchetes.
 * Límite: atributos con corchetes o de más de ~500 caracteres no se reconocen y se conservan.
 */
export function stripShortcodes(text) {
  return (text || '').replace(SHORTCODE_CLOSE, '').replace(SHORTCODE_OPEN, '')
}

/**
 * Limpia comentarios y shortcodes y devuelve banderas de lo que se eliminó (para el dry-run).
 */
export function cleanContentHtml(html) {
  const source = html || ''
  const noComments = stripWpComments(source)
  const noShortcodes = stripShortcodes(noComments)
  return {
    html: noShortcodes,
    flags: {
      gutenberg: noComments !== source,
      shortcodes: noShortcodes !== noComments,
    },
  }
}

/**
 * Normaliza la URL de una imagen. Los uploads de unc.edu.py / www / migracion se reescriben a
 * `https://www.unc.edu.py/wp-content/uploads/AAAA/MM/archivo` (sin query). Todo lo demás
 * (/application/files, hosts externos como fbcdn, temas) queda 'no recuperable' pero NO se descarta.
 */
export function normalizeUploadUrl(src) {
  const original = (src || '').trim()
  const notRecoverable = { url: original, relPath: null, estado: 'no recuperable' }
  if (!original) return notRecoverable
  let pathname
  try {
    if (original.startsWith('//')) {
      const u = new URL(`https:${original}`)
      if (!UPLOAD_HOSTS.has(u.hostname)) return notRecoverable
      pathname = u.pathname
    } else if (original.startsWith('/')) {
      pathname = original.split(/[?#]/)[0]
    } else {
      const u = new URL(original)
      if (!/^https?:$/.test(u.protocol) || !UPLOAD_HOSTS.has(u.hostname)) return notRecoverable
      pathname = u.pathname
    }
  } catch {
    return notRecoverable
  }
  const m = /^\/wp-content\/uploads\/(\d{4})\/(\d{2})\/([^/]+)$/.exec(pathname)
  if (!m) return notRecoverable
  const relPath = `${m[1]}/${m[2]}/${m[3]}`
  return { url: `${CANONICAL_UPLOADS}/${relPath}`, relPath, estado: 'recuperable' }
}

/**
 * Compone `<dir>/<relPath>` solo si es seguro: sin `..`, sin `.`, sin segmentos vacíos, sin rutas
 * absolutas ni separadores de Windows/unidades. Devuelve null si no lo es.
 * Amenaza que evita: que un `src` malicioso lea archivos fuera del directorio de uploads.
 */
export function safeLocalPath(uploadsDir, relPath) {
  if (!uploadsDir || !relPath) return null
  if (/[\\:\0]/.test(relPath) || relPath.startsWith('/')) return null
  const segments = relPath.split('/')
  if (segments.some((s) => s === '' || s === '.' || s === '..')) return null
  return `${String(uploadsDir).replace(/[\\/]+$/, '')}/${segments.join('/')}`
}

function attr(tag, name) {
  const m = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i').exec(tag)
  return m ? (m[1] ?? m[2] ?? '') : ''
}

/**
 * Extrae todas las `<img src>` del cuerpo (HTML ya decodificado), sin duplicados y en orden.
 * Devuelve `{ url, localPath|null, alt, estado }`; `localPath` solo si el archivo existe en
 * `uploadsDir` (comprobado con `fileExists`, nunca fuera del directorio).
 */
export function extractEmbeddedImages(html, { uploadsDir, fileExists }) {
  const out = []
  const seen = new Set()
  for (const m of (html || '').matchAll(/<img\b[^>]*>/gi)) {
    const src = attr(m[0], 'src')
    if (!src) continue
    const norm = normalizeUploadUrl(src)
    if (seen.has(norm.url)) continue
    seen.add(norm.url)
    let localPath = null
    if (norm.estado === 'recuperable') {
      const candidate = safeLocalPath(uploadsDir, norm.relPath)
      if (candidate && fileExists(candidate)) localPath = candidate
    }
    out.push({ url: norm.url, localPath, alt: attr(m[0], 'alt'), estado: norm.estado })
  }
  return out
}

/**
 * Imagen destacada: miniatura resuelta > primera imagen recuperable del cuerpo > ninguna.
 * Devuelve `{ url, source: 'miniatura'|'cuerpo'|'ninguna', relPath }`.
 */
export function pickFeaturedImage({ thumbnailUrl, embedded }) {
  if (thumbnailUrl) {
    const n = normalizeUploadUrl(thumbnailUrl)
    return { url: n.url, source: 'miniatura', relPath: n.relPath }
  }
  const first = (embedded || []).find((i) => i.estado === 'recuperable')
  if (first) return { url: first.url, source: 'cuerpo', relPath: normalizeUploadUrl(first.url).relPath }
  return { url: null, source: 'ninguna', relPath: null }
}

function tzOffsetMs(utcMs, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(utcMs))
  const g = (t) => Number(parts.find((p) => p.type === t).value)
  return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second')) - Math.floor(utcMs / 1000) * 1000
}

const WP_DATE = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/

/**
 * Fecha de publicación en ISO UTC y la fuente usada: `{ iso, source: 'gmt' | 'local' | null }`.
 * Regla (medida en el volcado, zona America/Asuncion):
 *  1. `post_date_gmt` válido (no '0000-00-00 00:00:00') y DISTINTO de `post_date` -> se usa como UTC.
 *     Incluye Oct 2024-2025, donde el servidor aplicó UTC-4 con tzdata vieja: ese GMT es el UTC real.
 *  2. `post_date_gmt` igual a `post_date` (WordPress no calculó el GMT: noticias importadas 2016-2017, desfase 0),
 *     ausente o inválido -> se convierte `post_date` desde la zona del sitio con la base IANA (Intl).
 *     Si la zona estuviera en offset 0 en esa fecha, la igualdad es legítima y se usa el GMT.
 * Las horas ambiguas (fin de verano) y las lagunas (inicio de verano) se resuelven de forma determinista con
 * dos pasadas del offset IANA. Límite: la conversión depende de la tzdata del Node que ejecuta.
 */
export function wpDateInfo({ post_date: local, post_date_gmt: gmt }, timeZone = SITE_TIME_ZONE) {
  const l = WP_DATE.exec((local || '').trim())
  const localValid = !!l && l[1] !== '0000'
  const g = WP_DATE.exec((gmt || '').trim())
  const gmtValid = !!g && g[1] !== '0000'
  const toUtc = (m) => Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])
  if (gmtValid) {
    const gmtMs = toUtc(g)
    const sameAsLocal = localValid && gmtMs === toUtc(l)
    if (!sameAsLocal || !localValid || tzOffsetMs(gmtMs, timeZone) === 0) {
      return { iso: new Date(gmtMs).toISOString(), source: 'gmt' }
    }
  }
  if (!localValid) return { iso: null, source: null }
  const asUtc = toUtc(l)
  let utc = asUtc - tzOffsetMs(asUtc, timeZone)
  utc = asUtc - tzOffsetMs(utc, timeZone)
  return { iso: new Date(utc).toISOString(), source: 'local' }
}

/** Solo la fecha ISO UTC de `wpDateInfo` (o null si no hay ninguna fecha válida). */
export function wpDateToIso(post, timeZone = SITE_TIME_ZONE) {
  return wpDateInfo(post, timeZone).iso
}
