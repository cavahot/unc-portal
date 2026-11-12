// SEC-CUENTAS-01 (odd/tasks/seguridad-cuentas.md, contrato servidor ↔ panel): cierre de sesiones de una cuenta.
// Evidencia RDD (Payload 3.91, `useSessions: true` por defecto): cada ingreso agrega una fila a `users_sessions`
//   (`auth/sessions.js` → `addSessionToUser`) y la estrategia JWT rechaza un token cuyo `sid` ya no está en
//   `user.sessions` (`auth/strategies/jwt.js`). Borrar la fila invalida el token aunque no haya vencido.
// Qué hace: deja en `sessions` solo las que se indican (o ninguna), con el mismo patrón que `auth/operations/logout.js`
//   (lee la fila completa con `db.findOne` y la reescribe con `db.updateOne`, sin tocar `updatedAt`).
// Por qué existe aunque `update` de Payload ya limpia sesiones al cambiar la contraseña (`update.js:288-298`): el
//   contrato exige el cierre de forma explícita y verificable, y además hay que descartar la sesión que crea la
//   verificación de la contraseña actual con `payload.login`.
// Amenaza que evita: que una sesión robada siga activa después del cambio o del restablecimiento.
// Límite: corre fuera de la transacción del cambio; si fallara, la contraseña ya cambió y Payload igual cerró las
//   sesiones en su `update` (este cierre es la segunda barrera, no la única).
import type { PayloadRequest } from 'payload'

type Session = { id?: string }

/**
 * Deja en la cuenta solo las sesiones cuyo id pasa `keep`. No escribe si no hay nada que quitar.
 * Devuelve cuántas sesiones se cerraron.
 */
export async function pruneSessions(
  req: PayloadRequest,
  userId: number | string,
  keep: (session: Session) => boolean,
): Promise<number> {
  const stored = (await req.payload.db.findOne({
    collection: 'users',
    req,
    where: { id: { equals: userId } },
  })) as ({ sessions?: Session[]; updatedAt?: unknown } & Record<string, unknown>) | null
  if (!stored) return 0
  const sessions = Array.isArray(stored.sessions) ? stored.sessions : []
  const remaining = sessions.filter(keep)
  if (remaining.length === sessions.length) return 0
  stored.sessions = remaining
  // Igual que logout.js: cerrar sesiones no es una edición de la cuenta.
  stored.updatedAt = null
  await req.payload.db.updateOne({ id: userId, collection: 'users', data: stored, req, returning: false })
  return sessions.length - remaining.length
}

/** Lee el `sid` de un token que el propio servidor acaba de emitir (no verifica la firma: no decide acceso). */
export function sidFromToken(token: unknown): string | undefined {
  if (typeof token !== 'string') return undefined
  const part = token.split('.')[1]
  if (!part) return undefined
  try {
    const claims = JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as { sid?: unknown }
    return typeof claims.sid === 'string' ? claims.sid : undefined
  } catch {
    return undefined
  }
}
