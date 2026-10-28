// MIG-IMG fase 3 (P-13): fases 1 (subir) y 2 (enlazar) del cargador contra un CMS FALSO en proceso.
// Amenazas: duplicar media al repetir o reanudar, reintentar errores 4xx, saltarse el flujo editorial
// (tres identidades), pisar la imagen que un humano ya eligió, tocar campos ajenos a featuredImage/gallery,
// o filtrar el token/contraseña en la salida. Límite: el CMS falso modela solo las reglas que el cargador
// necesita (unicidad de sha256, transiciones SEC-03); el comportamiento real de Payload se verifica aparte.
import { describe, expect, it } from 'vitest'
import {
  cleanAlt,
  createCmsClient,
  describeFile,
  isPoorAlt,
  loginCms,
  resolveEditorialIdentities,
  runFixAlt,
  runLink,
  runUpload,
  sha256Hex,
} from '../../scripts/lib/mediaLoader.mjs'

const JPG = (n: number) => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32, n)])
const HTML = Buffer.from('<!doctype html><script>alert(1)</script>')
const SECRET = 'clave-secreta-de-prueba-123'

/* ───────────── CMS falso ───────────── */
type Req = { method: string; path: string; token: string | null; body?: unknown }
function makeFakeCms() {
  const requests: Req[] = []
  const media: Array<{ id: number; sha256: string; sourcePath: string | null; filename: string; alt: string }> = []
  const noticias: Array<Record<string, any>> = []
  const users: Record<string, { id: number; role: string }> = {
    'autor@x': { id: 1, role: 'editor' },
    'revisor@x': { id: 2, role: 'reviewer' },
    'publicador@x': { id: 3, role: 'publisher' },
  }
  const injected: Array<{ match: (r: Req) => boolean; responses: Array<Response | Error> }> = []
  let nextId = 100

  const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })

  const fetchImpl = async (url: string, init: RequestInit = {}) => {
    const u = new URL(url)
    const method = (init.method || 'GET').toUpperCase()
    const auth = (init.headers as Record<string, string> | undefined)?.Authorization ?? null
    const token = auth ? auth.replace(/^JWT /, '') : null
    const path = u.pathname + u.search
    const req: Req = { method, path, token }
    if (typeof init.body === 'string') req.body = JSON.parse(init.body)
    requests.push(req)

    const hook = injected.find((i) => i.match(req) && i.responses.length > 0)
    if (hook) {
      const r = hook.responses.shift()!
      if (r instanceof Error) throw r
      return r
    }
    if (path === '/api/users/login') {
      const { email, password } = req.body as { email: string; password: string }
      if (!users[email] || password !== SECRET) return json(401, { errors: [{ message: 'bad' }] })
      return json(200, { token: `tok:${email}` })
    }
    const user = token?.startsWith('tok:') ? users[token.slice(4)] : null
    if (!user) return json(401, { errors: [{ message: 'no auth' }] })
    if (path === '/api/users/me') return json(200, { user: { id: user.id, role: user.role } })

    if (u.pathname === '/api/media' && method === 'GET') {
      const sp = u.searchParams.get('where[sourcePath][equals]')
      const sha = u.searchParams.get('where[sha256][equals]')
      if (u.searchParams.get('where[sourcePath][exists]') === 'true') {
        // Listado paginado para --fix-alt/--check-alt: filas con sourcePath.
        const page = Number(u.searchParams.get('page') ?? '1')
        const withSp = media.filter((m) => m.sourcePath).sort((a, b) => a.id - b.id)
        const size = 2
        return json(200, { docs: withSp.slice((page - 1) * size, page * size).map((m) => ({ id: m.id, alt: m.alt, sourcePath: m.sourcePath })), hasNextPage: page * size < withSp.length })
      }
      const docs = media.filter((m) => (sp ? m.sourcePath === sp : m.sha256 === sha)).map((m) => ({ id: m.id }))
      return json(200, { docs })
    }
    if (u.pathname === '/api/media' && method === 'POST') {
      const form = init.body as FormData
      const file = form.get('file') as File
      const data = Buffer.from(await file.arrayBuffer())
      const payload = JSON.parse(String(form.get('_payload')))
      const sha256 = sha256Hex(data)
      const dup = media.find((m) => m.sha256 === sha256)
      if (dup) return json(409, { errors: [{ message: 'duplicada', data: { id: dup.id, filename: dup.filename } }] })
      if (!payload.alt) return json(422, { errors: [{ message: 'alt requerido' }] })
      const doc = { id: nextId++, sha256, sourcePath: payload.sourcePath ?? null, filename: file.name, alt: payload.alt }
      media.push(doc)
      return json(201, { doc: { id: doc.id } })
    }
    if (u.pathname === '/api/noticias' && method === 'GET') {
      const slug = u.searchParams.get('where[slug][equals]')
      const doc = noticias.find((n) => n.slug === slug)
      if (!doc) return json(200, { docs: [] })
      // draft=true -> última versión (borrador incluido); si no, la versión pública (`live`) si existe.
      const view = u.searchParams.get('draft') === 'true' ? { ...doc, ...(doc.draftFields ?? {}) } : { ...doc, ...(doc.live ?? {}) }
      return json(200, { docs: [structuredClone(view)] })
    }
    const mm = /^\/api\/media\/(\d+)$/.exec(u.pathname)
    if (mm && method === 'PATCH') {
      const row = media.find((x) => x.id === Number(mm[1]))
      if (!row) return json(404, { errors: [{ message: 'no existe' }] })
      Object.assign(row, req.body)
      return json(200, { doc: { id: row.id } })
    }
    const m = /^\/api\/noticias\/(\d+)$/.exec(u.pathname)
    if (m && method === 'PATCH') {
      const doc = noticias.find((n) => n.id === Number(m[1]))!
      const body = req.body as Record<string, any>
      const draftQuery = u.searchParams.get('draft') === 'true'
      if (body.approvalStatus) {
        const ok =
          (body.approvalStatus === 'en_revision' && doc.approvalStatus === 'draft' && ['editor', 'superadmin'].includes(user.role)) ||
          (body.approvalStatus === 'aprobado' && doc.approvalStatus === 'en_revision' && user.role === 'reviewer') ||
          (body.approvalStatus === 'publicado' && doc.approvalStatus === 'aprobado' && user.role === 'publisher')
        if (!ok) return json(422, { errors: [{ message: 'transición no permitida' }] })
        doc.approvalStatus = body.approvalStatus
        doc._status = body._status
        if (body.approvalStatus === 'publicado') {
          // Publicar aplica el borrador a la versión pública.
          const merged = { ...doc, ...(doc.draftFields ?? {}) }
          doc.live = { featuredImage: merged.featuredImage ?? null, gallery: merged.gallery ?? [] }
          doc.featuredImage = merged.featuredImage ?? null
          doc.gallery = merged.gallery ?? []
          delete doc.draftFields
        }
        return json(200, { doc: { id: doc.id } })
      }
      if (!['editor', 'superadmin'].includes(user.role)) return json(403, { errors: [{ message: 'sin permiso' }] })
      if (doc.approvalStatus === 'publicado') {
        // Regla real (transitions.ts:274): editar contenido publicado exige guardar como borrador
        // (?draft=true y _status:draft); si no, 422 y no se escribe nada.
        if (!draftQuery || body._status !== 'draft') {
          return json(422, { errors: [{ message: 'Para editar contenido publicado guárdelo como borrador: los cambios se publican tras revisión y aprobación.' }] })
        }
        doc.live ??= { featuredImage: doc.featuredImage ?? null, gallery: doc.gallery ?? [] }
        doc.draftFields = { ...(doc.draftFields ?? {}), ...Object.fromEntries(Object.entries(body).filter(([k]) => k !== '_status')) }
        doc.approvalStatus = 'draft'
        doc._status = 'draft'
        return json(200, { doc: { id: doc.id } })
      }
      Object.assign(doc, Object.fromEntries(Object.entries(body).filter(([k]) => k !== '_status')))
      return json(200, { doc: { id: doc.id } })
    }
    return json(404, { errors: [{ message: 'ruta desconocida' }] })
  }

  return {
    requests,
    media,
    noticias,
    fetchImpl,
    inject: (match: (r: Req) => boolean, ...responses: Array<Response | Error>) => injected.push({ match, responses }),
    count: (method: string, pathPart: string) => requests.filter((r) => r.method === method && r.path.includes(pathPart)).length,
    json,
  }
}

function makeClient(cms: ReturnType<typeof makeFakeCms>, extra: Record<string, unknown> = {}) {
  const sleeps: number[] = []
  const client = createCmsClient({
    baseUrl: 'http://localhost:3002',
    fetchImpl: cms.fetchImpl as any,
    sleep: async (ms: number) => { sleeps.push(ms) },
    delayMs: 1500,
    ...extra,
  })
  return { client, sleeps }
}

const emptyProgress = () => ({ version: 1, files: {} as Record<string, any>, links: {} as Record<string, any> })
function filesFor(entries: Array<[string, Buffer]>) {
  return entries.map(([rel, data]) => ({ ...describeFile(rel, data), data }))
}

/* ───────────── Fase 1 ───────────── */
describe('runUpload — rechazos y reglas de red primero', () => {
  it('archivo inválido: se rechaza ANTES de cualquier petición', async () => {
    const cms = makeFakeCms()
    const { client } = makeClient(cms)
    const files = filesFor([['2024/05/mala.jpg', HTML]])
    const progress = emptyProgress()
    const summary = await runUpload({ client, token: 'tok:autor@x', files, readFile: (r: string) => files.find((f) => f.relPath === r)!.data, altByRel: {}, progress, saveProgress: () => {}, log: () => {} })
    expect(cms.requests).toHaveLength(0)
    expect(summary.rechazado).toBe(1)
    expect(progress.files['2024/05/mala.jpg']).toMatchObject({ state: 'rechazado', reason: 'tipo' })
  })

  it('4xx (422) no se reintenta: una sola petición y cuenta como error no reintentable', async () => {
    const cms = makeFakeCms()
    const { client, sleeps } = makeClient(cms)
    const files = filesFor([['2024/05/a.jpg', JPG(1)]])
    cms.inject((r) => r.method === 'POST' && r.path === '/api/media', cms.json(422, { errors: [{ message: 'no' }] }))
    const summary = await runUpload({ client, token: 'tok:autor@x', files, readFile: () => files[0].data, altByRel: { '2024/05/a.jpg': 'A' }, progress: emptyProgress(), saveProgress: () => {}, log: () => {} })
    expect(cms.count('POST', '/api/media')).toBe(1)
    expect(summary.errorFatal).toBe(1)
    expect(sleeps.filter((s) => s !== 1500)).toEqual([])
  })

  it('401 aborta la corrida entera (credencial/rol, no es culpa del archivo)', async () => {
    const cms = makeFakeCms()
    const { client } = makeClient(cms)
    const files = filesFor([['2024/05/a.jpg', JPG(1)], ['2024/05/b.jpg', JPG(2)]])
    await expect(
      runUpload({ client, token: 'tok:desconocido', files, readFile: (r: string) => files.find((f) => f.relPath === r)!.data, altByRel: {}, progress: emptyProgress(), saveProgress: () => {}, log: () => {} }),
    ).rejects.toThrow(/401/)
    expect(cms.requests).toHaveLength(1)
  })

  it('5xx: reintentos acotados con backoff 500/1000/2000 y luego error reintentable', async () => {
    const cms = makeFakeCms()
    const { client, sleeps } = makeClient(cms)
    const files = filesFor([['2024/05/a.jpg', JPG(1)]])
    const down = () => cms.json(503, { errors: [{ message: 'caído' }] })
    cms.inject((r) => r.method === 'POST', down(), down(), down(), down(), down())
    const summary = await runUpload({ client, token: 'tok:autor@x', files, readFile: () => files[0].data, altByRel: { '2024/05/a.jpg': 'A' }, progress: emptyProgress(), saveProgress: () => {}, log: () => {} })
    expect(cms.count('POST', '/api/media')).toBe(4)
    expect(sleeps.filter((s) => s !== 1500)).toEqual([500, 1000, 2000])
    expect(summary.errorRetryable).toBe(1)
    expect(summary.errorFatal ?? 0).toBe(0)
  })

  it('429: espera Retry-After (segundos) y reintenta con éxito', async () => {
    const cms = makeFakeCms()
    const { client, sleeps } = makeClient(cms)
    const files = filesFor([['2024/05/a.jpg', JPG(1)]])
    cms.inject((r) => r.method === 'POST', cms.json(429, { errors: [] }, { 'retry-after': '7' }))
    const summary = await runUpload({ client, token: 'tok:autor@x', files, readFile: () => files[0].data, altByRel: { '2024/05/a.jpg': 'A' }, progress: emptyProgress(), saveProgress: () => {}, log: () => {} })
    expect(sleeps).toContain(7000)
    expect(cms.count('POST', '/api/media')).toBe(2)
    expect(summary.subido).toBe(1)
  })

  it('error de red en el POST: reintenta y termina subiendo', async () => {
    const cms = makeFakeCms()
    const { client } = makeClient(cms)
    const files = filesFor([['2024/05/a.jpg', JPG(1)]])
    cms.inject((r) => r.method === 'POST', new Error('ECONNRESET'))
    const summary = await runUpload({ client, token: 'tok:autor@x', files, readFile: () => files[0].data, altByRel: { '2024/05/a.jpg': 'A' }, progress: emptyProgress(), saveProgress: () => {}, log: () => {} })
    expect(summary.subido).toBe(1)
  })
})

describe('runUpload — idempotencia, reanudación y pausa', () => {
  const alt = { '2024/05/a.jpg': 'A', '2024/05/b.jpg': 'B', '2024/05/c.jpg': 'C' }
  const run = (cms: ReturnType<typeof makeFakeCms>, files: any[], progress: any, extra: Record<string, unknown> = {}) => {
    const { client, sleeps } = makeClient(cms)
    const saved: string[] = []
    return runUpload({ client, token: 'tok:autor@x', files, readFile: (r: string) => files.find((f) => f.relPath === r).data, altByRel: alt, progress, saveProgress: (p: any) => saved.push(JSON.stringify(p)), log: () => {}, ...extra }).then((summary: any) => ({ summary, saved, sleeps }))
  }

  it('sube con alt y sourcePath en el multipart y guarda el id', async () => {
    const cms = makeFakeCms()
    const files = filesFor([['2024/05/a.jpg', JPG(1)]])
    const progress = emptyProgress()
    const { summary, saved } = await run(cms, files, progress)
    expect(summary.subido).toBe(1)
    expect(cms.media[0]).toMatchObject({ sourcePath: '2024/05/a.jpg', alt: 'A', filename: 'a.jpg' })
    expect(progress.files['2024/05/a.jpg']).toMatchObject({ state: 'subido', mediaId: cms.media[0].id })
    expect(saved.length).toBeGreaterThan(0)
  })

  it('existente por sourcePath: no hace POST', async () => {
    const cms = makeFakeCms()
    cms.media.push({ id: 5, sha256: 'x', sourcePath: '2024/05/a.jpg', filename: 'a.jpg', alt: 'A' })
    const files = filesFor([['2024/05/a.jpg', JPG(1)]])
    const progress = emptyProgress()
    const { summary } = await run(cms, files, progress)
    expect(cms.count('POST', '/api/media')).toBe(0)
    expect(summary.existente).toBe(1)
    expect(progress.files['2024/05/a.jpg']).toMatchObject({ state: 'existente', mediaId: 5 })
  })

  it('existente por sha256 (otro nombre): no hace POST', async () => {
    const cms = makeFakeCms()
    cms.media.push({ id: 6, sha256: sha256Hex(JPG(1)), sourcePath: null, filename: 'otro.jpg', alt: 'o' })
    const files = filesFor([['2024/05/a.jpg', JPG(1)]])
    const { summary } = await run(cms, files, emptyProgress())
    expect(cms.count('POST', '/api/media')).toBe(0)
    expect(summary.existente).toBe(1)
  })

  it('409 en el POST (carrera) se cuenta como existente usando errors[0].data.id', async () => {
    const cms = makeFakeCms()
    const files = filesFor([['2024/05/a.jpg', JPG(1)]])
    cms.inject((r) => r.method === 'POST', cms.json(409, { errors: [{ message: 'dup', data: { id: 77, filename: 'a.jpg' } }] }))
    const progress = emptyProgress()
    const { summary } = await run(cms, files, progress)
    expect(summary.existente).toBe(1)
    expect(progress.files['2024/05/a.jpg'].mediaId).toBe(77)
  })

  it('reanudación: --limit=1 y luego otra corrida no repite ningún POST', async () => {
    const cms = makeFakeCms()
    const files = filesFor([['2024/05/a.jpg', JPG(1)], ['2024/05/b.jpg', JPG(2)], ['2024/05/c.jpg', JPG(3)]])
    const progress = emptyProgress()
    await run(cms, files, progress, { limit: 1 })
    expect(cms.media).toHaveLength(1)
    const { summary } = await run(cms, files, progress)
    expect(cms.media).toHaveLength(3)
    expect(cms.count('POST', '/api/media')).toBe(3)
    expect(summary.reanudado).toBe(1)
    const third = await run(cms, files, progress)
    expect(third.summary.reanudado).toBe(3)
    expect(cms.count('POST', '/api/media')).toBe(3)
  })

  it('duplicados por contenido en el mismo lote: el segundo es existente, no un POST nuevo', async () => {
    const cms = makeFakeCms()
    const files = filesFor([['2024/05/a.jpg', JPG(1)], ['2024/05/b.jpg', JPG(1)]])
    const { summary } = await run(cms, files, emptyProgress())
    expect(cms.media).toHaveLength(1)
    expect(summary).toMatchObject({ subido: 1, existente: 1 })
  })

  it('pausa entre peticiones (delay inyectable) y nada de secretos en el progreso', async () => {
    const cms = makeFakeCms()
    const files = filesFor([['2024/05/a.jpg', JPG(1)], ['2024/05/b.jpg', JPG(2)]])
    const progress = emptyProgress()
    const { sleeps, saved } = await run(cms, files, progress)
    expect(sleeps.filter((s) => s === 1500).length).toBeGreaterThanOrEqual(3)
    expect(saved.join('')).not.toContain('tok:')
    expect(saved.join('')).not.toContain(SECRET)
  })
})

describe('loginCms / resolveEditorialIdentities', () => {
  it('login correcto devuelve el token; el fallo no incluye la contraseña ni el cuerpo', async () => {
    const cms = makeFakeCms()
    const { client } = makeClient(cms)
    expect(await loginCms(client, 'autor@x', SECRET)).toBe('tok:autor@x')
    const err = await loginCms(client, 'autor@x', 'otra-clave-equivocada').catch((e: Error) => e)
    expect(String((err as Error).message)).toMatch(/401/)
    expect(String((err as Error).message)).not.toContain('otra-clave')
  })

  it('identidades repetidas o con rol incorrecto: se detiene antes de cualquier escritura', async () => {
    const cms = makeFakeCms()
    const { client } = makeClient(cms)
    const tokens = { author: 'tok:autor@x', reviewer: 'tok:autor@x', publisher: 'tok:publicador@x' }
    const r = await resolveEditorialIdentities({ client, tokens })
    expect(r.ok).toBe(false)
    expect(r.problems.join(' ')).toMatch(/distintas|reviewer/)
    expect(cms.requests.every((q) => q.method === 'GET')).toBe(true)
  })

  it('solo autor: modo borradores; las tres distintas: modo completo', async () => {
    const cms = makeFakeCms()
    const { client } = makeClient(cms)
    expect((await resolveEditorialIdentities({ client, tokens: { author: 'tok:autor@x' } })).mode).toBe('draft-only')
    const full = await resolveEditorialIdentities({ client, tokens: { author: 'tok:autor@x', reviewer: 'tok:revisor@x', publisher: 'tok:publicador@x' } })
    expect(full).toMatchObject({ ok: true, mode: 'full' })
  })
})

/* ───────────── Fase 2 ───────────── */
describe('runLink', () => {
  const tokens = { author: 'tok:autor@x', reviewer: 'tok:revisor@x', publisher: 'tok:publicador@x' }
  const entry = (over: Record<string, unknown> = {}) => ({
    slug: 'uno', title: 'Uno', year: 2024, month: 5,
    featured: { relPath: '2024/05/a.jpg', alt: 'A', source: 'miniatura' },
    gallery: [{ relPath: '2024/05/b.jpg', alt: 'B' }],
    missing: [], ...over,
  })
  const progressWithMedia = () => {
    const p = emptyProgress()
    p.files['2024/05/a.jpg'] = { state: 'subido', mediaId: 10 }
    p.files['2024/05/b.jpg'] = { state: 'subido', mediaId: 11 }
    return p
  }
  const doc = (over: Record<string, unknown> = {}) => ({ id: 1, slug: 'uno', approvalStatus: 'draft', _status: 'draft', featuredImage: null, gallery: [], ...over })
  const run = (cms: ReturnType<typeof makeFakeCms>, noticias: any[], progress: any, mode = 'full', t: Record<string, string> = tokens) => {
    const { client } = makeClient(cms)
    return runLink({ client, tokens: t, mode, noticias, aliases: {}, progress, saveProgress: () => {}, log: () => {} }) as Promise<any>
  }

  it('noticia aún no importada -> pendiente, sin ninguna escritura', async () => {
    const cms = makeFakeCms()
    const s = await run(cms, [entry()], progressWithMedia())
    expect(s.pendiente).toBe(1)
    expect(cms.requests.filter((r) => r.method === 'PATCH')).toHaveLength(0)
  })

  it('noticia rechazada -> bloqueada y no se toca', async () => {
    const cms = makeFakeCms()
    cms.noticias.push(doc({ approvalStatus: 'rechazado' }))
    const s = await run(cms, [entry()], progressWithMedia())
    expect(s.bloqueada).toBe(1)
    expect(cms.requests.filter((r) => r.method === 'PATCH')).toHaveLength(0)
  })

  it('media aún no subida -> pendiente (sin escribir)', async () => {
    const cms = makeFakeCms()
    cms.noticias.push(doc())
    const s = await run(cms, [entry()], emptyProgress())
    expect(s.pendiente).toBe(1)
    expect(cms.requests.filter((r) => r.method === 'PATCH')).toHaveLength(0)
  })

  it('el autor guarda SOLO featuredImage y gallery; después revisor y publicador distintos publican', async () => {
    const cms = makeFakeCms()
    cms.noticias.push(doc())
    const s = await run(cms, [entry()], progressWithMedia())
    const patches = cms.requests.filter((r) => r.method === 'PATCH')
    // Solo contenido de imagen + _status:draft, y siempre con ?draft=true (si no, el CMS responde 422 en lo publicado).
    expect(Object.keys(patches[0].body as object).sort()).toEqual(['_status', 'featuredImage', 'gallery'])
    expect(patches[0].path).toContain('draft=true')
    expect(patches[0].body).toEqual({ _status: 'draft', featuredImage: 10, gallery: [{ image: 11, caption: 'B' }] })
    expect(patches.slice(1).map((p) => [p.token, (p.body as any).approvalStatus])).toEqual([
      ['tok:autor@x', 'en_revision'],
      ['tok:revisor@x', 'aprobado'],
      ['tok:publicador@x', 'publicado'],
    ])
    expect(cms.noticias[0]).toMatchObject({ approvalStatus: 'publicado', featuredImage: 10 })
    expect(s.enlazada).toBe(1)
  })

  it('ya publicada y con las mismas imágenes -> sin_cambios, cero PATCH', async () => {
    const cms = makeFakeCms()
    cms.noticias.push(doc({ approvalStatus: 'publicado', _status: 'published', featuredImage: 10, gallery: [{ image: 11, caption: 'B' }] }))
    const s = await run(cms, [entry()], progressWithMedia())
    expect(s.sin_cambios).toBe(1)
    expect(cms.requests.filter((r) => r.method === 'PATCH')).toHaveLength(0)
  })

  it('imagen distinta elegida por una persona -> conflicto, no se pisa', async () => {
    const cms = makeFakeCms()
    cms.noticias.push(doc({ featuredImage: 999 }))
    const s = await run(cms, [entry({ gallery: [] })], progressWithMedia())
    expect(s.conflicto).toBe(1)
    expect(cms.requests.filter((r) => r.method === 'PATCH')).toHaveLength(0)
  })

  it('modo solo borradores: un único PATCH de contenido, sin transiciones', async () => {
    const cms = makeFakeCms()
    cms.noticias.push(doc())
    const s = await run(cms, [entry()], progressWithMedia(), 'draft-only', { author: tokens.author })
    expect(cms.requests.filter((r) => r.method === 'PATCH')).toHaveLength(1)
    expect(cms.noticias[0].approvalStatus).toBe('draft')
    expect(s.enlazada).toBe(1)
  })

  it('reanuda tras un corte entre el guardado del autor y las transiciones', async () => {
    const cms = makeFakeCms()
    cms.noticias.push(doc({ featuredImage: 10, gallery: [{ image: 11, caption: 'B' }] }))
    const progress = progressWithMedia()
    progress.links.uno = { state: 'escrita' }
    const s = await run(cms, [entry()], progress)
    expect(cms.noticias[0].approvalStatus).toBe('publicado')
    expect(s.enlazada).toBe(1)
    expect(progress.links.uno.state).toBe('completa')
  })

  it('un archivo rechazado no bloquea el resto: se enlaza lo demás', async () => {
    const cms = makeFakeCms()
    cms.noticias.push(doc())
    const progress = progressWithMedia()
    progress.files['2024/05/b.jpg'] = { state: 'rechazado', reason: 'tipo' }
    await run(cms, [entry()], progress)
    expect((cms.requests.find((r) => r.method === 'PATCH')!.body as any)).toEqual({ _status: 'draft', featuredImage: 10 })
  })

  it('sin imagen local -> sin_imagen, sin PATCH', async () => {
    const cms = makeFakeCms()
    cms.noticias.push(doc())
    const s = await run(cms, [entry({ featured: null, gallery: [], missing: ['2019/01/z.jpg'] })], progressWithMedia())
    expect(s.sin_imagen).toBe(1)
    expect(cms.requests.filter((r) => r.method === 'PATCH')).toHaveLength(0)
  })

  it('duplicados por contenido: el alias usa el id del representante', async () => {
    const cms = makeFakeCms()
    cms.noticias.push(doc())
    const progress = emptyProgress()
    progress.files['2024/05/a.jpg'] = { state: 'subido', mediaId: 10 }
    const { client } = makeClient(cms)
    await runLink({ client, tokens, mode: 'full', noticias: [entry({ featured: { relPath: '2024/05/copia.jpg', alt: 'C', source: 'cuerpo' }, gallery: [] })], aliases: { '2024/05/copia.jpg': '2024/05/a.jpg' }, progress, saveProgress: () => {}, log: () => {} })
    expect(cms.noticias[0].featuredImage).toBe(10)
  })

  it('noticia PUBLICADA: se edita como borrador (?draft=true), se republica y la versión pública queda con la imagen', async () => {
    const cms = makeFakeCms()
    cms.noticias.push(doc({ approvalStatus: 'publicado', _status: 'published' }))
    const s = await run(cms, [entry({ gallery: [] })], progressWithMedia())
    expect(s.enlazada).toBe(1)
    expect(s.errorFatal).toBe(0)
    const contentPatches = cms.requests.filter((r) => r.method === 'PATCH' && (r.body as any).featuredImage)
    expect(contentPatches).toHaveLength(1)
    expect(contentPatches[0].path).toContain('draft=true')
    expect(cms.noticias[0].approvalStatus).toBe('publicado')
    expect(cms.noticias[0].live.featuredImage).toBe(10)
  })

  it('la verificación final falla si la versión pública no tiene la imagen', async () => {
    const cms = makeFakeCms()
    cms.noticias.push(doc({ approvalStatus: 'publicado', _status: 'published' }))
    // El publicador "publica" pero la versión pública no cambia (simula un hook que restaura el contenido).
    cms.inject((r) => r.method === 'PATCH' && (r.body as any)?.approvalStatus === 'publicado', cms.json(200, { doc: { id: 1 } }))
    const s = await run(cms, [entry({ gallery: [] })], progressWithMedia())
    expect(s.errorFatal).toBe(1)
    expect(s.enlazada).toBe(0)
  })

  it('--limit=N aplica a la fase 2: solo N noticias con trabajo real', async () => {
    const cms = makeFakeCms()
    const progress = emptyProgress()
    const list: any[] = []
    for (let i = 1; i <= 5; i++) {
      progress.files[`2024/05/f${i}.jpg`] = { state: 'subido', mediaId: 20 + i }
      cms.noticias.push(doc({ id: i, slug: `n${i}` }))
      list.push(entry({ slug: `n${i}`, featured: { relPath: `2024/05/f${i}.jpg`, alt: 'A', source: 'miniatura' }, gallery: [] }))
    }
    const { client } = makeClient(cms)
    const base = { client, tokens, mode: 'full', noticias: list, aliases: {}, progress, saveProgress: () => {}, log: () => {}, limit: 2 }
    const s = await runLink(base)
    expect(s.enlazada).toBe(2)
    expect(cms.noticias.filter((n) => n.approvalStatus === 'publicado')).toHaveLength(2)
    const s2 = await runLink(base)
    expect(s2.enlazada).toBe(2)
    expect(s2.reanudado).toBe(2)
    expect(cms.noticias.filter((n) => n.approvalStatus === 'publicado')).toHaveLength(4)
  })

  it('el log no contiene tokens ni contraseña', async () => {
    const cms = makeFakeCms()
    cms.noticias.push(doc())
    const lines: string[] = []
    const { client } = makeClient(cms)
    await runLink({ client, tokens, mode: 'full', noticias: [entry()], aliases: {}, progress: progressWithMedia(), saveProgress: () => {}, log: (l: string) => lines.push(l) })
    expect(lines.join('\n')).not.toContain('tok:')
    expect(lines.join('\n')).not.toContain(SECRET)
  })
})

/* ───────────── Calidad del texto alternativo ───────────── */
describe('cleanAlt / isPoorAlt / runFixAlt', () => {
  it('NFKC: letras matemáticas en negrita pasan a texto plano', () => {
    const bold = (t: string) =>
      [...t]
        .map((c) => (/[A-Z]/.test(c) ? String.fromCodePoint(0x1d5d4 + c.charCodeAt(0) - 65) : /[a-z]/.test(c) ? String.fromCodePoint(0x1d5ee + c.charCodeAt(0) - 97) : c))
        .join('')
    expect(bold('Acto de grado')).not.toBe('Acto de grado')
    expect(cleanAlt(bold('Acto de grado'), 'x')).toBe('Acto de grado')
  })
  it('alt pobre ("Noticia 6", IMG_123, solo dígitos) cae al título; nunca "Noticia <id>"', () => {
    expect(isPoorAlt('Noticia 6')).toBe(true)
    expect(isPoorAlt('IMG_20240101')).toBe(true)
    expect(isPoorAlt('1234')).toBe(true)
    expect(isPoorAlt('Acto de colación de grado de Ingeniería')).toBe(false)
    expect(cleanAlt('Noticia 6', 'Acto de colación de grado')).toBe('Acto de colación de grado')
    expect(cleanAlt('', 'Noticia 6')).not.toMatch(/^Noticia \d+$/)
  })
  it('longitud razonable (corta en palabra, <= 150) y sin < >', () => {
    const out = cleanAlt('', 'palabra '.repeat(60))
    expect(out.length).toBeLessThanOrEqual(150)
    expect(out).not.toMatch(/\s$/)
    expect(cleanAlt('<b>Hola</b> mundo largo', '')).toBe('bHola/b mundo largo')
  })
  it('runFixAlt: solo PATCH alt de filas con sourcePath y alt pobre; sin write no escribe', async () => {
    const cms = makeFakeCms()
    cms.media.push({ id: 1, sha256: 'a', sourcePath: '2024/05/a.jpg', filename: 'a.jpg', alt: 'Noticia 6' })
    cms.media.push({ id: 2, sha256: 'b', sourcePath: '2024/05/b.jpg', filename: 'b.jpg', alt: 'Buen texto descriptivo' })
    cms.media.push({ id: 3, sha256: 'c', sourcePath: null, filename: 'c.jpg', alt: 'Noticia 7' })
    const { client } = makeClient(cms)
    const wanted = { '2024/05/a.jpg': 'Acto de colación', '2024/05/b.jpg': 'Otro' }
    const check = await runFixAlt({ client, token: 'tok:autor@x', altByRel: wanted, write: false, log: () => {} })
    expect(check).toMatchObject({ poor: 1, fixed: 0 })
    expect(cms.requests.filter((r) => r.method === 'PATCH')).toHaveLength(0)
    const fix = await runFixAlt({ client, token: 'tok:autor@x', altByRel: wanted, write: true, log: () => {} })
    expect(fix).toMatchObject({ poor: 1, fixed: 1 })
    expect(cms.media.find((m) => m.id === 1)!.alt).toBe('Acto de colación')
    expect(cms.media.find((m) => m.id === 2)!.alt).toBe('Buen texto descriptivo')
    expect(cms.media.find((m) => m.id === 3)!.alt).toBe('Noticia 7')
    expect(cms.requests.filter((r) => r.method === 'PATCH').every((r) => Object.keys(r.body as object).join() === 'alt')).toBe(true)
  })
})
