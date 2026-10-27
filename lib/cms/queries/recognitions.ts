import { cmsFetch } from '../client'
import { safeLogoPath } from '@/lib/awards/logoPath'
import { safeHref } from '@/lib/security/safeUrl'

/**
 * PRA-02: reconocimientos (p. ej. Premio Nacional a la Calidad) para la portada.
 * Regla de visualización (spec PREMIOS-ACREDITACIONES.md §3.3/§3.6): solo se muestra lo que el panel marcó
 * `active` Y `verificado`; cada edición además necesita su propio `verificado` y una fuente https.
 * Lo que falte se omite: nunca se rellena con datos demo (ni en desarrollo).
 */

export interface RecognitionEdition {
  anio: number
  distincion: string
  categoria?: string
  fuenteUrl: string
}

export interface Recognition {
  id: number | string
  nombre: string
  entidad?: string
  sitioOficial?: string
  logoSrc?: string
  logoAlt: string
  ediciones: RecognitionEdition[]
}

/** Tope de reconocimientos en portada (PERF-DB: sin consultas sin cota). */
const MAX_RECOGNITIONS = 5

/** Campos mínimos pedidos al CMS: excluye `nota` (interna) del reconocimiento y de cada edición. */
const SELECT_PATHS = [
  'nombre',
  'entidad',
  'sitioOficial',
  'logoPath',
  'logoAlt',
  'orden',
  'active',
  'verificado',
  'ediciones][anio',
  'ediciones][distincion',
  'ediciones][categoria',
  'ediciones][fuenteUrl',
  'ediciones][verificado',
] as const

type Raw = Record<string, unknown>
const isObj = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v)
const text = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

/** Solo enlaces `https://`: una fuente o sitio oficial `http:` se degrada a «sin enlace». */
function safeHttps(v: unknown): string | undefined {
  const href = safeHref(v)
  return href.startsWith('https://') ? href : undefined
}

/**
 * Convierte filas crudas del CMS en datos de presentación. PRA-02. Segunda barrera tras el `where`
 * de la consulta (defensa en profundidad): revalida `active`, `verificado`, año, fuente https y ruta de
 * logo. Amenaza que evita: mostrar una distinción no confirmada o un enlace `javascript:` si el filtro
 * del CMS cambia o llega un registro antiguo. Límite: no verifica que la fuente diga lo que el panel afirma.
 */
export function mapRecognitions(rows: unknown): Recognition[] {
  if (!Array.isArray(rows)) return []
  const out: Recognition[] = []
  for (const row of rows) {
    if (!isObj(row) || row.active !== true || row.verificado !== true) continue
    const nombre = text(row.nombre)
    if (!nombre) continue
    const ediciones: RecognitionEdition[] = []
    for (const e of Array.isArray(row.ediciones) ? row.ediciones : []) {
      if (!isObj(e) || e.verificado !== true) continue
      const fuenteUrl = safeHttps(e.fuenteUrl)
      const anio = e.anio
      if (!fuenteUrl || typeof anio !== 'number' || !Number.isInteger(anio) || anio < 1990 || anio > 2100) continue
      ediciones.push({ anio, distincion: text(e.distincion) ?? '', categoria: text(e.categoria), fuenteUrl })
    }
    if (ediciones.length === 0) continue
    ediciones.sort((a, b) => b.anio - a.anio)
    out.push({
      id: typeof row.id === 'number' || typeof row.id === 'string' ? row.id : nombre,
      nombre,
      entidad: text(row.entidad),
      sitioOficial: safeHttps(row.sitioOficial),
      logoSrc: safeLogoPath(row.logoPath, 'reconocimientos'),
      logoAlt: text(row.logoAlt) ?? nombre,
      ediciones,
    })
  }
  return out
}

/**
 * Reconocimientos visibles en portada. PRA-02. Si el CMS cae o responde mal devuelve `[]` y la sección
 * se oculta: la portada nunca falla ni muestra datos demo por este bloque (a diferencia de Tribunal, que
 * propaga el error; aquí propagarlo rompería toda la home). Etiqueta ISR: `reconocimientos`.
 * Límite: un `[]` por caída se cachea hasta la siguiente revalidación por etiqueta.
 */
export async function getRecognitions(): Promise<Recognition[]> {
  try {
    const params = new URLSearchParams()
    params.append('where[active][equals]', 'true')
    params.append('where[verificado][equals]', 'true')
    params.append('sort', 'orden')
    params.append('limit', String(MAX_RECOGNITIONS))
    params.append('depth', '0')
    for (const path of SELECT_PATHS) params.append(`select[${path}]`, 'true')
    const res = await cmsFetch<{ docs?: unknown }>(`/reconocimientos?${params.toString()}`, {
      tags: ['reconocimientos'],
    })
    return mapRecognitions(res.docs)
  } catch {
    return []
  }
}
