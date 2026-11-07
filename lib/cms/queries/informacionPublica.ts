import { cmsFetch } from '../client'
import { CmsError } from '../errors'
import { isPlainObject } from '../titulos'
import { mapInformacionPublica, type InformacionPublicaData } from '../informacionPublica'

export type { InformacionPublicaData, InfoVia } from '../informacionPublica'

/**
 * INST-01: contenido de /informacion-publica. El CMS (global `informacion-publica`) es la ÚNICA fuente.
 * Spec: docs/specs/portal/INSTITUCIONAL-TRANSPARENCIA.md §2.5.
 *
 *  - `ok`: hay título, descripción, ley, correo y al menos una vía.
 *  - `empty`: el CMS respondió pero sin contenido publicable: aviso neutro, NUNCA contenido escrito en el código.
 *  - `unavailable`: el CMS no respondió o devolvió una forma inesperada: aviso neutro; la página no da 500.
 */
export type InformacionPublicaResult =
  | { status: 'ok'; data: InformacionPublicaData }
  | { status: 'empty' }
  | { status: 'unavailable' }

/** Red de seguridad si se pierde el aviso de revalidación del CMS; el camino normal son las etiquetas. */
const SAFETY_REVALIDATE_SECONDS = 3600

/** Lee el CMS y mapea; nunca lanza (ver `InformacionPublicaResult`). */
export async function getInformacionPublica(): Promise<InformacionPublicaResult> {
  let raw: unknown
  try {
    raw = await cmsFetch<unknown>('/globals/informacion-publica?depth=0', {
      tags: ['informacion-publica'],
      next: { revalidate: SAFETY_REVALIDATE_SECONDS },
    })
  } catch (error) {
    // Se registra el NOMBRE del error y el código HTTP, nunca el mensaje (puede llevar la URL del CMS o credenciales).
    const detail = error instanceof CmsError ? `${error.name} ${error.status}` : error instanceof Error ? error.name : 'desconocido'
    console.error(`[INFO-PUBLICA] No se pudo leer el CMS (${detail}); se muestra el aviso de no disponible.`)
    return { status: 'unavailable' }
  }
  if (!isPlainObject(raw)) {
    console.error('[INFO-PUBLICA] Respuesta inesperada del CMS (no es un objeto); se muestra el aviso de no disponible.')
    return { status: 'unavailable' }
  }
  const data = mapInformacionPublica(raw)
  return data ? { status: 'ok', data } : { status: 'empty' }
}
