import { cmsFetch } from '../client'

export type Ley5282Category =
  | 'item-1'
  | 'item-2'
  | 'item-3'
  | 'item-4'
  | 'item-5'
  | 'item-6'
  | 'item-7'
  | 'item-8'
  | 'item-9'
  | 'item-10'
  | 'item-11'
  | 'item-12'
  | 'item-13'
  | 'item-14'
  | 'item-15'
  | 'item-16'
  | 'item-17'

export const CATEGORY_LABELS: Record<Ley5282Category, string> = {
  'item-1':  'Su estructura orgánica',
  'item-2':  'Facultades, deberes, funciones y/o atribuciones de sus órganos y dependencias',
  'item-3':  'Marco normativo que rija su funcionamiento',
  'item-4':  'Descripción general de cómo funciona y proceso de toma de decisiones',
  'item-5':  'Listado actualizado de personas que cumplan función pública o sean funcionarios públicos',
  'item-6':  'Descripción de la política institucional y de los planes de acción',
  'item-7':  'Descripción de los programas institucionales en ejecución',
  'item-8':  'Informes de auditoría',
  'item-9':  'Informes de viajes oficiales dentro del territorio o al extranjero',
  'item-10': 'Convenios y contratos celebrados',
  'item-11': 'Cartas oficiales',
  'item-12': 'Informes finales de consultorías',
  'item-13': 'Cuadros de resultados',
  'item-14': 'Lista de poderes vigentes otorgados a abogados',
  'item-15': 'Sistema de mantenimiento, clasificación e índice de documentos existentes',
  'item-16': 'Procedimientos para que personas interesadas puedan acceder a documentos',
  'item-17': 'Mecanismos de participación ciudadana',
}

export const ALL_CATEGORIES: Ley5282Category[] = [
  'item-1',
  'item-2',
  'item-3',
  'item-4',
  'item-5',
  'item-6',
  'item-7',
  'item-8',
  'item-9',
  'item-10',
  'item-11',
  'item-12',
  'item-13',
  'item-14',
  'item-15',
  'item-16',
  'item-17',
]

export interface Ley5282Doc {
  id: string | number
  category: Ley5282Category
  period: string
  description?: string | null
  driveUrl: string
  order: number
}

export interface CategoryGroup {
  category: Ley5282Category
  docs: Ley5282Doc[]
}

interface PayloadDoc {
  id: string | number
  category: string
  period: string
  description?: string | null
  driveUrl: string
  order?: number | null
  active?: boolean | null
}

interface PayloadResponse {
  docs: PayloadDoc[]
  totalDocs: number
}

export async function getLey5282Documents(): Promise<CategoryGroup[]> {
  const data = await cmsFetch<PayloadResponse>(
    '/ley5282?where[active][equals]=true&sort=order&limit=200&depth=0',
    { tags: ['ley5282'] },
  )

  // Group by category
  const map = new Map<Ley5282Category, Ley5282Doc[]>()

  for (const doc of data.docs) {
    const cat = doc.category as Ley5282Category
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push({
      id: doc.id,
      category: cat,
      period: doc.period,
      description: doc.description ?? null,
      driveUrl: doc.driveUrl,
      order: doc.order ?? 0,
    })
  }

  // Return groups in canonical ALL_CATEGORIES order, include empty ones too
  return ALL_CATEGORIES.map((cat) => ({
    category: cat,
    docs: map.get(cat) ?? [],
  }))
}
