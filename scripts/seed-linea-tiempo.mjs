/**
 * seed-linea-tiempo.mjs — LT-01
 *
 * Siembra en el CMS los 5 hitos que la página /historia mostraba escritos en el código (datos en
 * scripts/lib/lineaTiempoSeedData.mjs). Después el CMS es la única fuente: se editan desde el panel.
 * Spec: docs/specs/portal/LINEA-TIEMPO.md §5 y escenario 10.
 *
 * Uso:
 *   node scripts/seed-linea-tiempo.mjs --dry-run                         # sin red
 *   CMS_EMAIL=... CMS_PASSWORD=... node scripts/seed-linea-tiempo.mjs    # CMS local (localhost:3002)
 *   CMS_URL=https://... node scripts/seed-linea-tiempo.mjs --allow-remote   # explícito; solo https
 *
 * Reglas (amenaza -> control):
 *   - Escribir en un CMS equivocado -> solo localhost salvo --allow-remote (y entonces solo https).
 *   - Credencial débil o literal -> `requireCmsPassword` (SEC-08); el correo viene de CMS_EMAIL; nada se imprime.
 *   - Duplicar filas al re-ejecutar -> GET por clave natural (anio + titulo exactos) antes de cada POST.
 *   - Pisar ediciones del PO -> una fila existente nunca se modifica (no hay modo --update: los textos ya son
 *     del PO una vez cargados).
 *   - Saturar el CMS -> pausa entre escrituras.
 * Límite: si el PO cambia el título de un hito, una nueva ejecución lo volvería a crear con el texto viejo;
 * el seed está pensado para la carga inicial.
 */
import { pathToFileURL } from 'node:url'
import { requireCmsPassword } from './lib/requireCmsPassword.mjs'
import { LINEA_TIEMPO_HITOS, toCmsPayloadLineaTiempo } from './lib/lineaTiempoSeedData.mjs'

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

/** Ejecuta la siembra. `deps` permite inyectar env, fetch, log y pace (pruebas). */
export async function run({ dryRun = false, allowRemote = false, deps = {} } = {}) {
  const env = deps.env ?? process.env
  const log = deps.log ?? ((m) => console.log(m))
  const doFetch = deps.fetch ?? globalThis.fetch
  const pace = deps.pace ?? sleep
  const cmsUrl = (env.CMS_URL || 'http://localhost:3002').replace(/\/+$/, '')

  if (dryRun) {
    log(`[dry-run] CMS destino: ${cmsUrl} (sin llamadas de red)`)
    log(`[dry-run] hitos: ${LINEA_TIEMPO_HITOS.length} (active=true, orden=1; solo se crean los que no existan por año + título)`)
    for (const h of LINEA_TIEMPO_HITOS) log(`[dry-run]   ${h.anio} · ${h.titulo}`)
    return { dryRun: true, plan: { hitos: LINEA_TIEMPO_HITOS.length } }
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
  /** Busca por clave natural; con sesión institucional también ve hitos retirados (no los recrea). */
  const findExisting = async (anio, titulo) => {
    const q = `where[anio][equals]=${anio}&where[titulo][equals]=${encodeURIComponent(titulo)}&limit=2&depth=0`
    const r = await api('GET', `linea-tiempo?${q}`)
    if (!r.ok) throw new Error(`Consulta a linea-tiempo falló (HTTP ${r.status}).`)
    return r.data.docs?.[0] ?? null
  }

  const counts = { creados: 0, existentes: 0, errores: 0 }
  for (const item of LINEA_TIEMPO_HITOS) {
    if (await findExisting(item.anio, item.titulo)) {
      counts.existentes++
      log(`  = Ya existe, no se toca: ${item.anio} · ${item.titulo}`)
      continue
    }
    const r = await api('POST', 'linea-tiempo', toCmsPayloadLineaTiempo(item))
    await pace(PACE_MS)
    if (r.ok) {
      counts.creados++
      log(`  + Creado: ${item.anio} · ${item.titulo}`)
    } else {
      counts.errores++
      log(`  ! Falló ${item.anio} · ${item.titulo} (HTTP ${r.status}): ${JSON.stringify(r.data.errors ?? r.data).slice(0, 300)}`)
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
  }).catch((err) => {
    console.error(`Error: ${err.message}`)
    process.exit(1)
  })
}
