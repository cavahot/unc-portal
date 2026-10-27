// SEC-08: contraseña del usuario con el que los scripts de la raíz inician sesión en el CMS.
// Variable: CMS_PASSWORD (distinta de SEED_ADMIN_PASSWORD, que usan los seeds de apps/cms/scripts).
// Sustituye al antiguo `process.env.CMS_PASSWORD || '<literal>'`, que dejaba una credencial pública
// conocida en el repo y permitía ejecutar contra un CMS que la conservara.
// JS puro, sin dependencias. Misma política que apps/cms/scripts/seed/seedAdminPassword.ts.

const MIN_LENGTH = 12

// Valores conocidos que nunca se aceptan (comparación en minúsculas). Incluye los valores históricos.
const KNOWN_WEAK = new Set(['admin1234!', 'admin@2026', 'password', 'admin', 'admin123', 'changeme', '123456789012'])

/**
 * Devuelve CMS_PASSWORD o lanza un Error claro. Se invoca antes de cualquier fetch/login/escritura.
 * Amenaza que evita: usar una credencial por defecto, o escribir contra un CMS de producción.
 * Límite: valida longitud y lista de valores conocidos, no la entropía real. El mensaje de error
 * NUNCA incluye el valor de la contraseña.
 */
export function requireCmsPassword(env = process.env) {
  if (env.NODE_ENV === 'production') {
    throw new Error('Este script no se puede ejecutar con NODE_ENV=production (SEC-08).')
  }
  const value = env.CMS_PASSWORD
  if (value === undefined || value.trim() === '') {
    throw new Error('Falta CMS_PASSWORD: defínela (mínimo 12 caracteres) antes de ejecutar el script (SEC-08).')
  }
  if (value.length < MIN_LENGTH) {
    throw new Error(`CMS_PASSWORD es demasiado corta: se requieren al menos ${MIN_LENGTH} caracteres (SEC-08).`)
  }
  if (KNOWN_WEAK.has(value.toLowerCase()) || new Set(value).size === 1) {
    throw new Error('CMS_PASSWORD es un valor conocido o de un solo carácter repetido; elige otra (SEC-08).')
  }
  return value
}
