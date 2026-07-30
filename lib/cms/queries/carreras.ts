import { cmsFetch } from '../client'
import { PayloadResponse } from '../types'

// ─── Types ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Carrera = any

// ─── Fallback data ────────────────────────────────────────────────────────────

const FALLBACK_CARRERAS: Carrera[] = [
  {
    id: '1',
    nombre: 'Ingeniería Civil',
    slug: 'ingenieria-civil',
    facultad: { nombre: 'Facultad de Ciencias Exactas y Tecnológicas', slug: 'ciencias-exactas' },
    duracion: 5,
    titulo: 'Ingeniero Civil',
    modalidad: 'Presencial',
    activa: true,
  },
  {
    id: '2',
    nombre: 'Medicina',
    slug: 'medicina',
    facultad: { nombre: 'Facultad de Medicina', slug: 'medicina' },
    duracion: 6,
    titulo: 'Médico Cirujano',
    modalidad: 'Presencial',
    activa: true,
  },
  {
    id: '3',
    nombre: 'Odontología',
    slug: 'odontologia',
    facultad: { nombre: 'Facultad de Odontología', slug: 'odontologia' },
    duracion: 5,
    titulo: 'Odontólogo',
    modalidad: 'Presencial',
    activa: true,
  },
]

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getCarreras(): Promise<Carrera[]> {
  try {
    const params = new URLSearchParams()
    params.append('where[activa][equals]', 'true')
    params.append('sort', 'nombre')
    params.append('depth', '1')
    params.append('limit', '200')

    const res = await cmsFetch<PayloadResponse<Carrera>>(`/carreras?${params.toString()}`, {
      tags: ['carreras'],
    })

    return res.docs ?? FALLBACK_CARRERAS
  } catch {
    return FALLBACK_CARRERAS
  }
}

export async function getCarreraBySlug(slug: string): Promise<Carrera | null> {
  try {
    const params = new URLSearchParams()
    params.append('where[slug][equals]', slug)
    params.append('depth', '1')
    params.append('limit', '1')

    const res = await cmsFetch<PayloadResponse<Carrera>>(`/carreras?${params.toString()}`, {
      tags: ['carreras'],
    })

    return res.docs?.[0] ?? null
  } catch {
    return FALLBACK_CARRERAS.find((c) => c.slug === slug) ?? null
  }
}

export async function getCarrerasByFacultad(facultadSlug: string): Promise<Carrera[]> {
  try {
    const params = new URLSearchParams()
    params.append('where[activa][equals]', 'true')
    params.append('where[facultad.slug][equals]', facultadSlug)
    params.append('sort', 'nombre')
    params.append('depth', '1')
    params.append('limit', '100')

    const res = await cmsFetch<PayloadResponse<Carrera>>(`/carreras?${params.toString()}`, {
      tags: ['carreras'],
    })

    return res.docs ?? FALLBACK_CARRERAS.filter((c) => c.facultad?.slug === facultadSlug)
  } catch {
    return FALLBACK_CARRERAS.filter((c) => c.facultad?.slug === facultadSlug)
  }
}
