// MIG-IMG fase 1: validación de bytes reales de las subidas a `media` (antes de que Payload las guarde).
// Amenaza: ahora los archivos se sirven desde el MISMO origen que el panel; un HTML/SVG/script renombrado
// `.jpg`, un nombre con `../` o una doble extensión (`a.php.jpg`) podrían ejecutarse o escribirse fuera
// del directorio. Payload solo avisa si el tipo no es detectable (checkFileRestrictions.js:297-321).
// Límite: no detecta contenido malicioso dentro de una imagen válida ni valida el contenido de PDF/DOC
// (solo su firma); la defensa final es servirlos con `nosniff`.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { validateUploadFile } from '../../apps/cms/src/utilities/uploadGuard'

const ROOT = path.resolve(__dirname, '..', '..')
const MAX = 1024 * 1024

async function png(): Promise<Buffer> {
  return sharp({ create: { width: 4, height: 4, channels: 3, background: '#0a0' } }).png().toBuffer()
}
async function jpeg(): Promise<Buffer> {
  return sharp({ create: { width: 4, height: 4, channels: 3, background: '#0a0' } }).jpeg().toBuffer()
}
const html = Buffer.from('<!doctype html><script>alert(1)</script>')
const base = { maxBytes: MAX }

describe('rechazos (casos negativos primero)', () => {
  it('HTML renombrado .jpg', async () => {
    const r = await validateUploadFile({ ...base, filename: 'foto.jpg', mimetype: 'image/jpeg', data: html })
    expect(r.ok).toBe(false)
  })

  it('SVG renombrado .png', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>')
    const r = await validateUploadFile({ ...base, filename: 'x.png', mimetype: 'image/png', data: svg })
    expect(r.ok).toBe(false)
  })

  it('SVG declarado como image/svg+xml (ya no se admite)', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')
    const r = await validateUploadFile({ ...base, filename: 'logo.svg', mimetype: 'image/svg+xml', data: svg })
    expect(r.ok).toBe(false)
  })

  it('doble extensión peligrosa a.php.jpg', async () => {
    const r = await validateUploadFile({ ...base, filename: 'a.php.jpg', mimetype: 'image/jpeg', data: await jpeg() })
    expect(r.ok).toBe(false)
  })

  it.each(['x/../../y.jpg', '..\\x.jpg', '../x.jpg', 'a/b.jpg', 'con\u0000nul.jpg', 'ctrl\u0007.jpg', '..jpg.', ''])(
    'nombre inseguro %j',
    async (filename) => {
      const r = await validateUploadFile({ ...base, filename, mimetype: 'image/jpeg', data: await jpeg() })
      expect(r.ok).toBe(false)
    },
  )

  it('archivo vacío', async () => {
    const r = await validateUploadFile({ ...base, filename: 'v.jpg', mimetype: 'image/jpeg', data: Buffer.alloc(0) })
    expect(r.ok).toBe(false)
  })

  it('MIME declarado distinto del detectado (PNG declarado JPEG)', async () => {
    const r = await validateUploadFile({ ...base, filename: 'a.jpg', mimetype: 'image/jpeg', data: await png() })
    expect(r.ok).toBe(false)
  })

  it('extensión distinta del tipo detectado (PNG con .jpg y MIME png)', async () => {
    const r = await validateUploadFile({ ...base, filename: 'a.jpg', mimetype: 'image/png', data: await png() })
    expect(r.ok).toBe(false)
  })

  it('imagen que supera maxBytes', async () => {
    const r = await validateUploadFile({ filename: 'a.jpg', mimetype: 'image/jpeg', data: await jpeg(), maxBytes: 10 })
    expect(r.ok).toBe(false)
  })

  it('JPEG con firma válida pero sin datos decodificables', async () => {
    const trunc = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(4)])
    const r = await validateUploadFile({ ...base, filename: 'a.jpg', mimetype: 'image/jpeg', data: trunc })
    expect(r.ok).toBe(false)
  })

  it('PDF falso (HTML con .pdf)', async () => {
    const r = await validateUploadFile({ ...base, filename: 'a.pdf', mimetype: 'application/pdf', data: html })
    expect(r.ok).toBe(false)
  })

  it('MIME no permitido', async () => {
    const r = await validateUploadFile({ ...base, filename: 'a.exe', mimetype: 'application/x-msdownload', data: Buffer.from('MZ') })
    expect(r.ok).toBe(false)
  })

  it('los mensajes de rechazo no incluyen el contenido del archivo', async () => {
    const r = await validateUploadFile({ ...base, filename: 'foto.jpg', mimetype: 'image/jpeg', data: html })
    expect(r.ok === false && r.reason).not.toContain('alert(1)')
  })
})

describe('aceptaciones', () => {
  it('JPEG y PNG válidos', async () => {
    const j = await validateUploadFile({ ...base, filename: 'a.jpg', mimetype: 'image/jpeg', data: await jpeg() })
    const p = await validateUploadFile({ ...base, filename: 'a.PNG', mimetype: 'image/png', data: await png() })
    expect(j).toMatchObject({ ok: true, mimeType: 'image/jpeg' })
    expect(p).toMatchObject({ ok: true, mimeType: 'image/png' })
  })

  it('nombre real del lote con puntos intermedios no peligrosos (95.1-1-1.jpg)', async () => {
    const r = await validateUploadFile({ ...base, filename: '95.1-1-1.jpg', mimetype: 'image/jpeg', data: await jpeg() })
    expect(r.ok).toBe(true)
  })

  it('WebP y GIF válidos', async () => {
    const w = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#0a0' } }).webp().toBuffer()
    const g = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#0a0' } }).gif().toBuffer()
    expect((await validateUploadFile({ ...base, filename: 'a.webp', mimetype: 'image/webp', data: w })).ok).toBe(true)
    expect((await validateUploadFile({ ...base, filename: 'a.gif', mimetype: 'image/gif', data: g })).ok).toBe(true)
  })

  it('PDF, DOC y DOCX por firma', async () => {
    const pdf = Buffer.from('%PDF-1.7\n%...')
    const doc = Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), Buffer.alloc(16)])
    const docx = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(16)])
    expect((await validateUploadFile({ ...base, filename: 'a.pdf', mimetype: 'application/pdf', data: pdf })).ok).toBe(true)
    expect((await validateUploadFile({ ...base, filename: 'a.doc', mimetype: 'application/msword', data: doc })).ok).toBe(true)
    expect(
      (
        await validateUploadFile({
          ...base,
          filename: 'a.docx',
          mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          data: docx,
        })
      ).ok,
    ).toBe(true)
  })

  it('el logo real de CONACYT del repositorio (premio-calidad-conacyt.jpg) pasa', async () => {
    const file = path.join(ROOT, 'public/images/reconocimientos/premio-calidad-conacyt.jpg')
    const data = readFileSync(file)
    const r = await validateUploadFile({ filename: 'premio-calidad-conacyt.jpg', mimetype: 'image/jpeg', data, maxBytes: 10 * 1024 * 1024 })
    expect(r).toMatchObject({ ok: true, mimeType: 'image/jpeg' })
  })
})
