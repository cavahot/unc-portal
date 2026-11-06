// TITULOS-01 (T2): lectura de /titulos desde el CMS — mapeo puro y consulta con estados ok/empty/unavailable
// (spec docs/specs/portal/TITULOS.md §2.2; tarea odd/tasks/titulos-cms.md, S1, S2 y S3).
// Amenazas: (1) datos de demostración o de respaldo en el código cuando el CMS falla o está vacío; (2) un `acento`
// o una URL del CONES tomados sin validar y llevados a un atributo del HTML; (3) el monto del arancel escrito a
// mano o desactualizado tras editarlo en Aranceles del Rectorado; (4) un 500 cuando el CMS no responde.
// Límite: CMS simulado; no ejecuta red ni React (la página se prueba aparte).
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const cmsFetch = vi.hoisted(() => vi.fn())
vi.mock('../../lib/cms/client', () => ({ cmsFetch }))

import { mapTitulosInscripcion } from '../../lib/cms/titulos'
import { getTitulosInscripcion } from '../../lib/cms/queries/titulos'

/** Documento del global tal como lo devuelve el CMS con `depth=1` (arancel poblado). */
function raw(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    titulo: ' Inscripción de títulos ',
    descripcion: 'Servicio de inscripción y registro de títulos académicos.',
    unidad: 'Secretaría General — UNC',
    plazoMinHoras: 8,
    plazoMaxHoras: 24,
    arancel: { id: 7, concepto: 'Inscripción de Títulos Universitarios', monto: 200000, active: true },
    notaCones: { texto: 'El reconocimiento del CONES es un requisito previo.', url: 'https://www.cones.gov.py/' },
    tipos: [
      {
        id: 'a',
        slug: 'extranjera',
        etiqueta: 'Internacional',
        titulo: 'Universidades extranjeras',
        subtitulo: 'Títulos de grado y/o posgrado',
        acento: 'verde',
        requisitos: [{ id: 'r1', texto: 'Título original legalizado.' }, { id: 'r2', texto: 'Cédula o pasaporte.' }],
      },
      {
        id: 'b',
        slug: 'publica',
        etiqueta: 'Nacional pública',
        titulo: 'Universidades nacionales públicas',
        subtitulo: null,
        acento: 'azul',
        requisitos: [{ id: 'r3', texto: 'Título registrado en el MEC.' }],
      },
    ],
    pasos: [
      { id: 'p1', responsable: 'Recurrente', descripcion: 'Presenta los documentos.' },
      { id: 'p2', responsable: 'Perceptoría', descripcion: 'Paga el arancel.' },
    ],
    updatedAt: '2026-11-05T10:00:00.000Z',
    ...overrides,
  }
}

describe('TITULOS-01 mapeo puro', () => {
  it('un documento completo produce datos ordenados, con pasos numerados por posición', () => {
    const data = mapTitulosInscripcion(raw())!
    expect(data.titulo).toBe('Inscripción de títulos') // recortado
    expect(data.unidad).toBe('Secretaría General — UNC')
    expect(data.plazo).toEqual({ min: 8, max: 24 })
    expect(data.tipos.map((t) => t.slug)).toEqual(['extranjera', 'publica'])
    expect(data.tipos[0].requisitos).toEqual(['Título original legalizado.', 'Cédula o pasaporte.'])
    expect(data.pasos.map((p) => p.numero)).toEqual([1, 2])
    expect(data.arancel).toEqual({ concepto: 'Inscripción de Títulos Universitarios', monto: 200000 })
    expect(data.notaCones).toEqual({ texto: 'El reconocimiento del CONES es un requisito previo.', url: 'https://www.cones.gov.py/' })
  })

  it('devuelve null (contenido no publicable) si falta lo esencial', () => {
    expect(mapTitulosInscripcion({})).toBeNull()
    expect(mapTitulosInscripcion(raw({ tipos: [] }))).toBeNull()
    expect(mapTitulosInscripcion(raw({ pasos: [] }))).toBeNull()
    expect(mapTitulosInscripcion(raw({ titulo: '  ' }))).toBeNull()
    expect(mapTitulosInscripcion(raw({ unidad: undefined }))).toBeNull()
    // Un tipo sin ningún requisito válido no cuenta como contenido.
    expect(mapTitulosInscripcion(raw({ tipos: [{ slug: 'x', etiqueta: 'e', titulo: 't', acento: 'verde', requisitos: [] }] }))).toBeNull()
  })

  it('un acento fuera de la lista cerrada cae a «verde» y nunca se usa tal cual', () => {
    const data = mapTitulosInscripcion(
      raw({ tipos: [{ slug: 'x', etiqueta: 'e', titulo: 't', acento: 'red;background:url(//evil)', requisitos: [{ texto: 'a' }] }] }),
    )!
    expect(data.tipos[0].acento).toBe('verde')
  })

  it('la URL del CONES solo se acepta con https y host exacto; si no, se conserva el texto sin enlace', () => {
    for (const bad of ['http://www.cones.gov.py/', 'https://cones.gov.py.evil.example/', 'javascript:alert(1)', 'https://evil.example/?u=https://www.cones.gov.py/']) {
      const data = mapTitulosInscripcion(raw({ notaCones: { texto: 'Aviso', url: bad } }))!
      expect(data.notaCones, bad).toEqual({ texto: 'Aviso', url: null })
    }
    expect(mapTitulosInscripcion(raw({ notaCones: { texto: '', url: '' } }))!.notaCones).toBeNull()
    expect(mapTitulosInscripcion(raw({ notaCones: undefined }))!.notaCones).toBeNull()
  })

  it('el arancel solo sale de una fila publicada y poblada; si no, es null (nunca un monto inventado)', () => {
    expect(mapTitulosInscripcion(raw({ arancel: 7 }))!.arancel).toBeNull() // sin poblar
    expect(mapTitulosInscripcion(raw({ arancel: null }))!.arancel).toBeNull()
    expect(mapTitulosInscripcion(raw({ arancel: { id: 7, concepto: 'x', monto: 200000, active: false } }))!.arancel).toBeNull()
    expect(mapTitulosInscripcion(raw({ arancel: { id: 7, concepto: 'x', monto: 'gratis', active: true } }))!.arancel).toBeNull()
    expect(mapTitulosInscripcion(raw({ arancel: { id: 7, concepto: 'x', monto: -5, active: true } }))!.arancel).toBeNull()
  })

  it('un plazo incoherente se omite sin ocultar el resto de la página', () => {
    expect(mapTitulosInscripcion(raw({ plazoMinHoras: 24, plazoMaxHoras: 8 }))!.plazo).toBeNull()
    expect(mapTitulosInscripcion(raw({ plazoMinHoras: 'ocho' }))!.plazo).toBeNull()
    expect(mapTitulosInscripcion(raw({ plazoMinHoras: 8.5 }))!.plazo).toBeNull()
  })

  it('descarta filas sin texto y conserva el resto', () => {
    const data = mapTitulosInscripcion(
      raw({
        pasos: [{ responsable: 'Recurrente', descripcion: 'Uno' }, { responsable: '', descripcion: 'Sin responsable' }, { responsable: 'X', descripcion: '  ' }],
      }),
    )!
    expect(data.pasos).toEqual([{ numero: 1, responsable: 'Recurrente', descripcion: 'Uno' }])
  })
})

describe('TITULOS-01 consulta con estados', () => {
  beforeEach(() => cmsFetch.mockReset())

  it('ok: devuelve los datos mapeados', async () => {
    cmsFetch.mockResolvedValue(raw())
    const result = await getTitulosInscripcion()
    expect(result.status).toBe('ok')
    if (result.status === 'ok') expect(result.data.tipos).toHaveLength(2)
  })

  it('empty: documento sin contenido publicable, sin datos de demostración', async () => {
    cmsFetch.mockResolvedValue({})
    expect(await getTitulosInscripcion()).toEqual({ status: 'empty' })
    cmsFetch.mockResolvedValue(raw({ tipos: [], pasos: [] }))
    expect(await getTitulosInscripcion()).toEqual({ status: 'empty' })
  })

  it('unavailable: el CMS falla o devuelve una forma inesperada; nunca lanza', async () => {
    cmsFetch.mockRejectedValue(new Error('ECONNREFUSED'))
    expect(await getTitulosInscripcion()).toEqual({ status: 'unavailable' })
    for (const weird of [null, undefined, 'texto', 42, []]) {
      cmsFetch.mockResolvedValue(weird)
      expect(await getTitulosInscripcion(), String(weird)).toEqual({ status: 'unavailable' })
    }
  })

  it('pide el global con depth=1 y revalida con la etiqueta propia Y la de aranceles', async () => {
    cmsFetch.mockResolvedValue(raw())
    await getTitulosInscripcion()
    const [endpoint, options] = cmsFetch.mock.calls[0] as [string, { tags?: string[]; next?: { revalidate?: number } }]
    expect(endpoint).toMatch(/^\/globals\/titulos-inscripcion\?/)
    expect(new URL(`http://x${endpoint}`).searchParams.get('depth')).toBe('1')
    // Si cambia el monto en Aranceles del Rectorado, /titulos debe refrescarse (criterio de aceptación 3).
    expect(options.tags).toEqual(expect.arrayContaining(['titulos-inscripcion', 'aranceles-rectorado']))
    expect(options.next?.revalidate).toBeGreaterThan(0)
  })
})

describe('TITULOS-01 sin datos fijos en el código', () => {
  it('los módulos de dominio y consulta no contienen el contenido que ahora vive en el CMS', () => {
    const sources = ['lib/cms/titulos.ts', 'lib/cms/queries/titulos.ts'].map((p) => readFileSync(resolve(process.cwd(), p), 'utf8'))
    for (const src of sources) {
      expect(src).not.toMatch(/200\.?000/)
      expect(src).not.toMatch(/Secretar[ií]a General/)
      expect(src).not.toMatch(/Mesa de Entrada/)
      expect(src).not.toMatch(/Universidades (Extranjeras|Nacionales)/i)
    }
  })
})
