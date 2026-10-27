/**
 * seed-glosario-guarani.mjs — GLO-GN-01
 *
 * Siembra en la colección privada `glosario-guarani` las 128 entradas del glosario del PO (dataset generado
 * en scripts/lib/glosarioGnSeedData.mjs a partir de glosario_es_gn.csv). Después el CMS es la fuente: el PO
 * revisa y corrige en el panel. Spec: docs/specs/i18n/GLOSARIO-GUARANI.md §3 y escenario 8.
 *
 * Uso:
 *   node scripts/seed-glosario-guarani.mjs --dry-run                          # sin red
 *   CMS_EMAIL=... CMS_PASSWORD=... node scripts/seed-glosario-guarani.mjs     # CMS local (localhost:3002)
 *   CMS_URL=https://... node scripts/seed-glosario-guarani.mjs --allow-remote # explícito; solo https
 *
 * Reglas (amenaza -> control):
 *   - Escribir en un CMS equivocado -> solo localhost salvo --allow-remote (y entonces solo https).
 *   - Credencial débil o literal -> `requireCmsPassword` (SEC-08); nada se imprime.
 *   - Duplicar filas -> GET por clave natural (terminoEs + fuente) antes de cada POST; además índice único.
 *   - Pisar revisiones del PO -> una fila existente NUNCA se modifica (revisada o no): solo se crean faltantes.
 *   - Saturar el CMS -> pausa entre escrituras.
 * Límite: si el PO renombra la fuente o el término de una fila, una nueva ejecución la volvería a crear con
 * los datos originales; el seed está pensado para la carga inicial.
 */
import { pathToFileURL } from 'node:url'
import { requireCmsPassword } from './lib/requireCmsPassword.mjs'
import { GLOSARIO_GN_META, GLOSARIO_GN_SEED } from './lib/glosarioGnSeedData.mjs'

const PACE_MS = 120
const COLLECTION = 'glosario-guarani'
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

/**
 * Valida el destino y abre sesión. Compartido con el actualizador para que ambas herramientas apliquen la
 * misma política de destino y credenciales. Devuelve `{ cmsUrl, api }`.
 */
export async function openCmsSession({ allowRemote = false, env, doFetch, log }) {
  const cmsUrl = (env.CMS_URL || 'http://localhost:3002').replace(/\/+$/, '')
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
  return { cmsUrl, api }
}

/** Ejecuta la siembra. `deps` permite inyectar env, fetch, log y pace (pruebas). */
export async function run({ dryRun = false, allowRemote = false, deps = {} } = {}) {
  const env = deps.env ?? process.env
  const log = deps.log ?? ((m) => console.log(m))
  const doFetch = deps.fetch ?? globalThis.fetch
  const pace = deps.pace ?? sleep
  const entries = deps.entries ?? GLOSARIO_GN_SEED

  if (dryRun) {
    const cmsUrl = (env.CMS_URL || 'http://localhost:3002').replace(/\/+$/, '')
    const by = (k) => entries.reduce((acc, e) => ({ ...acc, [e[k]]: (acc[e[k]] ?? 0) + 1 }), {})
    log(`[dry-run] CMS destino: ${cmsUrl} (sin llamadas de red)`)
    log(`[dry-run] origen: ${GLOSARIO_GN_META.fileName} (${GLOSARIO_GN_META.fecha}), ${entries.length} entradas`)
    log(`[dry-run] confianza: ${JSON.stringify(by('confianza'))} · oficiales: ${entries.filter((e) => e.oficial).length}`)
    log('[dry-run] solo se crean las que no existan por terminoEs + fuente; las existentes no se tocan')
    return { dryRun: true, plan: { entradas: entries.length } }
  }

  const { api } = await openCmsSession({ allowRemote, env, doFetch, log })
  /** Busca por clave natural; con sesión institucional ve también filas inactivas (no las recrea). */
  const findExisting = async (e) => {
    const q = `where[terminoEs][equals]=${encodeURIComponent(e.terminoEs)}&where[fuente][equals]=${encodeURIComponent(e.fuente)}&limit=2&depth=0`
    const r = await api('GET', `${COLLECTION}?${q}`)
    if (!r.ok) throw new Error(`Consulta a ${COLLECTION} falló (HTTP ${r.status}).`)
    return r.data.docs?.[0] ?? null
  }

  const counts = { creados: 0, existentes: 0, existentesRevisados: 0, errores: 0 }
  for (const e of entries) {
    const found = await findExisting(e)
    if (found) {
      counts.existentes++
      if (found.revisado) counts.existentesRevisados++
      continue
    }
    const r = await api('POST', COLLECTION, e)
    await pace(PACE_MS)
    if (r.ok) {
      counts.creados++
      log(`  + Creado: ${e.terminoEs} [${e.confianza}]`)
    } else {
      counts.errores++
      log(`  ! Falló ${e.terminoEs} (HTTP ${r.status}): ${JSON.stringify(r.data.errors ?? r.data).slice(0, 300)}`)
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
