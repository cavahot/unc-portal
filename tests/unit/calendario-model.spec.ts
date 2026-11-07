// INST-07 (T2): modelo, formato de fechas y consulta de /calendario-academico (spec docs/specs/portal/CALENDARIO.md §2.4).
// Amenazas: (1) una caída del CMS mostrada como «sin fechas» o fechas escritas en el código; (2) una fecha desplazada un
// día por la zona horaria; (3) un período invertido, un evento desconocido o un «otro» sin descripción llegando a la página;
// (4) mezclar años; (5) el guaraní formateado con el idioma de la máquina (Intl no lo soporta).
// Límite: funciones puras y un cliente del CMS simulado; el render va en calendario-page.spec.ts.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const cmsFetch = vi.hoisted(() => vi.fn())
vi.mock('@/lib/cms/client', () => ({ cmsFetch }))

import { CALENDARIO_EVENTOS as EVENTOS_CMS } from '../../apps/cms/src/utilities/validators'
import { CALENDARIO_EVENTOS, armarCalendario, formatFechas, formatPeriodo, intlLocale, mapBloque, toDay } from '../../lib/cms/calendario'
import { getCalendario } from '../../lib/cms/queries/calendario'

/** Código de un archivo sin comentarios (los comentarios pueden citar rutas o fechas de ejemplo). */
const code = (rel: string) =>
  readFileSync(resolve(process.cwd(), rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')

/** Quita los espacios finos que `Intl` mete alrededor del guion para poder comparar. */
const norm = (s: string) => s.replace(/[   ]/g, ' ').replace(/\s+/g, ' ')

const entrada = (evento: string, inicio: string, fin?: string, extra: Record<string, unknown> = {}) => ({ evento, inicio: `${inicio}T12:00:00.000Z`, ...(fin ? { fin: `${fin}T12:00:00.000Z` } : {}), ...extra })
const bloque = (over: Record<string, unknown> = {}) => ({
  id: 1,
  titulo: '1er Semestre 2026',
  tipo: 'semestre',
  anio: 2026,
  orden: 1,
  activa: true,
  entradas: [entrada('inicio-clases', '2026-03-02'), entrada('inscripcion-tardia', '2026-03-16', '2026-03-27')],
  ...over,
})

describe('INST-07 lista de eventos', () => {
  it('es idéntica a la del CMS (el portal no importa código del CMS)', () => {
    expect([...CALENDARIO_EVENTOS]).toEqual([...EVENTOS_CMS])
    expect(code('lib/cms/calendario.ts')).not.toMatch(/from ['"][^'"]*apps\/cms/)
  })
})

describe('INST-07 toDay', () => {
  it('toma el día en UTC: mediodía y medianoche UTC dan el mismo día (sin corrimiento por zona horaria)', () => {
    expect(toDay('2026-03-02T12:00:00.000Z')).toBe('2026-03-02')
    expect(toDay('2026-03-02T00:00:00.000Z')).toBe('2026-03-02')
    expect(toDay('2026-03-02T23:59:59.000Z')).toBe('2026-03-02')
    expect(toDay(new Date('2026-03-02T12:00:00Z'))).toBe('2026-03-02')
  })

  it('un valor que no es fecha válida o está fuera de rango da undefined', () => {
    for (const v of [undefined, null, '', '   ', 'no-es-fecha', 5, {}, '1800-01-01T00:00:00Z', '2300-01-01T00:00:00Z']) expect(toDay(v), String(v)).toBeUndefined()
  })
})

describe('INST-07 mapBloque', () => {
  it('mapea un semestre y ordena las entradas por fecha', () => {
    const b = mapBloque(bloque({ entradas: [entrada('cierre-semestre', '2026-07-11'), entrada('inicio-clases', '2026-03-02')] }))!
    expect(b).toMatchObject({ id: 1, titulo: '1er Semestre 2026', tipo: 'semestre', anio: 2026 })
    expect(b.entradas.map((e) => e.evento)).toEqual(['inicio-clases', 'cierre-semestre'])
    expect(b.entradas[0]).toEqual({ evento: 'inicio-clases', inicio: '2026-03-02' })
  })

  it('un fin anterior o igual al inicio se ignora (se muestra solo el inicio)', () => {
    const e = mapBloque(bloque({ entradas: [entrada('inicio-clases', '2026-03-10', '2026-03-05'), entrada('cierre-semestre', '2026-07-11', '2026-07-11')] }))!.entradas
    expect(e[0]).toEqual({ evento: 'inicio-clases', inicio: '2026-03-10' })
    expect(e[1]).toEqual({ evento: 'cierre-semestre', inicio: '2026-07-11' })
  })

  it('descarta entradas sin fecha válida, con evento desconocido o «otro» sin descripción; conserva «otro» con descripción', () => {
    const b = mapBloque(
      bloque({
        entradas: [
          entrada('inicio-clases', '2026-03-02'),
          { evento: 'inicio-clases', inicio: 'no-es-fecha' },
          entrada('inventado', '2026-04-01'),
          entrada('otro', '2026-05-01'),
          entrada('otro', '2026-05-15', undefined, { descripcion: '  Feriado  ' }),
          null,
        ],
      }),
    )!
    expect(b.entradas.map((e) => [e.evento, e.descripcion])).toEqual([['inicio-clases', undefined], ['otro', 'Feriado']])
  })

  it('en las mesas de exámenes no importa el evento y la entrada solo necesita fecha', () => {
    const b = mapBloque(bloque({ tipo: 'examenes', titulo: 'Finales', entradas: [{ inicio: '2025-12-01T12:00:00Z', fin: '2025-12-19T12:00:00Z' }] }))!
    expect(b.entradas).toEqual([{ inicio: '2025-12-01', fin: '2025-12-19' }])
  })

  it('descarta bloques inactivos, sin título, con tipo o año inválidos, o sin ninguna entrada válida', () => {
    expect(mapBloque(bloque({ activa: false }))).toBeNull()
    expect(mapBloque(bloque({ id: undefined }))).toBeNull()
    expect(mapBloque(bloque({ titulo: ' ' }))).toBeNull()
    expect(mapBloque(bloque({ tipo: 'otro' }))).toBeNull()
    expect(mapBloque(bloque({ anio: '2026' }))).toBeNull()
    expect(mapBloque(bloque({ anio: 1999 }))).toBeNull()
    expect(mapBloque(bloque({ entradas: [] }))).toBeNull()
    expect(mapBloque(bloque({ entradas: [{ evento: 'inicio-clases' }] }))).toBeNull()
    expect(mapBloque(null)).toBeNull()
  })
})

describe('INST-07 armarCalendario', () => {
  const rows = [
    bloque({ id: 1, titulo: '2do Semestre 2026', orden: 2 }),
    bloque({ id: 2, titulo: '1er Semestre 2026', orden: 1 }),
    bloque({ id: 3, titulo: 'Finales 2026', tipo: 'examenes', orden: 3, entradas: [{ inicio: '2026-07-14T12:00:00Z', fin: '2026-08-01T12:00:00Z' }] }),
    bloque({ id: 4, titulo: '1er Semestre 2025', anio: 2025 }),
    bloque({ id: 5, titulo: 'Inactivo', activa: false }),
  ]

  it('se queda con el año más reciente, separa semestres y exámenes y ordena por «orden»', () => {
    const c = armarCalendario(rows)!
    expect(c.anio).toBe(2026)
    expect(c.semestres.map((b) => b.titulo)).toEqual(['1er Semestre 2026', '2do Semestre 2026'])
    expect(c.examenes.map((b) => b.titulo)).toEqual(['Finales 2026'])
  })

  it('un bloque de un año anterior no se mezcla y una entrada que no es lista da null', () => {
    expect(JSON.stringify(armarCalendario(rows))).not.toContain('2025')
    expect(armarCalendario(undefined)).toBeNull()
    expect(armarCalendario({})).toBeNull()
    expect(armarCalendario([bloque({ activa: false })])).toBeNull()
  })
})

describe('INST-07 formato de fechas', () => {
  it('es: un día, un rango en el mismo mes y un rango entre meses', () => {
    expect(norm(formatFechas('2026-03-02', undefined, 'es', 2026))).toBe('2 mar')
    expect(norm(formatFechas('2026-03-16', '2026-03-27', 'es', 2026))).toBe('16–27 mar')
    expect(norm(formatFechas('2026-06-23', '2026-07-04', 'es', 2026))).toBe('23 jun – 4 jul')
  })

  it('en y pt-BR usan el orden y los meses de su idioma', () => {
    expect(norm(formatFechas('2026-03-02', undefined, 'en', 2026))).toBe('Mar 2')
    expect(norm(formatFechas('2026-03-16', '2026-03-27', 'pt-BR', 2026))).toBe('16 – 27 de mar.')
  })

  it('el guaraní se formatea en español, no con el idioma de la máquina', () => {
    expect(intlLocale('gn')).toBe('es')
    expect(intlLocale('en')).toBe('en')
    expect(formatFechas('2026-03-16', '2026-03-27', 'gn', 2026)).toBe(formatFechas('2026-03-16', '2026-03-27', 'es', 2026))
  })

  it('muestra el año cuando la fecha cae fuera del año académico o el período cruza de año, salvo con conAnio=false', () => {
    expect(norm(formatFechas('2025-12-01', '2025-12-19', 'es', 2026))).toContain('2025')
    expect(norm(formatFechas('2025-12-20', '2026-01-10', 'es', 2026))).toMatch(/2025.*2026/)
    expect(norm(formatFechas('2026-03-02', undefined, 'es', 2026))).not.toContain('2026')
    expect(norm(formatFechas('2025-12-01', '2025-12-19', 'es', 2026, false))).toBe('1–19 dic')
  })

  it('el período de una mesa de exámenes sale de la fecha de inicio, con inicial mayúscula', () => {
    expect(formatPeriodo('2025-12-01', 'es')).toBe('Diciembre de 2025')
    expect(formatPeriodo('2026-07-14', 'en')).toBe('July 2026')
    expect(formatPeriodo('2026-02-02', 'pt-BR')).toMatch(/^Fevereiro/)
  })

  it('una fecha de mediodía UTC no se corre de día en ningún borde del mes', () => {
    expect(norm(formatFechas('2026-03-01', undefined, 'es', 2026))).toBe('1 mar')
    expect(norm(formatFechas('2026-03-31', undefined, 'es', 2026))).toBe('31 mar')
  })
})

describe('INST-07 getCalendario', () => {
  beforeEach(() => { cmsFetch.mockReset() })

  it('devuelve el calendario y pide solo los activos con la etiqueta propia', async () => {
    cmsFetch.mockResolvedValue({ docs: [bloque()] })
    const r = await getCalendario()
    expect(r.status).toBe('ok')
    const [url, opts] = cmsFetch.mock.calls[0]
    expect(url).toContain('/calendario-academico?')
    expect(decodeURIComponent(url)).toContain('where[activa][equals]=true')
    expect(opts).toEqual({ tags: ['calendario-academico'] })
  })

  it('sin bloques válidos es «empty»; con el CMS caído o una respuesta rara, «unavailable» (nunca fechas inventadas)', async () => {
    cmsFetch.mockResolvedValue({ docs: [] })
    expect(await getCalendario()).toEqual({ status: 'empty' })
    cmsFetch.mockResolvedValue({ docs: [bloque({ activa: false }), bloque({ entradas: [] })] })
    expect(await getCalendario()).toEqual({ status: 'empty' })
    cmsFetch.mockRejectedValue(new Error('boom'))
    expect(await getCalendario()).toEqual({ status: 'unavailable' })
    cmsFetch.mockResolvedValue({ nada: true })
    expect(await getCalendario()).toEqual({ status: 'unavailable' })
    cmsFetch.mockResolvedValue(undefined)
    expect(await getCalendario()).toEqual({ status: 'unavailable' })
  })

  it('el código del modelo y de la consulta no trae fechas ni nombres de eventos escritos', () => {
    for (const f of ['lib/cms/calendario.ts', 'lib/cms/queries/calendario.ts']) {
      expect(code(f), f).not.toMatch(/Inicio de clases|Parciales|Cierre del semestre|\b20\d\d-\d\d-\d\d\b/)
    }
  })
})
