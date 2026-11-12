import { cmsFetch } from '../client'
import { CmsError } from '../errors'
import type { PayloadResponse } from '../types'
import { agruparTramites, type GrupoTramites } from '../tramites'

/**
 * INST-05: datos de /tramites. El CMS (colección `tramites`) es la ÚNICA fuente; sin datos de demostración.
 * Spec: docs/specs/portal/TRAMITES.md §2.4.
 *
 *  - `ok`: hay al menos un trámite activo (agrupado por facultad).
 *  - `empty`: el CMS respondió sin trámites activos: aviso neutro, nunca requisitos escritos en el código.
 *  - `unavailable`: el CMS no respondió: aviso neutro con «Intentar de nuevo»; la página no da 500.
 */
export type TramitesResult = { status: 'ok'; grupos: GrupoTramites[] } | { status: 'empty' } | { status: 'unavailable' }

/** Registra solo el NOMBRE del error y el código HTTP, nunca el mensaje (puede llevar la URL del CMS). */
function detail(error: unknown): string {
  return error instanceof CmsError ? `${error.name} ${error.status}` : error instanceof Error ? error.name : 'desconocido'
}

/** Lee el CMS y agrupa; nunca lanza (ver `TramitesResult`). */
export async function getTramites(): Promise<TramitesResult> {
  let docs: unknown
  try {
    const params = new URLSearchParams({ 'where[activa][equals]': 'true', sort: 'orden', limit: '500', depth: '1' })
    const res = await cmsFetch<PayloadResponse<unknown>>(`/tramites?${params.toString()}`, { tags: ['tramites'] })
    docs = res?.docs
  } catch (error) {
    console.error(`[TRAMITES] No se pudo leer el CMS (${detail(error)}); se muestra el aviso de no disponible.`)
    return { status: 'unavailable' }
  }
  if (!Array.isArray(docs)) {
    console.error('[TRAMITES] Respuesta inesperada del CMS (sin lista de documentos); se muestra el aviso de no disponible.')
    return { status: 'unavailable' }
  }
  const grupos = agruparTramites(docs)
  return grupos.length > 0 ? { status: 'ok', grupos } : { status: 'empty' }
}
