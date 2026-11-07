// PRA-01: validadores de campos compartidos por Reconocimientos, Acreditaciones y Facultades.
// Evidencia: docs/specs/portal/PREMIOS-ACREDITACIONES.md §3.2 y escenarios 9 y 10.
// Son funciones puras (sin Payload ni red) para poder probarlas de forma aislada.

/** Largo máximo aceptado para una URL de fuente: evita filas con texto desmesurado en el panel. */
const MAX_URL_LENGTH = 2048

/**
 * Valida una URL que luego se mostrará como enlace público (fuente, sitio oficial).
 * Qué hace: exige texto `https://` bien formado, sin credenciales incrustadas ni espacios sobrantes.
 * Amenaza que evita: `javascript:`, `data:`, `http:`, `//host` o `https://usuario:clave@host` como enlace
 * de la portada (XSS, degradación a texto plano, enlace engañoso).
 * Límite: valida forma, no que la URL exista ni que el dominio sea confiable.
 * Un valor vacío es válido salvo que se pida `required` (Payload ya marca `required` en el panel; aquí se
 * repite para que el contrato quede probado sin Payload).
 */
export function validateHttpsUrl(value: unknown, options: { required?: boolean } = {}): true | string {
  if (value === undefined || value === null || value === '') {
    return options.required ? 'Este campo es obligatorio: indique la URL de la fuente (https).' : true
  }
  if (typeof value !== 'string') return 'La URL debe ser texto.'
  if (value.length > MAX_URL_LENGTH) return 'La URL es demasiado larga.'
  // Sin recortar: un espacio al inicio o al final suele indicar un pegado defectuoso.
  if (value !== value.trim()) return 'La URL no debe tener espacios al inicio ni al final.'
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return 'La URL no es válida. Use una dirección completa que empiece con https://'
  }
  if (parsed.protocol !== 'https:') return 'Solo se permiten enlaces https://'
  if (parsed.username || parsed.password) return 'La URL no debe incluir usuario ni contraseña.'
  if (!parsed.hostname) return 'La URL no tiene dominio.'
  return true
}

/**
 * MLG-01: como `validateHttpsUrl`, pero además exige que el host esté EXACTAMENTE en `allowedHosts`
 * (comparación sin mayúsculas; sin comodines ni subdominios implícitos).
 * Qué hace: reutiliza la validación de forma https y luego compara `hostname`.
 * Amenaza que evita: enlazar documentos institucionales a hosts ajenos (phishing o descarga maliciosa con
 * la marca UNC), también con trucos como `drive.google.com.evil.example` o `?u=https://drive.google.com`.
 * Límite: confía en todo lo que sirva un host permitido (p. ej. cualquier archivo público de Drive).
 * Spec: docs/specs/portal/MARCO-LEGAL.md §3 y escenario 3.
 */
export function validateAllowedHostUrl(
  value: unknown,
  options: { allowedHosts: readonly string[]; required?: boolean },
): true | string {
  const base = validateHttpsUrl(value, { required: options.required })
  if (base !== true || value === undefined || value === null || value === '') return base
  const host = new URL(value as string).hostname.toLowerCase()
  const allowed = options.allowedHosts.map((h) => h.toLowerCase())
  if (!allowed.includes(host)) return `Dominio no permitido. Use un enlace de: ${allowed.join(', ')}.`
  return true
}

/**
 * Construye un validador de ruta estática de logo (archivo versionado en `public/images/<carpeta>/`).
 * Regla: `/images/<carpeta>/<nombre>.<png|jpg|jpeg|webp>`, nombre solo con letras, números, `_` y `-`
 * (sin puntos extra ni `%`, así no caben `..`, codificaciones ni subcarpetas).
 * Amenaza que evita: path traversal, URL externa (hotlink bloqueado por el CSP de `img-src`), esquemas
 * `javascript:`/`data:`, SVG (riesgo MIG-IMG §93) y carpetas ajenas.
 * Límite: no comprueba que el archivo exista en disco.
 */
function makeLogoPathValidator(folder: string) {
  const pattern = new RegExp(`^/images/${folder}/[A-Za-z0-9_-]+\\.(png|jpe?g|webp)$`)
  return (value: unknown): true | string => {
    if (value === undefined || value === null || value === '') return true
    if (typeof value !== 'string') return 'La ruta del logo debe ser texto.'
    if (!pattern.test(value)) {
      return `Ruta no permitida. Use /images/${folder}/<archivo>.png, .jpg, .jpeg o .webp (sin subcarpetas ni "..").`
    }
    return true
  }
}

/** PRA-01: `facultades.logoPath` solo puede apuntar a `/images/facultades/`. */
export const validateFacultadLogoPath = makeLogoPathValidator('facultades')

/** PRA-01: `reconocimientos.logoPath` solo puede apuntar a `/images/reconocimientos/`. */
export const validateReconocimientoLogoPath = makeLogoPathValidator('reconocimientos')

/**
 * GLO-GN-01: hosts EXACTOS aceptados como fuente oficial del glosario guaraní (sin comodines).
 * Por qué estos: son los sitios gubernamentales donde el PO verificó recursos léxicos (dataset de la SPL en
 * Datos Abiertos, repositorio del CONACYT, portal de diccionarios de la SPL). Ver
 * docs/specs/i18n/GLOSARIO-GUARANI.md §4 (con la evidencia y los excluidos: ALG sin sitio verificable,
 * GitHub/Jojajovai, Dialnet, Wikipedia). La misma lista vive en scripts/lib/glosarioSources.mjs y una prueba
 * comprueba que coincidan.
 */
export const GLOSARIO_OFFICIAL_HOSTS = [
  'datos.gov.py',
  'www.datos.gov.py',
  'repositorio.conacyt.gov.py',
  'spl.gov.py',
  'www.spl.gov.py',
  'corpus.spl.gov.py',
] as const

/**
 * GLO-GN-01: valida la URL de una fuente oficial del glosario (https + host en GLOSARIO_OFFICIAL_HOSTS).
 * Amenaza que evita: que un corpus de investigación, un blog o un dominio parecido
 * (`www.datos.gov.py.evil.example`) respalde una entrada marcada como oficial.
 * Límite: no comprueba que el recurso exista ni que contenga el término.
 */
export function validateOfficialSourceUrl(value: unknown, options: { required?: boolean } = {}): true | string {
  return validateAllowedHostUrl(value, { allowedHosts: GLOSARIO_OFFICIAL_HOSTS, required: options.required })
}

/**
 * TITULOS-01: hosts EXACTOS del CONES aceptados en la nota de reconocimiento de títulos extranjeros.
 * Amenaza que evita: que un editor (o un texto pegado) enlace la nota «Títulos extranjeros» a un sitio ajeno
 * con la marca UNC (`cones.gov.py.evil.example`, `?u=https://www.cones.gov.py`). Límite: confía en lo que
 * sirva el propio CONES; no comprueba que la página siga existiendo.
 */
export const CONES_HOSTS = ['www.cones.gov.py', 'cones.gov.py'] as const

/** TITULOS-01: URL https de host exacto del CONES; vacía es válida (la nota es opcional). */
export function validateConesUrl(value: unknown, options: { required?: boolean } = {}): true | string {
  return validateAllowedHostUrl(value, { allowedHosts: CONES_HOSTS, required: options.required })
}

/**
 * INST-01: hosts EXACTOS del portal oficial de acceso a la información pública del Gobierno (Ley N° 5282/2014).
 * Por qué estos: son los sitios a los que la UNC remite a quien solicita información; cualquier otro host sería
 * un desvío (phishing con la marca de la UNC). Límite: confía en todo lo que sirva ese host.
 */
export const INFO_PUBLICA_HOSTS = ['informacionpublica.paraguay.gov.py'] as const

/** INST-01: ruta interna del portal (empieza con una sola «/», sin esquema, sin «//» ni «\»). */
const INTERNAL_PATH = /^\/(?!\/)[A-Za-z0-9\-._~/#?=&%]*$/

/**
 * INST-01: enlace de una acción editable: ruta interna del portal o https de host oficial permitido.
 * Amenaza que evita: `javascript:`, `http:`, rutas protocolo-relativas (`//host`) y hosts ajenos.
 */
export function validateInfoPublicaUrl(value: unknown, options: { required?: boolean } = {}): true | string {
  if (value === undefined || value === null || value === '') return options.required === false ? true : 'Indique el enlace.'
  if (typeof value !== 'string') return 'El enlace debe ser texto.'
  if (value.startsWith('/')) {
    return INTERNAL_PATH.test(value) ? true : 'Ruta interna no válida. Use una ruta como /contacto.'
  }
  return validateAllowedHostUrl(value, { allowedHosts: INFO_PUBLICA_HOSTS, required: options.required })
}

/**
 * FAC-01: hosts EXACTOS de los documentos de resoluciones CONES de una carrera (spec FACULTADES.md §3.2).
 * Por qué estos: la página oficial de la UNC enlaza las resoluciones a Google Drive; el resto son sitios propios
 * de la universidad y de la Facultad de Odontología. La misma lista vive en lib/cms/facultad.ts (lo comprueba un test).
 */
export const RESOLUCION_HOSTS = ['drive.google.com', 'www.unc.edu.py', 'unc.edu.py', 'www.founc.edu.py', 'founc.edu.py'] as const

/**
 * FAC-01: número de resolución con forma `NNN/AA` o `NNN/AAAA` (p. ej. 165/15).
 * Amenaza que evita: texto libre que se lea como otra cosa (p. ej. «acreditada») en la columna «Res. CONES».
 * Límite: no comprueba que la resolución exista en el CONES.
 */
export function validateResolucionNumero(value: unknown): true | string {
  if (typeof value !== 'string' || !/^\d{1,4}\/\d{2,4}$/.test(value.trim())) {
    return 'Escriba el número de resolución como 165/15 (número/año).'
  }
  return true
}

/** FAC-01: enlace opcional al documento de la resolución: https y host en RESOLUCION_HOSTS. */
export function validateResolucionEnlace(value: unknown): true | string {
  return validateAllowedHostUrl(value, { allowedHosts: RESOLUCION_HOSTS })
}

/**
 * FAC-01: hosts permitidos por red social (sin comodines). La misma tabla vive en lib/cms/facultad.ts.
 * Amenaza que evita: un enlace «Facebook» de la facultad que lleve a un sitio ajeno (phishing con la marca UNC).
 */
export const RED_HOSTS: Record<string, readonly string[]> = {
  facebook: ['www.facebook.com', 'facebook.com', 'm.facebook.com'],
  instagram: ['www.instagram.com', 'instagram.com'],
  x: ['x.com', 'twitter.com', 'www.x.com', 'www.twitter.com'],
  youtube: ['www.youtube.com', 'youtube.com'],
}

/**
 * FAC-01: valida la URL de una red social según la red elegida en la misma fila (`siblingData.red`).
 * Límite: no comprueba que la cuenta sea la oficial; eso lo revisa quien publica.
 */
export function validateRedUrl(value: unknown, options?: { siblingData?: { red?: unknown } }): true | string {
  const red = options?.siblingData?.red
  const hosts = typeof red === 'string' ? RED_HOSTS[red] : undefined
  if (!hosts) return 'Elija primero la red social.'
  return validateAllowedHostUrl(value, { allowedHosts: hosts, required: true })
}

// ── INST-07: calendario académico (spec docs/specs/portal/CALENDARIO.md §2.1) ────────────────────────────────────

/** Eventos estándar de un semestre. Las etiquetas traducidas viven en el archivo `pages.calendario-academico.json` de cada idioma. */
export const CALENDARIO_EVENTOS = ['inicio-clases', 'inscripcion-tardia', 'parciales-1', 'parciales-2', 'cierre-semestre', 'otro'] as const

/** Convierte un valor de fecha (texto ISO o `Date`) a milisegundos, o `null` si no es una fecha válida. */
function toTime(value: unknown): number | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getTime()
  if (typeof value !== 'string' || !value.trim()) return null
  const t = Date.parse(value)
  return Number.isNaN(t) ? null : t
}

/**
 * INST-07: `fin` es opcional, pero si existe debe ser una fecha válida y no anterior a `inicio` (misma fila).
 * Amenaza que evita: publicar un período con las fechas invertidas («28 mar – 16 mar»), que confundiría a estudiantes.
 * Límite: compara instantes; el campo es de día completo, así que no hay horas que considerar.
 */
export function validateCalendarioFin(value: unknown, options?: { siblingData?: { inicio?: unknown } }): true | string {
  if (value === undefined || value === null || value === '') return true
  const fin = toTime(value)
  if (fin === null) return 'La fecha de fin no es válida.'
  const inicio = toTime(options?.siblingData?.inicio)
  if (inicio !== null && fin < inicio) return 'La fecha de fin no puede ser anterior a la de inicio.'
  return true
}

/**
 * INST-07: el evento es obligatorio en un semestre (las mesas de exámenes no llevan evento: el período sale de las fechas).
 * `options.data.tipo` es el tipo del bloque. Límite: no impide cargar un evento en un bloque de exámenes (el portal lo ignora).
 */
export function validateCalendarioEvento(value: unknown, options?: { data?: { tipo?: unknown } }): true | string {
  if (options?.data?.tipo !== 'semestre') return true
  if (typeof value !== 'string' || !(CALENDARIO_EVENTOS as readonly string[]).includes(value)) return 'Elija un evento para cada fila de un semestre.'
  return true
}

/** INST-07: la descripción es obligatoria cuando el evento es «otro» (misma fila) y se limita a 160 caracteres. */
export function validateCalendarioDescripcion(value: unknown, options?: { siblingData?: { evento?: unknown } }): true | string {
  const texto = typeof value === 'string' ? value.trim() : ''
  if (texto.length > 160) return 'La descripción admite hasta 160 caracteres.'
  if (options?.siblingData?.evento === 'otro' && !texto) return 'Escriba la descripción del evento.'
  return true
}
