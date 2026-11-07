import { cmsFetch } from '../client'

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

