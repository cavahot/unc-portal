/**
 * agregar-enlaces-faltantes.ts — MENU-CMS-07 (spec: docs/specs/portal/MENU-PAGINAS.md §10)
 *
 * Qué hace: agrega al menú guardado (global `navegacion`) los subenlaces del menú base (`NAVEGACION_SEED`) que le faltan,
 *   junto a sus vecinos (p. ej. «Docencia» bajo «Academia»). No borra, mueve ni cambia nada existente
 *   (`scripts/lib/navegacionMerge.mjs`, con pruebas en tests/unit/menu-agregar-faltantes.spec.ts).
 * Por qué existe: el menú guardado no cambia cuando el código agrega una sección, y editarlo a mano en el panel es frágil.
 * Amenazas que evita: escribir en una base remota (solo DATABASE_URI local); cambios sin rastro (el guardado pasa por los
 *   hooks del global: auditoría y revalidación del portal); pisar ediciones (solo agrega).
 * Límite: usa la API local de Payload sin usuario, así que la auditoría registra «sistema». En el VPS se ejecuta dentro
 *   del contenedor del CMS con su propia base, con autorización aparte.
 *
 * Uso (desde la raíz del repo):
 *   npx tsx apps/cms/scripts/menu/agregar-enlaces-faltantes.ts            # muestra qué agregaría, sin escribir
 *   npx tsx apps/cms/scripts/menu/agregar-enlaces-faltantes.ts --apply    # escribe
 */
import { config as loadEnv } from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getPayload } from 'payload'
import { mergeMissingSeedLinks } from '../../../../scripts/lib/navegacionMerge.mjs'
import { NAVEGACION_SEED } from '../../../../scripts/lib/navegacionSeedData.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
loadEnv({ path: path.resolve(__dirname, '../../.env') })

/** Solo bases locales. */
function assertLocalDatabase(): void {
  const raw = process.env.DATABASE_URI?.trim() || ''
  const host = raw ? new URL(raw).hostname : ''
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(host)) {
    throw new Error('Este guion solo escribe en una base local (DATABASE_URI con host localhost).')
  }
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply')
  assertLocalDatabase()
  const configModule = await import('../../src/payload.config.js')
  const payload = await getPayload({ config: configModule.default })
  const current = (await payload.findGlobal({ slug: 'navegacion', depth: 0, overrideAccess: true })) as { links?: unknown[] }
  const { links, added, skipped } = mergeMissingSeedLinks(current.links ?? [], NAVEGACION_SEED)

  for (const a of added) console.log(`  + ${a.parent} → ${a.label} (${a.url})`)
  for (const s of skipped) console.log(`  ! ${s.parent} → ${s.label}: ${s.reason}`)
  if (added.length === 0) {
    console.log('Nada que agregar: el menú guardado ya tiene todos los subenlaces del menú base.')
    process.exit(0)
  }
  if (!apply) {
    console.log(`[dry-run] ${added.length} subenlace(s) por agregar. Use --apply para escribir.`)
    process.exit(0)
  }
  await payload.updateGlobal({ slug: 'navegacion', data: { links } as never, overrideAccess: true, depth: 0 })
  console.log(`Guardado: ${added.length} subenlace(s) agregado(s).`)
  process.exit(0)
}

main().catch((error) => {
  console.error('Error:', error instanceof Error ? error.message : 'desconocido')
  process.exit(1)
})
