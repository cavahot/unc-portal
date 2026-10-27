/**
 * seed-transparencia-leyes.mjs — TRANS-01
 *
 * Cargador idempotente de documentos de las colecciones `ley5189` (11 categorías) y `ley5282` (17 ítems del Art. 8°)
 * desde un CSV o JSON preparado por la institución. Sustituye a seed-ley5189.mjs y seed-ley5282.mjs, que insertaban
 * el enlace de relleno `.../folders/REEMPLAZAR` (RDD-TRANS-03). NO trae datos propios: el sitio publicado no tiene
 * documentos (RDD-TRANS-01), así que sin archivo no hay nada que cargar.
 * Spec: docs/specs/portal/TRANSPARENCIA-LEYES.md §2.3 y escenarios 11-12. Plantilla: plantilla-transparencia-leyes.csv.
 *
 * Uso:
 *   node scripts/seed-transparencia-leyes.mjs --file datos.csv                  # dry-run (por defecto): sin red
 *   CMS_EMAIL=... CMS_PASSWORD=... node scripts/seed-transparencia-leyes.mjs --file datos.csv --apply
 *   ... --apply --allow-remote   # CMS_URL=https://... explícito; solo https
 *
 * Columnas: ley (5189|5282), categoria (código o título del ítem en `transparencia-items`), periodo, descripcion (opcional), url, orden (opcional).
 *
 * Reglas (amenaza -> control):
 *   - Publicar enlaces de relleno -> se rechaza toda fila cuya URL, período o descripción contenga REEMPLAZAR o
 *     EJEMPLO (la plantilla trae filas EJEMPLO a propósito: nunca se cargan).
 *   - Enlaces fuera de lugar -> https y host exacto de la misma allowlist del CMS y del portal.
 *   - Escribir en un CMS equivocado -> solo localhost salvo --allow-remote (y entonces solo https).
 *   - Credencial débil o literal -> `requireCmsPassword` (SEC-08); nada se imprime.
 *   - Duplicar al re-ejecutar o pisar ediciones del PO -> se busca por la clave natural; si existe (activa o
 *     retirada) se omite y NUNCA se modifica.
 *   - Ítem inexistente -> `categoria` se resuelve contra los ítems del CMS (slug o título normalizado); si no está, error de fila.
 *   - Saturar el CMS -> pausa entre escrituras.
 * Límite: no comprueba que el archivo de Drive exista ni esté compartido públicamente.
 */
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { parseCsvRecords } from './lib/csvParse.mjs'
import { requireCmsPassword } from './lib/requireCmsPassword.mjs'
import { TRANSPARENCIA_ITEMS } from './seed-transparencia-items.mjs'

const PACE_MS = 120
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Catálogo oficial inicial (TRANS-02): derivado de la lista de `seed-transparencia-items.mjs`. Sirve para el dry-run
 * (sin red). En `--apply` el catálogo sale de la colección `transparencia-items` del CMS, que puede tener ítems
 * renombrados o agregados por el PO.
 */
export const LEY_CATEGORIAS = Object.fromEntries(
  Object.entries(TRANSPARENCIA_ITEMS).map(([ley, items]) => [ley, items.map((i) => ({ value: i.codigo, label: i.titulo, id: undefined }))]),
)

/** Hosts permitidos (igual a la allowlist del CMS y del portal). */
export const ALLOWED_HOSTS = ['drive.google.com', 'docs.google.com', 'www.unc.edu.py', 'unc.edu.py']

/** Marcas de relleno: en URL se detectan sin importar mayúsculas; en período y descripción solo en mayúsculas (así no choca con la palabra «ejemplo»). */
const PLACEHOLDER_URL = /reemplazar|ejemplo/i
const PLACEHOLDER_TEXT = /REEMPLAZAR|EJEMPLO/

/** Minúsculas, sin acentos y con espacios colapsados (misma normalización que la clave natural del CMS). */
const clean = (v) =>
  typeof v === 'string'
    ? v
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
    : ''

/** Clave natural: categoría | período | descripción. DEBE coincidir con `buildNaturalKey` del CMS (lo prueba un test). */
export function buildNaturalKey(doc) {
  return [clean(doc.category), clean(doc.period), clean(doc.description)].join('|')
}

/** true si es https bien formado, sin credenciales y de un host exacto de la allowlist. */
function isAllowedUrl(url) {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && !u.username && !u.password && ALLOWED_HOSTS.includes(u.hostname.toLowerCase())
  } catch {
    return false
  }
}

/** Valida y normaliza una fila (`n` = número de línea del archivo, con la cabecera como línea 1). */
export function validateRow(rec, n, catalogo = LEY_CATEGORIAS) {
  const fail = (msg) => ({ ok: false, error: `Fila ${n}: ${msg}` })
  const ley = String(rec.ley ?? '').trim()
  const categorias = catalogo[ley]
  if (!categorias) return fail(`ley «${ley}» desconocida (use 5189 o 5282).`)
  const raw = String(rec.categoria ?? '').trim()
  const cat = categorias.find((c) => c.value === raw) ?? categorias.find((c) => clean(c.label) === clean(raw))
  if (!cat) return fail(`categoría «${raw}» no pertenece a la ley ${ley}.`)
  const period = String(rec.periodo ?? '').trim()
  if (!period) return fail('el período está vacío.')
  const description = String(rec.descripcion ?? '').trim()
  const url = String(rec.url ?? '').trim()
  if (!url) return fail('la URL está vacía.')
  if (PLACEHOLDER_URL.test(url) || [period, description].some((v) => PLACEHOLDER_TEXT.test(v))) return fail('contiene REEMPLAZAR o EJEMPLO (fila de relleno o de la plantilla): no se carga.')
  if (!isAllowedUrl(url)) return fail(`URL no permitida (use https en ${ALLOWED_HOSTS.join(', ')}).`)
  const ordenTxt = String(rec.orden ?? '').trim()
  const order = ordenTxt === '' ? 0 : Number(ordenTxt)
  if (!Number.isFinite(order)) return fail(`orden «${ordenTxt}» no es un número.`)
  return { ok: true, row: { collection: `ley${ley}`, category: cat.value, itemId: cat.id, period, description, url, order } }
}

/** Lee el archivo: JSON (arreglo de objetos) si termina en .json; si no, CSV con cabecera. */
export function parseRows(text, fileName = '') {
  if (/\.json$/i.test(fileName)) {
    const data = JSON.parse(text)
    if (!Array.isArray(data)) throw new Error('El JSON debe ser un arreglo de objetos.')
    return data
  }
  return parseCsvRecords(text)
}

/** true solo para hosts de desarrollo local. */
export function isLocalCmsUrl(url) {
  try {
    const h = new URL(url).hostname
    return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1'
  } catch {
    return false
  }
}

/** Ejecuta la carga. `deps` permite inyectar env, fetch, log y pace (pruebas). Por defecto es dry-run. */
export async function run({ text, fileName = '', apply = false, allowRemote = false, deps = {} } = {}) {
  const env = deps.env ?? process.env
  const log = deps.log ?? ((m) => console.log(m))
  const doFetch = deps.fetch ?? globalThis.fetch
  const pace = deps.pace ?? sleep
  const cmsUrl = (env.CMS_URL || 'http://localhost:3002').replace(/\/+$/, '')

  const records = parseRows(text, fileName)
  const validate = (catalogo) => {
    const valid = []
    let errores = 0
    records.forEach((rec, i) => {
      const r = validateRow(rec, i + 2, catalogo)
      if (r.ok) valid.push(r.row)
      else {
        errores++
        log(`  ! ${r.error}`)
      }
    })
    return { valid, errores }
  }

  if (!apply) {
    const { valid, errores } = validate(LEY_CATEGORIAS)
    log(`[dry-run] CMS destino: ${cmsUrl} (sin llamadas de red; ítems según la lista oficial). Use --apply para escribir.`)
    log(`[dry-run] filas válidas: ${valid.length} | con error: ${errores}`)
    return { dryRun: true, counts: { validas: valid.length, errores } }
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

  // Catálogo real: los ítems activos o no del CMS (el PO pudo renombrar o agregar). Sin él no se puede resolver `item`.
  const itemsRes = await api('GET', 'transparencia-items?limit=500&depth=0&sort=orden')
  if (!itemsRes.ok || !Array.isArray(itemsRes.data.docs)) throw new Error(`No se pudieron leer los ítems del CMS (HTTP ${itemsRes.status}). Ejecute antes seed-transparencia-items.mjs.`)
  const catalogo = { 5189: [], 5282: [] }
  for (const it of itemsRes.data.docs) catalogo[String(it.ley)]?.push({ value: it.codigo, label: it.titulo, id: it.id })
  const { valid, errores } = validate(catalogo)

  const counts = { creados: 0, omitidos: 0, errores }
  for (const row of valid) {
    const label = `${row.collection} ${row.category} ${row.period}${row.description ? ` (${row.description})` : ''}`
    const q = new URLSearchParams()
    q.set('where[naturalKey][equals]', buildNaturalKey(row))
    q.set('limit', '1')
    q.set('depth', '0')
    const found = await api('GET', `${row.collection}?${q.toString()}`)
    if (!found.ok) {
      counts.errores++
      log(`  ! Consulta falló para ${label} (HTTP ${found.status}).`)
      continue
    }
    if (found.data.docs?.[0]) {
      counts.omitidos++
      log(`  = Omitido (ya existe) ${label}`)
      continue
    }
    const body = { item: row.itemId, period: row.period, driveUrl: row.url, order: row.order, active: true }
    if (row.description) body.description = row.description
    const r = await api('POST', row.collection, body)
    await pace(PACE_MS)
    if (r.ok) {
      counts.creados++
      log(`  + Creado ${label}`)
    } else {
      counts.errores++
      log(`  ! Falló ${label} (HTTP ${r.status}): ${JSON.stringify(r.data.errors ?? r.data).slice(0, 300)}`)
    }
  }
  log('')
  log(`Resumen: ${JSON.stringify(counts)}`)
  return { dryRun: false, counts }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2)
  const i = args.indexOf('--file')
  const file = i >= 0 ? args[i + 1] : undefined
  if (!file) {
    console.error('Error: falta --file <archivo.csv|json>. Plantilla: docs/specs/portal/plantilla-transparencia-leyes.csv')
    process.exit(1)
  }
  if (args.includes('--apply') && args.includes('--dry-run')) {
    console.error('Error: --apply y --dry-run se excluyen.')
    process.exit(1)
  }
  run({ text: readFileSync(file, 'utf8'), fileName: file, apply: args.includes('--apply'), allowRemote: args.includes('--allow-remote') }).catch((err) => {
    console.error(`Error: ${err.message}`)
    process.exit(1)
  })
}
