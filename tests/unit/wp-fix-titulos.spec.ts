// T6 (migración nov-2026): corrector de títulos con letras decorativas y slugs codificados ya cargados en el CMS.
// Spec: docs/specs/migration/T6-TITULOS-UNICODE.md. Qué comprueba: (S1) solo se tocan las noticias con letras del bloque
//   U+1D400–U+1D7FF o slug `%xx`, con el mismo normalizador del importador y sin choques de slug; (S2) el cambio pasa por el
//   flujo editorial con tres identidades, guardando primero como borrador (el público no ve nada hasta publicar) y
//   retomando una corrida interrumpida; (S3) sin --apply no escribe y no sale del CMS local sin --allow-remote.
// Amenazas: despublicar noticias al editarlas; publicar con una sola identidad; renombrar noticias que no corresponden;
//   duplicar un slug. Límite: CMS simulado; la corrida real se hace contra el CMS local, primero con --limit=1.
import { describe, expect, it } from 'vitest'
// @ts-expect-error módulo .mjs sin tipos
import { planFixes, run } from '../../scripts/fix-wp-titulos-unicode.mjs'

/** «Letras matemáticas en negrita sans-serif» (U+1D5D4 / U+1D5EE), como las del volcado. */
const bold = (s: string) =>
  [...s]
    .map((ch) => {
      if (ch >= 'A' && ch <= 'Z') return String.fromCodePoint(0x1d5d4 + ch.charCodeAt(0) - 65)
      if (ch >= 'a' && ch <= 'z') return String.fromCodePoint(0x1d5ee + ch.charCodeAt(0) - 97)
      return ch
    })
    .join('')

const ENC = '%f0%9d%97%a8%f0%9d%97%a1%f0%9d%97%96-%f0%9d%97%bc%f0%9d%97%bf'

describe('S1 — planFixes', () => {
  it('normaliza título y slug codificado de las noticias afectadas y no toca las demás', () => {
    const plan = planFixes([
      { id: 115, title: `${bold('UNC')} ${bold('organiza')} ${bold('Congreso')}`, slug: ENC },
      { id: 7, title: 'Noticia normal', slug: 'noticia-normal' },
    ])
    expect(plan).toEqual([
      { id: 115, from: { title: `${bold('UNC')} ${bold('organiza')} ${bold('Congreso')}`, slug: ENC }, to: { title: 'UNC organiza Congreso', slug: 'unc-organiza-congreso' }, source: 'cms' },
    ])
  })

  it('con título decorativo y slug legible corrige solo el título', () => {
    const [p] = planFixes([{ id: 3, title: `${bold('Acto')} oficial`, slug: 'acto-oficial' }])
    expect(p.to).toEqual({ title: 'Acto oficial', slug: 'acto-oficial' })
  })

  it('con slug codificado y título común regenera solo el slug', () => {
    const [p] = planFixes([{ id: 4, title: 'Acto oficial', slug: ENC }])
    expect(p.to).toEqual({ title: 'Acto oficial', slug: 'acto-oficial' })
  })

  it('evita chocar con un slug existente o con otro de la misma corrida (agrega -id)', () => {
    const plan = planFixes([
      { id: 1, title: 'Acto oficial', slug: 'acto-oficial' },
      { id: 20, title: bold('Acto oficial'), slug: ENC },
      { id: 21, title: bold('Acto oficial'), slug: `${ENC}-2` },
    ])
    expect(plan.map((p: { to: { slug: string } }) => p.to.slug)).toEqual(['acto-oficial-20', 'acto-oficial-21'])
  })

  // Corrida sin escribir contra el CMS local (2026-11-09): dos títulos se guardaron CORTADOS por el importador anterior
  // (recortaba a 150 unidades UTF-16 y cada letra decorativa ocupa 2), uno con un carácter partido al final («pa�»).
  it('con el volcado toma el título ORIGINAL completo (clave: slug anterior), no el guardado cortado', () => {
    const original = `${bold('UNC')} y Gobierno Municipal implementan el Plan para promover la seguridad vial`
    const guardado = original.slice(0, 41) // corta en medio de un par sustituto, como en la base
    const originals = new Map([[ENC, original]])
    const [p] = planFixes([{ id: 67, title: guardado, slug: ENC }], { originals })
    expect(p.to.title).toBe('UNC y Gobierno Municipal implementan el Plan para promover la seguridad vial')
    expect(p.source).toBe('volcado')
  })

  it('sin volcado usa el título guardado e indica la fuente', () => {
    const [p] = planFixes([{ id: 3, title: `${bold('Acto')} oficial`, slug: ENC }])
    expect(p.source).toBe('cms')
  })

  it('no cambia mayúsculas sostenidas (la decisión de pasarlas a oración sigue pendiente)', () => {
    const [p] = planFixes([{ id: 5, title: bold('COMUNICADO RECTORADO'), slug: ENC }])
    expect(p.to.title).toBe('COMUNICADO RECTORADO')
  })
})

/* ───────────── CMS simulado ───────────── */

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
type Doc = { id: number; title: string; slug: string; approvalStatus: string; _status: string }

/**
 * Separa la fila publicada (lo que ve el público) de la última versión (borrador), como el CMS real con `drafts`.
 * Reglas mínimas del flujo: cada paso solo con su rol; editar una publicada sin `?draft=true` la despublicaría (se rechaza
 * aquí para que la prueba falle si el guion lo intenta).
 */
function fakeCms(docs: Array<Pick<Doc, 'id' | 'title' | 'slug'>>, opts: { latest?: Record<number, Partial<Doc>> } = {}) {
  const main = new Map<number, Doc>(docs.map((d) => [d.id, { ...d, approvalStatus: 'publicado', _status: 'published' }]))
  const latest = new Map<number, Doc>([...main].map(([id, d]) => [id, { ...d, ...(opts.latest?.[id] ?? {}) }]))
  const calls: string[] = []
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
  const roleOf = (init: RequestInit) => USERS[String((init.headers as Record<string, string> | undefined)?.Authorization ?? '').replace('JWT ', '')]?.role
  const allowed: Record<string, string> = { draft: 'superadmin', en_revision: 'superadmin', aprobado: 'reviewer', publicado: 'publisher' }

  const fetch = async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET'
    const u = new URL(url)
    const draft = u.searchParams.get('draft') === 'true'
    calls.push(`${method} ${u.pathname}${draft ? '?draft' : ''} ${roleOf(init) ?? 'anon'}`)
    const body = init.body ? JSON.parse(String(init.body)) : {}
    if (u.pathname === '/api/users/login') {
      return USERS[body.email] && body.password === PASS ? json(200, { token: body.email }) : json(401, {})
    }
    if (u.pathname === '/api/users/me') return json(200, { user: USERS[String((init.headers as Record<string, string>).Authorization).replace('JWT ', '')] })
    if (u.pathname === '/api/noticias' && method === 'GET') {
      const all = [...main.values()].filter((d) => d._status === 'published')
      const page = Number(u.searchParams.get('page') ?? '1')
      const limit = Number(u.searchParams.get('limit') ?? '10')
      const docsPage = all.slice((page - 1) * limit, page * limit)
      return json(200, { docs: docsPage, hasNextPage: page * limit < all.length, page })
    }
    const m = u.pathname.match(/^\/api\/noticias\/(\d+)$/)
    if (!m) return json(404, {})
    const id = Number(m[1])
    if (method === 'GET') return json(200, draft ? latest.get(id) : main.get(id))
    const role = roleOf(init)
    if (!role || allowed[body.approvalStatus] !== role) return json(403, { errors: [{ message: 'rol' }] })
    if (body._status === 'draft' && !draft && role === 'superadmin') return json(422, { errors: [{ message: 'despublicaría' }] })
    const next = { ...latest.get(id)!, ...body }
    latest.set(id, next)
    if (body._status === 'published') main.set(id, { ...next })
    return json(200, { doc: next })
  }
  return { fetch, main, latest, calls }
}

const silent = () => {
  const lines: string[] = []
  return { log: (m: string) => lines.push(m), lines }
}
const SAMPLE = [
  { id: 115, title: `${bold('UNC')} ${bold('organiza')} ${bold('Congreso')}`, slug: ENC },
  { id: 110, title: `${bold('La')} ${bold('UNC')} ${bold('celebra')}`, slug: `${ENC}-x` },
  { id: 7, title: 'Noticia normal', slug: 'noticia-normal' },
]

describe('S3 — sin --apply', () => {
  it('lee solo la API pública, muestra el plan y no escribe', async () => {
    const cms = fakeCms(SAMPLE)
    const out = silent()
    const r = await run({ deps: { env: ENV, fetch: cms.fetch, log: out.log } })
    expect(r.dryRun).toBe(true)
    expect(r.plan).toHaveLength(2)
    expect(cms.calls.every((c) => c.startsWith('GET /api/noticias ') && c.endsWith('anon'))).toBe(true)
    expect(out.lines.join('\n')).toContain('unc-organiza-congreso')
  })
})

describe('S2 — con --apply', () => {
  it('edita como borrador y publica con tres identidades; el público ve el título nuevo', async () => {
    const cms = fakeCms(SAMPLE)
    const r = await run({ apply: true, originals: new Map(), deps: { env: ENV, fetch: cms.fetch, log: silent().log } })
    expect(r.ok).toBe(true)
    expect(r.fixed).toBe(2)
    expect(cms.main.get(115)).toMatchObject({ title: 'UNC organiza Congreso', slug: 'unc-organiza-congreso', _status: 'published' })
    expect(cms.main.get(7)).toMatchObject({ title: 'Noticia normal', slug: 'noticia-normal' })
    expect(cms.calls.filter((c) => c.startsWith('PATCH /api/noticias/115'))).toEqual([
      'PATCH /api/noticias/115?draft superadmin',
      'PATCH /api/noticias/115?draft superadmin',
      'PATCH /api/noticias/115?draft reviewer',
      'PATCH /api/noticias/115 publisher',
    ])
  })

  it('retoma una corrida interrumpida sin repetir la edición', async () => {
    const cms = fakeCms(SAMPLE, {
      latest: { 115: { title: 'UNC organiza Congreso', slug: 'unc-organiza-congreso', approvalStatus: 'en_revision', _status: 'draft' } },
    })
    const r = await run({ apply: true, limit: 1, originals: new Map(), deps: { env: ENV, fetch: cms.fetch, log: silent().log } })
    expect(r.ok).toBe(true)
    expect(cms.calls.filter((c) => c.startsWith('PATCH'))).toEqual(['PATCH /api/noticias/115?draft reviewer', 'PATCH /api/noticias/115 publisher'])
    expect(cms.main.get(115)?.title).toBe('UNC organiza Congreso')
  })

  it('--limit=1 corrige solo la primera', async () => {
    const cms = fakeCms(SAMPLE)
    const r = await run({ apply: true, limit: 1, originals: new Map(), deps: { env: ENV, fetch: cms.fetch, log: silent().log } })
    expect(r.fixed).toBe(1)
    expect(cms.main.get(110)?.slug).toBe(`${ENC}-x`)
  })

  it('con identidades inválidas (el «revisor» no tiene ese rol) no toca ninguna noticia', async () => {
    const cms = fakeCms(SAMPLE)
    const env = { ...ENV, CMS_REVIEWER_EMAIL: 'publicador@test.local' } // el «revisor» no puede aprobar
    const r = await run({ apply: true, originals: new Map(), deps: { env, fetch: cms.fetch, log: silent().log } })
    expect(r.ok).toBe(false)
    expect(cms.calls.some((c) => c.startsWith('PATCH'))).toBe(false) // identidades inválidas: no se toca nada
  })

  it('--apply exige el volcado (los títulos guardados pueden estar cortados) y no escribe sin él', async () => {
    const cms = fakeCms(SAMPLE)
    await expect(run({ apply: true, deps: { env: ENV, fetch: cms.fetch, log: silent().log } })).rejects.toThrow(/--xml/)
    expect(cms.calls.some((c) => c.startsWith('PATCH'))).toBe(false)
  })

  it('no sale del CMS local sin --allow-remote y nunca imprime contraseñas', async () => {
    const cms = fakeCms(SAMPLE)
    await expect(run({ apply: true, deps: { env: { ...ENV, CMS_URL: 'https://cms.unc.edu.py' }, fetch: cms.fetch, log: silent().log } })).rejects.toThrow(/local/)
    const out = silent()
    await run({ apply: true, originals: new Map(), deps: { env: ENV, fetch: cms.fetch, log: out.log } })
    expect(out.lines.join('\n')).not.toContain(PASS)
  })
})
