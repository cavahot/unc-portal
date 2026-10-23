/**
 * DEP-16 (RDD-DEP-38): validación de secretos del CMS con falla cerrada.
 *
 * Amenaza: arrancar Payload con `PAYLOAD_SECRET` vacío, corto o de ejemplo permite firmar y
 * falsificar JWT/cookies de sesión. Los mensajes NUNCA incluyen el valor evaluado, solo el nombre
 * de la variable y la regla incumplida.
 * Límite: valida forma (longitud, marcadores de ejemplo, diversidad de caracteres), no la
 * entropía real ni que el secreto no esté filtrado. Existe una copia portal-side en
 * `lib/security/secrets.ts` (el portal no puede importar del CMS: RDD-DEP-31); la prueba
 * `tests/unit/dep16-secrets.spec.ts` falla si las dos listas divergen.
 */

/** Longitud mínima aceptada (coincide con lo documentado en DEPLOY.md y .env.prod.example). */
export const MIN_SECRET_LENGTH = 32

/**
 * Fragmentos (en minúsculas) de valores de ejemplo conocidos en .env.example, apps/cms/.env.example
 * y .env.prod.example. Un secreto que los contenga se considera sin reemplazar.
 */
export const WEAK_SECRET_MARKERS = [
  'changeme',
  'change-this',
  'change_me',
  'reemplazar',
  'replace-me',
  'replace_me',
  'placeholder',
  'your-',
  'secret-here',
] as const

/** Mínimo de caracteres distintos: descarta `aaaa…` o `1212…` que cumplen la longitud. */
const MIN_DISTINCT_CHARS = 8

/**
 * Devuelve true si el valor cumple longitud, no contiene marcadores de ejemplo y tiene
 * diversidad mínima. Amenaza: secretos triviales. Límite: heurística de forma.
 */
export function isStrongSecret(value: string | undefined | null): boolean {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  if (trimmed.length < MIN_SECRET_LENGTH) return false
  const lower = trimmed.toLowerCase()
  if (WEAK_SECRET_MARKERS.some((marker) => lower.includes(marker))) return false
  return new Set(trimmed).size >= MIN_DISTINCT_CHARS
}

/**
 * Exige un secreto fuerte o lanza un Error claro. Amenaza: arranque con secreto ausente/débil.
 * El mensaje indica el nombre y cómo generar uno, jamás el valor recibido.
 */
export function requireSecret(name: string, value: string | undefined | null): string {
  if (!isStrongSecret(value)) {
    throw new Error(
      `${name} no está configurado con un secreto válido: debe tener al menos ${MIN_SECRET_LENGTH} ` +
        'caracteres, no ser un valor de ejemplo ni repetir un mismo carácter. ' +
        'Genere uno con: openssl rand -hex 32',
    )
  }
  return (value as string).trim()
}

type SecretEnvironment = { [key: string]: string | undefined }

/**
 * Resuelve `PAYLOAD_SECRET` para `buildConfig`. En runtime y en el CLI de Payload (migrate,
 * generate:types) aborta si falta o es débil.
 *
 * Excepción justificada: durante `next build` (NEXT_PHASE=phase-production-build) Next evalúa
 * payload.config.ts para recolectar rutas y el Dockerfile del CMS construye SIN variables de
 * entorno (apps/cms/Dockerfile, etapa builder: ningún ARG/ENV de secretos). Allí se devuelve el
 * valor recibido o cadena vacía solo para poder construir; el secreto no se incrusta en la
 * imagen y el arranque real (NEXT_PHASE distinto) vuelve a validar. Límite: si alguien fija
 * NEXT_PHASE=phase-production-build en el contenedor de producción se salta la validación.
 */
export function resolvePayloadSecret(env: SecretEnvironment = process.env): string {
  if (env.NEXT_PHASE === 'phase-production-build') {
    return env.PAYLOAD_SECRET?.trim() ?? ''
  }
  return requireSecret('PAYLOAD_SECRET', env.PAYLOAD_SECRET)
}
