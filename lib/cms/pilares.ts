// PILARES-01: modelo del portal para los pilares académicos (Docencia, Investigación, Extensión).
// Spec: docs/specs/portal/PILARES-ACADEMICOS.md. Fuente: global `pilares-academicos` del CMS y, para las métricas
// vinculadas, el global `estadisticas`.
// Qué hace: valida y normaliza la respuesta del CMS; descarta lo incompleto en vez de rellenarlo.
// Por qué existe: la portada y las páginas de cada pilar no deben mostrar cifras ni textos escritos en el código.
// Límite: el contenido es solo en español (las demás lenguas traducen la interfaz).

/** Pilares en el orden del portal. El CMS tiene una pestaña por cada uno (mismas claves). */
export const PILARES = ['docencia', 'investigacion', 'extension'] as const
export type PilarKey = (typeof PILARES)[number]

/** Íconos permitidos (lista cerrada: el portal dibuja su propio SVG; nada libre llega al marcado). */
export const ICONOS = ['birrete', 'matraz', 'personas'] as const
export type PilarIcono = (typeof ICONOS)[number]

/** Estado de la página del pilar: mientras esté «en construcción» se muestra solo el aviso. */
export const ESTADOS = ['construccion', 'publicada'] as const
export type PilarEstado = (typeof ESTADOS)[number]

/** Cifras del global `estadisticas` que una métrica puede tomar. */
export const ESTADISTICAS = [
  'totalEstudiantes',
  'totalDocentes',
  'totalEgresados',
  'totalCarrerasAcreditadas',
  'totalFacultades',
] as const
export type EstadisticaKey = (typeof ESTADISTICAS)[number]

/** Ruta de la página de cada pilar (también la usa el megamenú). */
export const PILAR_HREF: Record<PilarKey, string> = {
  docencia: '/docencia',
  investigacion: '/investigacion',
  extension: '/extension',
}

export type PilarMetrica = { valor: string; etiqueta: string }

export type Pilar = {
  key: PilarKey
  href: string
  titulo: string
  bajada: string | null
  descripcion: string
  icono: PilarIcono
  /** Solo métricas con valor publicable (0 a 2 en la tarjeta). */
  metricas: PilarMetrica[]
  enlaceTexto: string
  estado: PilarEstado
  /** Contenido Lexical de la página; null si está vacío. */
  contenido: unknown | null
  estadisticas: PilarMetrica[]
}

export type PilaresData = Pilar[]

type Raw = Record<string, unknown>

export function isPlainObject(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

/** Formato de cifras por idioma; el guaraní usa el de Paraguay. */
function formatNumber(value: number, locale: string): string {
  const tag = locale === 'en' ? 'en-US' : locale === 'pt-BR' ? 'pt-BR' : 'es-PY'
  return new Intl.NumberFormat(tag).format(value)
}

/**
 * Una métrica publicable: vinculada a una cifra mayor que cero de `estadisticas`, o cargada a mano con valor, etiqueta
 * y fuente. Cualquier otra cosa se descarta (nunca se muestra un número de relleno).
 */
function mapMetrica(raw: unknown, stats: Partial<Record<EstadisticaKey, number>>, locale: string): PilarMetrica | null {
  if (!isPlainObject(raw)) return null
  const etiqueta = text(raw.etiqueta)
  if (!etiqueta) return null
  if (raw.origen === 'estadistica') {
    const key = raw.estadistica as EstadisticaKey
    const value = (ESTADISTICAS as readonly string[]).includes(key) ? stats[key] : undefined
    return typeof value === 'number' && value > 0 ? { valor: formatNumber(value, locale), etiqueta } : null
  }
  if (raw.origen === 'manual') {
    const valor = text(raw.valor)
    return valor && text(raw.fuente) ? { valor, etiqueta } : null
  }
  return null
}

const metricas = (raw: unknown, stats: Partial<Record<EstadisticaKey, number>>, locale: string, max: number) =>
  (Array.isArray(raw) ? raw : [])
    .map((m) => mapMetrica(m, stats, locale))
    .filter((m): m is PilarMetrica => m !== null)
    .slice(0, max)

/** Lexical con al menos un nodo; si no, null (la página vuelve a «en construcción»). */
function contenido(raw: unknown): unknown | null {
  const children = isPlainObject(raw) && isPlainObject(raw.root) ? raw.root.children : null
  return Array.isArray(children) && children.length > 0 ? raw : null
}

/** Un pilar se publica en la tarjeta si tiene título, descripción y texto del botón. */
export function mapPilar(
  key: PilarKey,
  raw: unknown,
  stats: Partial<Record<EstadisticaKey, number>>,
  locale: string,
): Pilar | null {
  if (!isPlainObject(raw)) return null
  const titulo = text(raw.titulo)
  const descripcion = text(raw.descripcion)
  const enlaceTexto = text(raw.enlaceTexto)
  if (!titulo || !descripcion || !enlaceTexto) return null
  const pagina = isPlainObject(raw.pagina) ? raw.pagina : {}
  const icono = (ICONOS as readonly string[]).includes(raw.icono as string) ? (raw.icono as PilarIcono) : ICONOS[PILARES.indexOf(key)]
  const cuerpo = contenido(pagina.contenido)
  return {
    key,
    href: PILAR_HREF[key],
    titulo,
    bajada: text(raw.bajada) || null,
    descripcion,
    icono,
    metricas: metricas(raw.metricas, stats, locale, 2),
    enlaceTexto,
    // Sin contenido la página queda en construcción aunque el estado diga «publicada».
    estado: pagina.estado === 'publicada' && cuerpo ? 'publicada' : 'construccion',
    contenido: cuerpo,
    estadisticas: metricas(pagina.estadisticas, stats, locale, 8),
  }
}

/** Los tres pilares en orden; solo los publicables. Lista vacía si el global no tiene ninguno completo. */
export function mapPilares(raw: unknown, stats: Partial<Record<EstadisticaKey, number>>, locale: string): PilaresData {
  if (!isPlainObject(raw)) return []
  return PILARES.map((key) => mapPilar(key, raw[key], stats, locale)).filter((p): p is Pilar => p !== null)
}
