import { cmsFetch } from '../client'
import type { Facultade } from '@unc/cms-types'
import { PayloadResponse } from '../types'

export type Facultad = Facultade

// ─── Fallback data ────────────────────────────────────────────────────────────

const FALLBACK_FACULTADES: Facultad[] = [
  { id: 1, nombre: 'Facultad de Odontología', slug: 'odontologia', activa: true, updatedAt: '', createdAt: '' },
  { id: 2, nombre: 'Facultad de Medicina', slug: 'medicina', activa: true, updatedAt: '', createdAt: '' },
  { id: 3, nombre: 'Facultad de Ciencias Agrarias', slug: 'ciencias-agrarias', activa: true, updatedAt: '', createdAt: '' },
  { id: 4, nombre: 'Facultad de Ciencias Exactas y Tecnológicas', slug: 'ciencias-exactas', activa: true, updatedAt: '', createdAt: '' },
  { id: 5, nombre: 'Facultad de Humanidades y Ciencias de la Educación', slug: 'humanidades', activa: true, updatedAt: '', createdAt: '' },
  { id: 6, nombre: 'Facultad de Ciencias Económicas y Administrativas', slug: 'ciencias-economicas', activa: true, updatedAt: '', createdAt: '' },
]

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getFacultades(): Promise<Facultad[]> {
  try {
    const params = new URLSearchParams()
    params.append('where[activa][equals]', 'true')
    params.append('sort', 'nombre')
    params.append('limit', '100')

    const res = await cmsFetch<PayloadResponse<Facultad>>(`/facultades?${params.toString()}`, {
      tags: ['facultades'],
    })

    return res.docs ?? FALLBACK_FACULTADES
  } catch {
    return FALLBACK_FACULTADES
  }
}

export async function getFacultadBySlug(slug: string): Promise<Facultad | null> {
  try {
    const params = new URLSearchParams()
    params.append('where[slug][equals]', slug)
    params.append('limit', '1')

    const res = await cmsFetch<PayloadResponse<Facultad>>(`/facultades?${params.toString()}`, {
      tags: ['facultades'],
    })

    return res.docs?.[0] ?? null
  } catch {
    return FALLBACK_FACULTADES.find((f) => f.slug === slug) ?? null
  }
}
