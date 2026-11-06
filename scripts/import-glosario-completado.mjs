/**
 * import-glosario-completado.mjs — GLO-GN-02
 *
 * Carga al glosario guaraní del CMS las propuestas del documento «UNC-Glosario-Guarani-completado.md»
 * (secciones 1 y 2). La sección 3 (frases largas) NO se carga: va a messages/gn y requiere revisión.
 *
 * Uso:
 *   CMS_EMAIL=... CMS_PASSWORD=... node scripts/import-glosario-completado.mjs --file <ruta.md>           # dry-run
 *   CMS_EMAIL=... CMS_PASSWORD=... node scripts/import-glosario-completado.mjs --file <ruta.md> --apply
 *   CMS_URL=https://... ... --apply --allow-remote                                                        # explícito; solo https
 *
 * Reglas (amenaza -> control):
 *   - Publicar sin revisión -> todo entra «pendiente», no oficial, no revisado, confianza C, sin URL oficial;
 *     el portal solo usa glosas aprobadas por un superadmin (hook enforceGuaraniApproval).
 *   - Pisar trabajo humano -> solo se completan filas SIN traducción y no revisadas; nada se sobrescribe.
 *   - Duplicar al re-ejecutar -> clave terminoEs + fuente (más el índice único de la colección).
 *   - Escribir en un CMS equivocado -> mismo control que la siembra (solo localhost salvo --allow-remote + https).
 *   - Sin --apply no se escribe nada (la lectura de filas existentes sí usa la sesión).
 */
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { parseCompletado, planCompletado } from './lib/glosarioCompletado.mjs'
import { openCmsSession } from './seed-glosario-guarani.mjs'

const COLLECTION = 'glosario-guarani'
const PACE_MS = 120
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Lee todas las filas del glosario (paginado) para decidir qué crear o completar. */
async function loadExisting(api) {
  const docs = []
  for (let page = 1; ; page++) {
    const r = await api('GET', `${COLLECTION}?limit=200&depth=0&page=${page}`)
    if (!r.ok) throw new Error(`Consulta a ${COLLECTION} falló (HTTP ${r.status}).`)
    docs.push(...(r.data.docs ?? []))
    if (!r.data.hasNextPage) break
  }
  return docs
}

export async function run({ file, apply = false, allowRemote = false, deps = {} }) {
  const env = deps.env ?? process.env
  const log = deps.log ?? ((m) => console.log(m))
  const doFetch = deps.fetch ?? globalThis.fetch
  const pace = deps.pace ?? sleep

  const parsed = parseCompletado(readFileSync(file, 'utf8'))
  log(`Documento: sección 1 = ${parsed.sec1.length}, sección 2 = ${parsed.sec2.length}, sección 3 = ${parsed.sec3.length} (no se carga), sección 4 = ${parsed.sec4.length} (no se toca)`)

  const { api } = await openCmsSession({ allowRemote, env, doFetch, log })
  const existing = await loadExisting(api)
  const { actions, skipped } = planCompletado({ parsed, existing })
  const count = (op) => actions.filter((a) => a.op === op).length
  log(`Plan: crear ${count('create')} · completar ${count('update')} · omitir ${skipped.length} (filas actuales: ${existing.length})`)
  for (const s of skipped) log(`  - omitida: ${s.terminoEs} (${s.reason})`)

  if (!apply) {
    log('[dry-run] no se escribió nada; agregue --apply para cargar.')
    return { applied: false, actions, skipped }
  }

  const counts = { creadas: 0, completadas: 0, errores: 0 }
  for (const a of actions) {
    const r = a.op === 'create' ? await api('POST', COLLECTION, a.data) : await api('PATCH', `${COLLECTION}/${a.id}`, a.data)
    await pace(PACE_MS)
    if (r.ok) counts[a.op === 'create' ? 'creadas' : 'completadas']++
    else {
      counts.errores++
      log(`  ! Falló ${a.data.terminoEs} (HTTP ${r.status}): ${JSON.stringify(r.data.errors ?? r.data).slice(0, 300)}`)
    }
  }
  log(`Resumen: ${JSON.stringify(counts)}`)
  return { applied: true, counts, actions, skipped }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2)
  const fi = argv.indexOf('--file')
  const file = fi >= 0 ? argv[fi + 1] : undefined
  if (!file) {
    console.error('Falta --file <ruta al documento .md>')
    process.exit(1)
  }
  run({ file, apply: argv.includes('--apply'), allowRemote: argv.includes('--allow-remote') }).catch((err) => {
    console.error(`Error: ${err.message}`)
    process.exit(1)
  })
}
