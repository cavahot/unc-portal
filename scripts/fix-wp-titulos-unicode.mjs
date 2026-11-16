/**
 * fix-wp-titulos-unicode.mjs — T6 de la migración nov-2026 (spec: docs/specs/migration/T6-TITULOS-UNICODE.md)
 *
 * Corrige las noticias ya cargadas con el importador anterior al normalizador: título con «letras matemáticas» de Unicode
 * (𝗨𝗡𝗖…) y/o slug codificado en porcentaje (`%f0%9d…`). Usa el MISMO normalizador que el importador (`wpNormalize.mjs`).
 *
 * Uso:
 *   node scripts/fix-wp-titulos-unicode.mjs                    # solo lee la API pública y muestra el plan (antes → después)
 *   CMS_EMAIL=... CMS_PASSWORD=... CMS_REVIEWER_EMAIL=... CMS_REVIEWER_PASSWORD=... \
 *     CMS_PUBLISHER_EMAIL=... CMS_PUBLISHER_PASSWORD=... node scripts/fix-wp-titulos-unicode.mjs --apply [--limit=1]
 *   ... --apply --allow-remote    # CMS_URL https explícito
 *   --xml=<volcado de WordPress>  # OBLIGATORIO con --apply: títulos originales completos (los guardados pueden estar cortados)
 *
 * Reglas (amenaza -> control):
 *   - Despublicar al editar -> el autor guarda SIEMPRE con `?draft=true`: el público ve la versión anterior hasta que el
 *     publicador publica la nueva.
 *   - Publicar con una sola identidad -> autor, revisor y publicador distintos (`checkIdentities`).
 *   - Renombrar noticias ajenas a la tarea -> solo entran las que tienen letras U+1D400–U+1D7FF o slug `%xx`.
 *   - Slug duplicado -> si el nuevo choca con otro (existente o de la misma corrida) se agrega `-<id>`.
 *   - Corrida interrumpida -> retoma desde el estado de la última versión, sin repetir la edición.
 * Límite: no cambia mayúsculas sostenidas (decisión pendiente del Product Owner) ni crea redirecciones.
 */
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { parseTableRows } from './lib/mediaLoader.mjs'
import { checkTarget, cmsError, openIdentity } from './smoke-menu-pagina.mjs'
import { normalizeTitle, slugForPost } from './lib/wpNormalize.mjs'
import { buildStepBody, checkIdentities, remainingSteps } from './lib/wpPublishFlow.mjs'

const MATH_ALNUM = /[\u{1D400}-\u{1D7FF}]/u
const ENCODED = /%[0-9a-f]{2}/i
const SLUG_MAX = 100
const PAGE_SIZE = 200

/**
 * Plan de corrección: `[{ id, from, to: { title, slug }, source }]`, solo para las noticias afectadas.
 * Puro (sin red) para poder probarlo. `docs` son TODAS las noticias, para detectar choques de slug.
 * `originals` (slug anterior -> título de WordPress) da el título COMPLETO: el importador anterior recortaba a 150 unidades
 * UTF-16 y cada letra decorativa ocupa 2, así que algunos títulos guardados están cortados (uno con un carácter partido).
 */
export function planFixes(docs, { originals } = {}) {
  const taken = new Set(docs.map((d) => d.slug))
  const plan = []
  for (const d of docs) {
    const encoded = ENCODED.test(d.slug)
    const decorative = MATH_ALNUM.test(d.title)
    if (!encoded && !decorative) continue
    const original = originals?.get(d.slug)
    const source = original ? 'volcado' : 'cms'
    const title = decorative || original ? normalizeTitle(original ?? d.title, { caps: 'mantener' }).title : d.title
    let slug = d.slug
    if (encoded) {
      slug = slugForPost({ wpSlug: d.slug, title, id: d.id }).slug
      if (taken.has(slug)) {
        const suffix = `-${d.id}`
        slug = slug.slice(0, SLUG_MAX - suffix.length) + suffix
      }
      taken.add(slug)
    }
    plan.push({ id: d.id, from: { title: d.title, slug: d.slug }, to: { title, slug }, source })
  }
  return plan
}

/**
 * Títulos originales del volcado de WordPress, por el slug que usaba el importador anterior (`post_name` recortado a 100).
 * Solo lectura; no imprime datos del volcado.
 */
export function loadOriginals(xml) {
  const map = new Map()
  for (const p of parseTableRows(xml, 'uncm1_posts')) {
    if (p.post_type === 'post' && p.post_status === 'publish' && p.post_name && p.post_title) {
      map.set(p.post_name.slice(0, SLUG_MAX), p.post_title)
    }
  }
  return map
}

/** Todas las noticias publicadas (lectura pública, sin credenciales): id, título y slug. */
async function listPublished(cmsUrl, doFetch) {
  const docs = []
  for (let page = 1; ; page++) {
    const url = `${cmsUrl}/api/noticias?limit=${PAGE_SIZE}&page=${page}&depth=0&select[title]=true&select[slug]=true`
    const res = await doFetch(url)
    if (!res.ok) throw new Error(`No se pudieron leer las noticias (HTTP ${res.status}).`)
    const data = await res.json()
    docs.push(...(data.docs ?? []).map((d) => ({ id: d.id, title: d.title ?? '', slug: d.slug ?? '' })))
    if (!data.hasNextPage) return docs
  }
}

/** Lleva una noticia del plan por el flujo editorial y comprueba lo que ve el público. Lanza si un paso falla. */
async function fixOne(p, ids, cmsUrl, doFetch) {
  let latest = (await ids.author.api('GET', `noticias/${p.id}?draft=true&depth=0`)).data
  if (latest?.title !== p.to.title || latest?.slug !== p.to.slug) {
    const edit = await ids.author.api('PATCH', `noticias/${p.id}?draft=true`, {
      title: p.to.title,
      slug: p.to.slug,
      approvalStatus: 'draft',
      _status: 'draft',
    })
    if (!edit.ok) throw new Error(`edición (${cmsError(edit)})`)
    latest = edit.data.doc
  }
  const { steps, blocked } = remainingSteps(latest)
  if (blocked) throw new Error(blocked)
  for (const step of steps) {
    const query = step.to === 'publicado' ? '' : '?draft=true'
    const res = await ids[step.actor].api('PATCH', `noticias/${p.id}${query}`, buildStepBody(step.to))
    if (!res.ok) throw new Error(`paso a ${step.to} (${cmsError(res)})`)
  }
  const pub = await doFetch(`${cmsUrl}/api/noticias/${p.id}?depth=0`)
  const doc = pub.ok ? await pub.json() : null
  if (doc?.title !== p.to.title || doc?.slug !== p.to.slug || doc?._status !== 'published') {
    throw new Error('la versión pública no muestra el cambio')
  }
}

/** Ejecuta la corrección. `deps` inyecta env, fetch y log (pruebas). Sin `apply` solo lee y muestra el plan. */
export async function run({ apply = false, allowRemote = false, limit = Infinity, originals, deps = {} } = {}) {
  const env = deps.env ?? process.env
  const log = deps.log ?? ((m) => console.log(m))
  const doFetch = deps.fetch ?? globalThis.fetch
  const cmsUrl = (env.CMS_URL || 'http://localhost:3002').replace(/\/+$/, '')
  checkTarget('CMS', cmsUrl, allowRemote)
  if (apply && !originals) {
    throw new Error('--apply exige --xml=<volcado de WordPress>: algunos títulos guardados están cortados y se toman del original.')
  }

  const plan = planFixes(await listPublished(cmsUrl, doFetch), { originals }).slice(0, limit)
  log(`${plan.length} noticia(s) para corregir${apply ? '' : ' (sin escribir; use --apply)'}:`)
  for (const p of plan) {
    log(`  #${p.id}: «${p.to.title}»${p.from.slug !== p.to.slug ? ` | slug → ${p.to.slug}` : ''} [título: ${p.source}]`)
  }
  if (!apply) return { dryRun: true, ok: true, plan, fixed: 0, failed: 0 }

  log('Identidades:')
  const ids = {
    author: await openIdentity({ cmsUrl, email: env.CMS_EMAIL, password: env.CMS_PASSWORD, allowRemote, doFetch, log }),
    reviewer: await openIdentity({ cmsUrl, email: env.CMS_REVIEWER_EMAIL, password: env.CMS_REVIEWER_PASSWORD, allowRemote, doFetch, log }),
    publisher: await openIdentity({ cmsUrl, email: env.CMS_PUBLISHER_EMAIL, password: env.CMS_PUBLISHER_PASSWORD, allowRemote, doFetch, log }),
  }
  const check = checkIdentities({ author: ids.author.user, reviewer: ids.reviewer.user, publisher: ids.publisher.user })
  const problems = [...check.problems]
  if (check.mode !== 'full') problems.push('Faltan el revisor y el publicador.')
  if (problems.length) {
    log(`  ✘ identidades — ${problems.join(' ')}`)
    return { dryRun: false, ok: false, plan, fixed: 0, failed: 0 }
  }

  let fixed = 0
  let failed = 0
  for (const p of plan) {
    try {
      await fixOne(p, ids, cmsUrl, doFetch)
      fixed++
      log(`  ✔ #${p.id} publicada: /noticias/${p.to.slug}`)
    } catch (e) {
      failed++
      log(`  ✘ #${p.id}: ${e.message}`)
    }
  }
  log('')
  log(`Resultado: ${fixed} corregida(s), ${failed} con error, de ${plan.length}.`)
  return { dryRun: false, ok: failed === 0, plan, fixed, failed }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2)
  const limitArg = args.find((a) => a.startsWith('--limit='))
  const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity
  if (limitArg && !(Number.isInteger(limit) && limit > 0)) {
    console.error('Error: --limit debe ser un entero positivo.')
    process.exit(2)
  }
  const xmlArg = args.find((a) => a.startsWith('--xml='))
  const originals = xmlArg ? loadOriginals(readFileSync(xmlArg.slice('--xml='.length), 'utf8')) : undefined
  run({ apply: args.includes('--apply'), allowRemote: args.includes('--allow-remote'), limit, originals })
    .then((r) => process.exit(r.ok ? 0 : 1))
    .catch((e) => {
      console.error(`Error: ${e.message}`)
      process.exit(1)
    })
}
