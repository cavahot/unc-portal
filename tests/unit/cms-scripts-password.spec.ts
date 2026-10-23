import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { requireCmsPassword } from '../../scripts/lib/requireCmsPassword.mjs'

/**
 * SEC-08 (ampliación a scripts de la raíz): varios scripts hacían
 * `process.env.CMS_PASSWORD || '<literal>'`. Amenaza: ejecutarlos contra un CMS cuyo superadmin conserva
 * la credencial por defecto conocida, o dejar esa credencial documentada en el repo. El helper debe
 * fallar ANTES de cualquier red/escritura si falta, es débil o NODE_ENV=production.
 * Límite: valida longitud y lista de valores conocidos, no la entropía; los seeds de apps/cms usan
 * SEED_ADMIN_PASSWORD (otra variable), estos scripts usan CMS_PASSWORD.
 */

const VALID = 'Clave-Local-Segura-93'
// Valores históricos prohibidos, armados por partes para que no aparezcan completos en el repo.
const HISTORICAL = ['Admin', '1234!'].join('')
const HISTORICAL_2 = ['Admin', '@2026'].join('')

const FIXED_SCRIPTS = [
  'migrate-wordpress.mjs',
  'patch-missing-images.mjs',
  'patch-news-images.mjs',
  'seed-aranceles-rectorado.mjs',
]

describe('requireCmsPassword', () => {
  it('lanza si CMS_PASSWORD falta, está vacía o son espacios', () => {
    expect(() => requireCmsPassword({})).toThrow(/CMS_PASSWORD/)
    expect(() => requireCmsPassword({ CMS_PASSWORD: '' })).toThrow()
    expect(() => requireCmsPassword({ CMS_PASSWORD: '   ' })).toThrow()
  })
  it('lanza si es corta o de un solo carácter repetido', () => {
    expect(() => requireCmsPassword({ CMS_PASSWORD: 'Corta1!' })).toThrow()
    expect(() => requireCmsPassword({ CMS_PASSWORD: 'aaaaaaaaaaaaaaaa' })).toThrow()
  })
  it('lanza con valores conocidos (sin distinguir mayúsculas)', () => {
    for (const bad of [HISTORICAL, HISTORICAL.toLowerCase(), HISTORICAL_2, 'PASSWORD', 'changeme']) {
      expect(() => requireCmsPassword({ CMS_PASSWORD: bad })).toThrow()
    }
  })
  it('lanza en producción aunque la clave sea buena', () => {
    expect(() => requireCmsPassword({ NODE_ENV: 'production', CMS_PASSWORD: VALID })).toThrow(/production/i)
  })
  it('devuelve la clave válida', () => {
    expect(requireCmsPassword({ CMS_PASSWORD: VALID })).toBe(VALID)
    expect(requireCmsPassword({ NODE_ENV: 'development', CMS_PASSWORD: VALID })).toBe(VALID)
  })
  it('el mensaje de error nunca incluye el valor', () => {
    for (const bad of ['Corta1!', HISTORICAL, 'aaaaaaaaaaaaaaaa']) {
      let message = ''
      try { requireCmsPassword({ CMS_PASSWORD: bad }) } catch (e) { message = (e as Error).message }
      expect(message).not.toBe('')
      expect(message).not.toContain(bad)
    }
    let message = ''
    try { requireCmsPassword({ NODE_ENV: 'production', CMS_PASSWORD: VALID }) } catch (e) { message = (e as Error).message }
    expect(message).not.toContain(VALID)
  })
})

describe('scripts de la raíz corregidos', () => {
  it.each(FIXED_SCRIPTS)('%s no tiene contraseña por defecto y usa requireCmsPassword', (file) => {
    const text = readFileSync(path.resolve(__dirname, '../../scripts', file), 'utf8')
    expect(text).not.toContain(HISTORICAL)
    expect(text).not.toMatch(/password[^\n]*(\?\?|\|\|)\s*['"`][^'"`]/i)
    expect(text).toContain('requireCmsPassword')
  })
})
