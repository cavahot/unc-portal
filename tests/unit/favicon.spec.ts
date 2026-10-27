// FAV-01: contrato del conjunto de íconos del portal (favicon.ico, PNG, manifest).
// Amenaza/defecto que evita: un favicon transparente o sin <link> en el <head> deja la pestaña
// sin identidad institucional (suplantación más fácil de notar para el usuario si existe, y
// confusión si no). Límite: no prueba cómo cada navegador pinta el ícono ni su caché.
// Evidencia RDD: docs/specs/portal/FAVICON.md.
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const pub = (p: string) => path.join(ROOT, 'public', p)

/** Lee el directorio ICO y devuelve cada imagen decodificada a RGBA crudo. */
async function readIco(file: string) {
  const buf = readFileSync(file)
  expect(buf.readUInt16LE(0)).toBe(0) // reservado
  expect(buf.readUInt16LE(2)).toBe(1) // tipo 1 = ícono
  const count = buf.readUInt16LE(4)
  const out: { size: number; data: Buffer }[] = []
  for (let i = 0; i < count; i++) {
    const e = 6 + i * 16
    const size = buf[e] || 256
    const len = buf.readUInt32LE(e + 8)
    const off = buf.readUInt32LE(e + 12)
    const png = buf.subarray(off, off + len)
    // Las entradas se generan como PNG (válido en ICO desde Vista); sharp las decodifica.
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    expect(info.width).toBe(size)
    expect(info.height).toBe(size)
    out.push({ size, data })
  }
  return out
}

describe('favicon.ico', () => {
  it('es un ICO multi-tamaño con 16, 32 y 48', async () => {
    const imgs = await readIco(pub('favicon.ico'))
    expect(imgs.map((i) => i.size).sort((a, b) => a - b)).toEqual(expect.arrayContaining([16, 32, 48]))
    expect(imgs.length).toBeGreaterThanOrEqual(3)
  })

  it('no está en blanco: cada tamaño tiene píxeles visibles y no todo es negro', async () => {
    for (const { size, data } of await readIco(pub('favicon.ico'))) {
      let visible = 0
      let lum = 0
      for (let p = 0; p < data.length; p += 4) {
        if (data[p + 3] > 200) {
          visible++
          lum += (data[p] + data[p + 1] + data[p + 2]) / 3
        }
      }
      const ratio = visible / (size * size)
      expect(ratio, `visibles ${size}px`).toBeGreaterThan(0.5)
      expect(lum / visible, `luminancia media ${size}px`).toBeGreaterThan(128) // disco blanco
    }
  })
})

describe('íconos PNG', () => {
  const dims: [string, number][] = [
    ['icons/icon-192.png', 192],
    ['icons/icon-512.png', 512],
    ['icons/icon-maskable-512.png', 512],
    ['icons/apple-touch-icon.png', 180],
  ]
  it.each(dims)('%s mide %i x %i', async (file, size) => {
    const m = await sharp(pub(file)).metadata()
    expect(m.width).toBe(size)
    expect(m.height).toBe(size)
  })

  it('apple-touch-icon es totalmente opaco (iOS rellena la transparencia con negro)', async () => {
    const { data } = await sharp(pub('icons/apple-touch-icon.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    for (let p = 3; p < data.length; p += 4) expect(data[p]).toBe(255)
  })

  it('el maskable tiene las esquinas en verde UNC #004700', async () => {
    const { data, info } = await sharp(pub('icons/icon-maskable-512.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    for (const [x, y] of [[0, 0], [info.width - 1, 0], [0, info.height - 1], [info.width - 1, info.height - 1]]) {
      const i = (y * info.width + x) * 4
      expect([data[i], data[i + 1], data[i + 2], data[i + 3]]).toEqual([0x00, 0x47, 0x00, 255])
    }
  })
})

describe('site.webmanifest', () => {
  const manifest = JSON.parse(readFileSync(pub('icons/site.webmanifest'), 'utf8'))
  it('declara nombre y colores institucionales', () => {
    expect(manifest.name).toBe('Universidad Nacional de Concepción')
    expect(manifest.short_name).toBe('UNC')
    expect(manifest.theme_color).toBe('#004700')
    expect(manifest.background_color).toBe('#004700')
  })
  it('lista 192, 512 y maskable, y los archivos existen', () => {
    const icons = manifest.icons as { src: string; sizes: string; purpose?: string }[]
    expect(icons.map((i) => i.sizes).sort()).toEqual(['192x192', '512x512', '512x512'])
    expect(icons.some((i) => i.purpose === 'maskable')).toBe(true)
    for (const i of icons) expect(existsSync(pub(i.src.replace(/^\//, ''))), i.src).toBe(true)
  })
})

describe('app/layout.tsx', () => {
  const src = readFileSync(path.join(ROOT, 'app/layout.tsx'), 'utf8')
  // Rutas bajo /icons/ (y favicon.ico) porque proxy.ts excluye ambas del middleware i18n;
  // en la raíz, /icon-192.png devolvería la página 404 localizada (text/html).
  const refs = ['/favicon.ico', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png', '/icons/site.webmanifest']
  it.each(refs)('metadata referencia %s y el archivo existe en public/', (ref) => {
    expect(src).toContain(`'${ref}'`)
    expect(existsSync(pub(ref.replace(/^\//, '')))).toBe(true)
  })
  it('define themeColor vía el export viewport', () => {
    expect(src).toMatch(/export const viewport/)
    expect(src).toContain('#004700')
  })
  it('las rutas de íconos quedan fuera del matcher de proxy.ts', () => {
    const proxy = readFileSync(path.join(ROOT, 'proxy.ts'), 'utf8')
    expect(proxy).toContain('favicon' + String.fromCharCode(92, 92) + '.ico')
    expect(proxy).toContain('icons/')
  })
})
