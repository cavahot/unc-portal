/**
 * update-glosario-guarani.mjs — GLO-GN-01
 *
 * Actualiza el glosario guaraní del CMS SOLO con fuentes oficiales del registro
 * (scripts/lib/glosarioSources.mjs). Spec: docs/specs/i18n/GLOSARIO-GUARANI.md §4 y escenarios 9–12.
 *
 * Uso:
 *   node scripts/update-glosario-guarani.mjs --list-sources
 *   node scripts/update-glosario-guarani.mjs [--source <id>]                     # dry-run (por defecto)
 *   CMS_EMAIL=... CMS_PASSWORD=... node scripts/update-glosario-guarani.mjs --source <id> --apply
 *   ... --file <copia descargada a mano de un recurso del registro>                # sitio oficial caído
 *   ... --report-dir <carpeta fuera del repositorio>                               # informe JSON
 *   CMS_URL=https://... ... --apply --allow-remote                                 # explícito; solo https
 *
 * Reglas: sin --apply no escribe nada; descarga solo de hosts oficiales con la política de glosarioFetch.mjs;
 * las fusiones siguen planMerge (nunca toca filas revisadas ni del PO); los corpus de investigación no se
 * importan (no figuran en el registro). Si una fuente no responde, se informa «inalcanzable» y NO se prueban
 * otros sitios.
 */
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { MAX_BYTES, makePoliteFetch } from './lib/glosarioFetch.mjs'
import { GLOSARIO_SOURCES, isOfficialUrl, loadSources } from './lib/glosarioSources.mjs'
import { parseSplCsv, planMerge } from './lib/glosarioUpdate.mjs'
import { GLOSARIO_GN_SEED } from './lib/glosarioGnSeedData.mjs'
import { openCmsSession } from './seed-glosario-guarani.mjs'

const COLLECTION = 'glosario-guarani'
const PACE_MS = 150
const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '..', '..')
const sleepReal = (ms) => new Promise((r) => setTimeout(r, ms))

/** Lee las opciones de la línea de comandos (sin dependencias). */
export function parseArgs(argv) {
  const val = (name) => {
    const i = argv.indexOf(name)
    return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : undefined
  }
  return {
    apply: argv.includes('--apply'),
    allowRemote: argv.includes('--allow-remote'),
    listSources: argv.includes('--list-sources'),
    source: val('--source'),
    file: val('--file'),
    reportDir: val('--report-dir') ?? join(tmpdir(), 'unc-portal-glosario'),
  }
}

/**
 * Comprueba que el informe quede FUERA del repositorio.
 * Amenaza: versionar por error un informe con miles de filas (o notas internas) en git.
 */
function assertOutsideRepo(dir) {
  const rel = relative(REPO_ROOT, resolve(dir))
  if (rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))) {
    throw new Error(`El informe no se escribe dentro del repositorio (${dir}); use --report-dir fuera de git.`)
  }
}

/**
 * Obtiene el texto de la fuente: archivo local declarado, API CKAN o URL de recurso de respaldo.
 * Devuelve `{ text, recursos, origenDatos, resourceUrl, intentos }` o `{ error, intentos }`.
 */
async function obtainSourceText(source, { file, get, log }) {
  const intentos = []
  if (file) {
    const size = statSync(file).size
    if (size > MAX_BYTES) throw new Error(`El archivo supera el tope de ${MAX_BYTES} bytes.`)
    const resourceUrl = source.fallbackResourceUrls?.[0] ?? source.url
    return { text: readFileSync(file, 'utf8'), recursos: [{ url: resourceUrl, archivoLocal: file, bytes: size }], origenDatos: 'archivo-local', resourceUrl, intentos }
  }
  let candidates = []
  if (source.kind === 'ckan' && source.apiUrl) {
    try {
      const r = await get(source.apiUrl, { minIntervalMs: source.minIntervalMs, accept: 'application/json' })
      const pkg = JSON.parse(r.text)
      candidates = (pkg?.result?.resources ?? [])
        .filter((res) => /^(csv|json)$/i.test(String(res.format ?? '')) || /\.csv(\?|$)/i.test(String(res.url ?? '')))
        .map((res) => res.url)
        .filter(isOfficialUrl)
      intentos.push({ url: source.apiUrl, ok: true, recursos: candidates.length })
    } catch (err) {
      intentos.push({ url: source.apiUrl, ok: false, error: err.message })
      log(`  · API CKAN no disponible: ${err.message}`)
    }
  }
  if (candidates.length === 0) candidates = [...(source.fallbackResourceUrls ?? [])]
  for (const url of candidates) {
    try {
      const r = await get(url, { minIntervalMs: source.minIntervalMs })
      intentos.push({ url, ok: true, bytes: r.bytes })
      return { text: r.text, recursos: [{ url: r.url, bytes: r.bytes, contentType: r.contentType }], origenDatos: 'descarga', resourceUrl: r.url, intentos }
    } catch (err) {
      intentos.push({ url, ok: false, error: err.message })
      log(`  · Recurso no disponible: ${err.message}`)
    }
  }
  return { error: 'inalcanzable', intentos }
}

/** Lee todas las filas del glosario del CMS (paginado, con sesión institucional). */
async function readAllRows(api) {
  const rows = []
  for (let page = 1; page < 1000; page++) {
    const r = await api('GET', `${COLLECTION}?limit=500&page=${page}&depth=0`)
    if (!r.ok) throw new Error(`Lectura de ${COLLECTION} falló (HTTP ${r.status}).`)
    rows.push(...(r.data.docs ?? []))
    if (!r.data.hasNextPage) break
  }
  return rows
}

/** Ejecuta el actualizador. `deps`: env, fetch, log, sleep, pace, now, existing (filas simuladas). */
export async function run({ argv = [], deps = {} } = {}) {
  const env = deps.env ?? process.env
  const log = deps.log ?? ((m) => console.log(m))
  const doFetch = deps.fetch ?? globalThis.fetch
  const pace = deps.pace ?? sleepReal
  const opts = parseArgs(argv)
  const sources = loadSources(GLOSARIO_SOURCES)

  if (opts.listSources) {
    for (const s of sources) log(`${s.id}\t${s.kind}\t${s.url}\t${s.licencia}`)
    return { fuentes: sources.map((s) => ({ id: s.id })) }
  }
  assertOutsideRepo(opts.reportDir)
  const selected = opts.source ? sources.filter((s) => s.id === opts.source) : sources
  if (selected.length === 0) throw new Error(`Fuente desconocida: ${opts.source}. Vea --list-sources.`)
  if (opts.file && !opts.source) throw new Error('--file requiere --source <id> del registro.')

  const fecha = new Date(deps.now ? deps.now() : Date.now()).toISOString().slice(0, 10)
  const get = makePoliteFetch({ fetch: doFetch, sleep: deps.sleep, env })
  const modo = opts.apply ? 'apply' : 'dry-run'
  log(`Actualizador del glosario guaraní — modo ${modo}`)

  let session = null
  const getSession = async () => (session ??= await openCmsSession({ allowRemote: opts.allowRemote, env, doFetch, log }))
  let existingCache = deps.existing ?? null
  const getExisting = async () => {
    if (existingCache) return existingCache
    if (opts.apply || (env.CMS_EMAIL && env.CMS_PASSWORD)) {
      existingCache = await readAllRows((await getSession()).api)
      log(`  · ${existingCache.length} filas leídas del CMS`)
    } else {
      existingCache = GLOSARIO_GN_SEED
      log('  · Sin credenciales: el diff se calcula contra el dataset de la siembra, no contra el CMS')
    }
    return existingCache
  }

  const report = { fecha, modo, generado: new Date().toISOString(), fuentes: [] }
  for (const source of selected) {
    log(`\n» ${source.id} (${source.url})`)
    if (source.kind === 'page' || !source.parser) {
      report.fuentes.push({ id: source.id, estado: 'manual', motivo: `Formato ${source.formato}: no se analiza sin dependencias nuevas; carga manual en el panel.` })
      log(`  = manual (${source.formato})`)
      continue
    }
    if (opts.file && source.id !== opts.source) continue
    const got = await obtainSourceText(source, { file: opts.file, get, log })
    if (got.error) {
      report.fuentes.push({ id: source.id, estado: got.error, intentos: got.intentos })
      log(`  ! ${got.error}: no se escribe nada y no se consultan otros sitios`)
      continue
    }
    let incoming
    try {
      incoming = parseSplCsv(got.text)
    } catch (err) {
      report.fuentes.push({ id: source.id, estado: 'manual', motivo: err.message, recursos: got.recursos, intentos: got.intentos })
      log(`  ! manual: ${err.message}`)
      continue
    }
    const existing = await getExisting()
    const plan = planMerge({ existing, incoming, source, resourceUrl: got.resourceUrl, fecha })
    log(`  · filas en la fuente: ${incoming.length} · plan: ${JSON.stringify(plan.counts)}`)
    const escritura = { ok: 0, errores: 0 }
    if (opts.apply) {
      const { api } = await getSession()
      for (const a of plan.actions) {
        if (!a.data) continue
        const r = a.type === 'actualizar' ? await api('PATCH', `${COLLECTION}/${a.id}`, a.data) : await api('POST', COLLECTION, a.data)
        await pace(PACE_MS)
        if (r.ok) escritura.ok++
        else {
          escritura.errores++
          a.error = `HTTP ${r.status}: ${JSON.stringify(r.data?.errors ?? r.data).slice(0, 200)}`
        }
      }
      log(`  · escrituras: ${JSON.stringify(escritura)}`)
    }
    report.fuentes.push({
      id: source.id,
      estado: 'ok',
      origenDatos: got.origenDatos,
      recursos: got.recursos.map((r) => ({ ...r, filas: incoming.length })),
      intentos: got.intentos,
      counts: plan.counts,
      escritura: opts.apply ? escritura : undefined,
      acciones: plan.actions,
    })
  }

  mkdirSync(opts.reportDir, { recursive: true })
  const stamp = new Date().toISOString().slice(11, 19).replace(/:/g, '')
  const out = join(opts.reportDir, `update-report-${fecha}T${stamp}-${modo}.json`)
  writeFileSync(out, JSON.stringify(report, null, 2), 'utf8')
  log(`\nInforme: ${out}`)
  return report
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run({ argv: process.argv.slice(2) }).catch((err) => {
    console.error(`Error: ${err.message}`)
    process.exit(1)
  })
}
