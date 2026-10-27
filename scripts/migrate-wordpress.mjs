/**
 * WordPress → Payload CMS migration script
 *
 * Reads: phpMyAdmin XML dump (uncm1_ prefix)
 * Writes: Payload REST API at http://localhost:3002
 *
 * Usage:
 *   node scripts/migrate-wordpress.mjs [options]
 *
 * Options:
 *   --xml=<path>      Path to .xml or .zip file (default: ~/Downloads/m1gr4unc_dbWP.zip)
 *   --dry-run         Parse and preview without writing to CMS
 *   --limit=<n>       Limit news posts to N (default: all)
 *   --only=posts      Migrate only news posts
 *   --only=pages      Migrate only static pages
 *   --cms=<url>       CMS base URL (default: http://localhost:3002)
 *   --uploads=<dir>   MIG-WP: local folder with downloaded images AAAA/MM/file
 *                     (default: ~/Downloads/Plataforma/wp-migration/uploads)
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createReadStream, existsSync } from 'node:fs'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { requireCmsPassword } from './lib/requireCmsPassword.mjs'
import { fetchWithRetry } from './lib/retry.mjs'
import { buildDraftPayload, buildStepBody, checkIdentities, remainingSteps } from './lib/wpPublishFlow.mjs'
import {
  cleanContentHtml,
  extractEmbeddedImages,
  pickFeaturedImage,
  stripShortcodes,
  stripWpComments,
  wpDateInfo,
} from './lib/wpContent.mjs'

const execAsync = promisify(exec)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HOME = process.env.USERPROFILE || process.env.HOME || ''

/* =========================================================
   CLI ARGS
   ========================================================= */
const args = process.argv.slice(2)
const DRY_RUN  = args.includes('--dry-run')
const ONLY     = args.find(a => a.startsWith('--only='))?.split('=')[1] || 'both'
const LIMIT    = (() => { const l = args.find(a => a.startsWith('--limit=')); return l ? parseInt(l.split('=')[1], 10) : Infinity })()
const XML_ARG  = args.find(a => a.startsWith('--xml='))?.split('=').slice(1).join('=')
const CMS_URL  = args.find(a => a.startsWith('--cms='))?.split('=')[1] || 'http://localhost:3002'
// MIG-WP: carpeta local con las imágenes ya descargadas (AAAA/MM/archivo). Solo se consulta si el archivo existe.
const UPLOADS_DIR = args.find(a => a.startsWith('--uploads='))?.split('=').slice(1).join('=')
  || path.join(HOME, 'Downloads', 'Plataforma', 'wp-migration', 'uploads')

const CMS_EMAIL    = process.env.CMS_EMAIL    || 'admin@unc.edu.py'
// SEC-08: la contraseña es obligatoria (CMS_PASSWORD, mínimo 12 caracteres); falla antes de cualquier red si falta o es débil.
// En --dry-run no hay login ni escritura, por eso no se exige.
const CMS_PASSWORD = DRY_RUN ? '' : requireCmsPassword()

/**
 * MIG-WP: credenciales opcionales del revisor y del publicador (SEC-03: nadie aprueba ni publica lo
 * propio, así que son identidades DISTINTAS del autor). Cada contraseña pasa por la misma validación
 * de requireCmsPassword; el mensaje de error nunca incluye el valor. Sin ellas solo se crean borradores.
 */
function optionalIdentity(label, emailVar, passwordVar) {
  const email = process.env[emailVar]
  const hasPassword = (process.env[passwordVar] ?? '').trim() !== ''
  if (!email && !hasPassword) return null
  if (!email || !hasPassword) throw new Error(`${label}: defina ${emailVar} y ${passwordVar} juntos.`)
  try {
    return { email, password: requireCmsPassword({ ...process.env, CMS_PASSWORD: process.env[passwordVar] }) }
  } catch (error) {
    throw new Error(`${label} (${passwordVar}): ${error.message.replace('CMS_PASSWORD', passwordVar)}`)
  }
}
const REVIEWER_CREDS  = DRY_RUN ? null : optionalIdentity('Revisor', 'CMS_REVIEWER_EMAIL', 'CMS_REVIEWER_PASSWORD')
const PUBLISHER_CREDS = DRY_RUN ? null : optionalIdentity('Publicador', 'CMS_PUBLISHER_EMAIL', 'CMS_PUBLISHER_PASSWORD')

/* =========================================================
   XML RESOLVER  (supports .xml or .zip)
   ========================================================= */

async function resolveXml() {
  const candidates = [
    XML_ARG,
    path.join(HOME, 'Downloads', 'm1gr4unc_dbWP (1).zip'),
    path.join(HOME, 'Downloads', 'm1gr4unc_dbWP.zip'),
    path.join(HOME, 'Downloads', 'm1gr4unc_dbWP.xml'),
    path.join(__dirname, '..', 'm1gr4unc_dbWP.xml'),
  ].filter(Boolean)

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue

    if (candidate.endsWith('.xml')) {
      console.log(`   Source: ${candidate}`)
      return fs.readFileSync(candidate, 'utf8')
    }

    if (candidate.endsWith('.zip')) {
      console.log(`   Source: ${candidate} (extracting XML…)`)
      const tmpXml = path.join(process.env.TEMP || '/tmp', 'unc_wp_export.xml')
      // Use PowerShell on Windows, unzip on POSIX
      if (process.platform === 'win32') {
        await execAsync(
          `powershell -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; ` +
          `$z=[System.IO.Compression.ZipFile]::OpenRead('${candidate.replace(/'/g, "''")}'); ` +
          `$e=$z.Entries|Where-Object{$_.Name -like '*.xml'}|Select-Object -First 1; ` +
          `[System.IO.Compression.ZipFileExtensions]::ExtractToFile($e,'${tmpXml.replace(/'/g, "''")}', $true); ` +
          `$z.Dispose()"`
        )
      } else {
        await execAsync(`unzip -p "${candidate}" "*.xml" > "${tmpXml}"`)
      }
      return fs.readFileSync(tmpXml, 'utf8')
    }
  }

  throw new Error(
    'XML file not found. Pass --xml=<path> or place m1gr4unc_dbWP.zip in ~/Downloads'
  )
}

/* =========================================================
   XML PARSER  (phpMyAdmin format: one <table> per row)
   ========================================================= */

function decodeEntities(s) {
  return (s || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(parseInt(c, 10)))
}

function parseTableRows(xml, tableName) {
  const tableRe = new RegExp(`<table name="${tableName}">[\\s\\S]*?<\\/table>`, 'g')
  const colRe   = /<column name="([^"]+)">([\s\S]*?)<\/column>/g
  const rows = []
  for (const tableMatch of xml.matchAll(tableRe)) {
    const cols = {}
    for (const col of tableMatch[0].matchAll(colRe)) {
      cols[col[1]] = decodeEntities(col[2])
    }
    if (Object.keys(cols).length > 0) rows.push(cols)
  }
  return rows
}

/* =========================================================
   HTML → LEXICAL  (preserves block structure)
   ========================================================= */

function textNode(text, format = 0) {
  return { detail: 0, format, mode: 'normal', style: '', text, type: 'text', version: 1 }
}

function paragraph(children) {
  return { children, direction: 'ltr', format: '', indent: 0, type: 'paragraph', version: 1 }
}

function heading(tag, children) {
  return { children, direction: 'ltr', format: '', indent: 0, tag, type: 'heading', version: 1 }
}

function listItem(children, value = 1) {
  return { children, direction: 'ltr', format: '', indent: 0, type: 'listitem', value, version: 1 }
}

function list(listType, children) {
  return { children, direction: 'ltr', format: '', indent: 0, listType, start: 1, tag: listType === 'number' ? 'ol' : 'ul', type: 'list', version: 1 }
}

function quote(children) {
  return { children, direction: 'ltr', format: '', indent: 0, type: 'quote', version: 1 }
}

function emptyLexical() {
  return { root: { children: [paragraph([textNode('Sin contenido.')])], direction: 'ltr', format: '', indent: 0, type: 'root', version: 1 } }
}

// Lightweight HTML → Lexical (block-aware, inline-format-aware)
function htmlToLexical(html) {
  if (!html || !html.trim()) return emptyLexical()

  // MIG-WP: comentarios HTML (Gutenberg) y shortcodes de la lista blanca ANTES de quitar etiquetas;
  // los corchetes legítimos del texto ("[sic]", "[1]") se conservan. Luego se quitan script/style.
  let h = cleanContentHtml(html).html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')

  // Normalize self-closing br
  h = h.replace(/<br\s*\/?>/gi, '\n')

  // Parse block-level elements
  const blocks = []

  // Extract headings
  h = h.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, inner) => {
    const text = stripInline(inner)
    if (text.trim()) blocks.push({ type: 'heading', tag: `h${level}`, text: text.trim() })
    return '\x00' // placeholder
  })

  // Extract blockquotes
  h = h.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, inner) => {
    const text = stripInline(inner)
    if (text.trim()) blocks.push({ type: 'quote', text: text.trim() })
    return '\x00'
  })

  // Extract lists
  h = h.replace(/<(ul|ol)[^>]*>([\s\S]*?)<\/\1>/gi, (_, tag, inner) => {
    const items = []
    inner.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (__, liInner) => {
      const text = stripInline(liInner)
      if (text.trim()) items.push(text.trim())
    })
    if (items.length) blocks.push({ type: 'list', listType: tag === 'ol' ? 'number' : 'bullet', items })
    return '\x00'
  })

  // Extract paragraphs
  h = h.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, inner) => {
    const text = stripInline(inner)
    if (text.trim()) blocks.push({ type: 'paragraph', text: text.trim() })
    return '\x00'
  })

  // Remaining text after stripping block tags
  const remaining = h.replace(/<[^>]+>/g, ' ').replace(/\x00/g, ' ').replace(/\s+/g, ' ').trim()
  if (remaining) {
    remaining.split(/\n{2,}/).filter(s => s.trim()).forEach(s => {
      blocks.push({ type: 'paragraph', text: s.trim() })
    })
  }

  if (blocks.length === 0) return emptyLexical()

  const children = blocks.flatMap(b => {
    if (b.type === 'heading') return [heading(b.tag, [textNode(b.text)])]
    if (b.type === 'quote')   return [quote([paragraph([textNode(b.text)])])]
    if (b.type === 'list')    return [list(b.listType, b.items.map((t, i) => listItem([textNode(t)], i + 1)))]
    // paragraph with inline format
    return [paragraph(parseInlineFormat(b.text))]
  })

  return { root: { children, direction: 'ltr', format: '', indent: 0, type: 'root', version: 1 } }
}

function stripInline(html) {
  return html
    .replace(/<img[^>]*>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Parse bold/italic inline markers (simplified — operates on plain text after HTML stripping)
function parseInlineFormat(text) {
  if (!text) return [textNode('')]
  // We already stripped HTML; just return as a single text node
  return [textNode(text)]
}

/* =========================================================
   HELPERS
   ========================================================= */

function slugify(text) {
  return text.toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100)
}

function excerpt(html, maxLen = 280) {
  // MIG-WP: mismo criterio que htmlToLexical (comentarios + shortcodes acotados, no `[.*?]`).
  const text = stripShortcodes(stripWpComments(html)).replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim()
  return text.length <= maxLen ? text : text.slice(0, maxLen).replace(/\s+\S*$/, '') + '…'
}

/* =========================================================
   WP PAGE SLUG → PORTAL SLUG MAPPING
   ========================================================= */

const PAGE_SLUG_MAP = {
  // Institucional
  'quienes-somos':                          'institucional/quienes-somos',
  'historia-3':                             'institucional/historia',
  'mision-vision-y-valores':                'institucional/mision',
  'marco-legal':                            'institucional/marco-legal',
  'organigrama':                            'institucional/organigrama',
  'autoridades':                            'institucional/autoridades',
  'investigacion':                          'institucional/investigacion',
  'extension-y-vinculacion':                'institucional/extension',
  'bienestar-institucional':                'institucional/bienestar',
  'direccion-general-academica':            'institucional/academica',
  'aseguramiento-de-la-calidad':            'institucional/calidad',
  'tribunal-electoral':                     'institucional/tribunal-electoral',
  'convenios-nacionales':                   'institucional/convenios-nacionales',
  'convenios-internacionales-de-la-unc':    'institucional/convenios-internacionales',
  // Transparencia
  'ley-5189-2014':                          'transparencia/ley-5189',
  'ley-n-5-282-2014':                       'transparencia/ley-5282',
  'rendicion-de-cuentas-al-ciudadano':      'transparencia/rendicion-de-cuentas',
  'licitaciones':                           'transparencia/licitaciones',
  'aranceles-rectorado':                    'transparencia/aranceles',
  // Trámites
  'legalizaciones':                         'tramites/legalizaciones',
  'titulos':                                'tramites/titulos',
  'solicitud-de-gestion-de-titulos':        'tramites/gestion-titulos',
  'aula-virtual':                           'tramites/aula-virtual',
  'preguntas-frecuentes':                   'tramites/preguntas-frecuentes',
  // Contacto
  'solicitar-informacion':                  'contacto/solicitar-informacion',
  'contactos-por-dependencia':              'contacto/dependencias',
}

// WP pages that are test pages, duplicates, or covered by dedicated Next.js routes
const PAGE_SKIP_SET = new Set([
  'home-v5', 'home-v6', 'slider', 'tablas', 'galeria-de-fotos',
  'pagina-de-ejemplo-2', 'pagina-de-ejemplo', 'noticias',
  'historia', 'historia-2',        // older duplicates of historia-3
  'ley-5282-2014',                  // duplicate of ley-n-5-282-2014
  'institucional', 'contacto',      // covered by dedicated Next.js pages
  'transparencia', 'tramites',
  'politica-privacidad',
  // facultades handled by Facultades collection
  'facultad-de-odontologia', 'facultad-de-medicina',
  'facultad-de-ciencias-agrarias', 'facultad-de-humanidades-y-ciencias-de-la-educacion',
  'facultad-de-ciencias-economicas-y-administrativas',
  'facultad-de-ciencias-exactas-y-tecnologicas',
])

/* =========================================================
   CATEGORY MAPPER (for news posts)
   ========================================================= */

const CATEGORY_KEYWORDS = {
  investigacion: ['investigaci', 'ciencia', 'investigador', 'conacyt', 'científic', 'estudio', 'tesis', 'innovaci'],
  extension:     ['extensi', 'comunidad', 'social', 'bienestar', 'voluntari', 'solidar'],
  academica:     ['académ', 'académic', 'carrera', 'facultad', 'ingreso', 'docente', 'estudiant', 'graduaci', 'egresad'],
  eventos:       ['event', 'jornada', 'ceremonia', 'inaugur', 'conferencia', 'congreso', 'simposio', 'reunión', 'taller'],
  comunicados:   ['comunicado', 'aviso', 'convocatoria', 'licitaci', 'resoluc', 'cumplimiento', 'informe', 'ley'],
}

function mapCategory(wpCategories, title, content) {
  const searchText = [...wpCategories, title, content?.slice(0, 200)].join(' ').toLowerCase()
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => searchText.includes(kw))) return cat
  }
  return 'institucional'
}

/* =========================================================
   PAYLOAD AUTH
   ========================================================= */

async function getToken(email = CMS_EMAIL, password = CMS_PASSWORD) {
  const res = await fetch(`${CMS_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`Auth failed: ${res.status} ${await res.text()}`)
  const { token } = await res.json()
  return token
}

/**
 * PERF-DB: crea un documento con reintentos (5xx, 429 y red; backoff 500 ms/1 s/2 s). Un 4xx de
 * validación NO se reintenta: se propaga tal cual. Límite: si un 5xx llegó a guardar el documento, el
 * reintento choca con el slug único; el llamador lo trata como condición de carrera (ver migrateNews).
 */
async function cmsPost(token, collection, data) {
  const res = await fetchWithRetry(`${CMS_URL}/api/${collection}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
    body: JSON.stringify(data),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(body.errors || body))
  return body.doc
}

/** MIG-WP: id y rol de la sesión (GET /api/users/me); alimenta la comprobación única de identidades. */
async function whoAmI(token) {
  const res = await fetchWithRetry(`${CMS_URL}/api/users/me`, { headers: { Authorization: `JWT ${token}` } })
  if (!res.ok) throw new Error(`No se pudo consultar /api/users/me: ${res.status}`)
  const { user } = await res.json()
  if (!user) throw new Error('La sesión no devolvió usuario.')
  return { id: user.id, role: user.role }
}

/**
 * MIG-WP: transición editorial de una noticia con la identidad que corresponde al paso (PATCH).
 * Sólo se envían campos de estado; el servidor valida rol, estado y «nadie aprueba lo propio».
 * Con reintentos solo ante 5xx/429/red; un 403/422 se propaga (es la política, no un fallo transitorio).
 */
async function cmsPatch(token, collection, id, data) {
  const res = await fetchWithRetry(`${CMS_URL}/api/${collection}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
    body: JSON.stringify(data),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(body.errors || body))
  return body.doc
}

/**
 * MIG-WP: documento existente por slug con su estado editorial actual (borrador incluido), o null.
 * Se pide la última versión (draft=true) porque revisor y aprobación se guardan como versión.
 */
async function findNoticia(token, slug) {
  const url = `${CMS_URL}/api/noticias?where[slug][equals]=${encodeURIComponent(slug)}&limit=1&depth=0&draft=true`
  const res = await fetchWithRetry(url, { headers: { Authorization: `JWT ${token}` } })
  if (!res.ok) throw new Error(`No se pudo comprobar el slug "${slug}": ${res.status}`)
  const { docs } = await res.json()
  return Array.isArray(docs) && docs.length > 0 ? docs[0] : null
}

/**
 * MIG-WP: avanza una noticia por los pasos legales que le faltan, cada uno con su identidad.
 * Devuelve true si llegó a publicado. Sin tokens de revisor/publicador no avanza (modo borradores).
 */
async function advanceNoticia(ctx, doc) {
  if (ctx.mode !== 'full') return false
  const { steps, blocked } = remainingSteps(doc)
  if (blocked) throw new Error(blocked)
  for (const step of steps) {
    await cmsPatch(ctx.tokens[step.actor], 'noticias', doc.id, buildStepBody(step.to))
  }
  return steps.length > 0
}

/**
 * PERF-DB: ¿ya existe una noticia con este slug? Consulta mínima (sin profundidad ni cuerpo) con los
 * mismos reintentos que cmsPost. Si el CMS no responde de forma fiable lanza, para NO suponer que no
 * existe y duplicar. Límite: no distingue borradores de publicadas; basta con el slug único.
 */
async function noticiaExists(token, slug) {
  const url = `${CMS_URL}/api/noticias?where[slug][equals]=${encodeURIComponent(slug)}&limit=1&depth=0&select[id]=true`
  const res = await fetchWithRetry(url, { headers: { Authorization: `JWT ${token}` } })
  if (!res.ok) throw new Error(`No se pudo comprobar el slug "${slug}": ${res.status}`)
  const { docs } = await res.json()
  return Array.isArray(docs) && docs.length > 0
}

/** MIG-WP: pausa entre noticias; cada una produce hasta 5 peticiones y varias revalidaciones del portal. */
const ITEM_DELAY_MS = 800

/* =========================================================
   MIGRATE NEWS POSTS
   ========================================================= */

/**
 * MIG-WP: análisis puro de una noticia (sin red ni escritura): fecha ISO, imágenes embebidas,
 * imagen destacada con su fuente y banderas de limpieza. Solo comprueba si existen archivos locales.
 */
function analyzePost(post, thumbnailUrl) {
  const raw = post.post_content || ''
  const embedded = extractEmbeddedImages(raw, { uploadsDir: UPLOADS_DIR, fileExists: existsSync })
  const featured = pickFeaturedImage({ thumbnailUrl, embedded })
  const dateInfo = wpDateInfo(post)
  let featuredLocal = null
  if (featured.relPath) {
    const fromBody = embedded.find(im => im.url === featured.url)
    featuredLocal = fromBody ? fromBody.localPath : (existsSync(path.join(UPLOADS_DIR, ...featured.relPath.split('/'))) ? featured.relPath : null)
  }
  return {
    post,
    iso: dateInfo.iso,
    dateSource: dateInfo.source,
    embedded,
    featured,
    featuredLocal,
    flags: cleanContentHtml(raw).flags,
  }
}

/** MIG-WP: resumen global (todas las publicadas) por fuente de imagen destacada y archivo local. */
function printImageSummary(analyzed) {
  const by = { miniatura: 0, cuerpo: 0, ninguna: 0 }
  let withLocal = 0, embeddedTotal = 0, embeddedRec = 0, gutenberg = 0, shortcodes = 0, dateGmt = 0, dateLocal = 0, dateNone = 0
  for (const a of analyzed) {
    by[a.featured.source]++
    if (a.featuredLocal) withLocal++
    embeddedTotal += a.embedded.length
    embeddedRec += a.embedded.filter(im => im.estado === 'recuperable').length
    if (a.dateSource === 'gmt') dateGmt++
    else if (a.dateSource === 'local') dateLocal++
    else dateNone++
    if (a.flags.gutenberg) gutenberg++
    if (a.flags.shortcodes) shortcodes++
  }
  console.log(`\n   Resumen de imágenes (${analyzed.length} noticias publicadas):`)
  console.log(`     destacada por miniatura: ${by.miniatura} | por cuerpo: ${by.cuerpo} | sin imagen: ${by.ninguna}`)
  console.log(`     destacadas con archivo local existente: ${withLocal} (carpeta: ${UPLOADS_DIR})`)
  console.log(`     imágenes embebidas: ${embeddedTotal} (${embeddedRec} recuperables, ${embeddedTotal - embeddedRec} no recuperables)`)
  console.log(`     con comentarios Gutenberg: ${gutenberg} | con shortcodes: ${shortcodes}`)
  console.log(`     fecha: ${dateGmt} usaron post_date_gmt | ${dateLocal} convertidas desde hora local (America/Asuncion) | ${dateNone} sin fecha\n`)
}

async function migratePosts(xml, ctx) {
  const token = ctx.tokens?.author
  console.log('\n── NEWS POSTS ───────────────────────────────────')

  // Parse taxonomy
  const terms        = parseTableRows(xml, 'uncm1_terms')
  const termTaxonomy = parseTableRows(xml, 'uncm1_term_taxonomy')
  const termRels     = parseTableRows(xml, 'uncm1_term_relationships')

  // Build post → thumbnail URL map (postmeta _thumbnail_id → attachment guid)
  const postmeta    = parseTableRows(xml, 'uncm1_postmeta')
  const allPostRows = parseTableRows(xml, 'uncm1_posts')
  const attachments = Object.fromEntries(
    allPostRows
      .filter(p => p.post_type === 'attachment' && p.guid)
      .map(p => [p.ID, p.guid])
  )
  const thumbnailByPostId = {}
  for (const meta of postmeta) {
    if (meta.meta_key === '_thumbnail_id' && meta.meta_value) {
      const url = attachments[meta.meta_value.trim()]
      if (url) thumbnailByPostId[meta.post_id] = url
    }
  }

  const categoryTax = termTaxonomy
    .filter(t => t.taxonomy === 'category' || t.taxonomy === 'post_tag')
    .reduce((acc, t) => {
      acc[t.term_taxonomy_id] = terms.find(tr => tr.term_id === t.term_id)?.name || ''
      return acc
    }, {})

  const postCategories = termRels.reduce((acc, rel) => {
    const name = categoryTax[rel.term_taxonomy_id]
    if (name) {
      if (!acc[rel.object_id]) acc[rel.object_id] = []
      acc[rel.object_id].push(name)
    }
    return acc
  }, {})

  // Parse posts
  const allRows = parseTableRows(xml, 'uncm1_posts')
  const published = allRows.filter(p => p.post_type === 'post' && p.post_status === 'publish')

  // MIG-WP: análisis de TODAS las noticias publicadas (solo lectura, sin red ni escritura) para el resumen
  // global; las que se migran son las más recientes primero cuando hay --limit.
  const analyzed = published.map(post => analyzePost(post, thumbnailByPostId[post.ID] || null))
  const byDateDesc = (a, b) => (b.iso || '').localeCompare(a.iso || '')
  const selected = (LIMIT < Infinity ? [...analyzed].sort(byDateDesc) : analyzed).slice(0, LIMIT)
  const posts = selected.map(a => a.post)

  console.log(`   Total published posts: ${published.length}`)
  console.log(`   Migrating: ${posts.length}`)
  printImageSummary(analyzed)

  let ok = 0, skipped = 0, failed = 0, existed = 0, completed = 0, publishedNow = 0, draftOnly = 0
  const errors = []
  const seenSlugs = new Set() // track slugs within this run to detect in-run duplicates
  // MIG-WP: imágenes embebidas por noticia {url, localPath|null, alt, estado}, listas para usar cuando se decida
  // cómo guardarlas en Payload (el esquema actual no tiene dónde ponerlas; no se escriben).
  const embeddedImagesBySlug = {}

  for (const [i, info] of selected.entries()) {
    const post = info.post
    const wpCategories = postCategories[post.ID] || []
    const title = (post.post_title || 'Sin título').slice(0, 150)
    let slug = post.post_name
      ? post.post_name.slice(0, 100)
      : slugify(title) + '-' + post.ID

    // Resolve slug collision within this migration run: append post ID as suffix
    if (seenSlugs.has(slug)) {
      slug = slug.slice(0, 94) + '-' + post.ID
    }
    seenSlugs.add(slug)

    const summaryRaw = post.post_excerpt?.trim()
    const summary = summaryRaw && summaryRaw.length >= 20
      ? summaryRaw.slice(0, 300)
      : excerpt(post.post_content || '', 280)

    if (summary.length < 20) {
      console.log(`  ⚠  [${i + 1}/${posts.length}] SKIP (no excerpt): ${title.slice(0, 60)}`)
      skipped++
      continue
    }

    embeddedImagesBySlug[slug] = info.embedded

    // MIG-WP: el servidor exige que todo contenido nuevo nazca en Borrador (SEC-03); la publicación
    // se hace después, paso a paso, con la identidad de cada rol (ver advanceNoticia).
    const payload = buildDraftPayload({
      title,
      slug,
      summary,
      content: htmlToLexical(post.post_content || ''),
      category: mapCategory(wpCategories, title, post.post_content),
      tags: wpCategories.map(t => ({ tag: t })).slice(0, 10),
      // MIG-WP: post_date_gmt solo si difiere de post_date; si es igual (GMT no calculado), falta o es inválido,
      // se convierte post_date desde America/Asuncion (ver wpDateInfo).
      publishedAt: info.iso || new Date().toISOString(),
      featured: false,
      // MIG-WP: miniatura resuelta; si no hay, primera imagen recuperable del cuerpo (URL del sitio original).
      ...(info.featured.url ? { featuredImageUrl: info.featured.url } : {}),
    })

    if (DRY_RUN) {
      const rec = info.embedded.filter(im => im.estado === 'recuperable').length
      const nonRec = info.embedded.length - rec
      const featLocal = info.featured.url
        ? (info.featuredLocal ? 'archivo local: sí' : 'archivo local: no')
        : '-'
      console.log(`  ✅ [${i + 1}/${posts.length}] ${title.slice(0, 60)}`)
      console.log(`       slug: ${slug} | fecha: ${payload.publishedAt} | categoría: ${payload.category}`)
      console.log(`       destacada: ${info.featured.source} (${featLocal}) | embebidas: ${rec} recuperables, ${nonRec} no recuperables`)
      console.log(`       limpieza: comentarios Gutenberg ${info.flags.gutenberg ? 'sí' : 'no'}, shortcodes ${info.flags.shortcodes ? 'sí' : 'no'}`)
      ok++
      continue
    }

    try {
      // PERF-DB: idempotencia. Si el slug ya existe se omite (no se crea `slug-<ID>`), así una
      // migración interrumpida se puede relanzar sin duplicar noticias.
      // MIG-WP: si quedó a medias (borrador/en revisión/aprobada) se completa; nunca se duplica.
      const found = await findNoticia(token, slug)
      if (found) {
        const advanced = await advanceNoticia(ctx, found)
        if (advanced) {
          console.log(`  🔁 [${i + 1}/${posts.length}] completada: ${slug}`)
          completed++
          publishedNow++
          await new Promise(r => setTimeout(r, ITEM_DELAY_MS))
        } else {
          console.log(`  ⏭  [${i + 1}/${posts.length}] ya existía: ${slug}`)
          existed++
        }
        continue
      }
      const created = await cmsPost(token, 'noticias', payload)
      if (ctx.mode === 'full') {
        await advanceNoticia(ctx, created)
        publishedNow++
      } else {
        draftOnly++
      }
      console.log(`  ✅ [${i + 1}/${posts.length}] ${title.slice(0, 60)}`)
      ok++
      // MIG-WP: pausa por noticia para no saturar el CMS ni el portal (revalidación y límite de peticiones).
      await new Promise(r => setTimeout(r, ITEM_DELAY_MS))
    } catch (err) {
      // PERF-DB: un conflicto de slug tras la comprobación solo puede ser una condición de carrera real
      // (otro proceso lo creó entre la consulta y el POST, o un 5xx que sí guardó). Se vuelve a
      // comprobar: si ya existe se cuenta como existente; si no, es un fallo real. Sin sufijo `-<ID>`.
      const isSlugConflict = err.message.includes('único') || err.message.includes('unique') || err.message.includes('slug')
      if (isSlugConflict) {
        try {
          if (await noticiaExists(token, slug)) {
            console.log(`  ⏭  [${i + 1}/${posts.length}] ya existía (carrera): ${slug}`)
            existed++
            continue
          }
        } catch {
          // Sin respuesta fiable: se informa el error original abajo.
        }
      }
      const msg = err.message.slice(0, 120)
      console.log(`  ❌ [${i + 1}/${posts.length}] FAIL: ${title.slice(0, 50)} — ${msg}`)
      errors.push({ collection: 'noticias', title, slug, error: msg })
      failed++
    }
  }

  console.log(`\n   ✅ ${ok}  ⏭ ${existed} ya existían  ⚠ ${skipped}  ❌ ${failed}`)
  if (!DRY_RUN) {
    console.log(`   🔁 ${completed} completadas desde pasos intermedios | publicadas en esta corrida: ${publishedNow} | solo borrador: ${draftOnly}`)
  }
  return { ok, skipped, existed, failed, errors }
}

/* =========================================================
   MIGRATE STATIC PAGES
   ========================================================= */

async function migratePages(xml, token) {
  console.log('\n── STATIC PAGES ─────────────────────────────────')

  const allRows = parseTableRows(xml, 'uncm1_posts')
  const pages = allRows.filter(p => p.post_type === 'page' && p.post_status === 'publish')

  const seenPortalSlugs = new Set()
  const candidates = pages.filter(p => {
    const wpSlug = p.post_name
    if (!wpSlug) return false
    if (PAGE_SKIP_SET.has(wpSlug)) return false
    const portalSlug = PAGE_SLUG_MAP[wpSlug]
    if (!portalSlug) return false
    if (seenPortalSlugs.has(portalSlug)) return false
    seenPortalSlugs.add(portalSlug)
    return true
  })

  console.log(`   Total published pages: ${pages.length}`)
  console.log(`   Mapped pages to migrate: ${candidates.length}`)

  let ok = 0, skipped = 0, failed = 0
  const errors = []

  for (const [i, page] of candidates.entries()) {
    const wpSlug      = page.post_name
    const portalSlug  = PAGE_SLUG_MAP[wpSlug]
    const title       = (page.post_title || 'Sin título').slice(0, 150)
    const contentHtml = page.post_content || ''
    const subheading  = excerpt(contentHtml, 220)

    const layout = [
      {
        blockType: 'hero',
        heading: title,
        subheading: subheading || null,
      },
      ...(contentHtml.trim()
        ? [{
            blockType: 'richText',
            content: htmlToLexical(contentHtml),
          }]
        : []),
    ]

    const payload = {
      title,
      slug: portalSlug,
      layout,
      approvalStatus: 'publicado',
      _status: 'published',
    }

    if (DRY_RUN) {
      console.log(`  ✅ [${i + 1}/${candidates.length}] ${wpSlug} → /${portalSlug}`)
      ok++
      continue
    }

    try {
      await cmsPost(token, 'paginas', payload)
      console.log(`  ✅ [${i + 1}/${candidates.length}] ${wpSlug} → /${portalSlug}`)
      ok++
      await new Promise(r => setTimeout(r, 100))
    } catch (err) {
      const msg = err.message.slice(0, 120)
      console.log(`  ❌ [${i + 1}/${candidates.length}] FAIL: ${wpSlug} — ${msg}`)
      errors.push({ collection: 'paginas', title, slug: portalSlug, wpSlug, error: msg })
      failed++
    }
  }

  console.log(`\n   ✅ ${ok}  ⚠ ${skipped}  ❌ ${failed}`)
  return { ok, skipped, failed, errors }
}

/* =========================================================
   MAIN
   ========================================================= */

async function main() {
  console.log('\n📦 WordPress → Payload CMS migration')
  console.log(`   CMS:  ${CMS_URL}`)
  console.log(`   Mode: ${DRY_RUN ? '🔍 DRY RUN (no writes)' : '✍️  LIVE'}`)
  console.log(`   Scope: ${ONLY}`)
  if (LIMIT < Infinity) console.log(`   Limit (posts): ${LIMIT}`)

  // Load XML
  console.log('\n⏳ Loading XML…')
  const xml = await resolveXml()
  console.log(`   Size: ${(xml.length / 1024 / 1024).toFixed(1)} MB`)

  // Auth
  let token
  const ctx = { mode: 'draft-only', tokens: {} }
  if (!DRY_RUN) {
    console.log('\n🔐 Authenticating with Payload…')
    token = await getToken()
    console.log('   ✅ OK')
    ctx.tokens.author = token

    // MIG-WP: comprobación única de identidades ANTES de procesar (no 273 fallos iguales).
    const identities = { author: await whoAmI(token) }
    if (REVIEWER_CREDS) {
      ctx.tokens.reviewer = await getToken(REVIEWER_CREDS.email, REVIEWER_CREDS.password)
      identities.reviewer = await whoAmI(ctx.tokens.reviewer)
    }
    if (PUBLISHER_CREDS) {
      ctx.tokens.publisher = await getToken(PUBLISHER_CREDS.email, PUBLISHER_CREDS.password)
      identities.publisher = await whoAmI(ctx.tokens.publisher)
    }
    const check = checkIdentities(identities)
    if (!check.ok) throw new Error(`Identidades editoriales no válidas:\n - ${check.problems.join('\n - ')}`)
    ctx.mode = check.mode
    console.log(
      check.mode === 'full'
        ? '   Modo: flujo completo (autor -> revisor -> publicador, tres identidades distintas)'
        : '   Modo: SOLO BORRADORES (sin CMS_REVIEWER_* ni CMS_PUBLISHER_*; nada se publica)',
    )
  }

  const allErrors = []

  if (ONLY === 'both' || ONLY === 'posts') {
    const r = await migratePosts(xml, ctx)
    allErrors.push(...r.errors)
  }

  if (ONLY === 'both' || ONLY === 'pages') {
    const r = await migratePages(xml, token)
    allErrors.push(...r.errors)
  }

  if (allErrors.length > 0) {
    const errFile = path.join(__dirname, '..', 'migration-errors.json')
    fs.writeFileSync(errFile, JSON.stringify(allErrors, null, 2))
    console.log(`\n📋 Errors written to: ${errFile}`)
  }

  console.log('\n✨ Migration complete.\n')
}

main().catch(err => {
  console.error('\n💥 Fatal:', err.message)
  process.exit(1)
})
