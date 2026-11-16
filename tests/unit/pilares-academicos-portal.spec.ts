// PILARES-01 (T2–T3): tarjetas de la portada, consulta con estados y páginas de cada pilar
// (spec docs/specs/portal/PILARES-ACADEMICOS.md; tarea odd/tasks/pilares-academicos.md, S1–S4).
// Qué comprueba: la tarjeta sigue la estructura de la «Propuesta 02» con sombra y cambio al pasar el cursor; el recuadro de
// métricas solo aparece con cifras; la consulta nunca lanza y separa ok/empty/unavailable; la página de un pilar en
// construcción muestra solo el aviso.
// Límite: renderizado estático (sin navegador); el aspecto se verifica en el portal local.
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: unknown }) => createElement('a', { href, ...rest }, children as never),
}))
const cmsFetch = vi.hoisted(() => vi.fn())
vi.mock('@/lib/cms/client', () => ({ cmsFetch }))
const getStatsResult = vi.hoisted(() => vi.fn())
vi.mock('@/lib/cms/queries/stats', () => ({ getStatsResult }))

import PilarCard from '@/components/home/PilarCard'
import PilarPage from '@/components/pilares/PilarPage'
import { getPilaresAcademicos } from '@/lib/cms/queries/pilares'
import type { Pilar } from '@/lib/cms/pilares'

const pilar = (extra: Partial<Pilar> = {}): Pilar => ({
  key: 'docencia',
  href: '/docencia',
  titulo: 'Docencia de Grado y Posgrado',
  bajada: 'Formación de alta competencia',
  descripcion: 'Planes curriculares actualizados.',
  icono: 'birrete',
  metricas: [
    { valor: '10', etiqueta: 'Carreras acreditadas' },
    { valor: '4.985', etiqueta: 'Estudiantes activos' },
  ],
  enlaceTexto: 'Ir a Docencia',
  estado: 'construccion',
  contenido: null,
  estadisticas: [],
  ...extra,
})

describe('PILARES-01: tarjeta de la portada', () => {
  it('S1: estructura de la propuesta: ícono, título, bajada, descripción, dos métricas con divisor y botón al pilar', () => {
    const html = renderToStaticMarkup(createElement(PilarCard, { pilar: pilar() }))
    expect(html).toContain('<svg')
    expect(html).toMatch(/<h3[^>]*>Docencia de Grado y Posgrado<\/h3>/)
    expect(html).toContain('Formación de alta competencia')
    expect(html).toContain('4.985')
    expect(html).toContain('Carreras acreditadas')
    expect(html).toContain('data-divisor')
    expect(html).toMatch(/<a[^>]*href="\/docencia"[^>]*>[\s\S]*Ir a Docencia/)
  })

  it('S2: sombra siempre y cambio al pasar el cursor o con foco (borde, sombra, elevación y botón)', () => {
    const html = renderToStaticMarkup(createElement(PilarCard, { pilar: pilar() }))
    expect(html).toMatch(/shadow-\[/)
    expect(html).toMatch(/hover:shadow-\[/)
    expect(html).toMatch(/hover:border-/)
    expect(html).toMatch(/motion-safe:hover:-translate-y-1/)
    expect(html).toMatch(/focus-within:/)
    expect(html).toMatch(/group-hover:bg-\[#004700\]/)
  })

  it('S3: sin métricas no hay recuadro; con una sola no hay divisor', () => {
    expect(renderToStaticMarkup(createElement(PilarCard, { pilar: pilar({ metricas: [] }) }))).not.toContain('data-metricas')
    const una = renderToStaticMarkup(createElement(PilarCard, { pilar: pilar({ metricas: [{ valor: '10', etiqueta: 'Carreras' }] }) }))
    expect(una).toContain('data-metricas')
    expect(una).not.toContain('data-divisor')
  })
})

describe('PILARES-01: consulta', () => {
  beforeEach(() => {
    cmsFetch.mockReset()
    getStatsResult.mockReset()
    getStatsResult.mockResolvedValue({ state: 'ok', stats: { totalEstudiantes: 4985 } })
  })

  it('ok con pilares publicables; empty sin ninguno; unavailable si el CMS falla, sin lanzar', async () => {
    cmsFetch.mockResolvedValueOnce({ docencia: { titulo: 'Docencia', descripcion: 'x', enlaceTexto: 'Ir', icono: 'birrete' } })
    expect((await getPilaresAcademicos('es')).status).toBe('ok')
    cmsFetch.mockResolvedValueOnce({})
    expect((await getPilaresAcademicos('es')).status).toBe('empty')
    cmsFetch.mockRejectedValueOnce(new Error('caído'))
    expect((await getPilaresAcademicos('es')).status).toBe('unavailable')
  })

  it('pide el global con su etiqueta de revalidación', async () => {
    cmsFetch.mockResolvedValueOnce({})
    await getPilaresAcademicos('es')
    expect(cmsFetch.mock.calls[0][0]).toMatch(/^\/globals\/pilares-academicos/)
    expect(cmsFetch.mock.calls[0][1]).toMatchObject({ tags: ['pilares-academicos'] })
  })
})

describe('PILARES-01: página del pilar', () => {
  const labels = { inicio: 'Inicio', enConstruccion: 'En construcción', enConstruccionTexto: 'Pronto publicaremos esta sección.', volver: 'Volver al inicio', estadisticas: 'En cifras' }

  it('S4: en construcción muestra solo el aviso, aunque haya contenido sembrado', () => {
    const html = renderToStaticMarkup(createElement(PilarPage, { result: { status: 'ok', pilar: pilar({ contenido: { root: { children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Texto sembrado' }] }] } } }) }, labels, fallbackTitle: 'Docencia', homeHref: '/es' }))
    expect(html).toContain('En construcción')
    expect(html).toContain('Docencia de Grado y Posgrado')
    expect(html).not.toContain('Texto sembrado')
    expect(html).not.toContain('4.985')
  })

  it('publicada: descripción, estadísticas y contenido', () => {
    const contenido = { root: { children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Contenido publicado' }] }] } }
    const html = renderToStaticMarkup(createElement(PilarPage, { result: { status: 'ok', pilar: pilar({ estado: 'publicada', contenido, estadisticas: [{ valor: '762', etiqueta: 'Docentes' }] }) }, labels, fallbackTitle: 'Docencia', homeHref: '/es' }))
    expect(html).toContain('Contenido publicado')
    expect(html).toContain('762')
    expect(html).not.toContain('En construcción')
  })

  it('sin pilar o con el CMS caído: aviso de construcción con el título de respaldo', () => {
    const html = renderToStaticMarkup(createElement(PilarPage, { result: { status: 'unavailable' }, labels, fallbackTitle: 'Extensión', homeHref: '/es' }))
    expect(html).toContain('En construcción')
    expect(html).toContain('Extensión')
  })
})
