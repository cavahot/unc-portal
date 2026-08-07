/**
 * Patch news thumbnails from WordPress XML export.
 *
 * Reads the same XML dump used in migrate-wordpress.mjs, extracts
 * the _thumbnail_id postmeta, resolves the attachment guid URL, then
 * PATCHes each existing Payload noticia with featuredImageUrl.
 *
 * Usage:
 *   node scripts/patch-news-images.mjs [--xml=<path>] [--dry-run] [--cms=<url>]
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HOME = process.env.USERPROFILE || process.env.HOME || ''

const args    = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const XML_ARG = args.find(a => a.startsWith('--xml='))?.split('=').slice(1).join('=')
const CMS_URL = args.find(a => a.startsWith('--cms='))?.split('=')[1] || 'http://localhost:3002'

const CMS_EMAIL    = process.env.CMS_EMAIL    || 'admin@unc.edu.py'
const CMS_PASSWORD = process.env.CMS_PASSWORD || 'Admin1234!'

/* ── XML helpers ─────────────────────────────────────────── */

function decodeEntities(s) {
  return (s || '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ')
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

async function resolveXml() {
  const candidates = [
    XML_ARG,
    path.join(HOME, 'Downloads', 'm1gr4unc_dbWP (1).zip'),
    path.join(HOME, 'Downloads', 'm1gr4unc_dbWP.zip'),
    path.join(HOME, 'Downloads', 'm1gr4unc_dbWP.xml'),
    path.join(__dirname, '..', 'm1gr4unc_dbWP.xml'),
  ].filter(Boolean)

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue
    if (candidate.endsWith('.xml')) return fs.readFileSync(candidate, 'utf8')
    if (candidate.endsWith('.zip')) {
      const tmpXml = path.join(process.env.TEMP || '/tmp', 'unc_wp_export.xml')
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
  throw new Error('XML not found. Pass --xml=<path> or place m1gr4unc_dbWP.zip in ~/Downloads')
}

/* ── Payload auth ────────────────────────────────────────── */

async function getToken() {
  const res = await fetch(`${CMS_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: CMS_EMAIL, password: CMS_PASSWORD }),
  })
  if (!res.ok) throw new Error(`Auth failed: ${res.status} ${await res.text()}`)
  return (await res.json()).token
}

async function findNoticiaBySlug(token, slug) {
  const res = await fetch(
    `${CMS_URL}/api/noticias?where[slug][equals]=${encodeURIComponent(slug)}&limit=1`,
    { headers: { Authorization: `JWT ${token}` } }
  )
  if (!res.ok) return null
  const { docs } = await res.json()
  return docs?.[0] ?? null
}

async function patchNoticia(token, id, featuredImageUrl) {
  const res = await fetch(`${CMS_URL}/api/noticias/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
    body: JSON.stringify({ featuredImageUrl }),
  })
  if (!res.ok) throw new Error(`PATCH failed: ${res.status} ${await res.text()}`)
  return res.json()
}

/* ── Main ────────────────────────────────────────────────── */

async function main() {
  console.log('\n── PATCH NEWS THUMBNAILS ────────────────────────────')
  console.log(`   CMS: ${CMS_URL}  dry-run: ${DRY_RUN}`)

  const xml = await resolveXml()

  // Build post → thumbnail URL map
  const postmeta   = parseTableRows(xml, 'uncm1_postmeta')
  const allPosts   = parseTableRows(xml, 'uncm1_posts')

  // Map attachment ID → guid URL
  const attachments = Object.fromEntries(
    allPosts
      .filter(p => p.post_type === 'attachment' && p.guid)
      .map(p => [p.ID, p.guid])
  )

  // Map post ID → thumbnail URL
  const thumbnailByPostId = {}
  for (const meta of postmeta) {
    if (meta.meta_key === '_thumbnail_id' && meta.meta_value) {
      const thumbId = meta.meta_value.trim()
      const url = attachments[thumbId]
      if (url) thumbnailByPostId[meta.post_id] = url
    }
  }

  // Published posts only
  const posts = allPosts.filter(p => p.post_type === 'post' && p.post_status === 'publish')
  const withThumb = posts.filter(p => thumbnailByPostId[p.ID])

  console.log(`   Published posts: ${posts.length}`)
  console.log(`   Posts with thumbnail: ${withThumb.length}`)

  if (withThumb.length === 0) {
    console.log('   Nothing to patch.')
    return
  }

  const token = DRY_RUN ? null : await getToken()
  let ok = 0, skipped = 0, notFound = 0, failed = 0

  for (const [i, post] of withThumb.entries()) {
    const slug     = post.post_name
    const imageUrl = thumbnailByPostId[post.ID]
    const label    = `[${i + 1}/${withThumb.length}] ${(post.post_title || slug).slice(0, 50)}`

    if (DRY_RUN) {
      console.log(`  ✅ ${label} → ${imageUrl}`)
      ok++
      continue
    }

    const noticia = await findNoticiaBySlug(token, slug)
    if (!noticia) {
      console.log(`  ⚠  ${label} — not found in Payload`)
      notFound++
      continue
    }

    if (noticia.featuredImageUrl) {
      console.log(`  –  ${label} — already has URL, skipping`)
      skipped++
      continue
    }

    try {
      await patchNoticia(token, noticia.id, imageUrl)
      console.log(`  ✅ ${label}`)
      ok++
      if (i % 10 === 9) await new Promise(r => setTimeout(r, 100))
    } catch (err) {
      console.log(`  ❌ ${label} — ${err.message.slice(0, 80)}`)
      failed++
    }
  }

  console.log(`\n   ✅ ${ok}  ⚠ skipped: ${skipped}  ? not-found: ${notFound}  ❌ ${failed}`)
}

main().catch(e => { console.error(e); process.exit(1) })
