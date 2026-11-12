// SEC-CUENTAS-01 (odd/tasks/seguridad-cuentas.md, T2: S1, S2, S5; diálogo de S6): `POST /api/users/:id/restablecer-clave`.
// Contrato: solo superadmin y nunca sobre su propia cuenta. Cuerpo `{ "modo": "generar" | "crear", "clave"?: string,
//   "exigirCambio": boolean }`. 200 `{ "ok": true, "clave": string, "nombre": string }` (la clave solo en esta respuesta,
//   con `Cache-Control: no-store`); 400 con `errors` si `crear` no cumple la política; 403 si no es superadmin o es la
//   propia cuenta. Efecto: contraseña nueva (generada de 16 caracteres que cumple la política),
//   `mustChangePassword=exigirCambio`, `passwordChangedAt=ahora`, todas las sesiones de esa cuenta cerradas, auditoría
//   `restablecer_clave`.
import { randomInt } from 'node:crypto'
import type { Endpoint, PayloadRequest } from 'payload'

import { hasRole, isSameUser } from '../../access/roles'
import { isPasswordAcceptable, passwordPolicyError } from '../../config/passwordPolicy'
import { errorStatus, isPasswordInput, jsonError, NO_STORE_HEADERS, readJsonBody, validationMessage } from './http'
import { pruneSessions } from './sessions'

// Alfabetos sin caracteres que se confunden al dictarlos o copiarlos a mano (0/O, 1/l/I) y sin espacios.
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const LOWER = 'abcdefghijkmnopqrstuvwxyz'
const DIGITS = '23456789'
const SPECIAL = '#$%&*!?@+=-_'
const ALL = UPPER + LOWER + DIGITS + SPECIAL
export const GENERATED_PASSWORD_LENGTH = 16

const pick = (alphabet: string) => alphabet[randomInt(alphabet.length)]

/**
 * Genera una contraseña de 16 caracteres con `crypto.randomInt` (CSPRNG, sin sesgo de módulo) que cumple la política:
 * 3 mayúsculas, 3 minúsculas, 3 dígitos y 2 especiales garantizados, el resto de todo el alfabeto, mezclada con
 * Fisher-Yates. Se valida con la política (correo incluido) y se regenera si no cumpliera.
 * Amenaza que evita: contraseñas provisorias previsibles o débiles. Límite: el valor existe solo en memoria y en la
 * respuesta; nunca se registra.
 */
export function generatePassword(email?: string | null): string {
  for (let attempt = 0; attempt < 50; attempt++) {
    const chars = [
      ...Array.from({ length: 3 }, () => pick(UPPER)),
      ...Array.from({ length: 3 }, () => pick(LOWER)),
      ...Array.from({ length: 3 }, () => pick(DIGITS)),
      ...Array.from({ length: 2 }, () => pick(SPECIAL)),
    ]
    while (chars.length < GENERATED_PASSWORD_LENGTH) chars.push(pick(ALL))
    for (let i = chars.length - 1; i > 0; i--) {
      const j = randomInt(i + 1)
      ;[chars[i], chars[j]] = [chars[j], chars[i]]
    }
    const candidate = chars.join('')
    if (isPasswordAcceptable(candidate, { email })) return candidate
  }
  throw new Error('No se pudo generar una contraseña que cumpla la política.')
}

type Target = { id: number | string; email?: string | null; nombre?: string | null; apellido?: string | null }

/** «Nombre Apellido» para el diálogo; si la ficha no los tiene, el correo. */
const displayName = (target: Target) =>
  [target.nombre, target.apellido].filter((v) => typeof v === 'string' && v.trim()).join(' ').trim() || target.email || ''

/**
 * Restablece la contraseña de OTRA cuenta.
 * Qué hace: (1) solo superadmin con su propia contraseña al día (`hasRole` niega mientras su cambio está pendiente);
 *   (2) nunca su propia cuenta (para eso está `cambiar-clave`, que pide la actual); (3) genera o valida la clave;
 *   (4) actualiza pasando la decisión `exigirCambio` y el modo por el contexto del servidor; la política, el historial,
 *   la fecha, `mustChangePassword` y la auditoría `restablecer_clave` los aplican los hooks de `users`; (5) cierra todas
 *   las sesiones de esa cuenta; (6) devuelve la clave UNA vez, sin caché.
 * Amenaza que evita: restablecimientos por otros roles, autoservicio sin la contraseña actual, sesiones de un
 *   atacante que sobreviven al restablecimiento y la contraseña guardada en cachés o en el log.
 * Límite: la clave viaja en la respuesta (el contrato lo pide para mostrarla una vez); su protección en tránsito es TLS.
 */
export const restablecerClaveHandler = async (req: PayloadRequest): Promise<Response> => {
  const actor = req.user as { id?: number | string; collection?: string } | null
  if (!actor?.id || actor.collection !== 'users' || !hasRole(actor, ['superadmin'])) {
    return jsonError(403, 'Solo un superadministrador con su contraseña al día puede restablecer contraseñas.')
  }

  const rawId = (req.routeParams as { id?: unknown } | undefined)?.id
  const id = typeof rawId === 'string' || typeof rawId === 'number' ? rawId : undefined
  if (id === undefined || String(id).trim() === '') return jsonError(400, 'Falta la cuenta a restablecer.')
  if (isSameUser(actor.id, id)) {
    return jsonError(403, 'No puede restablecer su propia contraseña; use «Cambiar contraseña».')
  }

  const body = await readJsonBody(req)
  const modo = body?.modo
  if (modo !== 'generar' && modo !== 'crear') return jsonError(400, 'El modo debe ser «generar» o «crear».')
  if (body?.exigirCambio !== undefined && typeof body.exigirCambio !== 'boolean') {
    return jsonError(400, '«exigirCambio» debe ser verdadero o falso.')
  }
  // Por defecto se exige el cambio (la casilla del diálogo viene marcada).
  const exigirCambio = body?.exigirCambio !== false
  if (modo === 'crear' && !isPasswordInput(body?.clave)) return jsonError(400, 'Indique la contraseña a asignar.')

  let target: Target
  try {
    target = (await req.payload.findByID({ collection: 'users', id, depth: 0, overrideAccess: true, req })) as Target
  } catch (error) {
    if (errorStatus(error) === 404) return jsonError(404, 'La cuenta no existe.')
    throw error
  }
  if (!target) return jsonError(404, 'La cuenta no existe.')

  let clave: string
  if (modo === 'crear') {
    clave = body!.clave as string
    // Rechazo temprano con el mismo módulo de política que el hook (que vuelve a validar como segunda barrera).
    const policyError = passwordPolicyError(clave, { email: target.email })
    if (policyError) return jsonError(400, policyError)
  } else {
    clave = generatePassword(target.email)
  }

  try {
    await req.payload.update({
      collection: 'users',
      id: target.id,
      data: { password: clave },
      req,
      overrideAccess: true,
      context: { exigirCambio, modoRestablecimiento: modo },
    })
  } catch (error) {
    if (errorStatus(error) === 400) return jsonError(400, validationMessage(error))
    throw error
  }

  await pruneSessions(req, target.id, () => false)
  return Response.json({ ok: true, clave, nombre: displayName(target) }, { status: 200, headers: NO_STORE_HEADERS })
}

export const restablecerClaveEndpoint = {
  path: '/:id/restablecer-clave',
  method: 'post',
  handler: restablecerClaveHandler,
} satisfies Endpoint
