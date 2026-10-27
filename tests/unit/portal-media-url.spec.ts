// AUT-01: resolveMediaUrl convierte la URL relativa de `media` del CMS en una URL absoluta segura.
// Amenazas: (1) pasar a next/image / href una ruta relativa que el portal resolvería contra SU origen (404);
// (2) aceptar `javascript:`, `//host`, rutas fuera de /api/media/file/ o `..` y convertir el portal en proxy
// de cualquier origen. Límite: valida la forma de la URL; no comprueba que el archivo exista.
import { describe, expect, it } from 'vitest'
import { resolveMediaUrl } from '@/lib/cms/mediaUrl'

const ENV = { NEXT_PUBLIC_CMS_URL: 'https://cms.example.test' }

describe('resolveMediaUrl', () => {
  it('antepone el origen público del CMS a /api/media/file/<nombre>', () => {
    expect(resolveMediaUrl('/api/media/file/rector.jpg', ENV)).toBe('https://cms.example.test/api/media/file/rector.jpg')
  })

  it('ignora ruta, barra final y credenciales de la variable (solo usa el origen)', () => {
    expect(resolveMediaUrl('/api/media/file/a.jpg', { NEXT_PUBLIC_CMS_URL: 'https://u:p@cms.example.test/admin/' })).toBe(
      'https://cms.example.test/api/media/file/a.jpg',
    )
  })

  it('acepta nombres con espacios codificados', () => {
    expect(resolveMediaUrl('/api/media/file/foto%20rector.png', ENV)).toBe('https://cms.example.test/api/media/file/foto%20rector.png')
  })

  it('en desarrollo usa localhost:3002 si la variable falta; en producción devuelve null', () => {
    expect(resolveMediaUrl('/api/media/file/a.jpg', { NODE_ENV: 'development' })).toBe('http://localhost:3002/api/media/file/a.jpg')
    expect(resolveMediaUrl('/api/media/file/a.jpg', { NODE_ENV: 'production' })).toBeNull()
  })

  it('una variable inválida o no http(s) devuelve null', () => {
    expect(resolveMediaUrl('/api/media/file/a.jpg', { NEXT_PUBLIC_CMS_URL: 'ftp://x' })).toBeNull()
    expect(resolveMediaUrl('/api/media/file/a.jpg', { NEXT_PUBLIC_CMS_URL: 'no es url' })).toBeNull()
  })

  it.each([
    ['javascript:alert(1)'],
    ['data:image/png;base64,AAAA'],
    ['//evil.example/api/media/file/a.jpg'],
    ['/api/otra/ruta.jpg'],
    ['/api/media/file/../../etc/passwd'],
    ['/api/media/file/%2e%2e/secreto'],
    ['/api/media/file/a%2Fb.jpg'],
    ['/api/media/file/a/b.jpg'],
    ['/api/media/file/'],
    ['/api/media/file/a.jpg?x=1'],
    ['/api/media/file/a\\b.jpg'],
    ['https://evil.example/api/media/file/a.jpg'],
    [''],
    ['   '],
  ])('rechaza %j', (input) => {
    expect(resolveMediaUrl(input, ENV)).toBeNull()
  })

  it.each([[undefined], [null], [42], [{}]])('rechaza valores no texto (%j)', (input) => {
    expect(resolveMediaUrl(input as never, ENV)).toBeNull()
  })

  it('acepta una URL absoluta del propio origen del CMS en /api/media/file/', () => {
    expect(resolveMediaUrl('https://cms.example.test/api/media/file/a.jpg', ENV)).toBe('https://cms.example.test/api/media/file/a.jpg')
  })

  it('acepta una absoluta https del host de MEDIA_HOSTNAME (almacenamiento S3), y solo https', () => {
    const env = { ...ENV, MEDIA_HOSTNAME: 'files.example.test' }
    expect(resolveMediaUrl('https://files.example.test/unc/a.jpg', env)).toBe('https://files.example.test/unc/a.jpg')
    expect(resolveMediaUrl('http://files.example.test/unc/a.jpg', env)).toBeNull()
    expect(resolveMediaUrl('https://otro.example.test/unc/a.jpg', env)).toBeNull()
    expect(resolveMediaUrl('https://files.example.test/../x.jpg', env)).toBeNull()
  })
})
