// SEC-027 (minimización de datos): qué se guarda de un cambio en `auditoria.cambiosRelevantes`.
// Qué hace: compara antes/después reduciendo cada documento relacionado poblado a su ID y quitando, en cualquier nivel,
//   las claves con datos de acceso o personales de las cuentas.
// Por qué existe: el hook editorial recibe `createdBy` poblado (correo, teléfono, sesiones) y lo copiaba entero a la
//   auditoría, que se conserva y se exporta (docs/security/SEC-027-MATRIZ-ROLES.md, observación sobre P10).
// Límite: un documento relacionado se reconoce por tener `id` y `createdAt`/`updatedAt` o la marca `collection` (un
//   usuario poblado con `defaultPopulate` solo trae id, email, role y collection), o por reemplazar a un ID en el mismo
//   campo; las filas de arrays (sin esas marcas) se conservan con su contenido. Módulo puro: no importa Payload.

/** Claves que nunca se copian a la auditoría, estén donde estén. */
const SENSITIVE_KEYS = new Set([
  'password',
  'hash',
  'salt',
  'sessions',
  'resetPasswordToken',
  'resetPasswordExpiration',
  'apiKey',
  'apiKeyIndex',
  'loginAttempts',
  'lockUntil',
  'telefono',
  'telegramUserId',
  // SEC-CUENTAS-01: historial de hashes propios de contraseñas anteriores (utilities/passwordHash.ts).
  'passwordHistory',
])

type Plain = Record<string, unknown>

const isPlain = (v: unknown): v is Plain => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Documento relacionado ya poblado (no una fila de array): tiene `id` y fechas propias o la marca `collection`. */
const isPopulatedDoc = (v: Plain): boolean => 'id' in v && ('createdAt' in v || 'updatedAt' in v || 'collection' in v)

const isId = (v: unknown): v is string | number => typeof v === 'number' || typeof v === 'string'

/** Un campo que antes guardaba un ID y ahora trae un objeto con `id` es la misma relación, poblada. */
const relationValue = (other: unknown, value: unknown): unknown =>
  isId(other) && isPlain(value) && 'id' in value ? value.id : toAuditValue(value)

/** Valor tal como se guarda en la auditoría: relaciones como ID, sin claves sensibles. */
export function toAuditValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toAuditValue)
  if (!isPlain(value)) return value
  if (isPopulatedDoc(value)) return value.id
  const out: Plain = {}
  for (const [key, inner] of Object.entries(value)) {
    if (!SENSITIVE_KEYS.has(key)) out[key] = toAuditValue(inner)
  }
  return out
}

/**
 * Campos que cambiaron entre `before` y `after`, ya minimizados. Un documento relacionado que solo pasó de ID a
 * poblado no cuenta como cambio. Las claves sensibles de primer nivel tampoco se registran.
 */
export function extractChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Record<string, { antes: unknown; despues: unknown }> {
  const changes: Record<string, { antes: unknown; despues: unknown }> = {}
  for (const key in after) {
    if (SENSITIVE_KEYS.has(key)) continue
    const antes = relationValue(after[key], before[key])
    const despues = relationValue(before[key], after[key])
    if (JSON.stringify(antes) !== JSON.stringify(despues)) changes[key] = { antes, despues }
  }
  return changes
}

/** Correo del autor si `createdBy` llegó poblado; si no, `null` (el panel no muestra IDs ni otros datos). */
export function authorEmail(createdBy: unknown): string | null {
  return isPlain(createdBy) && typeof createdBy.email === 'string' ? createdBy.email : null
}
