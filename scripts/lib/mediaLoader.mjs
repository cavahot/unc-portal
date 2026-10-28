// MIG-IMG fase 3: lógica del cargador masivo de imágenes de noticias (WordPress -> Media de Payload).
// Parte PURA (sin red ni disco salvo lo inyectado): validación de bytes, lectura del volcado, manifiesto,
// informe, selección de subidas y plan de enlaces. La parte con red (cliente HTTP, fases 1 y 2) está al
// final del archivo y recibe `fetch`, `sleep` y lectura de archivos por parámetro para probarla sin CMS.
// Spec: docs/specs/migration/MIG-IMG-imagenes-de-noticias.md §5.3, §8, §10 y §11. Español neutro en comentarios.
import { createHash } from 'node:crypto'
import { extractEmbeddedImages, normalizeUploadUrl, wpDateInfo } from './wpContent.mjs'
import { backoffMs, MAX_RETRIES } from './retry.mjs'
import { buildStepBody, checkIdentities, remainingSteps } from './wpPublishFlow.mjs'

/** Tope por archivo: el techo aceptado del CMS (MEDIA_MAX_BYTES_CEILING = 11 MiB, apps/cms/src/config/mediaStorage.ts). */
export const MEDIA_MAX_BYTES = 11 * 1024 * 1024
/** Máximo de filas de `noticias.gallery` (Noticias.ts: maxRows 30). */
export const GALLERY_MAX = 30
/** Ruta relativa admitida de un archivo del lote: AAAA/MM/archivo (misma forma que `sourcePath`). */
const REL_PATH_RE = /^(\d{4})\/(\d{2})\/([^/\\]+)$/

/** sha256 hexadecimal de los bytes. Es la clave de idempotencia (el CMS guarda el hash del ORIGINAL). */
export function sha256Hex(data) {
  return createHash('sha256').update(data).digest('hex')
}

/* ───────────── Validación de bytes (copia sin sharp de apps/cms/src/utilities/uploadGuard.ts) ───────────── */

// Tipos que acepta el lote. AVIF/PDF/DOC quedan fuera: el volcado de noticias solo trae jpeg/png/webp/gif.
const TYPES = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'image/gif': ['gif'],
}
// Segmentos intermedios que delatan una doble extensión ejecutable (a.php.jpg). Misma lista que el CMS.
const DANGEROUS_MIDDLE_EXTS = new Set([
  'php', 'phtml', 'php3', 'php4', 'php5', 'phar', 'html', 'htm', 'xhtml', 'svg', 'xml', 'js', 'mjs', 'cjs',
  'jsp', 'asp', 'aspx', 'cgi', 'pl', 'py', 'rb', 'sh', 'bash', 'bat', 'cmd', 'exe', 'dll', 'jar', 'com', 'ps1',
])

/** Tipo por firma («magic bytes»); null si no es una imagen admitida. SVG nunca se reconoce. */
function detectMime(b) {
  const at = (...bytes) => bytes.every((v, i) => b[i] === v)
  if (at(0xff, 0xd8, 0xff)) return 'image/jpeg'
  if (at(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'image/png'
  if (at(0x47, 0x49, 0x46, 0x38) && (b[4] === 0x37 || b[4] === 0x39) && b[5] === 0x61) return 'image/gif'
  if (at(0x52, 0x49, 0x46, 0x46) && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp'
  return null
}

/** Extensión (minúsculas) si el nombre es seguro; null si no. Rechaza rutas, `..`, NUL/controles y doble extensión. */
function safeExtension(filename) {
  if (typeof filename !== 'string' || filename.trim() === '') return null
  for (let i = 0; i < filename.length; i++) {
    const code = filename.charCodeAt(i)
    if (code <= 0x1f || code === 0x7f) return null
  }
  if (/[\\/]/.test(filename) || filename.includes('..')) return null
  const parts = filename.split('.')
  if (parts.length < 2 || parts[0] === '') return null
  const ext = parts[parts.length - 1].toLowerCase()
  if (ext === '') return null
  if (parts.slice(1, -1).some((p) => DANGEROUS_MIDDLE_EXTS.has(p.toLowerCase()))) return null
  return ext
}

/**
 * Valida un archivo ANTES de cualquier petición: nombre seguro, no vacío, <= maxBytes, firma de imagen
 * admitida y extensión coherente con la firma. Devuelve `{ok:true,mimeType,ext}` o `{ok:false,code}` con
 * code ∈ nombre|vacio|tamano|tipo|extension (nunca eco del contenido).
 * Amenaza que evita: subir un HTML/SVG/script renombrado .jpg o un nombre con `../`.
 * Límite: no decodifica la imagen (sin sharp); el CMS repite la guardia y la decodifica por completo.
 */
export function validateUploadBytes({ filename, data, maxBytes = MEDIA_MAX_BYTES }) {
  const ext = safeExtension(filename)
  if (!ext) return { ok: false, code: 'nombre' }
  if (!data || data.length === 0) return { ok: false, code: 'vacio' }
  if (data.length > maxBytes) return { ok: false, code: 'tamano' }
  const mimeType = detectMime(data)
  if (!mimeType || !TYPES[mimeType]) return { ok: false, code: 'tipo' }
  if (!TYPES[mimeType].includes(ext)) return { ok: false, code: 'extension' }
  return { ok: true, mimeType, ext }
}

/* ───────────── Lectura del volcado WordPress ───────────── */

function decodeEntities(s) {
  return (s || '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(parseInt(c, 10)))
}

function parseTableRows(xml, tableName) {
  const tableRe = new RegExp(`<table name="${tableName}">[\\s\\S]*?<\\/table>`, 'g')
  const colRe = /<column name="([^"]+)">([\s\S]*?)<\/column>/g
  const rows = []
  for (const tableMatch of xml.matchAll(tableRe)) {
    const cols = {}
    for (const col of tableMatch[0].matchAll(colRe)) cols[col[1]] = decodeEntities(col[2])
    if (Object.keys(cols).length > 0) rows.push(cols)
  }
  return rows
}

// Idéntico a slugify de scripts/migrate-wordpress.mjs: el slug es la clave de unión noticia <-> post.
function slugify(text) {
  return text.toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100)
}

/**
 * Posts publicados del volcado con el MISMO slug que calcula migrate-wordpress.mjs (`migratePosts`):
 * post_name (<=100) o slugify(título)-ID; si el slug ya apareció en la corrida, se recorta a 94 y se
 * agrega -ID. Añade año/mes locales (post_date en America/Asuncion) y la miniatura resuelta
 * (`_thumbnail_id` -> guid del adjunto). Por qué: enlazar la imagen equivocada a otra noticia sería peor
 * que no enlazar. Límite: solo reproduce el orden del volcado completo (sin --limit del importador); una
 * noticia que el importador omitió (sin resumen) no existirá en el CMS y quedará `pendiente`.
 */
export function parseWpPosts(xml) {
  const rows = parseTableRows(xml, 'uncm1_posts')
  const attachments = Object.fromEntries(rows.filter((p) => p.post_type === 'attachment' && p.guid).map((p) => [p.ID, p.guid]))
  const thumbnailByPostId = {}
  for (const meta of parseTableRows(xml, 'uncm1_postmeta')) {
    if (meta.meta_key === '_thumbnail_id' && meta.meta_value) {
      const url = attachments[meta.meta_value.trim()]
      if (url) thumbnailByPostId[meta.post_id] = url
    }
  }
  const seen = new Set()
  const out = []
  for (const post of rows.filter((p) => p.post_type === 'post' && p.post_status === 'publish')) {
    const title = (post.post_title || 'Sin título').slice(0, 150)
    let slug = post.post_name ? post.post_name.slice(0, 100) : `${slugify(title)}-${post.ID}`
    if (seen.has(slug)) slug = `${slug.slice(0, 94)}-${post.ID}`
    seen.add(slug)
    const local = /^(\d{4})-(\d{2})-\d{2}/.exec(post.post_date || '')
    const iso = local ? null : wpDateInfo(post).iso
    out.push({
      id: post.ID,
      slug,
      title,
      year: local ? Number(local[1]) : Number((iso || '0000').slice(0, 4)),
      month: local ? Number(local[2]) : Number((iso || '0000-00').slice(5, 7)),
      content: post.post_content || '',
      thumbnailUrl: thumbnailByPostId[post.ID] || null,
    })
  }
  return out
}

/* ───────────── Manifiesto ───────────── */

/** Largo máximo razonable de un texto alternativo (lectores de pantalla); el CMS admite hasta 300. */
const ALT_MAX = 150

/** Normaliza: NFKC (letras decorativas Unicode -> texto plano), sin `<`/`>`, espacios colapsados. */
function normalizeAltText(v) {
  return String(v ?? '').normalize('NFKC').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim()
}

/**
 * true si el texto NO sirve como alternativa: vacío/muy corto, solo dígitos, genérico numerado
 * («Noticia 6», «Imagen 3», «Título de la noticia 1»), nombre de archivo de cámara (IMG_2024...) o con
 * extensión de imagen. Amenaza que evita: alt inútil o engañoso para lectores de pantalla.
 */
export function isPoorAlt(value) {
  const t = normalizeAltText(value)
  if (t.length < 4) return true
  if (/^\d[\d\s._-]*$/.test(t)) return true
  if (!/\s/.test(t)) return true // una sola palabra o un nombre de archivo (16-acto-pro): no describe la imagen
  if (/^(noticia|imagen|image|foto|img|photo|picture|dsc)[\s_-]*\d*$/i.test(t)) return true
  if (/^t[ií]tulo de la noticia\s*\d*$/i.test(t)) return true
  if (/^(img|dsc|image|foto|screenshot|captura)[\s_-]?\d{3,}/i.test(t)) return true
  return /\.(jpe?g|png|gif|webp)$/i.test(t)
}

function cutAlt(t) {
  if (t.length <= ALT_MAX) return t
  return t.slice(0, ALT_MAX).replace(/\s+\S*$/, '').trim() || t.slice(0, ALT_MAX)
}

/** Primer candidato (en orden) que no sea pobre, normalizado y recortado; si ninguno, un genérico honesto. */
export function pickAlt(candidates) {
  for (const c of candidates) {
    const t = normalizeAltText(c)
    if (t && !isPoorAlt(t)) return cutAlt(t)
  }
  return 'Imagen de la noticia'
}

/** Texto alternativo válido para Media (1-300, sin `<`/`>`): `alt` > `fallback` (título) > genérico. */
export function cleanAlt(alt, fallback = '') {
  return pickAlt([alt, fallback])
}

/**
 * Textos propios de los adjuntos del volcado por ruta AAAA/MM/archivo: `_wp_attachment_image_alt` y
 * `post_title`. Se usan como candidatos de alt (mejores que el título de una noticia genérica).
 */
export function parseAttachmentTexts(xml) {
  const rows = parseTableRows(xml, 'uncm1_posts').filter((p) => p.post_type === 'attachment' && p.guid)
  const altById = {}
  for (const meta of parseTableRows(xml, 'uncm1_postmeta')) {
    if (meta.meta_key === '_wp_attachment_image_alt' && meta.meta_value) altById[meta.post_id] = meta.meta_value
  }
  const out = {}
  for (const a of rows) {
    const m = /\/wp-content\/uploads\/(\d{4}\/\d{2}\/[^/]+)$/.exec(a.guid)
    if (m) out[m[1]] = [altById[a.ID], a.post_title].filter(Boolean)
  }
  return out
}

/**
 * Por noticia: imagen destacada (miniatura > primera del cuerpo, la primera que EXISTA en disco), galería
 * (resto del cuerpo local, sin duplicar la destacada, máx. 30, orden WordPress) y `missing` (referenciadas
 * y recuperables que no están en la carpeta, p. ej. 2016-2023). Sin imagen local -> featured null (no es un
 * error: se informa). Límite: `fileExists` es la única E/S; rutas pasan por safeLocalPath (wpContent).
 */
export function buildNoticiaEntries(posts, { uploadsDir, fileExists, attachmentTexts = {} }) {
  return posts.map((post) => {
    const embedded = extractEmbeddedImages(post.content, { uploadsDir, fileExists })
    const bodyItems = embedded
      .filter((i) => i.estado === 'recuperable')
      .map((i) => ({ relPath: normalizeUploadUrl(i.url).relPath, local: Boolean(i.localPath), alt: i.alt }))
    const thumbRel = post.thumbnailUrl ? normalizeUploadUrl(post.thumbnailUrl).relPath : null
    const altByRel = new Map(bodyItems.map((i) => [i.relPath, i.alt]))
    const thumbLocal = thumbRel ? isLocal(uploadsDir, thumbRel, fileExists) : false

    const candidates = []
    if (thumbRel) candidates.push({ relPath: thumbRel, local: thumbLocal, source: 'miniatura' })
    for (const i of bodyItems) candidates.push({ relPath: i.relPath, local: i.local, source: 'cuerpo' })

    const missing = [...new Set(candidates.filter((c) => !c.local).map((c) => c.relPath))]
    const first = candidates.find((c) => c.local)
    const featured = first
      ? { relPath: first.relPath, alt: pickAlt([altByRel.get(first.relPath), ...(attachmentTexts[first.relPath] ?? []), post.title]), source: first.source }
      : null

    const gallery = []
    const seen = new Set(featured ? [featured.relPath] : [])
    for (const i of bodyItems) {
      if (!i.local || seen.has(i.relPath)) continue
      seen.add(i.relPath)
      if (gallery.length < GALLERY_MAX) gallery.push({ relPath: i.relPath, alt: pickAlt([i.alt, ...(attachmentTexts[i.relPath] ?? []), post.title]) })
    }
    return { postId: post.id, slug: post.slug, title: post.title, year: post.year, month: post.month, featured, gallery, missing }
  })
}

function isLocal(uploadsDir, relPath, fileExists) {
  if (!REL_PATH_RE.test(relPath)) return false
  return fileExists(`${String(uploadsDir).replace(/[\\/]+$/, '')}/${relPath}`)
}

/* ───────────── Inventario e informe ───────────── */

/**
 * Describe un archivo del lote: tamaño, sha256 y resultado de la validación. `relPath` debe ser
 * AAAA/MM/archivo. Un archivo rechazado conserva su sha256 y el motivo (`reason` = código de validación).
 */
export function describeFile(relPath, data) {
  const m = REL_PATH_RE.exec(relPath)
  const base = { relPath, bytes: data.length, sha256: sha256Hex(data), year: m ? Number(m[1]) : null, month: m ? Number(m[2]) : null }
  if (!m) return { ...base, status: 'rechazado', reason: 'ruta' }
  const v = validateUploadBytes({ filename: m[3], data })
  return v.ok ? { ...base, status: 'valido', mimeType: v.mimeType } : { ...base, status: 'rechazado', reason: v.code }
}

const byKey = (obj) => Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)))
const bump = (obj, key) => { obj[key] = (obj[key] || 0) + 1 }

/** Rutas referenciadas (destacada + galería) por alguna noticia. */
function referencedSet(noticias) {
  const s = new Set()
  for (const n of noticias) {
    if (n.featured) s.add(n.featured.relPath)
    for (const g of n.gallery) s.add(g.relPath)
  }
  return s
}

/** Informe de la fase 0: solo conteos y nombres de archivo/slug (nunca contenido ni credenciales). */
export function buildReport({ noticias, files }) {
  const valid = files.filter((f) => f.status === 'valido')
  const rejectedByReason = {}
  const byYear = {}
  const byYearMonth = {}
  for (const f of files) {
    if (f.status === 'rechazado') bump(rejectedByReason, f.reason)
    if (f.year) bump(byYear, f.year)
    if (f.year) bump(byYearMonth, `${f.year}/${String(f.month).padStart(2, '0')}`)
  }
  const groups = new Map()
  for (const f of valid) groups.set(f.sha256, [...(groups.get(f.sha256) || []), f.relPath])
  const duplicates = [...groups.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([sha256, list]) => ({ sha256, files: list.sort() }))
    .sort((a, b) => a.files[0].localeCompare(b.files[0]))

  const refs = referencedSet(noticias)
  const rejectedRel = new Set(files.filter((f) => f.status === 'rechazado').map((f) => f.relPath))
  const withoutImage = noticias.filter((n) => !n.featured)
  const withoutImageByYear = {}
  const withoutImageSlugsByYear = {}
  for (const n of withoutImage) {
    bump(withoutImageByYear, n.year)
    withoutImageSlugsByYear[n.year] = [...(withoutImageSlugsByYear[n.year] || []), n.slug]
  }
  const noticiasByYear = {}
  for (const n of noticias) bump(noticiasByYear, n.year)

  return {
    files: {
      total: files.length,
      valid: valid.length,
      rejected: files.length - valid.length,
      rejectedByReason: byKey(rejectedByReason),
      byYear: byKey(byYear),
      byYearMonth: byKey(byYearMonth),
      duplicatesBySha256: duplicates,
    },
    noticias: {
      total: noticias.length,
      byYear: byKey(noticiasByYear),
      withFeatured: noticias.length - withoutImage.length,
      withGallery: noticias.filter((n) => n.gallery.length > 0).length,
      withoutImage: withoutImage.length,
      withoutImageByYear: byKey(withoutImageByYear),
      withoutImageSlugsByYear: byKey(withoutImageSlugsByYear),
    },
    orphans: valid.filter((f) => !refs.has(f.relPath)).map((f) => f.relPath).sort(),
    referencedButRejected: [...refs].filter((r) => rejectedRel.has(r)).sort(),
    referencedButMissing: [...new Set(noticias.flatMap((n) => n.missing))].sort(),
  }
}

/**
 * Candidatos a subir (fase 1): válidos y referenciados por alguna noticia (o todos los válidos con
 * `includeOrphans`). Por qué no huérfanos: suelen ser variantes de tamaño (-300x200) que ninguna noticia usa.
 */
export function uploadCandidates({ noticias, files, includeOrphans = false }) {
  const refs = referencedSet(noticias)
  return files
    .filter((f) => f.status === 'valido' && (includeOrphans || refs.has(f.relPath)))
    .sort((a, b) => a.relPath.localeCompare(b.relPath))
}

/**
 * Archivos a subir (fase 1): los candidatos ordenados por ruta y con un solo representante por sha256
 * (los demás se resuelven con `duplicateAliases` sobre los mismos candidatos).
 */
export function selectUploads(args) {
  const seen = new Set()
  return uploadCandidates(args).filter((f) => !seen.has(f.sha256) && seen.add(f.sha256))
}

/** `relPath` duplicado por contenido -> relPath representante (el primero por orden alfabético). */
export function duplicateAliases(files) {
  const first = new Map()
  const alias = {}
  for (const f of [...files].filter((x) => x.status === 'valido').sort((a, b) => a.relPath.localeCompare(b.relPath))) {
    if (first.has(f.sha256)) alias[f.relPath] = first.get(f.sha256)
    else first.set(f.sha256, f.relPath)
  }
  return alias
}

/**
 * Plan de enlace de una noticia: id de la destacada, filas de galería `{image, caption}` (sin repetir ids
 * ni la destacada) y `missing` (rutas sin media creada todavía). `idByRel` ya resuelve duplicados.
 */
export function planMediaLinks(noticia, idByRel) {
  const missing = []
  let featuredImage = null
  if (noticia.featured) {
    const id = idByRel[noticia.featured.relPath]
    if (id === undefined || id === null) missing.push(noticia.featured.relPath)
    else featuredImage = id
  }
  const gallery = []
  const used = new Set(featuredImage === null ? [] : [featuredImage])
  for (const g of noticia.gallery) {
    const id = idByRel[g.relPath]
    if (id === undefined || id === null) { missing.push(g.relPath); continue }
    if (used.has(id)) continue
    used.add(id)
    gallery.push({ image: id, caption: g.alt })
  }
  return { featuredImage, gallery, missing }
}

/* ═════════════ Parte con red: cliente HTTP, fase 1 (subir) y fase 2 (enlazar) ═════════════ */

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Segundos o fecha HTTP de `Retry-After` -> milisegundos (null si no es interpretable). */
export function parseRetryAfter(value, now = Date.now()) {
  if (value === null || value === undefined || String(value).trim() === '') return null
  const text = String(value).trim()
  if (/^\d+$/.test(text)) return Number(text) * 1000
  const at = Date.parse(text)
  return Number.isNaN(at) ? null : Math.max(0, at - now)
}

/**
 * Cliente HTTP del CMS con la política del cargador. Qué hace: pausa `delayMs` entre peticiones (el
 * `limit_req` de nginx y el límite por usuario del CMS castigan las ráfagas), espera `Retry-After` en 429
 * (hasta `max429` veces), reintenta 5xx y errores de red con backoff 500/1000/2000 ms (acotado) y NUNCA
 * reintenta un 4xx: lo devuelve tal cual. Por qué: un POST de media repetido tras un 5xx es seguro porque
 * el sha256 único del CMS lo convierte en 409 (existente). Límite: no oculta el cuerpo de error; quien
 * llama decide qué mostrar (nunca el cuerpo completo).
 */
export function createCmsClient({
  baseUrl,
  fetchImpl = globalThis.fetch,
  sleep = defaultSleep,
  delayMs = 1500,
  maxRetries = MAX_RETRIES,
  max429 = 5,
  maxWaitMs = 120_000,
}) {
  let calls = 0
  const root = String(baseUrl).replace(/\/+$/, '')
  return {
    baseUrl: root,
    /** `form` es una fábrica: un FormData no se reutiliza entre intentos. */
    async request(method, path, { token = null, json, form } = {}) {
      if (calls++ > 0 && delayMs > 0) await sleep(delayMs)
      const build = () => {
        const headers = {}
        if (token) headers.Authorization = `JWT ${token}`
        let body
        if (json !== undefined) {
          headers['Content-Type'] = 'application/json'
          body = JSON.stringify(json)
        } else if (form) {
          body = form()
        }
        return { method, headers, body }
      }
      let retries = 0
      let waits429 = 0
      for (;;) {
        let res
        try {
          res = await fetchImpl(`${root}${path}`, build())
        } catch (error) {
          if (retries >= maxRetries) {
            throw new Error(`Error de red tras ${retries + 1} intentos: ${error?.code || error?.name || 'desconocido'}`)
          }
          await sleep(backoffMs(++retries))
          continue
        }
        if (res.status === 429 && waits429 < max429) {
          waits429++
          await sleep(Math.min(parseRetryAfter(res.headers.get('retry-after')) ?? backoffMs(waits429), maxWaitMs))
          continue
        }
        if (res.status >= 500 && retries < maxRetries) {
          await sleep(backoffMs(++retries))
          continue
        }
        let parsed = null
        try {
          parsed = await res.json()
        } catch {
          /* cuerpo vacío o no JSON */
        }
        return { status: res.status, ok: res.ok, body: parsed }
      }
    },
  }
}

/** Mensaje corto y seguro de un error de Payload (sin eco de datos): solo el primer mensaje, recortado. */
function shortError(res) {
  const m = res?.body?.errors?.[0]?.message
  return `${res.status}${typeof m === 'string' ? ` ${m.slice(0, 100)}` : ''}`
}

/** 401/403 invalidan TODA la corrida (credencial o rol), no a un archivo: se aborta con un error claro. */
function abortOnAuth(res, what) {
  if (res.status === 401 || res.status === 403) {
    throw new Error(`El CMS rechazó la sesión (${res.status}) al ${what}: revise el usuario/rol; corrida detenida.`)
  }
}

/** Inicio de sesión REST. El error nunca incluye la contraseña ni el cuerpo de la respuesta. */
export async function loginCms(client, email, password) {
  const res = await client.request('POST', '/api/users/login', { json: { email, password } })
  if (!res.ok || !res.body?.token) {
    throw new Error(`Inicio de sesión rechazado por el CMS (${res.status}) para el usuario indicado.`)
  }
  return res.body.token
}

/** Identidad de la sesión (GET /api/users/me): { id, role }. */
async function whoAmI(client, token) {
  const res = await client.request('GET', '/api/users/me', { token })
  if (!res.ok || !res.body?.user) throw new Error(`No se pudo consultar /api/users/me (${res.status}).`)
  return { id: res.body.user.id, role: res.body.user.role }
}

/**
 * Verifica UNA vez las identidades editoriales (misma regla que el importador): roles válidos y tres
 * identidades distintas. Solo lee (GET). Sin revisor ni publicador -> modo `draft-only`.
 */
export async function resolveEditorialIdentities({ client, tokens }) {
  const author = await whoAmI(client, tokens.author)
  const reviewer = tokens.reviewer ? await whoAmI(client, tokens.reviewer) : null
  const publisher = tokens.publisher ? await whoAmI(client, tokens.publisher) : null
  return checkIdentities({ author, reviewer, publisher })
}

const q = encodeURIComponent

/** id de media por `sourcePath` o por `sha256` (depth 0, solo id); null si no existe. Lanza ante auth/5xx. */
async function findMediaId(client, token, field, value) {
  const res = await client.request('GET', `/api/media?where[${field}][equals]=${q(value)}&limit=1&depth=0&select[id]=true`, { token })
  abortOnAuth(res, 'consultar media')
  if (!res.ok) {
    throw Object.assign(new Error(`No se pudo consultar media por ${field} (${shortError(res)}).`), {
      retryable: res.status >= 500 || res.status === 429,
    })
  }
  const id = res.body?.docs?.[0]?.id
  return id === undefined ? null : id
}

const emptyUploadSummary = () => ({ subido: 0, existente: 0, rechazado: 0, reanudado: 0, errorRetryable: 0, errorFatal: 0 })

/**
 * FASE 1: sube cada archivo a `media`. Por archivo: (0) si el progreso ya lo tiene como subido/existente,
 * lo salta sin red; (1) valida los bytes ANTES de cualquier petición (rechazo local); (2) busca por
 * `sourcePath` y luego por `sha256` -> `existente`; (3) POST multipart con `alt` y `sourcePath`; un 409
 * (carrera/duplicado) cuenta como `existente` con `errors[0].data.id`. Escribe el progreso tras cada
 * archivo (reanudable). `limit` acota los archivos con trabajo real. Errores: 401/403 abortan; 429/5xx
 * agotados -> `errorRetryable`; otros 4xx -> `errorFatal` (sin reintentos). Solo registra nombres y conteos.
 */
export async function runUpload({ client, token, files, readFile, altByRel, progress, saveProgress, log, limit = Infinity }) {
  const summary = emptyUploadSummary()
  let worked = 0
  const mark = (relPath, entry) => {
    progress.files[relPath] = entry
    saveProgress(progress)
  }
  for (const file of files) {
    const { relPath } = file
    const done = progress.files[relPath]
    if (done && (done.state === 'subido' || done.state === 'existente')) {
      summary.reanudado++
      continue
    }
    if (worked >= limit) break
    worked++

    const data = readFile(relPath)
    const described = describeFile(relPath, data)
    if (described.status !== 'valido') {
      summary.rechazado++
      mark(relPath, { state: 'rechazado', reason: described.reason, sha256: described.sha256 })
      log(`[subida] ${relPath}: rechazado (${described.reason})`)
      continue
    }
    const name = relPath.split('/').pop()
    // El alt ya viene elegido por buildNoticiaEntries; aquí solo se sanea (NFKC, sin < >, largo).
    const chosen = normalizeAltText(altByRel?.[relPath])
    const alt = chosen ? cutAlt(chosen) : pickAlt([name])
    try {
      let id = await findMediaId(client, token, 'sourcePath', relPath)
      let state = 'existente'
      if (id === null) id = await findMediaId(client, token, 'sha256', described.sha256)
      if (id === null) {
        const res = await client.request('POST', '/api/media', {
          token,
          form: () => {
            const form = new FormData()
            form.append('_payload', JSON.stringify({ alt, sourcePath: relPath }))
            form.append('file', new Blob([data], { type: described.mimeType }), name)
            return form
          },
        })
        abortOnAuth(res, 'subir media')
        if (res.status === 409) {
          id = res.body?.errors?.[0]?.data?.id ?? (await findMediaId(client, token, 'sha256', described.sha256))
          if (id === null || id === undefined) throw new Error('409 sin id de la media existente')
        } else if (res.ok && res.body?.doc?.id !== undefined) {
          id = res.body.doc.id
          state = 'subido'
        } else {
          throw Object.assign(new Error(shortError(res)), { retryable: res.status === 429 || res.status >= 500 })
        }
      }
      summary[state]++
      mark(relPath, { state, mediaId: id, sha256: described.sha256 })
      log(`[subida] ${relPath}: ${state}`)
    } catch (error) {
      if (/rechazó la sesión/.test(error.message)) throw error
      const retryable = error.retryable === true || /Error de red/.test(error.message)
      summary[retryable ? 'errorRetryable' : 'errorFatal']++
      mark(relPath, { state: 'error', retryable, detail: String(error.message).slice(0, 160) })
      log(`[subida] ${relPath}: error ${retryable ? 'reintentable' : 'no reintentable'} (${String(error.message).slice(0, 100)})`)
    }
  }
  return summary
}

const idOf = (v) => (v && typeof v === 'object' ? v.id : v)
const sameIds = (a, b) => a.length === b.length && a.every((x, i) => x === b[i])
const emptyLinkSummary = () => ({
  enlazada: 0, reanudado: 0, sin_cambios: 0, pendiente: 0, bloqueada: 0, sin_imagen: 0, conflicto: 0, errorRetryable: 0, errorFatal: 0,
})

/** `draft=true` -> última versión (borrador incluido); `draft=false` -> versión pública (lo que ve el portal). */
async function readNoticia(client, token, slug, draft = true) {
  const res = await client.request('GET', `/api/noticias?where[slug][equals]=${q(slug)}&limit=1&depth=0&draft=${draft}`, { token })
  abortOnAuth(res, 'leer la noticia')
  if (!res.ok) {
    throw Object.assign(new Error(`No se pudo leer la noticia (${shortError(res)}).`), { retryable: res.status >= 500 || res.status === 429 })
  }
  return res.body?.docs?.[0] ?? null
}

async function patchNoticia(client, token, id, body, { draft = false } = {}) {
  const res = await client.request('PATCH', `/api/noticias/${id}${draft ? '?draft=true' : ''}`, { token, json: body })
  abortOnAuth(res, 'guardar la noticia')
  if (!res.ok) {
    throw Object.assign(new Error(`PATCH rechazado (${shortError(res)}).`), { retryable: res.status >= 500 || res.status === 429 })
  }
}

/**
 * FASE 2: enlaza `featuredImage` y `gallery` de cada noticia por `slug` usando el flujo editorial. Por
 * noticia: sin imagen -> `sin_imagen`; media sin subir -> `pendiente`; noticia ausente (importación en
 * curso) -> `pendiente`; `rechazado` -> `bloqueada` (decisión humana); imagen/galería distinta puesta por
 * una persona -> `conflicto` (no se pisa); iguales -> `sin_cambios`. Si hay que escribir, el AUTOR guarda
 * SOLO `featuredImage`/`gallery` y, en modo `full`, `remainingSteps` lleva el flujo con revisor y
 * publicador (identidades distintas, SEC-03). Solo avanza el flujo si escribió en esta corrida o una
 * corrida anterior quedó `escrita` (corte a mitad): nunca publica borradores ajenos. Amenaza evitada:
 * publicar por atajo o sobrescribir contenido editorial. Límite: la política real la aplica el servidor.
 */
export async function runLink({ client, tokens, mode, noticias, aliases = {}, progress, saveProgress, log, limit = Infinity }) {
  const summary = emptyLinkSummary()
  const fileState = (rel) => progress.files[aliases[rel] ?? rel]
  const idByRel = {}
  for (const n of noticias) {
    for (const rel of [n.featured?.relPath, ...n.gallery.map((g) => g.relPath)].filter(Boolean)) {
      const st = fileState(rel)
      if (st && (st.state === 'subido' || st.state === 'existente')) idByRel[rel] = st.mediaId
    }
  }
  const setLink = (slug, entry) => {
    progress.links[slug] = entry
    saveProgress(progress)
  }

  let worked = 0
  for (const noticia of noticias) {
    const { slug } = noticia
    if (progress.links[slug]?.state === 'completa') {
      summary.reanudado++
      continue
    }
    if (worked >= limit) break
    try {
      const plan = planMediaLinks(noticia, idByRel)
      const pendingMedia = plan.missing.filter((rel) => fileState(rel)?.state !== 'rechazado')
      if (plan.featuredImage === null && plan.gallery.length === 0 && pendingMedia.length === 0) {
        summary.sin_imagen++
        log(`[enlace] ${slug}: sin_imagen`)
        continue
      }
      if (pendingMedia.length > 0) {
        summary.pendiente++
        log(`[enlace] ${slug}: pendiente (media sin subir)`)
        continue
      }

      const doc = await readNoticia(client, tokens.author, slug)
      if (!doc) {
        summary.pendiente++
        log(`[enlace] ${slug}: pendiente (noticia no importada)`)
        continue
      }
      if (doc.approvalStatus === 'rechazado') {
        summary.bloqueada++
        log(`[enlace] ${slug}: bloqueada (rechazada)`)
        continue
      }

      const currentFeatured = idOf(doc.featuredImage) ?? null
      const currentGallery = (doc.gallery || []).map((row) => idOf(row.image))
      const body = {}
      let conflict = false
      if (plan.featuredImage !== null) {
        if (currentFeatured === null) body.featuredImage = plan.featuredImage
        else if (currentFeatured !== plan.featuredImage) conflict = true
      }
      if (plan.gallery.length > 0) {
        const wanted = plan.gallery.map((row) => row.image)
        if (currentGallery.length === 0) body.gallery = plan.gallery
        else if (!sameIds(currentGallery, wanted)) conflict = true
      }
      if (conflict) {
        summary.conflicto++
        log(`[enlace] ${slug}: conflicto (ya tiene otra imagen)`)
        continue
      }

      const wrote = Object.keys(body).length > 0
      const resume = progress.links[slug]?.state === 'escrita'
      worked++
      if (wrote) {
        // Editar contenido PUBLICADO exige guardarlo como borrador (transitions.ts: 422 si no): ?draft=true
        // y _status:'draft'. Solo se envían los campos de imagen; lo publicado no cambia hasta publicar.
        await patchNoticia(client, tokens.author, doc.id, { ...body, _status: 'draft' }, { draft: true })
        setLink(slug, { state: 'escrita' })
      }
      if (!wrote && !resume) {
        summary.sin_cambios++
        log(`[enlace] ${slug}: sin_cambios`)
        continue
      }

      if (mode === 'full') {
        const fresh = (await readNoticia(client, tokens.author, slug)) ?? doc
        const { steps, blocked } = remainingSteps(fresh)
        if (blocked) {
          summary.bloqueada++
          log(`[enlace] ${slug}: bloqueada (${blocked.slice(0, 60)})`)
          continue
        }
        for (const step of steps) await patchNoticia(client, tokens[step.actor], doc.id, buildStepBody(step.to))
        // Verificación: la versión PÚBLICA debe tener ya la imagen (un hook podría haber restaurado el contenido).
        const live = await readNoticia(client, tokens.author, slug, false)
        const liveGallery = (live?.gallery || []).map((row) => idOf(row.image))
        const okFeatured = plan.featuredImage === null || idOf(live?.featuredImage) === plan.featuredImage
        const okGallery = plan.gallery.every((row) => liveGallery.includes(row.image))
        if (!okFeatured || !okGallery) throw new Error('verificación fallida: la versión publicada no tiene la imagen')
        setLink(slug, { state: 'completa' })
      }
      summary.enlazada++
      log(`[enlace] ${slug}: enlazada${mode === 'full' ? ' y publicada' : ' (borrador)'}`)
    } catch (error) {
      if (/rechazó la sesión/.test(error.message)) throw error
      const retryable = error.retryable === true || /Error de red/.test(error.message)
      summary[retryable ? 'errorRetryable' : 'errorFatal']++
      log(`[enlace] ${slug}: error ${retryable ? 'reintentable' : 'no reintentable'} (${String(error.message).slice(0, 100)})`)
    }
  }
  return summary
}

/**
 * Corrige el texto alternativo de media YA cargada: lista las filas con `sourcePath`, y si su alt es pobre
 * (isPoorAlt) o trae letras decorativas Unicode (cambia con NFKC), la sustituye con el alt calculado en el
 * manifiesto (`altByRel`) cuando este sí es bueno. Con `write:false` solo cuenta (informe). Solo envía
 * `{alt}` por PATCH. Amenaza que evita: dejar alt inútil/ilegible para lectores de pantalla sin tocar nada más.
 * Límite: no cambia filas sin `sourcePath` (subidas manuales) ni sin sustituto bueno (`sinSustituto`).
 */
export async function runFixAlt({ client, token, altByRel, write, log }) {
  const summary = { scanned: 0, poor: 0, fixed: 0, sinSustituto: 0, errorFatal: 0, errorRetryable: 0 }
  for (let page = 1; ; page++) {
    const res = await client.request('GET', `/api/media?where[sourcePath][exists]=true&limit=100&page=${page}&depth=0&select[alt]=true&select[sourcePath]=true`, { token })
    abortOnAuth(res, 'listar media')
    if (!res.ok) throw new Error(`No se pudo listar media (${shortError(res)}).`)
    for (const row of res.body?.docs ?? []) {
      summary.scanned++
      const current = String(row.alt ?? '')
      if (!(isPoorAlt(current) || current !== current.normalize('NFKC'))) continue
      summary.poor++
      const wanted = altByRel[row.sourcePath]
      if (!wanted || isPoorAlt(wanted) || wanted === current) {
        summary.sinSustituto++
        continue
      }
      if (!write) continue
      const patch = await client.request('PATCH', `/api/media/${row.id}`, { token, json: { alt: wanted } })
      abortOnAuth(patch, 'corregir alt')
      if (patch.ok) {
        summary.fixed++
        log(`[alt] ${row.sourcePath}: corregido`)
      } else {
        summary[patch.status >= 500 || patch.status === 429 ? 'errorRetryable' : 'errorFatal']++
        log(`[alt] ${row.sourcePath}: error (${shortError(patch)})`)
      }
    }
    if (!res.body?.hasNextPage) break
  }
  return summary
}
