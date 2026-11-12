import { cmsFetch } from '../client'
import { CmsError } from '../errors'
import type { PayloadResponse } from '../types'

/**
 * FAC-05: datos del listado /facultades. El CMS (colecciones `facultades` y `carreras`) es la ÚNICA fuente.
 *
 *  - `ok`: hay al menos una facultad activa.
 *  - `empty`: el CMS respondió sin facultades activas: aviso neutro, nunca nombres escritos en el código.
 *  - `unavailable`: el CMS no respondió: aviso neutro con «Intentar de nuevo»; la página no da 500.
 *
 * Por qué una consulta nueva y no `getFacultades`: esa función, ante un error, devuelve seis facultades escritas en el
 * código (con slugs que no existen en el CMS) y un listado así se vería como oficial sin serlo. Aquí un error es un
 * estado visible. Límite: si las carreras no cargan, la facultad se muestra igual, solo que sin su conteo (`carreras: null`)
 * en vez de un «0 carreras» falso.
 */
export interface FacultadResumen {
  slug: string
  nombre: string
  descripcion?: string
  /** Carreras activas de la facultad; `null` si no se pudo contar. */
  carreras: number | null
}

export type FacultadesListaResult =
  | { status: 'ok'; facultades: FacultadResumen[] }
  | { status: 'empty' }
  | { status: 'unavailable' }

interface FacultadDoc {
  slug?: unknown
  nombre?: unknown
  descripcion?: unknown
}

interface CarreraDoc {
  facultad?: { slug?: unknown } | number | string | null
}

/** Registra solo el NOMBRE del error y el código HTTP, nunca el mensaje (puede llevar la URL del CMS). */
function logFallo(etiqueta: string, error: unknown): void {
  const detail = error instanceof CmsError ? `${error.name} ${error.status}` : error instanceof Error ? error.name : 'desconocido'
  console.error(`[FACULTADES] ${etiqueta} (${detail}).`)
}

export async function getFacultadesLista(): Promise<FacultadesListaResult> {
  let docs: FacultadDoc[]
  try {
    const params = new URLSearchParams({ 'where[activa][equals]': 'true', sort: 'nombre', limit: '100', depth: '0' })
    const res = await cmsFetch<PayloadResponse<FacultadDoc>>(`/facultades?${params.toString()}`, { tags: ['facultades'] })
    docs = Array.isArray(res?.docs) ? res.docs : []
  } catch (error) {
    logFallo('No se pudo leer el listado de facultades; se muestra el aviso de no disponible', error)
    return { status: 'unavailable' }
  }

  const validas = docs.filter(
    (d): d is FacultadDoc & { slug: string; nombre: string } =>
      typeof d.slug === 'string' && d.slug.trim() !== '' && typeof d.nombre === 'string' && d.nombre.trim() !== '',
  )
  if (validas.length === 0) return { status: 'empty' }

  // Conteo de carreras por facultad. Si falla, se omite el conteo (no se inventa un cero).
  const conteo = new Map<string, number>()
  let conteoOk = true
  try {
    const params = new URLSearchParams({ 'where[activa][equals]': 'true', limit: '500', depth: '1' })
    const res = await cmsFetch<PayloadResponse<CarreraDoc>>(`/carreras?${params.toString()}`, { tags: ['carreras'] })
    for (const c of res?.docs ?? []) {
      const slug = typeof c.facultad === 'object' && c.facultad !== null ? c.facultad.slug : null
      if (typeof slug === 'string') conteo.set(slug, (conteo.get(slug) ?? 0) + 1)
    }
  } catch (error) {
    conteoOk = false
    logFallo('No se pudieron contar las carreras; se muestran las facultades sin conteo', error)
  }

  return {
    status: 'ok',
    facultades: validas.map((d) => ({
      slug: d.slug,
      nombre: d.nombre,
      descripcion: typeof d.descripcion === 'string' && d.descripcion.trim() ? d.descripcion.trim() : undefined,
      carreras: conteoOk ? (conteo.get(d.slug) ?? 0) : null,
    })),
  }
}
