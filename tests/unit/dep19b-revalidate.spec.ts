// DEP-19b (Frente 7): revalidación CMS -> portal con timeout, reintentos acotados y log sin secretos.
// Amenaza: un `fetch` sin timeout bloquea el guardado del editor; un 401/429/503 tragado en silencio deja
// el portal con contenido viejo sin rastro; `Bearer ` vacío o un secreto débil se envían igualmente.
// Límite: fetch simulado; no prueba el endpoint real del portal ni la red entre contenedores.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

// CNV-01: Convenios importa el hook de auditoría, que a su vez carga la configuración de Payload (exige
// DATABASE_URI). Aquí solo se prueba la revalidación: la auditoría se simula (la cubre convenios-cms.spec.ts).
vi.mock('../../apps/cms/src/utilities/audit', () => ({ logAudit: vi.fn(), getClientIP: () => 'x' }))

const ROOT = path.resolve(__dirname, '..', '..')
const SECRET = 'S3cr3t-sintetico-de-prueba-0123456789abcdef-XYZ'
const PORTAL = 'https://portal.test.local'

type Call = { url: string; init: any }
let calls: Call[]
let errorLog: ReturnType<typeof vi.spyOn>
let warnLog: ReturnType<typeof vi.spyOn>
let sleeps: number[]
const sleep = async (ms: number) => {
  sleeps.push(ms)
}

type Step = { status: number; headers?: Record<string, string> } | 'timeout' | 'network'

/** Cada llamada a fetch consume el siguiente paso; el último se repite. */
function stubFetch(steps: Step[]) {
  calls = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: any) => {
      const step = steps[Math.min(calls.length, steps.length - 1)]
      calls.push({ url: String(url), init })
      if (step === 'timeout') throw Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' })
      if (step === 'network') throw new TypeError('fetch failed')
      return new Response(JSON.stringify({}), { status: step.status, headers: step.headers })
    }),
  )
}

async function load(env: Record<string, string | undefined> = { REVALIDATION_SECRET: SECRET }) {
  vi.resetModules()
  vi.stubEnv('PORTAL_URL', PORTAL)
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v ?? '')
  return import('../../apps/cms/src/utilities/revalidation')
}

const logged = () =>
  [...errorLog.mock.calls, ...warnLog.mock.calls].map((c) => c.map(String).join(' ')).join('\n')

beforeEach(() => {
  sleeps = []
  errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})
  warnLog = vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('secreto ausente o débil: 0 llamadas', () => {
  it.each([
    ['vacío', ''],
    ['solo espacios', '    '],
    ['ejemplo', 'changeme-changeme-changeme-changeme-1234'],
    ['corto', 'abc123'],
  ])('%s', async (_n, secret) => {
    stubFetch([{ status: 200 }])
    const m = await load({ REVALIDATION_SECRET: secret })
    await m.revalidatePortalTag('convenios', { sleep })
    expect(calls).toHaveLength(0)
    expect(logged()).toContain('REVALIDATION_SECRET')
    expect(logged()).not.toContain(secret.trim() || '\u0000')
  })

  it('el aviso se emite una sola vez por proceso', async () => {
    stubFetch([{ status: 200 }])
    const m = await load({ REVALIDATION_SECRET: '' })
    await m.revalidatePortalTag('convenios', { sleep })
    await m.revalidatePortalTag('noticias', { sleep })
    await m.revalidatePortalPath('/es', { sleep })
    const secretLogs = errorLog.mock.calls.filter((c) => String(c[0]).includes('REVALIDATION_SECRET'))
    expect(secretLogs).toHaveLength(1)
  })
})

describe('éxito', () => {
  it('200 -> 1 llamada con signal de timeout, Bearer y cuerpo JSON', async () => {
    stubFetch([{ status: 200 }])
    const m = await load()
    await m.revalidatePortalTag('convenios', { sleep })
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe(`${PORTAL}/api/revalidate`)
    expect(calls[0].init.method).toBe('POST')
    expect(calls[0].init.signal).toBeInstanceOf(AbortSignal)
    expect(new Headers(calls[0].init.headers).get('Authorization')).toBe(`Bearer ${SECRET}`)
    expect(JSON.parse(calls[0].init.body)).toEqual({ tag: 'convenios' })
    expect(errorLog).not.toHaveBeenCalled()
    expect(sleeps).toHaveLength(0)
  })

  it('revalidatePortalPath envía { path }', async () => {
    stubFetch([{ status: 200 }])
    const m = await load()
    await m.revalidatePortalPath('/es', { sleep })
    expect(JSON.parse(calls[0].init.body)).toEqual({ path: '/es' })
  })
})

describe('fallos: reintentos acotados, log con status, nunca lanza', () => {
  it('timeout en todos los intentos -> 3 llamadas, log final, no lanza', async () => {
    stubFetch(['timeout'])
    const m = await load()
    await expect(m.revalidatePortalTag('tribunal-miembros', { sleep })).resolves.toBeUndefined()
    expect(calls).toHaveLength(3)
    expect(sleeps).toHaveLength(2)
    expect(errorLog).toHaveBeenCalled()
    expect(logged()).toContain('tribunal-miembros')
    expect(logged().toLowerCase()).toContain('timeout')
  })

  it('error de red -> 3 llamadas y log', async () => {
    stubFetch(['network'])
    const m = await load()
    await m.revalidatePortalTag('convenios', { sleep })
    expect(calls).toHaveLength(3)
    expect(errorLog).toHaveBeenCalled()
  })

  it('401 -> 1 llamada, sin reintento, log con status 401', async () => {
    stubFetch([{ status: 401 }])
    const m = await load()
    await m.revalidatePortalTag('convenios', { sleep })
    expect(calls).toHaveLength(1)
    expect(sleeps).toHaveLength(0)
    expect(logged()).toContain('401')
    expect(logged()).toContain('convenios')
  })

  it('400 (etiqueta no permitida) tampoco se reintenta', async () => {
    stubFetch([{ status: 400 }])
    const m = await load()
    await m.revalidatePortalTag('x', { sleep })
    expect(calls).toHaveLength(1)
    expect(logged()).toContain('400')
  })

  it('429 con Retry-After: 1 -> espera 1000 ms y reintenta; luego 200', async () => {
    stubFetch([{ status: 429, headers: { 'Retry-After': '1' } }, { status: 200 }])
    const m = await load()
    await m.revalidatePortalTag('convenios', { sleep })
    expect(calls).toHaveLength(2)
    expect(sleeps).toEqual([1000])
  })

  it('Retry-After enorme se limita a 2000 ms', async () => {
    stubFetch([{ status: 429, headers: { 'Retry-After': '3600' } }, { status: 200 }])
    const m = await load()
    await m.revalidatePortalTag('convenios', { sleep })
    expect(sleeps).toEqual([2000])
  })

  it('503 y luego 200 -> 2 llamadas y sin log de error', async () => {
    stubFetch([{ status: 503 }, { status: 200 }])
    const m = await load()
    await m.revalidatePortalTag('convenios', { sleep })
    expect(calls).toHaveLength(2)
    expect(errorLog).not.toHaveBeenCalled()
  })

  it('503 persistente -> 3 llamadas y log final con status 503', async () => {
    stubFetch([{ status: 503 }])
    const m = await load()
    await m.revalidatePortalTag('convenios', { sleep })
    expect(calls).toHaveLength(3)
    expect(logged()).toContain('503')
  })

  it('el log nunca contiene el secreto, el Authorization ni el cuerpo', async () => {
    stubFetch([{ status: 401 }])
    const m = await load()
    await m.revalidatePortalPath('/ruta-privada-123', { collection: 'paginas', sleep })
    const text = logged()
    expect(text).not.toContain(SECRET)
    expect(text).not.toContain('Bearer')
    expect(text).not.toContain('ruta-privada-123')
    expect(text).toContain('paginas')
  })
})

describe('hooks: el guardado del editor no depende del portal', () => {
  it.each([
    ['Convenios', 'convenios'],
    ['TribunalDocumentos', 'tribunal-documentos'],
    ['TribunalMiembros', 'tribunal-miembros'],
  ])('%s.afterChange resuelve sin lanzar aunque fetch lance', async (file, tag) => {
    stubFetch(['network'])
    vi.resetModules()
    vi.stubEnv('PORTAL_URL', PORTAL)
    vi.stubEnv('REVALIDATION_SECRET', SECRET)
    // Importadores estáticos (Vite no admite rutas dinámicas sin extensión).
    const loaders: Record<string, () => Promise<any>> = {
      Convenios: () => import('../../apps/cms/src/collections/Convenios'),
      TribunalDocumentos: () => import('../../apps/cms/src/collections/TribunalDocumentos'),
      TribunalMiembros: () => import('../../apps/cms/src/collections/TribunalMiembros'),
    }
    const mod = await loaders[file]()
    // CNV-01: Convenios antepone el hook de auditoría; el de revalidación es siempre el último.
    const hook = mod.default.hooks.afterChange.at(-1)
    await expect(hook({ doc: {}, req: {}, operation: 'update' })).resolves.not.toThrow()
    expect(calls.length).toBeGreaterThan(0)
    expect(JSON.parse(calls[0].init.body)).toEqual({ tag })
  }, 15000)

  it.each(['Convenios', 'TribunalDocumentos', 'TribunalMiembros'])('%s no contiene fetch( propio (estático)', (file) => {
    const src = readFileSync(path.join(ROOT, 'apps/cms/src/collections', `${file}.ts`), 'utf8')
    expect(src).not.toMatch(/\bfetch\(/)
    expect(src).toContain('revalidatePortalTag')
  })

  it('Paginas envía paginas-slugs (la etiqueta que consume getPageSlugs), no paginas:list', () => {
    const src = readFileSync(path.join(ROOT, 'apps/cms/src/collections/Paginas.ts'), 'utf8')
    expect(src).not.toContain('paginas:list')
    expect(src).toContain("'paginas-slugs'")
  })
})

describe('endpoint del portal acepta las etiquetas de Páginas (estático)', () => {
  it('permite paginas-slugs y paginas:<slug>', () => {
    const src = readFileSync(path.join(ROOT, 'app/api/revalidate/route.ts'), 'utf8')
    expect(src).toContain("'paginas-slugs'")
    expect(src).toMatch(/paginas:/)
  })
})
