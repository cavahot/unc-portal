import { describe, expect, it } from 'vitest'
import {
  cleanContentHtml,
  extractEmbeddedImages,
  normalizeUploadUrl,
  pickFeaturedImage,
  safeLocalPath,
  stripShortcodes,
  stripWpComments,
  wpDateInfo,
  wpDateToIso,
} from '../../scripts/lib/wpContent.mjs'

/**
 * MIG-WP: lógica pura de limpieza de contenido de la migración WordPress -> Payload.
 * Amenaza/propósito: la versión anterior borraba cualquier `[...]` del texto (perdía "[sic]", "[1]"),
 * dejaba comentarios Gutenberg como texto residual, descartaba imágenes embebidas sin dejar rastro y
 * convertía fechas con la hora de la máquina. Límite: solo funciones puras; la lectura del XML y la
 * escritura al CMS no se prueban aquí (el dry-run no hace red ni escritura).
 */

describe('MIG-WP comentarios Gutenberg', () => {
  it('elimina comentarios de apertura, cierre y multilínea sin dejar residuos', () => {
    const html = '<!-- wp:paragraph -->\n<p>Hola</p>\n<!-- /wp:paragraph -->\n<!-- wp:image {"id":1,\n"x":2} -->\n<p>Fin</p>'
    const out = stripWpComments(html)
    expect(out).not.toContain('<!--')
    expect(out).not.toContain('wp:')
    expect(out.replace(/\s+/g, ' ').trim()).toBe('<p>Hola</p> <p>Fin</p>')
  })
  it('cleanContentHtml marca la bandera de Gutenberg', () => {
    expect(cleanContentHtml('<!-- wp:p --><p>a</p><!-- /wp:p -->').flags.gutenberg).toBe(true)
    expect(cleanContentHtml('<p>a</p>').flags.gutenberg).toBe(false)
  })
})

describe('MIG-WP shortcodes acotados', () => {
  it('conserva corchetes legítimos del texto', () => {
    const txt = 'El autor [sic] citó [1] y dejó [...] pendiente.'
    expect(stripShortcodes(txt)).toBe(txt)
  })
  it.each([
    ['[vc_row][vc_column]Texto[/vc_column][/vc_row]', 'Texto'],
    ['[vc_column_text css=".vc_custom_1{margin:0}"]Cuerpo[/vc_column_text]', 'Cuerpo'],
    ['[vc_tta_accordion][vc_tta_section title="Uno"]Interno[/vc_tta_section][/vc_tta_accordion]', 'Interno'],
    ['[us_separator size="small"]Texto', 'Texto'],
    ['[us_grid post_type="post"]', ''],
    ['[caption id="attachment_5" align="alignnone" width="300"]Pie de foto[/caption]', 'Pie de foto'],
    ['[pdf-embedder url="https://x/a.pdf"]', ''],
    ['[mitic_blog][mitic_rss_data]', ''],
    ['[contact-form-7 id="12" title="Contacto"]', ''],
    ['[Ingresar]', ''],
  ])('elimina %s', (input, expected) => {
    expect(stripShortcodes(input).trim()).toBe(expected)
  })
  it('no cruza otros corchetes ni consume texto entre dos corchetes legítimos', () => {
    const txt = 'Ver [1] y luego [vc_row] fin [2]'
    expect(stripShortcodes(txt)).toBe('Ver [1] y luego  fin [2]')
  })
  it('un shortcode con atributos de más de 500 caracteres no se elimina', () => {
    const long = `[vc_row css="${'a'.repeat(600)}"]`
    expect(stripShortcodes(long)).toBe(long)
  })
  it('cleanContentHtml marca la bandera de shortcodes', () => {
    expect(cleanContentHtml('[vc_row]x[/vc_row]').flags.shortcodes).toBe(true)
    expect(cleanContentHtml('x [sic]').flags.shortcodes).toBe(false)
  })
})

describe('MIG-WP normalización de URLs de uploads', () => {
  it.each([
    ['http://unc.edu.py/wp-content/uploads/2025/03/a.jpg'],
    ['https://www.unc.edu.py/wp-content/uploads/2025/03/a.jpg'],
    ['https://migracion.unc.edu.py/wp-content/uploads/2025/03/a.jpg?resize=300'],
    ['//unc.edu.py/wp-content/uploads/2025/03/a.jpg'],
    ['/wp-content/uploads/2025/03/a.jpg'],
  ])('%s -> URL canónica recuperable', (src) => {
    const r = normalizeUploadUrl(src)
    expect(r.estado).toBe('recuperable')
    expect(r.url).toBe('https://www.unc.edu.py/wp-content/uploads/2025/03/a.jpg')
    expect(r.relPath).toBe('2025/03/a.jpg')
  })
  it.each([
    ['https://www.unc.edu.py/application/files/1234/foto.jpg'],
    ['/application/files/1234/foto.jpg'],
    ['https://scontent.fbcdn.net/v/t1/foto.jpg'],
    ['https://www.unc.edu.py/wp-content/themes/x/logo.png'],
  ])('%s -> no recuperable, sin descartarse', (src) => {
    const r = normalizeUploadUrl(src)
    expect(r.estado).toBe('no recuperable')
    expect(r.relPath).toBeNull()
    expect(r.url).toBe(src)
  })
})

describe('MIG-WP rutas locales seguras', () => {
  const dir = 'C:/data/uploads'
  it('compone la ruta dentro del directorio', () => {
    const p = safeLocalPath(dir, '2025/03/a.jpg')
    expect(p).not.toBeNull()
    expect(p!.replace(/\\/g, '/')).toBe('C:/data/uploads/2025/03/a.jpg')
  })
  it.each(['../secreto.txt', '2025/../../x.jpg', '2025/03/..', '/etc/passwd', 'C:\\x.jpg', '2025\\03\\a.jpg', '', '2025//a.jpg'])(
    'rechaza %s',
    (rel) => {
      expect(safeLocalPath(dir, rel)).toBeNull()
    },
  )
})

describe('MIG-WP imágenes embebidas', () => {
  const html =
    '<p><img class="x" src="http://unc.edu.py/wp-content/uploads/2025/03/a.jpg" alt="Foto A"></p>' +
    "<img src='https://www.unc.edu.py/application/files/9/b.jpg'>" +
    '<img src="https://scontent.fbcdn.net/c.jpg" alt="C">' +
    '<img src="https://www.unc.edu.py/wp-content/uploads/2025/03/a.jpg">'
  const exists = (p: string) => p.replace(/\\/g, '/').endsWith('/2025/03/a.jpg')

  it('lista todas las imágenes, sin duplicados, con estado y archivo local', () => {
    const imgs = extractEmbeddedImages(html, { uploadsDir: 'C:/data/uploads', fileExists: exists })
    expect(imgs).toHaveLength(3)
    expect(imgs[0]).toMatchObject({
      url: 'https://www.unc.edu.py/wp-content/uploads/2025/03/a.jpg',
      alt: 'Foto A',
      estado: 'recuperable',
    })
    expect(imgs[0].localPath!.replace(/\\/g, '/')).toBe('C:/data/uploads/2025/03/a.jpg')
    expect(imgs[1]).toMatchObject({ estado: 'no recuperable', localPath: null })
    expect(imgs[2]).toMatchObject({ estado: 'no recuperable', localPath: null, alt: 'C' })
  })
  it('recuperable sin archivo local -> localPath null', () => {
    const imgs = extractEmbeddedImages(html, { uploadsDir: 'C:/data/uploads', fileExists: () => false })
    expect(imgs[0].localPath).toBeNull()
    expect(imgs[0].estado).toBe('recuperable')
  })
  it('sin imágenes -> lista vacía', () => {
    expect(extractEmbeddedImages('<p>nada</p>', { uploadsDir: 'x', fileExists: () => false })).toEqual([])
  })
})

describe('MIG-WP imagen destacada con respaldo', () => {
  const body = [
    { url: 'https://scontent.fbcdn.net/c.jpg', localPath: null, alt: '', estado: 'no recuperable' },
    { url: 'https://www.unc.edu.py/wp-content/uploads/2025/03/a.jpg', localPath: null, alt: '', estado: 'recuperable' },
  ]
  it('miniatura resuelta tiene prioridad', () => {
    const r = pickFeaturedImage({ thumbnailUrl: 'http://unc.edu.py/wp-content/uploads/2024/01/t.jpg', embedded: body })
    expect(r.source).toBe('miniatura')
    expect(r.url).toBe('https://www.unc.edu.py/wp-content/uploads/2024/01/t.jpg')
  })
  it('sin miniatura usa la primera imagen embebida recuperable', () => {
    const r = pickFeaturedImage({ thumbnailUrl: null, embedded: body })
    expect(r.source).toBe('cuerpo')
    expect(r.url).toBe('https://www.unc.edu.py/wp-content/uploads/2025/03/a.jpg')
  })
  it('sin nada -> ninguna', () => {
    expect(pickFeaturedImage({ thumbnailUrl: null, embedded: [] })).toEqual({ url: null, source: 'ninguna', relPath: null })
    expect(pickFeaturedImage({ thumbnailUrl: null, embedded: [body[0]] }).source).toBe('ninguna')
  })
})

describe('MIG-WP fecha en zona horaria de Paraguay', () => {
  // Pares reales post_date / post_date_gmt del volcado (invierno 2019, verano 2020, 2026).
  it.each([
    ['2019-06-10 10:47:29', '2019-06-10 14:47:29', '2019-06-10T14:47:29.000Z'],
    ['2020-01-15 13:49:37', '2020-01-15 16:49:37', '2020-01-15T16:49:37.000Z'],
    ['2026-01-22 22:45:00', '2026-01-23 01:45:00', '2026-01-23T01:45:00.000Z'],
  ])('prefiere post_date_gmt (%s)', (local, gmt, iso) => {
    expect(wpDateToIso({ post_date: local, post_date_gmt: gmt })).toBe(iso)
  })
  it('sin GMT válido convierte desde America/Asuncion (invierno UTC-4, verano UTC-3)', () => {
    expect(wpDateToIso({ post_date: '2019-06-10 10:47:29', post_date_gmt: '0000-00-00 00:00:00' })).toBe('2019-06-10T14:47:29.000Z')
    expect(wpDateToIso({ post_date: '2020-01-15 13:49:37', post_date_gmt: '' })).toBe('2020-01-15T16:49:37.000Z')
  })
  it('desde octubre de 2024 el horario es UTC-3 permanente', () => {
    expect(wpDateToIso({ post_date: '2025-07-01 12:00:00', post_date_gmt: '0000-00-00 00:00:00' })).toBe('2025-07-01T15:00:00.000Z')
    expect(wpDateToIso({ post_date: '2026-01-22 22:45:00', post_date_gmt: '0000-00-00 00:00:00' })).toBe('2026-01-23T01:45:00.000Z')
  })
  it('cambio de horario: 2023-10-01 (inicio de verano) y 2024-03-24 (fin de verano)', () => {
    expect(wpDateToIso({ post_date: '2023-09-30 12:00:00', post_date_gmt: '' })).toBe('2023-09-30T16:00:00.000Z')
    expect(wpDateToIso({ post_date: '2023-10-02 12:00:00', post_date_gmt: '' })).toBe('2023-10-02T15:00:00.000Z')
    expect(wpDateToIso({ post_date: '2024-03-20 12:00:00', post_date_gmt: '' })).toBe('2024-03-20T15:00:00.000Z')
    expect(wpDateToIso({ post_date: '2024-03-28 12:00:00', post_date_gmt: '' })).toBe('2024-03-28T16:00:00.000Z')
  })
  // Regla corregida: post_date_gmt solo vale si DIFIERE de post_date. Si es igual, WordPress no calculó el GMT
  // (importación 2016-2017) y se convierte post_date desde America/Asuncion.
  it('(a) gmt == local (importadas 2016-2017) se convierte con el offset IANA, no como UTC', () => {
    // 2016-12-15 es horario de verano (UTC-3); 2017-09-01 es invierno (UTC-4). Pares reales del volcado.
    expect(wpDateToIso({ post_date: '2016-12-15 13:01:17', post_date_gmt: '2016-12-15 13:01:17' })).toBe('2016-12-15T16:01:17.000Z')
    expect(wpDateToIso({ post_date: '2017-09-01 13:30:49', post_date_gmt: '2017-09-01 13:30:49' })).toBe('2017-09-01T17:30:49.000Z')
  })
  it('(b) Oct 2024-2025 con gmt = local + 4 h respeta el gmt (el servidor usó UTC-4)', () => {
    expect(wpDateToIso({ post_date: '2024-10-21 17:49:00', post_date_gmt: '2024-10-21 21:49:00' })).toBe('2024-10-21T21:49:00.000Z')
    expect(wpDateToIso({ post_date: '2024-11-21 18:46:03', post_date_gmt: '2024-11-21 22:46:03' })).toBe('2024-11-21T22:46:03.000Z')
  })
  it('(c) 2026 con gmt = local + 3 h respeta el gmt', () => {
    expect(wpDateToIso({ post_date: '2026-02-20 11:53:53', post_date_gmt: '2026-02-20 14:53:53' })).toBe('2026-02-20T14:53:53.000Z')
  })
  it('(d) gmt 0000-00-00 o ausente -> conversión IANA', () => {
    expect(wpDateToIso({ post_date: '2017-09-01 13:30:49', post_date_gmt: '0000-00-00 00:00:00' })).toBe('2017-09-01T17:30:49.000Z')
    expect(wpDateToIso({ post_date: '2017-09-01 13:30:49' })).toBe('2017-09-01T17:30:49.000Z')
  })
  it('(e) 23:30 local con gmt == local no cambia el día local', () => {
    const iso = wpDateToIso({ post_date: '2019-06-10 23:30:00', post_date_gmt: '2019-06-10 23:30:00' })
    expect(iso).toBe('2019-06-11T03:30:00.000Z')
    const back = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Asuncion', dateStyle: 'short', timeStyle: 'medium' }).format(new Date(iso!))
    expect(back).toBe('2019-06-10 23:30:00')
  })
  it('wpDateInfo informa la fuente usada', () => {
    expect(wpDateInfo({ post_date: '2026-02-20 11:53:53', post_date_gmt: '2026-02-20 14:53:53' }).source).toBe('gmt')
    expect(wpDateInfo({ post_date: '2017-09-01 13:30:49', post_date_gmt: '2017-09-01 13:30:49' }).source).toBe('local')
    expect(wpDateInfo({ post_date: '2017-09-01 13:30:49', post_date_gmt: '0000-00-00 00:00:00' }).source).toBe('local')
    expect(wpDateInfo({ post_date: '', post_date_gmt: '' })).toEqual({ iso: null, source: null })
  })
  it('sin ninguna fecha devuelve null', () => {
    expect(wpDateToIso({ post_date: '', post_date_gmt: '0000-00-00 00:00:00' })).toBeNull()
  })
})
