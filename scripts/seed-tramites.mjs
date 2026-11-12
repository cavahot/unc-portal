/**
 * seed-tramites.mjs — INST-05
 *
 * Carga idempotente de los trámites de /tramites en la colección `tramites` del CMS: 18 trámites de 6 facultades con sus
 * 84 requisitos, notas y etiquetas, que estaban escritos en `components/tramites/FacultadTabs.tsx` (copiados de forma
 * programática a `scripts/lib/tramitesSeedData.mjs`). Desde INST-05 el CMS es la fuente y este archivo solo siembra el
 * estado inicial. Spec: docs/specs/portal/TRAMITES.md §2.5.
 *
 * Uso:
 *   node scripts/seed-tramites.mjs                                   # dry-run (por defecto): sin red
 *   CMS_EMAIL=... CMS_PASSWORD=... node scripts/seed-tramites.mjs --apply
 *   ... --apply --allow-remote   # CMS_URL=https://... explícito; solo https
 *
 * Reglas (amenaza -> control):
 *   - Pisar ediciones del equipo al re-ejecutar -> si ya existe un trámite con la misma facultad y título se OMITE y nunca
 *     se modifica (con sesión institucional la búsqueda ve también los inactivos, así que no los recrea).
 *   - Escribir en un CMS equivocado -> solo localhost salvo --allow-remote (y entonces solo https); misma política de
 *     destino y credenciales que la siembra del glosario (`openCmsSession`).
 *   - Un trámite sin su facultad en el CMS -> se informa y se cuenta como error; no se crea un trámite huérfano.
 *   - Credencial débil o literal -> `requireCmsPassword` (SEC-08); nada se imprime.
 * Límite: no actualiza un trámite existente; para cambiarlo use el panel del CMS. Requiere que las facultades ya existan.
 */
import { pathToFileURL } from 'node:url'
import { openCmsSession } from './seed-glosario-guarani.mjs'
import { TRAMITES_SEED } from './lib/tramitesSeedData.mjs'

/** Documento a enviar al CMS: requisitos como lista de `{ texto }` y solo los campos que existen. */
export function toDoc(t, facultadId) {
  return {
    facultad: facultadId,
    titulo: t.titulo,
    ...(t.etiqueta ? { etiqueta: t.etiqueta } : {}),
    ...(t.descripcion ? { descripcion: t.descripcion } : {}),
    requisitos: t.requisitos.map((texto) => ({ texto })),
    ...(t.nota ? { nota: t.nota } : {}),
    orden: t.orden,
    activa: true,
  }
}

/** Ejecuta la carga. `deps` permite inyectar env, fetch, log y la lista (pruebas). Por defecto es dry-run. */
export async function run({ apply = false, allowRemote = false, deps = {} } = {}) {
  const env = deps.env ?? process.env
  const log = deps.log ?? ((m) => console.log(m))
  const doFetch = deps.fetch ?? globalThis.fetch
  const items = deps.items ?? TRAMITES_SEED
  const counts = { creados: 0, omitidos: 0, errores: 0 }

  if (!apply) {
    const cmsUrl = (env.CMS_URL || 'http://localhost:3002').replace(/\/+$/, '')
    const facultades = new Set(items.map((t) => t.facultad))
    log(`[dry-run] CMS destino: ${cmsUrl} (sin llamadas de red). Use --apply para escribir.`)
    log(`[dry-run] ${items.length} trámites de ${facultades.size} facultades, ${items.reduce((n, t) => n + t.requisitos.length, 0)} requisitos`)
    log('[dry-run] solo se crean los que no existan por facultad + título; los existentes no se tocan')
    return { dryRun: true, counts }
  }

  const { api } = await openCmsSession({ allowRemote, env, doFetch, log })
  const facultadIds = new Map()
  const facultadId = async (slug) => {
    if (facultadIds.has(slug)) return facultadIds.get(slug)
    const r = await api('GET', `facultades?${new URLSearchParams({ 'where[slug][equals]': slug, limit: '1', depth: '0' })}`)
    const id = r.ok ? (r.data.docs?.[0]?.id ?? null) : null
    facultadIds.set(slug, id)
    return id
  }

  for (const t of items) {
    const fid = await facultadId(t.facultad)
    if (fid === null) {
      counts.errores++
      log(`  ! «${t.titulo}»: la facultad «${t.facultad}» no existe en el CMS (no se crea un trámite huérfano).`)
      continue
    }
    const q = new URLSearchParams({ 'where[facultad][equals]': String(fid), 'where[titulo][equals]': t.titulo, limit: '1', depth: '0' })
    const found = await api('GET', `tramites?${q}`)
    if (!found.ok) {
      counts.errores++
      log(`  ! «${t.titulo}»: no se pudo consultar el CMS (HTTP ${found.status}).`)
      continue
    }
    if (found.data.docs?.length) {
      counts.omitidos++
      log(`  = «${t.titulo}»: omitido, ya existe (no se modifica).`)
      continue
    }
    const r = await api('POST', 'tramites', toDoc(t, fid))
    if (r.ok) {
      counts.creados++
      log(`  + «${t.titulo}» (${t.facultad}).`)
    } else {
      counts.errores++
      log(`  ! «${t.titulo}»: falló la escritura (HTTP ${r.status}): ${JSON.stringify(r.data.errors ?? r.data).slice(0, 300)}`)
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
