import { cmsFetch } from '../client'
import { groupByCategory, mapLegalDocuments, type CategoryGroup } from '../marcoLegal'
import { resolveMediaUrl } from '../mediaUrl'

export type { CategoryGroup, DocCategory, DocEstado, DocFormat, LegalDocument } from '../marcoLegal'

/**
 * MLG-01: documentos de /marco-legal. El CMS (colección `marco-legal`) es la ÚNICA fuente.
 * Spec: docs/specs/portal/MARCO-LEGAL.md §2.1.
 *
 *  - `ok`: hay al menos un documento activo con enlace válido.
 *  - `empty`: el CMS respondió pero no hay documentos publicables: aviso vacío, NUNCA documentos escritos
 *    en el código (una norma obsoleta enlazada desde el código es un dato institucional falso).
 *  - `unavailable`: el CMS no respondió o devolvió una forma inesperada: aviso neutro, la página no da 500.
 *    Con la caché de datos de Next, tras una carga correcta una caída posterior sigue sirviendo la última
 *    respuesta buena; este estado solo aparece si nunca la hubo.
 */
export type LegalDocumentsResult =
  | { status: 'ok'; groups: CategoryGroup[]; total: number }
  | { status: 'empty' }
  | { status: 'unavailable' }

/** Solo lo que pinta la página (sin `active`, que ya filtra el `where`, ni metadatos de Payload). */
const SELECT_FIELDS = ['title', 'category', 'description', 'nota', 'file', 'externalUrl', 'order', 'estado', 'fechaDocumento']

/**
 * Campos del archivo subido. `filename` es obligatorio: `url` es un campo calculado a partir de él (sin
 * pedirlo Payload devuelve `url: null`); `mimeType` alimenta la etiqueta de formato.
 */
const POPULATE_MEDIA = ['url', 'filename', 'mimeType']

/** Tope de filas (PERF-DB: sin consultas sin cota). Hoy son 44 documentos. */
const MAX_DOCUMENTS = 200

/** Red de seguridad si se pierde el aviso de revalidación del CMS; el camino normal es la etiqueta. */
const SAFETY_REVALIDATE_SECONDS = 3600

function buildQuery(): string {
  const params = new URLSearchParams()
  params.set('where[active][equals]', 'true')
  params.set('sort', 'order')
  params.set('limit', String(MAX_DOCUMENTS))
  params.set('depth', '1')
  for (const f of SELECT_FIELDS) params.set(`select[${f}]`, 'true')
  for (const f of POPULATE_MEDIA) params.set(`populate[media][${f}]`, 'true')
  return `/marco-legal?${params.toString()}`
}

/** Lee el CMS y agrupa por categoría; nunca lanza (ver `LegalDocumentsResult`). */
export async function getLegalDocumentSections(): Promise<LegalDocumentsResult> {
  let rows: unknown
  try {
    const data = await cmsFetch<{ docs?: unknown }>(buildQuery(), {
      tags: ['marco-legal'],
      next: { revalidate: SAFETY_REVALIDATE_SECONDS },
    })
    rows = data?.docs
  } catch {
    return { status: 'unavailable' }
  }
  if (!Array.isArray(rows)) return { status: 'unavailable' }
  const docs = mapLegalDocuments(rows, (url) => resolveMediaUrl(url))
  if (docs.length === 0) return { status: 'empty' }
  return { status: 'ok', groups: groupByCategory(docs), total: docs.length }
}
