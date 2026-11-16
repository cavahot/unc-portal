// INST-04: modelo de las páginas /carreras y /carreras/[slug]. Puro, sin red ni React.
// Qué hace: convierte filas de la colección `carreras` del CMS (con la facultad poblada) en elementos del catálogo y los
// agrupa por facultad y tipo (grado / posgrado). Reutiliza `mapResoluciones` de la página de facultad, así que el número
// de resolución CONES y su enlace se validan igual en los dos lugares (host exacto de `RESOLUCION_HOSTS`).
// Por qué existe: la página anterior mostraba solo duración, título y modalidad, que el CMS tiene en 7, 8 y 12 de las 62
// carreras, e ignoraba lo que sí está en todas (sede, tipo y resoluciones). Nunca completa un dato que falta.
// Amenazas: un enlace de resolución con host ajeno o `javascript:`; una carrera perdida en silencio por un tipo
// desconocido (se conserva, sin tipo); una ruta armada con un slug libre (se codifica con `encodeURIComponent`).
// Límite: confía en que el CMS ya filtra las inactivas para el público (se descartan también aquí por defensa).
import { mapResoluciones, type Resolucion } from '@/lib/cms/facultad'

type Raw = Record<string, unknown>
const isObj = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v)
const text = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

export type CarreraTipo = 'grado' | 'posgrado'

export interface CarreraCatalogo {
  id: number | string
  slug: string
  nombre: string
  /** `undefined` si el CMS no lo trae o trae un valor desconocido (la carrera no se oculta). */
  tipo?: CarreraTipo
  sede?: string
  modalidad?: string
  duracion?: number
  titulo?: string
  descripcion?: string
  perfil?: string
  resoluciones: Resolucion[]
  orden: number
  facultad: { slug: string; nombre: string } | null
}

const DEFAULT_ORDEN = 99

/** Una fila de `carreras` -> elemento del catálogo, o `null` si no sirve (sin id, slug o nombre, o inactiva). */
export function mapCarreraCatalogo(row: unknown): CarreraCatalogo | null {
  if (!isObj(row) || row.activa === false) return null
  const id = row.id
  const slug = text(row.slug)
  const nombre = text(row.nombre)
  if (!(typeof id === 'number' || (typeof id === 'string' && id !== '')) || !slug || !nombre) return null
  const fac = isObj(row.facultad) ? row.facultad : null
  const facSlug = fac ? text(fac.slug) : undefined
  const facNombre = fac ? text(fac.nombre) : undefined
  return {
    id,
    slug,
    nombre,
    tipo: row.tipo === 'grado' || row.tipo === 'posgrado' ? row.tipo : undefined,
    sede: text(row.sede),
    modalidad: text(row.modalidad),
    duracion: typeof row.duracion === 'number' && row.duracion > 0 && row.duracion <= 12 ? row.duracion : undefined,
    titulo: text(row.titulo),
    descripcion: text(row.descripcion),
    perfil: text(row.perfil),
    resoluciones: mapResoluciones(row),
    orden: typeof row.orden === 'number' && Number.isFinite(row.orden) ? row.orden : DEFAULT_ORDEN,
    facultad: facSlug && facNombre ? { slug: facSlug, nombre: facNombre } : null,
  }
}

export interface GrupoFacultad {
  /** Clave estable del grupo (slug de la facultad o `sin-facultad`). */
  key: string
  /** `null` para las carreras sin facultad asignada. */
  facultad: { slug: string; nombre: string } | null
  total: number
  /** Solo los tipos que tienen carreras, en el orden grado, posgrado, otros. */
  listas: Array<{ tipo: CarreraTipo | 'otros'; items: CarreraCatalogo[] }>
}

const porOrden = (a: CarreraCatalogo, b: CarreraCatalogo) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es')

/**
 * Filas del CMS -> grupos por facultad (orden alfabético por nombre; las carreras sin facultad al final), cada uno con
 * sus carreras de grado, posgrado y sin tipo ordenadas por `orden` y nombre. Descarta filas inválidas.
 */
export function agruparPorFacultad(rows: unknown): GrupoFacultad[] {
  const items = (Array.isArray(rows) ? rows : []).map(mapCarreraCatalogo).filter((c): c is CarreraCatalogo => c !== null)
  const grupos = new Map<string, CarreraCatalogo[]>()
  for (const c of items) {
    const key = c.facultad?.slug ?? 'sin-facultad'
    grupos.set(key, [...(grupos.get(key) ?? []), c])
  }
  return [...grupos.entries()]
    .map(([key, list]): GrupoFacultad => {
      const ordenadas = [...list].sort(porOrden)
      const listas = (['grado', 'posgrado', 'otros'] as const)
        .map((tipo) => ({ tipo, items: ordenadas.filter((c) => (c.tipo ?? 'otros') === tipo) }))
        .filter((l) => l.items.length > 0)
      return { key, facultad: list[0].facultad, total: list.length, listas }
    })
    .sort((a, b) => {
      if (a.facultad === null) return 1
      if (b.facultad === null) return -1
      return a.facultad.nombre.localeCompare(b.facultad.nombre, 'es')
    })
}
