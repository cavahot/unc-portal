import { cmsFetch } from '../client'
import { CmsError } from '../errors'
import type { PayloadResponse } from '../types'
import { mapTesisList, type TesisItem } from '../tesisCatalogo'

/**
 * INST-06: datos de /biblioteca. El CMS (colección `tesis`) es la ÚNICA fuente; sin datos de demostración.
 *
 *  - `ok`: hay al menos una tesis (de la búsqueda o, sin término, las más recientes). `total` es lo que existe en el CMS,
 *    que puede ser mayor que lo mostrado (`docs.length`).
 *  - `empty`: el CMS respondió sin tesis (para la búsqueda o en todo el repositorio).
 *  - `unavailable`: el CMS no respondió: aviso con «Intentar de nuevo». Antes una caída se mostraba como «sin resultados»
 *    (la consulta anterior devolvía una lista vacía de demostración ante cualquier error).
 */
export type TesisCatalogoResult = { status: 'ok'; docs: TesisItem[]; total: number } | { status: 'empty' } | { status: 'unavailable' }

/** Registra solo el NOMBRE del error y el código HTTP, nunca el mensaje (puede llevar la URL del CMS). */
function detail(error: unknown): string {
  return error instanceof CmsError ? `${error.name} ${error.status}` : error instanceof Error ? error.name : 'desconocido'
}

/** Busca por título o autor (o lista las más recientes si no hay término); nunca lanza (ver `TesisCatalogoResult`). */
export async function getTesisCatalogo({ q = '', limit = 12 }: { q?: string; limit?: number } = {}): Promise<TesisCatalogoResult> {
  const params = new URLSearchParams({ sort: '-anio', limit: String(limit), depth: '1' })
  if (q) {
    params.append('where[or][0][titulo][like]', q)
    params.append('where[or][1][autor][like]', q)
  }
  let res: PayloadResponse<unknown>
  try {
    res = await cmsFetch<PayloadResponse<unknown>>(`/tesis?${params.toString()}`, { tags: ['tesis'] })
  } catch (error) {
    console.error(`[BIBLIOTECA] No se pudo leer el CMS (${detail(error)}); se muestra el aviso de no disponible.`)
    return { status: 'unavailable' }
  }
  if (!res || !Array.isArray(res.docs)) {
    console.error('[BIBLIOTECA] Respuesta inesperada del CMS (sin lista de documentos); se muestra el aviso de no disponible.')
    return { status: 'unavailable' }
  }
  const docs = mapTesisList(res.docs)
  if (docs.length === 0) return { status: 'empty' }
  return { status: 'ok', docs, total: typeof res.totalDocs === 'number' && res.totalDocs >= docs.length ? res.totalDocs : docs.length }
}
