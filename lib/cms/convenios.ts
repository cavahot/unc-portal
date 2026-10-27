// CNV-01: modelo puro de /convenios (sin red, sin React, sin Payload) para poder probarlo aislado.
// Spec: docs/specs/portal/CONVENIOS.md §2 y §3 | Evidencia: RDD-CNV-01..07.

import { normalizeSearchText } from './marcoLegal'
import { safeHref } from '@/lib/security/safeUrl'

export type ConvenioType = 'nacional' | 'internacional'
export type ConvenioCategoria = 'institucional' | 'beneficios'
export type ConvenioLinkKind = 'drive' | 'web'

/** Mismo orden y valores que el select `categoria` del CMS (lo comprueba tests/unit/convenios-cms.spec.ts). */
export const CONVENIO_CATEGORIAS: readonly ConvenioCategoria[] = ['institucional', 'beneficios']
export const CONVENIO_TYPES: readonly ConvenioType[] = ['nacional', 'internacional']

/**
 * Hosts desde los que la página acepta enlazar el documento de un convenio. Debe coincidir con
 * `CONVENIOS_ALLOWED_HOSTS` del CMS. Amenaza que evita: que una fila heredada o una cuenta comprometida publique
 * un enlace a un sitio ajeno (phishing, descarga maliciosa) bajo la marca UNC; incluye el host antiguo
 * `softcon.wnpower.host` del sitio publicado. Límite: confía en todo lo que sirvan estos hosts.
 */
export const ALLOWED_CONVENIO_HOSTS: readonly string[] = ['drive.google.com', 'docs.google.com', 'www.unc.edu.py', 'unc.edu.py']

const DRIVE_HOSTS = new Set(['drive.google.com', 'docs.google.com'])

export interface Convenio {
  id: string | number
  year: number
  title: string
  parties: string
  /** Puede faltar: el sitio publicado tiene una fila internacional sin finalidad. */
  objective: string | null
  signedMonth: string | null
  duration: string | null
  categoria: ConvenioCategoria
  nota: string | null
  orden: number
  /** Enlace ya validado (https + allowlist exacta + safeHref) o null. */
  href: string | null
  linkKind: ConvenioLinkKind | null
}

export interface ConvenioYearGroup<T = Convenio> {
  year: number
  items: T[]
}

/**
 * true si `url` es https, sin credenciales ni espacios, a un host EXACTO de la allowlist.
 * Por qué exacto: `drive.google.com.evil.example` o `?u=https://drive.google.com` no deben pasar.
 * Defensa en profundidad: el CMS ya valida al guardar, pero filas antiguas pueden no haber pasado por ahí.
 */
export function isAllowedConvenioUrl(url: unknown): boolean {
  if (typeof url !== 'string' || url === '' || url !== url.trim() || url.length > 2048) return false
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return false
  return ALLOWED_CONVENIO_HOSTS.includes(parsed.hostname.toLowerCase())
}

/** Tipo de enlace para la pista visual («Google Drive» o «sitio UNC»); null si no es un enlace permitido. */
export function linkKind(url: unknown): ConvenioLinkKind | null {
  if (!isAllowedConvenioUrl(url)) return null
  return DRIVE_HOSTS.has(new URL(url as string).hostname.toLowerCase()) ? 'drive' : 'web'
}

/**
 * Texto del CMS listo para mostrar: recorta y colapsa espacios repetidos; null si queda vacío.
 * No corrige erratas: el contenido es del PO y se corrige en el panel (spec §8).
 */
export function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const out = value.replace(/[ \t ]+/g, ' ').trim()
  return out === '' ? null : out
}

/**
 * Quita UN punto final al mostrar etiquetas cortas (denominación, fecha, duración): en el sitio unas filas lo
 * traen y otras no, y el punto suelto se ve como ruido en una tabla. No toca «...» ni el dato guardado.
 */
export function displayLabel(value: string): string {
  return /[^.]\.$/.test(value) ? value.slice(0, -1) : value
}

type Raw = Record<string, unknown>

/**
 * Convierte filas del CMS en convenios publicables.
 * Qué hace: exige id, año entero, denominación y participantes; el enlace solo se conserva si pasa la allowlist y
 * `safeHref` (si no, la fila se muestra con «Documento no disponible», no se oculta). Nunca lanza.
 */
export function mapConvenios(rows: unknown): Convenio[] {
  if (!Array.isArray(rows)) return []
  const out: Convenio[] = []
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    const r = row as Raw
    const title = cleanText(r.title)
    const parties = cleanText(r.parties)
    const year = typeof r.year === 'number' && Number.isInteger(r.year) ? r.year : null
    if (!title || !parties || year === null || (typeof r.id !== 'string' && typeof r.id !== 'number')) continue
    const allowed = isAllowedConvenioUrl(r.driveUrl) && safeHref(r.driveUrl) !== '#'
    out.push({
      id: r.id,
      year,
      title,
      parties,
      objective: cleanText(r.objective),
      signedMonth: cleanText(r.signedMonth),
      duration: cleanText(r.duration),
      categoria: CONVENIO_CATEGORIAS.includes(r.categoria as ConvenioCategoria) ? (r.categoria as ConvenioCategoria) : 'institucional',
      nota: cleanText(r.nota),
      orden: typeof r.orden === 'number' && Number.isFinite(r.orden) ? r.orden : 99,
      href: allowed ? (r.driveUrl as string) : null,
      linkKind: allowed ? linkKind(r.driveUrl) : null,
    })
  }
  return out
}

/** Agrupa por año descendente; dentro, por `orden` y luego por denominación en español. */
export function groupByYear<T extends Pick<Convenio, 'year' | 'orden' | 'title'>>(items: T[]): ConvenioYearGroup<T>[] {
  const byYear = new Map<number, T[]>()
  for (const it of items) byYear.set(it.year, [...(byYear.get(it.year) ?? []), it])
  return [...byYear.keys()]
    .sort((a, b) => b - a)
    .map((year) => ({
      year,
      items: byYear.get(year)!.sort((a, b) => a.orden - b.orden || a.title.localeCompare(b.title, 'es')),
    }))
}

/** Conteo por categoría (siempre con ambas claves, para los botones del filtro). */
export function countByCategoria(items: Array<Pick<Convenio, 'categoria'>>): Record<ConvenioCategoria, number> {
  const out: Record<ConvenioCategoria, number> = { institucional: 0, beneficios: 0 }
  for (const it of items) out[it.categoria]++
  return out
}

/** Primer y último año con datos; null si no hay filas. */
export function yearSpan(items: Array<Pick<Convenio, 'year'>>): { from: number; to: number } | null {
  if (items.length === 0) return null
  const years = items.map((i) => i.year)
  return { from: Math.min(...years), to: Math.max(...years) }
}

type Searchable = Pick<Convenio, 'title' | 'parties' | 'objective' | 'year' | 'categoria'>

export interface ConvenioFilter {
  query?: string
  categoria?: ConvenioCategoria | null
  year?: number | null
}

/**
 * Filtra grupos por texto (todas las palabras, sin tildes ni mayúsculas, sobre denominación + participantes +
 * finalidad + año), categoría y año. Los grupos vacíos se omiten. La consulta se corta a 100 caracteres: solo
 * filtra en el cliente y nunca viaja al CMS.
 */
export function filterConvenioGroups<T extends Searchable>(
  groups: ConvenioYearGroup<T>[],
  filter: ConvenioFilter,
): { groups: ConvenioYearGroup<T>[]; matched: number; total: number } {
  const total = groups.reduce((n, g) => n + g.items.length, 0)
  const terms = normalizeSearchText((filter.query ?? '').slice(0, 100)).split(' ').filter(Boolean)
  const out: ConvenioYearGroup<T>[] = []
  let matched = 0
  for (const g of groups) {
    if (filter.year && g.year !== filter.year) continue
    const items = g.items.filter((it) => {
      if (filter.categoria && it.categoria !== filter.categoria) return false
      if (terms.length === 0) return true
      const hay = normalizeSearchText([it.title, it.parties, it.objective ?? '', String(it.year)].join(' '))
      return terms.every((t) => hay.includes(t))
    })
    if (items.length > 0) {
      out.push({ ...g, items })
      matched += items.length
    }
  }
  return { groups: out, matched, total }
}
