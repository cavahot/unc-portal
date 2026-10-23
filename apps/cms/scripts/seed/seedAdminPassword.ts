// SEC-08: contraseña del superadmin de los seeds. Sustituye al antiguo `?? '<literal>'`, que dejaba
// cualquier instalación sembrada sin la variable con una credencial pública conocida.
// Módulo puro (sin imports de servidor): se puede probar sin Payload ni base de datos.

const MIN_LENGTH = 12

// Valores conocidos que nunca se aceptan (comparación en minúsculas). Incluye el valor histórico.
const KNOWN_WEAK = new Set(['admin@2026', 'password', 'admin', 'admin123', 'changeme', '123456789012'])

/**
 * Devuelve SEED_ADMIN_PASSWORD o lanza un Error claro. Se invoca antes de cualquier escritura.
 * Amenaza que evita: sembrar un superadmin con credencial por defecto, o sembrar en producción.
 * Límite: valida longitud y lista de valores conocidos, no la entropía real. Nunca incluye el
 * valor de la contraseña en el mensaje de error.
 */
export function requireSeedAdminPassword(
  env: Record<string, string | undefined> = process.env,
): string {
  if (env.NODE_ENV === 'production') {
    throw new Error('El seed no se puede ejecutar con NODE_ENV=production (SEC-08).')
  }
  const value = env.SEED_ADMIN_PASSWORD
  if (value === undefined || value.trim() === '') {
    throw new Error('Falta SEED_ADMIN_PASSWORD: defínela (mínimo 12 caracteres) antes de sembrar (SEC-08).')
  }
  if (value.length < MIN_LENGTH) {
    throw new Error(`SEED_ADMIN_PASSWORD es demasiado corta: se requieren al menos ${MIN_LENGTH} caracteres (SEC-08).`)
  }
  if (KNOWN_WEAK.has(value.toLowerCase()) || new Set(value).size === 1) {
    throw new Error('SEED_ADMIN_PASSWORD es un valor conocido o de un solo carácter repetido; elige otra (SEC-08).')
  }
  return value
}
