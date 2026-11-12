/**
 * seed-dependencias.mjs — INST-12
 *
 * Carga idempotente del directorio de /contacto/dependencias en la colección `dependencias-contacto` del CMS: Rectorado y
 * seis facultades (10 sedes), que estaban escritos en el código de la página (convertidos de forma programática en
 * `scripts/lib/dependenciasSeedData.mjs`). Desde INST-12 el CMS es la fuente y este archivo solo siembra el estado inicial.
 * Spec: docs/specs/portal/DEPENDENCIAS.md §2.4.
 *
 * ATENCIÓN: estos datos de contacto no tienen una fuente verificable en el repositorio. Cada unidad debe confirmar sus
 * teléfonos y correos (o corregirlos desde el panel) antes de publicar.
 *
 * Uso:
 *   node scripts/seed-dependencias.mjs                                   # dry-run (por defecto): sin red
 *   CMS_EMAIL=... CMS_PASSWORD=... node scripts/seed-dependencias.mjs --apply
 *   ... --apply --allow-remote   # CMS_URL=https://... explícito; solo https
 *
 * Reglas (amenaza -> control):
 *   - Pisar ediciones al re-ejecutar -> si ya existe una dependencia con el mismo `slug` se OMITE y nunca se modifica (con
 *     sesión institucional la búsqueda ve también las inactivas, así que no las recrea).
 *   - Escribir en un CMS equivocado -> solo localhost salvo --allow-remote (y entonces solo https); misma política de destino
 *     y credenciales que la siembra del glosario (`openCmsSession`).
 *   - Credencial débil o literal -> `requireCmsPassword` (SEC-08); nada se imprime.
 * Límite: no actualiza una dependencia existente; para cambiarla use el panel del CMS.
 */
import { pathToFileURL } from 'node:url'
import { openCmsSession } from './seed-glosario-guarani.mjs'
import { DEPENDENCIAS_SEED } from './lib/dependenciasSeedData.mjs'

// Los datos se reexportan para que las pruebas (y quien revise) los vean junto con la siembra.
export { DEPENDENCIAS_SEED }

/** Aviso que se muestra siempre: los datos sembrados no están verificados como oficiales. */
export const AVISO_FUENTE =
  'AVISO: los datos de contacto sembrados no tienen una fuente verificada en el repositorio. Cada unidad debe confirmarlos antes de publicar.'

/** Documento a enviar al CMS: las listas de texto pasan al formato `{ texto }` de los campos array de Payload. */
export function toDoc(d) {
  return {
    nombre: d.nombre,
    slug: d.slug,
    logo: d.logo,
    destacada: d.destacada,
    orden: d.orden,
    activa: true,
    sedes: d.sedes.map((s) => ({
      ...(s.nombre ? { nombre: s.nombre } : {}),
      direccion: s.direccion,
      telefonos: s.telefonos.map((texto) => ({ texto })),
      correos: s.correos.map((texto) => ({ texto })),
      ...(s.web ? { web: s.web } : {}),
    })),
  }
}

/** Ejecuta la carga. `deps` permite inyectar env, fetch, log y la lista (pruebas). Por defecto es dry-run. */
export async function run({ apply = false, allowRemote = false, deps = {} } = {}) {
  const env = deps.env ?? process.env
  const log = deps.log ?? ((m) => console.log(m))
  const doFetch = deps.fetch ?? globalThis.fetch
  const items = deps.items ?? DEPENDENCIAS_SEED
  const counts = { creados: 0, omitidos: 0, errores: 0 }

  if (!apply) {
    const cmsUrl = (env.CMS_URL || 'http://localhost:3002').replace(/\/+$/, '')
    log(`[dry-run] CMS destino: ${cmsUrl} (sin llamadas de red). Use --apply para escribir.`)
    log(`[dry-run] ${items.length} dependencias, ${items.reduce((n, d) => n + d.sedes.length, 0)} sedes`)
    log('[dry-run] solo se crean las que no existan por identificador; las existentes no se tocan')
    log(AVISO_FUENTE)
    return { dryRun: true, counts }
  }

  const { api } = await openCmsSession({ allowRemote, env, doFetch, log })
  for (const d of items) {
    const q = new URLSearchParams({ 'where[slug][equals]': d.slug, limit: '1', depth: '0' })
    const found = await api('GET', `dependencias-contacto?${q}`)
    if (!found.ok) {
      counts.errores++
      log(`  ! «${d.nombre}»: no se pudo consultar el CMS (HTTP ${found.status}).`)
      continue
    }
    if (found.data.docs?.length) {
      counts.omitidos++
      log(`  = «${d.nombre}»: omitida, ya existe (no se modifica).`)
      continue
    }
    const r = await api('POST', 'dependencias-contacto', toDoc(d))
    if (r.ok) {
      counts.creados++
      log(`  + «${d.nombre}» (${d.sedes.length} ${d.sedes.length === 1 ? 'sede' : 'sedes'}).`)
    } else {
      counts.errores++
      log(`  ! «${d.nombre}»: falló la escritura (HTTP ${r.status}): ${JSON.stringify(r.data.errors ?? r.data).slice(0, 300)}`)
    }
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
