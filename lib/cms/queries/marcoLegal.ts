import { cmsFetch } from '../client'

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

export interface LegalDocument {
  id: string | number
  title: string
  category: DocCategory
  description?: string | null
  fileUrl?: string | null
  externalUrl?: string | null
  order: number
}

export interface CategoryGroup {
  category: DocCategory
  label: string
  docs: LegalDocument[]
}

export const CATEGORY_LABELS: Record<DocCategory, string> = {
  'ley-creacion':           'Ley de Creación',
  'estatuto':               'Estatuto Universitario',
  'reglamento-general':     'Reglamento General',
  'reglamentos-especiales': 'Reglamentos Especiales',
  'codigos':                'Códigos Institucionales',
  'politicas':              'Políticas Institucionales',
  'planes':                 'Planes Estratégicos',
  'manuales':               'Manuales',
  'procedimientos':         'Procedimientos',
  'protocolos':             'Protocolos',
}

export const CATEGORY_ORDER: DocCategory[] = [
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

interface PayloadDoc {
  id: string | number
  title: string
  category: string
  description?: string
  file?: { url?: string } | null
  externalUrl?: string
  order?: number
}

interface PayloadResponse {
  docs: PayloadDoc[]
}

export async function getLegalDocuments(): Promise<CategoryGroup[]> {
  const data = await cmsFetch<PayloadResponse>(
    '/marco-legal?where[active][equals]=true&sort=order&limit=200&depth=1',
    { tags: ['marco-legal'] },
  )

  const docs: LegalDocument[] = data.docs.map((doc) => ({
    id: doc.id,
    title: doc.title,
    category: doc.category as DocCategory,
    description: doc.description ?? null,
    fileUrl: doc.file?.url ?? null,
    externalUrl: doc.externalUrl ?? null,
    order: doc.order ?? 99,
  }))

  const grouped = new Map<DocCategory, LegalDocument[]>()
  for (const doc of docs) {
    if (!grouped.has(doc.category)) grouped.set(doc.category, [])
    grouped.get(doc.category)!.push(doc)
  }

  return CATEGORY_ORDER
    .filter((cat) => grouped.has(cat))
    .map((cat) => ({
      category: cat,
      label: CATEGORY_LABELS[cat],
      docs: grouped.get(cat)!,
    }))
}
