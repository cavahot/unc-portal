// FAC-01: dominio de la página de facultad (spec docs/specs/portal/FACULTADES.md §2).
// Funciones puras, sin red ni React: interpretan la respuesta del CMS y deciden qué se publica. Son el único lugar
// donde un dato del CMS se convierte en texto o enlace de la página; se prueban en tests/unit/fac01-facultad-module.spec.ts.
import { safeLogoPath } from '@/lib/awards/logoPath'

/**
 * Hosts EXACTOS de los documentos de resoluciones (misma lista que `RESOLUCION_HOSTS` del CMS; lo comprueba un test).
 * Por qué se repite aquí: el CMS valida al guardar, la página revalida al leer (defensa si la fila se escribió en la
 * BD por otra vía). Límite: confía en cualquier archivo público de esos hosts.
 */
export const RESOLUCION_HOSTS = ['drive.google.com', 'www.unc.edu.py', 'unc.edu.py', 'www.founc.edu.py', 'founc.edu.py'] as const

/** Hosts permitidos por red social (igual a `RED_HOSTS` del CMS). */
export const RED_HOSTS: Record<string, readonly string[]> = {
  facebook: ['www.facebook.com', 'facebook.com', 'm.facebook.com'],
  instagram: ['www.instagram.com', 'instagram.com'],
  x: ['x.com', 'twitter.com', 'www.x.com', 'www.twitter.com'],
  youtube: ['www.youtube.com', 'youtube.com'],
}

export type RedSocial = 'facebook' | 'instagram' | 'x' | 'youtube'

export interface FacultadDetalle {
  id: number | string
  nombre: string
  slug: string
  siglas?: string
  descripcion?: string
  /** Párrafos de la reseña (separados por una línea en blanco en el panel). */
  historia: string[]
  direccion?: string
  telefono?: string
  telHref?: string
  emails: Array<{ email: string; etiqueta?: string }>
  sitioWeb?: { href: string; label: string }
  redes: Array<{ red: RedSocial; url: string }>
  logoSrc?: string
  imagen?: { url: string; alt?: string }
}

type Raw = Record<string, unknown>
const isObj = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v)
const text = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
const isId = (v: unknown): v is number | string => typeof v === 'number' || (typeof v === 'string' && v !== '')

/** Correo con forma razonable (sin espacios, una @, dominio con punto). Evita `mailto:` con texto arbitrario. */
const EMAIL = /^[^\s@<>()]+@[^\s@<>()]+\.[a-z]{2,}$/i

/**
 * Devuelve la URL solo si es https, sin credenciales y con host EXACTO en `hosts`; si no, `undefined`.
 * Amenaza que evita: `javascript:`, `http:`, `//host`, dominios parecidos (`drive.google.com.evil.example`) o
 * credenciales incrustadas en un enlace con la marca UNC. Límite: no comprueba que el destino exista.
 */
export function allowedHttpsHref(url: unknown, hosts?: readonly string[]): string | undefined {
  const value = text(url)
  if (!value || value.length > 2048) return undefined
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return undefined
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || !parsed.hostname) return undefined
  if (hosts && !hosts.includes(parsed.hostname.toLowerCase())) return undefined
  return value
}

/**
 * «(595 331) 241680» -> «tel:+595331241680». Solo dígitos: el texto del CMS nunca entra crudo al `href`.
 * Prefijo `+` solo si el número ya trae el código de país 595. Menos de 6 dígitos -> sin enlace.
 */
export function telHref(phone: unknown): string | undefined {
  const digits = typeof phone === 'string' ? phone.replace(/\D/g, '') : ''
  if (digits.length < 6 || digits.length > 15) return undefined
  return digits.startsWith('595') ? `tel:+${digits}` : `tel:${digits}`
}

/** Búsqueda de la dirección en OpenStreetMap (sin claves ni rastreo); `undefined` si no hay dirección. */
export function mapsSearchHref(direccion: string | undefined): string | undefined {
  if (!direccion) return undefined
  const query = `${direccion.replace(/\.\s*$/, '')}, Concepción, Paraguay`
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`
}

/**
 * Documento de `facultades` -> datos de la página. `null` si la fila está inactiva o no tiene nombre/slug: la
 * página responde 404 en lugar de mostrar una facultad a medias. Correos, redes, sitio y logo se filtran (ver
 * `allowedHttpsHref` y `safeLogoPath`). Límite: no valida la verdad del texto, solo su forma.
 */
export function mapFacultad(raw: unknown, resolveUrl: (u: unknown) => string | null = () => null): FacultadDetalle | null {
  if (!isObj(raw) || raw.activa === false || !isId(raw.id)) return null
  const nombre = text(raw.nombre)
  const slug = text(raw.slug)
  if (!nombre || !slug) return null

  const emails: FacultadDetalle['emails'] = []
  const pushEmail = (email: unknown, etiqueta?: unknown) => {
    const e = text(email)
    if (e && EMAIL.test(e) && !emails.some((x) => x.email === e)) emails.push(text(etiqueta) ? { email: e, etiqueta: text(etiqueta) } : { email: e })
  }
  pushEmail(raw.email)
  if (Array.isArray(raw.correosAdicionales)) for (const c of raw.correosAdicionales) if (isObj(c)) pushEmail(c.email, c.etiqueta)

  const redes: FacultadDetalle['redes'] = []
  if (Array.isArray(raw.redes)) {
    for (const r of raw.redes) {
      if (!isObj(r) || typeof r.red !== 'string' || !RED_HOSTS[r.red]) continue
      const url = allowedHttpsHref(r.url, RED_HOSTS[r.red])
      if (url) redes.push({ red: r.red as RedSocial, url })
    }
  }

  const sitio = allowedHttpsHref(raw.sitioWeb)
  const historia = (text(raw.historia) ?? '').split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean)
  const telefono = text(raw.telefono)
  let imagen: FacultadDetalle['imagen']
  if (isObj(raw.imagen)) {
    const url = resolveUrl(raw.imagen.url)
    if (url) imagen = { url, alt: text(raw.imagen.alt) }
  }

  return {
    id: raw.id,
    nombre,
    slug,
    siglas: text(raw.siglas),
    descripcion: text(raw.descripcion),
    historia,
    direccion: text(raw.direccion),
    telefono,
    telHref: telHref(telefono),
    emails,
    sitioWeb: sitio ? { href: sitio, label: new URL(sitio).hostname } : undefined,
    redes,
    logoSrc: safeLogoPath(raw.logoPath, 'facultades'),
    imagen,
  }
}

// ── Carreras ──────────────────────────────────────────────────────────────────

export interface Resolucion {
  numero: string
  /** Solo si el host está en RESOLUCION_HOSTS. */
  href?: string
  detalle?: string
}

export interface CarreraItem {
  id: number | string
  nombre: string
  tipo: 'grado' | 'posgrado'
  sede?: string
  modalidad?: string
  duracion?: number
  titulo?: string
  descripcion?: string
  perfil?: string
  resoluciones: Resolucion[]
  orden: number
}

const NUMERO = /^\d{1,4}\/\d{2,4}$/
const DEFAULT_ORDEN = 99

function mapResoluciones(row: Raw): Resolucion[] {
  const out: Resolucion[] = []
  if (Array.isArray(row.resoluciones)) {
    for (const r of row.resoluciones) {
      if (!isObj(r)) continue
      const numero = text(r.numero)
      if (!numero || !NUMERO.test(numero)) continue
      const href = allowedHttpsHref(r.enlace, RESOLUCION_HOSTS)
      const detalle = text(r.detalle)
      out.push({ numero, ...(href ? { href } : {}), ...(detalle ? { detalle } : {}) })
    }
  }
  // Campo obsoleto `resolucion` (texto): se muestra sin enlace solo si no hay resoluciones nuevas.
  const legacy = text(row.resolucion)
  if (out.length === 0 && legacy && NUMERO.test(legacy)) out.push({ numero: legacy })
  return out
}

/**
 * Filas de `carreras` -> grado y posgrado ordenados por `orden` y nombre. Descarta inactivas (defensa: el CMS ya
 * filtra), sin nombre o con un tipo desconocido. `duracion`/`titulo` solo si existen: nunca se completan.
 */
export function mapCarreras(rows: unknown): { grado: CarreraItem[]; posgrado: CarreraItem[] } {
  const items: CarreraItem[] = []
  if (Array.isArray(rows)) {
    for (const r of rows) {
      if (!isObj(r) || r.activa === false || !isId(r.id)) continue
      const nombre = text(r.nombre)
      if (!nombre || (r.tipo !== 'grado' && r.tipo !== 'posgrado')) continue
      const duracion = typeof r.duracion === 'number' && r.duracion > 0 && r.duracion <= 12 ? r.duracion : undefined
      items.push({
        id: r.id,
        nombre,
        tipo: r.tipo,
        sede: text(r.sede),
        modalidad: text(r.modalidad),
        duracion,
        titulo: text(r.titulo),
        descripcion: text(r.descripcion),
        perfil: text(r.perfil),
        resoluciones: mapResoluciones(r),
        orden: typeof r.orden === 'number' && Number.isFinite(r.orden) ? r.orden : DEFAULT_ORDEN,
      })
    }
  }
  items.sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'))
  return { grado: items.filter((c) => c.tipo === 'grado'), posgrado: items.filter((c) => c.tipo === 'posgrado') }
}

// ── Aranceles de la facultad ─────────────────────────────────────────────────

/** Orden de los grupos tal como los publica la fuente oficial (S1 de la spec). */
export const ARANCEL_FACULTAD_GRUPOS = ['multas', 'venta', 'servicios', 'medicos'] as const
export type ArancelFacultadGrupo = (typeof ARANCEL_FACULTAD_GRUPOS)[number]

/** Igual a `ARANCEL_MAX_MONTO` del CMS (un monto mayor es casi seguro un error de tipeo). */
const MAX_MONTO = 100_000_000

export interface ArancelFacultad {
  id: number | string
  concepto: string
  monto: number
  grupo: ArancelFacultadGrupo
  orden: number
  nota?: string
}

const isGrupo = (v: unknown): v is ArancelFacultadGrupo =>
  typeof v === 'string' && (ARANCEL_FACULTAD_GRUPOS as readonly string[]).includes(v)

/**
 * Filas de `aranceles-facultad` -> aranceles válidos. Descarta retirados, concepto vacío, grupo desconocido y monto
 * no entero, negativo o sobre el tope. Por qué: es un precio oficial; una fila corrupta no se publica. Límite: no
 * detecta un monto válido pero equivocado.
 */
export function mapArancelesFacultad(rows: unknown): ArancelFacultad[] {
  const out: ArancelFacultad[] = []
  if (!Array.isArray(rows)) return out
  for (const r of rows) {
    if (!isObj(r) || r.active === false || !isId(r.id)) continue
    const concepto = text(r.concepto)
    const monto = r.monto
    if (!concepto || !isGrupo(r.grupo) || typeof monto !== 'number' || !Number.isInteger(monto) || monto < 0 || monto > MAX_MONTO) continue
    const nota = text(r.nota)
    out.push({
      id: r.id,
      concepto,
      monto,
      grupo: r.grupo,
      orden: typeof r.orden === 'number' && Number.isFinite(r.orden) ? r.orden : DEFAULT_ORDEN,
      ...(nota ? { nota } : {}),
    })
  }
  return out
}

/** Agrupa en el orden de la fuente; dentro, por `orden` y concepto. Omite grupos vacíos. */
export function groupArancelesFacultad(items: ArancelFacultad[]): Array<{ grupo: ArancelFacultadGrupo; items: ArancelFacultad[] }> {
  return ARANCEL_FACULTAD_GRUPOS.map((grupo) => ({
    grupo,
    items: items.filter((i) => i.grupo === grupo).sort((a, b) => a.orden - b.orden || a.concepto.localeCompare(b.concepto, 'es')),
  })).filter((g) => g.items.length > 0)
}

// ── Índice de la página ──────────────────────────────────────────────────────

export const SECTION_ORDER = ['presentacion', 'grado', 'posgrado', 'decanato', 'acreditacion', 'aranceles', 'contacto'] as const
export type SectionId = (typeof SECTION_ORDER)[number]

/**
 * Secciones que se pintan, en orden. `grado` siempre (muestra su aviso si está vacía o caída: es el dato que más
 * busca el visitante); el resto solo si tiene contenido, así el índice nunca lleva a una sección vacía.
 */
export function visibleSections(has: Record<Exclude<SectionId, 'grado'>, boolean>): SectionId[] {
  return SECTION_ORDER.filter((id) => id === 'grado' || has[id])
}
