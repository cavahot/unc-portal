// LT-01: modelo puro de la línea de tiempo de /historia (sin red, sin React, sin Payload) para probarlo aislado.
// Spec: docs/specs/portal/LINEA-TIEMPO.md §2 y §4 | Evidencia: RDD-LT-01..05.

export type TimelineLocale = 'es' | 'en' | 'pt-BR' | 'gn'

export interface MilestoneImage {
  /** URL absoluta ya validada por `resolveMediaUrl` (origen del CMS o host de media permitido). */
  src: string
  /** Texto alternativo de la media; '' = imagen decorativa (el título del hito ya da el contexto). */
  alt: string
  blurDataURL: string | null
  width: number | null
  height: number | null
}

export interface Milestone {
  id: string | number
  anio: number
  /** Precisión opcional escrita por el editor (p. ej. «Marzo de 2008»); no se traduce. */
  etiquetaFecha: string | null
  titulo: string
  /** 'es' cuando el título cayó al español en una página de otro idioma (para `lang="es"`, WCAG 3.1.2). */
  tituloLang: 'es' | null
  descripcion: string
  descripcionLang: 'es' | null
  imagen: MilestoneImage | null
  /** Enlace https ya validado, o null. */
  enlace: string | null
  orden: number
}

/** Primer año aceptado: anterior a cualquier antecedente plausible de la UNC, evita errores de tipeo (207, 20007). */
export const MIN_MILESTONE_YEAR = 1800

/**
 * true si `value` es un año entero entre 1800 y el año siguiente al actual.
 * Por qué +1: permite anunciar un hito ya decidido para el año próximo, no fechas futuras arbitrarias.
 * Defensa en profundidad: el CMS valida lo mismo al guardar, pero filas antiguas pueden no haber pasado por ahí.
 */
export function isValidMilestoneYear(value: unknown, now: Date = new Date()): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_MILESTONE_YEAR &&
    value <= now.getUTCFullYear() + 1
  )
}

/**
 * true si `url` es un enlace `https://` sin credenciales, sin espacios ni caracteres de control.
 * Amenaza que evita: `javascript:`/`data:` (XSS al hacer clic), `http:` (degradación) y `https://usuario:clave@host`
 * (enlace engañoso) publicados desde el panel o heredados. Límite: no restringe el host (un hito puede citar
 * cualquier fuente https) ni comprueba que el destino exista; la página además pasa el valor por `safeHref`.
 */
export function isSafeMilestoneLink(url: unknown): url is string {
  if (typeof url !== 'string' || url === '' || url !== url.trim() || url.length > 2048) return false
  // Controles C0, DEL y `\`: `new URL` los descarta o normaliza en silencio, así que se rechazan antes.
  for (const ch of url) {
    const code = ch.charCodeAt(0)
    if (code < 0x20 || code === 0x7f || ch === '\\') return false
  }
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  return parsed.protocol === 'https:' && !parsed.username && !parsed.password && parsed.hostname !== ''
}

type Raw = Record<string, unknown>

const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null)
const positive = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null)

/** Clave del grupo `traducciones` del CMS para cada idioma del portal (`es` no tiene: es el texto base). */
const TRANSLATION_KEY: Record<TimelineLocale, 'en' | 'ptBR' | 'gn' | null> = { es: null, en: 'en', 'pt-BR': 'ptBR', gn: 'gn' }

/**
 * Texto de un campo en el idioma pedido. Si la traducción falta o está vacía usa el español y lo marca
 * (`lang: 'es'`) para que el lector de pantalla no lo pronuncie con la voz del otro idioma.
 * Por qué por campo: un título traducido no debe perderse porque falte la descripción.
 */
function localized(base: string, translations: unknown, key: 'en' | 'ptBR' | 'gn' | null, field: 'titulo' | 'descripcion') {
  if (key === null) return { value: base, lang: null }
  const group = translations && typeof translations === 'object' ? (translations as Raw)[key] : null
  const translated = group && typeof group === 'object' ? text((group as Raw)[field]) : null
  return translated ? { value: translated, lang: null } : { value: base, lang: 'es' as const }
}

/** Imagen publicable o null: exige que `resolveImage` acepte la URL (solo /api/media/file/ o el host de media). */
function mapImage(value: unknown, resolveImage: (url: unknown) => string | null): MilestoneImage | null {
  if (!value || typeof value !== 'object') return null
  const media = value as Raw
  const src = resolveImage(media.url)
  if (!src) return null
  return {
    src,
    alt: text(media.alt) ?? '',
    blurDataURL: typeof media.blurDataURL === 'string' && media.blurDataURL.startsWith('data:image/') ? media.blurDataURL : null,
    width: positive(media.width),
    height: positive(media.height),
  }
}

/** Orden público: año, luego `orden` (desempate del editor), luego título en español. */
export function sortMilestones(list: Milestone[]): Milestone[] {
  return [...list].sort((a, b) => a.anio - b.anio || a.orden - b.orden || a.titulo.localeCompare(b.titulo, 'es'))
}

/**
 * Convierte las filas del CMS en hitos publicables, ya traducidos y ordenados.
 * Qué hace: descarta filas sin id, título, descripción o con año inválido (escenario 8: mejor omitir que romper
 * la página); omite enlace e imagen inseguros sin descartar el hito. Nunca lanza: entradas basura dan [].
 */
export function mapMilestones(
  rows: unknown,
  locale: TimelineLocale,
  resolveImage: (url: unknown) => string | null,
  now: Date = new Date(),
): Milestone[] {
  if (!Array.isArray(rows)) return []
  const key = TRANSLATION_KEY[locale] ?? null
  const out: Milestone[] = []
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    const r = row as Raw
    const titulo = text(r.titulo)
    const descripcion = text(r.descripcion)
    if (!titulo || !descripcion || !isValidMilestoneYear(r.anio, now)) continue
    if (typeof r.id !== 'string' && typeof r.id !== 'number') continue
    const t = localized(titulo, r.traducciones, key, 'titulo')
    const d = localized(descripcion, r.traducciones, key, 'descripcion')
    out.push({
      id: r.id,
      anio: r.anio,
      etiquetaFecha: text(r.etiquetaFecha),
      titulo: t.value,
      tituloLang: t.lang,
      descripcion: d.value,
      descripcionLang: d.lang,
      imagen: mapImage(r.imagen, resolveImage),
      enlace: isSafeMilestoneLink(r.enlace) ? r.enlace : null,
      orden: typeof r.orden === 'number' && Number.isFinite(r.orden) ? r.orden : 99,
    })
  }
  return sortMilestones(out)
}

/** Primer y último año de la lista (resumen visible junto al título de la sección); null si está vacía. */
export function yearSpan(list: Milestone[]): { from: number; to: number } | null {
  if (list.length === 0) return null
  const years = list.map((m) => m.anio)
  return { from: Math.min(...years), to: Math.max(...years) }
}
