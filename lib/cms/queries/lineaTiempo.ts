import { cmsFetch } from '../client'
import { mapMilestones, type Milestone, type TimelineLocale } from '../lineaTiempo'
import { resolveMediaUrl } from '../mediaUrl'

export type { Milestone, MilestoneImage, TimelineLocale } from '../lineaTiempo'

/**
 * LT-01: hitos de la línea de tiempo de /historia. El CMS (colección `linea-tiempo`) es la ÚNICA fuente.
 * Spec: docs/specs/portal/LINEA-TIEMPO.md §2.7.
 *
 *  - `ok`: al menos un hito publicado y válido.
 *  - `empty`: el CMS respondió pero no hay hitos publicables. La página OCULTA la sección; NUNCA hitos escritos
 *    en el código (un hito corregido o retirado en el panel no debe reaparecer desde el código).
 *  - `unavailable`: el CMS no respondió o devolvió una forma inesperada: aviso neutro, la página no da 500.
 *    Con la caché de datos de Next, tras una carga correcta una caída posterior sigue sirviendo la última
 *    respuesta buena; este estado solo aparece si nunca la hubo.
 */
export type TimelineResult =
  | { status: 'ok'; milestones: Milestone[] }
  | { status: 'empty' }
  | { status: 'unavailable' }

/** Solo lo que pinta la página (sin `active`, que ya filtra el `where`, ni metadatos de Payload). */
const SELECT_FIELDS = ['anio', 'etiquetaFecha', 'titulo', 'descripcion', 'imagen', 'enlace', 'orden', 'traducciones']

/**
 * Campos de la imagen. `filename` es obligatorio: `url` es un campo calculado a partir de él (sin pedirlo Payload
 * devuelve `url: null`); `width`/`height` evitan saltos de diseño; `blurDataURL` es el marcador de carga.
 */
const POPULATE_MEDIA = ['url', 'filename', 'alt', 'blurDataURL', 'width', 'height']

/** Tope de filas (PERF-DB: sin consultas sin cota). Una línea de tiempo institucional son decenas de hitos. */
const MAX_MILESTONES = 100

/** Red de seguridad si se pierde el aviso de revalidación del CMS; el camino normal es la etiqueta. */
const SAFETY_REVALIDATE_SECONDS = 3600

function buildQuery(): string {
  const params = new URLSearchParams()
  params.set('where[active][equals]', 'true')
  params.set('sort', 'anio')
  params.set('limit', String(MAX_MILESTONES))
  params.set('depth', '1')
  for (const f of SELECT_FIELDS) params.set(`select[${f}]`, 'true')
  for (const f of POPULATE_MEDIA) params.set(`populate[media][${f}]`, 'true')
  return `/linea-tiempo?${params.toString()}`
}

/** Idiomas con traducción en el CMS; cualquier otro valor se trata como español (texto base). */
function toTimelineLocale(locale: string): TimelineLocale {
  return locale === 'en' || locale === 'pt-BR' || locale === 'gn' ? locale : 'es'
}

/**
 * Lee los hitos publicados y los devuelve traducidos y ordenados; nunca lanza (ver `TimelineResult`).
 * La respuesta del CMS es la misma para los 4 idiomas (una sola entrada de caché); la traducción se hace aquí.
 */
export async function getTimeline(locale: string): Promise<TimelineResult> {
  let rows: unknown
  try {
    const data = await cmsFetch<{ docs?: unknown }>(buildQuery(), {
      tags: ['linea-tiempo'],
      next: { revalidate: SAFETY_REVALIDATE_SECONDS },
    })
    rows = data?.docs
  } catch {
    return { status: 'unavailable' }
  }
  if (!Array.isArray(rows)) return { status: 'unavailable' }
  const milestones = mapMilestones(rows, toTimelineLocale(locale), (url) => resolveMediaUrl(url))
  return milestones.length === 0 ? { status: 'empty' } : { status: 'ok', milestones }
}
