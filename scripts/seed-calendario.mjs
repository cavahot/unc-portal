/**
 * seed-calendario.mjs — INST-07
 *
 * Carga idempotente de las fechas de /calendario-academico en la colección `calendario-academico` del CMS: 2 semestres
 * (5 eventos cada uno) y las mesas de exámenes finales (4 períodos), que estaban escritos como texto en
 * `messages/es/pages.calendario-academico.json` (convertidos de forma programática a fechas reales en
 * `scripts/lib/calendarioSeedData.mjs`). Desde INST-07 el CMS es la fuente y este archivo solo siembra el estado inicial.
 * Spec: docs/specs/portal/CALENDARIO.md §2.5.
 *
 * ATENCIÓN: estas fechas no tienen una fuente verificable en el repositorio y el texto original las llamaba «orientativas».
 * Secretaría Académica debe confirmarlas (o corregirlas desde el panel) antes de publicar.
 *
 * Uso:
 *   node scripts/seed-calendario.mjs                                   # dry-run (por defecto): sin red
 *   CMS_EMAIL=... CMS_PASSWORD=... node scripts/seed-calendario.mjs --apply
 *   ... --apply --allow-remote   # CMS_URL=https://... explícito; solo https
 *
 * Reglas (amenaza -> control):
 *   - Pisar ediciones de Secretaría al re-ejecutar -> si ya existe un bloque con el mismo título y año se OMITE y nunca se
 *     modifica (con sesión institucional la búsqueda ve también los inactivos, así que no los recrea).
 *   - Escribir en un CMS equivocado -> solo localhost salvo --allow-remote (y entonces solo https); misma política de
 *     destino y credenciales que la siembra del glosario (`openCmsSession`).
 *   - Credencial débil o literal -> `requireCmsPassword` (SEC-08); nada se imprime.
 * Límite: no actualiza un bloque existente; para cambiarlo use el panel del CMS.
 */
import { pathToFileURL } from 'node:url'
import { openCmsSession } from './seed-glosario-guarani.mjs'
import { CALENDARIO_SEED } from './lib/calendarioSeedData.mjs'

/** Aviso que se muestra siempre: las fechas sembradas no están verificadas como oficiales. */
export const AVISO_FECHAS =
  'AVISO: las fechas sembradas no tienen una fuente verificada en el repositorio. Secretaría Académica debe confirmarlas antes de publicar.'

/** Día `YYYY-MM-DD` -> valor de un campo de día completo del CMS (mediodía UTC, para que ninguna zona horaria lo corra de día). */
export const toCmsDate = (day) => `${day}T12:00:00.000Z`

/** Documento a enviar al CMS: solo los campos que existen; el evento solo en un semestre. */
export function toDoc(b) {
  return {
    titulo: b.titulo,
    tipo: b.tipo,
    anio: b.anio,
    orden: b.orden,
    activa: true,
    entradas: b.entradas.map((e) => ({
      ...(b.tipo === 'semestre' && e.evento ? { evento: e.evento } : {}),
      ...(e.descripcion ? { descripcion: e.descripcion } : {}),
      inicio: toCmsDate(e.inicio),
      ...(e.fin ? { fin: toCmsDate(e.fin) } : {}),
    })),
  }
}

/** Ejecuta la carga. `deps` permite inyectar env, fetch, log y la lista (pruebas). Por defecto es dry-run. */
export async function run({ apply = false, allowRemote = false, deps = {} } = {}) {
  const env = deps.env ?? process.env
  const log = deps.log ?? ((m) => console.log(m))
  const doFetch = deps.fetch ?? globalThis.fetch
  const items = deps.items ?? CALENDARIO_SEED
  const counts = { creados: 0, omitidos: 0, errores: 0 }

  if (!apply) {
    const cmsUrl = (env.CMS_URL || 'http://localhost:3002').replace(/\/+$/, '')
    log(`[dry-run] CMS destino: ${cmsUrl} (sin llamadas de red). Use --apply para escribir.`)
    log(`[dry-run] ${items.length} bloques, ${items.reduce((n, b) => n + b.entradas.length, 0)} fechas`)
    log('[dry-run] solo se crean los que no existan por título + año; los existentes no se tocan')
    log(AVISO_FECHAS)
    return { dryRun: true, counts }
  }

  const { api } = await openCmsSession({ allowRemote, env, doFetch, log })
  for (const b of items) {
    const q = new URLSearchParams({ 'where[titulo][equals]': b.titulo, 'where[anio][equals]': String(b.anio), limit: '1', depth: '0' })
    const found = await api('GET', `calendario-academico?${q}`)
    if (!found.ok) {
      counts.errores++
      log(`  ! «${b.titulo}»: no se pudo consultar el CMS (HTTP ${found.status}).`)
      continue
    }
    if (found.data.docs?.length) {
      counts.omitidos++
      log(`  = «${b.titulo}»: omitido, ya existe (no se modifica).`)
      continue
    }
    const r = await api('POST', 'calendario-academico', toDoc(b))
    if (r.ok) {
      counts.creados++
      log(`  + «${b.titulo}» (${b.entradas.length} fechas).`)
    } else {
      counts.errores++
      log(`  ! «${b.titulo}»: falló la escritura (HTTP ${r.status}): ${JSON.stringify(r.data.errors ?? r.data).slice(0, 300)}`)
    }
  }
  log('')
  log(`Resumen: ${JSON.stringify(counts)}`)
  log(AVISO_FECHAS)
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
