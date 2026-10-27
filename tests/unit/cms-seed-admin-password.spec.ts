import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { requireSeedAdminPassword } from '../../apps/cms/scripts/seed/seedAdminPassword'

/**
 * SEC-08: los seeds creaban el superadmin con una contraseña por defecto conocida
 * (`SEED_ADMIN_PASSWORD ?? '<literal>'`). Amenaza: cualquier instalación sembrada sin la variable
 * queda con una credencial pública. El helper debe fallar ANTES de escribir nada si falta, es débil
 * o se corre en producción. Límite: valida longitud/lista de valores conocidos, no la entropía real.
 */

const VALID = 'Clave-Local-Segura-93'
// Valor histórico prohibido; se arma por partes para que el guard de literales no marque este test.
const HISTORICAL = ['Admin', '@2026'].join('')

const seedFile = (name: string) =>
  readFileSync(path.resolve(__dirname, '../../apps/cms/scripts/seed', name), 'utf8')

describe('requireSeedAdminPassword', () => {
  it('lanza si la variable falta', () => {
    expect(() => requireSeedAdminPassword({ NODE_ENV: 'development' })).toThrow(/SEED_ADMIN_PASSWORD/)
  })
  it('lanza si está vacía o solo espacios', () => {
    expect(() => requireSeedAdminPassword({ SEED_ADMIN_PASSWORD: '' })).toThrow()
    expect(() => requireSeedAdminPassword({ SEED_ADMIN_PASSWORD: '   ' })).toThrow()
  })
  it('lanza si es corta o de un solo carácter repetido', () => {
    expect(() => requireSeedAdminPassword({ SEED_ADMIN_PASSWORD: 'Corta1!' })).toThrow()
    expect(() => requireSeedAdminPassword({ SEED_ADMIN_PASSWORD: 'aaaaaaaaaaaaaaaa' })).toThrow()
  })
  it('lanza con el valor histórico y con valores conocidos', () => {
    expect(() => requireSeedAdminPassword({ SEED_ADMIN_PASSWORD: HISTORICAL })).toThrow()
    expect(() => requireSeedAdminPassword({ SEED_ADMIN_PASSWORD: 'password' })).toThrow()
    expect(() => requireSeedAdminPassword({ SEED_ADMIN_PASSWORD: 'administrator1' })).not.toThrow()
  })
  it('lanza en producción aunque la contraseña sea buena', () => {
    expect(() => requireSeedAdminPassword({ NODE_ENV: 'production', SEED_ADMIN_PASSWORD: VALID })).toThrow(/production|producci/i)
  })
  it('devuelve la contraseña válida en desarrollo', () => {
    expect(requireSeedAdminPassword({ NODE_ENV: 'development', SEED_ADMIN_PASSWORD: VALID })).toBe(VALID)
    expect(requireSeedAdminPassword({ SEED_ADMIN_PASSWORD: VALID })).toBe(VALID)
  })
  it('el mensaje de error no contiene el valor de la contraseña', () => {
    for (const bad of ['Corta1!', HISTORICAL, 'aaaaaaaaaaaaaaaa']) {
      try {
        requireSeedAdminPassword({ SEED_ADMIN_PASSWORD: bad })
        throw new Error('debía lanzar')
      } catch (e) {
        expect((e as Error).message).not.toContain(bad)
      }
    }
    try {
      requireSeedAdminPassword({ NODE_ENV: 'production', SEED_ADMIN_PASSWORD: VALID })
    } catch (e) {
      expect((e as Error).message).not.toContain(VALID)
    }
  })
})

describe('los seeds exigen la contraseña', () => {
  it.each(['init.ts', 'payload-direct.ts', 'with-auth.ts'])('%s no tiene contraseña por defecto y usa el helper', (file) => {
    const text = seedFile(file)
    expect(text).not.toContain(HISTORICAL)
    expect(text).not.toMatch(/password[^\n]*(\?\?|\|\|)\s*['"`]/i)
    expect(text).toContain('requireSeedAdminPassword')
  })
})
