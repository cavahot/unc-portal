import { cmsFetch } from '../client'
import { groupAranceles, latestUpdatedAt, mapAranceles, type ArancelGroup } from '../aranceles'

export type { Arancel, ArancelGroup, ArancelGrupo } from '../aranceles'

/**
 * ARR-01: aranceles de /aranceles-rectorado. El CMS (colección `aranceles-rectorado`) es la ÚNICA fuente.
 * Spec: docs/specs/portal/ARANCELES-RECTORADO.md §2.1.
 *
 *  - `ok`: hay al menos un arancel publicado y válido.
 *  - `empty`: el CMS respondió sin filas publicables: aviso vacío, NUNCA montos escritos en el código (antes había
 *    24 de respaldo; una lista de precios en el código queda vieja sin que nadie pueda corregirla desde el panel).
 *  - `unavailable`: el CMS no respondió o devolvió una forma inesperada: aviso neutro; la página no da 500.
 *    Con la caché de datos de Next, tras una carga correcta una caída posterior sigue sirviendo la última
 *    respuesta buena; este estado solo aparece si nunca la hubo.
 */
export type ArancelesResult =
  | { status: 'ok'; groups: ArancelGroup[]; total: number; updatedAt: string | null }
  | { status: 'empty' }
  | { status: 'unavailable' }

/** Solo lo que pinta la página (`id` llega siempre). Sin `active`: ya lo filtra el `where`. */
const SELECT_FIELDS = ['concepto', 'monto', 'grupo', 'orden', 'updatedAt']

/** Tope de filas (PERF-DB: sin consultas sin cota). Hoy son 24 aranceles. */
const MAX_ROWS = 200

/** Red de seguridad si se pierde el aviso de revalidación del CMS; el camino normal es la etiqueta. */
const SAFETY_REVALIDATE_SECONDS = 3600

function buildQuery(): string {
  const params = new URLSearchParams()
  // Defensa en profundidad: la colección ya limita la lectura anónima a `active = true` (SEC-10).
  params.set('where[active][equals]', 'true')
  params.set('sort', 'orden')
  params.set('limit', String(MAX_ROWS))
  params.set('depth', '0')
  for (const f of SELECT_FIELDS) params.set(`select[${f}]`, 'true')
  return `/aranceles-rectorado?${params.toString()}`
}

/** Lee el CMS y agrupa; nunca lanza (ver `ArancelesResult`). */
export async function getArancelesRectorado(): Promise<ArancelesResult> {
  let rows: unknown
  try {
    const data = await cmsFetch<{ docs?: unknown }>(buildQuery(), {
      tags: ['aranceles-rectorado'],
      next: { revalidate: SAFETY_REVALIDATE_SECONDS },
    })
    rows = data?.docs
  } catch {
    return { status: 'unavailable' }
  }
  if (!Array.isArray(rows)) return { status: 'unavailable' }
  const items = mapAranceles(rows)
  if (items.length === 0) return { status: 'empty' }
  return { status: 'ok', groups: groupAranceles(items), total: items.length, updatedAt: latestUpdatedAt(items) }
}
