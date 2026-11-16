// SEC-CUENTAS-01 (odd/tasks/seguridad-cuentas.md, T2: S2): cierre de la recuperación de contraseña por correo de Payload.
// Evidencia RDD (Payload 3.91): `auth/operations/resetPassword.js:57` calcula el hash de la contraseña nueva SIN pasar por
//   los hooks de la colección, así que saltaría la política, el historial y la auditoría. Los endpoints propios de la
//   colección se registran ANTES que los de Payload (`collections/config/sanitize.js:82`) y `handleEndpoints` usa el
//   primero que coincide (`utilities/handleEndpoints.js`, `endpoints.find`): estos dos ganan sobre los originales
//   (prueba: tests/unit/seguridad-cuentas-config.spec.ts, con la configuración real saneada).
// Amenaza que evita: restablecer una contraseña débil con un token de correo, y usar el formulario de «olvidé mi
//   contraseña» para enumerar cuentas o enviar correos en masa.
// Límite: solo cierra la vía HTTP. La Local API (`payload.forgotPassword` / `payload.resetPassword`) sigue existiendo
//   para el código del servidor, que no la usa.
import type { Endpoint } from 'payload'

export const RECOVERY_CLOSED_MESSAGE = 'La recuperación de contraseña la realiza un administrador del portal.'

/** 403 con el mensaje del contrato, sin leer el cuerpo ni consultar la base (no revela si la cuenta existe). */
const recoveryClosed = async (): Promise<Response> =>
  Response.json({ errors: [{ message: RECOVERY_CLOSED_MESSAGE }] }, { status: 403, headers: { 'Cache-Control': 'no-store' } })

export const forgotPasswordClosedEndpoint = {
  path: '/forgot-password',
  method: 'post',
  handler: recoveryClosed,
} satisfies Endpoint

export const resetPasswordClosedEndpoint = {
  path: '/reset-password',
  method: 'post',
  handler: recoveryClosed,
} satisfies Endpoint
