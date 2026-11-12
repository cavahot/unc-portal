#!/usr/bin/env node
/**
 * seed-facultad.mjs — FAC-02 (generaliza FAC-01)
 *
 * Siembra en el CMS los datos VERIFICADOS de UNA facultad, leídos de `scripts/lib/<nombre>SeedData.mjs`.
 * Contrato del módulo de datos: exporta FACULTAD_SLUG, FACULTAD_NOMBRE (solo si hay que crear la facultad),
 * FACULTAD_FIELDS ({campo: {value, sourceUrl}}), CARRERAS y ARANCELES (cada fila con `sourceUrl`).
 * Spec: docs/specs/portal/FACULTADES.md (§5 y sección FAC-02).
 *
 * Uso (el modo predeterminado es SIMULACRO, sin red):
 *   node scripts/seed-facultad.mjs --faculty=agrarias                       # simulacro
 *   CMS_EMAIL=... CMS_PASSWORD=... node scripts/seed-facultad.mjs --faculty=agrarias --apply   # CMS local
 *   CMS_URL=https://... node scripts/seed-facultad.mjs --faculty=agrarias --apply --allow-remote # solo https
 *   node scripts/seed-facultad.mjs --data=odontologia --apply               # --data = prefijo del módulo
 *
 * Reglas (amenaza -> control):
 *   - Escribir en un CMS equivocado -> `resolveCmsTarget`: solo localhost salvo --allow-remote (y entonces solo https).
 *   - Credencial débil o literal -> `requireCmsPassword` (SEC-08); correo de `requireCmsEmail`; nada se imprime.
 *   - Cargar un archivo arbitrario -> el nombre debe cumplir /^[a-zA-Z][a-zA-Z0-9]*$/ y existir como módulo de datos.
 *   - Sembrar marcadores sin reemplazar (REEMPLAZAR, example.com) -> se rechaza ANTES de cualquier solicitud.
 *   - Duplicar filas al re-ejecutar -> GET por clave natural (slug; facultad + grupo + concepto) antes de cada POST.
 *   - Pisar ediciones del PO -> en filas existentes solo se COMPLETAN campos vacíos; un valor distinto se informa.
 *   - Saturar el CMS -> pausa entre escrituras.
 */
import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { requireCmsPassword } from './lib/requireCmsPassword.mjs'
import { isLocalCmsUrl, requireCmsEmail, resolveCmsTarget } from './lib/cmsTarget.mjs'

export { isLocalCmsUrl }

const PACE_MS = 120
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const MODULE_NAME = /^[a-zA-Z][a-zA-Z0-9]*$/
const PLACEHOLDER = /REEMPLAZAR|example\.com/i

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
export const fieldValues = (fields) => Object.fromEntries(Object.entries(fields).map(([k, f]) => [k, f.value]))

/** Carrera tal como se envía (sin la procedencia). */
export const carreraPayload = ({ sourceUrl: _s, ...c }, facultadId) => ({ ...c, facultad: facultadId, activa: true })

/**
 * Carga `scripts/lib/<name>SeedData.mjs`. Amenaza que evita: importar un archivo arbitrario por un nombre con ruta.
 * Límite: solo valida la forma del nombre y que el archivo exista; el contenido lo valida `validateSeedData`.
 */
export async function loadSeedData(name) {
  if (typeof name !== 'string' || !MODULE_NAME.test(name)) throw new Error(`Nombre de facultad inválido: ${String(name).slice(0, 40)}`)
  const file = fileURLToPath(new URL(`./lib/${name}SeedData.mjs`, import.meta.url))
  if (!existsSync(file)) throw new Error(`Facultad desconocida: no existe scripts/lib/${name}SeedData.mjs`)
  return import(pathToFileURL(file).href)
}

/**
 * Comprueba el contrato y que no haya marcadores sin reemplazar. Amenaza que evita: publicar texto de plantilla
 * o enlaces de ejemplo en el CMS real. Límite: no verifica que los hechos sean ciertos (eso es la procedencia `sourceUrl`).
 */
export function validateSeedData(data) {
  if (!data || typeof data.FACULTAD_SLUG !== 'string' || !data.FACULTAD_SLUG) throw new Error('El módulo de datos no exporta FACULTAD_SLUG.')
  for (const key of ['FACULTAD_FIELDS', 'CARRERAS', 'ARANCELES']) {
    if (data[key] === undefined || typeof data[key] !== 'object') throw new Error(`El módulo de datos no exporta ${key}.`)
  }
  const payload = JSON.stringify({ n: data.FACULTAD_NOMBRE, f: data.FACULTAD_FIELDS, c: data.CARRERAS, a: data.ARANCELES })
  const hit = payload.match(PLACEHOLDER)
  if (hit) throw new Error(`Los datos contienen un marcador sin reemplazar («${hit[0]}»); complételos antes de sembrar.`)
}

/** Ejecuta la siembra. `data` es el módulo de datos; `deps` inyecta env, fetch, log y pace (pruebas). */
export async function run({ data, dryRun = true, allowRemote = false, deps = {} } = {}) {
  validateSeedData(data)
  const { FACULTAD_SLUG, FACULTAD_NOMBRE, FACULTAD_FIELDS, CARRERAS, ARANCELES } = data
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

  resolveCmsTarget({ url: cmsUrl, allowRemote })
  const password = requireCmsPassword(env)
  const email = requireCmsEmail(env)

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
    const json = await res.json().catch(() => ({}))
    return { ok: res.ok, status: res.status, data: json }
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
    if (!FACULTAD_NOMBRE) throw new Error('La facultad no existe en el CMS y el módulo de datos no exporta FACULTAD_NOMBRE.')
    const r = await api('POST', 'facultades', { nombre: FACULTAD_NOMBRE, slug: FACULTAD_SLUG, activa: true, ...fieldValues(FACULTAD_FIELDS) })
    await pace(PACE_MS)
    if (!report('facultad', r)) throw new Error('No se pudo crear la facultad.')
    facultad = r.data.doc
    counts.creados++
    log(`  + Creada facultad ${FACULTAD_SLUG}`)
  } else {
    await reconcile('facultades', facultad, fieldValues(FACULTAD_FIELDS), `facultad ${FACULTAD_SLUG}`)
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

/** Valor de `--clave=valor` en argv, o undefined. */
const argValue = (argv, key) => argv.find((a) => a.startsWith(`--${key}=`))?.slice(key.length + 3)

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2)
  const name = argValue(argv, 'faculty') ?? argValue(argv, 'data')
  ;(async () => {
    if (!name) throw new Error('Indique --faculty=<nombre> o --data=<módulo> (por ejemplo --faculty=agrarias).')
    const data = await loadSeedData(name)
    // Seguro por omisión: sin --apply solo se muestra el plan.
    await run({ data, dryRun: !argv.includes('--apply'), allowRemote: argv.includes('--allow-remote') })
  })().catch((err) => {
    console.error(`Error: ${err.message}`)
    process.exit(1)
  })
}
