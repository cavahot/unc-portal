// FAV-01: genera el conjunto de íconos del portal a partir del logo oficial.
//
// Entrada : public/images/logo.png (442x442 RGBA, línea negra sobre transparente).
// Salida  : public/favicon.ico (16, 32, 48; entradas PNG)
//           public/icons/icon-192.png, icon-512.png, icon-maskable-512.png,
//           public/icons/apple-touch-icon.png (180, opaco), public/icons/site.webmanifest
// Uso     : node scripts/generate-favicons.mjs   (usa `sharp`, dependencia raíz del repo)
//
// Por qué un disco blanco: el logo es negro sobre transparente y desaparece en pestañas
// oscuras. Por qué /icons/: proxy.ts excluye `icons/` y `favicon.ico` del middleware i18n; un
// PNG en la raíz recibiría la página 404 localizada (text/html) en lugar de la imagen.
// Es determinista: misma entrada, mismos bytes de salida.
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LOGO = path.join(root, 'public/images/logo.png')
const OUT = path.join(root, 'public/icons')
const GREEN = { r: 0, g: 0x47, b: 0, alpha: 1 } // #004700, verde UNC
const LOGO_RATIO = 0.88 // el logo ocupa 88% del disco para que el aro no toque el borde

/** Disco blanco con el logo centrado, sobre lienzo transparente de `size` px (disco a sangre). */
async function disc(size, { sharpen = false } = {}) {
  const inner = Math.round(size * LOGO_RATIO)
  let logo = sharp(LOGO).resize(inner, inner, { kernel: 'lanczos3', fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  // Afinado leve solo en tamaños chicos: mantiene legible el aro de la brújula.
  if (sharpen) logo = logo.sharpen({ sigma: 0.6 })
  const logoBuf = await logo.png().toBuffer()
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`)
  const off = Math.round((size - inner) / 2)
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: mask }, { input: logoBuf, left: off, top: off }])
    .png()
    .toBuffer()
}

/** Pone `inner` (PNG) centrado sobre un cuadrado opaco de `size` px y color `bg`. */
async function onSquare(size, bg, inner, innerSize) {
  const resized = await sharp(inner).resize(innerSize, innerSize, { kernel: 'lanczos3' }).png().toBuffer()
  const off = Math.round((size - innerSize) / 2)
  return sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: resized, left: off, top: off }])
    .png()
    .toBuffer()
}

/** Arma un ICO con entradas PNG (soportado desde Windows Vista y por todos los navegadores). */
function buildIco(entries) {
  const head = Buffer.alloc(6)
  head.writeUInt16LE(1, 2)
  head.writeUInt16LE(entries.length, 4)
  let offset = 6 + entries.length * 16
  const dir = entries.map(({ size, png }) => {
    const e = Buffer.alloc(16)
    e[0] = size === 256 ? 0 : size
    e[1] = size === 256 ? 0 : size
    e.writeUInt16LE(1, 4) // planos
    e.writeUInt16LE(32, 6) // bits por píxel
    e.writeUInt32LE(png.length, 8)
    e.writeUInt32LE(offset, 12)
    offset += png.length
    return e
  })
  return Buffer.concat([head, ...dir, ...entries.map((e) => e.png)])
}

mkdirSync(OUT, { recursive: true })

const icoEntries = []
for (const size of [16, 32, 48]) {
  icoEntries.push({ size, png: await disc(size, { sharpen: size <= 32 }) })
}
writeFileSync(path.join(root, 'public/favicon.ico'), buildIco(icoEntries))

writeFileSync(path.join(OUT, 'icon-192.png'), await disc(192))
const disc512 = await disc(512)
writeFileSync(path.join(OUT, 'icon-512.png'), disc512)
// Maskable: el SO recorta hasta ~20% por lado; el disco al 70% queda en la zona segura.
writeFileSync(path.join(OUT, 'icon-maskable-512.png'), await onSquare(512, GREEN, disc512, Math.round(512 * 0.7)))
// iOS rellena la transparencia con negro: cuadrado blanco opaco con el disco dentro.
writeFileSync(path.join(OUT, 'apple-touch-icon.png'), await onSquare(180, { r: 255, g: 255, b: 255, alpha: 1 }, disc512, Math.round(180 * 0.9)))

const manifest = {
  name: 'Universidad Nacional de Concepción',
  short_name: 'UNC',
  start_url: '/',
  display: 'browser',
  theme_color: '#004700',
  background_color: '#004700',
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}
writeFileSync(path.join(OUT, 'site.webmanifest'), JSON.stringify(manifest, null, 2) + '\n')
console.log('Íconos generados en public/ y public/icons/')
