/**
 * seed-legalizaciones.mjs — INST-11
 *
 * Carga idempotente del contenido de /legalizaciones en el global `legalizaciones`: 3 categorías de documentos con sus
 * requisitos, 10 pasos del procedimiento y el plazo de 12 a 24 horas hábiles. Es el contenido que estaba escrito en
 * `app/[locale]/legalizaciones/page.tsx`; desde INST-11 el CMS es la fuente y este archivo solo siembra el estado inicial
 * (`scripts/lib/legalizacionesSeedData.mjs`). El arancel NO se carga aquí: se enlaza la fila «Legalizaciones» que ya existe
 * en `aranceles-rectorado`. Spec: docs/specs/portal/LEGALIZACIONES.md §2.4.
 *
 * ATENCIÓN: requisitos, pasos, plazo y arancel se cargan tal como estaban, sin revisión de la fuente. Secretaría General debe
 * confirmarlos antes de publicar.
 *
 * Uso:
 *   node scripts/seed-legalizaciones.mjs                                   # dry-run (por defecto): sin red
 *   CMS_EMAIL=... CMS_PASSWORD=... node scripts/seed-legalizaciones.mjs --apply
 *   ... --apply --allow-remote   # CMS_URL=https://... explícito; solo https
 *
 * Reglas (amenaza -> control):
 *   - Pisar ediciones al re-ejecutar -> si el global ya tiene título, categorías o pasos se OMITE y nunca se modifica.
 *   - Escribir en un CMS equivocado -> solo localhost salvo --allow-remote (y entonces solo https); misma política de destino y
 *     credenciales que la siembra del glosario (`openCmsSession`).
 *   - Credencial débil o literal -> `requireCmsPassword` (SEC-08); nada se imprime.
 *   - Dos fuentes del arancel -> se guarda la relación (id de la fila), nunca el monto.
 * Límite: no actualiza un global con contenido; para cambiarlo use el panel del CMS.
 */
import { pathToFileURL } from 'node:url'
import { openCmsSession } from './seed-glosario-guarani.mjs'
import { ARANCEL_CONCEPTO, LEGALIZACIONES_SEED } from './lib/legalizacionesSeedData.mjs'

export { ARANCEL_CONCEPTO, LEGALIZACIONES_SEED }

/** Aviso que se muestra siempre: el contenido sembrado no tuvo revisión de la fuente. */
export const AVISO_FUENTE =
  'AVISO: requisitos, pasos, plazo y arancel se cargaron tal como estaban en el portal, sin revisión de la fuente. Secretaría General debe confirmarlos antes de publicar.'

/** Documento a escribir. Con `arancelId` enlaza la fila de aranceles; sin él, omite la relación (nunca un monto). */
export function plannedDocument(arancelId) {
  return { ...LEGALIZACIONES_SEED, ...(arancelId != null ? { arancel: arancelId } : {}) }
}

/** El global «tiene contenido» si ya hay título, alguna categoría o algún paso (no se pisa nunca). */
function hasContent(doc) {
  if (!doc || typeof doc !== 'object') return false
  return Boolean(
    (typeof doc.titulo === 'string' && doc.titulo.trim()) ||
      (Array.isArray(doc.tipos) && doc.tipos.length > 0) ||
      (Array.isArray(doc.pasos) && doc.pasos.length > 0),
  )
}

/** Ejecuta la carga. `deps` permite inyectar env, fetch y log (pruebas). Por defecto es dry-run. */
export async function run({ apply = false, allowRemote = false, deps = {} } = {}) {
  const env = deps.env ?? process.env
  const log = deps.log ?? ((m) => console.log(m))
  const doFetch = deps.fetch ?? globalThis.fetch
  const counts = { creados: 0, omitidos: 0, errores: 0 }

  if (!apply) {
    const cmsUrl = (env.CMS_URL || 'http://localhost:3002').replace(/\/+$/, '')
    log(`[dry-run] CMS destino: ${cmsUrl} (sin llamadas de red). Use --apply para escribir.`)
    log(`[dry-run] contenido: ${LEGALIZACIONES_SEED.tipos.length} categorías, ${LEGALIZACIONES_SEED.pasos.length} pasos, plazo ${LEGALIZACIONES_SEED.plazoMinHoras}–${LEGALIZACIONES_SEED.plazoMaxHoras} h.`)
    log('[dry-run] solo se carga si el global no tiene contenido; si lo tiene no se toca')
    log(AVISO_FUENTE)
    return { dryRun: true, counts }
  }

  const { api } = await openCmsSession({ allowRemote, env, doFetch, log })

  const current = await api('GET', 'globals/legalizaciones?depth=0')
  if (!current.ok) {
    counts.errores++
    log(`  ! No se pudo leer el global (HTTP ${current.status}).`)
    return { dryRun: false, counts }
  }
  if (hasContent(current.data)) {
    counts.omitidos++
    log('  = Omitido: el global ya tiene contenido (no se modifica).')
    log('')
    log(`Resumen: ${JSON.stringify(counts)}`)
    log(AVISO_FUENTE)
    return { dryRun: false, counts }
  }

  // El arancel se enlaza por la fila existente y publicada; si no está, se siembra sin relación (la página enlazará a los aranceles).
  const q = new URLSearchParams({ 'where[concepto][equals]': ARANCEL_CONCEPTO, 'where[active][equals]': 'true', limit: '1', depth: '0' })
  const arancel = await api('GET', `aranceles-rectorado?${q}`)
  const arancelId = arancel.ok ? (arancel.data.docs?.[0]?.id ?? null) : null
  if (arancelId == null) log(`  ! No se encontró la fila de arancel «${ARANCEL_CONCEPTO}»: se siembra sin enlazar el arancel (enlácelo desde el panel).`)

  const r = await api('POST', 'globals/legalizaciones', plannedDocument(arancelId))
  if (r.ok) {
    counts.creados++
    log(`  + Contenido sembrado (${LEGALIZACIONES_SEED.tipos.length} categorías, ${LEGALIZACIONES_SEED.pasos.length} pasos${arancelId != null ? ', arancel enlazado' : ''}).`)
  } else {
    counts.errores++
    log(`  ! Falló la escritura (HTTP ${r.status}): ${JSON.stringify(r.data.errors ?? r.data).slice(0, 300)}`)
  }
  log('')
  log(`Resumen: ${JSON.stringify(counts)}`)
  log(AVISO_FUENTE)
  return { dryRun: false, counts }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2)
  if (args.includes('--apply') && args.includes('--dry-run')) {
    console.error('Error: --apply y --dry-run se excluyen.')
    process.exit(2)
  }
  run({ apply: args.includes('--apply'), allowRemote: args.includes('--allow-remote') })
    .then((r) => process.exit(r.counts.errores > 0 ? 1 : 0))
    .catch((e) => {
      console.error(`Error: ${e.message}`)
      process.exit(1)
    })
}
