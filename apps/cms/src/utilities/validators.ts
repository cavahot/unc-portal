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
