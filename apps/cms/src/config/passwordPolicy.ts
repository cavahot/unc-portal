// SEC-CUENTAS-01: política de contraseñas y vencimiento de las cuentas del CMS (odd/tasks/seguridad-cuentas.md, S2 y S4).
// Qué es: la única fuente de las reglas. La usan el servidor (hooks de Users y el endpoint de cambio) y la pantalla de
//   cambio con su guía de checks; cambiar un número aquí cambia ambos.
// Amenaza que evita: contraseñas cortas, previsibles o derivadas del correo en cuentas que publican en el sitio oficial.
// Límite: no consulta bases de contraseñas filtradas (sin red); la lista de comunes es local. Módulo puro.

export const PASSWORD_POLICY = {
  minLength: 12,
  minDigits: 3,
  minLetters: 4,
  minUpper: 1,
  minLower: 1,
  minSpecial: 1,
  /** No se puede repetir ninguna de las últimas N contraseñas. */
  historySize: 5,
  /** Días antes del vencimiento en que el panel empieza a avisar. */
  warnDays: 14,
  /** Vencimiento en días, igual para todos los roles (decisión del propietario del 2026-11-12). */
  rotationDays: 90,
} as const

/**
 * Palabras base comunes (sin números ni símbolos). Una contraseña cuyas letras, en minúsculas, forman exactamente una
 * de estas se rechaza aunque cumpla el formato («Password#123», «Concepcion#2026»).
 */
const COMMON_BASES = new Set([
  'password', 'contrasena', 'contraseña', 'clave', 'admin', 'administrador', 'qwerty', 'asdf', 'abcd', 'abc', 'welcome',
  'bienvenido', 'letmein', 'iloveyou', 'teamo', 'unc', 'universidad', 'concepcion', 'paraguay', 'asuncion', 'guarani',
  'portal', 'payload', 'secret', 'secreto', 'usuario', 'user', 'test', 'prueba', 'cambiar', 'cambiame', 'changeme',
])

export type PasswordRuleId =
  | 'longitud'
  | 'numeros'
  | 'letras'
  | 'mayuscula'
  | 'minuscula'
  | 'especial'
  | 'espacios'
  | 'correo'
  | 'comun'

export type PasswordRuleResult = { id: PasswordRuleId; label: string; ok: boolean }

const count = (value: string, re: RegExp) => (value.match(re) ?? []).length

/** Evalúa cada regla por separado (la guía muestra un check por regla). */
export function evaluatePassword(password: string, opts: { email?: string | null } = {}): PasswordRuleResult[] {
  const p = PASSWORD_POLICY
  const value = typeof password === 'string' ? password : ''
  const local = (opts.email ?? '').split('@')[0]?.trim().toLowerCase() ?? ''
  const letters = value.replace(/[^\p{L}]/gu, '').toLowerCase()
  return [
    { id: 'longitud', label: `Al menos ${p.minLength} caracteres`, ok: [...value].length >= p.minLength },
    { id: 'numeros', label: `Al menos ${p.minDigits} números`, ok: count(value, /\p{Nd}/gu) >= p.minDigits },
    { id: 'letras', label: `Al menos ${p.minLetters} letras`, ok: count(value, /\p{L}/gu) >= p.minLetters },
    { id: 'mayuscula', label: 'Al menos una letra mayúscula', ok: count(value, /\p{Lu}/gu) >= p.minUpper },
    { id: 'minuscula', label: 'Al menos una letra minúscula', ok: count(value, /\p{Ll}/gu) >= p.minLower },
    { id: 'especial', label: 'Al menos un carácter especial (por ejemplo # $ % & * ! ?)', ok: count(value, /[^\p{L}\p{N}\s]/gu) >= p.minSpecial },
    { id: 'espacios', label: 'Sin espacios al inicio ni al final', ok: value.length > 0 && value === value.trim() },
    { id: 'correo', label: 'No contiene su usuario de correo', ok: local.length < 3 || !value.toLowerCase().includes(local) },
    { id: 'comun', label: 'No es una contraseña común', ok: value.length > 0 && !COMMON_BASES.has(letters) },
  ]
}

export function isPasswordAcceptable(password: string, opts: { email?: string | null } = {}): boolean {
  return evaluatePassword(password, opts).every((r) => r.ok)
}

/** Mensaje para el servidor: las reglas incumplidas, en una línea. */
export function passwordPolicyError(password: string, opts: { email?: string | null } = {}): string | null {
  const failed = evaluatePassword(password, opts).filter((r) => !r.ok)
  return failed.length ? `La contraseña no cumple la política: ${failed.map((r) => r.label.toLowerCase()).join('; ')}.` : null
}

const DAY = 24 * 60 * 60 * 1000

/** Días de vigencia. Recibe el rol para poder diferenciarlo en el futuro; hoy es igual para todos. */
export function rotationDaysFor(_role: string | null | undefined): number {
  return PASSWORD_POLICY.rotationDays
}

/**
 * Vencimiento de la contraseña. Sin fecha de cambio se considera vencida: así una cuenta anterior a esta política
 * cambia su contraseña en el próximo ingreso.
 */
export function passwordExpiry(
  role: string | null | undefined,
  changedAt: Date | string | null | undefined,
  now: Date = new Date(),
): { expiresAt: Date; expired: boolean; warn: boolean; daysLeft: number } {
  const changed = changedAt ? new Date(changedAt) : null
  if (!changed || Number.isNaN(changed.getTime())) return { expiresAt: new Date(0), expired: true, warn: true, daysLeft: 0 }
  const expiresAt = new Date(changed.getTime() + rotationDaysFor(role) * DAY)
  const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / DAY)
  const expired = daysLeft <= 0
  return { expiresAt, expired, warn: expired || daysLeft <= PASSWORD_POLICY.warnDays, daysLeft: Math.max(daysLeft, 0) }
}
