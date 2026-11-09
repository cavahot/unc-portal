// MENU-CMS-02: prueba de punta a punta «página del CMS → megamenú» (spec: docs/specs/portal/MENU-PAGINAS.md §5).
// Qué comprueba: el guion `scripts/smoke-menu-pagina.mjs` (1) sin --apply no hace red; (2) con tres identidades crea una
//   página, comprueba que Navegación rechaza enlazarla en borrador, la lleva por el flujo editorial con cada identidad, la
//   enlaza, espera a verla en el portal y (3) SIEMPRE deja el menú como estaba y borra la página, aunque algo falle.
// Amenazas: dejar basura publicada en el portal o un menú alterado; escribir en un destino equivocado; publicar con una
//   sola identidad. Límite: CMS y portal simulados en memoria; el recorrido real se corre a mano contra el CMS local.
import { describe, expect, it } from 'vitest'
// @ts-expect-error módulo .mjs sin tipos
import { run } from '../../scripts/smoke-menu-pagina.mjs'
// @ts-expect-error módulo .mjs sin tipos
import { NAVEGACION_SEED } from '../../scripts/lib/navegacionSeedData.mjs'

type Link = { label: string; type: string; url?: string; page?: number; children?: unknown[] }
type Page = { id: number; slug: string; approvalStatus: string; _status: string }

const PASS = 'clave-de-prueba-larga-123'
const USERS: Record<string, { id: number; role: string }> = {
  'autor@test.local': { id: 1, role: 'superadmin' },
  'revisor@test.local': { id: 2, role: 'reviewer' },
  'publicador@test.local': { id: 3, role: 'publisher' },
}
const ENV = {
  CMS_EMAIL: 'autor@test.local',
  CMS_PASSWORD: PASS,
  CMS_REVIEWER_EMAIL: 'revisor@test.local',
  CMS_REVIEWER_PASSWORD: PASS,
  CMS_PUBLISHER_EMAIL: 'publicador@test.local',
  CMS_PUBLISHER_PASSWORD: PASS,
}

/** CMS y portal en memoria con las reglas reales que importan aquí (flujo editorial y validación de Navegación). */
function fakeWorld(opts: { links?: Link[]; portalNeverUpdates?: boolean; failStep?: string; rejectSeed?: boolean } = {}) {
  const state = { links: structuredClone(opts.links ?? []) as Link[], pages: new Map<number, Page>(), nextId: 50 }
  const calls: string[] = []
  const tokenUser = (h: Record<string, string> | undefined) => String(h?.Authorization ?? '').replace('JWT ', '')
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

  const fetch = async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET'
    const u = new URL(url)
    calls.push(`${method} ${u.host}${u.pathname}`)
    const body = init.body ? JSON.parse(String(init.body)) : {}
    const who = tokenUser(init.headers as Record<string, string>)

    if (u.host === 'localhost:3000') {
      if (u.pathname === '/') {
        const visible = opts.portalNeverUpdates ? [] : state.links
        const hrefs = visible.map((l) => {
          const p = l.page ? state.pages.get(l.page) : undefined
          return p && p._status === 'published' ? `<a href="/${p.slug}">${l.label}</a>` : `<a href="${l.url ?? '#'}">${l.label}</a>`
        })
        return new Response(`<html><nav>${hrefs.join('')}</nav></html>`, { status: 200 })
      }
      const page = [...state.pages.values()].find((p) => `/${p.slug}` === u.pathname && p._status === 'published')
      return new Response(page ? '<h1>ok</h1>' : 'not found', { status: page ? 200 : 404 })
    }

    if (u.pathname === '/api/users/login') {
      const user = USERS[body.email]
      return user && body.password === PASS ? json(200, { token: body.email }) : json(401, { errors: [{ message: 'x' }] })
    }
    if (u.pathname === '/api/users/me') return json(200, { user: USERS[who] })
    if (u.pathname === '/api/globals/navegacion' && method === 'GET') return json(200, { links: state.links })
    if (u.pathname === '/api/globals/navegacion' && method === 'POST') {
      if (USERS[who]?.role !== 'superadmin') return json(403, {})
      if (opts.rejectSeed) return json(400, { errors: [{ message: 'The following field is invalid: links 2 > Subenlaces' }] })
      for (const l of body.links as Link[]) {
        if (l.type === 'relationship') {
          const p = l.page ? state.pages.get(l.page) : undefined
          if (!p || p._status !== 'published') return json(400, { errors: [{ message: 'La página enlazada no está publicada.' }] })
        }
      }
      state.links = structuredClone(body.links)
      return json(200, { links: state.links })
    }
    if (u.pathname === '/api/paginas' && method === 'POST') {
      const id = state.nextId++
      state.pages.set(id, { id, slug: body.slug, approvalStatus: 'draft', _status: 'draft' })
      return json(201, { doc: state.pages.get(id) })
    }
    const m = u.pathname.match(/^\/api\/paginas\/(\d+)$/)
    if (m) {
      const page = state.pages.get(Number(m[1]))
      if (!page) return json(404, {})
      if (method === 'DELETE') {
        state.pages.delete(page.id)
        return json(200, {})
      }
      const allowed: Record<string, string> = { en_revision: 'superadmin', aprobado: 'reviewer', publicado: 'publisher' }
      if (opts.failStep === body.approvalStatus || allowed[body.approvalStatus] !== USERS[who]?.role) return json(403, {})
      page.approvalStatus = body.approvalStatus
      page._status = body._status
      return json(200, { doc: page })
    }
    return json(404, {})
  }
  return { fetch, state, calls }
}

const quiet = () => {
  const lines: string[] = []
  return { log: (m: string) => lines.push(m), lines }
}
const deps = (world: ReturnType<typeof fakeWorld>, extra: Record<string, unknown> = {}) => ({
  env: ENV,
  fetch: world.fetch,
  sleep: async () => {},
  now: () => 1700000000000,
  pollAttempts: 3,
  ...quiet(),
  ...extra,
})

const SEEDED: Link[] = [{ label: 'Inicio', type: 'manual', url: '/' }]

describe('smoke-menu-pagina: sin --apply', () => {
  it('no hace ninguna llamada de red y describe el recorrido', async () => {
    const world = fakeWorld()
    const out = quiet()
    const r = await run({ deps: { ...deps(world), log: out.log } })
    expect(r.dryRun).toBe(true)
    expect(world.calls).toEqual([])
    expect(out.lines.join('\n')).toMatch(/--apply/)
  })
})

describe('smoke-menu-pagina: recorrido completo', () => {
  it('crea, rechaza el enlace en borrador, publica con tres identidades, enlaza, lo ve en el portal y limpia', async () => {
    const world = fakeWorld({ links: SEEDED })
    const r = await run({ apply: true, deps: deps(world) })
    const byName = Object.fromEntries(r.checks.map((c: { name: string; ok: boolean }) => [c.name, c.ok]))
    expect(byName).toEqual({
      identidades: true,
      pagina_creada: true,
      rechaza_borrador: true,
      flujo_editorial: true,
      enlace_agregado: true,
      portal_muestra_enlace: true,
      portal_muestra_pagina: true,
      menu_restaurado: true,
      pagina_borrada: true,
    })
    expect(r.ok).toBe(true)
    // Limpieza: el menú vuelve exactamente a como estaba y la página ya no existe.
    expect(world.state.links).toEqual(SEEDED)
    expect(world.state.pages.size).toBe(0)
    // Cada paso editorial lo dio su identidad (el simulador rechaza otro rol con 403).
    expect(world.calls.filter((c) => c.startsWith('PATCH'))).toHaveLength(3)
  })

  it('con Navegación vacía primero carga el menú actual (siembra) y lo conserva al terminar', async () => {
    const world = fakeWorld({ links: [] })
    const r = await run({ apply: true, deps: deps(world) })
    expect(r.ok).toBe(true)
    expect(r.seeded).toBe(true)
    expect(world.state.links).toEqual(NAVEGACION_SEED)
  })

  it('si el portal nunca muestra el enlace, falla pero igual restaura el menú y borra la página', async () => {
    const world = fakeWorld({ links: SEEDED, portalNeverUpdates: true })
    const r = await run({ apply: true, deps: deps(world) })
    expect(r.ok).toBe(false)
    expect(r.checks.find((c: { name: string }) => c.name === 'portal_muestra_enlace').ok).toBe(false)
    expect(world.state.links).toEqual(SEEDED)
    expect(world.state.pages.size).toBe(0)
  })

  it('si falla un paso editorial no enlaza nada y borra la página creada', async () => {
    const world = fakeWorld({ links: SEEDED, failStep: 'aprobado' })
    const r = await run({ apply: true, deps: deps(world) })
    expect(r.ok).toBe(false)
    expect(r.checks.find((c: { name: string }) => c.name === 'flujo_editorial').ok).toBe(false)
    expect(r.checks.some((c: { name: string }) => c.name === 'enlace_agregado')).toBe(false)
    expect(world.state.links).toEqual(SEEDED)
    expect(world.state.pages.size).toBe(0)
  })

  it('con --keep deja la página publicada y el enlace (para revisarlos a mano)', async () => {
    const world = fakeWorld({ links: SEEDED })
    const r = await run({ apply: true, keep: true, deps: deps(world) })
    expect(r.ok).toBe(true)
    expect(world.state.pages.size).toBe(1)
    expect(world.state.links).toHaveLength(2)
  })
})

describe('smoke-menu-pagina: errores del CMS', () => {
  // MENU-CMS-02: en la corrida real solo se vio «HTTP 400»; sin el mensaje del CMS no se sabía qué campo fallaba.
  it('si el CMS rechaza la siembra, el error incluye el mensaje del CMS y no se crea ninguna página', async () => {
    const world = fakeWorld({ links: [], rejectSeed: true })
    await expect(run({ apply: true, deps: deps(world) })).rejects.toThrow(/HTTP 400.*links 2 > Subenlaces/)
    expect(world.calls.some((c) => c.includes('/api/paginas'))).toBe(false)
  })
})

describe('smoke-menu-pagina: guardas', () => {
  it('sin las tres identidades distintas no crea nada', async () => {
    const world = fakeWorld({ links: SEEDED })
    const env = { ...ENV, CMS_PUBLISHER_EMAIL: 'revisor@test.local' }
    const r = await run({ apply: true, deps: deps(world, { env }) })
    expect(r.ok).toBe(false)
    expect(world.calls.some((c) => c.includes('/api/paginas'))).toBe(false)
  })

  it('el autor debe ser superadmin (edita Navegación y borra la página de prueba)', async () => {
    const world = fakeWorld({ links: SEEDED })
    USERS['editor@test.local'] = { id: 9, role: 'editor' }
    const r = await run({ apply: true, deps: deps(world, { env: { ...ENV, CMS_EMAIL: 'editor@test.local' } }) })
    delete USERS['editor@test.local']
    expect(r.ok).toBe(false)
    expect(world.calls.some((c) => c.includes('/api/paginas'))).toBe(false)
  })

  it('rechaza un CMS o un portal remotos sin --allow-remote, y http con --allow-remote', async () => {
    const world = fakeWorld()
    await expect(run({ apply: true, deps: deps(world, { env: { ...ENV, CMS_URL: 'https://cms.unc.edu.py' } }) })).rejects.toThrow(/local/)
    await expect(run({ apply: true, deps: deps(world, { env: { ...ENV, PORTAL_URL: 'https://www.unc.edu.py' } }) })).rejects.toThrow(/local/)
    await expect(
      run({ apply: true, allowRemote: true, deps: deps(world, { env: { ...ENV, CMS_URL: 'https://cms.x', PORTAL_URL: 'http://www.x' } }) }),
    ).rejects.toThrow(/https/)
    expect(world.calls).toEqual([])
  })

  it('nunca escribe las contraseñas en la salida', async () => {
    const world = fakeWorld({ links: SEEDED })
    const out = quiet()
    await run({ apply: true, deps: { ...deps(world), log: out.log } })
    expect(out.lines.join('\n')).not.toContain(PASS)
  })
})
