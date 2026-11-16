// INST-08 (T2): modelo y consultas de /privacidad y /accesibilidad (spec docs/specs/portal/LEGALES.md §2.2, §2.3, §2.6).
// Amenazas: (1) un correo sin forma llegando a un `mailto:`; (2) una caída del CMS mostrada como «sin contenido»; (3) una fila
// corrupta que rompa la página; (4) un idioma sin texto que deje la página vacía en lugar de usar el español con aviso;
// (5) una fecha corrida de día o de mes por la zona horaria; (6) un idioma desconocido que llegue tal cual al CMS.
// Límite: funciones puras y un cliente del CMS simulado; el render va en privacidad-page.spec.ts y accesibilidad-page.spec.ts.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const cmsFetch = vi.hoisted(() => vi.fn())
vi.mock('@/lib/cms/client', () => ({ cmsFetch }))

import { formatMesAnio, mapDeclaracionAccesibilidad, mapPoliticaPrivacidad, paragraphs } from '../../lib/cms/legales'
import { getDeclaracionAccesibilidad, getPoliticaPrivacidad } from '../../lib/cms/queries/legales'

const politica = (over: Record<string, unknown> = {}) => ({
  ultimaActualizacion: '2026-08-01T12:00:00.000Z',
  secciones: [
    { id: 'a', titulo: ' Responsable ', contenido: 'La UNC es responsable.' },
    { id: 'b', titulo: 'Datos', contenido: 'Primer párrafo.\n\nSegundo párrafo.' },
  ],
  ...over,
})
const accesibilidad = (over: Record<string, unknown> = {}) => ({
  descripcion: 'Compromiso con la accesibilidad.',
  caracteristicas: [{ id: 'a', titulo: 'Texto ajustable', descripcion: 'Puede cambiar el tamaño.' }],
  correoContacto: 'secgral@unc.edu.py',
  ...over,
})

describe('INST-08 mapPoliticaPrivacidad', () => {
  it('convierte los datos, recorta el texto y deja el día de la fecha', () => {
    const p = mapPoliticaPrivacidad(politica())!
    expect(p.actualizacion).toBe('2026-08-01')
    expect(p.secciones.map((s) => s.titulo)).toEqual(['Responsable', 'Datos'])
  })

  it('descarta secciones sin título o sin contenido; sin ninguna válida es null', () => {
    const p = mapPoliticaPrivacidad(politica({ secciones: [{ titulo: '', contenido: 'x' }, { titulo: 'x', contenido: '  ' }, { titulo: 'Ok', contenido: 'Ok' }, null, 5] }))!
    expect(p.secciones).toHaveLength(1)
    expect(mapPoliticaPrivacidad(politica({ secciones: [{ titulo: '', contenido: '' }] }))).toBeNull()
    for (const bad of [null, 'x', [], undefined, politica({ secciones: 'no es lista' })]) expect(mapPoliticaPrivacidad(bad)).toBeNull()
  })

  it('una fecha inválida no descarta el texto: solo se omite la fecha', () => {
    for (const bad of ['no-es-fecha', null, 5, undefined]) expect(mapPoliticaPrivacidad(politica({ ultimaActualizacion: bad }))!.actualizacion).toBeUndefined()
  })
})

describe('INST-08 mapDeclaracionAccesibilidad', () => {
  it('convierte los datos y recorta el texto', () => {
    const a = mapDeclaracionAccesibilidad(accesibilidad({ descripcion: '  Hola  ' }))!
    expect(a.descripcion).toBe('Hola')
    expect(a.caracteristicas).toHaveLength(1)
    expect(a.correo).toBe('secgral@unc.edu.py')
  })

  it('exige descripción y al menos una característica válida', () => {
    expect(mapDeclaracionAccesibilidad(accesibilidad({ descripcion: ' ' }))).toBeNull()
    expect(mapDeclaracionAccesibilidad(accesibilidad({ caracteristicas: [{ titulo: '', descripcion: 'x' }] }))).toBeNull()
    for (const bad of [null, 'x', [], undefined]) expect(mapDeclaracionAccesibilidad(bad)).toBeNull()
  })

  it('el correo solo se acepta con forma válida; si no, la página se muestra sin enlace', () => {
    for (const bad of ['sin-arroba', 'a@b', 'javascript:alert(1)', 'a b@c.py', '', undefined, 5]) {
      const a = mapDeclaracionAccesibilidad(accesibilidad({ correoContacto: bad }))
      expect(a, String(bad)).not.toBeNull()
      expect(a!.correo).toBeUndefined()
    }
  })
})

describe('INST-08 formatMesAnio y paragraphs', () => {
  it('formatea mes y año en el idioma, en UTC, y el guaraní sale en español', () => {
    expect(formatMesAnio('2026-08-01', 'es')).toBe('agosto de 2026')
    expect(formatMesAnio('2026-08-01', 'en')).toBe('August 2026')
    expect(formatMesAnio('2026-08-01', 'pt-BR')).toBe('agosto de 2026')
    expect(formatMesAnio('2026-08-01', 'gn')).toBe('agosto de 2026')
    expect(formatMesAnio('2026-01-01', 'es')).toBe('enero de 2026') // el primer día no retrocede al mes anterior
    expect(formatMesAnio('2026-12-31', 'es')).toBe('diciembre de 2026')
  })

  it('separa párrafos por líneas en blanco y descarta los vacíos', () => {
    expect(paragraphs('Uno.\n\nDos.\r\n\r\n\r\nTres.')).toEqual(['Uno.', 'Dos.', 'Tres.'])
    expect(paragraphs('  ')).toEqual([])
    expect(paragraphs('Un solo párrafo\ncon salto simple')).toEqual(['Un solo párrafo\ncon salto simple'])
  })
})

describe('INST-08 consultas', () => {
  beforeEach(() => {
    cmsFetch.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('piden el global con el idioma, sin respaldo automático, con su etiqueta', async () => {
    cmsFetch.mockResolvedValue(politica())
    await getPoliticaPrivacidad('en')
    const [path, opts] = cmsFetch.mock.calls[0]
    expect(path).toContain('/globals/politica-privacidad?')
    expect(path).toContain('locale=en')
    expect(path).toContain('fallback-locale=none')
    expect(opts.tags).toEqual(['politica-privacidad'])
    await getDeclaracionAccesibilidad('pt-BR')
    expect(cmsFetch.mock.calls[1][0]).toContain('/globals/declaracion-accesibilidad?')
    expect(cmsFetch.mock.calls[1][0]).toContain('locale=pt-BR')
  })

  it('un idioma desconocido se pide como español', async () => {
    cmsFetch.mockResolvedValue(politica())
    await getPoliticaPrivacidad('xx&evil=1')
    expect(cmsFetch.mock.calls[0][0]).toContain('locale=es')
    expect(cmsFetch.mock.calls[0][0]).not.toContain('evil')
  })

  it('ok con contenido en el idioma; sin aviso de respaldo', async () => {
    cmsFetch.mockResolvedValue(politica())
    expect(await getPoliticaPrivacidad('es')).toMatchObject({ status: 'ok', fallback: false })
    expect(cmsFetch).toHaveBeenCalledTimes(1)
  })

  it('un idioma sin texto usa el español y lo marca como respaldo', async () => {
    cmsFetch.mockResolvedValueOnce(politica({ secciones: [] })).mockResolvedValueOnce(politica())
    const r = await getPoliticaPrivacidad('en')
    expect(r).toMatchObject({ status: 'ok', fallback: true })
    expect(cmsFetch.mock.calls[1][0]).toContain('locale=es')
  })

  it('empty cuando tampoco hay español', async () => {
    cmsFetch.mockResolvedValue(accesibilidad({ caracteristicas: [] }))
    expect(await getDeclaracionAccesibilidad('en')).toEqual({ status: 'empty' })
    expect(await getDeclaracionAccesibilidad('es')).toEqual({ status: 'empty' })
  })

  it('una caída o una respuesta inesperada es `unavailable`, nunca `empty`, y no filtra el mensaje', async () => {
    cmsFetch.mockRejectedValue(new Error('http://cms.interno:3002 SECRETO'))
    expect(await getPoliticaPrivacidad('es')).toEqual({ status: 'unavailable' })
    expect(await getDeclaracionAccesibilidad('en')).toEqual({ status: 'unavailable' })
    cmsFetch.mockResolvedValue('no es objeto')
    expect(await getPoliticaPrivacidad('es')).toEqual({ status: 'unavailable' })
    const logged = (console.error as unknown as { mock: { calls: unknown[][] } }).mock.calls.flat().join(' ')
    expect(logged).not.toContain('SECRETO')
  })

  it('si falla la lectura del español de respaldo es `unavailable`', async () => {
    cmsFetch.mockResolvedValueOnce(politica({ secciones: [] })).mockRejectedValueOnce(new Error('x'))
    expect(await getPoliticaPrivacidad('en')).toEqual({ status: 'unavailable' })
  })
})
