import { cmsFetch } from '../client'
import { CmsError } from '../errors'
import { isPlainObject, mapPilares, type Pilar, type PilarKey, type PilaresData } from '../pilares'
import { getStatsResult } from './stats'

export type { Pilar, PilarKey, PilaresData } from '../pilares'

/**
 * PILARES-01: pilares académicos de la portada y de /docencia, /investigacion y /extension. Fuente única: el global
 * `pilares-academicos` del CMS; las métricas vinculadas leen `estadisticas`. Spec: docs/specs/portal/PILARES-ACADEMICOS.md.
 *
 *  - `ok`: al menos un pilar publicable (título, descripción y texto del botón).
 *  - `empty`: el CMS respondió sin pilares publicables: la franja se ve sin tarjetas; nunca contenido del código.
 *  - `unavailable`: el CMS no respondió o devolvió otra forma: igual que `empty` para el visitante; no da 500.
 */
export type PilaresResult = { status: 'ok'; data: PilaresData } | { status: 'empty' } | { status: 'unavailable' }

/** Red de seguridad si se pierde el aviso de revalidación del CMS; el camino normal son las etiquetas. */
const SAFETY_REVALIDATE_SECONDS = 3600

/** Lee el CMS y mapea; nunca lanza. */
export async function getPilaresAcademicos(locale: string): Promise<PilaresResult> {
  let raw: unknown
  try {
    raw = await cmsFetch<unknown>('/globals/pilares-academicos?depth=0', {
      tags: ['pilares-academicos'],
      next: { revalidate: SAFETY_REVALIDATE_SECONDS },
    })
  } catch (error) {
    // Solo el nombre del error y el código HTTP: el mensaje puede llevar la URL interna del CMS.
    const detail = error instanceof CmsError ? `${error.name} ${error.status}` : error instanceof Error ? error.name : 'desconocido'
    console.error(`[PILARES] No se pudo leer el CMS (${detail}); la franja se muestra sin tarjetas.`)
    return { status: 'unavailable' }
  }
  if (!isPlainObject(raw)) {
    console.error('[PILARES] Respuesta inesperada del CMS (no es un objeto).')
    return { status: 'unavailable' }
  }
  // Las cifras vinculadas salen de «Estadísticas»; si esa lectura falla, esas métricas se omiten (no se inventan).
  const { stats } = await getStatsResult()
  const data = mapPilares(raw, stats, locale)
  return data.length > 0 ? { status: 'ok', data } : { status: 'empty' }
}

/** Resultado para la página de un pilar: el pilar si es publicable; si no, el estado de la consulta. */
export type PilarResult = { status: 'ok'; pilar: Pilar } | { status: 'empty' } | { status: 'unavailable' }

export async function getPilar(key: PilarKey, locale: string): Promise<PilarResult> {
  const result = await getPilaresAcademicos(locale)
  if (result.status !== 'ok') return result
  const pilar = result.data.find((p) => p.key === key)
  return pilar ? { status: 'ok', pilar } : { status: 'empty' }
}
