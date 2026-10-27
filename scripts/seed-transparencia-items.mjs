/**
 * seed-transparencia-items.mjs — TRANS-02
 *
 * Carga idempotente de los 28 ítems oficiales de transparencia en la colección `transparencia-items`:
 * 11 categorías de la Ley 5189/2014 y 17 ítems del Art. 8° de la Ley 5282/2014. Es la ÚNICA lista oficial en el
 * repositorio (antes estaba duplicada en tres archivos); desde TRANS-02 el CMS es la fuente y esta lista solo
 * siembra el estado inicial. NO carga documentos (RDD-TRANS-01: el sitio publicado no tiene ninguno).
 * Spec: docs/specs/portal/TRANSPARENCIA-ITEMS.md §2.5 y escenario 16.
 *
 * Uso:
 *   node scripts/seed-transparencia-items.mjs                      # dry-run (por defecto): sin red
 *   CMS_EMAIL=... CMS_PASSWORD=... node scripts/seed-transparencia-items.mjs --apply
 *   ... --apply --allow-remote   # CMS_URL=https://... explícito; solo https
 *
 * Reglas (amenaza -> control):
 *   - Pisar ediciones del PO (renombres, orden) al re-ejecutar -> se busca por la clave natural `ley|codigo`; si
 *     existe (publicado o no) se OMITE y nunca se modifica.
 *   - Escribir en un CMS equivocado -> solo localhost salvo --allow-remote (y entonces solo https).
 *   - Credencial débil o literal -> `requireCmsPassword` (SEC-08); nada se imprime.
 * Límite: no renombra ni borra ítems; para cambiar un título use el panel del CMS.
 */
import { pathToFileURL } from 'node:url'
import { requireCmsPassword } from './lib/requireCmsPassword.mjs'

const PACE_MS = 120
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Ítems oficiales por ley, en orden de la ley; los títulos son las denominaciones legales en español. */
export const TRANSPARENCIA_ITEMS = {
  5189: [
    { codigo: 'organigrama', titulo: 'Organigrama' },
    { codigo: 'direccion-telefono', titulo: 'Dirección y Teléfono de la Entidad y Dependencias' },
    { codigo: 'nomina-personal', titulo: 'Nómina del Personal' },
    { codigo: 'presupuesto-ingresos-gastos', titulo: 'Presupuesto de Ingresos – Gastos' },
    { codigo: 'anexo-personal', titulo: 'Anexo del Personal' },
    { codigo: 'ejecucion-presupuestaria', titulo: 'Ejecución Presupuestaria' },
    { codigo: 'registro-viaticos', titulo: 'Registro Mensual de Viáticos e Informe de Actividades' },
    { codigo: 'bienes-patrimoniales', titulo: 'Listado de Bienes Patrimoniales' },
    { codigo: 'funcionarios-comisionados', titulo: 'Listado de Funcionarios Comisionados de Otras Instituciones' },
    { codigo: 'otras-informaciones', titulo: 'Otras Informaciones' },
    { codigo: 'cumplimiento-art7', titulo: 'Cumplimiento Art. 7°' },
  ],
  5282: [
    { codigo: 'item-1', titulo: 'Su estructura orgánica' },
    { codigo: 'item-2', titulo: 'Facultades, deberes, funciones y/o atribuciones de sus órganos y dependencias' },
    { codigo: 'item-3', titulo: 'Marco normativo que rija su funcionamiento' },
    { codigo: 'item-4', titulo: 'Descripción general de cómo funciona y proceso de toma de decisiones' },
    { codigo: 'item-5', titulo: 'Listado actualizado de personas que cumplan función pública o sean funcionarios públicos' },
    { codigo: 'item-6', titulo: 'Descripción de la política institucional y de los planes de acción' },
    { codigo: 'item-7', titulo: 'Descripción de los programas institucionales en ejecución' },
    { codigo: 'item-8', titulo: 'Informes de auditoría' },
    { codigo: 'item-9', titulo: 'Informes de viajes oficiales dentro del territorio o al extranjero' },
    { codigo: 'item-10', titulo: 'Convenios y contratos celebrados' },
    { codigo: 'item-11', titulo: 'Cartas oficiales' },
    { codigo: 'item-12', titulo: 'Informes finales de consultorías' },
    { codigo: 'item-13', titulo: 'Cuadros de resultados' },
    { codigo: 'item-14', titulo: 'Lista de poderes vigentes otorgados a abogados' },
    { codigo: 'item-15', titulo: 'Sistema de mantenimiento, clasificación e índice de documentos existentes' },
    { codigo: 'item-16', titulo: 'Procedimientos para que personas interesadas puedan acceder a documentos' },
    { codigo: 'item-17', titulo: 'Mecanismos de participación ciudadana' },
  ],
}


const clean = (v) =>
  typeof v === 'string'
    ? v
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
    : ''

/** Clave natural de un ítem: `ley|codigo`. DEBE coincidir con `buildItemKey` del CMS (lo prueba un test). */
export function buildItemKey(ley, codigo) {
  return [clean(String(ley)), clean(codigo)].join('|')
}

/** Lista plana de ítems con su `orden` (posición × 10, para poder intercalar ítems nuevos desde el panel). */
export function plannedItems() {
  return Object.entries(TRANSPARENCIA_ITEMS).flatMap(([ley, items]) =>
    items.map((it, i) => ({ ley, codigo: it.codigo, titulo: it.titulo, orden: (i + 1) * 10, active: true })),
  )
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
export async function run({ apply = false, allowRemote = false, deps = {} } = {}) {
  const env = deps.env ?? process.env
  const log = deps.log ?? ((m) => console.log(m))
  const doFetch = deps.fetch ?? globalThis.fetch
  const pace = deps.pace ?? sleep
  const cmsUrl = (env.CMS_URL || 'http://localhost:3002').replace(/\/+$/, '')
  const items = plannedItems()

  if (!apply) {
    log(`[dry-run] CMS destino: ${cmsUrl} (sin llamadas de red). Use --apply para escribir.`)
    log(`[dry-run] ítems oficiales: ${items.length} (5189: ${TRANSPARENCIA_ITEMS['5189'].length}, 5282: ${TRANSPARENCIA_ITEMS['5282'].length})`)
    return { dryRun: true, counts: { total: items.length } }
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

  const counts = { creados: 0, omitidos: 0, errores: 0 }
  for (const item of items) {
    const label = `Ley ${item.ley} ${item.codigo}`
    const q = new URLSearchParams()
    q.set('where[naturalKey][equals]', buildItemKey(item.ley, item.codigo))
    q.set('limit', '1')
    q.set('depth', '0')
    const found = await api('GET', `transparencia-items?${q.toString()}`)
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
    const r = await api('POST', 'transparencia-items', item)
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
  if (args.includes('--apply') && args.includes('--dry-run')) {
    console.error('Error: --apply y --dry-run se excluyen.')
    process.exit(1)
  }
  run({ apply: args.includes('--apply'), allowRemote: args.includes('--allow-remote') }).catch((err) => {
    console.error(`Error: ${err.message}`)
    process.exit(1)
  })
}
