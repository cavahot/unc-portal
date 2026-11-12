// SEC-CUENTAS-01 (odd/tasks/seguridad-cuentas.md, T2: S7 y cierre de la recuperación por correo de S2).
// Qué comprueba:
//   - S7: `serverURL`, `csrf` y `cors` con la lista EXACTA de orígenes (CMS y portal públicos; localhost:3002/3000 solo
//     fuera de producción) y la cookie de sesión `secure` en producción con `sameSite: 'Strict'`.
//   - Que con la configuración real ya saneada por Payload, el enrutador elige NUESTROS endpoints de `users` antes que los
//     de Payload (`/forgot-password`, `/reset-password`), con la misma búsqueda que `handleEndpoints` (primer match).
// Amenaza: CSRF con la cookie de sesión desde otro origen, cookie enviada por HTTP en producción, y la recuperación por
//   correo de Payload (que no pasa por los hooks) saltando la política.
// Límite: importa la configuración con una URI y un secreto sintéticos (no abre conexión). La prueba HTTP contra el CMS
//   local va en el informe.
import { match } from 'path-to-regexp'
import { describe, expect, it, vi } from 'vitest'

import { resolveAuthCookies, resolveSessionOrigins } from '../../apps/cms/src/collections/Users'
import { RECOVERY_CLOSED_MESSAGE } from '../../apps/cms/src/endpoints/users/recuperacionCerrada'

describe('S7: orígenes de confianza', () => {
  it('producción: solo las URL públicas del CMS y del portal (sin barra final ni rutas)', () => {
    const env = { NODE_ENV: 'production', NEXT_PUBLIC_SERVER_URL: 'https://cms.example.invalid/', PORTAL_URL: 'https://www.example.invalid/inicio' }
    expect(resolveSessionOrigins(env)).toEqual({
      serverURL: 'https://cms.example.invalid',
      origins: ['https://cms.example.invalid', 'https://www.example.invalid'],
    })
  })

  it('producción: acepta CMS_PUBLIC_URL si NEXT_PUBLIC_SERVER_URL falta', () => {
    const env = { NODE_ENV: 'production', CMS_PUBLIC_URL: 'https://cms.example.invalid', PORTAL_URL: 'https://www.example.invalid' }
    expect(resolveSessionOrigins(env).serverURL).toBe('https://cms.example.invalid')
  })

  it('desarrollo: agrega localhost:3002 y localhost:3000, sin duplicados', () => {
    const env = { NODE_ENV: 'development', NEXT_PUBLIC_SERVER_URL: 'http://localhost:3002', PORTAL_URL: 'http://localhost:3000' }
    expect(resolveSessionOrigins(env).origins).toEqual(['http://localhost:3002', 'http://localhost:3000'])
  })

  it('ignora valores que no son URL http(s)', () => {
    const env = { NODE_ENV: 'production', NEXT_PUBLIC_SERVER_URL: 'javascript:alert(1)', PORTAL_URL: '*' }
    expect(resolveSessionOrigins(env)).toEqual({ serverURL: undefined, origins: [] })
  })
})

describe('S7: cookie de sesión', () => {
  it('producción: secure y SameSite Strict', () => {
    expect(resolveAuthCookies({ NODE_ENV: 'production' })).toEqual({ secure: true, sameSite: 'Strict' })
  })
  it('desarrollo por http: no secure (si no, el navegador no la guarda), SameSite Strict', () => {
    expect(resolveAuthCookies({ NODE_ENV: 'development' })).toEqual({ secure: false, sameSite: 'Strict' })
  })
})

describe('configuración real saneada por Payload', () => {
  it('aplica S7 y el enrutador elige los endpoints propios de users', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('DATABASE_URI', 'postgres://sintetico:sintetico@127.0.0.1:5999/sintetico')
    vi.stubEnv('PAYLOAD_SECRET', 'Zq8-sintetico-k3Y9-pW2x-vB7n-mR4t-Lc6d-Hs1f')
    vi.stubEnv('NEXT_PUBLIC_SERVER_URL', 'http://localhost:3002')
    vi.stubEnv('PORTAL_URL', 'http://localhost:3000')
    vi.resetModules()
    const config = await (await import('../../apps/cms/src/payload.config')).default

    expect(config.serverURL).toBe('http://localhost:3002')
    // Payload agrega `serverURL` a `csrf` por su cuenta (config/sanitize.js); el duplicado no cambia el efecto.
    expect([...new Set(config.csrf)].sort()).toEqual(['http://localhost:3000', 'http://localhost:3002'])
    expect(config.cors).toEqual(['http://localhost:3002', 'http://localhost:3000'])

    const users = config.collections.find((c) => c.slug === 'users')!
    expect(users.auth.cookies).toMatchObject({ secure: false, sameSite: 'Strict' })

    // Misma regla que payload/dist/utilities/handleEndpoints.js: gana el PRIMER endpoint con método y ruta coincidentes.
    const route = (method: string, path: string) =>
      (users.endpoints || []).find((e) => e.method === method && match(e.path, { decode: decodeURIComponent })(path))
    for (const path of ['/forgot-password', '/reset-password']) {
      const ep = route('post', path)!
      const res = await ep.handler({} as never)
      expect(res.status, path).toBe(403)
      expect(await res.json(), path).toEqual({ errors: [{ message: RECOVERY_CLOSED_MESSAGE }] })
    }
    expect(route('post', '/cambiar-clave')?.path).toBe('/cambiar-clave')
    expect(route('post', '/9/restablecer-clave')?.path).toBe('/:id/restablecer-clave')
    // El resto de las rutas de autenticación siguen siendo las de Payload.
    expect(route('post', '/login')?.path).toBe('/login')
    expect(route('get', '/me')?.path).toBe('/me')
    vi.unstubAllEnvs()
  }, 120_000)
})
