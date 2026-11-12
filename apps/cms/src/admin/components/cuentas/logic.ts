// SEC-CUENTAS-03: lógica pura del panel de cuentas (odd/tasks/seguridad-cuentas.md, S1, S3, S4, S6).
// Qué es: decisiones sin React (a dónde redirigir, motivo del cambio, filas de la guía, cuerpos de petición) para poder
//   probarlas sin navegador. Las reglas NO se duplican: salen de config/passwordPolicy.ts.
// Límite: el panel solo guía; la obligación real la aplica el servidor (S1) y la política también se valida allí.
import { adminPath } from '../../../config/adminRoute'
import { evaluatePassword, passwordExpiry, type PasswordRuleResult } from '../../../config/passwordPolicy'

export type CuentaUsuario = {
  id?: string | number
  email?: string | null
  role?: string | null
  nombre?: string | null
  apellido?: string | null
  mustChangePassword?: boolean | null
  passwordChangedAt?: string | Date | null
}

/** Ruta de la vista de cambio. */
export const CAMBIAR_CLAVE_PATH = adminPath('/cambiar-clave')

/** Rutas que una cuenta con cambio pendiente sí puede ver (cambiar la contraseña o salir). */
const PERMITIDAS = [CAMBIAR_CLAVE_PATH, adminPath('/logout')]

/** ¿Debe cambiar la contraseña ya? Marca del servidor o contraseña vencida (sin fecha cuenta como vencida). */
export function mustChangeNow(user: CuentaUsuario): boolean {
  return Boolean(user.mustChangePassword) || passwordExpiry(user.role, user.passwordChangedAt).expired
}

/** A dónde mandar a la cuenta según la ruta actual; null si no hay que moverla. Evita que use otras pantallas del panel. */
export function redirectTarget(pathname: string, user: CuentaUsuario | null | undefined): string | null {
  if (!user || !mustChangeNow(user)) return null
  const limpia = pathname.replace(/\/+$/, '')
  return PERMITIDAS.some((p) => limpia === p || limpia.startsWith(`${p}/`)) ? null : CAMBIAR_CLAVE_PATH
}

/** Aviso de vencimiento próximo (≤14 días). No se muestra si ya debe cambiar (la redirección se ocupa). */
export function bannerInfo(user: CuentaUsuario | null | undefined): { text: string; daysLeft: number } | null {
  if (!user || mustChangeNow(user)) return null
  const e = passwordExpiry(user.role, user.passwordChangedAt)
  if (!e.warn) return null
  return { daysLeft: e.daysLeft, text: `Su contraseña vence en ${e.daysLeft} ${e.daysLeft === 1 ? 'día' : 'días'}. Cámbiela ahora.` }
}

/** Motivo que se muestra bajo el título de la vista de cambio. */
export function changeReason(user: CuentaUsuario | null | undefined): string {
  if (user?.mustChangePassword) return 'Es su primer ingreso o un administrador restableció su contraseña. Debe elegir una nueva para continuar.'
  if (user && passwordExpiry(user.role, user.passwordChangedAt).expired) return 'Su contraseña venció. Debe elegir una nueva para continuar.'
  return 'Puede cambiar su contraseña cuando lo desee.'
}

/** Filas de la guía: una por regla de la política y, si se pasa confirmación, «Las contraseñas coinciden». */
export function passwordRows(nueva: string, confirmacion: string | undefined, email: string | null | undefined): PasswordRuleResult[] {
  const rows: Array<{ id: string; label: string; ok: boolean }> = [...evaluatePassword(nueva, { email })]
  if (confirmacion !== undefined) rows.push({ id: 'coinciden', label: 'Las contraseñas coinciden', ok: nueva.length > 0 && nueva === confirmacion })
  return rows as PasswordRuleResult[]
}

const todasOk = (rows: PasswordRuleResult[]) => rows.every((r) => r.ok)

/** El botón «Cambiar contraseña» se habilita solo con la actual escrita y todas las filas cumplidas. */
export function canChange(actual: string, nueva: string, confirmacion: string, email: string | null | undefined): boolean {
  return actual.length > 0 && todasOk(passwordRows(nueva, confirmacion, email))
}

/** Texto que explica por qué el botón está deshabilitado (null si está habilitado). */
export function changeDisabledReason(actual: string, nueva: string, confirmacion: string, email: string | null | undefined): string | null {
  if (!actual) return 'Escriba su contraseña actual para continuar.'
  if (!todasOk(passwordRows(nueva, confirmacion, email))) return 'Cumpla todas las reglas de la lista para habilitar el botón.'
  return null
}

export type ResetState = { modo: 'generar' | 'crear'; clave: string; exigirCambio: boolean }

/** RESTABLECER se habilita siempre en «generar» y, en «crear», solo si la clave cumple la política. */
export function canReset(state: ResetState, email: string | null | undefined): boolean {
  return state.modo === 'generar' || todasOk(passwordRows(state.clave, undefined, email))
}

/** Cuerpo de POST /api/users/cambiar-clave. */
export const buildChangeBody = (actual: string, nueva: string) => ({ actual, nueva })

/** Cuerpo de POST /api/users/:id/restablecer-clave; en «generar» no se envía ninguna clave. */
export function buildResetBody(state: ResetState): { modo: 'generar' | 'crear'; clave?: string; exigirCambio: boolean } {
  return state.modo === 'crear' ? { modo: 'crear', clave: state.clave, exigirCambio: state.exigirCambio } : { modo: 'generar', exigirCambio: state.exigirCambio }
}

/** «Nombre Apellido», con respaldo al correo. */
export function displayName(user: { nombre?: string | null; apellido?: string | null; email?: string | null }): string {
  const full = [user.nombre, user.apellido].map((s) => (s ?? '').trim()).filter(Boolean).join(' ')
  return full || user.email || ''
}

/** Mensajes de error del servidor (`errors[].message`) o uno genérico. */
export function serverErrors(body: unknown, fallback: string): string[] {
  const list = (body as { errors?: Array<{ message?: unknown }> } | null)?.errors
  const msgs = Array.isArray(list) ? list.map((e) => (typeof e?.message === 'string' ? e.message : '')).filter(Boolean) : []
  return msgs.length ? msgs : [fallback]
}
