// INST-08: modelo de /privacidad y /accesibilidad. Puro, sin red ni React.
// Qué hace: convierte los datos de los globals `politica-privacidad` y `declaracion-accesibilidad` del CMS en datos de las
// páginas, y da el formato de la fecha de actualización y de los párrafos. Es el único lugar donde un dato del CMS pasa a
// texto o enlace de esas páginas.
// Amenazas: (1) un correo sin forma llegando a un `mailto:` (se valida; si no, la página se muestra sin enlace); (2) una
// fila corrupta que rompa la página (se descarta sin título o sin contenido); (3) una fecha corrida de día o de mes por la
// zona horaria (se lee y se formatea siempre en UTC).
// Límite: no valida el contenido jurídico ni que el correo exista; el texto se muestra tal cual lo cargó el equipo.
import { intlLocale } from '@/lib/cms/calendario'

type Raw = Record<string, unknown>
const isObj = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v)
const text = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
const EMAIL = /^[^\s@<>()]+@[^\s@<>()]+\.[a-z]{2,}$/i

export interface PoliticaSeccion {
  titulo: string
  contenido: string
}
export interface PoliticaPrivacidadData {
  /** Día `YYYY-MM-DD`; `undefined` si el CMS no trae una fecha válida (no se descarta el texto). */
  actualizacion?: string
  secciones: PoliticaSeccion[]
}
export interface Caracteristica {
  titulo: string
  descripcion: string
}
export interface DeclaracionAccesibilidadData {
  descripcion: string
  caracteristicas: Caracteristica[]
  /** Solo con forma de correo válida; `undefined` si no. */
  correo?: string
}

/** Día `YYYY-MM-DD` de un valor de fecha del CMS (se lee en UTC), o `undefined` si no es una fecha válida. */
function toDay(v: unknown): string | undefined {
  if (typeof v !== 'string' && !(v instanceof Date)) return undefined
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10)
}

function mapLista<T>(rows: unknown, pick: (row: Raw) => T | null): T[] {
  return (Array.isArray(rows) ? rows : []).map((r) => (isObj(r) ? pick(r) : null)).filter((x): x is T => x !== null)
}

/** Global `politica-privacidad` -> datos de la página, o `null` si no hay ninguna sección válida. */
export function mapPoliticaPrivacidad(raw: unknown): PoliticaPrivacidadData | null {
  if (!isObj(raw)) return null
  const secciones = mapLista<PoliticaSeccion>(raw.secciones, (r) => {
    const titulo = text(r.titulo)
    const contenido = text(r.contenido)
    return titulo && contenido ? { titulo, contenido } : null
  })
  if (secciones.length === 0) return null
  return { actualizacion: toDay(raw.ultimaActualizacion), secciones }
}

/** Global `declaracion-accesibilidad` -> datos de la página, o `null` sin descripción o sin una característica válida. */
export function mapDeclaracionAccesibilidad(raw: unknown): DeclaracionAccesibilidadData | null {
  if (!isObj(raw)) return null
  const descripcion = text(raw.descripcion)
  const caracteristicas = mapLista<Caracteristica>(raw.caracteristicas, (r) => {
    const titulo = text(r.titulo)
    const d = text(r.descripcion)
    return titulo && d ? { titulo, descripcion: d } : null
  })
  if (!descripcion || caracteristicas.length === 0) return null
  const correo = text(raw.correoContacto)
  return { descripcion, caracteristicas, correo: correo && correo.length <= 254 && EMAIL.test(correo) ? correo : undefined }
}

/** «2026-08-01» -> «agosto de 2026» (es), «August 2026» (en), «agosto de 2026» (pt-BR); el guaraní sale en español. */
export function formatMesAnio(day: string, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`))
}

/** Párrafos de un texto del CMS: los separa una línea en blanco; los vacíos se descartan. */
export function paragraphs(value: string): string[] {
  return value.split(/\r?\n\s*\r?\n/).map((p) => p.trim()).filter(Boolean)
}
