/**
 * seed-marco-legal.mjs — MLG-01
 *
 * Siembra en el CMS los 44 documentos que publica https://www.unc.edu.py/marco-legal/
 * (datos en scripts/lib/marcoLegalSeedData.mjs). Después el CMS es la única fuente: se editan desde el panel.
 * Spec: docs/specs/portal/MARCO-LEGAL.md §5 y escenario 10.
 *
 * Uso:
 *   node scripts/seed-marco-legal.mjs --dry-run                         # sin red
 *   CMS_EMAIL=... CMS_PASSWORD=... node scripts/seed-marco-legal.mjs    # CMS local (localhost:3002)
 *   ... node scripts/seed-marco-legal.mjs --update                      # corrige category/externalUrl/order
 *   CMS_URL=https://... node scripts/seed-marco-legal.mjs --allow-remote   # explícito; solo https
 *
 * Reglas (amenaza -> control):
 *   - Escribir en un CMS equivocado -> solo localhost salvo --allow-remote (y entonces solo https).
 *   - Credencial débil o literal -> `requireCmsPassword` (SEC-08); el correo viene de CMS_EMAIL; nada se imprime.
 *   - Duplicar filas al re-ejecutar -> GET por clave natural (título exacto) antes de cada POST.
 *   - Pisar ediciones del PO -> una fila existente solo se informa; con --update se corrigen SOLO los campos
 *     del seed (category, externalUrl, order). `active`, `estado`, notas y fechas nunca se tocan.
 *   - Saturar el CMS -> pausa entre escrituras.
 * Límite: no comprueba que los archivos de Drive sigan accesibles.
 */
import { pathToFileURL } from 'node:url'
import { requireCmsPassword } from './lib/requireCmsPassword.mjs'
import { MARCO_LEGAL_DOCS, SEED_MANAGED_FIELDS, toCmsPayloadMarcoLegal } from './lib/marcoLegalSeedData.mjs'

const PACE_MS = 120
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** true solo para hosts de desarrollo local. */
export function isLocalCmsUrl(url) {
  try {
    const h = new URL(url).hostname
    return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1'
  } catch {
    return false
  }
}

/** Campos del seed que difieren entre la fila del CMS y el payload deseado. */
function diffManaged(existing, wanted) {
  return SEED_MANAGED_FIELDS.filter((f) => existing[f] !== wanted[f])
}

/** Ejecuta la siembra. `deps` permite inyectar env, fetch, log y pace (pruebas). */
export async function run({ dryRun = false, allowRemote = false, update = false, deps = {} } = {}) {
  const env = deps.env ?? process.env
  const log = deps.log ?? ((m) => console.log(m))
  const doFetch = deps.fetch ?? globalThis.fetch
  const pace = deps.pace ?? sleep
  const cmsUrl = (env.CMS_URL || 'http://localhost:3002').replace(/\/+$/, '')

  if (dryRun) {
    const perCategory = {}
    for (const d of MARCO_LEGAL_DOCS) perCategory[d.category] = (perCategory[d.category] ?? 0) + 1
    log(`[dry-run] CMS destino: ${cmsUrl} (sin llamadas de red)`)
    log(`[dry-run] documentos: ${MARCO_LEGAL_DOCS.length} (active=true, estado=vigente; solo se crean los que no existan por título)`)
    log(`[dry-run] por categoría: ${JSON.stringify(perCategory)}`)
    return { dryRun: true, plan: { documentos: MARCO_LEGAL_DOCS.length, perCategory } }
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
  const findByTitle = async (title) => {
    const r = await api('GET', `marco-legal?where[title][equals]=${encodeURIComponent(title)}&limit=2&depth=0`)
    if (!r.ok) throw new Error(`Consulta a marco-legal falló (HTTP ${r.status}).`)
    return r.data.docs?.[0] ?? null
  }

  const counts = { creados: 0, sinCambios: 0, conDiferencias: 0, actualizados: 0, errores: 0 }
  for (const [index, item] of MARCO_LEGAL_DOCS.entries()) {
    const wanted = toCmsPayloadMarcoLegal(item, index)
    const existing = await findByTitle(item.title)
    if (existing) {
      const diff = diffManaged(existing, wanted)
      if (diff.length === 0) {
        counts.sinCambios++
        continue
      }
      counts.conDiferencias++
      if (!update) {
        log(`  ~ Difiere (${diff.join(', ')}), no se toca sin --update: ${item.title}`)
        continue
      }
      const patch = Object.fromEntries(diff.map((f) => [f, wanted[f]]))
      const r = await api('PATCH', `marco-legal/${existing.id}`, patch)
      await pace(PACE_MS)
      if (r.ok) {
        counts.actualizados++
        log(`  * Actualizado (${diff.join(', ')}): ${item.title}`)
      } else {
        counts.errores++
        log(`  ! Falló la actualización de ${item.title} (HTTP ${r.status}): ${JSON.stringify(r.data.errors ?? r.data).slice(0, 300)}`)
      }
      continue
    }
    const r = await api('POST', 'marco-legal', wanted)
    await pace(PACE_MS)
    if (r.ok) {
      counts.creados++
      log(`  + Creado [${item.category}]: ${item.title}`)
    } else {
      counts.errores++
      log(`  ! Falló ${item.title} (HTTP ${r.status}): ${JSON.stringify(r.data.errors ?? r.data).slice(0, 300)}`)
    }
  }
  log('')
  log(`Resumen: ${JSON.stringify(counts)}`)
  return { dryRun: false, counts }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run({
    dryRun: process.argv.includes('--dry-run'),
    allowRemote: process.argv.includes('--allow-remote'),
    update: process.argv.includes('--update'),
  }).catch((err) => {
    console.error(`Error: ${err.message}`)
    process.exit(1)
  })
}
