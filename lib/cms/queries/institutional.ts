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

export interface Tesis {
  id: number
  titulo: string
  autor: string
  anio: number
  resumen?: string | null
  /** Nombre de la facultad, extraído de la relación con `depth=1`. */
  facultad: string
  urlPdf: string
}

/** Raw shape returned by the Payload API before population is extracted. */
interface TesisRaw {
  id: number
  titulo: string
  autor: string
  anio: number
  resumen?: string | null
  facultad?: { nombre: string; slug: string } | number | null
  urlPdf: string
}

function normalizeTesis(raw: TesisRaw): Tesis {
  return {
    ...raw,
    facultad:
      typeof raw.facultad === 'object' && raw.facultad !== null
        ? raw.facultad.nombre
        : String(raw.facultad ?? ''),
  }
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

const DEMO_TESIS: Tesis[] = []

export async function getTesisByQuery(
  q: string,
  options: { limit?: number } = {},
): Promise<PayloadResponse<Tesis>> {
  const limit = options.limit ?? 12
  try {
    const params = new URLSearchParams()
    params.append('where[or][0][titulo][like]', q)
    params.append('where[or][1][autor][like]', q)
    params.append('sort', '-anio')
    params.append('limit', String(limit))

    const raw = await cmsFetch<PayloadResponse<TesisRaw>>(
      `/tesis?${params.toString()}&depth=1`,
      { tags: ['tesis'] },
    )
    return { ...raw, docs: raw.docs.map(normalizeTesis) }
  } catch {
    const lower = q.toLowerCase()
    const docs = DEMO_TESIS.filter(
      (t) =>
        t.titulo.toLowerCase().includes(lower) ||
        t.autor.toLowerCase().includes(lower),
    )
    return {
      docs,
      totalDocs: docs.length,
      limit,
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
