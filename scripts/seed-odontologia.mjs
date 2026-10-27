#!/usr/bin/env node
/**
 * seed-odontologia.mjs — FAC-01
 *
 * Siembra en el CMS los datos VERIFICADOS de la Facultad de Odontología (scripts/lib/odontologiaSeedData.mjs):
 * campos de la facultad, 2 carreras de grado, 6 posgrados y 28 aranceles. Después el CMS es la única fuente.
 * Spec: docs/specs/portal/FACULTADES.md §5 y escenarios 13-15.
 *
 * Uso:
 *   node scripts/seed-odontologia.mjs --dry-run                                  # sin red
 *   CMS_EMAIL=... CMS_PASSWORD=... node scripts/seed-odontologia.mjs             # CMS local (localhost:3002)
 *   CMS_URL=https://... node scripts/seed-odontologia.mjs --allow-remote           # explícito; solo https
 *
 * Reglas (amenaza -> control):
 *   - Escribir en un CMS equivocado -> solo localhost salvo --allow-remote (y entonces solo https).
 *   - Credencial débil o literal -> `requireCmsPassword` (SEC-08); correo de CMS_EMAIL; nada se imprime.
 *   - Duplicar filas al re-ejecutar -> GET por clave natural (slug; facultad + grupo + concepto) antes de cada POST.
 *   - Pisar ediciones del PO -> en filas existentes solo se COMPLETAN campos vacíos; un valor distinto se informa.
 *   - Inventar datos -> el módulo de datos solo trae hechos con `sourceUrl` (lo comprueba un test).
 *   - Saturar el CMS -> pausa entre escrituras.
 */
import { pathToFileURL } from 'node:url'
import { requireCmsPassword } from './lib/requireCmsPassword.mjs'
import { ARANCELES, CARRERAS, FACULTAD_FIELDS, FACULTAD_SLUG } from './lib/odontologiaSeedData.mjs'

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

const isEmpty = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0)

/**
 * Parche con SOLO los campos que están vacíos en el CMS (nunca pisa una edición del PO) y lista de campos que ya
 * tienen otro valor (se informan). Comparación de arreglos por JSON sin los `id` que agrega Payload.
 */
export function emptyFieldsPatch(existing, desired) {
  const patch = {}
  const differs = []
  // Payload agrega `id` y devuelve `null` en los subcampos vacíos: no cuentan como diferencia.
  const clean = (o) => Object.fromEntries(Object.entries(o).filter(([k, x]) => k !== 'id' && x !== null && x !== undefined))
  const strip = (v) => JSON.stringify(Array.isArray(v) ? v.map((x) => (x && typeof x === 'object' ? clean(x) : x)) : v)
  for (const [k, v] of Object.entries(desired)) {
    if (isEmpty(existing?.[k])) patch[k] = v
    else if (strip(existing[k]) !== strip(v)) differs.push(k)
  }
  return { patch, differs }
}

/** Valores de la facultad sin la procedencia (lo que viaja al CMS). */
export const facultadValues = () => Object.fromEntries(Object.entries(FACULTAD_FIELDS).map(([k, f]) => [k, f.value]))

/** Carrera tal como se envía (sin `slug` de comparación ni procedencia). */
export const carreraPayload = ({ sourceUrl: _s, ...c }, facultadId) => ({ ...c, facultad: facultadId, activa: true })

/** Ejecuta la siembra. `deps` permite inyectar env, fetch, log y pace (pruebas). */
export async function run({ dryRun = false, allowRemote = false, deps = {} } = {}) {
  const env = deps.env ?? process.env
  const log = deps.log ?? ((m) => console.log(m))
  const doFetch = deps.fetch ?? globalThis.fetch
  const pace = deps.pace ?? sleep
  const cmsUrl = (env.CMS_URL || 'http://localhost:3002').replace(/\/+$/, '')
  const plan = { facultadCampos: Object.keys(FACULTAD_FIELDS).length, carreras: CARRERAS.length, aranceles: ARANCELES.length }

  if (dryRun) {
    log(`[dry-run] CMS destino: ${cmsUrl} (sin llamadas de red)`)
    log(`[dry-run] facultad ${FACULTAD_SLUG}: ${plan.facultadCampos} campos (solo se completan los vacíos)`)
    log(`[dry-run] carreras: ${plan.carreras}; aranceles: ${plan.aranceles} (solo se crean los que falten)`)
    return { dryRun: true, plan }
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
  const findOne = async (collection, where) => {
    const qs = new URLSearchParams({ limit: '2', depth: '0' })
    for (const [k, v] of Object.entries(where)) qs.set(`where[${k}][equals]`, String(v))
    const r = await api('GET', `${collection}?${qs}`)
    if (!r.ok) throw new Error(`Consulta a ${collection} falló (HTTP ${r.status}).`)
    return r.data.docs?.[0] ?? null
  }
  const counts = { creados: 0, completados: 0, sinCambios: 0, conDiferencias: 0, errores: 0 }
  const report = (label, r) => {
    if (r.ok) return true
    counts.errores++
    log(`  ! Falló ${label} (HTTP ${r.status}): ${JSON.stringify(r.data.errors ?? r.data).slice(0, 300)}`)
    return false
  }
  const reconcile = async (collection, existing, desired, label) => {
    const { patch, differs } = emptyFieldsPatch(existing, desired)
    if (differs.length) {
      counts.conDiferencias++
      log(`  ~ ${label}: ya tiene otro valor en ${differs.join(', ')} (se respeta el CMS)`)
    }
    if (Object.keys(patch).length === 0) {
      if (!differs.length) counts.sinCambios++
      return
    }
    const r = await api('PATCH', `${collection}/${existing.id}`, patch)
    await pace(PACE_MS)
    if (report(label, r)) {
      counts.completados++
      log(`  * Completado ${label}: ${Object.keys(patch).join(', ')}`)
    }
  }

  // 1. Facultad (existe desde la siembra base; si no, se crea con su nombre).
  let facultad = await findOne('facultades', { slug: FACULTAD_SLUG })
  if (!facultad) {
    const r = await api('POST', 'facultades', { nombre: 'Facultad de Odontología', slug: FACULTAD_SLUG, activa: true, ...facultadValues() })
    await pace(PACE_MS)
    if (!report('facultad', r)) throw new Error('No se pudo crear la facultad.')
    facultad = r.data.doc
    counts.creados++
    log(`  + Creada facultad ${FACULTAD_SLUG}`)
  } else {
    await reconcile('facultades', facultad, facultadValues(), `facultad ${FACULTAD_SLUG}`)
  }

  // 2. Carreras por slug.
  for (const c of CARRERAS) {
    const existing = await findOne('carreras', { slug: c.slug })
    const payload = carreraPayload(c, facultad.id)
    if (existing) {
      const { slug: _slug, activa: _a, ...fillable } = payload
      await reconcile('carreras', existing, fillable, `carrera ${c.nombre}`)
      continue
    }
    const r = await api('POST', 'carreras', payload)
    await pace(PACE_MS)
    if (report(`carrera ${c.nombre}`, r)) {
      counts.creados++
      log(`  + Creada carrera [${c.tipo}] ${c.nombre}`)
    }
  }

  // 3. Aranceles por facultad + grupo + concepto exacto. Una fila existente nunca se modifica (son precios).
  for (const a of ARANCELES) {
    const existing = await findOne('aranceles-facultad', { facultad: facultad.id, grupo: a.grupo, concepto: a.concepto })
    if (existing) {
      if (Number(existing.monto) !== a.monto) {
        counts.conDiferencias++
        log(`  ~ Difiere del sitio publicado (monto), se respeta el CMS: [${a.grupo}] ${a.concepto}`)
      } else counts.sinCambios++
      continue
    }
    const { sourceUrl: _s, ...row } = a
    const r = await api('POST', 'aranceles-facultad', { ...row, facultad: facultad.id, active: true })
    await pace(PACE_MS)
    if (report(`arancel ${a.concepto}`, r)) {
      counts.creados++
      log(`  + Creado arancel [${a.grupo}] ${a.concepto}`)
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
