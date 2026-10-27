// ARR-01: módulo puro de /aranceles-rectorado (spec docs/specs/portal/ARANCELES-RECTORADO.md §2 y escenarios 8–10).
// Amenazas: (1) mostrar montos mal formateados según el ICU del motor (un «50000» o «50,000» se lee como otro
// importe); (2) que una fila corrupta del CMS (monto negativo, decimal, grupo desconocido) llegue a la página;
// (3) un orden distinto al oficial. Límite: funciones puras; no prueba la red ni el CMS.
import { describe, expect, it } from 'vitest'
import {
  GRUPO_ORDER,
  MAX_MONTO,
  filterArancelGroups,
  formatGuaranies,
  formatMonto,
  groupAranceles,
  latestUpdatedAt,
  mapAranceles,
} from '@/lib/cms/aranceles'

const row = (over: Record<string, unknown> = {}) => ({
  id: 1,
  concepto: 'Constancias Varias',
  monto: 50000,
  grupo: 'venta',
  orden: 1,
  updatedAt: '2026-10-20T12:00:00.000Z',
  ...over,
})

describe('ARR-01: formatGuaranies / formatMonto', () => {
  it.each([
    [0, '0'],
    [999, '999'],
    [1000, '1.000'],
    [50000, '50.000'],
    [100000, '100.000'],
    [2500000, '2.500.000'],
    [100000000, '100.000.000'],
  ])('%i -> %s (separador de miles «.» sin depender del ICU)', (n, s) => {
    expect(formatGuaranies(n)).toBe(s)
  })

  it('formatMonto antepone «Gs.» con espacio duro', () => {
    expect(formatMonto(50000)).toBe('Gs. 50.000')
  })

  it('no depende de toLocaleString (resultado igual aunque el motor no tenga datos es-PY)', () => {
    const original = Number.prototype.toLocaleString
    Number.prototype.toLocaleString = function () {
      return 'ROTO'
    }
    try {
      expect(formatGuaranies(1234567)).toBe('1.234.567')
    } finally {
      Number.prototype.toLocaleString = original
    }
  })
})

describe('ARR-01: mapAranceles', () => {
  it('acepta filas válidas y normaliza orden por defecto', () => {
    const out = mapAranceles([row(), row({ id: 2, orden: null })])
    expect(out).toHaveLength(2)
    expect(out[0]).toEqual({ id: 1, concepto: 'Constancias Varias', monto: 50000, grupo: 'venta', orden: 1, updatedAt: '2026-10-20T12:00:00.000Z' })
    expect(out[1].orden).toBe(99)
  })

  it.each([
    ['monto negativo', { monto: -1 }],
    ['monto decimal', { monto: 1500.5 }],
    ['monto excesivo', { monto: MAX_MONTO + 1 }],
    ['monto texto', { monto: '50000' }],
    ['grupo desconocido', { grupo: 'otros' }],
    ['concepto vacío', { concepto: '   ' }],
    ['sin id', { id: undefined }],
  ])('descarta %s', (_n, over) => {
    expect(mapAranceles([row(over)])).toEqual([])
  })

  it('una respuesta que no es lista devuelve []', () => {
    expect(mapAranceles(null)).toEqual([])
    expect(mapAranceles({ docs: [] })).toEqual([])
  })

  it('recorta espacios del concepto', () => {
    expect(mapAranceles([row({ concepto: '  Legalizaciones ' })])[0].concepto).toBe('Legalizaciones')
  })
})

describe('ARR-01: groupAranceles', () => {
  it('orden canónico multas → venta → educativos, por orden y luego por concepto; omite grupos vacíos', () => {
    const items = mapAranceles([
      row({ id: 1, grupo: 'educativos', orden: 2, concepto: 'B' }),
      row({ id: 2, grupo: 'multas', orden: 1, concepto: 'M', monto: 10000 }),
      row({ id: 3, grupo: 'educativos', orden: 1, concepto: 'Z', monto: 300000 }),
      row({ id: 4, grupo: 'educativos', orden: 2, concepto: 'A', monto: 2500000 }),
    ])
    const groups = groupAranceles(items)
    expect(GRUPO_ORDER).toEqual(['multas', 'venta', 'educativos'])
    expect(groups.map((g) => g.grupo)).toEqual(['multas', 'educativos'])
    expect(groups[1].items.map((i) => i.concepto)).toEqual(['Z', 'A', 'B'])
    expect(groups[1]).toMatchObject({ min: 50000, max: 2500000 })
    expect(groups[0]).toMatchObject({ min: 10000, max: 10000 })
  })
})

describe('ARR-01: latestUpdatedAt', () => {
  it('devuelve la fecha más reciente válida o null', () => {
    const items = mapAranceles([
      row({ id: 1, updatedAt: '2026-10-20T12:00:00.000Z' }),
      row({ id: 2, updatedAt: '2026-10-24T08:30:00.000Z' }),
      row({ id: 3, updatedAt: 'no-es-fecha' }),
    ])
    expect(latestUpdatedAt(items)).toBe('2026-10-24T08:30:00.000Z')
    expect(latestUpdatedAt([])).toBeNull()
  })
})

describe('ARR-01: filterArancelGroups', () => {
  const groups = groupAranceles(
    mapAranceles([
      row({ id: 1, grupo: 'educativos', concepto: 'Matrícula Post Grado en Didáctica p/ Educación Superior', monto: 500000 }),
      row({ id: 2, grupo: 'venta', concepto: 'Constancias Varias', monto: 50000 }),
      row({ id: 3, grupo: 'educativos', concepto: 'Legalizaciones', monto: 50000, orden: 5 }),
      row({ id: 4, grupo: 'multas', concepto: 'Multas por Incumplimiento de Contrato', monto: 60000 }),
    ]),
  ).map((g) => ({ ...g, label: g.grupo === 'multas' ? 'Multas' : g.grupo === 'venta' ? 'Venta de bienes' : 'Aranceles educativos' }))

  it('consulta vacía = todo', () => {
    expect(filterArancelGroups(groups, '  ')).toMatchObject({ matched: 4, total: 4 })
  })
  it('sin tildes ni mayúsculas', () => {
    const r = filterArancelGroups(groups, 'DIDACTICA')
    expect(r.matched).toBe(1)
    expect(r.groups[0].items[0].id).toBe(1)
  })
  it('por monto, con o sin puntos', () => {
    expect(filterArancelGroups(groups, '50000').matched).toBe(2)
    expect(filterArancelGroups(groups, '50.000').matched).toBe(2)
  })
  it('por nombre del grupo', () => {
    expect(filterArancelGroups(groups, 'multas').matched).toBe(1)
  })
  it('todas las palabras deben aparecer y los grupos vacíos se omiten', () => {
    const r = filterArancelGroups(groups, 'constancias 50000')
    expect(r.matched).toBe(1)
    expect(r.groups.map((g) => g.grupo)).toEqual(['venta'])
    expect(filterArancelGroups(groups, 'zzz')).toMatchObject({ matched: 0, groups: [] })
  })
  it('la consulta se corta a 100 caracteres', () => {
    expect(filterArancelGroups(groups, 'constancias' + ' '.repeat(95) + 'zzz').matched).toBe(1)
  })
})
