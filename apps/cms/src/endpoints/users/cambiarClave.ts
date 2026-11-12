// SEC-CUENTAS-01 (odd/tasks/seguridad-cuentas.md, T2: S1, S2, S5): `POST /api/users/cambiar-clave`.
// Contrato: sesión requerida (también con el cambio obligatorio pendiente). Cuerpo `{ "actual": string, "nueva": string }`.
//   200 `{ "ok": true }`; 400 `{ "errors": [{ "message" }] }` si la nueva no cumple la política o repite una anterior;
//   401 si `actual` es incorrecta (cuenta como intento fallido de ingreso). Efecto: `mustChangePassword=false`,
//   `passwordChangedAt=ahora`, historial actualizado, demás sesiones cerradas, auditoría `cambiar_clave`.
import type { Endpoint, PayloadRequest } from 'payload'

import { auditFailedPasswordChange } from '../../hooks/users/auditUsers'
import { errorStatus, isPasswordInput, jsonError, NO_STORE_HEADERS, readJsonBody, validationMessage } from './http'
import { pruneSessions, sidFromToken } from './sessions'

type SessionUser = { id?: number | string; email?: string; collection?: string; _sid?: string }

/**
 * Cambia la contraseña de la PROPIA cuenta.
 * Qué hace: (1) exige sesión de `users`; (2) verifica la contraseña actual con `payload.login`, que suma el intento
 *   fallido y bloquea la cuenta a los 5 (configuración por defecto de Payload); (3) actualiza con `overrideAccess` y
 *   `context.selfChange` (el acceso normal se lo niega a quien tiene el cambio pendiente, a propósito); la política, el
 *   historial, la fecha y `mustChangePassword=false` los aplica `enforcePasswordLifecycle`; (4) cierra las demás sesiones
 *   y la que abrió la verificación, conservando la actual.
 * Amenaza que evita: que una sesión robada o un equipo desatendido cambie la contraseña sin conocer la actual, y que el
 *   endpoint sirva para adivinar contraseñas sin límite.
 * Límite: la verificación crea y luego descarta una sesión efímera; si la nueva no cumple, las demás sesiones siguen.
 */
export const cambiarClaveHandler = async (req: PayloadRequest): Promise<Response> => {
  const user = req.user as SessionUser | null
  if (!user?.id || user.collection !== 'users' || typeof user.email !== 'string') {
    return jsonError(401, 'Debe iniciar sesión para cambiar su contraseña.')
  }

  const body = await readJsonBody(req)
  const actual = body?.actual
  const nueva = body?.nueva
  if (!isPasswordInput(actual) || !isPasswordInput(nueva)) {
    return jsonError(400, 'Indique la contraseña actual y la nueva.')
  }

  // (2) Verificación de la actual: el contexto evita que la auditoría la registre como un ingreso.
  let verificationSid: string | undefined
  try {
    const result = await req.payload.login({
      collection: 'users',
      data: { email: user.email, password: actual },
      context: { verificacionClave: true },
    })
    verificationSid = sidFromToken((result as { token?: unknown }).token)
  } catch (error) {
    const locked = (error as { name?: string })?.name === 'LockedAuth'
    if (errorStatus(error) === 401 || errorStatus(error) === 403 || locked) {
      await auditFailedPasswordChange(req, locked ? 'cuenta_bloqueada' : 'clave_actual_incorrecta')
      return jsonError(
        401,
        locked
          ? 'La cuenta está bloqueada temporalmente por intentos fallidos. Intente más tarde.'
          : 'La contraseña actual no es correcta.',
      )
    }
    throw error
  }

  const dropVerificationSession = () =>
    verificationSid ? pruneSessions(req, user.id!, (s) => s.id !== verificationSid) : Promise.resolve(0)

  if (nueva === actual) {
    await dropVerificationSession()
    return jsonError(400, 'La nueva contraseña debe ser distinta de la actual.')
  }

  try {
    await req.payload.update({
      collection: 'users',
      id: user.id,
      data: { password: nueva },
      req,
      overrideAccess: true,
      context: { selfChange: true },
    })
  } catch (error) {
    await dropVerificationSession()
    if (errorStatus(error) === 400) return jsonError(400, validationMessage(error))
    throw error
  }

  // (4) Solo sobrevive la sesión con la que se hizo el cambio.
  await pruneSessions(req, user.id, (s) => Boolean(user._sid) && s.id === user._sid)
  return Response.json({ ok: true }, { status: 200, headers: NO_STORE_HEADERS })
}

export const cambiarClaveEndpoint = {
  path: '/cambiar-clave',
  method: 'post',
  handler: cambiarClaveHandler,
} satisfies Endpoint
