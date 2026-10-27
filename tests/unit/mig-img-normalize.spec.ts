// MIG-IMG fase 2a: capa de normalización de subidas (apps/cms/src/utilities/imageNormalize.ts).
// Amenazas: (1) fotos de teléfono con GPS/EXIF publicadas tal cual (privacidad: ubicación de la casa del
// autor); (2) fotos de 4-12 MB y 6000 px que hacen lento el portal y llenan el disco; (3) un JPEG con
// cabecera válida y cuerpo corrupto que pasa la guardia de cabeceras (sharp.metadata() no decodifica);
// (4) bytes extra (políglotas) detrás de la imagen. Límite: prueba la función pura con imágenes sintéticas
// y el logo real; el efecto sobre el archivo escrito por Payload se verifica en vivo (spec §17).
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { MAX_LONG_SIDE, normalizeImage } from '../../apps/cms/src/utilities/imageNormalize'

const ROOT = path.resolve(__dirname, '..', '..')

/** JPEG sintético con EXIF de cámara y GPS (IFD3), como una foto de teléfono. */
async function jpegWithGps(width = 64, height = 48): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: '#2a6' } })
    .jpeg()
    .withExif({
      IFD0: { Make: 'TestPhone', Model: 'X1' },
      IFD3: { GPSLatitudeRef: 'S', GPSLatitude: '25/1 17/1 0/1', GPSLongitudeRef: 'W', GPSLongitude: '57/1 38/1 0/1' },
    })
    .toBuffer()
}

/** JPEG con cabecera válida (hasta SOS) y datos de escaneo basura: metadata() lo acepta, decodificar no. */
async function jpegWithGarbageBody(): Promise<Buffer> {
  const good = await sharp({ create: { width: 320, height: 240, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 30 } } })
    .jpeg()
    .toBuffer()
  let sos = -1
  for (let i = 2; i < good.length - 1; i++) {
    if (good[i] === 0xff && good[i + 1] === 0xda) {
      sos = i
      break
    }
  }
  const header = good.subarray(0, sos + 2 + good.readUInt16BE(sos + 2))
  const garbage = Buffer.alloc(8000)
  for (let i = 0; i < garbage.length; i++) garbage[i] = (i * 7919) % 251 // nunca 0xff: sin marcadores
  return Buffer.concat([header, garbage, Buffer.from([0xff, 0xd9])])
}

describe('normalizeImage: rechazos (negativos primero)', () => {
  it('JPEG con cabecera válida y cuerpo corrupto: la cabecera se lee, la decodificación completa falla', async () => {
    const bad = await jpegWithGarbageBody()
    // Precondición: la guardia de fase 1 (solo cabecera) lo dejaría pasar.
    const meta = await sharp(bad).metadata()
    expect(meta.width).toBe(320)
    const r = await normalizeImage({ data: bad, mimeType: 'image/jpeg' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toMatch(/dañada|incompleta/i)
  })

  it('JPEG truncado a la mitad', async () => {
    const good = await sharp({ create: { width: 320, height: 240, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 30 } } })
      .jpeg()
      .toBuffer()
    const r = await normalizeImage({ data: good.subarray(0, Math.floor(good.length / 2)), mimeType: 'image/jpeg' })
    expect(r.ok).toBe(false)
  })

  it('tipo no admitido (PDF) no se normaliza', async () => {
    const r = await normalizeImage({ data: Buffer.from('%PDF-1.4\n'), mimeType: 'application/pdf' })
    expect(r.ok).toBe(false)
  })

  it('el motivo del rechazo no repite el mensaje interno de libvips', async () => {
    const r = await normalizeImage({ data: await jpegWithGarbageBody(), mimeType: 'image/jpeg' })
    if (!r.ok) expect(r.reason).not.toMatch(/Vips|Huffman/i)
  })
})

describe('normalizeImage: metadatos y privacidad', () => {
  it('quita EXIF y GPS de un JPEG de teléfono', async () => {
    const input = await jpegWithGps()
    const before = await sharp(input).metadata()
    expect(before.exif).toBeDefined()
    expect(before.exif!.includes(Buffer.from([0x88, 0x25])) || before.exif!.includes(Buffer.from([0x25, 0x88]))).toBe(true) // puntero GPS IFD
    const r = await normalizeImage({ data: input, mimeType: 'image/jpeg' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const after = await sharp(r.data).metadata()
    expect(after.exif).toBeUndefined()
    expect(after.xmp).toBeUndefined()
    expect(after.iptc).toBeUndefined()
    expect(r.data.includes(Buffer.from('TestPhone'))).toBe(false)
    expect(r.data.includes(Buffer.from('Exif\u0000\u0000', 'latin1'))).toBe(false)
  })

  it('aplica la orientación EXIF y la retira (200x100 con orientación 6 → 100x200)', async () => {
    const input = await sharp({ create: { width: 200, height: 100, channels: 3, background: '#036' } })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer()
    expect((await sharp(input).metadata()).orientation).toBe(6)
    const r = await normalizeImage({ data: input, mimeType: 'image/jpeg' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const after = await sharp(r.data).metadata()
    expect([after.width, after.height]).toEqual([100, 200])
    expect([r.width, r.height]).toEqual([100, 200])
    expect(after.orientation ?? 1).toBe(1)
  })

  it('convierte un JPEG CMYK (imprenta) a sRGB para que se vea bien en el navegador', async () => {
    const input = await sharp({ create: { width: 32, height: 32, channels: 3, background: '#2a6' } }).toColourspace('cmyk').jpeg().toBuffer()
    expect((await sharp(input).metadata()).space).toBe('cmyk')
    const r = await normalizeImage({ data: input, mimeType: 'image/jpeg' })
    expect(r.ok).toBe(true)
    if (r.ok) expect((await sharp(r.data).metadata()).space).toBe('srgb')
  })

  it('elimina bytes extra detrás de la imagen (políglota)', async () => {
    const input = Buffer.concat([await jpegWithGps(), Buffer.from('<script>alert(1)</script>')])
    const r = await normalizeImage({ data: input, mimeType: 'image/jpeg' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data.includes(Buffer.from('<script>'))).toBe(false)
  })
})

describe('normalizeImage: tamaño', () => {
  it(`limita el lado largo a ${MAX_LONG_SIDE} px sin deformar (6000x4000 → 2560x1707)`, async () => {
    const input = await sharp({ create: { width: 6000, height: 4000, channels: 3, background: '#357' } }).jpeg().toBuffer()
    const r = await normalizeImage({ data: input, mimeType: 'image/jpeg' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const after = await sharp(r.data).metadata()
    expect(Math.max(after.width!, after.height!)).toBe(MAX_LONG_SIDE)
    expect(after.height).toBe(1707)
    expect([r.width, r.height]).toEqual([after.width, after.height])
    expect(r.changed).toBe(true)
  })

  it('una imagen vertical también se limita por su lado largo (3000x5000)', async () => {
    const input = await sharp({ create: { width: 3000, height: 5000, channels: 3, background: '#357' } }).png().toBuffer()
    const r = await normalizeImage({ data: input, mimeType: 'image/png' })
    expect(r.ok).toBe(true)
    if (r.ok) expect([r.width, r.height]).toEqual([1536, 2560])
  })

  it('no agranda una imagen pequeña (64x48 queda 64x48)', async () => {
    const r = await normalizeImage({ data: await jpegWithGps(), mimeType: 'image/jpeg' })
    expect(r.ok).toBe(true)
    if (r.ok) expect([r.width, r.height]).toEqual([64, 48])
  })
})

describe('normalizeImage: formato y codificación', () => {
  it('JPEG sale JPEG progresivo y el MIME coincide con los bytes', async () => {
    const r = await normalizeImage({ data: await jpegWithGps(), mimeType: 'image/jpeg' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const m = await sharp(r.data).metadata()
    expect(m.format).toBe('jpeg')
    expect(m.isProgressive).toBe(true)
    expect(r.mimeType).toBe('image/jpeg')
  })

  it('PNG con transparencia sigue siendo PNG y conserva el canal alfa (sin pérdida)', async () => {
    const input = await sharp({ create: { width: 32, height: 32, channels: 4, background: { r: 0, g: 128, b: 0, alpha: 0.25 } } })
      .png()
      .toBuffer()
    const r = await normalizeImage({ data: input, mimeType: 'image/png' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const m = await sharp(r.data).metadata()
    expect(m.format).toBe('png')
    expect(m.hasAlpha).toBe(true)
    expect(r.mimeType).toBe('image/png')
    const { data: px } = await sharp(r.data).raw().toBuffer({ resolveWithObject: true })
    expect(px[3]).toBe(64) // alfa 0.25 * 255 ≈ 64, intacto: PNG sin pérdida
  })

  it('WebP sigue siendo WebP', async () => {
    const input = await sharp({ create: { width: 40, height: 30, channels: 3, background: '#a50' } }).webp().toBuffer()
    const r = await normalizeImage({ data: input, mimeType: 'image/webp' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect((await sharp(r.data).metadata()).format).toBe('webp')
    expect(r.mimeType).toBe('image/webp')
  })

  it('GIF se valida por decodificación completa pero se devuelve sin tocar', async () => {
    const input = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#f00' } }).gif().toBuffer()
    const r = await normalizeImage({ data: input, mimeType: 'image/gif' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.changed).toBe(false)
    expect(Buffer.compare(r.data, input)).toBe(0)
    expect(r.mimeType).toBe('image/gif')
  })

  it('el logo real de CONACYT se acepta y sigue siendo un JPEG 1200x1200', async () => {
    const logo = readFileSync(path.join(ROOT, 'public/images/reconocimientos/premio-calidad-conacyt.jpg'))
    const r = await normalizeImage({ data: logo, mimeType: 'image/jpeg' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect([r.width, r.height]).toEqual([1200, 1200])
    expect(r.mimeType).toBe('image/jpeg')
    expect(r.data.length).toBeLessThan(logo.length * 1.2)
  })
})
