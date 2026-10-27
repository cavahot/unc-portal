// PRA-02: validación en el portal de las rutas de logo que llegan del CMS.
// Amenaza: un `logoPath` manipulado (traversal, URL externa, SVG, otra carpeta) terminaría como
// `src` de una imagen de la portada; el CSP bloquea hotlinks, pero esta es la segunda barrera.
// Límite: no comprueba que el archivo exista en disco.
import { describe, expect, it } from 'vitest'
import { safeLogoPath } from '@/lib/awards/logoPath'

describe('safeLogoPath', () => {
  it('acepta rutas versionadas de la carpeta pedida', () => {
    expect(safeLogoPath('/images/facultades/economicas.png', 'facultades')).toBe('/images/facultades/economicas.png')
    expect(safeLogoPath('/images/reconocimientos/premio-calidad-conacyt.jpg', 'reconocimientos')).toBe(
      '/images/reconocimientos/premio-calidad-conacyt.jpg',
    )
  })

  it.each([
    '../../etc/passwd.png',
    '/images/facultades/../../x.png',
    'https://x.test/y.png',
    '//x.test/y.png',
    '/images/otra/x.png',
    '/images/facultades/x.svg',
    '/images/facultades/sub/x.png',
    '/images/facultades/x.png?a=1',
    '/images/facultades/%2e%2e.png',
    'javascript:alert(1)',
    '',
    undefined,
    null,
    42,
  ])('rechaza %s', (value) => {
    expect(safeLogoPath(value, 'facultades')).toBeUndefined()
  })

  it('rechaza una ruta válida de otra carpeta', () => {
    expect(safeLogoPath('/images/facultades/x.png', 'reconocimientos')).toBeUndefined()
  })
})
