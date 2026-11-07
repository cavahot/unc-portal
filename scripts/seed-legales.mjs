/**
 * seed-legales.mjs — INST-08
 *
 * Carga idempotente de los globals `politica-privacidad` (7 secciones) y `declaracion-accesibilidad` (descripción, 6
 * características y correo de contacto), que estaban escritos en `messages/{es,gn,en,pt-BR}/pages.{privacidad,accesibilidad}.json`
 * y en el código de `/accesibilidad`. Un texto por idioma (es, en, pt-BR, gn). Desde INST-08 el CMS es la fuente y este archivo
 * solo siembra el estado inicial (`scripts/lib/legalesSeedData.mjs`, con el español corregido a «usted»).
 * Spec: docs/specs/portal/LEGALES.md §2.7.
 *
 * ATENCIÓN: son textos legales cargados tal cual estaban; no tuvieron revisión jurídica en esta tarea y la fecha de
 * actualización es el primer día del mes del texto anterior. Quien administra el texto debe confirmarlos antes de publicar.
 *
 * Uso:
 *   node scripts/seed-legales.mjs                                   # dry-run (por defecto): sin red
 *   CMS_EMAIL=... CMS_PASSWORD=... node scripts/seed-legales.mjs --apply
 *   ... --apply --allow-remote   # CMS_URL=https://... explícito; solo https
 *
 * Reglas (amenaza -> control):
 *   - Pisar ediciones al re-ejecutar -> si el global ya tiene contenido en español se OMITE entero y nunca se modifica.
 *   - Escribir en un CMS equivocado -> solo localhost salvo --allow-remote (y entonces solo https); misma política de destino y
 *     credenciales que la siembra del glosario (`openCmsSession`).
 *   - Credencial débil o literal -> `requireCmsPassword` (SEC-08); nada se imprime.
 * Límite: no actualiza un global existente; para cambiarlo use el panel del CMS.
 */
import { pathToFileURL } from 'node:url'
import { openCmsSession } from './seed-glosario-guarani.mjs'
import { LEGALES_SEED } from './lib/legalesSeedData.mjs'

/** Aviso que se muestra siempre: los textos sembrados no tuvieron revisión jurídica en esta tarea. */
export const AVISO_LEGAL =
  'AVISO: los textos legales se cargaron tal como estaban en el portal, sin revisión jurídica; la fecha de actualización es el primer día del mes del texto anterior. Confirme ambos antes de publicar.'

export const LOCALES = ['es', 'en', 'pt-BR', 'gn']

/** Documento de la política de privacidad para un idioma: la fecha (no localizada) y las secciones de ese idioma. */
export function docPrivacidad(seed, locale) {
  return {
    ultimaActualizacion: `${seed.privacidad.ultimaActualizacion}T12:00:00.000Z`,
    secciones: seed.privacidad.secciones[locale].map((s) => ({ titulo: s.titulo, contenido: s.contenido })),
  }
}

/** Documento de la declaración de accesibilidad para un idioma. */
export function docAccesibilidad(seed, locale) {
  const a = seed.accesibilidad
  return {
    correoContacto: a.correoContacto,
    descripcion: a.descripcion[locale],
    caracteristicas: a.caracteristicas[locale].map((c) => ({ titulo: c.titulo, descripcion: c.descripcion })),
  }
}

const GLOBALS = [
  { slug: 'politica-privacidad', nombre: 'Política de privacidad', lista: 'secciones', doc: docPrivacidad, cuenta: (s) => s.privacidad.secciones.es.length },
  { slug: 'declaracion-accesibilidad', nombre: 'Declaración de accesibilidad', lista: 'caracteristicas', doc: docAccesibilidad, cuenta: (s) => s.accesibilidad.caracteristicas.es.length },
]

/** Ejecuta la carga. `deps` permite inyectar env, fetch, log y la semilla (pruebas). Por defecto es dry-run. */
export async function run({ apply = false, allowRemote = false, deps = {} } = {}) {
  const env = deps.env ?? process.env
  const log = deps.log ?? ((m) => console.log(m))
  const doFetch = deps.fetch ?? globalThis.fetch
  const seed = deps.seed ?? LEGALES_SEED
  const counts = { creados: 0, omitidos: 0, errores: 0 }

  if (!apply) {
    const cmsUrl = (env.CMS_URL || 'http://localhost:3002').replace(/\/+$/, '')
    log(`[dry-run] CMS destino: ${cmsUrl} (sin llamadas de red). Use --apply para escribir.`)
    for (const g of GLOBALS) log(`[dry-run] ${g.nombre}: ${g.cuenta(seed)} filas × ${LOCALES.length} idiomas`)
    log('[dry-run] solo se carga un global si no tiene contenido en español; los existentes no se tocan')
    log(AVISO_LEGAL)
    return { dryRun: true, counts }
  }

  const { api } = await openCmsSession({ allowRemote, env, doFetch, log })
  for (const g of GLOBALS) {
    const q = (l) => new URLSearchParams({ locale: l, 'fallback-locale': 'none', depth: '0' })
    const found = await api('GET', `globals/${g.slug}?${q('es')}`)
    if (!found.ok) {
      counts.errores++
      log(`  ! ${g.nombre}: no se pudo consultar el CMS (HTTP ${found.status}).`)
      continue
    }
    if (Array.isArray(found.data?.[g.lista]) && found.data[g.lista].length > 0) {
      counts.omitidos++
      log(`  = ${g.nombre}: omitido, ya tiene contenido (no se modifica).`)
      continue
    }
    let fallo = false
    for (const l of LOCALES) {
      const r = await api('POST', `globals/${g.slug}?${new URLSearchParams({ locale: l })}`, g.doc(seed, l))
      if (!r.ok) {
        fallo = true
        counts.errores++
        log(`  ! ${g.nombre} (${l}): falló la escritura (HTTP ${r.status}): ${JSON.stringify(r.data.errors ?? r.data).slice(0, 300)}`)
        break
      }
    }
    if (!fallo) {
      counts.creados++
      log(`  + ${g.nombre} (${g.cuenta(seed)} filas en ${LOCALES.length} idiomas).`)
    }
  }
  log('')
  log(`Resumen: ${JSON.stringify(counts)}`)
  log(AVISO_LEGAL)
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
