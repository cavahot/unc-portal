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
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createReadStream, existsSync } from 'node:fs'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

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

const CMS_EMAIL    = process.env.CMS_EMAIL    || 'admin@unc.edu.py'
const CMS_PASSWORD = process.env.CMS_PASSWORD || 'Admin1234!'

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

  // Remove shortcodes and script/style blocks
  let h = html
    .replace(/\[.*?\]/gs, '')
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
  const text = html.replace(/\[.*?\]/gs, '').replace(/<[^>]+>/g, ' ')
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

async function getToken() {
  const res = await fetch(`${CMS_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: CMS_EMAIL, password: CMS_PASSWORD }),
  })
  if (!res.ok) throw new Error(`Auth failed: ${res.status} ${await res.text()}`)
  const { token } = await res.json()
  return token
}

async function cmsPost(token, collection, data) {
  const res = await fetch(`${CMS_URL}/api/${collection}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
    body: JSON.stringify(data),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(body.errors || body))
  return body.doc
}

/* =========================================================
   MIGRATE NEWS POSTS
   ========================================================= */

async function migratePosts(xml, token) {
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
  const posts = allRows
    .filter(p => p.post_type === 'post' && p.post_status === 'publish')
    .slice(0, LIMIT)

  console.log(`   Total published posts: ${allRows.filter(p => p.post_type === 'post' && p.post_status === 'publish').length}`)
  console.log(`   Migrating: ${posts.length}`)

  let ok = 0, skipped = 0, failed = 0
  const errors = []

  for (const [i, post] of posts.entries()) {
    const wpCategories = postCategories[post.ID] || []
    const title = (post.post_title || 'Sin título').slice(0, 150)
    const slug = post.post_name
      ? post.post_name.slice(0, 100)
      : slugify(title) + '-' + post.ID

    const summaryRaw = post.post_excerpt?.trim()
    const summary = summaryRaw && summaryRaw.length >= 20
      ? summaryRaw.slice(0, 300)
      : excerpt(post.post_content || '', 280)

    if (summary.length < 20) {
      console.log(`  ⚠  [${i + 1}/${posts.length}] SKIP (no excerpt): ${title.slice(0, 60)}`)
      skipped++
      continue
    }

    const thumbUrl = thumbnailByPostId[post.ID] || null

    const payload = {
      title,
      slug,
      summary,
      content: htmlToLexical(post.post_content || ''),
      category: mapCategory(wpCategories, title, post.post_content),
      tags: wpCategories.map(t => ({ tag: t })).slice(0, 10),
      publishedAt: post.post_date ? new Date(post.post_date).toISOString() : new Date().toISOString(),
      approvalStatus: 'publicado',
      featured: false,
      _status: 'published',
      ...(thumbUrl ? { featuredImageUrl: thumbUrl } : {}),
    }

    if (DRY_RUN) {
      console.log(`  ✅ [${i + 1}/${posts.length}] ${title.slice(0, 60)} → ${payload.category}`)
      ok++
      continue
    }

    try {
      await cmsPost(token, 'noticias', payload)
      console.log(`  ✅ [${i + 1}/${posts.length}] ${title.slice(0, 60)}`)
      ok++
      if (i % 10 === 9) await new Promise(r => setTimeout(r, 200))
    } catch (err) {
      const msg = err.message.slice(0, 120)
      console.log(`  ❌ [${i + 1}/${posts.length}] FAIL: ${title.slice(0, 50)} — ${msg}`)
      errors.push({ collection: 'noticias', title, slug, error: msg })
      failed++
    }
  }

  console.log(`\n   ✅ ${ok}  ⚠ ${skipped}  ❌ ${failed}`)
  return { ok, skipped, failed, errors }
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
  if (!DRY_RUN) {
    console.log('\n🔐 Authenticating with Payload…')
    token = await getToken()
    console.log('   ✅ OK')
  }

  const allErrors = []

  if (ONLY === 'both' || ONLY === 'posts') {
    const r = await migratePosts(xml, token)
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
