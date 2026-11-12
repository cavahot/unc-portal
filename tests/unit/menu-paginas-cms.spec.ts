// MENU-CMS-01: páginas del CMS dentro del megamenú (tarea: rediseño del portal, recorrido «crear página → menú»).
// Qué comprueba: (1) la siembra del menú actual en Navegación (idempotente, sin pisar ediciones); (2) que Navegación
//   rechace enlaces a páginas sin publicar o sin página; (3) que publicar, despublicar, borrar o cambiar el slug de una
//   página invalide la caché `navegacion`; (4) que el portal omita los enlaces sin destino en lugar de mostrar «#».
// Por qué: recorrido real (2026-11-09) mostró que (a) con UN enlace en Navegación se pierde todo el menú, (b) un enlace a una
//   página en borrador se dibuja como «#», (c) cambiar el slug no actualizaba el menú.
// Amenazas: menú público roto o vacío por una edición; enlaces muertos; menú desactualizado tras un cambio de ruta.
// Límite: pruebas con `req` y CMS simulados; la siembra real contra el CMS local se verifica aparte.
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('payload', () => ({
  getPayload: async () => ({ findByID: vi.fn() }),
  APIError: class APIError extends Error {
    status: number
    constructor(message: string, status = 500) {
      super(message)
      this.status = status
    }
  },
}))
vi.mock('../../apps/cms/src/payload.config', () => ({ default: {} }))
vi.mock('../../apps/cms/src/utilities/audit', () => ({
  logAudit: vi.fn(),
  getClientIP: vi.fn(() => '127.0.0.1'),
  extractChanges: vi.fn(() => ({})),
}))
vi.mock('../../apps/cms/src/utilities/notifications', () => ({ notifyApprovalStateChange: vi.fn(), notifyN8N: vi.fn() }))
vi.mock('../../apps/cms/src/hooks/editorial/afterTransition', () => ({
  auditEditorialChange: vi.fn(),
  notifyEditorialChange: vi.fn(),
}))
const { revalidatePortalTag } = vi.hoisted(() => ({ revalidatePortalTag: vi.fn() }))
vi.mock('../../apps/cms/src/utilities/revalidation', () => ({ revalidatePortalTag }))

import { Paginas } from '../../apps/cms/src/collections/Paginas'
import { Navegacion } from '../../apps/cms/src/globals/Navegacion'
import { validateNavegacionLinks } from '../../apps/cms/src/utilities/navegacionValidation'
import { FALLBACK_NAVIGATION } from '../../lib/cms/queries/navigation'
import { mapCmsNavigation } from '../../lib/cms/navegacion'
// @ts-expect-error módulo .mjs sin tipos
import { NAVEGACION_SEED, run } from '../../scripts/seed-navegacion.mjs'

type AnyFn = (args: any) => any

/* ───────────── 1. Siembra del menú actual ───────────── */

function fakeCms(initialLinks: unknown[] = []) {
  let links = initialLinks
  const calls: Array<{ method: string; path: string; body?: any }> = []
  const json = (body: unknown, status = 200) =>
    Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
  const fetch = async (url: string, init: { method?: string; body?: string } = {}) => {
    const method = init.method ?? 'GET'
    const u = new URL(url)
    calls.push({ method, path: u.pathname, body: init.body ? JSON.parse(init.body) : undefined })
    if (u.pathname === '/api/users/login') return json({ token: 'tok' })
    if (u.pathname === '/api/globals/navegacion') {
      if (method === 'GET') return json({ links })
      links = JSON.parse(init.body as string).links
      return json({ result: { links } })
    }
    return json({}, 404)
  }
  return { fetch, calls, current: () => links }
}
const env = { CMS_URL: 'http://localhost:3002', CMS_EMAIL: 'admin@example.test', CMS_PASSWORD: 'una-clave-sintetica-larga' }
const quiet = () => {}

describe('siembra del menú actual en Navegación', () => {
  it('coincide con el menú de respaldo del portal (misma estructura, etiquetas y destinos)', () => {
    const simple = (l: any) => ({ label: l.label, url: l.url, children: (l.children ?? []).map((c: any) => ({ label: c.label, url: c.url })) })
    expect(NAVEGACION_SEED.map(simple)).toEqual((FALLBACK_NAVIGATION.links ?? []).map(simple))
    expect(NAVEGACION_SEED.every((l: any) => l.type === 'manual')).toBe(true)
    expect(NAVEGACION_SEED.length).toBeLessThanOrEqual(12) // maxRows del global
  })

  // MENU-CMS-02: la prueba de punta a punta contra el CMS local (2026-11-09) mostró que la siembra NUNCA se podía guardar:
  // «Institucional» tiene 15 subenlaces y el global admitía 12 (HTTP 400). La prueba anterior solo miraba el primer nivel.
  it('respeta los límites del global en los dos niveles (leídos de la configuración, no copiados)', () => {
    const links = Navegacion.fields.find((f: any) => f.name === 'links') as any
    const children = links.fields.find((f: any) => f.name === 'children')
    expect(NAVEGACION_SEED.length).toBeLessThanOrEqual(links.maxRows)
    for (const l of NAVEGACION_SEED) {
      expect((l.children ?? []).length, l.label).toBeLessThanOrEqual(children.maxRows)
    }
  })

  it('dry-run: no llama a la red', async () => {
    const cms = fakeCms()
    const r = await run({ apply: false, deps: { env, fetch: cms.fetch, log: quiet } })
    expect(r.dryRun).toBe(true)
    expect(cms.calls).toHaveLength(0)
  })

  it('con Navegación vacía escribe el menú completo una sola vez', async () => {
    const cms = fakeCms([])
    const r = await run({ apply: true, deps: { env, fetch: cms.fetch, log: quiet } })
    expect(r.counts).toMatchObject({ creados: 1, omitidos: 0, errores: 0 })
    expect(cms.calls.filter((c) => c.method === 'POST' && c.path === '/api/globals/navegacion')).toHaveLength(1)
    expect(cms.current()).toHaveLength(NAVEGACION_SEED.length)
  })

  it('con Navegación ya editada NO la pisa', async () => {
    const editada = [{ label: 'Menú editado por la institución', type: 'manual', url: '/x' }]
    const cms = fakeCms(editada)
    const r = await run({ apply: true, deps: { env, fetch: cms.fetch, log: quiet } })
    expect(r.counts).toMatchObject({ creados: 0, omitidos: 1, errores: 0 })
    expect(cms.calls.some((c) => c.method === 'POST' && c.path === '/api/globals/navegacion')).toBe(false)
    expect(cms.current()).toEqual(editada)
  })

  it('un CMS remoto exige --allow-remote (misma política que las demás siembras)', async () => {
    const cms = fakeCms()
    await expect(
      run({ apply: true, deps: { env: { ...env, CMS_URL: 'https://cms.example.test' }, fetch: cms.fetch, log: quiet } }),
    ).rejects.toThrow(/--allow-remote/)
  })
})

/* ───────────── 2. Validación de enlaces a páginas ───────────── */

const lookupOf = (pages: Record<number, { _status: string } | null>) => async (id: number) => pages[id] ?? null

describe('validateNavegacionLinks', () => {
  it('rechaza un enlace a una página en borrador y nombra el enlace', async () => {
    const r = await validateNavegacionLinks(
      [{ label: 'Prueba', type: 'relationship', page: 1 }],
      lookupOf({ 1: { _status: 'draft' } }),
    )
    expect(r).toMatch(/Prueba/)
    expect(r).toMatch(/publicad/i)
  })

  it('acepta un enlace a una página publicada (id o documento con _status)', async () => {
    const lookup = lookupOf({ 1: { _status: 'published' } })
    expect(await validateNavegacionLinks([{ label: 'A', type: 'relationship', page: 1 }], lookup)).toBe(true)
    expect(
      await validateNavegacionLinks([{ label: 'B', type: 'relationship', page: { id: 1, _status: 'published' } }], lookup),
    ).toBe(true)
  })

  it('rechaza un enlace «Relación» sin página y una página que no existe', async () => {
    expect(await validateNavegacionLinks([{ label: 'Sin', type: 'relationship' }], lookupOf({}))).toMatch(/Sin/)
    expect(await validateNavegacionLinks([{ label: 'Fantasma', type: 'relationship', page: 99 }], lookupOf({}))).toMatch(/Fantasma/)
  })

  it('revisa también los hijos y deja pasar los enlaces manuales', async () => {
    const lookup = lookupOf({ 2: { _status: 'draft' } })
    const links = [
      { label: 'Grupo', type: 'manual', url: '#', children: [{ label: 'Hijo', type: 'relationship', page: 2 }] },
      { label: 'Fuera', type: 'manual', url: 'https://example.test' },
    ]
    expect(await validateNavegacionLinks(links, lookup)).toMatch(/Hijo/)
    expect(await validateNavegacionLinks([links[1]], lookup)).toBe(true)
  })

  it('Navegación aplica la validación antes de guardar', async () => {
    const hook = (Navegacion.hooks?.beforeValidate ?? [])[0] as AnyFn
    expect(typeof hook).toBe('function')
    const req = { payload: { findByID: vi.fn(async () => ({ id: 1, _status: 'draft' })) } }
    // Debe ser un error PÚBLICO 400 (con un Error común Payload responde 500 «Something went wrong» y el editor no ve el motivo).
    const err = await hook({ data: { links: [{ label: 'Prueba', type: 'relationship', page: 1 }] }, req }).catch((e: any) => e)
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toMatch(/Prueba/)
    expect(err.status).toBe(400)
    const ok = { links: [{ label: 'Inicio', type: 'manual', url: '/' }] }
    expect(await hook({ data: ok, req })).toBe(ok)
  })
})

/* ───────────── 3. Invalidar la caché del menú al cambiar una página ───────────── */

const afterChange = (Paginas.hooks?.afterChange ?? [])[0] as AnyFn
const afterDelete = (Paginas.hooks?.afterDelete ?? [])[0] as AnyFn
const req = { user: { id: 1, role: 'superadmin', email: 'a@unc.test' } }
const calledTags = () => revalidatePortalTag.mock.calls.map((c) => c[0])

describe('Páginas invalidan la caché del menú', () => {
  beforeEach(() => revalidatePortalTag.mockClear())

  it('al publicar', async () => {
    await afterChange({
      doc: { slug: 'a', _status: 'published' },
      previousDoc: { slug: 'a', _status: 'draft' },
      req,
      operation: 'update',
    })
    expect(calledTags()).toContain('navegacion')
  })

  it('al despublicar', async () => {
    await afterChange({
      doc: { slug: 'a', _status: 'draft' },
      previousDoc: { slug: 'a', _status: 'published' },
      req,
      operation: 'update',
    })
    expect(calledTags()).toContain('navegacion')
  })

  it('al cambiar el slug de una página publicada', async () => {
    await afterChange({
      doc: { slug: 'nuevo', _status: 'published' },
      previousDoc: { slug: 'viejo', _status: 'published' },
      req,
      operation: 'update',
    })
    expect(calledTags()).toContain('navegacion')
    expect(calledTags()).toContain('paginas:viejo')
  })

  it('un guardado de borrador que no cambia el estado ni el slug NO la invalida', async () => {
    await afterChange({
      doc: { slug: 'a', _status: 'draft' },
      previousDoc: { slug: 'a', _status: 'draft' },
      req,
      operation: 'update',
    })
    expect(calledTags()).not.toContain('navegacion')
  })

  it('al borrar una página', async () => {
    await afterDelete({ doc: { id: 1, title: 'T', slug: 'a' }, req })
    expect(calledTags()).toContain('navegacion')
  })
})

/* ───────────── 4. El portal omite los enlaces sin destino ───────────── */

describe('mapCmsNavigation: enlaces sin destino', () => {
  const nav = (links: unknown[]) => ({ id: 1, links }) as any

  it('omite un enlace «Relación» cuya página no se puede leer (llega solo el id)', () => {
    const items = mapCmsNavigation(
      nav([
        { id: 'a', label: 'Borrador', type: 'relationship', page: 7 },
        { id: 'b', label: 'Publicada', type: 'relationship', page: { id: 8, slug: 'publicada' } },
      ]),
    )
    expect(items.map((i) => i.label)).toEqual(['Publicada'])
    expect(items[0].href).toBe('/publicada')
  })

  it('omite el hijo sin destino pero conserva el grupo con otros hijos', () => {
    const items = mapCmsNavigation(
      nav([
        {
          id: 'g',
          label: 'Grupo',
          type: 'manual',
          url: '#',
          children: [
            { id: 'h1', label: 'Muerto', type: 'relationship', page: 3 },
            { id: 'h2', label: 'Vivo', type: 'manual', url: '/vivo' },
          ],
        },
      ]),
    )
    expect(items).toHaveLength(1)
    expect(items[0].children?.map((c) => c.label)).toEqual(['Vivo'])
  })

  it('no cambia los enlaces manuales ni los grupos con «#»', () => {
    const items = mapCmsNavigation(
      nav([{ id: 'g', label: 'Facultades', type: 'manual', url: '#', children: [{ id: 'x', label: 'Medicina', type: 'manual', url: '/facultades/medicina' }] }]),
    )
    expect(items[0]).toMatchObject({ label: 'Facultades', href: '#' })
    expect(items[0].children?.[0]).toMatchObject({ label: 'Medicina', href: '/facultades/medicina' })
  })
})
