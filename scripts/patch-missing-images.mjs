/**
 * Patch the two news items that have no featuredImageUrl.
 * IDs: 271, 270
 */

const CMS_URL      = 'http://localhost:3002'
const CMS_EMAIL    = process.env.CMS_EMAIL    || 'admin@unc.edu.py'
const CMS_PASSWORD = process.env.CMS_PASSWORD || 'Admin1234!'

const PATCHES = [
  {
    id: 271,
    slug: 'rector-de-la-unc-participo-en-la-apertura-de-las-xx-jornadas-de-jovenes-investigadores-e-innovadores',
    // Primera imagen de la galería en el artículo WP original
    featuredImageUrl: 'https://www.unc.edu.py/wp-content/uploads/2026/07/WhatsApp-Image-2026-07-24-at-10.43.01-1024x682.jpeg',
  },
  // ID 270 — buscar imagen en el XML de WP; si no existe, parchear desde galería
  {
    id: 270,
    slug: 'autoridades-de-la-universidad-nacional-de-concepcion-participaron-en-reunion-con-el-ministerio-del-i',
    featuredImageUrl: null, // se busca abajo
  },
]

async function getToken() {
  const res = await fetch(`${CMS_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: CMS_EMAIL, password: CMS_PASSWORD }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Auth failed (${res.status}): ${text}`)
  }
  const data = await res.json()
  return data.token
}

async function getNoticia(token, id) {
  const res = await fetch(`${CMS_URL}/api/noticias/${id}?depth=2`, {
    headers: { Authorization: `JWT ${token}` },
  })
  if (!res.ok) return null
  return res.json()
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

async function findImageFromWP(slug) {
  const url = `https://www.unc.edu.py/${slug}/`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    const html = await res.text()
    // Buscar la primera imagen featured (og:image o primera en wp-content)
    const og = html.match(/property="og:image"\s+content="([^"]+)"/)
    if (og) return og[1]
    const wp = html.match(/wp-content\/uploads\/[^"'\s>]+\.(?:jpg|jpeg|png|webp)/i)
    if (wp) return `https://www.unc.edu.py/${wp[0]}`
  } catch {
    // timeout o error de red
  }
  return null
}

async function main() {
  console.log('\n── PATCH MISSING IMAGES ───────────────────────────────')

  let token
  try {
    token = await getToken()
    console.log('✅ Auth OK')
  } catch (err) {
    console.error(`❌ ${err.message}`)
    console.error('\n   Corré el script con tus credenciales reales:')
    console.error('   $env:CMS_EMAIL="tu@email.com"; $env:CMS_PASSWORD="tuPassword"; node scripts/patch-missing-images.mjs')
    process.exit(1)
  }

  for (const patch of PATCHES) {
    process.stdout.write(`\n[${patch.id}] ${patch.slug.slice(0, 50)}...\n`)

    const noticia = await getNoticia(token, patch.id)
    if (!noticia) { console.log('  ⚠ No encontrada'); continue }
    if (noticia.featuredImageUrl) { console.log('  – Ya tiene imagen, skip'); continue }

    // Intentar resolución desde WP si no tenemos URL directa
    let imageUrl = patch.featuredImageUrl
    if (!imageUrl) {
      process.stdout.write('  🔍 Buscando en sitio WP...\n')
      imageUrl = await findImageFromWP(patch.slug)
    }

    if (!imageUrl) {
      console.log('  ⚠ No se encontró imagen — agregala manualmente en el CMS admin')
      console.log(`     http://localhost:3002/admin/collections/noticias/${patch.id}`)
      continue
    }

    try {
      await patchNoticia(token, patch.id, imageUrl)
      console.log(`  ✅ Parcheada: ${imageUrl.slice(0, 80)}`)
    } catch (err) {
      console.error(`  ❌ ${err.message}`)
    }
  }

  console.log('\n── Listo. Recargá el portal para ver los cambios. ──────')
}

main().catch(e => { console.error(e); process.exit(1) })
