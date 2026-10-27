// AUT-01: la página /autoridades debe leer del CMS (fuente de verdad) y no de una lista fija en el código.
// Amenazas: (1) mostrar personas obsoletas escritas a mano (dato institucional desactualizado); (2) que una
// caída del CMS rompa la página; (3) iniciales/orden incorrectos; (4) rutas de foto/CV sin resolver.
// Límite: se simula `fetch`; no se ejecuta Payload ni Postgres (la verificación en vivo se hizo aparte).
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getInitials, groupAuthorities, mapAuthorities } from '@/lib/cms/authorities'
import { getAuthoritySections } from '@/lib/cms/queries/autoridades'

const ROOT = path.resolve(__dirname, '..', '..')

function stubFetch(body: unknown, status = 200) {
  const calls: { url: URL; init?: RequestInit }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      calls.push({ url: new URL(href), init })
      return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
    }),
  )
  return calls
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const doc = (over: Record<string, unknown> = {}) => ({
  id: 1,
  name: 'Prof. Dr. Ana Pérez',
  role: 'Rectora',
  type: 'rector',
  order: 1,
  active: true,
  ...over,
})

describe('getInitials', () => {
  it('ignora TODOS los títulos iniciales (antes «Prof. Dr. Clarito Rojas» daba «DC»)', () => {
    expect(getInitials('Prof. Dr. Clarito Rojas Marín')).toBe('CR')
    expect(getInitials('Prof. Ing. Agr. Derlys Fernando López Avalos')).toBe('DF')
    expect(getInitials('Prof. Mg. Gerardo Lang Ferri')).toBe('GL')
    expect(getInitials('Prof. Dra. María Concepción Araujo De Benítez')).toBe('MC')
    expect(getInitials('dr. juan perez')).toBe('JP')
  })
  it('sin títulos usa las dos primeras palabras; nombres raros no rompen', () => {
    expect(getInitials('Ana Pérez')).toBe('AP')
    expect(getInitials('Ana')).toBe('A')
    expect(getInitials('')).toBe('')
    expect(getInitials('Prof. Dr.')).toBe('')
  })
})

describe('mapAuthorities', () => {
  it('convierte el documento del CMS a Authority con las URLs de foto y CV resueltas', () => {
    const [a] = mapAuthorities(
      [
        doc({
          faculty: { id: 3, nombre: 'Facultad de Medicina', slug: 'facultad-de-medicina' },
          photo: { url: '/api/media/file/a.jpg', alt: 'Foto', blurDataURL: 'data:image/webp;base64,AAA' },
          cvFile: { url: '/api/media/file/cv.pdf' },
          bio: 'Bio',
          email: 'a@example.invalid',
        }),
      ],
      (u) => (typeof u === 'string' ? `https://cms.example.test${u}` : null),
    )
    expect(a).toMatchObject({
      id: 1,
      name: 'Prof. Dr. Ana Pérez',
      role: 'Rectora',
      type: 'rector',
      faculty: 'Facultad de Medicina',
      photoUrl: 'https://cms.example.test/api/media/file/a.jpg',
      photoAlt: 'Foto',
      photoBlur: 'data:image/webp;base64,AAA',
      cvUrl: 'https://cms.example.test/api/media/file/cv.pdf',
      bio: 'Bio',
      email: 'a@example.invalid',
      order: 1,
    })
  })

  it('sin foto deja photoUrl nulo (la página mostrará las iniciales); URL de foto no válida también', () => {
    const resolve = (u: unknown) => (typeof u === 'string' && u.startsWith('/api/media/file/') ? `https://c${u}` : null)
    const [a, b] = mapAuthorities([doc({ id: 1 }), doc({ id: 2, photo: { url: 'javascript:alert(1)' } })], resolve)
    expect(a.photoUrl).toBeNull()
    expect(b.photoUrl).toBeNull()
  })

  it('cvUrl externo se conserva cuando no hay archivo; el archivo gana al enlace', () => {
    const resolve = (u: unknown) => (typeof u === 'string' ? `https://c${u}` : null)
    const [a, b] = mapAuthorities(
      [doc({ id: 1, cvUrl: 'https://example.test/cv.pdf' }), doc({ id: 2, cvUrl: 'https://example.test/cv.pdf', cvFile: { url: '/api/media/file/x.pdf' } })],
      resolve,
    )
    expect(a.cvUrl).toBe('https://example.test/cv.pdf')
    expect(b.cvUrl).toBe('https://c/api/media/file/x.pdf')
  })

  it('facultad solo como ID (depth 0) no inventa un nombre', () => {
    const [a] = mapAuthorities([doc({ type: 'decano', faculty: 5 })], () => null)
    expect(a.faculty).toBeNull()
  })

  it('descarta filas inactivas, sin nombre/cargo o con tipo desconocido', () => {
    const rows = mapAuthorities(
      [doc({ id: 1 }), doc({ id: 2, active: false }), doc({ id: 3, name: '' }), doc({ id: 4, role: undefined }), doc({ id: 5, type: 'hacker' })],
      () => null,
    )
    expect(rows.map((r) => r.id)).toEqual([1])
  })

  it('ordena por `order` (sin orden = al final), luego rector antes que vicerrector, luego nombre', () => {
    const rows = mapAuthorities(
      [
        doc({ id: 1, name: 'Zeta', type: 'vicerrector', order: 2 }),
        doc({ id: 2, name: 'Beta', type: 'decano', order: undefined }),
        doc({ id: 3, name: 'Alfa', type: 'decano', order: 11 }),
        doc({ id: 4, name: 'Rector', type: 'rector', order: 2 }),
        doc({ id: 5, name: 'Aaa', type: 'decano', order: 11 }),
      ],
      () => null,
    )
    expect(rows.map((r) => r.id)).toEqual([4, 1, 5, 3, 2])
  })
})

describe('groupAuthorities', () => {
  it('separa rectorado, decanos y otras autoridades conservando el orden', () => {
    const list = mapAuthorities(
      [
        doc({ id: 1, type: 'vicerrector', order: 2 }),
        doc({ id: 2, type: 'rector', order: 1 }),
        doc({ id: 3, type: 'decano', order: 10 }),
        doc({ id: 4, type: 'secretario', order: 30 }),
        doc({ id: 5, type: 'director', order: 31 }),
      ],
      () => null,
    )
    const g = groupAuthorities(list)
    expect(g.leaders.map((a) => a.id)).toEqual([2, 1])
    expect(g.deans.map((a) => a.id)).toEqual([3])
    expect(g.others.map((a) => a.id)).toEqual([4, 5])
  })
})

describe('getAuthoritySections', () => {
  it('pide solo activos, ordenados, con tags, campos mínimos y poblado acotado (sin traer la media entera)', async () => {
    const calls = stubFetch({ docs: [] })
    await getAuthoritySections()
    const sp = calls[0].url.searchParams
    expect(calls[0].url.pathname).toBe('/api/autoridades')
    expect(sp.get('where[active][equals]')).toBe('true')
    expect(sp.get('sort')).toBe('order')
    expect(Number(sp.get('limit'))).toBeLessThanOrEqual(100)
    expect(sp.get('depth')).toBe('1')
    for (const f of ['name', 'role', 'type', 'faculty', 'photo', 'cvFile', 'cvUrl', 'bio', 'email', 'order']) {
      expect(sp.get(`select[${f}]`), f).toBe('true')
    }
    expect(sp.get('populate[media][url]')).toBe('true')
    expect(sp.get('populate[media][blurDataURL]')).toBe('true')
    // `url` se calcula desde `filename`: sin él, Payload devuelve url null (hallazgo en vivo AUT-01).
    expect(sp.get('populate[media][filename]')).toBe('true')
    expect(sp.get('populate[media][sizes]')).toBeNull()
    expect(sp.get('populate[facultades][nombre]')).toBe('true')
    const next = (calls[0].init as { next?: { tags?: string[]; revalidate?: number } }).next
    expect(next?.tags).toEqual(['autoridades', 'facultades'])
    expect(next?.revalidate).toBeGreaterThan(0)
  })

  it('con filas del CMS -> status ok y secciones; el CMS manda', async () => {
    stubFetch({
      docs: [
        doc({ id: 7, name: 'Prof. Dr. Nombre Cambiado', role: 'Rector', type: 'rector', order: 1 }),
        doc({ id: 8, name: 'Decana X', role: 'Decana', type: 'decano', order: 10, faculty: { id: 1, nombre: 'Facultad de Medicina', slug: 'm' } }),
      ],
    })
    const r = await getAuthoritySections()
    expect(r.status).toBe('ok')
    if (r.status !== 'ok') return
    expect(r.sections.leaders.map((a) => a.name)).toEqual(['Prof. Dr. Nombre Cambiado'])
    expect(r.sections.deans[0].faculty).toBe('Facultad de Medicina')
  })

  it('CMS alcanzable con 0 filas activas -> status empty (NUNCA personas de respaldo)', async () => {
    stubFetch({ docs: [] })
    const r = await getAuthoritySections()
    expect(r).toEqual({ status: 'empty' })
  })

  it('CMS con filas pero ninguna válida -> empty', async () => {
    stubFetch({ docs: [doc({ type: 'hacker' })] })
    expect((await getAuthoritySections()).status).toBe('empty')
  })

  it('CMS caído (red) o 5xx -> status unavailable, sin lanzar', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed') }))
    expect(await getAuthoritySections()).toEqual({ status: 'unavailable' })
    vi.unstubAllGlobals()
    stubFetch({ message: 'x' }, 500)
    expect(await getAuthoritySections()).toEqual({ status: 'unavailable' })
  })

  it('respuesta sin `docs` (forma inesperada) -> unavailable', async () => {
    stubFetch({})
    expect(await getAuthoritySections()).toEqual({ status: 'unavailable' })
  })
})

describe('la página ya no lleva personas escritas a mano', () => {
  const page = readFileSync(path.join(ROOT, 'app', '[locale]', 'autoridades', 'page.tsx'), 'utf8')
  it('no contiene la lista estática ni nombres de autoridades', () => {
    expect(page).not.toMatch(/STATIC_AUTHORITIES/)
    for (const n of ['Clarito', 'Rojas Marín', 'Ferreira Cabañas', 'Lima De León', 'Mello Román']) {
      expect(page, n).not.toContain(n)
    }
  })
  it('usa getAuthoritySections y no define su propio getInitials', () => {
    expect(page).toMatch(/getAuthoritySections/)
    expect(page).not.toMatch(/function getInitials/)
  })
})
