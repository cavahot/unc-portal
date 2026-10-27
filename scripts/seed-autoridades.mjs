/**
 * seed-autoridades.mjs — AUT-01
 *
 * Siembra en el CMS las autoridades que /autoridades ya mostraba (datos en scripts/lib/autoridadesSeedData.mjs).
 * Después el CMS es la única fuente: se editan desde el panel.
 *
 * Uso:
 *   node scripts/seed-autoridades.mjs --dry-run                       # sin red
 *   CMS_EMAIL=... CMS_PASSWORD=... node scripts/seed-autoridades.mjs  # CMS local (localhost:3002)
 *   CMS_URL=https://... node scripts/seed-autoridades.mjs --allow-remote   # explícito; solo https
 *
 * Reglas (amenaza -> control):
 *   - Escribir en un CMS equivocado -> solo localhost salvo --allow-remote (y entonces solo https).
 *   - Credencial débil o literal -> `requireCmsPassword` (SEC-08); el correo viene de CMS_EMAIL; nada se imprime.
 *   - Pisar ediciones del PO al re-ejecutar -> idempotente: si existe una fila con ese `name`, NO se toca.
 *   - Decano sin facultad -> si la facultad (por slug) no existe se informa el error y NO se crea la fila.
 * Límite: crea con active=true (personas ya publicadas en el sitio); no sube fotos ni CV.
 */
import { pathToFileURL } from 'node:url'
import { requireCmsPassword } from './lib/requireCmsPassword.mjs'
import { AUTORIDADES, toCmsPayloadAutoridad } from './lib/autoridadesSeedData.mjs'

const PACE_MS = 150
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

/** Ejecuta la siembra. `deps` permite inyectar env, fetch, log y pace (pruebas). */
export async function run({ dryRun = false, allowRemote = false, deps = {} } = {}) {
  const env = deps.env ?? process.env
  const log = deps.log ?? ((m) => console.log(m))
  const doFetch = deps.fetch ?? globalThis.fetch
  const pace = deps.pace ?? sleep
  const cmsUrl = (env.CMS_URL || 'http://localhost:3002').replace(/\/+$/, '')

  if (dryRun) {
    log(`[dry-run] CMS destino: ${cmsUrl} (sin llamadas de red)`)
    log(`[dry-run] autoridades: ${AUTORIDADES.length} (active=true; solo se crean las que no existan por nombre)`)
    return { dryRun: true, plan: { autoridades: AUTORIDADES.length } }
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
  const findOne = async (collection, field, value) => {
    const r = await api('GET', `${collection}?where[${field}][equals]=${encodeURIComponent(value)}&limit=1&depth=0`)
    if (!r.ok) throw new Error(`Consulta a ${collection} falló (HTTP ${r.status}).`)
    return r.data.docs?.[0] ?? null
  }

  const counts = { creadas: 0, existentes: 0, errores: 0 }
  for (const item of AUTORIDADES) {
    const existing = await findOne('autoridades', 'name', item.name)
    if (existing) {
      counts.existentes++
      log(`  = Ya existe (no se toca): ${item.name}`)
      continue
    }
    let facultyId
    if (item.type === 'decano') {
      const fac = item.facultadSlug ? await findOne('facultades', 'slug', item.facultadSlug) : null
      if (!fac) {
        counts.errores++
        log(`  ! ${item.name}: falta la facultad «${item.facultadSlug}» en el CMS; no se crea (cree la facultad y re-ejecute).`)
        continue
      }
      facultyId = fac.id
    }
    const r = await api('POST', 'autoridades', toCmsPayloadAutoridad(item, facultyId))
    await pace(PACE_MS)
    if (r.ok) {
      counts.creadas++
      log(`  + Creada: ${item.name}`)
    } else {
      counts.errores++
      log(`  ! Falló ${item.name} (HTTP ${r.status}): ${JSON.stringify(r.data.errors ?? r.data).slice(0, 300)}`)
    }
  }
  log('')
  log(`Resumen: ${JSON.stringify(counts)}`)
  return { dryRun: false, counts }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run({ dryRun: process.argv.includes('--dry-run'), allowRemote: process.argv.includes('--allow-remote') }).catch((err) => {
    console.error(`Error: ${err.message}`)
    process.exit(1)
  })
}
