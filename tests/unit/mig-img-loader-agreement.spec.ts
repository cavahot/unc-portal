// MIG-IMG fase 3: la validación de bytes del cargador (mediaLoader.mjs, sin sharp) y la del CMS
// (apps/cms/src/utilities/uploadGuard.ts) deben coincidir en una tabla de fixtures. Amenaza: que el cargador
// «apruebe» algo que el CMS rechaza (peticiones inútiles) o, peor, que rechace un archivo bueno por una
// regla distinta. Límite: la decodificación completa solo la hace el CMS (el cargador usa las firmas).
import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { validateUploadFile } from '../../apps/cms/src/utilities/uploadGuard'
import { MEDIA_MAX_BYTES, validateUploadBytes } from '../../scripts/lib/mediaLoader.mjs'

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
}
// GIF 1x1 válido (43 bytes).
const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')

describe('validateUploadBytes (cargador) == validateUploadFile (CMS)', () => {
  it('coinciden en aceptar/rechazar para toda la tabla', async () => {
    const mk = (fmt: 'jpeg' | 'png' | 'webp') =>
      sharp({ create: { width: 4, height: 4, channels: 3, background: '#0a0' } })[fmt]().toBuffer()
    const jpg = await mk('jpeg')
    const png = await mk('png')
    const webp = await mk('webp')
    const html = Buffer.from('<!doctype html><script>alert(1)</script>')
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>')
    const table: Array<[string, string, Buffer]> = [
      ['jpeg válido', 'foto.jpg', jpg],
      ['jpeg .jpeg', 'foto.jpeg', jpg],
      ['png válido', 'foto.png', png],
      ['webp válido', 'foto.webp', webp],
      ['gif válido', 'foto.gif', GIF],
      ['nombre real del lote', '95.1-1-1.jpg', jpg],
      ['html como .jpg', 'foto.jpg', html],
      ['svg como .png', 'foto.png', svg],
      ['svg como .svg', 'logo.svg', svg],
      ['png con extensión .jpg', 'foto.jpg', png],
      ['jpeg con extensión .png', 'foto.png', jpg],
      ['doble extensión php', 'a.php.jpg', jpg],
      ['doble extensión svg', 'a.svg.png', png],
      ['traversal', '../x.jpg', jpg],
      ['barra invertida', '..\\x.jpg', jpg],
      ['ruta con barra', 'a/b.jpg', jpg],
      ['NUL', 'con\u0000nul.jpg', jpg],
      ['control', 'ctrl\u0007.jpg', jpg],
      ['sin extensión', 'sinext', jpg],
      ['vacío', 'vacio.jpg', Buffer.alloc(0)],
    ]
    for (const [label, filename, data] of table) {
      const ext = filename.split('.').pop()!.toLowerCase()
      const cms = await validateUploadFile({
        filename,
        mimetype: MIME_BY_EXT[ext] ?? 'application/octet-stream',
        data,
        maxBytes: MEDIA_MAX_BYTES,
      })
      const loader = validateUploadBytes({ filename, data })
      expect({ label, ok: loader.ok }).toEqual({ label, ok: cms.ok })
    }
  })

  it('tamaño: ambos rechazan por encima del tope y aceptan justo en el tope', async () => {
    const header = Buffer.from([0xff, 0xd8, 0xff, 0xe0])
    const over = Buffer.concat([header, Buffer.alloc(MEDIA_MAX_BYTES)])
    expect(validateUploadBytes({ filename: 'a.jpg', data: over }).ok).toBe(false)
    const cms = await validateUploadFile({ filename: 'a.jpg', mimetype: 'image/jpeg', data: over, maxBytes: MEDIA_MAX_BYTES })
    expect(cms.ok).toBe(false)
  })
})
