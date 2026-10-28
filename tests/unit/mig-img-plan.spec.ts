// MIG-IMG fase 3 (P-11): lógica PURA del cargador masivo de imágenes de noticias
// (scripts/lib/mediaLoader.mjs). Amenazas: (1) subir al CMS un archivo no-imagen o con nombre peligroso;
// (2) enlazar la imagen equivocada a una noticia por derivar mal el slug; (3) informar «todo bien» cuando
// hay noticias sin imagen. Límite: sin red, sin disco real; el CMS repite y completa estas validaciones.
import { describe, expect, it } from 'vitest'
import {
  MEDIA_MAX_BYTES,
  buildNoticiaEntries,
  buildReport,
  describeFile,
  parseWpPosts,
  planMediaLinks,
  selectUploads,
  sha256Hex,
  validateUploadBytes,
} from '../../scripts/lib/mediaLoader.mjs'

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32, 1)])
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32, 2)])
const GIF = Buffer.concat([Buffer.from('GIF89a'), Buffer.alloc(32, 3)])
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(32, 4)])
const HTML = Buffer.from('<!doctype html><script>alert(1)</script>')

describe('validateUploadBytes — rechazos primero', () => {
  it('HTML renombrado .jpg', () => {
    expect(validateUploadBytes({ filename: 'foto.jpg', data: HTML })).toMatchObject({ ok: false, code: 'tipo' })
  })
  it('SVG con o sin script, aunque se llame .png', () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>')
    expect(validateUploadBytes({ filename: 'x.png', data: svg }).ok).toBe(false)
    expect(validateUploadBytes({ filename: 'x.svg', data: svg }).ok).toBe(false)
  })
  it('PNG con extensión .jpg', () => {
    expect(validateUploadBytes({ filename: 'a.jpg', data: PNG })).toMatchObject({ ok: false, code: 'extension' })
  })
  it('doble extensión peligrosa', () => {
    expect(validateUploadBytes({ filename: 'a.php.jpg', data: JPG })).toMatchObject({ ok: false, code: 'nombre' })
    expect(validateUploadBytes({ filename: 'a.svg.png', data: PNG })).toMatchObject({ ok: false, code: 'nombre' })
  })
  it.each(['../x.jpg', '..\\x.jpg', 'a/b.jpg', 'con\u0000nul.jpg', 'ctrl\u0007.jpg', '', '.jpg', 'sinext'])(
    'nombre inseguro %j',
    (filename) => {
      expect(validateUploadBytes({ filename, data: JPG })).toMatchObject({ ok: false, code: 'nombre' })
    },
  )
  it('vacío y demasiado grande', () => {
    expect(validateUploadBytes({ filename: 'a.jpg', data: Buffer.alloc(0) })).toMatchObject({ ok: false, code: 'vacio' })
    const big = Buffer.concat([JPG, Buffer.alloc(MEDIA_MAX_BYTES)])
    expect(validateUploadBytes({ filename: 'a.jpg', data: big })).toMatchObject({ ok: false, code: 'tamano' })
  })
  it('acepta jpeg, png, gif y webp coherentes, y el nombre real del lote con puntos', () => {
    expect(validateUploadBytes({ filename: '95.1-1-1.jpg', data: JPG })).toMatchObject({ ok: true, mimeType: 'image/jpeg' })
    expect(validateUploadBytes({ filename: 'a.jpeg', data: JPG }).ok).toBe(true)
    expect(validateUploadBytes({ filename: 'a.png', data: PNG })).toMatchObject({ ok: true, mimeType: 'image/png' })
    expect(validateUploadBytes({ filename: 'a.gif', data: GIF })).toMatchObject({ ok: true, mimeType: 'image/gif' })
    expect(validateUploadBytes({ filename: 'a.webp', data: WEBP })).toMatchObject({ ok: true, mimeType: 'image/webp' })
  })
})

const XML_POSTS = `
<table name="uncm1_posts"><column name="ID">1</column><column name="post_type">post</column><column name="post_status">publish</column><column name="post_name">uno</column><column name="post_title">Primer acto institucional</column><column name="post_date">2024-05-03 10:00:00</column><column name="post_date_gmt">2024-05-03 14:00:00</column><column name="post_content">&lt;p&gt;&lt;img src=&quot;https://www.unc.edu.py/wp-content/uploads/2024/05/a.jpg&quot; alt=&quot;Foto del acto A&quot;&gt;&lt;img src=&quot;https://www.unc.edu.py/wp-content/uploads/2024/05/b.jpg&quot; alt=&quot;&quot;&gt;&lt;/p&gt;</column></table>
<table name="uncm1_posts"><column name="ID">2</column><column name="post_type">post</column><column name="post_status">publish</column><column name="post_name"></column><column name="post_title">Sin Nombre Ñandú</column><column name="post_date">2019-01-02 10:00:00</column><column name="post_date_gmt">2019-01-02 13:00:00</column><column name="post_content">&lt;p&gt;texto&lt;/p&gt;</column></table>
<table name="uncm1_posts"><column name="ID">3</column><column name="post_type">post</column><column name="post_status">publish</column><column name="post_name">uno</column><column name="post_title">Otra</column><column name="post_date">2025-01-02 10:00:00</column><column name="post_date_gmt">2025-01-02 13:00:00</column><column name="post_content"></column></table>
<table name="uncm1_posts"><column name="ID">4</column><column name="post_type">post</column><column name="post_status">draft</column><column name="post_name">borrador</column><column name="post_title">B</column><column name="post_date">2025-01-02 10:00:00</column><column name="post_date_gmt">2025-01-02 13:00:00</column><column name="post_content"></column></table>
<table name="uncm1_posts"><column name="ID">9</column><column name="post_type">attachment</column><column name="post_status">inherit</column><column name="guid">https://www.unc.edu.py/wp-content/uploads/2024/05/thumb.jpg</column></table>
<table name="uncm1_postmeta"><column name="post_id">1</column><column name="meta_key">_thumbnail_id</column><column name="meta_value">9</column></table>
`

describe('parseWpPosts — slug igual que migrate-wordpress.mjs', () => {
  const posts = parseWpPosts(XML_POSTS)
  it('solo posts publicados; borrador y adjuntos no cuentan', () => {
    expect(posts.map((p: { id: string }) => p.id)).toEqual(['1', '2', '3'])
  })
  it('post_name, slugify(título)-ID y colisión → recorte + -ID', () => {
    expect(posts.map((p: { slug: string }) => p.slug)).toEqual(['uno', 'sin-nombre-nandu-2', 'uno-3'])
  })
  it('año/mes de publishedAt (Asunción) y miniatura resuelta desde el adjunto', () => {
    expect(posts[0]).toMatchObject({ year: 2024, month: 5, thumbnailUrl: 'https://www.unc.edu.py/wp-content/uploads/2024/05/thumb.jpg' })
    expect(posts[1].thumbnailUrl).toBeNull()
  })
})

describe('buildNoticiaEntries', () => {
  const posts = parseWpPosts(XML_POSTS)
  const have = new Set(['/up/2024/05/a.jpg', '/up/2024/05/b.jpg'])
  const fileExists = (p: string) => have.has(p)

  it('miniatura ausente en disco → destacada = primera del cuerpo que existe; galería sin la destacada', () => {
    const [uno] = buildNoticiaEntries(posts, { uploadsDir: '/up', fileExists })
    expect(uno.featured).toMatchObject({ relPath: '2024/05/a.jpg', source: 'cuerpo' })
    expect(uno.gallery.map((g: { relPath: string }) => g.relPath)).toEqual(['2024/05/b.jpg'])
    expect(uno.missing).toContain('2024/05/thumb.jpg')
  })
  it('miniatura presente en disco → es la destacada y las del cuerpo van a la galería', () => {
    have.add('/up/2024/05/thumb.jpg')
    const [uno] = buildNoticiaEntries(posts, { uploadsDir: '/up', fileExists })
    expect(uno.featured).toMatchObject({ relPath: '2024/05/thumb.jpg', source: 'miniatura' })
    expect(uno.gallery.map((g: { relPath: string }) => g.relPath)).toEqual(['2024/05/a.jpg', '2024/05/b.jpg'])
    have.delete('/up/2024/05/thumb.jpg')
  })
  it('alt vacío → título; alt con < o > se limpia; nunca vacío', () => {
    const [uno] = buildNoticiaEntries(posts, { uploadsDir: '/up', fileExists })
    expect(uno.gallery[0].alt).toBe('Primer acto institucional')
    expect(uno.featured.alt).toBe('Foto del acto A')
  })
  it('sin imagen local → featured null, sin error', () => {
    const entries = buildNoticiaEntries(posts, { uploadsDir: '/up', fileExists })
    expect(entries[1].featured).toBeNull()
    expect(entries[1].gallery).toEqual([])
  })
  it('galería limitada a 30', () => {
    const imgs = Array.from({ length: 40 }, (_, i) => `<img src="https://www.unc.edu.py/wp-content/uploads/2024/05/g${i}.jpg" alt="">`).join('')
    const many = [{ id: '7', slug: 's', title: 'T', year: 2024, month: 5, content: imgs, thumbnailUrl: null }]
    const [e] = buildNoticiaEntries(many, { uploadsDir: '/up', fileExists: () => true })
    expect(e.gallery).toHaveLength(30)
  })
})

describe('describeFile / buildReport / selectUploads', () => {
  const files = [
    describeFile('2024/05/a.jpg', JPG),
    describeFile('2024/05/b.jpg', JPG), // duplicado de a.jpg por contenido
    describeFile('2024/06/x.png', PNG),
    describeFile('2024/06/mala.jpg', HTML), // rechazada
    describeFile('2025/01/huerfana.gif', GIF),
  ]
  const noticias = [
    { slug: 'uno', year: 2024, month: 5, featured: { relPath: '2024/05/a.jpg', alt: 'A', source: 'miniatura' }, gallery: [{ relPath: '2024/05/b.jpg', alt: 'B' }, { relPath: '2024/06/mala.jpg', alt: 'M' }], missing: [] },
    { slug: 'dos', year: 2019, month: 1, featured: null, gallery: [], missing: ['2019/01/z.jpg'] },
    { slug: 'tres', year: 2024, month: 6, featured: { relPath: '2024/06/x.png', alt: 'X', source: 'cuerpo' }, gallery: [], missing: [] },
  ]

  it('describeFile calcula sha256, tamaño y estado', () => {
    expect(files[0]).toMatchObject({ relPath: '2024/05/a.jpg', bytes: JPG.length, sha256: sha256Hex(JPG), status: 'valido' })
    expect(files[3]).toMatchObject({ status: 'rechazado', reason: 'tipo' })
  })
  it('informe: conteos exactos', () => {
    const r = buildReport({ noticias, files })
    expect(r.files).toMatchObject({ total: 5, valid: 4, rejected: 1, rejectedByReason: { tipo: 1 } })
    expect(r.files.byYear).toEqual({ 2024: 4, 2025: 1 })
    expect(r.files.byYearMonth['2024/05']).toBe(2)
    expect(r.files.duplicatesBySha256).toEqual([{ sha256: sha256Hex(JPG), files: ['2024/05/a.jpg', '2024/05/b.jpg'] }])
    expect(r.noticias).toMatchObject({ total: 3, withFeatured: 2, withGallery: 1, withoutImage: 1 })
    expect(r.noticias.withoutImageByYear).toEqual({ 2019: 1 })
    expect(r.noticias.withoutImageSlugsByYear).toEqual({ 2019: ['dos'] })
    expect(r.orphans).toEqual(['2025/01/huerfana.gif'])
    expect(r.referencedButRejected).toEqual(['2024/06/mala.jpg'])
    expect(r.referencedButMissing).toEqual(['2019/01/z.jpg'])
  })
  it('selectUploads: solo válidas y referenciadas; duplicados por contenido se suben una vez', () => {
    const sel = selectUploads({ noticias, files })
    expect(sel.map((f: { relPath: string }) => f.relPath)).toEqual(['2024/05/a.jpg', '2024/06/x.png'])
    expect(selectUploads({ noticias, files, includeOrphans: true }).map((f: { relPath: string }) => f.relPath)).toEqual([
      '2024/05/a.jpg',
      '2024/06/x.png',
      '2025/01/huerfana.gif',
    ])
  })
})

describe('planMediaLinks', () => {
  const noticia = {
    slug: 'uno',
    featured: { relPath: 'a.jpg', alt: 'A' },
    gallery: [{ relPath: 'b.jpg', alt: 'B' }, { relPath: 'dup.jpg', alt: 'D' }, { relPath: 'c.jpg', alt: 'C' }],
  }
  it('resuelve ids; una galería idéntica en contenido a la destacada se omite; sin id → faltan', () => {
    const plan = planMediaLinks(noticia, { 'a.jpg': 10, 'b.jpg': 11, 'dup.jpg': 10 })
    expect(plan.featuredImage).toBe(10)
    expect(plan.gallery).toEqual([{ image: 11, caption: 'B' }])
    expect(plan.missing).toEqual(['c.jpg'])
  })
  it('galería sin duplicar ids repetidos', () => {
    const plan = planMediaLinks(
      { slug: 's', featured: null, gallery: [{ relPath: 'b.jpg', alt: 'B' }, { relPath: 'b2.jpg', alt: 'B2' }] },
      { 'b.jpg': 11, 'b2.jpg': 11 },
    )
    expect(plan.featuredImage).toBeNull()
    expect(plan.gallery).toEqual([{ image: 11, caption: 'B' }])
  })
})
