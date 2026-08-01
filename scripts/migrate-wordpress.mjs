/**
 * WordPress → Payload CMS migration script
 *
 * Reads: m1gr4unc_dbWP.sql (phpMyAdmin dump, prefix uncm1_)
 * Writes: Payload REST API at http://localhost:3002
 *
 * Usage:
 *   node scripts/migrate-wordpress.mjs [--dry-run] [--limit=50] [--sql=path/to/file.sql]
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/* =========================================================
   CLI ARGS
   ========================================================= */
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const LIMIT = (() => {
  const l = args.find(a => a.startsWith('--limit='))
  return l ? parseInt(l.split('=')[1], 10) : Infinity
})()
const SQL_PATH = (() => {
  const s = args.find(a => a.startsWith('--sql='))
  return s ? s.split('=')[1] : path.join(__dirname, '../../../Downloads/wp_export/m1gr4unc_dbWP.sql')
})()

const CMS_URL = 'http://localhost:3002'
const CMS_EMAIL = process.env.CMS_EMAIL || 'admin@unc.edu.py'
const CMS_PASSWORD = process.env.CMS_PASSWORD || 'Admin1234!'

/* =========================================================
   SQL PARSER
   ========================================================= */

function parseInserts(sql, tableName) {
  const rows = []
  // Match INSERT INTO `tableName` (...columns...) VALUES (...),(...)
  const tableRe = new RegExp(
    `INSERT INTO \`${tableName}\` \\(([^)]+)\\) VALUES\\s*([\\s\\S]*?);(?=\\s*(?:INSERT|$|--))`,
    'gi'
  )

  let tableMatch
  while ((tableMatch = tableRe.exec(sql)) !== null) {
    const columns = tableMatch[1].split(',').map(c => c.trim().replace(/`/g, ''))
    const valuesBlock = tableMatch[2]

    // Split individual row tuples
    const rowRe = /\(([^)]*(?:\([^)]*\)[^)]*)*)\)/g
    let rowMatch
    while ((rowMatch = rowRe.exec(valuesBlock)) !== null) {
      const values = parseValues(rowMatch[1])
      if (values.length === columns.length) {
        const obj = {}
        columns.forEach((col, i) => { obj[col] = values[i] })
        rows.push(obj)
      }
    }
  }
  return rows
}

function parseValues(str) {
  const values = []
  let i = 0
  while (i < str.length) {
    // skip whitespace/commas
    while (i < str.length && (str[i] === ',' || str[i] === ' ')) i++
    if (i >= str.length) break

    if (str[i] === "'") {
      // quoted string
      i++ // skip opening quote
      let val = ''
      while (i < str.length) {
        if (str[i] === '\\' && i + 1 < str.length) {
          const next = str[i + 1]
          if (next === "'") val += "'"
          else if (next === '\\') val += '\\'
          else if (next === 'n') val += '\n'
          else if (next === 'r') val += '\r'
          else if (next === 't') val += '\t'
          else val += str[i + 1]
          i += 2
        } else if (str[i] === "'") {
          i++ // skip closing quote
          break
        } else {
          val += str[i]
          i++
        }
      }
      values.push(val)
    } else {
      // unquoted (number, NULL, etc.)
      let val = ''
      while (i < str.length && str[i] !== ',' && str[i] !== ')') {
        val += str[i]
        i++
      }
      values.push(val.trim() === 'NULL' ? null : val.trim())
    }
  }
  return values
}

/* =========================================================
   HTML → LEXICAL CONVERTER
   ========================================================= */

function htmlToLexical(html) {
  if (!html) return emptyLexical()

  // Strip shortcodes
  let text = html.replace(/\[.*?\]/g, '')
  // Strip HTML tags but preserve paragraph breaks
  text = text
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    // Decode HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .trim()

  const paragraphs = text
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(p => p.length > 0)

  if (paragraphs.length === 0) return emptyLexical()

  return {
    root: {
      children: paragraphs.map(p => ({
        children: [{
          detail: 0,
          format: 0,
          mode: 'normal',
          style: '',
          text: p.replace(/\n/g, ' ').trim(),
          type: 'text',
          version: 1,
        }],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
      })),
      direction: 'ltr',
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  }
}

function emptyLexical() {
  return {
    root: {
      children: [{
        children: [{ detail: 0, format: 0, mode: 'normal', style: '', text: 'Sin contenido.', type: 'text', version: 1 }],
        direction: 'ltr', format: '', indent: 0, type: 'paragraph', version: 1,
      }],
      direction: 'ltr', format: '', indent: 0, type: 'root', version: 1,
    },
  }
}

/* =========================================================
   CATEGORY MAPPER
   ========================================================= */

const CATEGORY_KEYWORDS = {
  investigacion: ['investigaci', 'ciencia', 'investigador', 'conacyt', 'proyecto', 'científic', 'estudio', 'tesis', 'innovaci'],
  extension:     ['extensi', 'comunidad', 'social', 'bienestar', 'voluntari', 'solidar'],
  academica:     ['académ', 'académic', 'carrera', 'grado', 'facultad', 'ingreso', 'examen', 'docente', 'cátedra', 'estudiant', 'graduaci', 'egresad'],
  eventos:       ['event', 'jornada', 'ceremonia', 'inaugur', 'acto', 'conferencia', 'congreso', 'simposio', 'reunión', 'taller', 'capacit'],
  comunicados:   ['comunicado', 'aviso', 'convocatoria', 'licitaci', 'resoluc', 'ordenanza', 'cumplimiento', 'informe', 'ley'],
}

function mapCategory(wpCategories, title, content) {
  const searchText = [...wpCategories, title, content?.slice(0, 200)].join(' ').toLowerCase()
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => searchText.includes(kw))) return cat
  }
  return 'institucional'
}

function slugify(text) {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
}

function excerpt(html, maxLen = 280) {
  const text = html
    .replace(/\[.*?\]/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen).replace(/\s+\S*$/, '') + '…'
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

async function createNoticia(token, data) {
  const res = await fetch(`${CMS_URL}/api/noticias`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `JWT ${token}`,
    },
    body: JSON.stringify(data),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(body.errors || body))
  return body.doc
}

/* =========================================================
   MAIN
   ========================================================= */

async function main() {
  console.log(`\n📦 WordPress → Payload migration`)
  console.log(`   SQL: ${SQL_PATH}`)
  console.log(`   CMS: ${CMS_URL}`)
  console.log(`   Mode: ${DRY_RUN ? '🔍 DRY RUN (no writes)' : '✍️  LIVE'}`)
  if (LIMIT < Infinity) console.log(`   Limit: ${LIMIT} posts`)

  // Read SQL
  console.log('\n⏳ Reading SQL file…')
  const sql = fs.readFileSync(SQL_PATH, 'utf8')
  console.log(`   Size: ${(sql.length / 1024 / 1024).toFixed(1)} MB`)

  // Parse posts
  console.log('⏳ Parsing posts…')
  const allPosts = parseInserts(sql, 'uncm1_posts')
  const posts = allPosts
    .filter(p => p.post_type === 'post' && p.post_status === 'publish')
    .slice(0, LIMIT)
  console.log(`   Found: ${allPosts.filter(p => p.post_type === 'post' && p.post_status === 'publish').length} published posts`)
  console.log(`   Migrating: ${posts.length}`)

  // Parse taxonomy
  console.log('⏳ Parsing taxonomy…')
  const terms = parseInserts(sql, 'uncm1_terms')
  const termTaxonomy = parseInserts(sql, 'uncm1_term_taxonomy')
  const termRels = parseInserts(sql, 'uncm1_term_relationships')

  // Build lookup: post_id → [category names]
  const categoryTax = termTaxonomy
    .filter(t => t.taxonomy === 'category' || t.taxonomy === 'post_tag')
    .reduce((acc, t) => {
      acc[t.term_taxonomy_id] = terms.find(term => term.term_id === t.term_id)?.name || ''
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

  // Authenticate
  let token
  if (!DRY_RUN) {
    console.log('\n🔐 Authenticating with Payload…')
    token = await getToken()
    console.log('   ✅ Auth OK')
  }

  // Migrate
  console.log(`\n🚀 Migrating ${posts.length} posts…\n`)
  let ok = 0
  let skipped = 0
  let failed = 0
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

    // Skip if summary still too short
    if (summary.length < 20) {
      console.log(`  ⚠  [${i + 1}/${posts.length}] SKIP (no summary): ${title.slice(0, 60)}`)
      skipped++
      continue
    }

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
    }

    if (DRY_RUN) {
      console.log(`  ✅ [${i + 1}/${posts.length}] ${title.slice(0, 60)} → ${payload.category}`)
      ok++
      continue
    }

    try {
      await createNoticia(token, payload)
      console.log(`  ✅ [${i + 1}/${posts.length}] ${title.slice(0, 60)}`)
      ok++
      // Small delay to avoid overwhelming the API
      if (i % 10 === 9) await new Promise(r => setTimeout(r, 300))
    } catch (err) {
      const msg = err.message.slice(0, 120)
      console.log(`  ❌ [${i + 1}/${posts.length}] FAIL: ${title.slice(0, 50)} — ${msg}`)
      errors.push({ title, slug, error: msg })
      failed++
    }
  }

  // Summary
  console.log(`\n${'─'.repeat(50)}`)
  console.log(`✅ Migrated:  ${ok}`)
  console.log(`⚠  Skipped:   ${skipped}`)
  console.log(`❌ Failed:    ${failed}`)

  if (errors.length > 0) {
    const errFile = path.join(__dirname, '../migration-errors.json')
    fs.writeFileSync(errFile, JSON.stringify(errors, null, 2))
    console.log(`\n📋 Errors saved to: ${errFile}`)
  }

  console.log('\n✨ Migration complete.\n')
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err.message)
  process.exit(1)
})
