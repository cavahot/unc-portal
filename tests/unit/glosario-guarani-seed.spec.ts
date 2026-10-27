// GLO-GN-01: parser CSV, dataset generado desde el glosario del PO y siembra idempotente.
// Spec: docs/specs/i18n/GLOSARIO-GUARANI.md §3 y escenario 8.
// Amenazas: (1) CSV con comillas/BOM mal partido (columnas corridas); (2) un corpus marcado como oficial;
// (3) sembrar en un CMS remoto o con contraseña literal; (4) duplicar o pisar filas revisadas por el PO;
// (5) dataset editado a mano que se aparte del CSV.
// Límite: CMS simulado; la ejecución real contra localhost se registra en el informe de entrega.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { parseCsv, parseCsvRecords } from '../../scripts/lib/csvParse.mjs'
import { buildSeed, renderModule, toSeedEntry, DEFAULT_CSV } from '../../scripts/lib/generate-glosario-gn-seed.mjs'
import { GLOSARIO_GN_META, GLOSARIO_GN_SEED } from '../../scripts/lib/glosarioGnSeedData.mjs'
import { run } from '../../scripts/seed-glosario-guarani.mjs'

const STRONG = 'Clave-Local-Segura-93'
const ROOT = process.cwd()

describe('csvParse', () => {
  it('BOM, comillas con coma, comilla escapada y salto de línea interno', () => {
    const rows = parseCsv('﻿a,b,c\r\n1,"x, y","di ""hola"""\n2,"línea\nnueva",\n')
    expect(rows).toEqual([
      ['a', 'b', 'c'],
      ['1', 'x, y', 'di "hola"'],
      ['2', 'línea\nnueva', ''],
    ])
  })
  it('registros con cabecera; rechaza columnas corridas y comillas sin cerrar (negativos)', () => {
    expect(parseCsvRecords('a,b\n1,2\n')).toEqual([{ a: '1', b: '2' }])
    expect(() => parseCsvRecords('a,b\n1,2,3\n')).toThrow(/celdas/)
    expect(() => parseCsv('a,"b\n')).toThrow(/sin cerrar/)
  })
})

const rec = (o: Record<string, string>) => ({
  termino_es: 'x', termino_gn: '', variantes_gn: '', tipo: 'corpus', fuente: '', url: '', confianza: 'X', nota: '', ...o,
})

describe('generador del dataset', () => {
  it('URL oficial → fuenteUrl + oficial; corpus → evidenciaUrl sin oficial', () => {
    const a = toSeedEntry(rec({ termino_es: 'profesor', termino_gn: "mbo'ehára", tipo: 'diccionario', confianza: 'A', fuente: 'SPL', url: 'https://www.datos.gov.py/dataset/x' }))
    expect(a).toMatchObject({ oficial: true, fuenteUrl: 'https://www.datos.gov.py/dataset/x', origen: 'glosario-po', revisado: false })
    expect(a).not.toHaveProperty('evidenciaUrl')
    const b = toSeedEntry(rec({ url: 'https://github.com/pln-fing-udelar/jojajovai', confianza: 'B' }))
    expect(b).toMatchObject({ oficial: false, evidenciaUrl: 'https://github.com/pln-fing-udelar/jojajovai' })
    expect(b).not.toHaveProperty('fuenteUrl')
    expect(b.fuente).toBe('Sin evidencia')
  })
  it('variantes separadas por «;», puso unificado y tipo/confianza desconocidos rechazados', () => {
    const e = toSeedEntry(rec({ variantes_gn: "karameg̃uaꞌi ; ñanduti ;", confianza: 'B' }))
    expect(e.variantesGn).toEqual([{ valor: "karameg̃ua'i" }, { valor: 'ñanduti' }])
    expect(() => toSeedEntry(rec({ tipo: 'inventado' }))).toThrow(/Tipo/)
    expect(() => toSeedEntry(rec({ confianza: 'Z' }))).toThrow(/Confianza/)
  })
  it('determinista y con cabecera de procedencia', () => {
    const csv = 'termino_es,termino_gn,variantes_gn,tipo,fuente,url,confianza,nota\nprofesor,mbo\'ehára,,diccionario,SPL,https://www.datos.gov.py/x,A,\n'
    const a = renderModule(buildSeed(csv, { fileName: 'g.csv', fecha: '2026-10-11' }))
    expect(renderModule(buildSeed(csv, { fileName: 'g.csv', fecha: '2026-10-11' }))).toBe(a)
    expect(a).toMatch(/Procedencia: g\.csv .*2026-10-11, 1 filas/)
    expect(() => buildSeed(csv + 'profesor,x,,diccionario,SPL,,A,\n')).toThrow(/repetida/)
  })
  it('la ruta del PO solo aparece como valor por defecto documentado del argumento --csv', () => {
    expect(DEFAULT_CSV).toMatch(/Traduccion_Guarani\\glosario_es_gn\.csv$/)
    for (const f of ['scripts/seed-glosario-guarani.mjs', 'scripts/lib/glosarioGnSeedData.mjs', 'scripts/update-glosario-guarani.mjs']) {
      expect(readFileSync(resolve(ROOT, f), 'utf8')).not.toMatch(/Downloads\\\\?PoblacionAUPP/)
    }
  })
})

type Entry = { terminoEs: string; fuente: string; confianza: string; oficial: boolean; terminoGn: string; fuenteUrl?: string; evidenciaUrl?: string }
const seed = GLOSARIO_GN_SEED as Entry[]

describe('dataset versionado (128 filas del PO)', () => {
  it('128 filas, A=32 B=47 C=10 X=39 y claves únicas', () => {
    expect(GLOSARIO_GN_META.filas).toBe(128)
    expect(seed).toHaveLength(128)
    const count = (c: string) => seed.filter((e) => e.confianza === c).length
    expect([count('A'), count('B'), count('C'), count('X')]).toEqual([32, 47, 10, 39])
    expect(new Set(seed.map((e) => `${e.terminoEs}|${e.fuente}`)).size).toBe(128)
  })
  it('ninguna fila oficial con host no oficial; Jojajovai nunca es oficial', () => {
    for (const e of seed) {
      if (e.oficial) expect(e.fuenteUrl, e.terminoEs).toMatch(/^https:\/\/(www\.datos\.gov\.py|repositorio\.conacyt\.gov\.py)\//)
      if ((e.evidenciaUrl ?? '').includes('github.com')) expect(e.oficial).toBe(false)
    }
  })
  it('X = sin forma guaraní (no se inventa)', () => {
    for (const e of seed.filter((x) => x.confianza === 'X' && x.terminoEs !== 'evidencia')) expect(e.terminoGn, e.terminoEs).toBe('')
  })
})

/** CMS simulado en memoria con la API REST mínima que usa la siembra. */
function fakeCms(existing: Array<Record<string, unknown>> = []) {
  const rows = [...existing]
  const calls: string[] = []
  const fetch = async (url: string, init: { method?: string; body?: string } = {}) => {
    const u = new URL(url)
    calls.push(`${init.method ?? 'GET'} ${u.pathname}`)
    const json = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body })
    if (u.pathname === '/api/users/login') return json(200, { token: 't' })
    if (init.method === 'GET' || !init.method) {
      const t = u.searchParams.get('where[terminoEs][equals]')
      const f = u.searchParams.get('where[fuente][equals]')
      return json(200, { docs: rows.filter((r) => r.terminoEs === t && r.fuente === f) })
    }
    if (init.method === 'POST') {
      rows.push(JSON.parse(init.body!))
      return json(201, { doc: {} })
    }
    return json(405, {})
  }
  return { rows, calls, fetch }
}

describe('siembra', () => {
  const env = { CMS_EMAIL: 'qa@example.invalid', CMS_PASSWORD: STRONG }
  const deps = (cms: ReturnType<typeof fakeCms>, extra = {}) => ({ env, fetch: cms.fetch as never, log: () => {}, pace: async () => {}, ...extra })

  it('dry-run no hace red', async () => {
    const cms = fakeCms()
    const r = await run({ dryRun: true, deps: deps(cms) })
    expect(r).toMatchObject({ dryRun: true, plan: { entradas: 128 } })
    expect(cms.calls).toEqual([])
  })
  it('dos ejecuciones: 128 creadas y luego 0 (idempotente)', async () => {
    const cms = fakeCms()
    expect((await run({ deps: deps(cms) })).counts).toMatchObject({ creados: 128, existentes: 0 })
    expect((await run({ deps: deps(cms) })).counts).toMatchObject({ creados: 0, existentes: 128 })
    expect(cms.calls.filter((c) => c.startsWith('PATCH'))).toEqual([])
  })
  it('una fila revisada por el PO no se modifica', async () => {
    const cms = fakeCms([{ terminoEs: seed[0].terminoEs, fuente: seed[0].fuente, terminoGn: 'corregido', revisado: true }])
    const r = await run({ deps: deps(cms) })
    expect(r.counts).toMatchObject({ creados: 127, existentes: 1, existentesRevisados: 1 })
    expect(cms.rows[0].terminoGn).toBe('corregido')
  })
  it('rechaza CMS remoto, http remoto y contraseña ausente o débil (negativos)', async () => {
    const cms = fakeCms()
    await expect(run({ deps: deps(cms, { env: { ...env, CMS_URL: 'https://cms.unc.edu.py' } }) })).rejects.toThrow(/solo escribe en un CMS local/)
    await expect(run({ allowRemote: true, deps: deps(cms, { env: { ...env, CMS_URL: 'http://cms.example' } }) })).rejects.toThrow(/https/)
    await expect(run({ deps: deps(cms, { env: { CMS_EMAIL: 'x@example.invalid' } }) })).rejects.toThrow(/CMS_PASSWORD/)
    await expect(run({ deps: deps(cms, { env: { CMS_EMAIL: 'x@example.invalid', CMS_PASSWORD: 'admin' } }) })).rejects.toThrow(/CMS_PASSWORD/)
    expect(cms.calls).toEqual([])
  })
})
