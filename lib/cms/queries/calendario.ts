import { cmsFetch } from '../client'
import { CmsError } from '../errors'
import type { PayloadResponse } from '../types'
import { armarCalendario, type Calendario } from '../calendario'

/**
 * INST-07: datos de /calendario-academico. El CMS (colección `calendario-academico`) es la ÚNICA fuente; sin fechas escritas
 * en el código. Spec: docs/specs/portal/CALENDARIO.md §2.4.
 *
 *  - `ok`: hay al menos un bloque activo y válido (se muestra el año académico más reciente).
 *  - `empty`: el CMS respondió sin bloques activos o válidos: aviso neutro, nunca fechas inventadas.
 *  - `unavailable`: el CMS no respondió: aviso neutro con «Intentar de nuevo»; la página no da 500.
 */
export type CalendarioResult = { status: 'ok'; calendario: Calendario } | { status: 'empty' } | { status: 'unavailable' }

/** Registra solo el NOMBRE del error y el código HTTP, nunca el mensaje (puede llevar la URL del CMS). */
function detail(error: unknown): string {
  return error instanceof CmsError ? `${error.name} ${error.status}` : error instanceof Error ? error.name : 'desconocido'
}

/** Lee el CMS y arma el calendario; nunca lanza (ver `CalendarioResult`). */
export async function getCalendario(): Promise<CalendarioResult> {
  let docs: unknown
  try {
    const params = new URLSearchParams({ 'where[activa][equals]': 'true', sort: 'orden', limit: '100', depth: '0' })
    const res = await cmsFetch<PayloadResponse<unknown>>(`/calendario-academico?${params.toString()}`, { tags: ['calendario-academico'] })
    docs = res?.docs
  } catch (error) {
    console.error(`[CALENDARIO] No se pudo leer el CMS (${detail(error)}); se muestra el aviso de no disponible.`)
    return { status: 'unavailable' }
  }
  if (!Array.isArray(docs)) {
    console.error('[CALENDARIO] Respuesta inesperada del CMS (sin lista de documentos); se muestra el aviso de no disponible.')
    return { status: 'unavailable' }
  }
  const calendario = armarCalendario(docs)
  return calendario ? { status: 'ok', calendario } : { status: 'empty' }
}
