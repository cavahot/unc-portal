// ARR-01: dominio de /aranceles-rectorado (spec docs/specs/portal/ARANCELES-RECTORADO.md §2).
// Funciones puras: sin red ni React, para que el servidor y la isla de búsqueda compartan las mismas reglas y
// las pruebas no necesiten el CMS.
import { normalizeSearchText } from './marcoLegal'

/** Orden canónico de los grupos (el del sitio publicado y el del enum del CMS; lo comprueba un test). */
export const GRUPO_ORDER = ['multas', 'venta', 'educativos'] as const
export type ArancelGrupo = (typeof GRUPO_ORDER)[number]

/**
 * Tope de monto en guaraníes (igual a `ARANCEL_MAX_MONTO` del CMS). Por qué: el mayor arancel publicado es
 * Gs. 2.500.000; un valor por encima de 100 millones es casi seguro un error de tipeo (ceros de más).
 */
export const MAX_MONTO = 100_000_000

/** Orden por defecto cuando el CMS no lo trae (mismo `defaultValue` que la colección). */
const DEFAULT_ORDEN = 99

export interface Arancel {
  id: string | number
  concepto: string
  /** Guaraníes enteros. */
  monto: number
  grupo: ArancelGrupo
  orden: number
  updatedAt: string | null
}

export interface ArancelGroup {
  grupo: ArancelGrupo
  items: Arancel[]
  /** Menor y mayor monto del grupo: el índice de la página muestra el rango real. */
  min: number
  max: number
}

/**
 * Id del ancla de cada grupo («grupo-multas»). Vive aquí (módulo sin 'use client') porque lo usan la página de
 * servidor y la isla de búsqueda: una función exportada desde un módulo cliente no se puede llamar en el servidor
 * (lanzaba «Attempted to call grupoId() from the server»; regresión en tests/unit/server-client-boundary.spec.ts).
 */
export const grupoId = (g: ArancelGrupo) => `grupo-${g}`

const isGrupo =(v: unknown): v is ArancelGrupo => typeof v === 'string' && (GRUPO_ORDER as readonly string[]).includes(v)

/** Monto aceptable: entero, no negativo y bajo el tope. Mismo criterio que la validación del CMS. */
export function isValidMonto(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= MAX_MONTO
}

/**
 * Convierte la respuesta del CMS en aranceles válidos.
 * Qué hace: descarta filas sin id, con concepto vacío, grupo desconocido o monto inválido.
 * Por qué: la página publica precios oficiales; una fila corrupta (p. ej. importada a mano en la BD) no debe
 * mostrarse como si fuera un monto vigente. Límite: no detecta un monto válido pero equivocado.
 */
export function mapAranceles(rows: unknown): Arancel[] {
  if (!Array.isArray(rows)) return []
  const out: Arancel[] = []
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue
    const row = r as Record<string, unknown>
    const id = row.id
    if (typeof id !== 'string' && typeof id !== 'number') continue
    const concepto = typeof row.concepto === 'string' ? row.concepto.trim() : ''
    if (!concepto || !isGrupo(row.grupo) || !isValidMonto(row.monto)) continue
    out.push({
      id,
      concepto,
      monto: row.monto,
      grupo: row.grupo,
      orden: typeof row.orden === 'number' && Number.isFinite(row.orden) ? row.orden : DEFAULT_ORDEN,
      updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : null,
    })
  }
  return out
}

/** Agrupa en el orden canónico; dentro, por `orden` y luego por concepto. Omite grupos vacíos. */
export function groupAranceles(items: Arancel[]): ArancelGroup[] {
  return GRUPO_ORDER.map((grupo) => {
    const rows = items
      .filter((i) => i.grupo === grupo)
      .sort((a, b) => a.orden - b.orden || a.concepto.localeCompare(b.concepto, 'es'))
    const montos = rows.map((r) => r.monto)
    return { grupo, items: rows, min: Math.min(...montos), max: Math.max(...montos) }
  }).filter((g) => g.items.length > 0)
}

/**
 * «2500000» -> «2.500.000». Se agrupa a mano en lugar de usar `toLocaleString('es-PY')`: el resultado de
 * Intl depende de los datos ICU del motor (Node con small-icu o un navegador sin es-PY devuelven «2,500,000» o
 * «2500000»), y un separador distinto cambia la lectura de un precio. Solo para enteros no negativos.
 */
export function formatGuaranies(monto: number): string {
  const digits = String(Math.trunc(Math.abs(monto)))
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/** «Gs. 50.000» con espacio duro para que el símbolo nunca quede solo al final de una línea. */
export function formatMonto(monto: number): string {
  return `Gs. ${formatGuaranies(monto)}`
}

/** Fecha ISO más reciente entre las filas (dato real para «última actualización»), o null. */
export function latestUpdatedAt(items: Arancel[]): string | null {
  let best: string | null = null
  let bestTime = -Infinity
  for (const i of items) {
    if (!i.updatedAt) continue
    const t = Date.parse(i.updatedAt)
    if (Number.isFinite(t) && t > bestTime) {
      bestTime = t
      best = i.updatedAt
    }
  }
  return best
}

/** Lo mínimo que necesita la búsqueda; la vista agrega etiquetas ya traducidas. */
type SearchableGroup = { label?: string; items: Array<{ concepto: string; monto: number }> }

export interface ArancelFilterResult<G> {
  groups: G[]
  matched: number
  total: number
}

/**
 * Filtra por concepto, nombre del grupo y monto (con o sin puntos). Cada palabra debe aparecer (AND).
 * La consulta se corta a 100 caracteres (nunca viaja al CMS; el tope evita trabajo inútil en el cliente).
 */
export function filterArancelGroups<G extends SearchableGroup>(groups: G[], query: string): ArancelFilterResult<G> {
  const total = groups.reduce((n, g) => n + g.items.length, 0)
  // Los puntos de miles se quitan antes de normalizar para que «50.000» busque lo mismo que «50000».
  const terms = normalizeSearchText(query.slice(0, 100).replace(/(\d)\.(?=\d{3})/g, '$1'))
    .split(' ')
    .filter(Boolean)
  if (terms.length === 0) return { groups, matched: total, total }
  const out: G[] = []
  let matched = 0
  for (const g of groups) {
    const items = g.items.filter((i) => {
      const haystack = normalizeSearchText([i.concepto, g.label ?? '', String(i.monto)].join(' '))
      const tokens = haystack.split(' ')
      // Un número se compara como palabra entera: «50000» no debe traer también los de Gs. 500.000.
      return terms.every((t) => (/^\d+$/.test(t) ? tokens.includes(t) : haystack.includes(t)))
    })
    if (items.length > 0) {
      out.push({ ...g, items })
      matched += items.length
    }
  }
  return { groups: out, matched, total }
}
