// INST-01 (T3): mapeo puro del global `institucional` del CMS a los datos que pinta /institucional.
// Spec: docs/specs/portal/INSTITUCIONAL-TRANSPARENCIA.md §2.2 y §2.5.
// Qué hace: toma la respuesta cruda del CMS, recorta textos, descarta filas vacías y traduce cada `destino` (lista
// cerrada) a la ruta real del portal.
// Por qué aquí y no en la página: es lógica pura que se prueba sin red ni React.
// Amenazas que evita: (1) una tarjeta que enlace a una ruta inexistente o a un sitio ajeno (un destino fuera de la
// lista se descarta; nunca se usa un valor del CMS como URL); (2) datos de demostración cuando el CMS está vacío
// (devuelve null y la página muestra un aviso neutro). Límite: no traduce el contenido (es solo en español).
// Mantenimiento: la lista debe coincidir con `DESTINOS` del CMS (lo comprueba un test).
import { isPlainObject } from './titulos'

/** Destino (lista cerrada del CMS) → ruta real del portal, sin prefijo de idioma. */
export const DESTINO_RUTA = {
  historia: '/historia',
  'mision-vision-y-valores': '/mision-vision-y-valores',
  autoridades: '/autoridades',
  organigrama: '/organigrama',
  'marco-legal': '/marco-legal',
  'aseguramiento-calidad': '/aseguramiento-calidad',
  transparencia: '/transparencia',
  'informacion-publica': '/informacion-publica',
} as const

export type InstitucionalDestino = keyof typeof DESTINO_RUTA

export interface InstitucionalSeccion {
  destino: InstitucionalDestino
  /** Ruta del portal sin prefijo de idioma; la página antepone el idioma. */
  ruta: string
  etiqueta: string
  titulo: string
  descripcion: string
  accion: string
}

export interface InstitucionalData {
  titulo: string
  descripcion: string
  sobre: { titulo: string; texto: string; datos: Array<{ valor: string; etiqueta: string }> }
  secciones: InstitucionalSeccion[]
  valores: Array<{ titulo: string; descripcion: string }>
}

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')
const isDestino = (v: unknown): v is InstitucionalDestino => typeof v === 'string' && Object.hasOwn(DESTINO_RUTA, v)

function mapSeccion(row: unknown): InstitucionalSeccion | null {
  if (!isPlainObject(row) || !isDestino(row.destino)) return null
  const etiqueta = text(row.etiqueta)
  const titulo = text(row.titulo)
  const descripcion = text(row.descripcion)
  const accion = text(row.accion)
  if (!etiqueta || !titulo || !descripcion || !accion) return null
  return { destino: row.destino, ruta: DESTINO_RUTA[row.destino], etiqueta, titulo, descripcion, accion }
}

/** Mapea el documento del global; null si no hay contenido publicable (título, descripción, quiénes somos y al menos una sección). */
export function mapInstitucional(raw: unknown): InstitucionalData | null {
  if (!isPlainObject(raw)) return null
  const titulo = text(raw.titulo)
  const descripcion = text(raw.descripcion)
  const sobreRaw = isPlainObject(raw.sobre) ? raw.sobre : {}
  const sobreTitulo = text(sobreRaw.titulo)
  const sobreTexto = text(sobreRaw.texto)
  const secciones = (Array.isArray(raw.secciones) ? raw.secciones : []).map(mapSeccion).filter((s): s is InstitucionalSeccion => s !== null)
  if (!titulo || !descripcion || !sobreTitulo || !sobreTexto || secciones.length === 0) return null

  const datos = (Array.isArray(sobreRaw.datos) ? sobreRaw.datos : [])
    .map((d) => (isPlainObject(d) ? { valor: text(d.valor), etiqueta: text(d.etiqueta) } : null))
    .filter((d): d is { valor: string; etiqueta: string } => d !== null && Boolean(d.valor) && Boolean(d.etiqueta))
  const valores = (Array.isArray(raw.valores) ? raw.valores : [])
    .map((v) => (isPlainObject(v) ? { titulo: text(v.titulo), descripcion: text(v.descripcion) } : null))
    .filter((v): v is { titulo: string; descripcion: string } => v !== null && Boolean(v.titulo) && Boolean(v.descripcion))

  return { titulo, descripcion, sobre: { titulo: sobreTitulo, texto: sobreTexto, datos }, secciones, valores }
}
