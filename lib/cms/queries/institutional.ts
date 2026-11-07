import { cmsFetch } from '../client'
import { PayloadResponse } from '../types'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TransparenciaItem {
  label: string
  url?: string | null
  nota?: string | null
}

export interface Transparencia {
  ley5189: TransparenciaItem[]
  ley5282: TransparenciaItem[]
}

export interface Revista {
  id: number
  nombre: string
  slug: string
  descripcion: string
  anioInicio: number
  urlOjs: string
  portada?: {
    id: number
    alt: string
    url?: string | null
  } | null
  activa: boolean
}

export interface EnlacesExternos {
  formularioTitulos?: string | null
  urlPortalInfoPublica?: string | null
  contenidoInfoPublica?: any | null
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getTransparencia(): Promise<Transparencia> {
  try {
    return await cmsFetch<Transparencia>('/globals/transparencia', {
      tags: ['transparencia'],
    })
  } catch {
    return { ley5189: [], ley5282: [] }
  }
}

export async function getRevistas(
  options: { limit?: number } = {},
): Promise<PayloadResponse<Revista>> {
  try {
    const params = new URLSearchParams()
    params.append('where[activa][equals]', 'true')
    params.append('sort', 'nombre')
    if (options.limit) params.append('limit', String(options.limit))

    return await cmsFetch<PayloadResponse<Revista>>(`/revistas?${params.toString()}`, {
      tags: ['revistas'],
    })
  } catch {
    return {
      docs: [],
      totalDocs: 0,
      limit: options.limit ?? 10,
      totalPages: 1,
      page: 1,
      pagingCounter: 1,
      hasNextPage: false,
      hasPrevPage: false,
      prevPage: null,
      nextPage: null,
    }
  }
}

export async function getEnlacesExternos(): Promise<EnlacesExternos> {
  try {
    return await cmsFetch<EnlacesExternos>('/globals/enlaces-externos', {
      tags: ['enlaces-externos'],
    })
  } catch {
    return {
      formularioTitulos: '',
      urlPortalInfoPublica: '',
      contenidoInfoPublica: null,
    }
  }
}

