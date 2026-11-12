// HOME-STATES-01: la portada no inventa cifras, traduce todo su texto y muestra los estados vacíos (tarea: rediseño del portal).
// Qué comprueba: (1) las estadísticas devuelven ok/empty/unavailable y NUNCA cifras de relleno fuera de desarrollo;
//   (2) «Acceso ciudadano» sale de los mensajes de los 4 idiomas, con enlaces que conservan el idioma y sin voseo;
//   (3) las noticias vacías muestran un aviso en vez de un encabezado sin tarjetas; (4) el inicio ya no usa los bloques
//   oscuros fuera del sistema visual ni el gris que no alcanza el contraste AA.
// Amenazas: publicar 4985 estudiantes cuando el CMS falla (cifra falsa en la página principal); mostrar texto en español
//   a quien eligió otro idioma; enlaces que cambian de idioma sin aviso; texto secundario ilegible para baja visión.
// Límite: análisis estático del código fuente y de los mensajes; el aspecto real se revisa en el navegador.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '..', '..')
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8')
const LOCALES = ['es', 'gn', 'en', 'pt-BR'] as const

vi.mock('../../lib/cms/client', () => ({ cmsFetch: vi.fn() }))

describe('estadísticas: ok / empty / unavailable sin cifras inventadas', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })
  afterEach(() => vi.unstubAllEnvs())

  it('con datos válidos devuelve ok y las cinco cifras', async () => {
    const { cmsFetch } = await import('../../lib/cms/client')
    vi.mocked(cmsFetch).mockResolvedValueOnce({
      totalEstudiantes: 5000, totalDocentes: 800, totalEgresados: 700, totalCarrerasAcreditadas: 12, totalFacultades: 7,
    })
    const { getStatsResult } = await import('../../lib/cms/queries/stats')
    const r = await getStatsResult()
    expect(r.state).toBe('ok')
    expect(r.stats).toEqual({
      totalEstudiantes: 5000, totalDocentes: 800, totalEgresados: 700, totalCarrerasAcreditadas: 12, totalFacultades: 7,
    })
  })

  it('una cifra en cero o ausente se omite: nunca se sustituye por un valor de relleno', async () => {
    const { cmsFetch } = await import('../../lib/cms/client')
    vi.mocked(cmsFetch).mockResolvedValueOnce({ totalEstudiantes: 0, totalDocentes: 762 })
    const { getStatsResult } = await import('../../lib/cms/queries/stats')
    const r = await getStatsResult()
    expect(r.state).toBe('ok')
    expect(r.stats).toEqual({ totalDocentes: 762 })
  })

  it('sin ninguna cifra publicada devuelve empty', async () => {
    const { cmsFetch } = await import('../../lib/cms/client')
    vi.mocked(cmsFetch).mockResolvedValueOnce({ totalEstudiantes: 0 })
    const { getStatsResult } = await import('../../lib/cms/queries/stats')
    expect(await getStatsResult()).toEqual({ state: 'empty', stats: {} })
  })

  it('si el CMS falla devuelve unavailable y ninguna cifra (fuera de desarrollo)', async () => {
    const { cmsFetch } = await import('../../lib/cms/client')
    vi.mocked(cmsFetch).mockRejectedValueOnce(new Error('CMS down'))
    const { getStatsResult } = await import('../../lib/cms/queries/stats')
    expect(await getStatsResult()).toEqual({ state: 'unavailable', stats: {} })
  })

  it('solo en desarrollo una caída muestra cifras de demostración', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const { cmsFetch } = await import('../../lib/cms/client')
    vi.mocked(cmsFetch).mockRejectedValueOnce(new Error('CMS down'))
    const { getStatsResult } = await import('../../lib/cms/queries/stats')
    const r = await getStatsResult()
    expect(r.state).toBe('ok')
    expect(r.stats.totalEstudiantes).toBeGreaterThan(0)
  })
})

describe('«Acceso ciudadano» traducido, con enlaces por idioma', () => {
  const src = read('components/institutional/InstitutionalAccessSection.tsx')

  it('no trae texto literal en español ni voseo', () => {
    expect(src).not.toMatch(/Accedé|Iniciá|Consultá|realizá/)
    expect(src).not.toContain('Transparencia Institucional')
    expect(src).not.toContain('Solicitar información')
  })

  it('usa los mensajes (getT) y el Link con idioma, no next/link', () => {
    expect(src).toMatch(/getT\(/)
    expect(src).not.toMatch(/from 'next\/link'/)
    expect(src).toMatch(/from '@\/i18n\/navigation'/)
  })

  it.each(LOCALES)('%s tiene el título, la descripción y las 5 tarjetas completas', (loc) => {
    const home = JSON.parse(read(`messages/${loc}/pages.home.json`))
    const a = home.institutionalAccess
    expect(a, `institutionalAccess en ${loc}`).toBeTruthy()
    for (const k of ['label', 'title', 'description']) expect(typeof a[k]).toBe('string')
    for (const id of ['transparencia', 'infoPublica', 'solicitarTitulo', 'biblioteca', 'revistas']) {
      for (const k of ['badge', 'title', 'description', 'cta']) {
        expect(typeof a.items?.[id]?.[k], `${loc}.${id}.${k}`).toBe('string')
        expect(a.items[id][k].length).toBeGreaterThan(2)
      }
    }
  })

  it('el texto en español usa «usted», sin voseo', () => {
    const es = JSON.stringify(JSON.parse(read('messages/es/pages.home.json')).institutionalAccess)
    expect(es).not.toMatch(/Accedé|Iniciá|Consultá|realizá/)
  })
})

describe('noticias vacías, estadísticas y sistema visual claro', () => {
  const page = read('app/[locale]/page.tsx')

  it('las noticias vacías muestran un aviso con salida, no solo el encabezado', () => {
    expect(page).toMatch(/noticias\.length === 0/)
    expect(page).toContain("t('news.empty')")
  })

  it('no usa `as any` en la imagen de la noticia', () => {
    expect(page).not.toMatch(/as any/)
  })

  it('el gris secundario ya no es #6C7B76 (contraste menor que AA)', () => {
    expect(page).not.toContain('#6C7B76')
  })

  it('el texto oscuro sobre el verde de noticias tiene opacidad ≥ 90 % (contraste AA)', () => {
    // Al 70-75 % el texto de 12-18 px sobre #00A300 queda entre 3,5:1 y 4:1, por debajo del mínimo 4,5:1.
    expect(page).not.toMatch(/text-\[#001A00\]\/(70|75)/)
  })

  it('el bloque de estadísticas es claro y reacciona a los estados', () => {
    const s = read('components/stats/StatsBlock.tsx')
    expect(s).not.toContain('slate-900')
    expect(s).toMatch(/unavailable/)
    expect(s).toMatch(/empty/)
    expect(s).not.toMatch(/FALLBACK|4985/)
  })

  it('«Acceso ciudadano» ya no usa el fondo oscuro ni colores sobre negro', () => {
    const a = read('components/institutional/InstitutionalAccessSection.tsx')
    expect(a).not.toMatch(/bg-\[#071A13\]|text-white\/[0-9]+|bg-white\/\[0\.0/)
  })

  it.each(LOCALES)('%s tiene stats.unavailable y news.empty', (loc) => {
    const home = JSON.parse(read(`messages/${loc}/pages.home.json`))
    expect(typeof home.stats.unavailable).toBe('string')
    expect(typeof home.news.empty).toBe('string')
  })
})
