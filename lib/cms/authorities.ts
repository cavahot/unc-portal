// AUT-01: lógica pura de /autoridades (documento del CMS -> Authority, orden y agrupación).
// Está separada de la consulta y de la página para poder probarla sin red ni React.

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

export interface AuthoritySections {
  /** Rectorado: rector y vicerrector. */
  leaders: Authority[]
  deans: Authority[]
  /** Secretarios y directores. */
  others: Authority[]
}

interface FacultadRef {
  id?: number | string
  nombre?: string
  slug?: string
}

/** Forma (parcial) de un documento de la colección `autoridades` tal como lo devuelve la REST de Payload. */
export interface PayloadAuthority {
  id: string | number
  name?: string | null
  role?: string | null
  type?: string | null
  /** Objeto poblado con depth >= 1; solo un ID con depth = 0. */
  faculty?: FacultadRef | number | string | null
  photo?: { url?: string | null; alt?: string | null; blurDataURL?: string | null } | number | string | null
  cvFile?: { url?: string | null } | number | string | null
  cvUrl?: string | null
  bio?: string | null
  email?: string | null
  order?: number | null
  active?: boolean | null
}

/** Orden de desempate dentro de un mismo `order`: el rector va antes que el vicerrector, etc. */
const TYPE_RANK: Record<AuthorityType, number> = { rector: 0, vicerrector: 1, decano: 2, secretario: 3, director: 4 }

/** Posición para filas sin `order`: al final (igual que el valor por defecto del panel). */
const NO_ORDER = 99

function isAuthorityType(value: unknown): value is AuthorityType {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(TYPE_RANK, value)
}

/** Títulos que preceden al nombre; no deben contarse como iniciales. */
const TITLE = /^(prof|profa|dr|dra|ing|abog|mg|agr|lic|msc|phd|arq|econ|cont)\.?$/i

/**
 * Iniciales para el avatar cuando no hay foto: primeras letras de las dos primeras palabras del nombre
 * SIN los títulos. Antes solo se quitaba el primer título («Prof. Dr. Clarito…» daba «DC» en vez de «CR»).
 * Límite: no entiende nombres compuestos ni prefijos como «De» o «Da»; es solo un adorno visual.
 */
export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => w !== '' && !TITLE.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

/**
 * Convierte documentos del CMS en `Authority` listas para pintar y las ordena.
 *
 * Qué hace: descarta filas inactivas (defensa extra: el CMS ya filtra por `active`), sin nombre/cargo
 * o con un `type` fuera del catálogo (no pertenecerían a ninguna sección); resuelve foto y CV con
 * `resolveUrl` (la URL de media es relativa al CMS, ver lib/cms/mediaUrl.ts); ordena por `order`
 * (sin dato = al final), luego por tipo y por nombre, de modo que el resultado no depende del orden en que
 * llegan las filas. Por qué: el CMS es la fuente de verdad; esta función es el único lugar donde se
 * interpreta su respuesta. Límite: no valida el contenido de `bio` ni de `email` (React escapa el texto).
 */
export function mapAuthorities(docs: readonly PayloadAuthority[], resolveUrl: (url: unknown) => string | null): Authority[] {
  const result: Authority[] = []
  for (const doc of docs) {
    const name = text(doc.name)
    const role = text(doc.role)
    if (doc.active === false || !name || !role || !isAuthorityType(doc.type)) continue

    const faculty = typeof doc.faculty === 'object' && doc.faculty !== null ? text(doc.faculty.nombre) : null
    const photo = typeof doc.photo === 'object' && doc.photo !== null ? doc.photo : null
    const cvFile = typeof doc.cvFile === 'object' && doc.cvFile !== null ? doc.cvFile : null
    // El archivo subido gana al enlace externo; el enlace externo se deja tal cual (la página usa safeHref).
    const cvUrl = (cvFile ? resolveUrl(cvFile.url) : null) ?? text(doc.cvUrl)

    result.push({
      id: doc.id,
      name,
      role,
      type: doc.type,
      faculty,
      photoUrl: photo ? resolveUrl(photo.url) : null,
      photoAlt: photo ? text(photo.alt) : null,
      photoBlur: photo ? text(photo.blurDataURL) : null,
      cvUrl,
      bio: text(doc.bio),
      email: text(doc.email),
      order: typeof doc.order === 'number' && Number.isFinite(doc.order) ? doc.order : NO_ORDER,
    })
  }
  return result.sort(
    (a, b) => a.order - b.order || TYPE_RANK[a.type] - TYPE_RANK[b.type] || a.name.localeCompare(b.name, 'es'),
  )
}

/** Reparte la lista ya ordenada en las tres secciones de la página, conservando el orden. */
export function groupAuthorities(list: readonly Authority[]): AuthoritySections {
  return {
    leaders: list.filter((a) => a.type === 'rector' || a.type === 'vicerrector'),
    deans: list.filter((a) => a.type === 'decano'),
    others: list.filter((a) => a.type === 'secretario' || a.type === 'director'),
  }
}
