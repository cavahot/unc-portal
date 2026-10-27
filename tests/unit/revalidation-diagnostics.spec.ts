// DEP-19b (diagnóstico): la revalidación CMS -> portal debe decir POR QUÉ falla y HACIA DÓNDE apuntaba.
// Hecho observado (2026-10-23): `apps/cms/.env` tenía PORTAL_URL=http://localhost:3001 y el portal escuchaba
// en :3000; el log solo decía «error de red (TypeError)» sin la causa (ECONNREFUSED) ni el destino.
// Amenaza: un destino mal configurado queda oculto y el contenido publicado no se actualiza en el portal.
// Límite: pruebas de funciones puras y fetch simulado; no prueban la red real ni el endpoint del portal.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  describeFetchFailure,
  resolvePortalBaseUrl,
} from '../../apps/cms/src/utilities/revalidation'

const SECRET = 'S3cr3t-sintetico-de-prueba-0123456789abcdef-XYZ'

describe('resolvePortalBaseUrl', () => {
  it('sin PORTAL_URL usa el valor de desarrollo http://localhost:3000', () => {
    expect(resolvePortalBaseUrl(undefined)).toMatchObject({ ok: true, origin: 'http://localhost:3000' })
    expect(resolvePortalBaseUrl('   ')).toMatchObject({ ok: true, origin: 'http://localhost:3000' })
  })

  it('normaliza barra final y camino sobrante (solo se usa el origen)', () => {
    expect(resolvePortalBaseUrl('https://portal.unc.edu.py/')).toMatchObject({ ok: true, origin: 'https://portal.unc.edu.py' })
    expect(resolvePortalBaseUrl('http://portal:3000/es/algo?x=1')).toMatchObject({ ok: true, origin: 'http://portal:3000' })
  })

  it.each(['ftp://portal', 'javascript:alert(1)', 'portal.local', 'http://', '//portal'])(
    'rechaza un valor que no es http(s) válido: %s',
    (raw) => {
      expect(resolvePortalBaseUrl(raw).ok).toBe(false)
    },
  )

  it('descarta credenciales embebidas para que nunca lleguen a un log', () => {
    const r = resolvePortalBaseUrl('http://usuario:clave@portal:3000')
    expect(r.ok).toBe(true)
    expect(JSON.stringify(r)).not.toContain('clave')
    expect(JSON.stringify(r)).not.toContain('usuario')
  })

  it('expone host:puerto para el log', () => {
    expect(resolvePortalBaseUrl('http://localhost:3001')).toMatchObject({ ok: true, host: 'localhost:3001' })
  })
})

describe('describeFetchFailure', () => {
  it('extrae el código de error.cause (undici)', () => {
    const e = new TypeError('fetch failed', { cause: Object.assign(new Error('x'), { code: 'ECONNREFUSED' }) })
    expect(describeFetchFailure(e)).toBe('ECONNREFUSED')
  })

  it('extrae el código del primer error de un AggregateError (happy eyeballs ::1 / 127.0.0.1)', () => {
    const agg = Object.assign(new AggregateError([Object.assign(new Error('a'), { code: 'ECONNREFUSED' })], 'x'), {})
    expect(describeFetchFailure(new TypeError('fetch failed', { cause: agg }))).toBe('ECONNREFUSED')
  })

  it('ENOTFOUND y timeouts de conexión', () => {
    expect(describeFetchFailure(new TypeError('f', { cause: Object.assign(new Error(), { code: 'ENOTFOUND' }) }))).toBe('ENOTFOUND')
    expect(describeFetchFailure(new TypeError('f', { cause: Object.assign(new Error(), { code: 'UND_ERR_CONNECT_TIMEOUT' }) }))).toBe(
      'UND_ERR_CONNECT_TIMEOUT',
    )
  })

  it('sin causa reconocible devuelve solo el nombre del error', () => {
    expect(describeFetchFailure(new TypeError('fetch failed'))).toBe('TypeError')
  })

  it('ignora códigos con forma rara (no se vuelca texto libre al log)', () => {
    const e = new TypeError('f', { cause: Object.assign(new Error(), { code: 'http://x?token=abc' }) })
    expect(describeFetchFailure(e)).toBe('TypeError')
  })

  it('valores no Error -> desconocido', () => {
    expect(describeFetchFailure('texto')).toBe('desconocido')
  })
})

describe('log de revalidación con causa y destino', () => {
  let errorLog: ReturnType<typeof vi.spyOn>
  let warnLog: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})
    warnLog = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })
  const text = () => [...errorLog.mock.calls, ...warnLog.mock.calls].map((c) => c.map(String).join(' ')).join('\n')

  async function run(portalUrl: string | undefined) {
    vi.resetModules()
    vi.stubEnv('REVALIDATION_SECRET', SECRET)
    vi.stubEnv('PORTAL_URL', portalUrl ?? '')
    const fetchMock = vi.fn(async () => {
      throw new TypeError('fetch failed', { cause: Object.assign(new Error('c'), { code: 'ECONNREFUSED' }) })
    })
    vi.stubGlobal('fetch', fetchMock)
    const m = await import('../../apps/cms/src/utilities/revalidation')
    await m.revalidatePortalTag('facultades', { sleep: async () => {} })
    return fetchMock
  }

  it('nombra la causa (ECONNREFUSED) y el host destino, sin secreto ni URL completa', async () => {
    await run('http://localhost:3001')
    const out = text()
    expect(out).toContain('ECONNREFUSED')
    expect(out).toContain('localhost:3001')
    expect(out).toContain('facultades')
    expect(out).not.toContain(SECRET)
    expect(out).not.toContain('Bearer')
  })

  it('no bloquea ni lanza aunque el destino sea inválido, y no llama a fetch', async () => {
    const fetchMock = await run('ftp://portal')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(text()).toContain('PORTAL_URL')
  })

  it('la función nunca lanza ante fallos de red (el guardado del editor no se bloquea)', async () => {
    await expect(run('http://localhost:3001')).resolves.toBeDefined()
  })
})
