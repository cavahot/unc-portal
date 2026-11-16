// SEC-CUENTAS-01 (odd/tasks/seguridad-cuentas.md, S2): hash PROPIO para el historial de contraseñas de `users`.
// Qué hace: deriva con scrypt (sal aleatoria de 16 bytes por entrada) un hash de cada contraseña que se fija, para
//   rechazar después que se repita alguna de las últimas N (PASSWORD_POLICY.historySize).
// Por qué existe: Payload solo guarda el hash de la contraseña VIGENTE; sin un historial propio no hay forma de impedir
//   que una cuenta vuelva a una contraseña anterior.
// Amenaza que evita: guardar contraseñas en claro o reutilizar el hash de Payload (otro algoritmo, otro ciclo de vida) y
//   la comparación con fuga de tiempo (usa timingSafeEqual).
// Límite: el historial vive en la columna oculta `users.password_history`; quien lea la base puede intentar fuerza
//   bruta fuera de línea como con cualquier hash. Coste scrypt N=2^14, r=8, p=1 (≈16 MiB y decenas de ms por entrada).
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from 'node:crypto'

const SCHEME = 'scrypt'
const PARAMS = { N: 16384, r: 8, p: 1 } as const
const KEY_LENGTH = 32
const SALT_BYTES = 16

/** scrypt de node en forma de promesa (la versión síncrona bloquearía el bucle de eventos). */
const scrypt = (password: string, salt: Buffer, keylen: number, options: ScryptOptions): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scryptCallback(password, salt, keylen, options, (err, key) => (err ? reject(err) : resolve(key)))
  })

/**
 * Devuelve `scrypt$N$r$p$<sal base64url>$<hash base64url>` para guardar en el historial. Los parámetros viajan en la
 * cadena para poder endurecerlos más adelante sin invalidar las entradas viejas.
 */
export async function hashPasswordForHistory(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES)
  const key = await scrypt(password, salt, KEY_LENGTH, { ...PARAMS, maxmem: 64 * 1024 * 1024 })
  return [SCHEME, PARAMS.N, PARAMS.r, PARAMS.p, salt.toString('base64url'), key.toString('base64url')].join('$')
}

/**
 * Compara en tiempo constante una contraseña con UNA entrada del historial. Una entrada con formato desconocido o
 * parámetros fuera de rango no coincide (nunca lanza): el historial no debe impedir un cambio por un dato corrupto.
 */
async function matchesEntry(password: string, entry: unknown): Promise<boolean> {
  if (typeof entry !== 'string') return false
  const parts = entry.split('$')
  if (parts.length !== 6 || parts[0] !== SCHEME) return false
  const [N, r, p] = parts.slice(1, 4).map(Number)
  if (![N, r, p].every(Number.isInteger) || N > 2 ** 17 || r > 16 || p > 4 || N < 2) return false
  const salt = Buffer.from(parts[4], 'base64url')
  const expected = Buffer.from(parts[5], 'base64url')
  if (salt.length === 0 || expected.length === 0) return false
  const key = await scrypt(password, salt, expected.length, { N, r, p, maxmem: 256 * 1024 * 1024 })
  return timingSafeEqual(key, expected)
}

/** true si la contraseña coincide con alguna entrada del historial. Revisa todas (sin cortar) para no filtrar posición. */
export async function matchesPasswordHistory(password: string, history: unknown): Promise<boolean> {
  if (!Array.isArray(history) || typeof password !== 'string') return false
  const results = await Promise.all(history.map((entry) => matchesEntry(password, entry)))
  return results.some(Boolean)
}

/** Agrega el hash nuevo y conserva solo los `size` más recientes (el más antiguo sale primero). */
export function appendToPasswordHistory(history: unknown, newEntry: string, size: number): string[] {
  const previous = Array.isArray(history) ? history.filter((e): e is string => typeof e === 'string') : []
  return [...previous, newEntry].slice(-Math.max(1, size))
}
