// SEC-CUENTAS-01 (T1): política de contraseñas y vencimiento (spec odd/tasks/seguridad-cuentas.md, S2 y S4).
// Qué comprueba: cada regla se informa por separado (la usa la guía con checks en vivo) y en conjunto; el vencimiento
// depende del rol; el aviso empieza 14 días antes. Amenaza: contraseñas débiles o adivinables en cuentas con permisos de
// publicación. Límite: función pura; la aplicación en el servidor se prueba en T2 y T3.
import { describe, expect, it } from 'vitest'
import {
  PASSWORD_POLICY,
  evaluatePassword,
  isPasswordAcceptable,
  passwordExpiry,
} from '../../apps/cms/src/config/passwordPolicy'

const ok = 'Concepcion#2026uNC'
const failing = (pw: string, email?: string) => evaluatePassword(pw, { email }).filter((r) => !r.ok).map((r) => r.id)

describe('SEC-CUENTAS-01: política de contraseñas', () => {
  it('acepta una contraseña que cumple todas las reglas', () => {
    expect(failing(ok)).toEqual([])
    expect(isPasswordAcceptable(ok)).toBe(true)
  })

  it('informa cada regla por separado, con su texto para la guía', () => {
    const rules = evaluatePassword('')
    expect(rules.map((r) => r.id)).toEqual(['longitud', 'numeros', 'letras', 'mayuscula', 'minuscula', 'especial', 'espacios', 'correo', 'comun'])
    expect(rules.every((r) => typeof r.label === 'string' && r.label.length > 0)).toBe(true)
  })

  it('exige 12 caracteres, 3 números, 4 letras, una mayúscula, una minúscula y un especial', () => {
    expect(failing('Wxyz#123456')).toEqual(['longitud'])
    expect(failing('Abcdefgh#12x')).toEqual(['numeros'])
    expect(failing('Ab#123456789')).toEqual(['letras'])
    expect(failing('abcd#123efgh')).toEqual(['mayuscula'])
    expect(failing('ABCD#123EFGH')).toEqual(['minuscula'])
    expect(failing('Wxyz1234efgh')).toEqual(['especial'])
  })

  it('rechaza espacios al inicio o al final', () => {
    expect(failing(` ${ok}`)).toEqual(['espacios'])
    expect(failing(`${ok} `)).toEqual(['espacios'])
  })

  it('rechaza la parte del correo antes de la @ (sin distinguir mayúsculas)', () => {
    expect(failing('Cvargas#2026xyz', 'cvargas@unc.edu.py')).toEqual(['correo'])
    expect(failing(ok, 'cvargas@unc.edu.py')).toEqual([])
  })

  it('rechaza contraseñas comunes aunque cumplan el formato', () => {
    expect(failing('Password#123')).toContain('comun')
    expect(failing('Concepcion#123')).toContain('comun')
  })

  it('vencimiento: 90 días para todos los roles (decisión del propietario, 2026-11-12); aviso 14 días antes', () => {
    const changed = new Date('2026-01-01T00:00:00Z')
    expect(passwordExpiry('publisher', changed).expiresAt.toISOString()).toBe('2026-04-01T00:00:00.000Z')
    expect(passwordExpiry('editor', changed).expiresAt.toISOString()).toBe('2026-04-01T00:00:00.000Z')
    expect(passwordExpiry('superadmin', changed, new Date('2026-03-15T00:00:00Z'))).toMatchObject({ expired: false, warn: false })
    expect(passwordExpiry('superadmin', changed, new Date('2026-03-20T00:00:00Z'))).toMatchObject({ expired: false, warn: true, daysLeft: 12 })
    expect(passwordExpiry('superadmin', changed, new Date('2026-04-02T00:00:00Z'))).toMatchObject({ expired: true })
  })

  it('sin fecha de cambio la contraseña se considera vencida (fuerza el cambio)', () => {
    expect(passwordExpiry('viewer', null).expired).toBe(true)
  })

  it('los parámetros quedan en un solo lugar', () => {
    expect(PASSWORD_POLICY).toMatchObject({ minLength: 12, minDigits: 3, minLetters: 4, historySize: 5, warnDays: 14, rotationDays: 90 })
  })
})
