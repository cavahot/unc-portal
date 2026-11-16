// BLOQUE-2COL: el bloque «Dos columnas» de las páginas muestra el contenido cargado en el CMS.
// Qué comprueba: (S1) cada columna dibuja su texto enriquecido y ya no el aviso fijo «Contenido enriquecido disponible en
//   Payload CMS»; (S2) la proporción elegida define la grilla y un valor desconocido vuelve a 50/50; (S3) una columna vacía
//   no deja una caja vacía y el bloque sin contenido no dibuja nada; (S4) los enlaces pasan por safeHref y el video de
//   YouTube y las imágenes usan el mismo renderizado que el resto del cuerpo; (S5) el CMS ofrece en sus columnas el editor
//   común (con el bloque de video).
// Amenaza que cubre S4: un enlace `javascript:` guardado en una columna. Límite: renderizado estático, sin navegador.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import TwoColumnBlock from '@/components/blocks/TwoColumn'

const ROOT = path.resolve(__dirname, '..', '..')
const read = (p: string) => readFileSync(path.join(ROOT, p), 'utf8')

const text = (t: string) => ({ type: 'text', text: t, format: 0 })
const doc = (...children: unknown[]) => ({ root: { type: 'root', children } })
const paragraph = (...children: unknown[]) => ({ type: 'paragraph', children })

const render = (props: Record<string, unknown>) => renderToStaticMarkup(createElement(TwoColumnBlock, props))

describe('Bloque «Dos columnas» en el portal', () => {
  it('S1: dibuja el contenido de ambas columnas y no el aviso fijo', () => {
    const html = render({
      ratio: '50-50',
      left: doc(paragraph(text('Requisitos de inscripción'))),
      right: doc({ type: 'heading', tag: 'h3', children: [text('Plazos')] }, paragraph(text('Hasta el 30 de marzo'))),
    })
    expect(html).toContain('Requisitos de inscripción')
    expect(html).toContain('Plazos')
    expect(html).toContain('Hasta el 30 de marzo')
    expect(html).not.toContain('Contenido enriquecido disponible en Payload CMS')
  })

  it('S2: aplica la proporción elegida y vuelve a 50/50 ante un valor desconocido', () => {
    const left = doc(paragraph(text('A')))
    const right = doc(paragraph(text('B')))
    expect(render({ ratio: '60-40', left, right })).toContain('lg:grid-cols-[3fr_2fr]')
    expect(render({ ratio: '40-60', left, right })).toContain('lg:grid-cols-[2fr_3fr]')
    expect(render({ ratio: 'otro', left, right })).toContain('lg:grid-cols-2')
    expect(render({ left, right })).toContain('lg:grid-cols-2')
  })

  it('S3: una columna vacía no deja caja vacía y el bloque vacío no dibuja nada', () => {
    const solo = render({ ratio: '60-40', left: doc(paragraph(text('Solo izquierda'))), right: null })
    expect(solo).toContain('Solo izquierda')
    expect(solo.match(/data-columna/g)).toHaveLength(1)
    expect(solo).not.toContain('lg:grid-cols-[3fr_2fr]')

    expect(render({ left: null, right: doc() })).toBe('')
    expect(render({ left: doc(paragraph(text(''))), right: undefined })).toBe('')
  })

  it('S4: los enlaces pasan por safeHref y el video usa el renderizado común', () => {
    const html = render({
      left: doc(paragraph({ type: 'link', url: 'javascript:alert(1)', children: [text('clic')] })),
      right: doc({ type: 'block', fields: { blockType: 'youtube', url: 'https://youtu.be/dQw4w9WgXcQ', title: 'Acto' } }),
    })
    expect(html).not.toContain('javascript:')
    expect(html).toContain('clic')
    expect(html).toContain('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
  })

  it('S5: las columnas del CMS usan el editor común (imágenes y video)', () => {
    const src = read('apps/cms/src/blocks/TwoColumn.ts')
    expect(src.match(/editor: richTextEditor/g)).toHaveLength(2)
  })
})
