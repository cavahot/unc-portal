import { cmsFetch } from '../client'
import { CmsError } from '../errors'
import { isPlainObject, mapTitulosInscripcion, type TitulosInscripcionData } from '../titulos'

export type { TitulosInscripcionData, TituloTipo, TituloPaso, TituloAcento } from '../titulos'

/**
 * TITULOS-01: contenido de /titulos. El CMS (global `titulos-inscripcion`) es la ÚNICA fuente.
 * Spec: docs/specs/portal/TITULOS.md §2.2.
 *
 *  - `ok`: hay título, descripción, unidad, al menos un tipo con requisitos y al menos un paso.
 *  - `empty`: el CMS respondió pero sin contenido publicable: aviso neutro, NUNCA contenido escrito en el código
 *    (una lista de requisitos o un arancel en el código queda vieja sin que nadie pueda corregirla desde el panel).
 *  - `unavailable`: el CMS no respondió o devolvió una forma inesperada: aviso neutro; la página no da 500.
 *    Con la caché de datos de Next, tras una carga correcta una caída posterior sigue sirviendo la última respuesta
 *    buena; este estado solo aparece si nunca la hubo.
 */
export type TitulosResult =
  | { status: 'ok'; data: TitulosInscripcionData }
  | { status: 'empty' }
  | { status: 'unavailable' }

/** Red de seguridad si se pierde el aviso de revalidación del CMS; el camino normal son las etiquetas. */
const SAFETY_REVALIDATE_SECONDS = 3600

/** Lee el CMS y mapea; nunca lanza (ver `TitulosResult`). */
export async function getTitulosInscripcion(): Promise<TitulosResult> {
  let raw: unknown
  try {
    // `depth=1` puebla la relación `arancel`: el monto sale de la fila de Aranceles del Rectorado.
    // Dos etiquetas: la del global y la de aranceles, para que editar el monto refresque también /titulos.
    raw = await cmsFetch<unknown>('/globals/titulos-inscripcion?depth=1', {
      tags: ['titulos-inscripcion', 'aranceles-rectorado'],
      next: { revalidate: SAFETY_REVALIDATE_SECONDS },
    })
  } catch (error) {
    // Se registra el NOMBRE del error y, si lo hay, el código HTTP: nunca el mensaje, que puede llevar la URL del
    // CMS o credenciales. Así una caída no queda muda en los registros y el visitante ve el aviso en el diseño.
    const detail = error instanceof CmsError ? `${error.name} ${error.status}` : error instanceof Error ? error.name : 'desconocido'
    console.error(`[TITULOS] No se pudo leer el CMS (${detail}); se muestra el aviso de no disponible.`)
    return { status: 'unavailable' }
  }
  if (!isPlainObject(raw)) {
    console.error('[TITULOS] Respuesta inesperada del CMS (no es un objeto); se muestra el aviso de no disponible.')
    return { status: 'unavailable' }
  }
  const data = mapTitulosInscripcion(raw)
  return data ? { status: 'ok', data } : { status: 'empty' }
}
