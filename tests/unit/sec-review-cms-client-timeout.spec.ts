/**
 * SEC-REVIEW: el timeout de `cmsFetch` debe acotar también la lectura del cuerpo.
 * Amenaza: un CMS que envía cabeceras y luego deja el cuerpo colgado bloquearía el render del portal sin
 * límite, porque el temporizador se cancelaba al recibir las cabeceras. Límite: el fake de fetch imita a
 * undici (el cuerpo rechaza cuando la señal se aborta); no prueba la red real.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { cmsFetch } from '@/lib/cms/client'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

/** Respuesta cuyo `json()` nunca resuelve salvo que la señal se aborte (como un cuerpo colgado real). */
function stalledBodyFetch() {
  return vi.fn((_url: unknown, init?: RequestInit) =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))
        }),
    }),
  )
}

describe('cmsFetch: timeout cubre el cuerpo', () => {
  it('rechaza con CmsError si el cuerpo se cuelga más allá del timeout', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', stalledBodyFetch())
    const p = cmsFetch('/noticias').then(
      () => 'resolved',
      (e: unknown) => (e as Error).name,
    )
    await vi.advanceTimersByTimeAsync(8100)
    expect(await p).toBe('CmsError')
  })

  it('devuelve el JSON normal cuando el cuerpo llega a tiempo', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: 1 }) })))
    await expect(cmsFetch('/noticias')).resolves.toEqual({ ok: 1 })
  })
})
