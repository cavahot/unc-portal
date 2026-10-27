/**
 * seed-aranceles-rectorado.mjs — ARR-01
 *
 * Siembra en el CMS los 24 aranceles que publica https://www.unc.edu.py/aranceles-rectorado/
 * (datos en scripts/lib/arancelesSeedData.mjs). Después el CMS es la única fuente: se editan desde el panel.
 * Spec: docs/specs/portal/ARANCELES-RECTORADO.md §5 y escenarios 13 y 14.
 *
 * Uso:
 *   node scripts/seed-aranceles-rectorado.mjs --dry-run                          # sin red
 *   CMS_EMAIL=... CMS_PASSWORD=... node scripts/seed-aranceles-rectorado.mjs     # CMS local (localhost:3002)
 *   CMS_URL=https://... node scripts/seed-aranceles-rectorado.mjs --allow-remote   # explícito; solo https
 *
 * Reglas (amenaza -> control):
 *   - Escribir en un CMS equivocado -> solo localhost salvo --allow-remote (y entonces solo https).
 *   - Credencial débil o literal -> `requireCmsPassword` (SEC-08); el correo viene de CMS_EMAIL, sin valor por
 *     defecto; nada se imprime.
 *   - Duplicar filas al re-ejecutar -> GET por clave natural (grupo + concepto exacto) antes de cada POST.
 *   - Pisar ediciones del PO -> una fila existente NUNCA se modifica; si su monto u orden difiere del sitio
 *     publicado solo se informa (el PO decide en el panel). No hay modo de actualización a propósito: son precios.
 *   - Saturar el CMS -> pausa entre escrituras.
 * Límite: no comprueba que el sitio publicado siga con los mismos montos.
 */
import { pathToFileURL } from 'node:url'
import { requireCmsPassword } from './lib/requireCmsPassword.mjs'
import { ARANCELES_OFICIALES, SEED_COMPARED_FIELDS, toCmsPayloadArancel } from './lib/arancelesSeedData.mjs'

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

/** Conteo por grupo (para el plan y el resumen). */
function countByGrupo(items) {
  const out = { multas: 0, venta: 0, educativos: 0 }
  for (const i of items) out[i.grupo] = (out[i.grupo] ?? 0) + 1
  return out
}

/** Ejecuta la siembra. `deps` permite inyectar env, fetch, log y pace (pruebas). */
export async function run({ dryRun = false, allowRemote = false, deps = {} } = {}) {
  const env = deps.env ?? process.env
  const log = deps.log ?? ((m) => console.log(m))
  const doFetch = deps.fetch ?? globalThis.fetch
  const pace = deps.pace ?? sleep
  const cmsUrl = (env.CMS_URL || 'http://localhost:3002').replace(/\/+$/, '')

  if (dryRun) {
    const porGrupo = countByGrupo(ARANCELES_OFICIALES)
    log(`[dry-run] CMS destino: ${cmsUrl} (sin llamadas de red)`)
    log(`[dry-run] aranceles: ${ARANCELES_OFICIALES.length} (active=true; solo se crean los que no existan por grupo + concepto)`)
    log(`[dry-run] por grupo: ${JSON.stringify(porGrupo)}`)
    return { dryRun: true, plan: { aranceles: ARANCELES_OFICIALES.length, porGrupo } }
  }

  if (!isLocalCmsUrl(cmsUrl)) {
    if (!allowRemote) throw new Error(`Este guion solo escribe en un CMS local; destino rechazado: ${cmsUrl}. Use --allow-remote para un destino https explícito.`)
    if (new URL(cmsUrl).protocol !== 'https:') throw new Error('Con --allow-remote el CMS debe usar https.')
  }
  const password = requireCmsPassword(env)
  const email = (env.CMS_EMAIL || '').trim()
  if (!email) throw new Error('Falta CMS_EMAIL (usuario superadmin o web-admin).')

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
  const findExisting = async (item) => {
    const qs = new URLSearchParams({
      'where[concepto][equals]': item.concepto,
      'where[grupo][equals]': item.grupo,
      limit: '2',
      depth: '0',
    })
    const r = await api('GET', `aranceles-rectorado?${qs}`)
    if (!r.ok) throw new Error(`Consulta a aranceles-rectorado falló (HTTP ${r.status}).`)
    return r.data.docs?.[0] ?? null
  }

  const counts = { creados: 0, sinCambios: 0, conDiferencias: 0, errores: 0 }
  for (const item of ARANCELES_OFICIALES) {
    const existing = await findExisting(item)
    if (existing) {
      const diff = SEED_COMPARED_FIELDS.filter((f) => Number(existing[f]) !== item[f])
      if (diff.length === 0) counts.sinCambios++
      else {
        counts.conDiferencias++
        log(`  ~ Difiere del sitio publicado (${diff.join(', ')}), se respeta el CMS: [${item.grupo}] ${item.concepto}`)
      }
      continue
    }
    const r = await api('POST', 'aranceles-rectorado', toCmsPayloadArancel(item))
    await pace(PACE_MS)
    if (r.ok) {
      counts.creados++
      log(`  + Creado [${item.grupo}] ${item.concepto}`)
    } else {
      counts.errores++
      log(`  ! Falló [${item.grupo}] ${item.concepto} (HTTP ${r.status}): ${JSON.stringify(r.data.errors ?? r.data).slice(0, 300)}`)
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
