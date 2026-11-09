/**
 * seed-navegacion.mjs — MENU-CMS-01
 *
 * Carga el menú principal actual del portal en el global `navegacion` del CMS (`scripts/lib/navegacionSeedData.mjs`), para
 * que después se pueda AGREGAR una página al megamenú sin perder el resto: con Navegación vacía el portal usa su menú de
 * respaldo, pero con un solo enlace guardado lo reemplaza por completo (recorrido real, 2026-11-09).
 *
 * Uso:
 *   node scripts/seed-navegacion.mjs                                   # dry-run (por defecto): sin red
 *   CMS_EMAIL=... CMS_PASSWORD=... node scripts/seed-navegacion.mjs --apply
 *   ... --apply --allow-remote   # CMS_URL=https://... explícito; solo https
 *
 * Reglas (amenaza -> control):
 *   - Pisar el menú editado por la institución -> SOLO escribe si el global está VACÍO; si ya tiene enlaces, se omite y no
 *     se modifica nada (para cambiarlo use el panel).
 *   - Escribir en un CMS equivocado -> solo localhost salvo --allow-remote (y entonces solo https); misma política de destino
 *     y credenciales que las demás siembras (`openCmsSession`, SEC-08). Nada de lo secreto se imprime.
 * Límite: no fusiona ni actualiza un menú existente; es una carga inicial.
 */
import { pathToFileURL } from 'node:url'
import { openCmsSession } from './seed-glosario-guarani.mjs'
import { NAVEGACION_SEED } from './lib/navegacionSeedData.mjs'

// Los datos se reexportan para que las pruebas (y quien revise) los vean junto con la siembra.
export { NAVEGACION_SEED }

const contar = (links) => links.reduce((n, l) => n + 1 + (l.children?.length ?? 0), 0)

/** Ejecuta la carga. `deps` permite inyectar env, fetch, log y los enlaces (pruebas). Por defecto es dry-run. */
export async function run({ apply = false, allowRemote = false, deps = {} } = {}) {
  const env = deps.env ?? process.env
  const log = deps.log ?? ((m) => console.log(m))
  const doFetch = deps.fetch ?? globalThis.fetch
  const links = deps.links ?? NAVEGACION_SEED
  const counts = { creados: 0, omitidos: 0, errores: 0 }

  if (!apply) {
    const cmsUrl = (env.CMS_URL || 'http://localhost:3002').replace(/\/+$/, '')
    log(`[dry-run] CMS destino: ${cmsUrl} (sin llamadas de red). Use --apply para escribir.`)
    log(`[dry-run] ${links.length} enlaces principales, ${contar(links)} en total`)
    log('[dry-run] solo se escribe si el menú del CMS está vacío; si ya tiene enlaces no se toca')
    return { dryRun: true, counts }
  }

  const { api } = await openCmsSession({ allowRemote, env, doFetch, log })
  const actual = await api('GET', 'globals/navegacion?depth=0')
  if (!actual.ok) {
    counts.errores++
    log(`  ! no se pudo consultar Navegación (HTTP ${actual.status}).`)
  } else if ((actual.data.links ?? []).length > 0) {
    counts.omitidos++
    log(`  = Navegación ya tiene ${actual.data.links.length} enlaces: omitida (no se modifica).`)
  } else {
    const r = await api('POST', 'globals/navegacion', { links })
    if (r.ok) {
      counts.creados++
      log(`  + Navegación cargada: ${links.length} enlaces principales (${contar(links)} en total).`)
    } else {
      counts.errores++
      log(`  ! falló la escritura (HTTP ${r.status}): ${JSON.stringify(r.data.errors ?? r.data).slice(0, 300)}`)
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
    process.exit(2)
  }
  run({ apply: args.includes('--apply'), allowRemote: args.includes('--allow-remote') })
    .then((r) => process.exit(r.counts.errores > 0 ? 1 : 0))
    .catch((e) => {
      console.error(`Error: ${e.message}`)
      process.exit(1)
    })
}
