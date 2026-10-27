// PRA-01 (fase CMS): validadores de URL de fuente y de rutas estáticas de logo.
// Amenazas: (1) un `fuenteUrl`/`sitioOficial` con `javascript:`, `http:` o `//host` acabaría como enlace
// en la portada (XSS/enlace inseguro); (2) un `logoPath` con `..`, esquema externo o carpeta ajena
// permitiría leer otro archivo del servidor o hacer hotlink a un tercero (CSP de img-src).
// Límite: validan forma, no que el archivo o la URL existan.
import { describe, expect, it } from 'vitest'
import {
  validateFacultadLogoPath,
  validateHttpsUrl,
  validateReconocimientoLogoPath,
} from '../../apps/cms/src/utilities/validators'

describe('PRA-01: validateHttpsUrl', () => {
  it.each([
    'https://www.conacyt.gov.py/entrea_del_premio_nacional_a_la_calidad',
    'https://www.aneaes.gov.py/wp-content/uploads/2025/12/Presentacion.pdf',
  ])('acepta %s', (url) => {
    expect(validateHttpsUrl(url)).toBe(true)
  })

  it.each([
    'javascript:alert(1)',
    'http://www.conacyt.gov.py/x',
    '//evil.example/x',
    'https://user:pw@evil.example/x',
    'ftp://x.example/y',
    'data:text/html,hola',
    'no es una url',
    ' https://x.example/ ',
  ])('rechaza %s', (url) => {
    expect(validateHttpsUrl(url)).not.toBe(true)
  })

  it('un valor vacío solo es válido si no es obligatorio', () => {
    expect(validateHttpsUrl('')).toBe(true)
    expect(validateHttpsUrl(undefined)).toBe(true)
    expect(validateHttpsUrl('', { required: true })).not.toBe(true)
    expect(validateHttpsUrl(null, { required: true })).not.toBe(true)
  })

  it('rechaza valores que no son texto y URLs desmesuradas', () => {
    expect(validateHttpsUrl(42 as never)).not.toBe(true)
    expect(validateHttpsUrl(`https://x.example/${'a'.repeat(3000)}`)).not.toBe(true)
  })
})

describe('PRA-01: validadores de logoPath', () => {
  it.each([
    '/images/facultades/agrarias.png',
    '/images/facultades/Logo-UNC.jpeg',
    '/images/facultades/economicas.webp',
  ])('facultad acepta %s', (p) => {
    expect(validateFacultadLogoPath(p)).toBe(true)
  })

  it.each([
    '../../etc/passwd',
    '/images/facultades/../../.env',
    '/images/facultades/..%2f..%2fx.png',
    'https://evil.example/logo.png',
    '//evil.example/logo.png',
    '/images/otra/x.png',
    '/images/facultades/x.svg',
    '/images/facultades/x.png?x=1',
    '/images/facultades/sub/x.png',
    '/images/facultades/x.png/',
    '/images/facultades/x..png',
    '\\images\\facultades\\x.png',
    '/images/reconocimientos/premio.jpg',
  ])('facultad rechaza %s', (p) => {
    expect(validateFacultadLogoPath(p)).not.toBe(true)
  })

  it.each(['/images/reconocimientos/premio-calidad-conacyt.jpg', '/images/reconocimientos/a.png'])(
    'reconocimiento acepta %s',
    (p) => {
      expect(validateReconocimientoLogoPath(p)).toBe(true)
    },
  )

  it.each(['/images/facultades/agrarias.png', '/images/reconocimientos/../x.png', 'http://x/y.png', '/images/reconocimientos/x.gif'])(
    'reconocimiento rechaza %s',
    (p) => {
      expect(validateReconocimientoLogoPath(p)).not.toBe(true)
    },
  )

  it('el vacío es válido (el logo es opcional) y un no-texto no', () => {
    expect(validateFacultadLogoPath('')).toBe(true)
    expect(validateFacultadLogoPath(undefined)).toBe(true)
    expect(validateReconocimientoLogoPath(null)).toBe(true)
    expect(validateFacultadLogoPath(5 as never)).not.toBe(true)
  })
})
