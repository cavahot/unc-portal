// INST-01 (T2): mapeo puro del global `informacion-publica` del CMS a los datos que pinta /informacion-publica.
// Spec: docs/specs/portal/INSTITUCIONAL-TRANSPARENCIA.md §2.1 y §2.5.
// Qué hace: toma la respuesta cruda del CMS, recorta textos, descarta filas vacías y valida cada enlace.
// Por qué aquí y no en la página: es lógica pura que se prueba sin red ni React.
// Amenazas que evita: (1) un enlace del CMS con `javascript:`, `http:` o un host ajeno llevado a un `href`
// (defensa en profundidad: el CMS ya lo valida, pero el portal no confía en lo que recibe); (2) datos de
// demostración cuando el CMS está vacío (devuelve null y la página muestra un aviso neutro).
// Límite: no formatea ni traduce el contenido (es solo en español).
import { isPlainObject } from './titulos'

/** Hosts https permitidos para enlaces externos (misma lista que `INFO_PUBLICA_HOSTS` del CMS; lo comprueba un test). */
export const INFO_PUBLICA_HOSTS = ['informacionpublica.paraguay.gov.py'] as const

const INTERNAL_PATH = /^\/(?!\/)[A-Za-z0-9\-._~/#?=&%]*$/
const EMAIL = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/

export interface InfoVia {
  slug: string
  etiqueta: string
  titulo: string
  descripcion: string
  destacada: boolean
  /** null si el enlace del CMS no es válido: la vía se muestra sin botón, nunca con un enlace dudoso. */
  accion: { texto: string; href: string; externo: boolean } | null
}

export interface InformacionPublicaData {
  titulo: string
  descripcion: string
  leyReferencia: string
  cita: { texto: string; fuente: string | null } | null
  vias: InfoVia[]
  datosRequeridos: string[]
  portalOficial: { titulo: string; descripcion: string | null; url: string } | null
  correo: string
}

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

/** Devuelve el enlace si es ruta interna o https de host permitido; si no, null. */
export function safeInfoHref(value: unknown): { href: string; externo: boolean } | null {
  const url = text(value)
  if (!url) return null
  if (url.startsWith('/')) return INTERNAL_PATH.test(url) ? { href: url, externo: false } : null
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return null
    return (INFO_PUBLICA_HOSTS as readonly string[]).includes(u.hostname.toLowerCase()) ? { href: url, externo: true } : null
  } catch {
    return null
  }
}

function mapVia(row: unknown): InfoVia | null {
  if (!isPlainObject(row)) return null
  const slug = text(row.slug)
  const etiqueta = text(row.etiqueta)
  const titulo = text(row.titulo)
  const descripcion = text(row.descripcion)
  if (!slug || !etiqueta || !titulo || !descripcion) return null
  const raw = isPlainObject(row.accion) ? row.accion : {}
  const link = safeInfoHref(raw.url)
  const textoAccion = text(raw.texto)
  return {
    slug,
    etiqueta,
    titulo,
    descripcion,
    destacada: row.destacada === true,
    accion: link && textoAccion ? { texto: textoAccion, ...link } : null,
  }
}

/** Mapea el documento del global; null si no hay contenido publicable (título, descripción, ley, correo y al menos una vía). */
export function mapInformacionPublica(raw: unknown): InformacionPublicaData | null {
  if (!isPlainObject(raw)) return null
  const titulo = text(raw.titulo)
  const descripcion = text(raw.descripcion)
  const leyReferencia = text(raw.leyReferencia)
  const correo = text(raw.correo)
  const vias = (Array.isArray(raw.vias) ? raw.vias : []).map(mapVia).filter((v): v is InfoVia => v !== null)
  if (!titulo || !descripcion || !leyReferencia || !EMAIL.test(correo) || vias.length === 0) return null

  const citaRaw = isPlainObject(raw.cita) ? raw.cita : {}
  const citaTexto = text(citaRaw.texto)
  const portalRaw = isPlainObject(raw.portalOficial) ? raw.portalOficial : {}
  const portalLink = safeInfoHref(portalRaw.url)
  const portalTitulo = text(portalRaw.titulo)

  return {
    titulo,
    descripcion,
    leyReferencia,
    cita: citaTexto ? { texto: citaTexto, fuente: text(citaRaw.fuente) || null } : null,
    vias,
    datosRequeridos: (Array.isArray(raw.datosRequeridos) ? raw.datosRequeridos : []).map((r) => text(isPlainObject(r) ? r.texto : '')).filter(Boolean),
    // El portal oficial solo se muestra con enlace externo válido: sin él no hay a dónde mandar a la persona.
    portalOficial: portalLink?.externo && portalTitulo ? { titulo: portalTitulo, descripcion: text(portalRaw.descripcion) || null, url: portalLink.href } : null,
    correo,
  }
}
