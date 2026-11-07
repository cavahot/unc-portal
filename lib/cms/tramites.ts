// INST-05: modelo de /tramites (spec docs/specs/portal/TRAMITES.md §2.4). Puro, sin red ni React.
// Qué hace: convierte filas de la colección `tramites` del CMS (con la facultad poblada) en trámites del portal y los
// agrupa por facultad. Es el único lugar donde un dato del CMS pasa a texto de la página.
// Por qué existe: los requisitos estaban escritos en `components/tramites/FacultadTabs.tsx`. Aquí nunca se completa un
// dato que falta ni se escribe uno en el código: un trámite sin título o sin facultad se descarta; un requisito vacío
// se omite; la nota y la descripción solo salen si existen.
// Amenaza: publicar un trámite inactivo (el CMS ya filtra para el público; aquí se descarta también por defensa) o una
// fila corrupta que rompa la página. Límite: el texto se muestra tal cual lo cargó el equipo (no se interpreta HTML).

type Raw = Record<string, unknown>
const isObj = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v)
const text = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

export interface TramiteItem {
  id: number | string
  titulo: string
  etiqueta?: string
  descripcion?: string
  requisitos: string[]
  nota?: string
  orden: number
  facultad: { slug: string; nombre: string }
}

const DEFAULT_ORDEN = 99

/** Una fila de `tramites` -> trámite del portal, o `null` si no sirve (inactiva, sin id, sin título o sin facultad). */
export function mapTramite(row: unknown): TramiteItem | null {
  if (!isObj(row) || row.activa === false) return null
  const id = row.id
  const titulo = text(row.titulo)
  if (!(typeof id === 'number' || (typeof id === 'string' && id !== '')) || !titulo) return null
  const fac = isObj(row.facultad) ? row.facultad : null
  const slug = fac ? text(fac.slug) : undefined
  const nombre = fac ? text(fac.nombre) : undefined
  if (!slug || !nombre) return null
  const requisitos = (Array.isArray(row.requisitos) ? row.requisitos : [])
    .map((r) => (isObj(r) ? text(r.texto) : undefined))
    .filter((t): t is string => Boolean(t))
  return {
    id,
    titulo,
    etiqueta: text(row.etiqueta),
    descripcion: text(row.descripcion),
    requisitos,
    nota: text(row.nota),
    orden: typeof row.orden === 'number' && Number.isFinite(row.orden) ? row.orden : DEFAULT_ORDEN,
    facultad: { slug, nombre },
  }
}

export interface GrupoTramites {
  facultad: { slug: string; nombre: string }
  tramites: TramiteItem[]
}

/** Filas del CMS -> grupos por facultad (orden alfabético), con los trámites por `orden` y título. Descarta filas inválidas. */
export function agruparTramites(rows: unknown): GrupoTramites[] {
  const items = (Array.isArray(rows) ? rows : []).map(mapTramite).filter((t): t is TramiteItem => t !== null)
  const grupos = new Map<string, GrupoTramites>()
  for (const t of items) {
    const g = grupos.get(t.facultad.slug) ?? { facultad: t.facultad, tramites: [] }
    g.tramites.push(t)
    grupos.set(t.facultad.slug, g)
  }
  return [...grupos.values()]
    .map((g) => ({ ...g, tramites: [...g.tramites].sort((a, b) => a.orden - b.orden || a.titulo.localeCompare(b.titulo, 'es')) }))
    .sort((a, b) => a.facultad.nombre.localeCompare(b.facultad.nombre, 'es'))
}
