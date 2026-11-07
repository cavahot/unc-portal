// INST-11: contenido de /legalizaciones. El CMS (global `legalizaciones`) es la ÚNICA fuente. Spec: docs/specs/portal/LEGALIZACIONES.md §2.3.
// Qué hace: lee el global con las mismas reglas y el mismo mapper que /titulos (`mapTitulosInscripcion`: los dos globals
// comparten campos) y devuelve el estado de la lectura:
//  - `ok`: hay título, descripción, unidad, al menos una categoría con requisitos y al menos un paso.
//  - `empty`: el CMS respondió pero sin contenido publicable: aviso neutro, NUNCA contenido escrito en el código.
//  - `unavailable`: el CMS no respondió o devolvió una forma inesperada: aviso neutro; la página no da 500.
// El arancel sale solo de la fila publicada y enlazada de `aranceles-rectorado` (`depth=1`); si falta, la página enlaza a los
// aranceles. Límite: nunca lanza; registra solo el NOMBRE del error y el código HTTP, nunca el mensaje.
import { cmsFetch } from '../client'
import { CmsError } from '../errors'
import { isPlainObject, mapTitulosInscripcion, type TitulosInscripcionData } from '../titulos'

export type LegalizacionesResult = { status: 'ok'; data: TitulosInscripcionData } | { status: 'empty' } | { status: 'unavailable' }

/** Red de seguridad si se pierde el aviso de revalidación del CMS; el camino normal son las etiquetas. */
const SAFETY_REVALIDATE_SECONDS = 3600

export async function getLegalizaciones(): Promise<LegalizacionesResult> {
  let raw: unknown
  try {
    // Dos etiquetas: la del global y la de aranceles, para que editar el monto refresque también /legalizaciones.
    raw = await cmsFetch<unknown>('/globals/legalizaciones?depth=1', {
      tags: ['legalizaciones', 'aranceles-rectorado'],
      next: { revalidate: SAFETY_REVALIDATE_SECONDS },
    })
  } catch (error) {
    const detail = error instanceof CmsError ? `${error.name} ${error.status}` : error instanceof Error ? error.name : 'desconocido'
    console.error(`[LEGALIZACIONES] No se pudo leer el CMS (${detail}); se muestra el aviso de no disponible.`)
    return { status: 'unavailable' }
  }
  if (!isPlainObject(raw)) {
    console.error('[LEGALIZACIONES] Respuesta inesperada del CMS (no es un objeto); se muestra el aviso de no disponible.')
    return { status: 'unavailable' }
  }
  const data = mapTitulosInscripcion(raw)
  return data ? { status: 'ok', data } : { status: 'empty' }
}
