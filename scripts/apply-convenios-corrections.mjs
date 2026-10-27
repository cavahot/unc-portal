/**
 * apply-convenios-corrections.mjs — CNV-01, decisiones del PO del 2026-10-24.
 *
 * Aplica sobre un CMS ya sembrado (a) las correcciones ortográficas de scripts/lib/conveniosCorrections.mjs,
 * (b) el traslado de la UFGD 2009 de «nacional» a «internacional» y (c) el borrado del duplicado 2016 sin enlace.
 * Idempotente: una segunda ejecución no cambia nada. Spec: docs/specs/portal/CONVENIOS.md §9.
 *
 * Uso:
 *   node scripts/apply-convenios-corrections.mjs --dry-run                        # sin red
 *   CMS_EMAIL=... CMS_PASSWORD=... node scripts/apply-convenios-corrections.mjs   # CMS local (localhost:3002)
 *   CMS_URL=https://... node scripts/apply-convenios-corrections.mjs --allow-remote   # explícito; solo https
 *
 * Reglas (amenaza -> control):
 *   - Escribir en un CMS equivocado -> solo localhost salvo --allow-remote (y entonces solo https).
 *   - Credencial débil o literal -> `requireCmsPassword` (SEC-08); el correo viene de CMS_EMAIL; nada se imprime.
 *   - Pisar ediciones del PO -> la fila se busca por su clave natural ORIGINAL (verbatim) o ya corregida; un campo solo
 *     se corrige si su valor actual es exactamente el `antes` revisado. Si difiere (el PO lo editó) se omite y se informa.
 *   - Tocar lo que no corresponde -> el PATCH envía únicamente los campos corregidos (y, en el traslado, `type` y `orden`);
 *     nunca `active`, `categoria`, `nota` ni `driveUrl`.
 *   - Borrar la fila equivocada -> solo se borra el duplicado excluido si no tiene enlace y su original sigue en la BD;
 *     un 403 se reintenta una vez.
 *   - Saturar el CMS -> pausa entre escrituras.
 * Límite: no valida que la BD coincida con el dataset más allá de las claves y valores revisados.
 */
import { pathToFileURL } from 'node:url'
import { requireCmsPassword } from './lib/requireCmsPassword.mjs'
import { CAMPO_DATASET, CONVENIOS_CORRECCIONES, CONVENIOS_DUPLICADOS_EXCLUIDOS, CONVENIOS_RECLASIFICADOS } from './lib/conveniosCorrections.mjs'
import { CONVENIOS_NACIONALES_ORIGEN, CONVENIOS_TODOS } from './lib/conveniosSeedData.mjs'

const PACE_MS = 150
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const PROPS = Object.values(CAMPO_DATASET)

/** true solo para hosts de desarrollo local. */
export function isLocalCmsUrl(url) {
  try {
    const h = new URL(url).hostname
    return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1'
  } catch {
    return false
  }
}

/** Normaliza vacío: el CMS devuelve null/''/undefined para un campo sin valor. */
const norm = (v) => (v === undefined || v === null || v === '' ? null : v)

/** Plan sin red: qué filas/campos tocará. */
function planDe() {
  const filas = CONVENIOS_TODOS.filter((r) => r.original)
  const conCampos = filas.filter((r) => PROPS.some((p) => norm(r[p]) !== norm(r.original[p])))
  return {
    filasConCorrecciones: conCampos.length,
    camposCorregidos: CONVENIOS_CORRECCIONES.length,
    reclasificaciones: CONVENIOS_RECLASIFICADOS.length,
    duplicados: CONVENIOS_DUPLICADOS_EXCLUIDOS.length,
  }
}

export async function run({ dryRun = false, allowRemote = false, deps = {} } = {}) {
  const env = deps.env ?? process.env
  const log = deps.log ?? ((m) => console.log(m))
  const doFetch = deps.fetch ?? globalThis.fetch
  const pace = deps.pace ?? sleep
  const cmsUrl = (env.CMS_URL || 'http://localhost:3002').replace(/\/+$/, '')

  if (dryRun) {
    const plan = planDe()
    log(`[dry-run] CMS destino: ${cmsUrl} (sin llamadas de red)`)
    log(`[dry-run] ${plan.filasConCorrecciones} filas con ${plan.camposCorregidos} campos a corregir; ${plan.reclasificaciones} traslado a internacional; ${plan.duplicados} duplicado a borrar (si no tiene enlace)`)
    for (const c of CONVENIOS_CORRECCIONES) log(`[dry-run]   ${c.tipo} fila ${c.sourceRow} (${c.year}) ${c.campo}: «${String(c.antes).slice(0, 60)}» -> «${String(c.despues ?? '(vacío)').slice(0, 60)}»`)
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
  /** GET por clave natural exacta; con sesión institucional ve también las filas retiradas. */
  const buscar = async (k) => {
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
  /** Busca por la clave original (verbatim) y, si no está, por la ya corregida. */
  const buscarFila = async (row) => (await buscar(row.original)) ?? (await buscar(row))

  const counts = { filasCorregidas: 0, camposCorregidos: 0, movidas: 0, borradas: 0, yaCorregidas: 0, omitidasPorEdicion: 0, noEncontradas: 0, duplicadosConEnlace: 0, errores: 0 }

  for (const row of CONVENIOS_TODOS.filter((r) => r.original)) {
    const cambios = PROPS.filter((p) => norm(row[p]) !== norm(row.original[p]))
    const movida = Boolean(row.reclasificadoDesde)
    const doc = await buscarFila(row)
    if (!doc) {
      counts.noEncontradas++
      log(`  ? No encontrada (¿editada por el PO?) ${row.original.type} ${row.year}: ${row.original.title} | ${row.original.parties.slice(0, 60)}`)
      continue
    }
    const patch = {}
    let campos = 0
    for (const p of cambios) {
      const actual = norm(doc[p])
      if (actual === norm(row[p])) continue
      if (actual === norm(row.original[p])) {
        patch[p] = row[p] ?? null
        campos++
      } else {
        counts.omitidasPorEdicion++
        log(`  ~ Omitido (el PO editó ${p}) ${row.year} fila ${row.sourceRow}: valor actual distinto del revisado`)
      }
    }
    let seMueve = false
    if (movida) {
      if (doc.type === row.original.type) {
        patch.type = row.type
        patch.orden = row.orden
        seMueve = true
      }
    }
    if (Object.keys(patch).length === 0) {
      if (campos === 0 && !seMueve) counts.yaCorregidas++
      continue
    }
    const r = await api('PATCH', `convenios/${doc.id}`, patch)
    await pace(PACE_MS)
    if (!r.ok) {
      counts.errores++
      log(`  ! Falló PATCH ${row.year} fila ${row.sourceRow} (HTTP ${r.status})`)
      continue
    }
    if (campos > 0) counts.filasCorregidas++
    counts.camposCorregidos += campos
    if (seMueve) counts.movidas++
    log(`  * ${seMueve ? 'Movida a ' + row.type + ' y ' : ''}corregida (${Object.keys(patch).join(', ')}) ${row.year} fila ${row.sourceRow}`)
  }

  for (const d of CONVENIOS_DUPLICADOS_EXCLUIDOS) {
    const doc = await buscar({ ...d, type: d.tipo })
    if (!doc) {
      log(`  = Duplicado ya ausente ${d.year} fila ${d.sourceRow}`)
      continue
    }
    if (norm(doc.driveUrl)) {
      counts.duplicadosConEnlace++
      log(`  ! El duplicado ${d.year} fila ${d.sourceRow} (id ${doc.id}) tiene enlace: NO se borra; decida el PO`)
      continue
    }
    // Solo se borra si la fila que se conserva sigue en la BD (nunca se queda el convenio sin ninguna copia).
    const origen = [...CONVENIOS_NACIONALES_ORIGEN].find((r) => r.type === d.duplicaDe.tipo && r.sourceRow === d.duplicaDe.sourceRow)
    const conservada = origen ? await buscar(origen) : null
    if (!conservada) {
      counts.errores++
      log(`  ! No se borra ${d.year} fila ${d.sourceRow}: no se encontró la fila conservada (${d.duplicaDe.sourceRow})`)
      continue
    }
    log(`  - Borrando duplicado id ${doc.id}: ${d.year} ${d.title} | ${d.parties} | firma ${doc.signedMonth ?? ''} | sin enlace`)
    let r = await api('DELETE', `convenios/${doc.id}`)
    if (r.status === 403) {
      await pace(PACE_MS)
      r = await api('DELETE', `convenios/${doc.id}`)
    }
    await pace(PACE_MS)
    if (r.ok) counts.borradas++
    else {
      counts.errores++
      log(`  ! Falló el borrado (HTTP ${r.status})`)
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
