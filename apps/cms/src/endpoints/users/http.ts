// SEC-CUENTAS-01 (odd/tasks/seguridad-cuentas.md, contrato servidor ↔ panel): utilidades HTTP de los endpoints de cuentas.
// Qué hace: lee el cuerpo JSON con límite de tamaño, arma las respuestas `{ errors: [{ message }] }` del contrato y
//   traduce los errores de Payload (ValidationError → 400 con su mensaje de campo).
// Amenaza que evita: cuerpos enormes que obligan a hashear megabytes y respuestas que filtran trazas internas.
// Límite: no autentica ni autoriza; eso lo hace cada endpoint.
import type { PayloadRequest } from 'payload'

/** Las respuestas de cuentas nunca se guardan en caché (pueden llevar una contraseña o el estado de la cuenta). */
export const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, max-age=0', Pragma: 'no-cache' } as const

/** Largo máximo aceptado para una contraseña en el cuerpo: tope de abuso, no regla de la política. */
export const MAX_PASSWORD_INPUT = 1024

export const jsonError = (status: number, message: string) =>
  Response.json({ errors: [{ message }] }, { status, headers: NO_STORE_HEADERS })

/** Cuerpo JSON como objeto plano, o `null` si no lo es (el endpoint responde 400). */
export async function readJsonBody(req: PayloadRequest): Promise<Record<string, unknown> | null> {
  try {
    const preloaded = (req as { data?: unknown }).data
    const body = preloaded !== undefined ? preloaded : typeof req.json === 'function' ? await req.json() : undefined
    return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/** true si el valor es un texto no vacío dentro del tope de largo. */
export const isPasswordInput = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= MAX_PASSWORD_INPUT

/** Estado HTTP de un error de Payload (APIError lleva `status`). */
export const errorStatus = (error: unknown): number | undefined =>
  error && typeof error === 'object' && typeof (error as { status?: unknown }).status === 'number'
    ? (error as { status: number }).status
    : undefined

/**
 * Mensaje público de un ValidationError de Payload: el primero de `data.errors` (lo arma `enforcePasswordLifecycle`
 * con la regla incumplida, nunca con la contraseña). Si no lo hay, un texto genérico.
 */
export const validationMessage = (error: unknown): string => {
  const errors = (error as { data?: { errors?: Array<{ message?: unknown }> } })?.data?.errors
  const first = Array.isArray(errors) ? errors.find((e) => typeof e?.message === 'string') : undefined
  return (first?.message as string | undefined) ?? 'La contraseña no es válida.'
}
