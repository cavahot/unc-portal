// MIG-IMG fase 2a: tubería de subida de `media` (hooks), procedencia (sha256/sourcePath) y cabeceras al servir.
// Amenazas: (1) un anónimo hace trabajar al servidor (hash, decodificación) antes del control de acceso;
// (2) un cliente fija su propio `sha256` y rompe la idempotencia del cargador; (3) la misma foto subida dos
// veces crea dos archivos y dos filas; (4) `sourcePath` con `..` o rutas absolutas; (5) un archivo servido
// desde el mismo origen que el panel con un tipo erróneo se interpreta como HTML/script.
// Límite: hooks con un `req` simulado (sin BD); el comportamiento por REST se verifica en vivo (spec §17).
import { describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { Media } from '../../apps/cms/src/collections/Media'
import {
  MEDIA_SHA256_CONTEXT_KEY,
  enforceMediaProvenance,
  prepareMediaUpload,
} from '../../apps/cms/src/hooks/media/uploadPipeline'
import { sha256Hex, validateSourcePath } from '../../apps/cms/src/utilities/mediaProvenance'
import { applyMediaFileHeaders } from '../../apps/cms/src/utilities/mediaHeaders'

type FakeFile = { data: Buffer; mimetype: string; name: string; size: number }

async function phoneJpeg(width = 3000, height = 2000): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: '#2a6' } })
    .jpeg({ quality: 95 })
    .withExif({ IFD0: { Make: 'TestPhone' }, IFD3: { GPSLatitudeRef: 'S', GPSLatitude: '25/1 17/1 0/1' } })
    .toBuffer()
}

function fakeReq(opts: { file?: FakeFile; role?: string | null; existing?: Array<{ id: number; filename: string }> }) {
  const find = vi.fn(async () => ({ docs: opts.existing ?? [] }))
  return {
    file: opts.file,
    context: {} as Record<string, unknown>,
    user: opts.role === null ? null : { id: 1, role: opts.role ?? 'media-manager' },
    payload: { find },
    t: (key: string) => key,
  }
}

async function runPrepare(req: ReturnType<typeof fakeReq>, operation: 'create' | 'update' = 'create', overrideAccess = false, id?: number) {
  return prepareMediaUpload({
    args: { data: {}, ...(id ? { id } : {}) },
    operation,
    req,
    overrideAccess,
    collection: Media,
    context: req.context,
  } as never)
}

describe('prepareMediaUpload (beforeOperation): negativos primero', () => {
  it('anónimo: 403 ANTES de calcular hash o decodificar (no consulta la BD)', async () => {
    const data = await phoneJpeg(64, 48)
    const req = fakeReq({ role: null, file: { data, mimetype: 'image/jpeg', name: 'a.jpg', size: data.length } })
    await expect(runPrepare(req)).rejects.toMatchObject({ status: 403 })
    expect(req.payload.find).not.toHaveBeenCalled()
    expect(req.context[MEDIA_SHA256_CONTEXT_KEY]).toBeUndefined()
  })

  it('rol sin permiso de media (auditor): 403', async () => {
    const data = await phoneJpeg(64, 48)
    const req = fakeReq({ role: 'auditor', file: { data, mimetype: 'image/jpeg', name: 'a.jpg', size: data.length } })
    await expect(runPrepare(req)).rejects.toMatchObject({ status: 403 })
  })

  it('HTML renombrado .jpg: 400 con mensaje en español (guardia de fase 1 intacta)', async () => {
    const data = Buffer.from('<!doctype html><script>alert(1)</script>')
    const req = fakeReq({ file: { data, mimetype: 'image/jpeg', name: 'foto.jpg', size: data.length } })
    await expect(runPrepare(req)).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/contenido|tipo/i) })
  })

  it('JPEG con cuerpo corrupto (cabecera válida): 400 legible, sin texto de libvips', async () => {
    const good = await sharp({ create: { width: 320, height: 240, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 30 } } }).jpeg().toBuffer()
    let sos = -1
    for (let i = 2; i < good.length - 1; i++) if (good[i] === 0xff && good[i + 1] === 0xda) { sos = i; break }
    const garbage = Buffer.alloc(8000)
    for (let i = 0; i < garbage.length; i++) garbage[i] = (i * 7919) % 251
    const data = Buffer.concat([good.subarray(0, sos + 2 + good.readUInt16BE(sos + 2)), garbage, Buffer.from([0xff, 0xd9])])
    const req = fakeReq({ file: { data, mimetype: 'image/jpeg', name: 'rota.jpg', size: data.length } })
    const err = await runPrepare(req).catch((e: unknown) => e as { status?: number; message?: string })
    expect(err).toMatchObject({ status: 400 })
    expect((err as { message: string }).message).toMatch(/dañada|incompleta/i)
    expect((err as { message: string }).message).not.toMatch(/Vips|Huffman/i)
  })

  it('bytes idénticos ya subidos: 409 con el ID existente y sin normalizar', async () => {
    const data = await phoneJpeg(64, 48)
    const req = fakeReq({ existing: [{ id: 6, filename: 'premio.jpg' }], file: { data, mimetype: 'image/jpeg', name: 'a.jpg', size: data.length } })
    const err = await runPrepare(req).catch((e: unknown) => e as { status?: number; message?: string; data?: unknown })
    expect(err).toMatchObject({ status: 409, data: { id: 6, filename: 'premio.jpg' } })
    expect((err as { message: string }).message).toMatch(/ya está en la biblioteca.*6/i)
    expect(req.file!.data).toBe(data) // no se tocó el archivo
    const where = (req.payload.find.mock.calls[0] as unknown as [{ where: unknown }])[0].where
    expect(where).toEqual({ sha256: { equals: sha256Hex(data) } })
  })

  it('al reemplazar el archivo de un documento, la búsqueda de duplicados excluye ese mismo documento', async () => {
    const data = await phoneJpeg(64, 48)
    const req = fakeReq({ file: { data, mimetype: 'image/jpeg', name: 'a.jpg', size: data.length } })
    await runPrepare(req, 'update', false, 42)
    const where = (req.payload.find.mock.calls[0] as unknown as [{ where: unknown }])[0].where
    expect(where).toEqual({ and: [{ sha256: { equals: sha256Hex(data) } }, { id: { not_equals: 42 } }] })
  })
})

describe('prepareMediaUpload: normalización y hash del ORIGINAL', () => {
  it('reemplaza req.file por la versión normalizada (sin GPS, ≤ 2560 px, size coherente) y guarda el sha256 del original', async () => {
    const data = await phoneJpeg(6000, 4000)
    const req = fakeReq({ file: { data, mimetype: 'image/jpeg', name: 'foto.jpg', size: data.length } })
    await runPrepare(req)
    expect(req.context[MEDIA_SHA256_CONTEXT_KEY]).toBe(createHash('sha256').update(data).digest('hex'))
    const out = req.file!
    expect(out.data).not.toBe(data)
    expect(out.size).toBe(out.data.length)
    expect(out.mimetype).toBe('image/jpeg')
    expect(out.name).toBe('foto.jpg')
    const m = await sharp(out.data).metadata()
    expect(m.exif).toBeUndefined()
    expect([m.width, m.height]).toEqual([2560, 1707])
  })

  // Regresión (en vivo 2026-10-24): `payload.find({ req })` reemplaza `req.context` por un objeto nuevo
  // (createLocalReq.js:5-18); el hash escrito en el objeto viejo se perdía, sha256 quedaba NULL y una
  // segunda subida idéntica daba 201 en lugar de 409.
  it('el hash sobrevive a que la consulta de duplicados reemplace req.context', async () => {
    const data = await phoneJpeg(64, 48)
    const req = fakeReq({ file: { data, mimetype: 'image/jpeg', name: 'a.jpg', size: data.length } })
    req.payload.find.mockImplementation(async () => {
      req.context = {}
      return { docs: [] }
    })
    await runPrepare(req)
    expect(req.context[MEDIA_SHA256_CONTEXT_KEY]).toBe(sha256Hex(data))
  })

  it('Local API con overrideAccess (scripts de servidor): también normaliza', async () => {
    const data = await phoneJpeg(3000, 100)
    const req = fakeReq({ role: null, file: { data, mimetype: 'image/jpeg', name: 'x.jpg', size: data.length } })
    await runPrepare(req, 'create', true)
    expect((await sharp(req.file!.data).metadata()).width).toBe(2560)
  })

  it('una operación sin archivo limpia un hash anterior del mismo req (no se arrastra)', async () => {
    const req = fakeReq({})
    req.context[MEDIA_SHA256_CONTEXT_KEY] = 'f'.repeat(64)
    await runPrepare(req, 'update', false, 3)
    expect(req.context[MEDIA_SHA256_CONTEXT_KEY]).toBeUndefined()
  })
})

describe('enforceMediaProvenance (beforeChange): el sha256 lo fija solo el servidor', () => {
  const hash = 'a'.repeat(64)
  const run = (data: Record<string, unknown>, operation: 'create' | 'update', context: Record<string, unknown>, originalDoc?: Record<string, unknown>) =>
    enforceMediaProvenance({ data, operation, originalDoc, req: { context } as never, context } as never) as Promise<Record<string, unknown>>

  it('ignora el sha256 enviado por el cliente al crear con archivo', async () => {
    const out = await run({ sha256: 'b'.repeat(64) }, 'create', { [MEDIA_SHA256_CONTEXT_KEY]: hash })
    expect(out.sha256).toBe(hash)
  })

  it('al editar sin archivo nuevo conserva el sha256 previo aunque el cliente envíe otro', async () => {
    const out = await run({ sha256: 'c'.repeat(64), alt: 'x' }, 'update', {}, { sha256: hash })
    expect(out.sha256).toBe(hash)
  })

  it('crear sin archivo propio (duplicar desde el panel) deja sha256 en NULL, no copia el del original', async () => {
    const out = await run({ sha256: hash }, 'create', {})
    expect(out.sha256).toBeNull()
  })

  it('sourcePath vacío se guarda como NULL y se recorta', async () => {
    expect((await run({ sourcePath: '   ' }, 'create', { [MEDIA_SHA256_CONTEXT_KEY]: hash })).sourcePath).toBeNull()
    expect((await run({ sourcePath: ' 2024/05/a.jpg ' }, 'create', { [MEDIA_SHA256_CONTEXT_KEY]: hash })).sourcePath).toBe('2024/05/a.jpg')
  })
})

describe('validateSourcePath', () => {
  it.each([
    '../etc/passwd',
    '2024/../../x.jpg',
    '/abs/x.jpg',
    'C:/Users/x.jpg',
    'C:\\x.jpg',
    '2024\\05\\x.jpg',
    'a//b.jpg',
    './a.jpg',
    'a/./b.jpg',
    'https://evil/x.jpg',
    'con\u0000nul.jpg',
    'ctrl\u0007.jpg',
    'a/'.repeat(300) + 'x.jpg',
  ])('rechaza %j', (value) => {
    expect(validateSourcePath(value)).not.toBe(true)
  })

  it.each([null, undefined, '', '2024/05/foto.jpg', 'uploads/2016/03/95.1-1-1.jpg', 'logo UNC (2023).png'])('acepta %j', (value) => {
    expect(validateSourcePath(value)).toBe(true)
  })

  it('el mensaje está en español y no repite el valor', () => {
    const msg = validateSourcePath('../secreto-xyz.jpg') as string
    expect(msg).toMatch(/ruta/i)
    expect(msg).not.toContain('secreto-xyz')
  })
})

describe('applyMediaFileHeaders (upload.modifyResponseHeaders)', () => {
  it('imagen: nosniff + CSP sandbox restrictiva + caché pública sin immutable', () => {
    const h = new Headers({ 'Content-Type': 'image/jpeg' })
    const out = applyMediaFileHeaders({ headers: h })
    expect(out.get('X-Content-Type-Options')).toBe('nosniff')
    const csp = out.get('Content-Security-Policy') ?? ''
    expect(csp).toMatch(/default-src 'none'/)
    expect(csp).toMatch(/\bsandbox\b/)
    expect(csp).not.toMatch(/script-src(?! 'none')/)
    expect(out.get('Cache-Control')).toMatch(/public/)
    expect(out.get('Cache-Control')).not.toMatch(/immutable/)
  })

  it('tipo desconocido o HTML colado: también sandbox (nunca ejecuta en nuestro origen)', () => {
    for (const type of ['text/html', 'application/octet-stream', '']) {
      const out = applyMediaFileHeaders({ headers: new Headers(type ? { 'Content-Type': type } : {}) })
      expect(out.get('Content-Security-Policy')).toMatch(/\bsandbox\b/)
      expect(out.get('X-Content-Type-Options')).toBe('nosniff')
    }
  })

  it('PDF: nosniff, sin sandbox (el visor de PDF del navegador no funciona con sandbox)', () => {
    const out = applyMediaFileHeaders({ headers: new Headers({ 'Content-Type': 'application/pdf' }) })
    expect(out.get('X-Content-Type-Options')).toBe('nosniff')
    expect(out.get('Content-Security-Policy') ?? '').not.toMatch(/sandbox/)
  })

  it('conserva las cabeceras que puso Payload (Content-Type, Content-Length, Accept-Ranges)', () => {
    const out = applyMediaFileHeaders({ headers: new Headers({ 'Content-Type': 'image/png', 'Content-Length': '10', 'Accept-Ranges': 'bytes' }) })
    expect(out.get('Content-Type')).toBe('image/png')
    expect(out.get('Content-Length')).toBe('10')
    expect(out.get('Accept-Ranges')).toBe('bytes')
  })
})

describe('Media: cableado de la configuración', () => {
  const upload = Media.upload as Record<string, unknown>
  const fields = Media.fields as Array<Record<string, unknown>>

  it('usa modifyResponseHeaders y la tubería de subida en beforeOperation/beforeChange', () => {
    expect(upload.modifyResponseHeaders).toBe(applyMediaFileHeaders)
    expect(Media.hooks?.beforeOperation).toContain(prepareMediaUpload)
    expect(Media.hooks?.beforeChange?.[0]).toBe(enforceMediaProvenance)
  })

  it('no agrega imageSizes, prefix ni transformaciones globales de Payload (romperían el paso a S3 o el MIME)', () => {
    for (const k of ['imageSizes', 'resizeOptions', 'formatOptions', 'trimOptions', 'constructorOptions']) {
      expect(upload[k], k).toBeUndefined()
    }
    expect(upload.withMetadata).not.toBe(true)
    expect(fields.some((f) => f.name === 'prefix')).toBe(false)
  })

  it('sha256 es único e indexado y sourcePath es opcional con validación', () => {
    const sha = fields.find((f) => f.name === 'sha256')!
    expect(sha).toMatchObject({ type: 'text', unique: true, index: true })
    const sp = fields.find((f) => f.name === 'sourcePath')!
    expect(sp).toMatchObject({ type: 'text' })
    expect(sp.required).not.toBe(true)
    expect(typeof sp.validate).toBe('function')
  })

  it('alt obligatorio con ayuda para lectores de pantalla y validación en español', () => {
    const alt = fields.find((f) => f.name === 'alt')!
    expect(alt.required).toBe(true)
    const admin = alt.admin as { description?: string }
    expect(admin.description).toMatch(/lector de pantalla/i)
    const validate = alt.validate as (v: unknown, o: unknown) => true | string
    expect(validate('Logo del premio', {})).toBe(true)
    expect(validate('   ', {})).not.toBe(true)
    expect(validate('<b>x</b>', {})).toMatch(/<|>|caracteres/i)
    expect(validate('x'.repeat(301), {})).toMatch(/300/)
  })

  it('el panel explica tope, formatos y que se quitan los metadatos/GPS', () => {
    const description = String((Media.admin as { description?: unknown })?.description ?? '')
    expect(description).toMatch(/10 MiB/)
    expect(description).toMatch(/JPEG/)
    expect(description).toMatch(/2560/)
    expect(description).toMatch(/GPS/)
  })
})
