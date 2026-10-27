// GLO-GN-01: actualizador del glosario guaraní «solo sobre fuentes oficiales».
// Spec: docs/specs/i18n/GLOSARIO-GUARANI.md §4 y escenarios 9–12.
// Amenazas: (1) descargar de un host no oficial o seguir una redirección hacia él; (2) TLS desactivado;
// (3) respuestas enormes o de tipo inesperado (HTML de error tomado como datos); (4) pisar filas revisadas o
// del PO; (5) reemplazar una glosa por otra sin revisión; (6) escribir sin --apply o fuera de localhost;
// (7) informe dentro del repositorio; (8) importar Jojajovai u otro corpus.
// Límite: red y CMS simulados; la ejecución real se documenta en el informe de entrega.
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { GLOSARIO_SOURCES, isOfficialUrl, loadSources } from '../../scripts/lib/glosarioSources.mjs'
import { MAX_BYTES, USER_AGENT, makePoliteFetch } from '../../scripts/lib/glosarioFetch.mjs'
import { parseSplCsv, planMerge } from '../../scripts/lib/glosarioUpdate.mjs'
import { run } from '../../scripts/update-glosario-guarani.mjs'

const STRONG = 'Clave-Local-Segura-93'
const SPL = GLOSARIO_SOURCES.find((s) => s.id === 'spl-vocabulario-es-gn')!

describe('registro de fuentes', () => {
  it('solo hosts oficiales; Jojajovai/GitHub no figuran', () => {
    expect(loadSources()).toBe(GLOSARIO_SOURCES)
    const all = JSON.stringify(GLOSARIO_SOURCES)
    expect(all).not.toMatch(/github|jojajovai|dialnet|wikipedia/i)
    expect(isOfficialUrl('https://www.datos.gov.py/x')).toBe(true)
    expect(isOfficialUrl('https://www.datos.gov.py.evil.example/x')).toBe(false)
    expect(isOfficialUrl('http://www.datos.gov.py/x')).toBe(false)
  })
  it('un registro con host ajeno falla cerrado (negativo)', () => {
    expect(() => loadSources([{ ...SPL, id: 'malo', url: 'https://github.com/pln-fing-udelar/jojajovai' }])).toThrow(/no oficial/)
    expect(() => loadSources([SPL, SPL])).toThrow(/repetido/)
  })
})

/** fetch simulado: mapa url → Response o función. */
function fakeNet(routes: Record<string, () => Response>) {
  const calls: Array<{ url: string; init: RequestInit }> = []
  const fetch = async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init })
    const r = routes[url]
    if (!r) throw new Error(`sin ruta ${url}`)
    return r()
  }
  return { fetch, calls }
}
const csvRes = (body: string, headers: Record<string, string> = {}) => () =>
  new Response(body, { status: 200, headers: { 'content-type': 'text/csv; charset=utf-8', ...headers } })

describe('descarga cortés', () => {
  const clock = () => {
    let t = 0
    const waits: number[] = []
    return { now: () => t, sleep: async (ms: number) => { waits.push(ms); t += ms }, waits }
  }

  it('User-Agent descriptivo, pausa mínima por host y sin redirección automática', async () => {
    const c = clock()
    const net = fakeNet({ 'https://www.datos.gov.py/a.csv': csvRes('a'), 'https://www.datos.gov.py/b.csv': csvRes('b') })
    const get = makePoliteFetch({ fetch: net.fetch as never, now: c.now, sleep: c.sleep, env: {} })
    await get('https://www.datos.gov.py/a.csv', { minIntervalMs: 10_000 })
    await get('https://www.datos.gov.py/b.csv', { minIntervalMs: 10_000 })
    expect(c.waits).toEqual([10_000])
    expect(net.calls[0].init.redirect).toBe('manual')
    expect((net.calls[0].init.headers as Record<string, string>)['User-Agent']).toBe(USER_AGENT)
    expect(USER_AGENT).toBe('unc-portal-glosario/1.0 (actualización autorizada de vocabulario oficial)')
  })

  it('rechaza host no oficial antes de pedir y redirección hacia host ajeno (negativos)', async () => {
    const net = fakeNet({
      'https://www.datos.gov.py/r': () => new Response(null, { status: 302, headers: { location: 'https://evil.example/x.csv' } }),
      'https://www.datos.gov.py/ok': () => new Response(null, { status: 301, headers: { location: '/final.csv' } }),
      'https://www.datos.gov.py/final.csv': csvRes('fin'),
    })
    const get = makePoliteFetch({ fetch: net.fetch as never, sleep: async () => {}, env: {} })
    await expect(get('https://github.com/x.csv')).rejects.toThrow(/no oficial/)
    expect(net.calls).toHaveLength(0)
    await expect(get('https://www.datos.gov.py/r')).rejects.toThrow(/no oficial/)
    expect((await get('https://www.datos.gov.py/ok')).text).toBe('fin')
  })

  it('rechaza TLS desactivado, HTML, tamaño excesivo y errores HTTP (negativos)', async () => {
    const big = 'x'.repeat(64)
    const net = fakeNet({
      'https://www.datos.gov.py/html': () => new Response('<html>Error</html>', { status: 200, headers: { 'content-type': 'text/html' } }),
      'https://www.datos.gov.py/big': csvRes(big),
      'https://www.datos.gov.py/biglen': csvRes('x', { 'content-length': String(MAX_BYTES + 1) }),
      'https://www.datos.gov.py/404': () => new Response('<html/>', { status: 404, headers: { 'content-type': 'text/html' } }),
    })
    await expect(makePoliteFetch({ fetch: net.fetch as never, env: { NODE_TLS_REJECT_UNAUTHORIZED: '0' } })('https://www.datos.gov.py/big')).rejects.toThrow(/TLS/)
    const get = makePoliteFetch({ fetch: net.fetch as never, sleep: async () => {}, env: {}, maxBytes: 32 })
    await expect(get('https://www.datos.gov.py/html')).rejects.toThrow(/tipo de contenido/)
    await expect(get('https://www.datos.gov.py/big')).rejects.toThrow(/tope/)
    await expect(makePoliteFetch({ fetch: net.fetch as never, sleep: async () => {}, env: {} })('https://www.datos.gov.py/biglen')).rejects.toThrow(/tope/)
    await expect(get('https://www.datos.gov.py/404')).rejects.toThrow(/HTTP 404/)
  })
})

describe('parser del vocabulario SPL', () => {
  it('normaliza nasales degradadas, separa glosas y agrupa repetidos', () => {
    const csv = '﻿palabra_id,palabra,clavebusqueda,significado,archivo\n1,Conocer,conocer,kuaa ; kümby,a.mp3\n2,etapa,etapa,"ararasa, arapahë",\n3,conocer,conocer,kuaa,\n4,,x,,\n'
    expect(parseSplCsv(csv)).toEqual([
      { terminoEs: 'conocer', glosas: ['kuaa', 'kũmby'] },
      { terminoEs: 'etapa', glosas: ['ararasa', 'arapahẽ'] },
    ])
  })
  it('formato inesperado → error claro (se informa como manual)', () => {
    expect(() => parseSplCsv('a,b\n1,2\n')).toThrow(/formato/)
  })
})

type Row = Record<string, unknown>
const row = (o: Row): Row => ({ id: 1, terminoGn: '', variantesGn: [], revisado: false, origen: 'glosario-po', activo: true, ...o })
const plan = (existing: Row[], incoming: Array<{ terminoEs: string; glosas: string[] }>) =>
  planMerge({ existing, incoming, source: SPL, resourceUrl: SPL.fallbackResourceUrls[0], fecha: '2026-10-25' })

describe('reglas de fusión', () => {
  it('término nuevo → crear oficial A con fuente, URL y fecha', () => {
    const p = plan([], [{ terminoEs: 'facultad', glosas: ['mbo\'ehaoguasu', 'x'] }])
    expect(p.counts.crear).toBe(1)
    expect(p.actions[0].data).toMatchObject({
      terminoEs: 'facultad', terminoGn: "mbo'ehaoguasu", variantesGn: [{ valor: 'x' }], oficial: true, confianza: 'A',
      origen: 'actualizador', revisado: false, fuente: SPL.nombre, fuenteUrl: SPL.fallbackResourceUrls[0], fechaConsulta: '2026-10-25',
    })
  })
  it('misma glosa ya presente en una fila del PO → ya-cubierto (sin escribir)', () => {
    const p = plan([row({ terminoEs: 'profesor', terminoGn: "mbo'ehára", fuente: 'Vocabulario es-gn de la SPL (datos.gov.py)' })], [{ terminoEs: 'Profesor', glosas: ["mbo'ehára"] }])
    expect(p.actions[0].type).toBe('ya-cubierto')
  })
  it('glosa distinta a la del PO → crea su propia fila marcada «Pendiente de revisión» sin tocar la del PO', () => {
    const po = row({ terminoEs: 'nivel', terminoGn: 'yvatejoja', fuente: 'PO', confianza: 'A' })
    const p = plan([po], [{ terminoEs: 'nivel', glosas: ['otra'] }])
    expect(p.actions[0].type).toBe('crear-conflicto')
    expect(String((p.actions[0].data as Row).nota)).toMatch(/Pendiente de revisión.*yvatejoja/)
    expect(p.actions.some((a: { type: string }) => a.type === 'actualizar')).toBe(false)
  })
  it('fila propia: agrega variante y marca pendiente, nunca reemplaza la glosa', () => {
    const own = row({ id: 9, terminoEs: 'etapa', terminoGn: 'ararasa', fuente: SPL.nombre, origen: 'actualizador', variantesGn: [{ valor: 'arapahẽ' }], nota: '' })
    const p = plan([own], [{ terminoEs: 'etapa', glosas: ['ararasa', 'nueva'] }])
    expect(p.actions[0]).toMatchObject({ type: 'actualizar', id: 9 })
    expect(p.actions[0].data).toMatchObject({ variantesGn: [{ valor: 'arapahẽ' }, { valor: 'nueva' }] })
    expect((p.actions[0].data as Row).terminoGn).toBeUndefined()
    expect(plan([own], [{ terminoEs: 'etapa', glosas: ['ararasa'] }]).actions[0].type).toBe('sin-cambios')
  })
  it('fila revisada o de otro origen con la misma fuente → nunca se modifica (escenario 9)', () => {
    const rev = row({ terminoEs: 'etapa', terminoGn: 'ararasa', fuente: SPL.nombre, origen: 'actualizador', revisado: true })
    expect(plan([rev], [{ terminoEs: 'etapa', glosas: ['nueva'] }]).actions[0].type).toBe('omitido-revisado')
    const panel = row({ terminoEs: 'etapa', terminoGn: 'ararasa', fuente: SPL.nombre, origen: 'panel' })
    expect(plan([panel], [{ terminoEs: 'etapa', glosas: ['nueva'] }]).actions[0].type).toBe('omitido-otro-origen')
  })
  it('idempotente: aplicar el plan y volver a planificar no produce escrituras', () => {
    const inc = [{ terminoEs: 'facultad', glosas: ['a'] }, { terminoEs: 'nivel', glosas: ['b'] }]
    const first = plan([row({ terminoEs: 'nivel', terminoGn: 'yvatejoja', fuente: 'PO' })], inc)
    const after = [row({ terminoEs: 'nivel', terminoGn: 'yvatejoja', fuente: 'PO' }), ...first.actions.filter((a: { data?: Row }) => a.data).map((a: { data?: Row }, i: number) => row({ id: 100 + i, ...a.data }))]
    const second = plan(after, inc)
    expect(second.actions.every((a: { type: string }) => ['sin-cambios', 'ya-cubierto'].includes(a.type))).toBe(true)
  })
})

describe('CLI run', () => {
  const env = { CMS_EMAIL: 'qa@example.invalid', CMS_PASSWORD: STRONG }
  const reportDir = () => mkdtempSync(join(tmpdir(), 'glo-gn-'))

  it('sitio oficial caído → dry-run informa «inalcanzable», sin escribir ni probar otros hosts (escenario 12)', async () => {
    const urls: string[] = []
    const fetch = async (url: string) => {
      urls.push(url)
      return new Response('<html>Error</html>', { status: 404, headers: { 'content-type': 'text/html' } })
    }
    const dir = reportDir()
    const r = await run({ argv: ['--source', 'spl-vocabulario-es-gn', '--report-dir', dir], deps: { env, fetch: fetch as never, log: () => {}, sleep: async () => {} } })
    expect(r.fuentes[0].estado).toBe('inalcanzable')
    expect(urls.every((u) => new URL(u).hostname === 'www.datos.gov.py')).toBe(true)
    expect(readdirSync(dir).some((f) => /^update-report-\d{4}-\d{2}-\d{2}/.test(f))).toBe(true)
  })

  it('fuentes de tipo página/PDF → «manual»', async () => {
    const r = await run({ argv: ['--source', 'conacyt-diccionario-informatico', '--report-dir', reportDir()], deps: { env, fetch: (async () => { throw new Error('no') }) as never, log: () => {} } })
    expect(r.fuentes[0].estado).toBe('manual')
  })

  it('dry-run por defecto con --file: calcula el diff y NO llama al CMS', async () => {
    const dir = reportDir()
    const file = join(dir, 'spl.csv')
    await import('node:fs').then((fs) => fs.writeFileSync(file, 'palabra_id,palabra,clavebusqueda,significado\n1,facultad,facultad,mbo\'ehaoguasu\n'))
    const calls: string[] = []
    const fetch = async (url: string) => { calls.push(url); throw new Error('sin red') }
    const r = await run({ argv: ['--source', 'spl-vocabulario-es-gn', '--file', file, '--report-dir', dir], deps: { env, fetch: fetch as never, log: () => {}, existing: [] } })
    expect(r.modo).toBe('dry-run')
    expect(r.fuentes[0]).toMatchObject({ estado: 'ok', counts: { crear: 1 } })
    expect(calls).toEqual([])
  })

  it('--apply escribe por REST solo en localhost; remoto rechazado (negativo)', async () => {
    const dir = reportDir()
    const file = join(dir, 'spl.csv')
    await import('node:fs').then((fs) => fs.writeFileSync(file, 'palabra,significado\nfacultad,a\n'))
    const writes: string[] = []
    const fetch = async (url: string, init: RequestInit = {}) => {
      const u = new URL(url)
      if (u.pathname === '/api/users/login') return new Response(JSON.stringify({ token: 't' }), { status: 200 })
      if ((init.method ?? 'GET') === 'GET') return new Response(JSON.stringify({ docs: [], hasNextPage: false }), { status: 200 })
      writes.push(`${init.method} ${u.pathname}`)
      return new Response(JSON.stringify({ doc: { id: 1 } }), { status: 201 })
    }
    const deps = { env, fetch: fetch as never, log: () => {}, pace: async () => {} }
    const r = await run({ argv: ['--source', 'spl-vocabulario-es-gn', '--file', file, '--apply', '--report-dir', dir], deps })
    expect(r.modo).toBe('apply')
    expect(writes).toEqual(['POST /api/glosario-guarani'])
    await expect(run({ argv: ['--source', 'spl-vocabulario-es-gn', '--file', file, '--apply', '--report-dir', dir], deps: { ...deps, env: { ...env, CMS_URL: 'https://cms.unc.edu.py' } } })).rejects.toThrow(/local/)
  })

  it('se niega a escribir el informe dentro del repositorio y a fuentes desconocidas (negativos)', async () => {
    const deps = { env, fetch: (async () => { throw new Error('no') }) as never, log: () => {} }
    await expect(run({ argv: ['--source', 'conacyt-diccionario-informatico', '--report-dir', resolve(process.cwd(), 'tmp-report')], deps })).rejects.toThrow(/repositorio/)
    await expect(run({ argv: ['--source', 'jojajovai', '--report-dir', reportDir()], deps })).rejects.toThrow(/desconocida/)
  })

  it('el script no contiene hosts no oficiales ni lectura de Jojajovai', () => {
    const src = readFileSync(resolve(process.cwd(), 'scripts/update-glosario-guarani.mjs'), 'utf8')
    expect(src).not.toMatch(/github\.com|jojajovai_all/i)
  })
})
