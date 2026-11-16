import { cmsFetch } from '../client'
import { CmsError } from '../errors'
import { isPlainObject } from '../titulos'
import { mapInstitucional, type InstitucionalData } from '../institucional'

export type { InstitucionalData, InstitucionalSeccion } from '../institucional'

/**
 * INST-01: contenido del hub /institucional. El CMS (global `institucional`) es la ÚNICA fuente.
 * Spec: docs/specs/portal/INSTITUCIONAL-TRANSPARENCIA.md §2.5.
 *
 *  - `ok`: hay título, descripción, quiénes somos y al menos una sección con destino válido.
 *  - `empty`: el CMS respondió pero sin contenido publicable: aviso neutro, NUNCA contenido escrito en el código.
 *  - `unavailable`: el CMS no respondió o devolvió una forma inesperada: aviso neutro; la página no da 500.
 */
export type InstitucionalResult =
  | { status: 'ok'; data: InstitucionalData }
  | { status: 'empty' }
  | { status: 'unavailable' }

/** Red de seguridad si se pierde el aviso de revalidación del CMS; el camino normal son las etiquetas. */
const SAFETY_REVALIDATE_SECONDS = 3600

/** Lee el CMS y mapea; nunca lanza (ver `InstitucionalResult`). */
export async function getInstitucional(): Promise<InstitucionalResult> {
  let raw: unknown
  try {
    raw = await cmsFetch<unknown>('/globals/institucional?depth=0', {
      tags: ['institucional'],
      next: { revalidate: SAFETY_REVALIDATE_SECONDS },
    })
  } catch (error) {
    // Se registra el NOMBRE del error y el código HTTP, nunca el mensaje (puede llevar la URL del CMS o credenciales).
    const detail = error instanceof CmsError ? `${error.name} ${error.status}` : error instanceof Error ? error.name : 'desconocido'
    console.error(`[INSTITUCIONAL] No se pudo leer el CMS (${detail}); se muestra el aviso de no disponible.`)
    return { status: 'unavailable' }
  }
  if (!isPlainObject(raw)) {
    console.error('[INSTITUCIONAL] Respuesta inesperada del CMS (no es un objeto); se muestra el aviso de no disponible.')
    return { status: 'unavailable' }
  }
  const data = mapInstitucional(raw)
  return data ? { status: 'ok', data } : { status: 'empty' }
}
