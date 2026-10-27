// LT-01: modelo puro de la línea de tiempo de /historia (spec docs/specs/portal/LINEA-TIEMPO.md §2, escenarios 4, 5, 8).
// Amenazas: (1) filas inválidas que rompan la página; (2) enlaces javascript:/http:/con credenciales publicados;
// (3) imágenes fuera de /api/media/file/ (proxy abierto); (4) texto en español leído con voz de otro idioma.
// Límite: funciones puras, sin red ni React.
import { describe, expect, it } from 'vitest'
import { isSafeMilestoneLink, isValidMilestoneYear, mapMilestones, yearSpan } from '@/lib/cms/lineaTiempo'

const resolve = (url: unknown) => (typeof url === 'string' && url.startsWith('/api/media/file/') ? `http://cms.test${url}` : null)
const NOW = new Date('2026-10-24T12:00:00Z')

const row = (over: Record<string, unknown> = {}) => ({
  id: 1,
  anio: 2007,
  titulo: 'Creación',
  descripcion: 'Se crea la Universidad.',
  orden: 1,
  ...over,
})

describe('LT-01: isValidMilestoneYear', () => {
  it('acepta enteros de 1800 al año siguiente', () => {
    expect(isValidMilestoneYear(1800, NOW)).toBe(true)
    expect(isValidMilestoneYear(2027, NOW)).toBe(true)
  })
  it.each([1799, 2028, 2007.5, Number.NaN, '2007', null])('rechaza %s', (v) => {
    expect(isValidMilestoneYear(v, NOW)).toBe(false)
  })
})

describe('LT-01: isSafeMilestoneLink', () => {
  it('acepta https sin credenciales', () => {
    expect(isSafeMilestoneLink('https://www.unc.edu.py/noticias/x')).toBe(true)
  })
  it.each(['javascript:alert(1)', 'http://www.unc.edu.py', 'https://u:p@x.example', ' https://x.example', '//x.example', 'data:text/html,x', ''])(
    'rechaza %s',
    (v) => {
      expect(isSafeMilestoneLink(v)).toBe(false)
    },
  )
})

describe('LT-01: mapMilestones', () => {
  it('ordena por año, luego orden, luego título', () => {
    const list = mapMilestones(
      [
        row({ id: 1, anio: 2010, orden: 2, titulo: 'B' }),
        row({ id: 2, anio: 2008, orden: 99, titulo: 'Z' }),
        row({ id: 3, anio: 2010, orden: 1, titulo: 'C' }),
        row({ id: 4, anio: 2010, orden: 2, titulo: 'A' }),
      ],
      'es',
      resolve,
      NOW,
    )
    expect(list.map((m) => m.id)).toEqual([2, 3, 4, 1])
  })

  it('descarta filas inválidas sin lanzar', () => {
    expect(mapMilestones(null, 'es', resolve, NOW)).toEqual([])
    const list = mapMilestones(
      [
        null,
        'x',
        row({ id: 1, titulo: '  ' }),
        row({ id: 2, descripcion: undefined }),
        row({ id: 3, anio: 1700 }),
        row({ id: undefined }),
        row({ id: 9 }),
      ],
      'es',
      resolve,
      NOW,
    )
    expect(list.map((m) => m.id)).toEqual([9])
  })

  it('usa la traducción del idioma y cae al español por campo marcando lang="es"', () => {
    const r = row({
      traducciones: { en: { titulo: 'Creation', descripcion: '' }, ptBR: { titulo: 'Criação', descripcion: 'Cria-se.' } },
    })
    const [en] = mapMilestones([r], 'en', resolve, NOW)
    expect(en.titulo).toBe('Creation')
    expect(en.tituloLang).toBeNull()
    expect(en.descripcion).toBe('Se crea la Universidad.')
    expect(en.descripcionLang).toBe('es')
    const [pt] = mapMilestones([r], 'pt-BR', resolve, NOW)
    expect(pt).toMatchObject({ titulo: 'Criação', descripcion: 'Cria-se.', tituloLang: null, descripcionLang: null })
    const [gn] = mapMilestones([r], 'gn', resolve, NOW)
    expect(gn).toMatchObject({ titulo: 'Creación', tituloLang: 'es' })
    const [es] = mapMilestones([r], 'es', resolve, NOW)
    expect(es).toMatchObject({ titulo: 'Creación', tituloLang: null, descripcionLang: null })
  })

  it('etiquetaFecha opcional y recortada', () => {
    const [m] = mapMilestones([row({ etiquetaFecha: '  Marzo de 2008 ' })], 'es', resolve, NOW)
    expect(m.etiquetaFecha).toBe('Marzo de 2008')
    const [n] = mapMilestones([row()], 'es', resolve, NOW)
    expect(n.etiquetaFecha).toBeNull()
  })

  it('enlace solo si es https seguro; si no, el hito se muestra sin enlace', () => {
    const [ok] = mapMilestones([row({ enlace: 'https://www.bacn.gov.py/x' })], 'es', resolve, NOW)
    expect(ok.enlace).toBe('https://www.bacn.gov.py/x')
    const [bad] = mapMilestones([row({ enlace: 'javascript:alert(1)' })], 'es', resolve, NOW)
    expect(bad.enlace).toBeNull()
  })

  it('imagen resuelta con alt, blur y dimensiones; URL insegura = sin imagen', () => {
    const [m] = mapMilestones(
      [row({ imagen: { url: '/api/media/file/a.webp', alt: 'Fachada', blurDataURL: 'data:image/webp;base64,AA', width: 1600, height: 900 } })],
      'es',
      resolve,
      NOW,
    )
    expect(m.imagen).toEqual({ src: 'http://cms.test/api/media/file/a.webp', alt: 'Fachada', blurDataURL: 'data:image/webp;base64,AA', width: 1600, height: 900 })
    const [n] = mapMilestones([row({ imagen: { url: 'https://evil.example/a.png', alt: 'x' } })], 'es', resolve, NOW)
    expect(n.imagen).toBeNull()
    const [o] = mapMilestones([row({ imagen: 6 })], 'es', resolve, NOW)
    expect(o.imagen).toBeNull()
    const [p] = mapMilestones([row({ imagen: { url: '/api/media/file/b.webp' } })], 'es', resolve, NOW)
    expect(p.imagen).toMatchObject({ alt: '', blurDataURL: null, width: null, height: null })
  })
})

describe('LT-01: yearSpan', () => {
  it('primer y último año; null si no hay hitos', () => {
    const list = mapMilestones([row({ id: 1, anio: 2024 }), row({ id: 2, anio: 2007 })], 'es', resolve, NOW)
    expect(yearSpan(list)).toEqual({ from: 2007, to: 2024 })
    expect(yearSpan([])).toBeNull()
  })
})
