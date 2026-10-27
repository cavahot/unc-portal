// TRANS-01/02: módulo puro (sin red ni React) de las leyes de transparencia 5189/2014 y 5282/2014.
// Qué hace: valida los enlaces y agrupa las filas del CMS (ítems + documentos) en el orden del CMS.
// Por qué aquí: lo comparten las dos consultas, el hub /transparencia y las pruebas.
// TRANS-02: los ítems (categorías) ya NO están en este módulo: viven en la colección `transparencia-items` del CMS
// y el portal los lee (regla «todo contenido en CMS + BD»). Spec: docs/specs/portal/TRANSPARENCIA-ITEMS.md §2.4.

export type LeyKey = 'ley5189' | 'ley5282'

/**
 * Hosts desde los que se acepta el documento (igual a `ALLOWED_CONVENIO_HOSTS` y a la allowlist del CMS).
 * Amenaza: enlazar contenido ajeno con la marca institucional. Límite: no comprueba que el archivo exista.
 */
export const ALLOWED_TRANSPARENCIA_HOSTS: readonly string[] = ['drive.google.com', 'docs.google.com', 'www.unc.edu.py', 'unc.edu.py']

/** true solo para `https://` bien formado, sin credenciales, con host exacto de la allowlist. */
export function isAllowedTransparenciaUrl(url: unknown): boolean {
  if (typeof url !== 'string' || url !== url.trim() || url.length === 0 || url.length > 2048) return false
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return false
  return ALLOWED_TRANSPARENCIA_HOSTS.includes(parsed.hostname.toLowerCase())
}

export interface LeyDoc {
  id: string | number
  category: string
  period: string
  description: string | null
  driveUrl: string
  order: number
}

export interface LeyCategoryGroup {
  /** Código estable del ítem (ancla `#cat-<codigo>`). */
  category: string
  /** Título oficial del ítem, tal como lo escribe el PO en el CMS. */
  label: string
  description: string | null
  docs: LeyDoc[]
}

/**
 * Resultado de la consulta; ver `getLeyDocuments`. `empty` = no hay documentos publicados (los ítems, si existen,
 * se muestran con «aún no publicados»); sin ítems el arreglo `groups` viene vacío.
 */
export type LeyResult =
  | { status: 'ok'; groups: LeyCategoryGroup[]; total: number }
  | { status: 'empty'; groups: LeyCategoryGroup[]; total: 0 }
  | { status: 'unavailable' }

const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)

/**
 * Agrupa los documentos del CMS por ítem. Los ítems llegan ya filtrados (activos) y ordenados por `orden`; aquí se
 * defiende además: se descartan ítems inactivos, sin código o sin título, y duplicados por código. Un documento se
 * muestra solo si su ítem (relación `item`, id) está entre los ítems activos, tiene período y un enlace de la
 * allowlist: así retirar un ítem oculta sus documentos y una fila corrupta no se publica. Lanza si `items` o `docs`
 * no son arreglos (la consulta lo traduce a `unavailable`).
 */
export function mapLeyDocs(items: unknown, docs: unknown): { groups: LeyCategoryGroup[]; total: number } {
  if (!Array.isArray(items) || !Array.isArray(docs)) throw new Error('Respuesta inesperada del CMS: se esperaban arreglos de ítems y documentos.')
  const order = (r: Record<string, unknown>) => (typeof r.orden === 'number' && Number.isFinite(r.orden) ? r.orden : 0)
  const valid: Array<{ id: string | number; codigo: string; titulo: string; descripcion: string | null; orden: number; seq: number }> = []
  const seen = new Set<string>()
  items.forEach((raw, seq) => {
    if (!raw || typeof raw !== 'object') return
    const r = raw as Record<string, unknown>
    const codigo = text(r.codigo)
    const titulo = text(r.titulo)
    if (r.active === false || !codigo || !titulo || (typeof r.id !== 'number' && typeof r.id !== 'string') || seen.has(codigo)) return
    seen.add(codigo)
    valid.push({ id: r.id, codigo, titulo, descripcion: text(r.descripcion), orden: order(r), seq })
  })
  // Orden estable: `orden` del PO y, si empata, el orden en que llegó del CMS.
  valid.sort((a, b) => a.orden - b.orden || a.seq - b.seq)
  const byItem = new Map<string, LeyDoc[]>(valid.map((i) => [String(i.id), []]))
  let total = 0
  for (const raw of docs) {
    if (!raw || typeof raw !== 'object') continue
    const r = raw as Record<string, unknown>
    const ref = r.item && typeof r.item === 'object' ? (r.item as { id?: unknown }).id : r.item
    const list = typeof ref === 'number' || typeof ref === 'string' ? byItem.get(String(ref)) : undefined
    const period = text(r.period)
    if (!list || !period || !isAllowedTransparenciaUrl(r.driveUrl)) continue
    list.push({
      id: typeof r.id === 'number' || typeof r.id === 'string' ? r.id : `${String(ref)}-${total}`,
      category: String(r.category ?? ''),
      period,
      description: text(r.description),
      driveUrl: r.driveUrl as string,
      order: order({ orden: r.order }),
    })
    total++
  }
  const groups = valid.map((i) => ({
    category: i.codigo,
    label: i.titulo,
    description: i.descripcion,
    docs: (byItem.get(String(i.id)) ?? []).sort((a, b) => a.order - b.order),
  }))
  return { groups, total }
}
