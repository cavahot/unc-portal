import { cmsFetch } from '../client'
import { mapAuthorities, type Authority, type PayloadAuthority } from '../authorities'
import { resolveMediaUrl } from '../mediaUrl'
import {
  groupArancelesFacultad,
  mapArancelesFacultad,
  mapCarreras,
  mapFacultad,
  type ArancelFacultad,
  type ArancelFacultadGrupo,
  type CarreraItem,
  type FacultadDetalle,
} from '../facultad'
import { mapAccreditations, type Accreditation } from './accreditations'

/**
 * FAC-01: datos de la página de una facultad (spec docs/specs/portal/FACULTADES.md §2). El CMS es la ÚNICA fuente:
 * sin datos de demostración. Hace cinco pedidos EN PARALELO, todos filtrados por el slug de la facultad (una sola
 * ida y vuelta de red): facultad, carreras, decano, acreditaciones y aranceles.
 *
 *  - `ok`: la facultad existe y está activa. Cada sección trae lo suyo; si un pedido secundario falla, esa sección
 *    queda vacía (carreras distingue `empty` de `unavailable` para mostrar el aviso correcto).
 *  - `not-found`: no existe o está inactiva -> la página responde 404.
 *  - `unavailable`: el CMS no respondió al pedir la facultad -> aviso neutro, nunca un 500 ni datos inventados.
 * Con la caché de datos de Next, tras una carga correcta una caída posterior sigue sirviendo la última respuesta.
 */
export type CarrerasState =
  | { status: 'ok'; grado: CarreraItem[]; posgrado: CarreraItem[] }
  | { status: 'empty' }
  | { status: 'unavailable' }

export type FacultadDetalleResult =
  | {
      status: 'ok'
      facultad: FacultadDetalle
      carreras: CarrerasState
      decano: Authority | null
      acreditaciones: Accreditation[]
      aranceles: Array<{ grupo: ArancelFacultadGrupo; items: ArancelFacultad[] }>
    }
  | { status: 'not-found' }
  | { status: 'unavailable' }

/** Etiquetas ISR: cualquier cambio en estas colecciones refresca la página (el CMS las envía al guardar/borrar). */
export const FACULTAD_TAGS = ['facultades', 'carreras', 'autoridades', 'acreditaciones', 'aranceles-facultad']

/** Red de seguridad si se pierde un aviso de revalidación; el camino normal es la etiqueta. */
const SAFETY_REVALIDATE_SECONDS = 3600

/** Topes por consulta (PERF-DB: sin consultas sin cota). Hoy: 8 carreras, 1 decano, 28 aranceles. */
const LIMITS = { carreras: 100, autoridades: 5, acreditaciones: 50, aranceles: 200 }

const FACULTAD_FIELDS = [
  'nombre', 'slug', 'siglas', 'descripcion', 'historia', 'direccion', 'telefono', 'email',
  'correosAdicionales', 'sitioWeb', 'redes', 'logoPath', 'imagen', 'activa',
]
const CARRERA_FIELDS = [
  'nombre', 'tipo', 'sede', 'modalidad', 'duracion', 'titulo', 'descripcion', 'perfil', 'resoluciones', 'resolucion', 'orden', 'activa',
]
const AUTORIDAD_FIELDS = ['name', 'role', 'type', 'faculty', 'photo', 'cvUrl', 'cvFile', 'email', 'order', 'active']
const ACREDITACION_FIELDS = ['programa', 'facultad', 'sede', 'organismo', 'modelo', 'vigenciaHasta', 'fuenteUrl', 'orden', 'active', 'verificado']
const ARANCEL_FIELDS = ['concepto', 'monto', 'grupo', 'nota', 'orden', 'active']

function query(collection: string, where: Record<string, string>, opts: { fields: string[]; limit: number; depth?: number; sort?: string; populate?: Record<string, string[]> }): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(where)) p.set(`where[${k}][equals]`, v)
  p.set('limit', String(opts.limit))
  p.set('depth', String(opts.depth ?? 0))
  if (opts.sort) p.set('sort', opts.sort)
  for (const f of opts.fields) p.set(`select[${f}]`, 'true')
  for (const [c, fields] of Object.entries(opts.populate ?? {})) for (const f of fields) p.set(`populate[${c}][${f}]`, 'true')
  return `/${collection}?${p.toString()}`
}

/** Pide al CMS y devuelve `docs`; lanza si falla o la forma es inesperada. */
async function docs(path: string): Promise<unknown[]> {
  const data = await cmsFetch<{ docs?: unknown }>(path, { tags: FACULTAD_TAGS, next: { revalidate: SAFETY_REVALIDATE_SECONDS } })
  if (!Array.isArray(data?.docs)) throw new Error('Respuesta inesperada del CMS')
  return data.docs
}

/** Lee la facultad y sus secciones; nunca lanza (ver `FacultadDetalleResult`). */
export async function getFacultadDetalle(slug: string, now: Date = new Date()): Promise<FacultadDetalleResult> {
  const bySlug = { 'facultad.slug': slug }
  const [fac, carreras, autoridades, acreditaciones, aranceles] = await Promise.allSettled([
    // Defensa en profundidad: además de `where`, el acceso de lectura del CMS ya limita a filas activas (SEC-10).
    docs(query('facultades', { slug, activa: 'true' }, { fields: FACULTAD_FIELDS, limit: 1, depth: 1, populate: { media: ['url', 'filename', 'alt'] } })),
    docs(query('carreras', { ...bySlug, activa: 'true' }, { fields: CARRERA_FIELDS, limit: LIMITS.carreras, sort: 'orden' })),
    docs(
      query('autoridades', { 'faculty.slug': slug, type: 'decano', active: 'true' }, {
        fields: AUTORIDAD_FIELDS,
        limit: LIMITS.autoridades,
        depth: 1,
        sort: 'order',
        // `filename` es obligatorio: sin él Payload devuelve `url: null` (ver queries/autoridades.ts).
        populate: { media: ['url', 'filename', 'alt', 'blurDataURL'], facultades: ['nombre', 'slug'] },
      }),
    ),
    docs(query('acreditaciones', { ...bySlug, active: 'true', verificado: 'true' }, { fields: ACREDITACION_FIELDS, limit: LIMITS.acreditaciones, sort: 'orden' })),
    docs(query('aranceles-facultad', { ...bySlug, active: 'true' }, { fields: ARANCEL_FIELDS, limit: LIMITS.aranceles, sort: 'orden' })),
  ])

  if (fac.status === 'rejected') return { status: 'unavailable' }
  const facultad = mapFacultad(fac.value[0], (u) => resolveMediaUrl(u))
  if (!facultad) return { status: 'not-found' }

  let carrerasState: CarrerasState = { status: 'unavailable' }
  if (carreras.status === 'fulfilled') {
    const { grado, posgrado } = mapCarreras(carreras.value)
    carrerasState = grado.length + posgrado.length > 0 ? { status: 'ok', grado, posgrado } : { status: 'empty' }
  }

  const decano =
    autoridades.status === 'fulfilled'
      ? (mapAuthorities(autoridades.value as PayloadAuthority[], (u) => resolveMediaUrl(u)).find((a) => a.type === 'decano') ?? null)
      : null

  return {
    status: 'ok',
    facultad,
    carreras: carrerasState,
    decano,
    // `mapAccreditations` vuelve a exigir active+verificado y descarta las vencidas (nunca se afirma sin evidencia).
    acreditaciones: acreditaciones.status === 'fulfilled' ? mapAccreditations(acreditaciones.value, now) : [],
    aranceles: aranceles.status === 'fulfilled' ? groupArancelesFacultad(mapArancelesFacultad(aranceles.value)) : [],
  }
}
