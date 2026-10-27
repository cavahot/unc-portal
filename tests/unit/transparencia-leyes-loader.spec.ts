// TRANS-01: cargador scripts/seed-transparencia-leyes.mjs (spec docs/specs/portal/TRANSPARENCIA-LEYES.md §2.3,
// escenarios 11-12). Amenazas: (1) insertar enlaces de relleno (REEMPLAZAR/EJEMPLO) o fuera de la allowlist;
// (2) escribir en un CMS equivocado o con credencial débil; (3) duplicar al re-ejecutar o pisar ediciones del PO;
// (4) que el dry-run toque la red; (5) cargar por error las filas EJEMPLO de la plantilla.
// Límite: CMS simulado en memoria; no ejecuta Payload.
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { TRANSPARENCIA_ITEMS } from '../../scripts/seed-transparencia-items.mjs'
import { LEY_CATEGORIAS, buildNaturalKey, parseRows, run, validateRow } from '../../scripts/seed-transparencia-leyes.mjs'

const GOOD = 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUv/view'
const STRONG = 'Clave-Local-Segura-93'
const env = { CMS_EMAIL: 'qa@example.invalid', CMS_PASSWORD: STRONG, CMS_URL: 'http://localhost:3002' }
const CSV_HEAD = 'ley,categoria,periodo,descripcion,url,orden\n'

function fakeCms(existing: Array<Record<string, unknown>> = []) {
  const store = existing.map((d, i) => ({ id: 500 + i, ...d }))
  const writes: string[] = []
  const fetchFn = vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input))
    const method = init?.method ?? 'GET'
    const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status })
    if (url.pathname === '/api/users/login') return json({ token: 't' })
    if (url.pathname === '/api/transparencia-items' && method === 'GET') {
      const docs = Object.entries(TRANSPARENCIA_ITEMS).flatMap(([ley, items]) =>
        (items as Array<{ codigo: string; titulo: string }>).map((it, i) => ({ id: Number(ley) * 100 + i, ley, codigo: it.codigo, titulo: it.titulo })),
      )
      return json({ docs })
    }
    const m = url.pathname.match(/^\/api\/(ley5189|ley5282)$/)
    if (m && method === 'GET') {
      const k = url.searchParams.get('where[naturalKey][equals]')
      return json({ docs: store.filter((d) => d.__col === m[1] && d.naturalKey === k) })
    }
    if (m && method === 'POST') {
      const body = JSON.parse(String(init?.body))
      // El servidor calcula la clave natural (hook beforeValidate del CMS); aquí se simula con la misma función.
      // Simula el hook del CMS: `category` sale del ítem y `naturalKey` se calcula en el servidor.
      const itemCodigo = (Object.entries(TRANSPARENCIA_ITEMS).flatMap(([ley, items]) => (items as Array<{ codigo: string }>).map((it, i) => ({ id: Number(ley) * 100 + i, codigo: it.codigo }))).find((x) => x.id === body.item) ?? { codigo: '?' }).codigo
      store.push({ id: 900 + store.length, __col: m[1], naturalKey: buildNaturalKey({ ...body, category: itemCodigo }), ...body })
      writes.push(`POST ${m[1]} ${itemCodigo}`)
      return json({ doc: body }, 201)
    }
    return json({}, 404)
  })
  return { fetchFn, writes, store }
}
const deps = (f: ReturnType<typeof fakeCms>, log: string[] = []) => ({ env, fetch: f.fetchFn as never, log: (m: string) => log.push(m), pace: async () => undefined })

describe('TRANS-01 cargador: categorías y validación', () => {
  it('el catálogo inicial del cargador sale de la lista oficial de ítems (una sola fuente)', () => {
    expect(LEY_CATEGORIAS['5189'].map((c: { value: string }) => c.value)).toEqual(TRANSPARENCIA_ITEMS['5189'].map((i: { codigo: string }) => i.codigo))
    expect(LEY_CATEGORIAS['5282'].map((c: { value: string }) => c.value)).toEqual(TRANSPARENCIA_ITEMS['5282'].map((i: { codigo: string }) => i.codigo))
  })
  it('con un catálogo del CMS resuelve por código o título (incluye ítems agregados por el PO) y devuelve el id', () => {
    const catalogo = { 5189: [], 5282: [{ value: 'item-18', label: 'Ítem nuevo del PO', id: 77 }] }
    const r = { ley: '5282', categoria: 'item nuevo del PO', periodo: '2024', descripcion: '', url: GOOD, orden: '' }
    expect(validateRow(r, 2, catalogo)).toMatchObject({ ok: true, row: { category: 'item-18', itemId: 77 } })
    expect(validateRow({ ...r, categoria: 'item-8' }, 2, catalogo).ok).toBe(false)
  })
  const ok = { ley: '5189', categoria: 'organigrama', periodo: '2024', descripcion: '', url: GOOD, orden: '1' }
  it('acepta slug o nombre oficial (sin acentos/mayúsculas) y normaliza', () => {
    expect(validateRow(ok, 2)).toMatchObject({ ok: true, row: { collection: 'ley5189', category: 'organigrama', period: '2024', order: 1 } })
    expect(validateRow({ ...ok, categoria: 'NOMINA del personal' }, 2)).toMatchObject({ ok: true, row: { category: 'nomina-personal' } })
    expect(validateRow({ ...ok, ley: '5282', categoria: 'Informes de auditoría' }, 2)).toMatchObject({ ok: true, row: { collection: 'ley5282', category: 'item-8' } })
    expect(validateRow({ ...ok, orden: '' }, 2)).toMatchObject({ ok: true, row: { order: 0 } })
  })
  it.each([
    ['ley desconocida', { ley: '9999' }],
    ['categoría de la otra ley', { categoria: 'item-3' }],
    ['período vacío', { periodo: ' ' }],
    ['url vacía', { url: '' }],
    ['url http', { url: 'http://drive.google.com/file/d/x/view' }],
    ['host ajeno', { url: 'https://evil.example/a.pdf' }],
    ['placeholder REEMPLAZAR', { url: 'https://drive.google.com/drive/folders/REEMPLAZAR' }],
    ['placeholder EJEMPLO', { url: 'https://drive.google.com/file/d/EJEMPLO-no-cargar/view' }],
    ['descripción EJEMPLO', { descripcion: 'EJEMPLO: no cargar' }],
    ['orden no numérico', { orden: 'abc' }],
  ])('rechaza %s', (_n, over) => {
    const r = validateRow({ ...ok, ...over }, 7)
    expect(r.ok).toBe(false)
    expect((r as { error: string }).error).toMatch(/fila 7/i)
  })
  it('parseRows lee CSV con comillas y JSON arreglo', () => {
    const csv = `${CSV_HEAD}5189,organigrama,2024,"Res. 1, anexo",${GOOD},1\n`
    expect(parseRows(csv, 'a.csv')[0]).toMatchObject({ descripcion: 'Res. 1, anexo', url: GOOD })
    expect(parseRows(JSON.stringify([{ ley: '5189', categoria: 'organigrama', periodo: '1', url: GOOD }]), 'a.json')).toHaveLength(1)
    expect(() => parseRows('{"x":1}', 'a.json')).toThrow()
  })
})

describe('TRANS-01 cargador: ejecución', () => {
  const csv = `${CSV_HEAD}5189,organigrama,2024,,${GOOD},1\n5282,item-8,2023,Informe anual,${GOOD},1\n5282,item-9,2023,,http://malo.example/x,1\n`
  it('dry-run por defecto: sin red, informa conteos y errores', async () => {
    const f = fakeCms()
    const log: string[] = []
    const r = await run({ text: csv, fileName: 'a.csv', deps: deps(f, log) })
    expect(f.fetchFn).not.toHaveBeenCalled()
    expect(r).toMatchObject({ dryRun: true, counts: { validas: 2, errores: 1 } })
    expect(log.join('\n')).toMatch(/fila 4/i)
  })
  it('--apply crea las válidas, omite las existentes y reporta errores; segundo run = 0 creados', async () => {
    const f = fakeCms()
    const log: string[] = []
    const r1 = await run({ text: csv, fileName: 'a.csv', apply: true, deps: deps(f, log) })
    expect(r1.counts).toEqual({ creados: 2, omitidos: 0, errores: 1 })
    expect(f.writes).toEqual(['POST ley5189 organigrama', 'POST ley5282 item-8'])
    const r2 = await run({ text: csv, fileName: 'a.csv', apply: true, deps: deps(f, log) })
    expect(r2.counts).toEqual({ creados: 0, omitidos: 2, errores: 1 })
    expect(f.writes).toHaveLength(2)
  })
  it('el payload enviado no incluye naturalKey (lo calcula el servidor) y respeta active', async () => {
    const f = fakeCms()
    await run({ text: csv, fileName: 'a.csv', apply: true, deps: deps(f) })
    const post = f.fetchFn.mock.calls.find((c) => (c[1] as RequestInit | undefined)?.method === 'POST' && String(c[0]).includes('ley5189'))!
    const body = JSON.parse(String((post[1] as RequestInit).body))
    expect(body).toMatchObject({ item: 518900, period: '2024', driveUrl: GOOD, order: 1, active: true })
    expect('category' in body).toBe(false)
    expect('naturalKey' in body).toBe(false)
  })
  it('rechaza destino remoto sin --allow-remote, credencial débil y falta de correo', async () => {
    const f = fakeCms()
    await expect(run({ text: csv, fileName: 'a.csv', apply: true, deps: { ...deps(f), env: { ...env, CMS_URL: 'https://cms.example' } } })).rejects.toThrow(/local/i)
    await expect(run({ text: csv, fileName: 'a.csv', apply: true, deps: { ...deps(f), env: { ...env, CMS_PASSWORD: 'admin' } } })).rejects.toThrow(/CMS_PASSWORD/)
    await expect(run({ text: csv, fileName: 'a.csv', apply: true, deps: { ...deps(f), env: { ...env, CMS_EMAIL: '' } } })).rejects.toThrow(/CMS_EMAIL/)
    expect(f.fetchFn).not.toHaveBeenCalled()
  })
})

describe('TRANS-01: plantilla y retiro de los seeds antiguos', () => {
  const root = process.cwd()
  it('la plantilla tiene la cabecera y filas EJEMPLO que el cargador rechaza', () => {
    const text = readFileSync(resolve(root, 'docs/specs/portal/plantilla-transparencia-leyes.csv'), 'utf8')
    expect(text.split(/\r?\n/)[0].replace(/^﻿/, '')).toBe('ley,categoria,periodo,descripcion,url,orden')
    const rows = parseRows(text, 'plantilla.csv')
    expect(rows).toHaveLength(2)
    for (const [i, r] of rows.entries()) {
      expect(JSON.stringify(r)).toMatch(/EJEMPLO/)
      expect(validateRow(r, i + 2).ok).toBe(false)
    }
  })
  it('los seeds con enlace REEMPLAZAR ya no existen', () => {
    expect(existsSync(resolve(root, 'scripts/seed-ley5189.mjs'))).toBe(false)
    expect(existsSync(resolve(root, 'scripts/seed-ley5282.mjs'))).toBe(false)
    expect(existsSync(resolve(root, 'apps/cms/scripts/seed/transparencia.ts'))).toBe(false)
  })
})
