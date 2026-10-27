// MLG-01: modelo puro de la página /marco-legal (sin red, sin React, sin Payload) para poder probarlo aislado.
// Spec: docs/specs/portal/MARCO-LEGAL.md §2 y §4 | Evidencia: RDD-MLG-01..06.

export type DocCategory =
  | 'ley-creacion'
  | 'estatuto'
  | 'reglamento-general'
  | 'reglamentos-especiales'
  | 'codigos'
  | 'politicas'
  | 'planes'
  | 'manuales'
  | 'procedimientos'
  | 'protocolos'

export type DocEstado = 'vigente' | 'derogado' | 'historico'
export type DocFormat = 'pdf' | 'doc' | 'xls' | 'drive' | 'link'

export interface LegalDocument {
  id: string | number
  title: string
  category: DocCategory
  description: string | null
  nota: string | null
  /** Enlace ya validado (archivo propio resuelto o URL externa de la allowlist). */
  href: string
  format: DocFormat
  estado: DocEstado
  /** Fecha del documento en `AAAA-MM-DD` (sin hora: evita corrimientos por zona horaria). */
  fechaDocumento: string | null
  order: number
}

export interface CategoryGroup {
  category: DocCategory
  docs: LegalDocument[]
}

/** Orden canónico de las secciones: de la norma fundante a los protocolos operativos. */
export const CATEGORY_ORDER: readonly DocCategory[] = [
  'ley-creacion',
  'estatuto',
  'reglamento-general',
  'reglamentos-especiales',
  'codigos',
  'politicas',
  'planes',
  'manuales',
  'procedimientos',
  'protocolos',
]

const CATEGORY_SET = new Set<string>(CATEGORY_ORDER)
const ESTADOS = new Set<string>(['vigente', 'derogado', 'historico'])

/**
 * Hosts desde los que la página acepta enlazar documentos externos. Debe coincidir con
 * `MARCO_LEGAL_ALLOWED_HOSTS` del CMS (lo comprueba tests/unit/marco-legal-cms.spec.ts).
 * Amenaza que evita: que una fila heredada o una cuenta comprometida publique un enlace a un sitio ajeno
 * (phishing, descarga maliciosa) bajo la marca de la UNC. Límite: confía en todo el contenido de esos hosts.
 */
export const ALLOWED_DOCUMENT_HOSTS: readonly string[] = ['drive.google.com', 'docs.google.com', 'www.unc.edu.py', 'unc.edu.py']

/**
 * true si `url` es un enlace https, sin credenciales ni espacios, a un host EXACTO de la allowlist.
 * Por qué exacto: `drive.google.com.evil.example` o `?u=https://drive.google.com` no deben pasar.
 * Defensa en profundidad: el CMS ya valida al guardar, pero filas antiguas pueden no haber pasado por ahí.
 */
export function isAllowedDocumentUrl(url: unknown): boolean {
  if (typeof url !== 'string' || url === '' || url !== url.trim() || url.length > 2048) return false
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return false
  return ALLOWED_DOCUMENT_HOSTS.includes(parsed.hostname.toLowerCase())
}

/**
 * Deduce el formato que se muestra en la etiqueta del documento.
 * Orden: extensión del archivo, `mimeType`, Google Drive/Docs por host, extensión de la URL; si nada
 * encaja, `link`. Límite: es una pista visual; no inspecciona el contenido real del archivo.
 */
export function detectFormat(input: { filename?: unknown; mimeType?: unknown; url?: unknown }): DocFormat {
  const byExt = (name: string): DocFormat | null => {
    const ext = name.toLowerCase().match(/\.([a-z0-9]{2,5})$/)?.[1]
    if (ext === 'pdf') return 'pdf'
    if (ext === 'doc' || ext === 'docx' || ext === 'odt' || ext === 'rtf') return 'doc'
    if (ext === 'xls' || ext === 'xlsx' || ext === 'ods' || ext === 'csv') return 'xls'
    return null
  }
  if (typeof input.filename === 'string') {
    const f = byExt(input.filename)
    if (f) return f
  }
  if (typeof input.mimeType === 'string') {
    const m = input.mimeType.toLowerCase()
    if (m === 'application/pdf') return 'pdf'
    if (m.includes('msword') || m.includes('wordprocessingml') || m.includes('opendocument.text')) return 'doc'
    if (m.includes('ms-excel') || m.includes('spreadsheetml') || m.includes('opendocument.spreadsheet') || m === 'text/csv') return 'xls'
  }
  if (typeof input.url === 'string') {
    try {
      const u = new URL(input.url)
      const host = u.hostname.toLowerCase()
      if (host === 'drive.google.com' || host === 'docs.google.com') return 'drive'
      const f = byExt(u.pathname)
      if (f) return f
    } catch {
      /* URL inválida: cae a `link` */
    }
  }
  return 'link'
}

type Raw = Record<string, unknown>

const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null)

/** `AAAA-MM-DD` desde la fecha ISO de Payload; null si no es una fecha válida. */
function isoDay(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const m = v.match(/^(\d{4}-\d{2}-\d{2})/)
  if (!m || Number.isNaN(Date.parse(`${m[1]}T00:00:00Z`))) return null
  return m[1]
}

/**
 * Convierte las filas del CMS en documentos publicables.
 * Qué hace: prioriza el archivo subido (`file`, resuelto con `resolveFile`, normalmente `resolveMediaUrl`)
 * y, si no resuelve, usa `externalUrl` solo si pasa `isAllowedDocumentUrl`. Descarta filas sin título,
 * con categoría desconocida o sin enlace válido (escenario 9: mejor omitir que publicar un enlace roto o ajeno).
 * Nunca lanza: entradas basura dan una lista vacía.
 */
export function mapLegalDocuments(rows: unknown, resolveFile: (url: unknown) => string | null): LegalDocument[] {
  if (!Array.isArray(rows)) return []
  const out: LegalDocument[] = []
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    const r = row as Raw
    const title = text(r.title)
    const category = typeof r.category === 'string' && CATEGORY_SET.has(r.category) ? (r.category as DocCategory) : null
    if (!title || !category || (typeof r.id !== 'string' && typeof r.id !== 'number')) continue

    const file = r.file && typeof r.file === 'object' ? (r.file as Raw) : null
    const fileHref = file ? resolveFile(file.url) : null
    const external = isAllowedDocumentUrl(r.externalUrl) ? (r.externalUrl as string) : null
    const href = fileHref ?? external
    if (!href) continue

    const format = fileHref
      ? detectFormat({ filename: file?.filename, mimeType: file?.mimeType, url: fileHref })
      : detectFormat({ url: external })

    out.push({
      id: r.id,
      title,
      category,
      description: text(r.description),
      nota: text(r.nota),
      href,
      format,
      estado: typeof r.estado === 'string' && ESTADOS.has(r.estado) ? (r.estado as DocEstado) : 'vigente',
      fechaDocumento: isoDay(r.fechaDocumento),
      order: typeof r.order === 'number' && Number.isFinite(r.order) ? r.order : 99,
    })
  }
  return out
}

/** Agrupa en el orden canónico; dentro de cada grupo, por `order` y luego por título en español. */
export function groupByCategory(docs: LegalDocument[]): CategoryGroup[] {
  const byCat = new Map<DocCategory, LegalDocument[]>()
  for (const d of docs) {
    const list = byCat.get(d.category) ?? []
    list.push(d)
    byCat.set(d.category, list)
  }
  return CATEGORY_ORDER.filter((c) => byCat.has(c)).map((category) => ({
    category,
    docs: [...byCat.get(category)!].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'es')),
  }))
}

/**
 * Normaliza texto para buscar: minúsculas, sin tildes (NFD + quitar diacríticos), sin comillas ni
 * puntuación y con espacios colapsados. Por qué: quien escribe «etica» o «ÉTICA» debe encontrar «Ética».
 */
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

/** Lo mínimo que necesita la búsqueda; la página le agrega etiquetas ya traducidas. */
type Searchable = Pick<LegalDocument, 'title' | 'description' | 'nota'>
type SearchableGroup = { docs: Searchable[] }

export interface FilterResult<G> {
  groups: G[]
  matched: number
  total: number
}

/**
 * Filtra por título, descripción y nota. Cada palabra de la consulta debe aparecer (AND, en cualquier
 * orden). Consulta vacía = todo. Los grupos que quedan sin documentos se omiten; el resto conserva sus
 * propiedades (etiqueta, descripción) para que el cliente no tenga que reconstruirlas.
 */
export function filterGroups<G extends SearchableGroup>(groups: G[], query: string): FilterResult<G> {
  const total = groups.reduce((n, g) => n + g.docs.length, 0)
  const terms = normalizeSearchText(query).split(' ').filter(Boolean)
  if (terms.length === 0) return { groups, matched: total, total }
  const out: G[] = []
  let matched = 0
  for (const g of groups) {
    const docs = g.docs.filter((d) => {
      const haystack = normalizeSearchText([d.title, d.description ?? '', d.nota ?? ''].join(' '))
      return terms.every((t) => haystack.includes(t))
    })
    if (docs.length > 0) {
      out.push({ ...g, docs })
      matched += docs.length
    }
  }
  return { groups: out, matched, total }
}

/**
 * Separa «Reglamento General UNC: Título VII «De las becas…»» en numeral romano y nombre del título.
 * Por qué: los 12 títulos comparten el mismo prefijo; mostrar el numeral como marca hace legible la
 * secuencia real del reglamento. Tolera la errata de comillas del título VI del sitio publicado.
 * Devuelve null si el texto no tiene esa forma (la página muestra entonces el título completo).
 */
export function splitTitulo(title: string): { numeral: string; heading: string } | null {
  const m = title.match(/T[íi]tulo\s+([IVXLC]+)\b\s*[:\-–]?\s*(.+)$/u)
  if (!m) return null
  const heading = m[2].replace(/^[\s«»"“”']+|[\s«»"“”']+$/gu, '').trim()
  if (!heading) return null
  return { numeral: m[1], heading }
}
