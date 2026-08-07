import { cmsFetch } from '../client'

export type AuthorityType = 'rector' | 'vicerrector' | 'decano' | 'secretario' | 'director'

export interface Authority {
  id: string | number
  name: string
  role: string
  type: AuthorityType
  faculty?: string | null
  photoUrl?: string | null
  photoAlt?: string | null
  photoBlur?: string | null
  cvUrl?: string | null
  bio?: string | null
  email?: string | null
  order: number
}

interface PayloadAuthority {
  id: string | number
  name: string
  role: string
  type: string
  faculty?: string
  photo?: { url?: string; alt?: string; blurDataURL?: string } | null
  cvFile?: { url?: string } | null
  cvUrl?: string
  bio?: string
  email?: string
  order?: number
}

interface PayloadResponse {
  docs: PayloadAuthority[]
}

export async function getAuthorities(): Promise<Authority[]> {
  const data = await cmsFetch<PayloadResponse>(
    '/autoridades?where[active][equals]=true&sort=order&limit=50&depth=1',
    { tags: ['autoridades'] },
  )

  return data.docs.map((doc) => ({
    id: doc.id,
    name: doc.name,
    role: doc.role,
    type: doc.type as AuthorityType,
    faculty: doc.faculty ?? null,
    photoUrl: doc.photo?.url ?? null,
    photoAlt: doc.photo?.alt ?? null,
    photoBlur: doc.photo?.blurDataURL ?? null,
    cvUrl: doc.cvFile?.url ?? doc.cvUrl ?? null,
    bio: doc.bio ?? null,
    email: doc.email ?? null,
    order: doc.order ?? 99,
  }))
}
