// CNV-01 (decisiones del PO 2026-10-24): capa de correcciones, duplicado excluido y reclasificación del dataset.
// Amenaza: que una re-siembra reintroduzca erratas o el duplicado borrado, o que una corrección toque un texto distinto
// del revisado. Límite: pruebas sobre datos y guiones con un CMS simulado; la BD real se verifica en vivo.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  aplicarCapaCorrecciones,
  CAMPO_DATASET,
  CONVENIOS_CORRECCIONES,
  CONVENIOS_DUPLICADOS_EXCLUIDOS,
  CONVENIOS_RECLASIFICADOS,
} from '../../scripts/lib/conveniosCorrections.mjs'
import {
  CONVENIOS_INTERNACIONALES,
  CONVENIOS_INTERNACIONALES_ORIGEN,
  CONVENIOS_NACIONALES,
  CONVENIOS_NACIONALES_ORIGEN,
  CONVENIOS_TODOS,
  toCmsPayloadConvenio,
} from '../../scripts/lib/conveniosSeedData.mjs'
import { run as seed } from '../../scripts/seed-convenios.mjs'
import { run as applyCorrections } from '../../scripts/apply-convenios-corrections.mjs'

type Row = Record<string, any>
const ORIGEN = [...(CONVENIOS_NACIONALES_ORIGEN as Row[]), ...(CONVENIOS_INTERNACIONALES_ORIGEN as Row[])]
const origen = (tipo: string, n: number) => ORIGEN.find((r) => r.type === tipo && r.sourceRow === n)!
const corregido = (tipo: string, n: number) => (CONVENIOS_TODOS as Row[]).find((r) => (r.original?.type ?? r.type) === tipo && r.sourceRow === n)

describe('CNV-01 correcciones: tabla revisada', () => {
  it('47 entradas; cada `antes` es el valor VERBATIM del origen y `despues` difiere', () => {
    expect(CONVENIOS_CORRECCIONES).toHaveLength(47)
    for (const c of CONVENIOS_CORRECCIONES as Row[]) {
      const o = origen(c.tipo, c.sourceRow)
      expect(o, `${c.tipo} ${c.sourceRow}`).toBeDefined()
      expect(o.year).toBe(c.year)
      expect(o[CAMPO_DATASET[c.campo as keyof typeof CAMPO_DATASET]], `${c.tipo} ${c.sourceRow} ${c.campo}`).toBe(c.antes)
      expect(c.despues).not.toBe(c.antes)
      expect(c.motivo.length).toBeGreaterThan(10)
    }
  })

  it.each([
    ['nacional', 35, 'signedMonth', '30 de Diceimbre', '30 de Diciembre'],
    ['nacional', 34, 'duration', '3Años.', '3 Años.'],
    ['nacional', 76, 'duration', '1 Años.', '1 Año.'],
    ['nacional', 75, 'title', 'Covenio de Colaboración Interinstitucional', 'Convenio de Colaboración Interinstitucional'],
    ['nacional', 76, 'title', 'Convenio de Colaboación Interinstitucional', 'Convenio de Colaboración Interinstitucional'],
    ['nacional', 59, 'title', 'Convenio Especifico de Cooperacion', 'Convenio Específico de Cooperación'],
    ['nacional', 50, 'signedMonth', 'N', null],
    ['nacional', 62, 'parties', 'Univerisdad Nacional de Concepción y la Universidad Privada del Este', 'Universidad Nacional de Concepción y la Universidad Privada del Este'],
    ['nacional', 55, 'parties', 'Universidad Nacional de Concepción y el Inatituto Nacional de Educacion Superior Dr, Raul Peña (INAES)', 'Universidad Nacional de Concepción y el Instituto Nacional de Educación Superior Dr. Raúl Peña (INAES)'],
    ['nacional', 53, 'parties', 'Universidad Públicas del Paraguay – AUPP y Universidades Nacionales', 'Universidades Públicas del Paraguay – AUPP y Universidades Nacionales'],
    ['nacional', 93, 'parties', 'Universidad Nacional de Concepción entre Minishopp Celulares &- Informática', 'Universidad Nacional de Concepción y Minishopp Celulares & Informática'],
    ['nacional', 89, 'parties', 'Universidad Nacional de Concepción entre Avanti Lavanderia', 'Universidad Nacional de Concepción y Avanti Lavanderia'],
    ['nacional', 99, 'parties', 'Universidad Nacional de Concepción y Ministerio de Justiciav (MJ)', 'Universidad Nacional de Concepción y Ministerio de Justicia (MJ)'],
    ['internacional', 41, 'parties', 'Universidad Nacional de Concepción y VNIVERSIDAD DSALAMANCA', 'Universidad Nacional de Concepción y UNIVERSIDAD DE SALAMANCA'],
    ['internacional', 43, 'parties', 'Universidad Nacional de Concepción y UNIVERSIDAD ESTADUAL DE MATO GROOSO DO SUL', 'Universidad Nacional de Concepción y UNIVERSIDAD ESTADUAL DE MATO GROSSO DO SUL'],
    ['internacional', 25, 'signedMonth', '____________', null],
    ['internacional', 29, 'duration', '____________', null],
    ['internacional', 41, 'duration', '0', null],
  ])('fixture %s fila %i %s: «%s» -> «%s»', (tipo, n, prop, antes, despues) => {
    expect(origen(tipo, n)[prop]).toBe(antes)
    expect(corregido(tipo, n)![prop]).toBe(despues)
  })

  it('finalidades: quita el prefijo «‘- » (2012 y 2014 Boquerón) y corrige solo las palabras listadas', () => {
    for (const n of [12, 31]) {
      expect(origen('nacional', n).objective.startsWith('‘- ')).toBe(true)
      expect(corregido('nacional', n)!.objective).toBe(origen('nacional', n).objective.slice(3))
    }
    expect(corregido('nacional', 66)!.objective).toContain('líneas de acción específicas para el trabajo coordinado')
    expect(corregido('nacional', 99)!.objective).toContain('en el ámbito de sus competencias')
    expect(corregido('nacional', 99)!.objective).toContain('proyectos tecnológicos')
    expect(corregido('internacional', 34)!.objective).toMatch(/^Establecer una cooperación/)
    expect(corregido('internacional', 40)!.objective).toContain('amplia y mutua cooperación')
  })

  it('no hay erratas listadas en ningún campo del dataset final ni en el payload al CMS', () => {
    const erratas =
      /Covenio|Colaboaci|Diceimbre|Univerisdad|Facultada|Secreter|Linguist|Estadistica|coordiando|lines de|carnte|transladar|S:A|\bls\b|Inatituto|Comision Nacional|Dr, Raul|Prevensi|Especifico de|&-|Justiciav|tecnógicos|ámbito e sus|Econmicas|UniversidaE|VNIVERSIDAD|DSALAMANCA|GROOSO|Estableer|mutual coop|Concepción entre/
    for (const r of CONVENIOS_TODOS as Row[]) {
      const p = toCmsPayloadConvenio(r)
      expect(JSON.stringify(p), `${r.type} ${r.sourceRow}`).not.toMatch(erratas)
      for (const v of [p.signedMonth, p.duration, p.objective].filter(Boolean)) expect(v).not.toMatch(/^(N|0|_+|[‘'’]- .*)$/s)
      expect(p.objective?.startsWith('‘- ') ?? false).toBe(false)
    }
  })

  it('ambiguos que NO se tocan: «Nacional» en Latinoamericana, «Tecnologicas» (no listado)', () => {
    expect(corregido('internacional', 21)!.parties).toContain('Universidad Nacional Latinoamericana S.C')
    expect(corregido('nacional', 70)!.parties).toContain('Tecnologicas')
  })

  it('las filas corregidas guardan la foto verbatim en `original` (solo en el dataset, no en el CMS)', () => {
    const r = corregido('nacional', 35)!
    expect(r.original).toMatchObject({ type: 'nacional', year: 2015, signedMonth: '30 de Diceimbre', title: origen('nacional', 35).title })
    expect(corregido('nacional', 1)!.original).toBeUndefined()
    expect(Object.keys(toCmsPayloadConvenio(r))).not.toContain('original')
    expect(JSON.stringify(toCmsPayloadConvenio(r))).not.toContain('Diceimbre')
  })

  it('aplicarCapaCorrecciones lanza si `antes` no coincide y no muta la entrada', () => {
    const nacionales = (CONVENIOS_NACIONALES_ORIGEN as Row[]).map((r) => (r.sourceRow === 35 ? { ...r, signedMonth: '30 de Diciembre' } : r))
    expect(() => aplicarCapaCorrecciones({ nacionales, internacionales: CONVENIOS_INTERNACIONALES_ORIGEN })).toThrow(/no coincide/)
    expect(origen('nacional', 35).signedMonth).toBe('30 de Diceimbre')
  })
})

describe('CNV-01 duplicado y reclasificación', () => {
  it('el duplicado 2016 (fila 40) queda excluido; la fila 38 se conserva; el seed no lo recrea', () => {
    expect(CONVENIOS_DUPLICADOS_EXCLUIDOS).toHaveLength(1)
    const d = CONVENIOS_DUPLICADOS_EXCLUIDOS[0] as Row
    expect(d).toMatchObject({ tipo: 'nacional', sourceRow: 40, year: 2016, duplicaDe: { tipo: 'nacional', sourceRow: 38 } })
    expect(d.motivo).toMatch(/duplicado/i)
    expect(origen('nacional', 40).driveFileId).toBeNull()
    expect(origen('nacional', 38).driveFileId).toBeNull()
    const dup = (CONVENIOS_TODOS as Row[]).filter((r) => r.year === 2016 && String(r.parties).includes('Asociación de Docentes'))
    expect(dup.map((r) => r.sourceRow)).toEqual([38])
  })

  it('la UFGD 2009 pasa a internacional con procedencia, enlace, categoría y orden propio', () => {
    expect(CONVENIOS_RECLASIFICADOS).toHaveLength(1)
    const u = (CONVENIOS_INTERNACIONALES as Row[]).find((r) => r.year === 2009)!
    expect(u).toMatchObject({ type: 'internacional', reclasificadoDesde: 'nacional', sourceRow: 5, categoria: 'institucional', orden: 1 })
    expect(u.original.type).toBe('nacional')
    expect(u.parties).toContain('Universidade Federal da Grande Dourados')
    expect(u.linkUrl).toBe(origen('nacional', 5).linkUrl)
    expect(toCmsPayloadConvenio(u)).toMatchObject({ type: 'internacional', year: 2009, orden: 1 })
    expect((CONVENIOS_NACIONALES as Row[]).some((r) => /Dourados/.test(r.parties))).toBe(false)
  })

  it('conteos finales: 104 nacionales, 45 internacionales, 149; claves naturales únicas', () => {
    const nac = CONVENIOS_NACIONALES as Row[]
    const intl = CONVENIOS_INTERNACIONALES as Row[]
    expect(nac).toHaveLength(104)
    expect(intl).toHaveLength(45)
    expect(CONVENIOS_TODOS).toHaveLength(149)
    expect(nac.every((r) => r.type === 'nacional')).toBe(true)
    expect(intl.every((r) => r.type === 'internacional')).toBe(true)
    expect(new Set((CONVENIOS_TODOS as Row[]).map((r) => `${r.type}|${r.year}|${r.title}|${r.parties}`)).size).toBe(149)
    const perCat: Record<string, number> = {}
    for (const r of nac) perCat[r.categoria] = (perCat[r.categoria] ?? 0) + 1
    expect(perCat).toEqual({ institucional: 76, beneficios: 28 })
    const intlYears = [...new Set(intl.map((r) => r.year))].sort()
    expect(intlYears[0]).toBe(2009)
  })
})

const env = { CMS_EMAIL: 'qa@example.invalid', CMS_PASSWORD: 'Clave-Local-Segura-93' }
const quiet = () => {}

/** CMS simulado con PATCH/DELETE/GET por clave natural y por id. */
function fakeCms(initial: Row[], opts: { deleteForbiddenOnce?: boolean } = {}) {
  const store: Row[] = initial.map((d, i) => ({ id: 700 + i, ...d }))
  const writes: string[] = []
  let forbidden = opts.deleteForbiddenOnce ?? false
  const fetchFn = vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input))
    const method = init?.method ?? 'GET'
    const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status })
    if (url.pathname === '/api/users/login') return json({ token: 't' })
    if (url.pathname === '/api/convenios' && method === 'GET') {
      const sp = url.searchParams
      const docs = store.filter(
        (d) =>
          d.type === sp.get('where[type][equals]') &&
          d.year === Number(sp.get('where[year][equals]')) &&
          d.title === sp.get('where[title][equals]') &&
          d.parties === sp.get('where[parties][equals]'),
      )
      return json({ docs })
    }
    const m = url.pathname.match(/^\/api\/convenios\/(\d+)$/)
    if (m && method === 'PATCH') {
      const d = store.find((x) => String(x.id) === m[1])!
      Object.assign(d, JSON.parse(String(init?.body)))
      writes.push(`PATCH ${m[1]} ${init?.body}`)
      return json({ doc: d })
    }
    if (m && method === 'DELETE') {
      if (forbidden) {
        forbidden = false
        return json({ errors: [{ message: 'forbidden' }] }, 403)
      }
      const i = store.findIndex((x) => String(x.id) === m[1])
      writes.push(`DELETE ${m[1]}`)
      const [d] = store.splice(i, 1)
      return json({ doc: d })
    }
    writes.push(`${method} ${url.pathname}`)
    return json({ error: 'no' }, 404)
  })
  return { store, writes, fetchFn }
}

/** Filas tal como el seed original las dejó en la BD (valores verbatim). */
const dbDesdeOrigen = (extra: Record<string, Row> = {}) =>
  ORIGEN.map((r) => ({
    type: r.type,
    year: r.year,
    title: r.title,
    parties: r.parties,
    signedMonth: r.signedMonth ?? undefined,
    duration: r.duration ?? undefined,
    objective: r.objective ?? undefined,
    driveUrl: r.linkUrl ?? undefined,
    nota: r.nota ?? undefined,
    categoria: r.categoria,
    orden: r.orden,
    active: true,
    ...(extra[`${r.type}#${r.sourceRow}`] ?? {}),
  }))

describe('CNV-01 seed tras las correcciones', () => {
  it('--dry-run: 149 filas (104 + 45), 76 + 28 + 45 institucionales/beneficios, sin red', async () => {
    const fetchFn = vi.fn()
    const r = await seed({ dryRun: true, deps: { env: {}, fetch: fetchFn, log: quiet, pace: async () => {} } })
    expect(fetchFn).not.toHaveBeenCalled()
    expect(r.plan).toMatchObject({ convenios: 149, perType: { nacional: 104, internacional: 45 }, perCategoria: { institucional: 121, beneficios: 28 } })
  })

  it('no recrea los originales: una BD con los valores verbatim cuenta como existente (0 creados)', async () => {
    const cms = fakeCms(dbDesdeOrigen())
    const r = await seed({ deps: { env, fetch: cms.fetchFn, log: quiet, pace: async () => {} } })
    // 149 filas del dataset coinciden por su clave original; las 2 excluidas/movidas no se vuelven a crear.
    expect(r.counts).toMatchObject({ creados: 0, errores: 0 })
    expect(cms.writes).toEqual([])
  })
})

describe('CNV-01 aplicación en la BD (scripts/apply-convenios-corrections.mjs)', () => {
  const deps = (cms: ReturnType<typeof fakeCms>) => ({ env, fetch: cms.fetchFn, log: quiet, pace: async () => {} })

  it('--dry-run no usa red y resume el plan', async () => {
    const fetchFn = vi.fn()
    const r = await applyCorrections({ dryRun: true, deps: { env: {}, fetch: fetchFn, log: quiet, pace: async () => {} } })
    expect(fetchFn).not.toHaveBeenCalled()
    expect(r.plan).toMatchObject({ filasConCorrecciones: 43, camposCorregidos: 47, reclasificaciones: 1, duplicados: 1 })
  })

  it('rechaza destino remoto sin --allow-remote, http remoto y exige contraseña fuerte', async () => {
    const fetchFn = vi.fn()
    const d = { env: { ...env, CMS_URL: 'https://cms.example.invalid' }, fetch: fetchFn, log: quiet, pace: async () => {} }
    await expect(applyCorrections({ deps: d })).rejects.toThrow(/local/)
    await expect(applyCorrections({ allowRemote: true, deps: { ...d, env: { ...env, CMS_URL: 'http://cms.example.invalid' } } })).rejects.toThrow(/https/)
    await expect(applyCorrections({ deps: { ...d, env: { CMS_EMAIL: 'qa@example.invalid' } } })).rejects.toThrow(/CMS_PASSWORD/)
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('corrige solo los campos listados, mueve la UFGD, borra solo el duplicado y no toca active/categoría/nota/enlace', async () => {
    const cms = fakeCms(dbDesdeOrigen({ 'nacional#35': { active: false, nota: 'Nota del PO' } }))
    const r = await applyCorrections({ deps: deps(cms) })
    expect(r.counts).toMatchObject({ filasCorregidas: 43, camposCorregidos: 47, movidas: 1, borradas: 1, errores: 0 })
    const f35 = cms.store.find((d) => d.year === 2015 && d.signedMonth === '30 de Diciembre')!
    expect(f35).toMatchObject({ active: false, nota: 'Nota del PO' })
    // Campos vacíos -> null.
    expect(cms.store.find((d) => d.year === 2018 && d.title === 'Convenio Interinstitucional.' && d.duration === '5 Años.' && /Gobierno Departamental/.test(d.parties))!.signedMonth).toBeNull()
    // Movida: sigue con enlace, categoría y ahora internacional con orden 1.
    const ufgd = cms.store.find((d) => d.year === 2009 && /Dourados/.test(d.parties))!
    expect(ufgd).toMatchObject({ type: 'internacional', orden: 1, categoria: 'institucional' })
    expect(ufgd.driveUrl).toMatch(/^https:\/\/drive\.google\.com\//)
    // Duplicado borrado, la fila 38 sigue.
    expect(cms.store.filter((d) => d.year === 2016 && /Asociación de Docentes/.test(d.parties))).toHaveLength(1)
    expect(cms.writes.filter((w) => w.startsWith('DELETE'))).toHaveLength(1)
    // Ningún PATCH envía campos protegidos (el de la UFGD envía tipo y orden por ser el traslado).
    for (const w of cms.writes.filter((x) => x.startsWith('PATCH'))) {
      const body = JSON.parse(w.split(' ').slice(2).join(' '))
      for (const k of ['active', 'categoria', 'nota', 'driveUrl']) expect(Object.keys(body)).not.toContain(k)
    }
  })

  it('segunda ejecución: 0 cambios; una fila editada por el PO se omite y se informa', async () => {
    const cms = fakeCms(dbDesdeOrigen({ 'nacional#52': { parties: 'Universidad Nacional de Concepción y la CONATEL (editado por el PO)' }, 'nacional#34': { duration: '3 años (PO)' } }))
    const first = await applyCorrections({ deps: deps(cms) })
    expect(first.counts).toMatchObject({ omitidasPorEdicion: 1, noEncontradas: 1 })
    expect(cms.store.some((d) => d.parties === 'Universidad Nacional de Concepción y la CONATEL (editado por el PO)')).toBe(true)
    expect(cms.store.some((d) => d.duration === '3 años (PO)')).toBe(true)
    const before = cms.writes.length
    const second = await applyCorrections({ deps: deps(cms) })
    expect(second.counts).toMatchObject({ camposCorregidos: 0, movidas: 0, borradas: 0, errores: 0 })
    expect(cms.writes.length).toBe(before)
  })

  it('no borra un duplicado que tenga enlace, y reintenta una vez ante 403', async () => {
    const conEnlace = fakeCms(dbDesdeOrigen({ 'nacional#40': { driveUrl: 'https://drive.google.com/file/d/ELEGIDO_POR_EL_PO/view' } }))
    const a = await applyCorrections({ deps: deps(conEnlace) })
    expect(a.counts.borradas).toBe(0)
    expect(a.counts.duplicadosConEnlace).toBe(1)
    const flaky = fakeCms(dbDesdeOrigen(), { deleteForbiddenOnce: true })
    const b = await applyCorrections({ deps: deps(flaky) })
    expect(b.counts).toMatchObject({ borradas: 1, errores: 0 })
  })

  it('el guion no contiene contraseñas literales y usa requireCmsPassword', () => {
    const src = readFileSync(resolve(process.cwd(), 'scripts/apply-convenios-corrections.mjs'), 'utf8')
    expect(src).not.toMatch(/CMS_PASSWORD\s*(\|\||\?\?)/)
    expect(src).not.toMatch(/CMS_EMAIL\s*(\|\||\?\?)\s*['"][^'"]/)
    expect(src).toContain('requireCmsPassword')
  })
})
