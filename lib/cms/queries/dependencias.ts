import { cmsFetch } from '../client'
import { CmsError } from '../errors'
import type { PayloadResponse } from '../types'
import { mapDependencias, type Dependencia } from '../dependencias'

/**
 * INST-12: datos de /contacto/dependencias. El CMS (colección `dependencias-contacto`) es la ÚNICA fuente; sin datos en el código.
 * Spec: docs/specs/portal/DEPENDENCIAS.md §2.3.
 *  - `ok`: hay al menos una dependencia activa y válida.
 *  - `empty`: el CMS respondió sin dependencias activas o válidas: aviso neutro.
 *  - `unavailable`: el CMS no respondió o devolvió una forma inesperada: aviso neutro con «Intentar de nuevo»; la página no da 500.
 */
export type DependenciasResult = { status: 'ok'; data: Dependencia[] } | { status: 'empty' } | { status: 'unavailable' }

/** Registra solo el NOMBRE del error y el código HTTP, nunca el mensaje (puede llevar la URL del CMS). */
function detail(error: unknown): string {
  return error instanceof CmsError ? `${error.name} ${error.status}` : error instanceof Error ? error.name : 'desconocido'
}

/** Lee el CMS y arma el directorio; nunca lanza (ver `DependenciasResult`). */
export async function getDependencias(): Promise<DependenciasResult> {
  let docs: unknown
  try {
    const params = new URLSearchParams({ 'where[activa][equals]': 'true', sort: 'orden', limit: '100', depth: '0' })
    const res = await cmsFetch<PayloadResponse<unknown>>(`/dependencias-contacto?${params.toString()}`, { tags: ['dependencias-contacto'] })
    docs = res?.docs
  } catch (error) {
    console.error(`[DEPENDENCIAS] No se pudo leer el CMS (${detail(error)}); se muestra el aviso de no disponible.`)
    return { status: 'unavailable' }
  }
  if (!Array.isArray(docs)) {
    console.error('[DEPENDENCIAS] Respuesta inesperada del CMS (sin lista de documentos); se muestra el aviso de no disponible.')
    return { status: 'unavailable' }
  }
  const data = mapDependencias(docs)
  return data.length > 0 ? { status: 'ok', data } : { status: 'empty' }
}
