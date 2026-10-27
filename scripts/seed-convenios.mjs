/**
 * seed-convenios.mjs — CNV-01
 *
 * Siembra en el CMS los 149 convenios vigentes del sitio anterior (150 publicados, menos 1 duplicado excluido): 104 nacionales
 * (106 publicados; 1 duplicado excluido y 1 movida a internacionales por decisión del PO, 2026-10-24)
 * (https://www.unc.edu.py/convenios-nacionales/) y 45 internacionales (44 publicados + la UFGD 2009)
 * (https://www.unc.edu.py/convenios-internacionales-de-la-unc/). Datos en scripts/lib/conveniosSeedData.mjs
 * (generado). Después el CMS es la única fuente: se editan desde el panel.
 * Spec: docs/specs/portal/CONVENIOS.md §5 y escenario 10.
 *
 * Uso:
 *   node scripts/seed-convenios.mjs --dry-run                          # sin red
 *   CMS_EMAIL=... CMS_PASSWORD=... node scripts/seed-convenios.mjs     # CMS local (localhost:3002)
 *   ... node scripts/seed-convenios.mjs --fill-empty                   # completa SOLO nota/enlace vacíos
 *   CMS_URL=https://... node scripts/seed-convenios.mjs --allow-remote # explícito; solo https
 *
 * Reglas (amenaza -> control):
 *   - Escribir en un CMS equivocado -> solo localhost salvo --allow-remote (y entonces solo https).
 *   - Credencial débil o literal -> `requireCmsPassword` (SEC-08); el correo viene de CMS_EMAIL; nada se imprime.
 *   - Duplicar filas al re-ejecutar -> GET por clave natural exacta (tipo + año + denominación + participantes)
 *     antes de cada POST.
 *   - Pisar ediciones del PO -> una fila existente no se modifica. Única excepción, explícita: --fill-empty
 *     completa `nota` y `driveUrl` SOLO si en el CMS están vacíos (nunca reemplaza un valor cargado por el PO).
 *   - Saturar el CMS -> pausa entre escrituras.
 * Límite: no comprueba que los archivos de Drive sigan accesibles. Los valores del dataset ya están corregidos
 * (capa conveniosCorrections.mjs); si el PO edita una denominación/participantes en el panel, la clave cambia y una
 * nueva ejecución crearía una copia: no re-ejecutar el seed después de editar en el panel (spec §8).
 */
import { pathToFileURL } from 'node:url'
import { requireCmsPassword } from './lib/requireCmsPassword.mjs'
import { CONVENIOS_TODOS, toCmsPayloadConvenio } from './lib/conveniosSeedData.mjs'

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

/** Conteo de filas por una propiedad (para el resumen del dry-run). */
function countBy(rows, key) {
  const out = {}
  for (const r of rows) out[r[key]] = (out[r[key]] ?? 0) + 1
  return out
}

/** Campos que --fill-empty puede completar cuando están vacíos en el CMS. */
export const FILLABLE_FIELDS = ['nota', 'driveUrl']

const isEmpty = (v) => v === undefined || v === null || v === ''

/** Ejecuta la siembra. `deps` permite inyectar env, fetch, log y pace (pruebas). */
export async function run({ dryRun = false, allowRemote = false, fillEmpty = false, deps = {} } = {}) {
  const env = deps.env ?? process.env
  const log = deps.log ?? ((m) => console.log(m))
  const doFetch = deps.fetch ?? globalThis.fetch
  const pace = deps.pace ?? sleep
  const cmsUrl = (env.CMS_URL || 'http://localhost:3002').replace(/\/+$/, '')

  if (dryRun) {
    const plan = {
      convenios: CONVENIOS_TODOS.length,
      perType: countBy(CONVENIOS_TODOS, 'type'),
      perCategoria: countBy(CONVENIOS_TODOS, 'categoria'),
      conEnlace: CONVENIOS_TODOS.filter((r) => r.driveFileId).length,
    }
    log(`[dry-run] CMS destino: ${cmsUrl} (sin llamadas de red)`)
    log(`[dry-run] convenios: ${plan.convenios} (active=true; solo se crean los que no existan por clave natural)`)
    log(`[dry-run] por tipo: ${JSON.stringify(plan.perType)} | por categoría: ${JSON.stringify(plan.perCategoria)} | con enlace: ${plan.conEnlace}`)
    return { dryRun: true, plan }
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
  /** GET por clave natural exacta (tipo + año + denominación + participantes). */
  const buscarPorClave = async (k) => {
    const q = new URLSearchParams()
    q.set('where[type][equals]', k.type)
    q.set('where[year][equals]', String(k.year))
    q.set('where[title][equals]', k.title)
    q.set('where[parties][equals]', k.parties)
    q.set('limit', '2')
    q.set('depth', '0')
    const r = await api('GET', `convenios?${q.toString()}`)
    if (!r.ok) throw new Error(`Consulta a convenios falló (HTTP ${r.status}).`)
    return r.data.docs?.[0] ?? null
  }
  /**
   * Busca la fila por su clave corregida y, si no está, por la clave ORIGINAL (verbatim) de la fila: una BD sembrada antes
   * de las correcciones del PO (2026-10-24) no debe recibir una copia corregida. La corrección de la BD la hace
   * scripts/apply-convenios-corrections.mjs, no este guion. Con sesión institucional ve también las filas retiradas.
   */
  const findExisting = async (row) => {
    const porClave = await buscarPorClave(row)
    if (porClave || !row.original) return porClave
    return buscarPorClave(row.original)
  }

  const counts = { creados: 0, existentes: 0, errores: 0 }
  if (fillEmpty) counts.completados = 0
  for (const row of CONVENIOS_TODOS) {
    const existing = await findExisting(row)
    if (existing) {
      counts.existentes++
      if (!fillEmpty) continue
      const wanted = toCmsPayloadConvenio(row)
      const patch = Object.fromEntries(FILLABLE_FIELDS.filter((f) => !isEmpty(wanted[f]) && isEmpty(existing[f])).map((f) => [f, wanted[f]]))
      if (Object.keys(patch).length === 0) continue
      const r = await api('PATCH', `convenios/${existing.id}`, patch)
      await pace(PACE_MS)
      if (r.ok) {
        counts.completados++
        log(`  * Completado (${Object.keys(patch).join(', ')}) ${row.year}: ${row.title}`)
      } else {
        counts.errores++
        log(`  ! Falló completar ${row.year} ${row.title} (HTTP ${r.status})`)
      }
      continue
    }
    const r = await api('POST', 'convenios', toCmsPayloadConvenio(row))
    await pace(PACE_MS)
    if (r.ok) {
      counts.creados++
      log(`  + Creado [${row.type}/${row.categoria}] ${row.year}: ${row.title}`)
    } else {
      counts.errores++
      log(`  ! Falló ${row.year} ${row.title} (HTTP ${r.status}): ${JSON.stringify(r.data.errors ?? r.data).slice(0, 300)}`)
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
    fillEmpty: process.argv.includes('--fill-empty'),
  }).catch((err) => {
    console.error(`Error: ${err.message}`)
    process.exit(1)
  })
}
