import { cmsFetch } from '../client'
import { demoFallbackAllowed, isCmsNotFound } from '../errors'
import type { Carrera, Facultade } from '@unc/cms-types'
import { PayloadResponse } from '../types'

// When queried with depth:1, the facultad relation is always populated.
export type CarreraPopulada = Omit<Carrera, 'facultad'> & {
  facultad: Facultade
  tipo?:    'grado' | 'posgrado'
  sede?:    string
}

export type { Carrera }

// Helper to safely read the populated facultad object
export function getFacultadFromCarrera(carrera: Carrera): Facultade | null {
  if (typeof carrera.facultad === 'object' && carrera.facultad !== null) {
    return carrera.facultad as Facultade
  }
  return null
}

// ─── Fallback data ────────────────────────────────────────────────────────────

const FALLBACK_CARRERAS = [
  {
    id: 1,
    nombre: 'Ingeniería Civil',
    slug: 'ingenieria-civil',
    facultad: { id: 4, nombre: 'Facultad de Ciencias Exactas y Tecnológicas', slug: 'ciencias-exactas', activa: true } as Facultade,
    duracion: 5,
    titulo: 'Ingeniero Civil',
    modalidad: 'Presencial' as const,
    activa: true,
    updatedAt: '',
    createdAt: '',
  },
  {
    id: 2,
    nombre: 'Medicina',
    slug: 'medicina',
    facultad: { id: 2, nombre: 'Facultad de Medicina', slug: 'medicina', activa: true } as Facultade,
    duracion: 6,
    titulo: 'Médico Cirujano',
    modalidad: 'Presencial' as const,
    activa: true,
    updatedAt: '',
    createdAt: '',
  },
  {
    id: 3,
    nombre: 'Odontología',
    slug: 'odontologia',
    facultad: { id: 1, nombre: 'Facultad de Odontología', slug: 'odontologia', activa: true } as Facultade,
    duracion: 5,
    titulo: 'Odontólogo',
    modalidad: 'Presencial' as const,
    activa: true,
    updatedAt: '',
    createdAt: '',
  },
] satisfies CarreraPopulada[]

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Lista de carreras activas (DEP-19b). Producción: CMS caído -> propaga `CmsError`
 * (la página decide; no se cachean carreras inventadas); respuesta vacía -> `[]` real.
 * Solo en desarrollo una caída devuelve FALLBACK_CARRERAS (datos de demostración).
 */
export async function getCarreras(): Promise<CarreraPopulada[]> {
  try {
    const params = new URLSearchParams()
    params.append('where[activa][equals]', 'true')
    params.append('sort', 'nombre')
    params.append('depth', '1')
    params.append('limit', '200')

    const res = await cmsFetch<PayloadResponse<CarreraPopulada>>(`/carreras?${params.toString()}`, {
      tags: ['carreras'],
    })

    return res.docs ?? []
  } catch (error) {
    if (demoFallbackAllowed()) return FALLBACK_CARRERAS
    throw error
  }
}

/**
 * Carrera por slug (DEP-15). Lista vacía o 404 -> `null`; red caída, timeout o
 * 5xx -> propaga `CmsError` (no se cachea como 404). Fallback solo en desarrollo.
 */
export async function getCarreraBySlug(slug: string): Promise<CarreraPopulada | null> {
  try {
    const params = new URLSearchParams()
    params.append('where[slug][equals]', slug)
    params.append('depth', '1')
    params.append('limit', '1')

    const res = await cmsFetch<PayloadResponse<CarreraPopulada>>(`/carreras?${params.toString()}`, {
      tags: ['carreras'],
    })

    return res.docs?.[0] ?? null
  } catch (error) {
    if (isCmsNotFound(error)) return null
    if (demoFallbackAllowed()) return FALLBACK_CARRERAS.find((c) => c.slug === slug) ?? null
    throw error
  }
}

/**
 * Carreras de una facultad por tipo (DEP-19b). Antes devolvía `[]` ante cualquier error, lo que
 * mezclaba «sin carreras» con «CMS caído». Ahora la caída propaga `CmsError` (las páginas de
 * facultad lo capturan y muestran el estado vacío); la respuesta vacía sigue siendo `[]`.
 */
export async function getCarrerasByFacultadAndTipo(
  facultadSlug: string,
  tipo: 'grado' | 'posgrado',
): Promise<CarreraPopulada[]> {
  const params = new URLSearchParams()
  params.append('where[activa][equals]', 'true')
  params.append('where[facultad.slug][equals]', facultadSlug)
  params.append('where[tipo][equals]', tipo)
  params.append('sort', 'nombre')
  params.append('depth', '1')
  params.append('limit', '100')

  const res = await cmsFetch<PayloadResponse<CarreraPopulada>>(`/carreras?${params.toString()}`, {
    tags: ['carreras'],
  })

  return res.docs ?? []
}

/** Carreras de una facultad (DEP-19b): producción propaga la caída; desarrollo usa FALLBACK_CARRERAS. */
export async function getCarrerasByFacultad(facultadSlug: string): Promise<CarreraPopulada[]> {
  try {
    const params = new URLSearchParams()
    params.append('where[activa][equals]', 'true')
    params.append('where[facultad.slug][equals]', facultadSlug)
    params.append('sort', 'nombre')
    params.append('depth', '1')
    params.append('limit', '100')

    const res = await cmsFetch<PayloadResponse<CarreraPopulada>>(`/carreras?${params.toString()}`, {
      tags: ['carreras'],
    })

    return res.docs ?? []
  } catch (error) {
    if (demoFallbackAllowed()) {
      return FALLBACK_CARRERAS.filter((c) => (c.facultad as Facultade).slug === facultadSlug)
    }
    throw error
  }
}
