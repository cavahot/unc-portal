/**
 * seed-pilares-academicos.mjs — PILARES-01
 *
 * Carga idempotente del contenido inicial del global `pilares-academicos`: las tarjetas de Docencia, Investigación y
 * Extensión de la portada y sus páginas, todas «en construcción». Datos y origen de cada texto en
 * scripts/lib/pilaresSeedData.mjs. Spec: docs/specs/portal/PILARES-ACADEMICOS.md.
 *
 * Uso:
 *   node scripts/seed-pilares-academicos.mjs                                   # dry-run (por defecto): sin red
 *   CMS_EMAIL=... CMS_PASSWORD=... node scripts/seed-pilares-academicos.mjs --apply
 *   ... --apply --allow-remote   # CMS_URL=https://... explícito; solo https
 *
 * Reglas (amenaza -> control):
 *   - Pisar ediciones al re-ejecutar -> si algún pilar ya tiene título se OMITE todo y no se modifica nada.
 *   - Escribir en un CMS equivocado -> solo localhost salvo --allow-remote (y entonces solo https).
 *   - Credencial débil o literal -> `requireCmsPassword` (SEC-08); nada se imprime.
 *   - Cifras inventadas -> ninguna métrica a mano; las de Docencia se vinculan a «Estadísticas».
 * Límite: no actualiza un global con contenido; para cambiarlo use el panel del CMS.
 */
import { pathToFileURL } from 'node:url'
import { PILARES_SEED } from './lib/pilaresSeedData.mjs'
import { requireCmsPassword } from './lib/requireCmsPassword.mjs'

export { PILARES_SEED }

/** true solo para hosts de desarrollo local. */
export function isLocalCmsUrl(url) {
  try {
    const h = new URL(url).hostname
    return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1'
  } catch {
    return false
  }
}

/** El global «tiene contenido» si algún pilar ya tiene título (no se pisa nunca). */
export function hasContent(doc) {
  if (!doc || typeof doc !== 'object') return false
  return ['docencia', 'investigacion', 'extension'].some((k) => typeof doc[k]?.titulo === 'string' && doc[k].titulo.trim())
}

/** Ejecuta la carga. `deps` permite inyectar env, fetch y log (pruebas). Por defecto es dry-run. */
export async function run({ apply = false, allowRemote = false, deps = {} } = {}) {
  const env = deps.env ?? process.env
  const log = deps.log ?? ((m) => console.log(m))
  const doFetch = deps.fetch ?? globalThis.fetch
  const cmsUrl = (env.CMS_URL || 'http://localhost:3002').replace(/\/+$/, '')

  if (!apply) {
    log(`[dry-run] CMS destino: ${cmsUrl} (sin llamadas de red). Use --apply para escribir.`)
    log('[dry-run] contenido: 3 pilares (Docencia, Investigación, Extensión), páginas en construcción, 2 métricas vinculadas a «Estadísticas».')
    return { dryRun: true, counts: { pilares: 3 } }
  }

  if (!isLocalCmsUrl(cmsUrl)) {
    if (!allowRemote) throw new Error(`Este guion solo escribe en un CMS local; destino rechazado: ${cmsUrl}. Use --allow-remote para un destino https explícito.`)
    if (new URL(cmsUrl).protocol !== 'https:') throw new Error('Con --allow-remote el CMS debe usar https.')
  }
  const email = (env.CMS_EMAIL || '').trim()
  if (!email) throw new Error('Falta CMS_EMAIL (usuario superadmin o web-admin).')
  const password = requireCmsPassword(env)

  const loginRes = await doFetch(`${cmsUrl}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const login = await loginRes.json().catch(() => ({}))
  if (!login.token) throw new Error(`No se pudo iniciar sesión en el CMS (HTTP ${loginRes.status}).`)
  const headers = { 'Content-Type': 'application/json', Authorization: `JWT ${login.token}` }
  log(`Sesión iniciada en ${cmsUrl}`)

  const api = async (method, endpoint, body) => {
    const res = await doFetch(`${cmsUrl}/api/${endpoint}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, status: res.status, data }
  }

  const counts = { creados: 0, omitidos: 0, errores: 0 }
  const current = await api('GET', 'globals/pilares-academicos?depth=0')
  if (!current.ok) {
    counts.errores++
    log(`  ! No se pudo leer el global (HTTP ${current.status}).`)
  } else if (hasContent(current.data)) {
    counts.omitidos++
    log('  = Omitido: el global ya tiene contenido (no se modifica).')
  } else {
    const r = await api('POST', 'globals/pilares-academicos', PILARES_SEED)
    if (r.ok) {
      counts.creados++
      log('  + Contenido sembrado: 3 pilares, páginas en construcción.')
    } else {
      counts.errores++
      log(`  ! Falló la escritura (HTTP ${r.status}): ${JSON.stringify(r.data.errors ?? r.data).slice(0, 300)}`)
    }
  }
  log('')
  log(`Resumen: ${JSON.stringify(counts)}`)
  return { dryRun: false, counts }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2)
  if (args.includes('--apply') && args.includes('--dry-run')) {
    console.error('Error: --apply y --dry-run se excluyen.')
    process.exit(1)
  }
  run({ apply: args.includes('--apply'), allowRemote: args.includes('--allow-remote') })
    .then((result) => {
      if (result.counts.errores > 0) process.exitCode = 1
    })
    .catch((err) => {
      console.error(`Error: ${err.message}`)
      process.exit(1)
    })
}
