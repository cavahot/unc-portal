import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { MAX_RETRIES, backoffMs, fetchWithRetry, shouldRetry } from '../../scripts/lib/retry.mjs'

/**
 * PERF-DB (punto 7): reintentos del importador WordPress -> Payload.
 * Amenaza/propósito: un 5xx, un 429 o un corte de red a mitad de una migración de cientos de noticias
 * abortaba o duplicaba trabajo; un 4xx de validación, en cambio, no mejora reintentando y solo
 * enmascararía el error real. Límite: lógica pura con fetch y espera simulados; no prueba el CMS real.
 */

describe('shouldRetry', () => {
  it.each([429, 500, 502, 503, 504])('reintenta el status %i', (s) => {
    expect(shouldRetry(s)).toBe(true)
  })
  it.each([200, 201, 400, 401, 403, 404, 409, 422])('no reintenta el status %i', (s) => {
    expect(shouldRetry(s)).toBe(false)
  })
  it('reintenta un error de red (sin status)', () => {
    expect(shouldRetry(undefined)).toBe(true)
    expect(shouldRetry(null)).toBe(true)
  })
})

describe('backoffMs', () => {
  it('es exponencial: 500 ms, 1 s, 2 s', () => {
    expect([1, 2, 3].map(backoffMs)).toEqual([500, 1000, 2000])
  })
  it('el máximo de reintentos es 3', () => {
    expect(MAX_RETRIES).toBe(3)
  })
})

describe('fetchWithRetry', () => {
  const res = (status: number) => new Response('{}', { status })

  it('reintenta 5xx con backoff y devuelve el primer éxito', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(res(503)).mockResolvedValueOnce(res(502)).mockResolvedValueOnce(res(201))
    const sleeps: number[] = []
    const out = await fetchWithRetry('http://x', {}, { fetchImpl, sleep: async (ms: number) => void sleeps.push(ms) })
    expect(out.status).toBe(201)
    expect(fetchImpl).toHaveBeenCalledTimes(3)
    expect(sleeps).toEqual([500, 1000])
  })

  it('no reintenta un 400 de validación', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(res(400))
    const sleeps: number[] = []
    const out = await fetchWithRetry('http://x', {}, { fetchImpl, sleep: async (ms: number) => void sleeps.push(ms) })
    expect(out.status).toBe(400)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(sleeps).toEqual([])
  })

  it('reintenta errores de red y, agotados los reintentos, devuelve el último 5xx', async () => {
    const fetchImpl = vi.fn().mockRejectedValueOnce(new TypeError('fetch failed')).mockResolvedValue(res(500))
    const out = await fetchWithRetry('http://x', {}, { fetchImpl, sleep: async () => undefined })
    expect(out.status).toBe(500)
    expect(fetchImpl).toHaveBeenCalledTimes(1 + MAX_RETRIES)
  })

  it('si todos los intentos fallan por red, propaga el error', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('fetch failed'))
    await expect(fetchWithRetry('http://x', {}, { fetchImpl, sleep: async () => undefined })).rejects.toThrow('fetch failed')
    expect(fetchImpl).toHaveBeenCalledTimes(1 + MAX_RETRIES)
  })
})

describe('migrate-wordpress.mjs: idempotencia (contrato estático)', () => {
  const src = readFileSync(resolve(process.cwd(), 'scripts/migrate-wordpress.mjs'), 'utf8')
  it('consulta el slug antes de crear y usa reintentos en cmsPost', () => {
    expect(src).toContain('select[id]=true')
    // MIG-WP: la comprobación previa ahora devuelve el estado (findNoticia) para poder reanudar la publicación.
    expect(src.indexOf('await findNoticia(token, slug)')).toBeLessThan(src.indexOf("await cmsPost(token, 'noticias', payload)"))
    expect(src).toContain('fetchWithRetry')
  })
  it('ya no crea noticias con sufijo slug-<ID> tras un conflicto', () => {
    expect(src).not.toContain("cmsPost(token, 'noticias', { ...payload, slug: retrySlug })")
  })
})
