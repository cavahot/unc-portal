// MIG-WP-NORM-01: normalizador de título, slug y resumen del importador de WordPress (tarea: migración nov-2026, T3).
// Qué comprueba: (1) que las «letras matemáticas» de Unicode (𝗨𝗡𝗖…) pasen a texto común; (2) espacios, longitud y mayúsculas
//   sostenidas de los títulos; (3) slugs legibles cuando WordPress los trae codificados en porcentaje; (4) resumen de 20-300
//   caracteres derivado del extracto, del cuerpo o, en último caso, del título, siempre indicando de dónde salió.
// Por qué: auditoría del volcado (docs/specs/migration/AUDITORIA-VOLCADO-WP-2026-11-09.md): 16 títulos con letras
//   matemáticas (los lectores de pantalla las leen letra por letra y el buscador no las encuentra), 16 slugs `%f0%9d…`,
//   106 títulos en mayúsculas, 278 de 281 noticias sin extracto y el campo `summary` del CMS exige 20-300 caracteres.
// Amenazas: texto inaccesible o no buscable en el portal público; URL ilegibles; noticias descartadas por falta de resumen;
//   cambiar el sentido de un título al normalizarlo. Límite: pruebas con textos sintéticos; la decisión de pasar las
//   mayúsculas a formato de oración es del Product Owner (por defecto NO se toca).
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
// @ts-expect-error módulo .mjs sin tipos
import { deriveSummary, existingSlugCandidates, normalizePost, normalizeTitle, slugForPost } from '../../scripts/lib/wpNormalize.mjs'

/** Convierte A-Z / a-z a las «letras matemáticas en negrita sans-serif» (U+1D5D4 / U+1D5EE) para armar títulos de prueba. */
const bold = (s: string) =>
  [...s]
    .map((ch) => {
      if (ch >= 'A' && ch <= 'Z') return String.fromCodePoint(0x1d5d4 + ch.charCodeAt(0) - 65)
      if (ch >= 'a' && ch <= 'z') return String.fromCodePoint(0x1d5ee + ch.charCodeAt(0) - 97)
      return ch
    })
    .join('')

describe('normalizeTitle', () => {
  it('convierte las letras matemáticas de Unicode en texto común', () => {
    const r = normalizeTitle(`${bold('UNC')} ${bold('organiza')} ${bold('Congreso')} ${bold('Nacional')}`)
    expect(r.title).toBe('UNC organiza Congreso Nacional')
    expect(r.notes).toContain('titulo_unicode_normalizado')
  })

  it('conserva las tildes (compone el acento combinado)', () => {
    const r = normalizeTitle(`${bold('exito')}`.replace(String.fromCodePoint(0x1d5f2), `${String.fromCodePoint(0x1d5f2)}́`))
    expect(r.title).toBe('éxito')
  })

  it('recorta espacios dobles, bordes y espacios no separables', () => {
    expect(normalizeTitle('  Hola   mundo   UNC  ').title).toBe('Hola mundo UNC')
  })

  it('un título normal no cambia ni genera notas', () => {
    const r = normalizeTitle('La UNC participó del VI Congreso Nacional de Extensión Universitaria')
    expect(r.title).toBe('La UNC participó del VI Congreso Nacional de Extensión Universitaria')
    expect(r.notes).toEqual([])
  })

  it('un título de más de 150 caracteres se corta en una palabra completa y termina en «…»', () => {
    const largo = 'Convocatoria '.repeat(20).trim()
    const r = normalizeTitle(largo)
    expect(r.title.length).toBeLessThanOrEqual(150)
    expect(r.title.endsWith('…')).toBe(true)
    expect(r.title).not.toMatch(/Convoc…$/)
    expect(r.notes).toContain('titulo_recortado')
  })

  it('un título vacío queda marcado y recibe un valor de respaldo', () => {
    const r = normalizeTitle('   ')
    expect(r.title).toBe('Sin título')
    expect(r.notes).toContain('titulo_vacio')
  })

  describe('mayúsculas sostenidas (decisión del Product Owner: por defecto no se tocan)', () => {
    const caps = 'CONVOCATORIA PROCESO DE CONCURSO PARA ACCESO A LA CATEGORÍA DE PROFESOR ASISTENTE EN LA UNC'

    it('por defecto se conservan', () => {
      expect(normalizeTitle(caps).title).toBe(caps)
    })

    it('con caps=oracion pasan a formato de oración y respetan siglas, números y romanos', () => {
      const r = normalizeTitle(caps, { caps: 'oracion' })
      expect(r.title).toBe('Convocatoria proceso de concurso para acceso a la categoría de profesor asistente en la UNC')
      expect(r.notes).toContain('titulo_mayusculas_a_oracion')
      expect(normalizeTitle('IV CONGRESO NACIONAL SOBRE CAMBIO GLOBAL EN LA FCEA', { caps: 'oracion' }).title).toBe(
        'IV congreso nacional sobre cambio global en la FCEA',
      )
      expect(normalizeTitle('CONCURSO NRO. 02/2019 DE LA UNC Y COVID-19', { caps: 'oracion' }).title).toBe(
        'Concurso nro. 02/2019 de la UNC y COVID-19',
      )
    })

    it('un título con minúsculas nunca se modifica, aunque se pida caps=oracion', () => {
      const t = 'La UNC participó del VI CONEU 2026'
      expect(normalizeTitle(t, { caps: 'oracion' }).title).toBe(t)
    })
  })
})

describe('slugForPost', () => {
  it('conserva el slug de WordPress cuando es legible (las URL existentes no cambian)', () => {
    expect(slugForPost({ wpSlug: 'comunicado-rectorado', title: 'COMUNICADO - RECTORADO', id: '24711' })).toEqual({
      slug: 'comunicado-rectorado',
      notes: [],
    })
  })

  it('regenera desde el título normalizado un slug codificado en porcentaje', () => {
    const wpSlug = '%f0%9d%97%a8%f0%9d%97%a1%f0%9d%97%96-%f0%9d%97%bc%f0%9d%97%bf'
    const r = slugForPost({ wpSlug, title: 'UNC organiza Congreso Nacional Multidisciplinario', id: '1' })
    expect(r.slug).toBe('unc-organiza-congreso-nacional-multidisciplinario')
    expect(r.slug).not.toContain('%')
    expect(r.notes).toContain('slug_regenerado')
  })

  it('sin slug usa el título más el ID y respeta los 100 caracteres', () => {
    const r = slugForPost({ wpSlug: '', title: 'Título sin slug', id: '77' })
    expect(r.slug).toBe('titulo-sin-slug-77')
    expect(slugForPost({ wpSlug: '', title: 'palabra '.repeat(40), id: '5' }).slug.length).toBeLessThanOrEqual(100)
  })
})

// MIG-WP-NORM-02: el importador decide si una noticia ya existe buscando su slug. Al regenerar los slugs codificados
// (MIG-WP-NORM-01), las 16 noticias ya cargadas con el slug `%f0%9d…` dejaron de encontrarse y se crearon de nuevo
// (corrida local del 2026-11-09: ids 274-289 duplicados). Estas pruebas exigen que también se busque el slug anterior.
describe('existingSlugCandidates (no duplicar noticias ya cargadas)', () => {
  const wpSlug = '%f0%9d%97%a8%f0%9d%97%a1%f0%9d%97%96-%f0%9d%97%bc%f0%9d%97%bf'

  it('con slug codificado busca el slug nuevo y después el que usaba el importador anterior', () => {
    const norm = normalizePost({ id: '9', title: `${bold('UNC')} ${bold('organiza')}`, wpSlug, excerpt: '', content: '', caps: 'mantener' })
    expect(existingSlugCandidates(norm)).toEqual(['unc-organiza', wpSlug])
  })

  it('el slug anterior se recorta a 100 caracteres, como lo guardaba el importador anterior', () => {
    const largo = '%f0%9d%97%a8'.repeat(12)
    const norm = normalizePost({ id: '9', title: 'UNC organiza', wpSlug: largo, excerpt: '', content: '', caps: 'mantener' })
    expect(existingSlugCandidates(norm)).toEqual(['unc-organiza', largo.slice(0, 100)])
  })

  it('sin slug y con título decorativo también prueba el slug anterior (título original + ID)', () => {
    const norm = normalizePost({ id: '42', title: `${bold('Acto')} oficial`, wpSlug: '', excerpt: '', content: '', caps: 'mantener' })
    expect(existingSlugCandidates(norm)).toEqual(['acto-oficial-42', 'oficial-42'])
  })

  it('con slug legible hay un solo candidato (comportamiento previo intacto)', () => {
    const norm = normalizePost({ id: '1', title: 'Comunicado', wpSlug: 'comunicado-rectorado', excerpt: '', content: '', caps: 'mantener' })
    expect(existingSlugCandidates(norm)).toEqual(['comunicado-rectorado'])
  })
})

describe('deriveSummary', () => {
  it('usa el extracto de WordPress si tiene 20 caracteres o más (máximo 300)', () => {
    const r = deriveSummary({ excerpt: 'Resumen escrito a mano por la oficina de prensa.', content: '<p>otro</p>', title: 'T' })
    expect(r).toMatchObject({ summary: 'Resumen escrito a mano por la oficina de prensa.', source: 'extracto' })
    expect(deriveSummary({ excerpt: 'a'.repeat(400), content: '', title: 'T' }).summary.length).toBeLessThanOrEqual(300)
  })

  it('sin extracto lo deriva del cuerpo, sin etiquetas, comentarios ni shortcodes', () => {
    const content =
      '<!-- wp:paragraph --><p>[vc_row][caption]Pie[/caption] La Universidad Nacional de Concepción recibió a la delegación de HAMK en el marco de una visita técnica.</p><!-- /wp:paragraph -->'
    const r = deriveSummary({ excerpt: '', content, title: 'Visita' })
    expect(r.source).toBe('cuerpo')
    expect(r.summary).toMatch(/^Pie La Universidad Nacional de Concepción recibió/)
    expect(r.summary).not.toMatch(/[<>\[\]]/)
    expect(r.summary.length).toBeGreaterThanOrEqual(20)
    expect(r.summary.length).toBeLessThanOrEqual(300)
  })

  it('un cuerpo largo se corta en una palabra completa y termina en «…»', () => {
    const r = deriveSummary({ excerpt: '', content: `<p>${'palabra '.repeat(100)}</p>`, title: 'T' })
    expect(r.summary.length).toBeLessThanOrEqual(300)
    expect(r.summary.endsWith('…')).toBe(true)
  })

  it('si el cuerpo no alcanza usa el título y lo indica para revisión editorial', () => {
    const r = deriveSummary({ excerpt: '', content: '<p>.</p>', title: 'COMUNICADO - RECTORADO' })
    expect(r).toMatchObject({ summary: 'COMUNICADO - RECTORADO', source: 'titulo' })
  })

  it('si ni el título alcanza devuelve nulo (la noticia no se puede importar sin decisión humana)', () => {
    expect(deriveSummary({ excerpt: '', content: '', title: 'Corto' })).toMatchObject({ summary: null, source: 'insuficiente' })
  })
})

describe('normalizePost', () => {
  it('une título, slug y resumen y reúne las notas para el informe', () => {
    const r = normalizePost({
      id: '10',
      title: `${bold('UNC')} ${bold('celebra')} ${bold('acreditación')} ${bold('de')} ${bold('carreras')}`,
      wpSlug: '%f0%9d%97%a8%f0%9d%97%a1%f0%9d%97%96',
      excerpt: '',
      content: '<p>La UNC celebró la acreditación de sus carreras ante la ANEAES en un acto público.</p>',
    })
    expect(r.title).toBe('UNC celebra acreditación de carreras')
    expect(r.slug).toBe('unc-celebra-acreditacion-de-carreras')
    expect(r.summarySource).toBe('cuerpo')
    expect(r.notes).toEqual(expect.arrayContaining(['titulo_unicode_normalizado', 'slug_regenerado', 'resumen_desde_cuerpo']))
  })
})

describe('el importador usa el normalizador', () => {
  const src = readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'migrate-wordpress.mjs'), 'utf8')

  it('importa normalizePost y ya no arma título, slug y resumen por su cuenta', () => {
    expect(src).toMatch(/from '\.\/lib\/wpNormalize\.mjs'/)
    expect(src).toMatch(/normalizePost\(/)
    expect(src).not.toMatch(/post\.post_title \|\| 'Sin título'\)\.slice\(0, 150\)/)
  })

  it('expone --caps=oracion (por defecto no cambia las mayúsculas)', () => {
    expect(src).toMatch(/--caps=/)
  })
})
