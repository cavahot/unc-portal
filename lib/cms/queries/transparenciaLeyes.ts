import { cmsFetch } from '../client'
import { mapLeyDocs, type LeyKey, type LeyResult } from '../transparenciaLeyes'

// TRANS-01: consulta común de las leyes 5189 y 5282. El CMS (colecciones `ley5189`/`ley5282`) es la ÚNICA fuente:
// no hay datos de demostración ni enlaces de relleno. Spec: docs/specs/portal/TRANSPARENCIA-LEYES.md §2.2.
//  - `ok`: hay al menos un documento publicado.
//  - `empty`: el CMS respondió sin filas; se conserva la estructura legal para mostrar "aún no publicados".
//  - `unavailable`: red caída, error HTTP o forma inesperada; NO se disfraza de "sin documentos".

/** Solo lo que pinta la página (sin `active`, que ya filtra el `where`, ni metadatos de Payload). */
const DOC_FIELDS = ['item', 'category', 'period', 'description', 'driveUrl', 'order']
const ITEM_FIELDS = ['codigo', 'titulo', 'descripcion', 'orden', 'active']

/** Tope de filas (PERF-DB: sin consultas sin cota). Decenas de ítems y cientos de documentos caben de sobra. */
const MAX_ITEMS = 200
const MAX_DOCS = 1000

/** Red de seguridad si se pierde el aviso de revalidación del CMS; el camino normal es la etiqueta. */
const SAFETY_REVALIDATE_SECONDS = 3600

function buildDocsQuery(ley: LeyKey): string {
  const params = new URLSearchParams()
  params.set('where[active][equals]', 'true')
  params.set('sort', 'order')
  params.set('limit', String(MAX_DOCS))
  params.set('depth', '0')
  for (const f of DOC_FIELDS) params.set(`select[${f}]`, 'true')
  return `/${ley}?${params.toString()}`
}

/** Ítems de esta ley (`ley` = 5189 o 5282), solo publicados, por `orden`. */
function buildItemsQuery(ley: LeyKey): string {
  const params = new URLSearchParams()
  params.set('where[ley][equals]', ley.replace('ley', ''))
  params.set('where[active][equals]', 'true')
  params.set('sort', 'orden')
  params.set('limit', String(MAX_ITEMS))
  params.set('depth', '0')
  for (const f of ITEM_FIELDS) params.set(`select[${f}]`, 'true')
  return `/transparencia-items?${params.toString()}`
}

/** Lee ítems y documentos del CMS y agrupa por ítem; nunca lanza (ver `LeyResult`). */
export async function getLeyDocuments(ley: LeyKey): Promise<LeyResult> {
  try {
    const [items, docs] = await Promise.all([
      cmsFetch<{ docs?: unknown }>(buildItemsQuery(ley), { tags: ['transparencia-items', ley], next: { revalidate: SAFETY_REVALIDATE_SECONDS } }),
      cmsFetch<{ docs?: unknown }>(buildDocsQuery(ley), { tags: [ley], next: { revalidate: SAFETY_REVALIDATE_SECONDS } }),
    ])
    const { groups, total } = mapLeyDocs(items?.docs, docs?.docs)
    return total === 0 ? { status: 'empty', groups, total: 0 } : { status: 'ok', groups, total }
  } catch {
    return { status: 'unavailable' }
  }
}
