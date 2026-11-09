// VIDEO-01: video de YouTube e imágenes dentro del cuerpo (spec: docs/specs/portal/VIDEO-YOUTUBE-IMAGENES-CUERPO.md).
// Qué comprueba: (S1) el CMS acepta solo enlaces de videos de YouTube; (S2) el portal incrusta el video desde
//   youtube-nocookie.com y no dibuja nada si el dato guardado no es válido; (S3) las imágenes y archivos insertados en el
//   cuerpo se muestran (antes desaparecían sin aviso); (S4) la CSP abre solo el origen youtube-nocookie.com.
// Amenazas: un `iframe` hacia un origen arbitrario o con `javascript:` a partir de un dato alterado en la base; una imagen
//   servida desde fuera del CMS; ampliar la CSP más de lo necesario. Límite: renderizado estático (sin navegador); la
//   reproducción real se verifica a mano en el portal local.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import RichText from '@/components/RichText'
import RichTextBlock from '@/components/blocks/RichText'
import { youTubeIdFromUrl as portalParse } from '@/lib/video/youtube'
import {
  YOUTUBE_URL_MESSAGE,
  validateYouTubeUrl,
  youTubeIdFromUrl as cmsParse,
} from '../../apps/cms/src/utilities/youtube'
import { YouTubeBlock } from '../../apps/cms/src/blocks/lexical/YouTube'

const ROOT = path.resolve(__dirname, '..', '..')
const read = (p: string) => readFileSync(path.join(ROOT, p), 'utf8')
const ID = 'dQw4w9WgXcQ'

const VALIDAS: Array<[string, string]> = [
  [`https://www.youtube.com/watch?v=${ID}`, ID],
  [`https://youtube.com/watch?v=${ID}&t=30s`, ID],
  [`https://m.youtube.com/watch?feature=share&v=${ID}`, ID],
  [`https://youtu.be/${ID}?si=abc`, ID],
  [`http://youtu.be/${ID}`, ID],
  [`https://www.youtube.com/embed/${ID}`, ID],
  [`https://www.youtube.com/shorts/${ID}`, ID],
  [`https://www.youtube.com/live/${ID}`, ID],
  [`https://www.youtube-nocookie.com/embed/${ID}`, ID],
  [`  https://youtu.be/${ID}  `, ID],
]

const INVALIDAS = [
  '',
  'texto cualquiera',
  `https://youtube.com.otro.com/watch?v=${ID}`,
  `https://otro.com/watch?v=${ID}`,
  `https://evil.com/?u=https://youtu.be/${ID}`,
  'https://www.youtube.com/channel/UCpd84KR2d9M7socSfgf2Sqg',
  'https://www.youtube.com/playlist?list=PL123',
  `javascript:alert(1)//youtu.be/${ID}`,
  'https://youtu.be/corto',
  `https://youtu.be/${ID}x`,
  `ftp://youtu.be/${ID}`,
  `https://user:pass@youtu.be/${ID}`,
]

describe('S1 — enlaces de YouTube (CMS y portal usan la misma regla)', () => {
  it.each(VALIDAS)('acepta %s', (url, id) => {
    expect(cmsParse(url)).toBe(id)
    expect(portalParse(url)).toBe(id)
    expect(validateYouTubeUrl(url)).toBe(true)
  })

  it.each(INVALIDAS)('rechaza «%s»', (url) => {
    expect(cmsParse(url)).toBeNull()
    expect(portalParse(url)).toBeNull()
    expect(validateYouTubeUrl(url)).toBe(YOUTUBE_URL_MESSAGE)
  })

  it('el mensaje de error es el de la especificación', () => {
    expect(YOUTUBE_URL_MESSAGE).toBe(
      'Pegue el enlace de un video de YouTube (por ejemplo, https://www.youtube.com/watch?v=…).',
    )
    expect(validateYouTubeUrl(undefined)).toBe(YOUTUBE_URL_MESSAGE)
  })

  it('el bloque tiene slug `youtube`, URL validada y título obligatorio de hasta 150 caracteres', () => {
    expect(YouTubeBlock.slug).toBe('youtube')
    const url = YouTubeBlock.fields.find((f) => 'name' in f && f.name === 'url') as {
      required?: boolean
      validate?: (v: unknown) => true | string
    }
    const title = YouTubeBlock.fields.find((f) => 'name' in f && f.name === 'title') as {
      required?: boolean
      maxLength?: number
    }
    expect(url.required).toBe(true)
    expect(url.validate?.('https://otro.com')).toBe(YOUTUBE_URL_MESSAGE)
    expect(url.validate?.(`https://youtu.be/${ID}`)).toBe(true)
    expect(title.required).toBe(true)
    expect(title.maxLength).toBe(150)
  })

  it('el bloque está en el editor de noticias y en el bloque «Texto» de las páginas (no en «Dos columnas»)', () => {
    expect(read('apps/cms/src/payload.config.ts')).toMatch(/editor: richTextEditor/)
    expect(read('apps/cms/src/blocks/RichText.ts')).toMatch(/editor: richTextEditor/)
    // «Dos columnas» no muestra su contenido en el portal (componente con texto fijo): ofrecer ahí el video sería engañoso.
    expect(read('apps/cms/src/blocks/TwoColumn.ts')).not.toMatch(/richTextEditor/)
    expect(read('apps/cms/src/fields/richTextEditor.ts')).toMatch(/BlocksFeature\(\{\s*blocks: \[YouTubeBlock\]/)
  })
})

/** Contenido Lexical mínimo con los nodos dados en la raíz. */
const doc = (...children: unknown[]) => ({ root: { type: 'root', children } })
const youtubeNode = (url: string, title = 'Acto de colación 2026') => ({
  type: 'block',
  version: 2,
  format: '',
  fields: { id: 'b1', blockType: 'youtube', blockName: '', url, title },
})
const uploadNode = (value: unknown) => ({ type: 'upload', version: 3, format: '', relationTo: 'media', fields: {}, value })

/** Los dos renderizadores del portal: cuerpo de noticias y bloque «Texto» de páginas. */
const RENDERERS: Array<[string, (content: unknown) => string]> = [
  ['noticias (components/RichText)', (c) => renderToStaticMarkup(createElement(RichText, { content: c as never }))],
  ['páginas (components/blocks/RichText)', (c) => renderToStaticMarkup(createElement(RichTextBlock, { content: c as never }))],
]

describe.each(RENDERERS)('S2 — video en el portal: %s', (_name, render) => {
  it('incrusta el video desde youtube-nocookie.com con título, carga diferida y sandbox', () => {
    const html = render(doc(youtubeNode(`https://www.youtube.com/watch?v=${ID}`)))
    expect(html).toContain(`src="https://www.youtube-nocookie.com/embed/${ID}"`)
    expect(html).toContain('title="Acto de colación 2026"')
    expect(html).toContain('loading="lazy"')
    expect(html).toContain('referrerPolicy="strict-origin-when-cross-origin"')
    expect(html).toContain('sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"')
    expect(html).toContain('allowFullScreen=""')
    expect(html).toContain('aspect-video')
  })

  it('un dato alterado en la base no produce ningún iframe', () => {
    for (const url of [`https://evil.com/embed/${ID}`, 'javascript:alert(1)', '']) {
      expect(render(doc(youtubeNode(url)))).not.toContain('<iframe')
    }
  })

  it('un bloque de otro tipo no se dibuja', () => {
    const html = render(doc({ type: 'block', fields: { blockType: 'otro', url: `https://youtu.be/${ID}` } }))
    expect(html).not.toContain('<iframe')
  })
})

describe.each(RENDERERS)('S3 — imágenes y archivos del cuerpo: %s', (_name, render) => {
  it('muestra la imagen insertada con su texto alternativo y la URL absoluta del CMS', () => {
    const html = render(
      doc(uploadNode({ id: 9, url: '/api/media/file/acto.jpg', alt: 'Entrega de títulos', mimeType: 'image/jpeg', width: 1600, height: 900, filename: 'acto.jpg' })),
    )
    expect(html).toContain('<img')
    expect(html).toContain('alt="Entrega de títulos"')
    expect(html).toContain(encodeURIComponent('http://localhost:3002/api/media/file/acto.jpg'))
  })

  it('un PDF insertado se muestra como enlace al archivo con su nombre', () => {
    const html = render(doc(uploadNode({ id: 3, url: '/api/media/file/resolucion.pdf', mimeType: 'application/pdf', filename: 'resolucion.pdf' })))
    expect(html).toContain('href="http://localhost:3002/api/media/file/resolucion.pdf"')
    expect(html).toContain('resolucion.pdf')
    expect(html).not.toContain('<img')
  })

  it('sin resolver (solo el id) o con una URL fuera del CMS no dibuja nada', () => {
    expect(render(doc(uploadNode(9)))).not.toMatch(/<img|<a /)
    const ajena = render(doc(uploadNode({ id: 9, url: 'https://evil.com/x.jpg', alt: 'x', mimeType: 'image/jpeg', width: 10, height: 10 })))
    expect(ajena).not.toMatch(/<img|evil\.com/)
  })
})

describe('S4 — CSP', () => {
  const csp = read('lib/csp.ts')
  it('frame-src abre youtube-nocookie.com en desarrollo y en producción, y no youtube.com', () => {
    const frames = csp.match(/`frame-src[^`]*`/g) ?? []
    expect(frames).toHaveLength(2)
    for (const f of frames) {
      expect(f).toContain('https://www.google.com')
      expect(f).toContain('https://www.youtube-nocookie.com')
      expect(f).not.toMatch(/https:\/\/(www\.)?youtube\.com/)
    }
  })
  it('media-src sigue cerrado', () => {
    expect(csp.match(/`media-src\s+'none'`/g)).toHaveLength(2)
  })
})
