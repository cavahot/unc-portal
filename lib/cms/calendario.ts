// INST-07: modelo de /calendario-academico (spec docs/specs/portal/CALENDARIO.md §2.4). Puro, sin red ni React.
// Qué hace: convierte filas de la colección `calendario-academico` del CMS en bloques del portal (semestres y mesas de
// exámenes), se queda con el año académico más reciente y formatea las fechas con el idioma de la persona.
// Por qué existe: las fechas estaban escritas en los archivos de mensajes y cada idioma las traducía a mano. Aquí son fechas
// reales (inicio y fin opcional) y el formato sale de `Intl`; nunca se completa una fecha que falta ni se escribe una en el
// código. Una entrada sin fecha válida, un evento desconocido o un «otro» sin descripción se descartan; un `fin` anterior al
// `inicio` se ignora (se muestra solo el inicio).
// Amenazas: una fila corrupta que rompa la página; una fecha desplazada un día por la zona horaria (las fechas son de día
// completo y se leen y se formatean siempre en UTC); el idioma guaraní, que `Intl` no soporta y cuyo resultado dependería de
// la máquina (se formatea en español, el idioma de los meses en Paraguay). Límite: no valida que las fechas sean las oficiales.
/**
 * Eventos estándar de un semestre. Misma lista que `CALENDARIO_EVENTOS` del CMS (`apps/cms/src/utilities/validators.ts`):
 * se repite aquí para que el portal no importe código del CMS, y una prueba (tests/unit/calendario-model.spec.ts) comprueba
 * que sean idénticas. Las etiquetas traducidas viven en `pages.calendario-academico.json`.
 */
export const CALENDARIO_EVENTOS = ['inicio-clases', 'inscripcion-tardia', 'parciales-1', 'parciales-2', 'cierre-semestre', 'otro'] as const

type Raw = Record<string, unknown>
const isObj = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v)
const text = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

export type CalendarioEvento = (typeof CALENDARIO_EVENTOS)[number]
export type CalendarioTipo = 'semestre' | 'examenes'

export interface CalendarioEntrada {
  /** Solo en un semestre. */
  evento?: CalendarioEvento
  /** Solo si `evento` es `otro`. */
  descripcion?: string
  /** Día (`YYYY-MM-DD`, UTC). */
  inicio: string
  /** Día (`YYYY-MM-DD`, UTC); solo si es posterior al inicio. */
  fin?: string
}

export interface CalendarioBloque {
  id: number | string
  titulo: string
  tipo: CalendarioTipo
  anio: number
  orden: number
  entradas: CalendarioEntrada[]
}

const DEFAULT_ORDEN = 99

/** Valor de fecha del CMS (texto ISO o `Date`) -> día `YYYY-MM-DD` en UTC, o `undefined` si no es una fecha válida. */
export function toDay(value: unknown): string | undefined {
  const date = value instanceof Date ? value : typeof value === 'string' && value.trim() ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return undefined
  const iso = date.toISOString().slice(0, 10)
  const year = Number(iso.slice(0, 4))
  return year >= 1900 && year <= 2200 ? iso : undefined
}

function mapEntrada(raw: unknown, tipo: CalendarioTipo): CalendarioEntrada | null {
  if (!isObj(raw)) return null
  const inicio = toDay(raw.inicio)
  if (!inicio) return null
  const fin = toDay(raw.fin)
  const base = { inicio, ...(fin && fin > inicio ? { fin } : {}) }
  if (tipo === 'examenes') return base
  const evento = raw.evento
  if (typeof evento !== 'string' || !(CALENDARIO_EVENTOS as readonly string[]).includes(evento)) return null
  if (evento === 'otro') {
    const descripcion = text(raw.descripcion)
    return descripcion ? { evento: 'otro', descripcion, ...base } : null
  }
  return { evento: evento as CalendarioEvento, ...base }
}

/** Una fila del CMS -> bloque, o `null` si no sirve (inactiva, sin id, título, tipo o año válidos, o sin entradas válidas). */
export function mapBloque(row: unknown): CalendarioBloque | null {
  if (!isObj(row) || row.activa === false) return null
  const id = row.id
  const titulo = text(row.titulo)
  const tipo = row.tipo
  const anio = row.anio
  if (!(typeof id === 'number' || (typeof id === 'string' && id !== '')) || !titulo) return null
  if (tipo !== 'semestre' && tipo !== 'examenes') return null
  if (typeof anio !== 'number' || !Number.isInteger(anio) || anio < 2000 || anio > 2100) return null
  const entradas = (Array.isArray(row.entradas) ? row.entradas : [])
    .map((e) => mapEntrada(e, tipo))
    .filter((e): e is CalendarioEntrada => e !== null)
    .sort((a, b) => a.inicio.localeCompare(b.inicio) || (a.fin ?? a.inicio).localeCompare(b.fin ?? b.inicio))
  if (entradas.length === 0) return null
  return { id, titulo, tipo, anio, orden: typeof row.orden === 'number' && Number.isFinite(row.orden) ? row.orden : DEFAULT_ORDEN, entradas }
}

export interface Calendario {
  anio: number
  semestres: CalendarioBloque[]
  examenes: CalendarioBloque[]
}

/** Filas del CMS -> el año académico más reciente con sus semestres y mesas de exámenes, o `null` si no hay bloques válidos. */
export function armarCalendario(rows: unknown): Calendario | null {
  const bloques = (Array.isArray(rows) ? rows : []).map(mapBloque).filter((b): b is CalendarioBloque => b !== null)
  if (bloques.length === 0) return null
  const anio = Math.max(...bloques.map((b) => b.anio))
  const delAnio = bloques.filter((b) => b.anio === anio).sort((a, b) => a.orden - b.orden || a.titulo.localeCompare(b.titulo, 'es'))
  return { anio, semestres: delAnio.filter((b) => b.tipo === 'semestre'), examenes: delAnio.filter((b) => b.tipo === 'examenes') }
}

// ── Formato de fechas ────────────────────────────────────────────────────────────────────────────────────────────

/** Idioma de `Intl` para un idioma del portal: el guaraní no está soportado, así que sus fechas van en español. */
export function intlLocale(locale: string): string {
  return locale === 'gn' ? 'es' : locale
}

const asDate = (day: string) => new Date(`${day}T12:00:00Z`)

/**
 * «2026-03-16» y «2026-03-27» -> «16–27 mar» (es), «Mar 16 – 27» (en), «16 – 27 de mar.» (pt-BR). Un solo día si no hay fin.
 * Incluye el año cuando alguna fecha cae fuera del año académico (`anioRef`) o el período cruza de año, salvo que
 * `conAnio` sea `false` (la tabla de exámenes ya lo muestra en su columna de período).
 */
export function formatFechas(inicio: string, fin: string | undefined, locale: string, anioRef: number, conAnio = true): string {
  const cruzaAnio = Number(inicio.slice(0, 4)) !== anioRef || (fin !== undefined && Number(fin.slice(0, 4)) !== anioRef)
  const fmt = new Intl.DateTimeFormat(intlLocale(locale), {
    day: 'numeric',
    month: 'short',
    ...(conAnio && cruzaAnio ? { year: 'numeric' as const } : {}),
    timeZone: 'UTC',
  })
  return fin && fin !== inicio ? fmt.formatRange(asDate(inicio), asDate(fin)) : fmt.format(asDate(inicio))
}

/** «2025-12-01» -> «Diciembre de 2025» (es), «December 2025» (en): el período de una mesa de exámenes, con inicial mayúscula. */
export function formatPeriodo(inicio: string, locale: string): string {
  const label = new Intl.DateTimeFormat(intlLocale(locale), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(asDate(inicio))
  return label.charAt(0).toLocaleUpperCase(intlLocale(locale)) + label.slice(1)
}
