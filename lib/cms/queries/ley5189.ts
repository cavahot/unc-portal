import { cmsFetch } from '../client'

export type Ley5189Category =
  | 'organigrama'
  | 'direccion-telefono'
  | 'nomina-personal'
  | 'presupuesto-ingresos-gastos'
  | 'anexo-personal'
  | 'ejecucion-presupuestaria'
  | 'registro-viaticos'
  | 'bienes-patrimoniales'
  | 'funcionarios-comisionados'
  | 'otras-informaciones'
  | 'cumplimiento-art7'

export const CATEGORY_LABELS: Record<Ley5189Category, string> = {
  'organigrama':                 'Organigrama',
  'direccion-telefono':          'Dirección y Teléfono de la Entidad y Dependencias',
  'nomina-personal':             'Nómina del Personal',
  'presupuesto-ingresos-gastos': 'Presupuesto de Ingresos – Gastos',
  'anexo-personal':              'Anexo del Personal',
  'ejecucion-presupuestaria':    'Ejecución Presupuestaria',
  'registro-viaticos':           'Registro Mensual de Viáticos e Informe de Actividades',
  'bienes-patrimoniales':        'Listado de Bienes Patrimoniales',
  'funcionarios-comisionados':   'Listado de Funcionarios Comisionados de Otras Instituciones',
  'otras-informaciones':         'Otras Informaciones',
  'cumplimiento-art7':           'Cumplimiento Art. 7°',
}

export const ALL_CATEGORIES: Ley5189Category[] = [
  'organigrama',
  'direccion-telefono',
  'nomina-personal',
  'presupuesto-ingresos-gastos',
  'anexo-personal',
  'ejecucion-presupuestaria',
  'registro-viaticos',
  'bienes-patrimoniales',
  'funcionarios-comisionados',
  'otras-informaciones',
  'cumplimiento-art7',
]

export interface Ley5189Doc {
  id: string | number
  category: Ley5189Category
  period: string
  description?: string | null
  driveUrl: string
  order: number
}

export interface CategoryGroup {
  category: Ley5189Category
  docs: Ley5189Doc[]
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

export async function getLey5189Documents(): Promise<CategoryGroup[]> {
  const data = await cmsFetch<PayloadResponse>(
    '/ley5189?where[active][equals]=true&sort=order&limit=200&depth=0',
    { tags: ['ley5189'] },
  )

  // Group by category
  const map = new Map<Ley5189Category, Ley5189Doc[]>()

  for (const doc of data.docs) {
    const cat = doc.category as Ley5189Category
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

  // Return groups in the canonical ALL_CATEGORIES order, include empty ones too
  return ALL_CATEGORIES.map((cat) => ({
    category: cat,
    docs: map.get(cat) ?? [],
  }))
}
