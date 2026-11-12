// SEC-CUENTAS-01 (odd/tasks/seguridad-cuentas.md, T2: S1, S2 y S4): ciclo de vida de la contraseña de `users`.
// Evidencia RDD (Payload 3.91): `collections/operations/utilities/update.js:125,288` y `create.js:286` dejan
//   `data.password` visible a los hooks `beforeChange` antes de calcular el hash, así que este hook ve TODA contraseña
//   que se fija por alta, edición (REST, panel, Local API), primer registro, cambio propio y restablecimiento. La
//   recuperación por correo de Payload NO pasa por aquí (`auth/operations/resetPassword.js:57`): se cierra con
//   `endpoints/users/recuperacionCerrada.ts`.
import { ValidationError, type CollectionBeforeChangeHook, type PayloadRequest } from 'payload'

import { isSameUser } from '../../access/roles'
import { PASSWORD_POLICY, passwordPolicyError } from '../../config/passwordPolicy'
import { appendToPasswordHistory, hashPasswordForHistory, matchesPasswordHistory } from '../../utilities/passwordHash'

type Doc = {
  id?: number | string
  email?: string | null
  mustChangePassword?: boolean | null
  passwordChangedAt?: string | null
  passwordHistory?: unknown
}

/** Contexto que solo el código del servidor puede poner (REST no escribe `req.context`). */
export type PasswordChangeContext = {
  /** El titular cambia su propia contraseña (endpoint `cambiar-clave`). */
  selfChange?: boolean
  /** Decisión del administrador: `false` = no pedir cambio al ingresar. */
  exigirCambio?: boolean
  /** Restablecimiento desde el endpoint: cómo se obtuvo la contraseña (auditoría). */
  modoRestablecimiento?: 'generar' | 'crear'
  /** La llamada a login solo verifica la contraseña actual; no es un ingreso (auditoría). */
  verificacionClave?: boolean
  /** Recuperación de emergencia desde el servidor (bin/recuperarSuperadmin.ts): quién la ejecutó (auditoría). */
  recuperacionEmergencia?: { operador: string }
}

const contextOf = (req: PayloadRequest): PasswordChangeContext => (req.context ?? {}) as PasswordChangeContext

/**
 * true si quien fija la contraseña es el titular de la cuenta: la sesión es la misma cuenta, o el endpoint de cambio
 * propio lo indicó en el contexto. Lo usan este hook (no exigir cambio) y la auditoría (motivo `cambiar_clave`).
 * Límite: la Local API sin usuario y sin `selfChange` cuenta como «otro actor» (fail-closed: exige cambio).
 */
export const isSelfAccountChange = (req: PayloadRequest, targetId: number | string | undefined): boolean =>
  contextOf(req).selfChange === true || isSameUser(req.user?.id, targetId)

/**
 * true si la operación es el alta del primer usuario (`POST /api/users/first-register`). Payload la permite solo con
 * la tabla vacía (`auth/operations/registerFirstUser.js`), y quien elige la contraseña es el propio titular.
 */
export const isFirstRegister = (req: PayloadRequest, operation: string): boolean =>
  operation === 'create' &&
  !req.user &&
  typeof (req as { pathname?: unknown }).pathname === 'string' &&
  ((req as { pathname: string }).pathname.replace(/\/+$/, '').endsWith('/users/first-register'))

/** Error 400 de Payload con el mensaje en el campo `password` (el panel lo muestra junto al campo). */
const passwordError = (message: string) =>
  new ValidationError({ collection: 'users', errors: [{ message, path: 'password' }] })

/**
 * Hook `beforeChange` de `users`.
 * Qué hace: si llega una contraseña nueva, (1) exige la política (`passwordPolicyError`, con el correo de la cuenta),
 *   (2) rechaza las últimas `historySize` (hash propio, `utilities/passwordHash.ts`), (3) agrega la nueva al historial,
 *   (4) fija `passwordChangedAt = ahora` y (5) decide `mustChangePassword`: cambio propio o primer registro → false;
 *   cualquier otro actor (superadmin, Local API sin usuario) → true, salvo `req.context.exigirCambio === false`.
 *   Sin contraseña nueva, conserva los tres campos tal como están guardados.
 * Por qué: S1 (cambio obligatorio tras fijarla un administrador), S2 (política en toda vía), S4 (fecha para el
 *   vencimiento de 90 días).
 * Amenaza que evita: contraseñas débiles o repetidas por cualquier vía, y que un llamador del servidor con
 *   `overrideAccess` (que salta el acceso de campo) borre la marca de cambio obligatorio o rejuvenezca la fecha.
 * Límite: no puede comparar con la contraseña vigente si la cuenta aún no tiene historial (el hash de Payload no se
 *   reutiliza); `cambiar-clave` cubre ese caso comparando con la actual ya verificada.
 */
export const enforcePasswordLifecycle: CollectionBeforeChangeHook = async ({ data, operation, originalDoc, req }) => {
  if (!data) return data
  const stored = (originalDoc ?? {}) as Doc
  const password = (data as { password?: unknown }).password

  if (password === undefined || password === null || password === '') {
    // Sin contraseña nueva: los campos de estado no se tocan (los fija solo este hook al cambiar la contraseña).
    if (operation === 'update') {
      data.mustChangePassword = stored.mustChangePassword ?? false
      data.passwordChangedAt = stored.passwordChangedAt ?? null
      data.passwordHistory = Array.isArray(stored.passwordHistory) ? stored.passwordHistory : []
    } else {
      data.mustChangePassword = true
      data.passwordChangedAt = null
      data.passwordHistory = []
    }
    return data
  }

  if (typeof password !== 'string') throw passwordError('La contraseña debe ser un texto.')

  const ctx = contextOf(req)
  // SEC-CUENTAS-01 (S1): la propia cuenta solo cambia su contraseña por `POST /api/users/cambiar-clave`, que verifica la
  // actual. Amenaza que evita: que una sesión robada o un equipo desatendido fije una contraseña nueva con
  // `PATCH /api/users/:id` (o el botón «Cambiar contraseña» del panel de Payload) sin conocer la actual. Límite: el
  // endpoint marca `selfChange` en `req.context`, que REST no puede escribir.
  if (operation === 'update' && ctx.selfChange !== true && isSameUser(req.user?.id, stored.id)) {
    throw passwordError('Para cambiar su propia contraseña use «Cambiar contraseña»: se le pedirá la contraseña actual.')
  }

  const email = (typeof data.email === 'string' && data.email) || stored.email || null
  const policyError = passwordPolicyError(password, { email })
  if (policyError) throw passwordError(policyError)

  if (await matchesPasswordHistory(password, stored.passwordHistory)) {
    throw passwordError(
      `La contraseña no puede ser igual a ninguna de sus ${PASSWORD_POLICY.historySize} anteriores.`,
    )
  }

  const self = operation === 'update' && isSelfAccountChange(req, stored.id)
  const mustChange = self || isFirstRegister(req, operation) ? false : ctx.exigirCambio !== false

  data.passwordHistory = appendToPasswordHistory(
    stored.passwordHistory,
    await hashPasswordForHistory(password),
    PASSWORD_POLICY.historySize,
  )
  data.passwordChangedAt = new Date().toISOString()
  data.mustChangePassword = mustChange
  return data
}
