// INST-12: modelo de /contacto/dependencias (spec docs/specs/portal/DEPENDENCIAS.md §2.3). Puro, sin red ni React.
// Qué hace: convierte las filas de la colección `dependencias-contacto` del CMS en dependencias con sus sedes para la página.
// Por qué existe: el directorio estaba escrito en el código. Aquí cada dato pasa por una guarda antes de llegar a un `href` o a
// un `src`: el logo debe estar bajo /images/, el correo debe tener forma de correo y la web debe ser http(s) sin credenciales.
// Amenazas: una fila corrupta que rompa la página; un enlace `javascript:`/`data:` o un logo remoto inyectado desde el CMS.
// Una dependencia sin nombre o sin sedes y una sede sin dirección se descartan; un dato inválido se omite sin descartar la fila.
// Límite: no valida que teléfonos y correos sean los oficiales.
type Raw = Record<string, unknown>
const isObj = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v)
const text = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

export interface Sede {
  nombre?: string
  direccion: string
  telefonos: string[]
  correos: string[]
  web?: string
}

export interface Dependencia {
  id: number | string
  slug: string
  nombre: string
  /** Ruta pública bajo /images/ o `null` si no es válida (la página muestra las iniciales). */
  logo: string | null
  destacada: boolean
  sedes: Sede[]
}

/** Enlace `tel:` con solo dígitos (los espacios y paréntesis del texto visible no van en el enlace). */
export const telHref = (telefono: string): string => `tel:${telefono.replace(/\D/g, '')}`

const logoOk = (v: string): boolean => /^\/images\/[A-Za-z0-9_\-./]+\.(png|jpe?g|webp|svg)$/i.test(v) && !v.includes('..') && !v.includes('//')
const correoOk = (v: string): boolean => v.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
function webOk(v: string): string | undefined {
  try {
    const url = new URL(v)
    return (url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password ? v : undefined
  } catch {
    return undefined
  }
}

/** Lista de `{ texto }` de un campo array del CMS -> textos no vacíos que cumplen `keep`. */
function lista(raw: unknown, keep: (v: string) => boolean = () => true): string[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item) => {
    const t = isObj(item) ? text(item.texto) : undefined
    return t && keep(t) ? [t] : []
  })
}

function mapSede(raw: unknown): Sede | null {
  if (!isObj(raw)) return null
  const direccion = text(raw.direccion)
  if (!direccion) return null
  const nombre = text(raw.nombre)
  const web = text(raw.web)
  return {
    ...(nombre ? { nombre } : {}),
    direccion,
    telefonos: lista(raw.telefonos),
    correos: lista(raw.correos, correoOk),
    ...(web && webOk(web) ? { web } : {}),
  }
}

function mapDependencia(raw: unknown): Dependencia | null {
  if (!isObj(raw)) return null
  const nombre = text(raw.nombre)
  const slug = text(raw.slug)
  if (!nombre || !slug) return null
  const sedes = (Array.isArray(raw.sedes) ? raw.sedes : []).map(mapSede).filter((s): s is Sede => s !== null)
  if (sedes.length === 0) return null
  const logo = text(raw.logo)
  return {
    id: typeof raw.id === 'number' || typeof raw.id === 'string' ? raw.id : slug,
    slug,
    nombre,
    logo: logo && logoOk(logo) ? logo : null,
    destacada: raw.destacada === true,
    sedes,
  }
}

/** Filas del CMS -> dependencias válidas, en el orden recibido (el CMS ya las ordena por `orden`). */
export function mapDependencias(docs: unknown[]): Dependencia[] {
  return docs.map(mapDependencia).filter((d): d is Dependencia => d !== null)
}
