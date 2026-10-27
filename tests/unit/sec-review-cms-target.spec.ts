// SEC-REVIEW: guardia de destino y credenciales de los guiones de la raíz (migrate-wordpress, patch-missing-images).
// Amenazas: (1) `--cms=<url>` apuntando a un host ajeno enviaría el correo/contraseña del CMS a un tercero o
// escribiría en producción por error; (2) un correo de administrador por defecto en el repo; (3) descargar
// imágenes/páginas de hosts arbitrarios (SSRF) o seguir redirecciones hacia ellos.
// Límite: pruebas de funciones puras con `fetch` simulado; no tocan red ni CMS. Los mensajes no incluyen secretos.
import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  fetchAllowedHost,
  isAllowedSourceUrl,
  isLocalCmsUrl,
  requireCmsEmail,
  resolveCmsTarget,
  // @ts-expect-error módulo .mjs sin tipos
} from '../../scripts/lib/cmsTarget.mjs'

describe('resolveCmsTarget', () => {
  it('acepta localhost, 127.0.0.1 y [::1] sin flag', () => {
    expect(resolveCmsTarget({ url: 'http://localhost:3002/' })).toBe('http://localhost:3002')
    expect(resolveCmsTarget({ url: 'http://127.0.0.1:3002' })).toBe('http://127.0.0.1:3002')
    expect(resolveCmsTarget({ url: 'http://[::1]:3002' })).toBe('http://[::1]:3002')
    expect(isLocalCmsUrl('http://localhost:3002')).toBe(true)
  })
  it('rechaza http remoto aun con --allow-remote', () => {
    expect(() => resolveCmsTarget({ url: 'http://cms.example.org', allowRemote: true })).toThrow(/https/)
  })
  it('rechaza https remoto sin --allow-remote', () => {
    expect(() => resolveCmsTarget({ url: 'https://cms.example.org' })).toThrow(/--allow-remote/)
  })
  it('acepta https remoto con --allow-remote', () => {
    expect(resolveCmsTarget({ url: 'https://cms.example.org/', allowRemote: true })).toBe('https://cms.example.org')
  })
  it('rechaza una URL inválida', () => {
    expect(() => resolveCmsTarget({ url: 'no-es-url', allowRemote: true })).toThrow()
  })
})

describe('requireCmsEmail', () => {
  it('rechaza si falta', () => {
    expect(() => requireCmsEmail({})).toThrow(/CMS_EMAIL/)
    expect(() => requireCmsEmail({ CMS_EMAIL: '   ' })).toThrow(/CMS_EMAIL/)
  })
  it('devuelve el correo recortado', () => {
    expect(requireCmsEmail({ CMS_EMAIL: ' a@b.test ' })).toBe('a@b.test')
  })
})

describe('isAllowedSourceUrl / fetchAllowedHost', () => {
  it('solo https en unc.edu.py y www.unc.edu.py', () => {
    expect(isAllowedSourceUrl('https://www.unc.edu.py/x.jpg')).toBe(true)
    expect(isAllowedSourceUrl('https://unc.edu.py/x.jpg')).toBe(true)
    expect(isAllowedSourceUrl('http://www.unc.edu.py/x.jpg')).toBe(false)
    expect(isAllowedSourceUrl('https://evil.example.org/x.jpg')).toBe(false)
    expect(isAllowedSourceUrl('https://unc.edu.py.evil.org/x')).toBe(false)
  })
  it('no consulta un host no permitido', async () => {
    const f = vi.fn()
    await expect(fetchAllowedHost('https://evil.example.org/', {}, f)).rejects.toThrow(/no permitido/)
    expect(f).not.toHaveBeenCalled()
  })
  it('no sigue una redirección hacia otro host', async () => {
    const f = vi.fn(async () => new Response(null, { status: 302, headers: { location: 'https://evil.example.org/y' } }))
    await expect(fetchAllowedHost('https://www.unc.edu.py/a', {}, f)).rejects.toThrow(/no permitido/)
    expect(f).toHaveBeenCalledTimes(1)
  })
  it('sigue una redirección dentro del allowlist', async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 301, headers: { location: 'https://unc.edu.py/b' } }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }))
    const res = await fetchAllowedHost('https://www.unc.edu.py/a', {}, f)
    expect(res.status).toBe(200)
    expect(f.mock.calls[0][1]).toMatchObject({ redirect: 'manual' })
  })
})

describe('los guiones usan la guardia y no llevan correo por defecto', () => {
  for (const file of ['migrate-wordpress.mjs', 'patch-missing-images.mjs']) {
    const src = readFileSync(`scripts/${file}`, 'utf8')
    it(`${file}: importa cmsTarget, sin admin@unc.edu.py`, () => {
      expect(src).toContain("./lib/cmsTarget.mjs")
      expect(src).toContain('resolveCmsTarget')
      expect(src).toContain('requireCmsEmail')
      expect(src).not.toContain('admin@unc.edu.py')
    })
  }
  it('patch-missing-images restringe las descargas al allowlist', () => {
    const src = readFileSync('scripts/patch-missing-images.mjs', 'utf8')
    expect(src).toContain('fetchAllowedHost')
    expect(src).toContain('isAllowedSourceUrl')
  })
})
