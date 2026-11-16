// INST-06: modelo de /biblioteca (repositorio de tesis). Puro, sin red ni React.
// Qué hace: convierte filas de la colección `tesis` del CMS (con la facultad poblada) en tesis del portal y normaliza el
// término de búsqueda. Es el único lugar donde un dato del CMS pasa a texto o enlace de la página.
// Amenazas: (1) un enlace de PDF con `javascript:`, `http:` o credenciales incrustadas llegando a un href (solo se
// acepta https sin credenciales; si no, la tesis se muestra sin enlace en vez de con uno peligroso); (2) una fila
// corrupta que rompa la página (se descarta sin título, autor o año válidos); (3) un término de búsqueda enorme o con
// espacios que llegue tal cual al CMS (se recorta y se limita a 100 caracteres).
// Límite: no valida que el PDF exista ni que el host sea de confianza; el texto se muestra tal cual lo cargó el equipo.
import { allowedHttpsHref } from '@/lib/cms/facultad'

type Raw = Record<string, unknown>
const isObj = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v)
const text = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

export interface TesisItem {
  id: number | string
  titulo: string
  autor: string
  anio: number
  facultad?: string
  resumen?: string
  /** Solo https sin credenciales; `undefined` si el CMS no trae un enlace válido. */
  urlPdf?: string
}

/** Longitud máxima del término de búsqueda que se envía al CMS. */
export const MAX_QUERY_LENGTH = 100

/** Término de búsqueda de `?q=`: recortado, sin espacios repetidos y de hasta 100 caracteres; vacío si no es texto. */
export function normalizeQuery(raw: unknown): string {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY_LENGTH).trim()
}

/** Una fila de `tesis` -> tesis del portal, o `null` si no sirve (sin id, título, autor o con un año fuera de rango). */
export function mapTesis(row: unknown): TesisItem | null {
  if (!isObj(row)) return null
  const id = row.id
  const titulo = text(row.titulo)
  const autor = text(row.autor)
  const anio = row.anio
  if (!(typeof id === 'number' || (typeof id === 'string' && id !== '')) || !titulo || !autor) return null
  if (typeof anio !== 'number' || !Number.isInteger(anio) || anio < 1900 || anio > 2100) return null
  const fac = isObj(row.facultad) ? text(row.facultad.nombre) : undefined
  return { id, titulo, autor, anio, facultad: fac, resumen: text(row.resumen), urlPdf: allowedHttpsHref(row.urlPdf) }
}

/** Filas del CMS -> tesis válidas, en el orden recibido. Descarta las filas inválidas. */
export function mapTesisList(rows: unknown): TesisItem[] {
  return (Array.isArray(rows) ? rows : []).map(mapTesis).filter((t): t is TesisItem => t !== null)
}
