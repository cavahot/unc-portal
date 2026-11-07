// INST-08: modelo de /revistas. Puro, sin red ni React.
// Qué hace: convierte filas de la colección `revistas` del CMS en revistas del portal. Es el único lugar donde un dato del
// CMS pasa a texto, enlace o imagen de la página.
// Amenazas: (1) un enlace a OJS con `javascript:`, `http:` o credenciales incrustadas llegando a un href (solo se acepta
// https sin credenciales; si no, la revista se muestra sin enlace en vez de con uno peligroso); (2) una fila corrupta que
// rompa la página (se descarta sin id, nombre o descripción); (3) una portada con URL ajena al CMS llegando a `next/image`
// (pasa por `resolveMediaUrl`, que solo admite medios del CMS).
// Límite: no valida que el sitio OJS exista ni que sea de confianza; el texto se muestra tal cual lo cargó el equipo.
import { allowedHttpsHref } from '@/lib/cms/facultad'
import { resolveMediaUrl } from '@/lib/cms/mediaUrl'

type Raw = Record<string, unknown>
const isObj = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v)
const text = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

export interface RevistaItem {
  id: number | string
  nombre: string
  descripcion: string
  /** Solo si el CMS trae un año entero entre 1800 y 2100; si no, se omite (no se descarta la revista). */
  anioInicio?: number
  /** Solo https sin credenciales; `undefined` si el CMS no trae un enlace válido. */
  urlOjs?: string
  portada?: { url: string; alt: string }
}

/** Una fila de `revistas` -> revista del portal, o `null` si no sirve (inactiva o sin id, nombre o descripción). */
export function mapRevista(row: unknown): RevistaItem | null {
  if (!isObj(row) || row.activa === false) return null
  const id = row.id
  const nombre = text(row.nombre)
  const descripcion = text(row.descripcion)
  if (!(typeof id === 'number' || (typeof id === 'string' && id !== '')) || !nombre || !descripcion) return null
  const anio = row.anioInicio
  const portadaUrl = isObj(row.portada) ? resolveMediaUrl(row.portada.url) : null
  return {
    id,
    nombre,
    descripcion,
    anioInicio: typeof anio === 'number' && Number.isInteger(anio) && anio >= 1800 && anio <= 2100 ? anio : undefined,
    urlOjs: allowedHttpsHref(row.urlOjs),
    portada: portadaUrl && isObj(row.portada) ? { url: portadaUrl, alt: text(row.portada.alt) ?? '' } : undefined,
  }
}

/** Filas del CMS -> revistas válidas, en el orden recibido. Descarta las inválidas. */
export function mapRevistas(rows: unknown): RevistaItem[] {
  return (Array.isArray(rows) ? rows : []).map(mapRevista).filter((r): r is RevistaItem => r !== null)
}
