import { cmsFetch } from '../client'
import { groupAuthorities, mapAuthorities, type Authority, type AuthoritySections, type PayloadAuthority } from '../authorities'
import { resolveMediaUrl } from '../mediaUrl'

export type { Authority, AuthorityType, AuthoritySections } from '../authorities'

/**
 * AUT-01: autoridades de la página /autoridades. El CMS (colección `autoridades`) es la ÚNICA fuente:
 * la página no lleva personas escritas a mano.
 *
 * Resultado de `getAuthoritySections`:
 *  - `ok`: el CMS respondió con al menos una autoridad activa y válida; manda siempre sobre cualquier otro dato.
 *  - `empty`: el CMS respondió bien pero no hay autoridades activas. La página muestra un aviso vacío:
 *    NUNCA personas de respaldo, porque un nombre de rector obsoleto escrito en el código es un dato
 *    institucional falso que nadie ve ni puede corregir desde el panel.
 *  - `unavailable`: el CMS no respondió o devolvió una forma inesperada (resiliencia: la página no se rompe,
 *    muestra un aviso neutro y no inventa datos). Con la caché de datos de Next, tras la primera carga correcta
 *    una caída posterior sigue sirviendo la última respuesta buena; este estado solo aparece si nunca hubo una.
 */
export type AuthoritySectionsResult =
  | { status: 'ok'; sections: AuthoritySections }
  | { status: 'empty' }
  | { status: 'unavailable' }

/** Campos pedidos al CMS: solo lo que pinta la página (sin `active`, que ya filtra el `where`). */
const SELECT_FIELDS = ['name', 'role', 'type', 'faculty', 'photo', 'cvFile', 'cvUrl', 'bio', 'email', 'order']

/**
 * Campos de las relaciones: con `depth=1` Payload devolvería la media entera (sizes, filename, focal…) y la
 * facultad completa. `populate` los reduce a lo que usa la página.
 */
const POPULATE_FIELDS: Record<string, string[]> = {
  // `filename` es obligatorio: `url` es un campo calculado a partir de él; sin pedirlo, Payload devuelve `url: null`.
  media: ['url', 'filename', 'alt', 'blurDataURL'],
  facultades: ['nombre', 'slug'],
}

/** Tope de filas: el equipo directivo son decenas, no cientos (PERF-DB: sin consultas sin cota). */
const MAX_AUTHORITIES = 100

/**
 * Red de seguridad: si el hook de revalidación del CMS se pierde (el portal estaba caído; no hay cola), la
 * página igual se actualiza como máximo en 1 hora. La invalidación por etiqueta sigue siendo el camino normal.
 */
const SAFETY_REVALIDATE_SECONDS = 3600

function buildQuery(): string {
  const params = new URLSearchParams()
  params.set('where[active][equals]', 'true')
  params.set('sort', 'order')
  params.set('limit', String(MAX_AUTHORITIES))
  params.set('depth', '1')
  for (const f of SELECT_FIELDS) params.set(`select[${f}]`, 'true')
  for (const [collection, fields] of Object.entries(POPULATE_FIELDS)) {
    for (const f of fields) params.set(`populate[${collection}][${f}]`, 'true')
  }
  return `/autoridades?${params.toString()}`
}

interface PayloadResponse {
  docs?: PayloadAuthority[]
}

/** Lanza si el CMS falla; ver `getAuthoritySections` para la versión que la página consume. */
export async function getAuthorities(): Promise<Authority[]> {
  const data = await cmsFetch<PayloadResponse>(buildQuery(), {
    // `facultades`: el nombre de la facultad de cada decano viene de esa colección.
    tags: ['autoridades', 'facultades'],
    next: { revalidate: SAFETY_REVALIDATE_SECONDS },
  })
  if (!Array.isArray(data?.docs)) throw new Error('Respuesta inesperada del CMS en /autoridades')
  return mapAuthorities(data.docs, (url) => resolveMediaUrl(url))
}

/** Lee las autoridades del CMS y las reparte en secciones; nunca lanza (ver `AuthoritySectionsResult`). */
export async function getAuthoritySections(): Promise<AuthoritySectionsResult> {
  let list: Authority[]
  try {
    list = await getAuthorities()
  } catch {
    return { status: 'unavailable' }
  }
  return list.length === 0 ? { status: 'empty' } : { status: 'ok', sections: groupAuthorities(list) }
}
