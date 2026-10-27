import { cmsFetch } from '../client'
import { safeLogoPath } from '@/lib/awards/logoPath'
import { safeHref } from '@/lib/security/safeUrl'

/**
 * PRA-02: acreditaciones de carreras y programas para la portada.
 * Regla de visualización (spec §3.3/§3.6): solo filas `active` Y `verificado`; las de vigencia vencida se
 * ocultan; se muestra la vigencia (año) solo si existe; `resolucion`, `ciclo` y `nota` no se piden ni se
 * muestran. Nunca se usan datos demo. Facultades sin filas visibles no aparecen.
 */

export interface AccreditationFaculty {
  id: number | string
  nombre: string
  siglas?: string
  logoSrc?: string
}

export interface Accreditation {
  id: number | string
  programa: string
  facultad?: AccreditationFaculty
  sede?: string
  organism: string
  modelo?: string
  /** Año de `vigenciaHasta`; `undefined` si el CMS no lo tiene (no se inventa). */
  vigenciaAnio?: number
  fuenteUrl?: string
  orden: number
}

export interface AccreditationGroup {
  key: string
  nombre: string
  siglas?: string
  logoSrc?: string
  items: Accreditation[]
}

/** Tope de filas por consulta (PERF-DB). */
const MAX_ACCREDITATIONS = 100

/** Campos pedidos: sin `resolucion`, `ciclo`, `nota` ni `carrera`. */
const SELECT_FIELDS = [
  'programa',
  'facultad',
  'sede',
  'organismo',
  'modelo',
  'vigenciaHasta',
  'fuenteUrl',
  'orden',
  'active',
  'verificado',
] as const

/** Campos de la facultad poblada (evita traer descripción, decano ni email). */
const FACULTY_POPULATE = ['nombre', 'siglas', 'logoPath'] as const

type Raw = Record<string, unknown>
const isObj = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v)
const text = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

function mapFaculty(v: unknown): AccreditationFaculty | undefined {
  if (!isObj(v)) return undefined // un id sin poblar equivale a «sin facultad confirmada»
  const nombre = text(v.nombre)
  if (!nombre || (typeof v.id !== 'number' && typeof v.id !== 'string')) return undefined
  return { id: v.id, nombre, siglas: text(v.siglas), logoSrc: safeLogoPath(v.logoPath, 'facultades') }
}

/**
 * Convierte filas crudas en datos de presentación. PRA-02. Revalida `active`/`verificado` (defensa en
 * profundidad tras el `where`), descarta vencidas (`vigenciaHasta` anterior a `now`) y neutraliza fuente
 * y logo. Amenaza que evita: publicar una acreditación ya vencida o con enlace/ruta manipulados.
 * Límite: `now` se inyecta para poder probar; la vigencia es solo la del CMS, no se consulta a ANEAES.
 */
export function mapAccreditations(rows: unknown, now: Date = new Date()): Accreditation[] {
  if (!Array.isArray(rows)) return []
  const out: Accreditation[] = []
  for (const row of rows) {
    if (!isObj(row) || row.active !== true || row.verificado !== true) continue
    const programa = text(row.programa)
    if (!programa || (typeof row.id !== 'number' && typeof row.id !== 'string')) continue
    let vigenciaAnio: number | undefined
    if (row.vigenciaHasta) {
      const until = new Date(String(row.vigenciaHasta))
      if (!Number.isNaN(until.getTime())) {
        if (until.getTime() < now.getTime()) continue
        vigenciaAnio = until.getUTCFullYear()
      }
    }
    const href = safeHref(row.fuenteUrl)
    out.push({
      id: row.id,
      programa,
      facultad: mapFaculty(row.facultad),
      sede: text(row.sede),
      organism: text(row.organismo) ?? 'otro',
      modelo: text(row.modelo),
      vigenciaAnio,
      fuenteUrl: href.startsWith('https://') ? href : undefined,
      orden: typeof row.orden === 'number' ? row.orden : 0,
    })
  }
  return out
}

/**
 * Agrupa por facultad para las tarjetas. PRA-02. Orden: grupos por la menor `orden` de sus filas (y
 * nombre); filas por `orden` y nombre; las filas sin facultad confirmada van en un grupo final sin logo
 * (así un posgrado verificado no se pierde, pero tampoco se le atribuye una facultad sin fuente).
 * No genera grupos vacíos. Límite: puro y sin I/O.
 */
export function groupAccreditationsByFaculty(items: Accreditation[]): AccreditationGroup[] {
  const byFaculty = new Map<string, AccreditationGroup>()
  const orphan: Accreditation[] = []
  for (const item of items) {
    if (!item.facultad) {
      orphan.push(item)
      continue
    }
    const key = `f-${item.facultad.id}`
    const group = byFaculty.get(key) ?? {
      key,
      nombre: item.facultad.nombre,
      siglas: item.facultad.siglas,
      logoSrc: item.facultad.logoSrc,
      items: [],
    }
    group.items.push(item)
    byFaculty.set(key, group)
  }
  const sortItems = (a: Accreditation, b: Accreditation) => a.orden - b.orden || a.programa.localeCompare(b.programa, 'es')
  const minOrden = (g: AccreditationGroup) => Math.min(...g.items.map((i) => i.orden))
  const groups = [...byFaculty.values()]
    .map((g) => ({ ...g, items: [...g.items].sort(sortItems) }))
    .sort((a, b) => minOrden(a) - minOrden(b) || a.nombre.localeCompare(b.nombre, 'es'))
  if (orphan.length > 0) groups.push({ key: 'sin-facultad', nombre: '', items: orphan.sort(sortItems) })
  return groups
}

/**
 * Acreditaciones visibles en portada. PRA-02. CMS caído o respuesta inválida -> `[]` (la sección se
 * oculta; la portada sigue). Etiquetas ISR: `acreditaciones` y `facultades` (el logo/siglas viven allí).
 * `depth=1` + `populate` mínimo de facultad (PERF-DB). Límite: un `[]` por caída se cachea hasta la
 * siguiente revalidación por etiqueta.
 */
export async function getAccreditations(now: Date = new Date()): Promise<AccreditationGroup[]> {
  try {
    const params = new URLSearchParams()
    params.append('where[active][equals]', 'true')
    params.append('where[verificado][equals]', 'true')
    params.append('sort', 'orden')
    params.append('limit', String(MAX_ACCREDITATIONS))
    params.append('depth', '1')
    for (const f of SELECT_FIELDS) params.append(`select[${f}]`, 'true')
    for (const f of FACULTY_POPULATE) params.append(`populate[facultades][${f}]`, 'true')
    const res = await cmsFetch<{ docs?: unknown }>(`/acreditaciones?${params.toString()}`, {
      tags: ['acreditaciones', 'facultades'],
    })
    return groupAccreditationsByFaculty(mapAccreditations(res.docs, now))
  } catch {
    return []
  }
}
