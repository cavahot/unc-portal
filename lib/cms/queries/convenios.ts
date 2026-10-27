import { cmsFetch } from '../client'
import {
  countByCategoria,
  groupByYear,
  mapConvenios,
  yearSpan,
  type Convenio,
  type ConvenioCategoria,
  type ConvenioType,
  type ConvenioYearGroup,
} from '../convenios'

export type { Convenio, ConvenioCategoria, ConvenioType, ConvenioYearGroup } from '../convenios'

/**
 * CNV-01: convenios de /convenios y /convenios/internacionales. El CMS (colección `convenios`) es la ÚNICA
 * fuente: ya no hay datos de demostración en ningún entorno (antes, en desarrollo, se veían 29 filas ficticias
 * con enlaces de Drive de relleno; RDD-CNV-03). Spec: docs/specs/portal/CONVENIOS.md §2.
 *
 *  - `ok`: hay al menos un convenio activo del tipo pedido.
 *  - `empty`: el CMS respondió sin filas: la página muestra un aviso vacío, nunca convenios inventados.
 *  - `unavailable`: red caída, error HTTP o forma inesperada: aviso neutro, la página no da 500. Con la caché de
 *    datos de Next, tras una carga correcta una caída posterior sigue sirviendo la última respuesta buena.
 */
export type ConveniosResult =
  | {
      status: 'ok'
      groups: ConvenioYearGroup[]
      total: number
      counts: Record<ConvenioCategoria, number>
      span: { from: number; to: number }
    }
  | { status: 'empty' }
  | { status: 'unavailable' }

/** Solo lo que pinta la página (sin `active` ni `type`, que ya filtra el `where`, ni metadatos de Payload). */
const SELECT_FIELDS = ['title', 'year', 'parties', 'objective', 'signedMonth', 'duration', 'driveUrl', 'categoria', 'nota', 'orden']

/** Tope de filas (PERF-DB: sin consultas sin cota). Hoy son 106 nacionales y 44 internacionales. */
const MAX_CONVENIOS = 500

/** Red de seguridad si se pierde el aviso de revalidación del CMS; el camino normal es la etiqueta. */
const SAFETY_REVALIDATE_SECONDS = 3600

function buildQuery(type: ConvenioType): string {
  const params = new URLSearchParams()
  params.set('where[active][equals]', 'true')
  params.set('where[type][equals]', type)
  params.set('sort', '-year')
  params.set('limit', String(MAX_CONVENIOS))
  params.set('depth', '0')
  for (const f of SELECT_FIELDS) params.set(`select[${f}]`, 'true')
  return `/convenios?${params.toString()}`
}

/** Lee el CMS y agrupa por año; nunca lanza (ver `ConveniosResult`). */
export async function getConveniosPage(type: ConvenioType): Promise<ConveniosResult> {
  let rows: unknown
  try {
    const data = await cmsFetch<{ docs?: unknown }>(buildQuery(type), {
      tags: ['convenios'],
      next: { revalidate: SAFETY_REVALIDATE_SECONDS },
    })
    rows = data?.docs
  } catch {
    return { status: 'unavailable' }
  }
  if (!Array.isArray(rows)) return { status: 'unavailable' }
  const items: Convenio[] = mapConvenios(rows)
  const span = yearSpan(items)
  if (!span) return { status: 'empty' }
  return { status: 'ok', groups: groupByYear(items), total: items.length, counts: countByCategoria(items), span }
}
