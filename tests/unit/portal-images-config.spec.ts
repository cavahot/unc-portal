// MIG-IMG fase 2a: configuración de `next/image` del portal (lib/images/nextImagesConfig.mjs) y CSP img-src.
// Amenazas: (1) el optimizador `/_next/image` como proxy abierto hacia rutas/hosts arbitrarios
// (`pathname: '/**'`); (2) `dangerouslyAllowLocalIP` activo en producción = SSRF hacia la red interna
// (Docker, metadatos de la nube); (3) en producción las fotos del CMS darían 400 si el host público del CMS
// no está permitido. Límite: prueba la configuración y el matcher real de Next; la petición en vivo se
// verifica aparte (spec §17). `remotePatterns` se fija al CONSTRUIR la imagen (`next build`).
import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { hasRemoteMatch } from 'next/dist/shared/lib/match-remote-pattern'
import { buildImagesConfig, cmsPublicOrigin } from '../../lib/images/nextImagesConfig.mjs'

type Pattern = { protocol?: string; hostname: string; port?: string; pathname?: string }
const allowed = (env: Record<string, string | undefined>, url: string) =>
  hasRemoteMatch([], buildImagesConfig(env).remotePatterns as Pattern[] as never, new URL(url))

const PROD = { NODE_ENV: 'production', NEXT_PUBLIC_CMS_URL: 'https://cms.unc.edu.py' }
const DEV = { NODE_ENV: 'development' }

describe('producción (negativos primero)', () => {
  it('NO activa dangerouslyAllowLocalIP', () => {
    expect(buildImagesConfig(PROD).dangerouslyAllowLocalIP).not.toBe(true)
    expect(buildImagesConfig({ NODE_ENV: 'production' }).dangerouslyAllowLocalIP).not.toBe(true)
  })

  it('no permite el CMS de desarrollo ni MinIO local', () => {
    expect(allowed(PROD, 'http://localhost:3002/api/media/file/a.jpg')).toBe(false)
    expect(allowed(PROD, 'http://127.0.0.1:3002/api/media/file/a.jpg')).toBe(false)
    expect(allowed(PROD, 'http://localhost:9100/media/a.jpg')).toBe(false)
  })

  it('del CMS público solo admite /api/media/file/** (no la API, el panel ni otro puerto o protocolo)', () => {
    expect(allowed(PROD, 'https://cms.unc.edu.py/api/users/me')).toBe(false)
    expect(allowed(PROD, 'https://cms.unc.edu.py/accesoSeguro')).toBe(false)
    expect(allowed(PROD, 'https://cms.unc.edu.py:8443/api/media/file/a.jpg')).toBe(false)
    expect(allowed(PROD, 'http://cms.unc.edu.py/api/media/file/a.jpg')).toBe(false)
    expect(allowed(PROD, 'https://evil.example/api/media/file/a.jpg')).toBe(false)
  })

  it('WordPress solo /wp-content/uploads/** y sin migracion.unc.edu.py', () => {
    expect(allowed(PROD, 'https://www.unc.edu.py/wp-admin/x.png')).toBe(false)
    expect(allowed(PROD, 'https://migracion.unc.edu.py/x.jpg')).toBe(false)
    expect(allowed(PROD, 'https://www.unc.edu.py/wp-content/uploads/2024/05/a.jpg')).toBe(true)
  })

  it('MEDIA_HOSTNAME inválido (con ruta, puerto o comodín) se ignora', () => {
    for (const bad of ['evil.example/x', 'evil.example:443', '*.example', 'http://x', '']) {
      const cfg = buildImagesConfig({ ...PROD, MEDIA_HOSTNAME: bad })
      expect((cfg.remotePatterns as Pattern[]).some((p) => p.hostname.includes('evil') || p.hostname.includes('*') || p.hostname === 'x')).toBe(false)
    }
  })

  it('permite la foto del CMS público (https, puerto por defecto)', () => {
    expect(allowed(PROD, 'https://cms.unc.edu.py/api/media/file/premio-calidad-conacyt.jpg')).toBe(true)
  })

  it('sin NEXT_PUBLIC_CMS_URL en el build usa el host público canónico del CMS', () => {
    expect(cmsPublicOrigin({ NODE_ENV: 'production' })).toBe('https://cms.unc.edu.py')
    expect(allowed({ NODE_ENV: 'production' }, 'https://cms.unc.edu.py/api/media/file/a.jpg')).toBe(true)
  })

  it('en producción un NEXT_PUBLIC_CMS_URL http o inválido no abre nada', () => {
    expect(cmsPublicOrigin({ NODE_ENV: 'production', NEXT_PUBLIC_CMS_URL: 'http://cms.unc.edu.py' })).toBeNull()
    expect(cmsPublicOrigin({ NODE_ENV: 'production', NEXT_PUBLIC_CMS_URL: 'javascript:alert(1)' })).toBeNull()
    expect(allowed({ NODE_ENV: 'production', NEXT_PUBLIC_CMS_URL: 'http://cms.unc.edu.py' }, 'http://cms.unc.edu.py/api/media/file/a.jpg')).toBe(false)
  })

  it('MEDIA_HOSTNAME válido (S3/CDN) se admite solo por https', () => {
    const env = { ...PROD, MEDIA_HOSTNAME: 'files.unc.edu.py' }
    expect(allowed(env, 'https://files.unc.edu.py/unc-media/a.jpg')).toBe(true)
    expect(allowed(env, 'http://files.unc.edu.py/unc-media/a.jpg')).toBe(false)
  })
})

describe('desarrollo', () => {
  it('activa dangerouslyAllowLocalIP (Next 16 bloquea IP locales: «"url" parameter is not allowed»)', () => {
    expect(buildImagesConfig(DEV).dangerouslyAllowLocalIP).toBe(true)
  })

  it('permite el CMS local solo en /api/media/file/**', () => {
    expect(allowed(DEV, 'http://localhost:3002/api/media/file/a.jpg')).toBe(true)
    expect(allowed(DEV, 'http://127.0.0.1:3002/api/media/file/a.jpg')).toBe(true)
    expect(allowed(DEV, 'http://localhost:3002/api/users/me')).toBe(false)
    expect(allowed(DEV, 'http://localhost:5432/x')).toBe(false)
  })

  it('conserva formatos y calidades actuales', () => {
    const cfg = buildImagesConfig(DEV)
    expect(cfg.formats).toEqual(['image/avif', 'image/webp'])
    expect(cfg.qualities).toEqual([75, 92])
  })
})

describe('cableado', () => {
  const ROOT = path.resolve(__dirname, '..', '..')
  it('next.config.mjs usa el constructor y ya no define remotePatterns a mano', () => {
    const cfg = readFileSync(path.join(ROOT, 'next.config.mjs'), 'utf8')
    expect(cfg).toMatch(/images:\s*buildImagesConfig\(process\.env\)/)
    expect(cfg).not.toMatch(/remotePatterns\s*:/)
  })

  it('la CSP de producción permite el origen público del CMS en img-src y ya no migracion.unc.edu.py', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_CMS_URL', 'https://cms.unc.edu.py')
    try {
      vi.resetModules()
      const { buildCSP } = await import('../../lib/csp')
      const img = buildCSP('n').split(';').map((d) => d.trim()).find((d) => d.startsWith('img-src')) ?? ''
      expect(img.split(/\s+/)).toContain('https://cms.unc.edu.py')
      expect(img).not.toContain('migracion.unc.edu.py')
      expect(img).not.toMatch(/localhost|127\.0\.0\.1/)
    } finally {
      vi.unstubAllEnvs()
    }
  })
})
