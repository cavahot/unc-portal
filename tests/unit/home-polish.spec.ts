// HOME-ORDER-01 (pulido): hallazgos reales de la revisión con las pautas de interfaces web sobre las secciones
// reordenadas del inicio. Amenazas que evita: animar propiedades de más (`transition-all`), una sección sin nombre
// accesible entre las demás, y un contador que muestra «0» en el HTML inicial / sin JavaScript / a quien pidió
// movimiento reducido. Límite: render estático y lectura de código; el conteo animado y el IntersectionObserver
// se verificaron en el navegador.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import StatCounter from '@/components/stats/StatCounter'

const ROOT = path.resolve(__dirname, '..', '..')
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8')

describe('pulido del inicio (HOME-ORDER-01)', () => {
  it('la página del inicio no usa `transition-all` (se listan las propiedades que cambian)', () => {
    expect(read('app/[locale]/page.tsx')).not.toMatch(/transition-all/)
  })

  it('la sección de estadísticas tiene nombre accesible como las demás secciones', () => {
    const src = read('components/stats/StatsBlock.tsx')
    expect(src).toMatch(/<section[^>]*aria-labelledby="stats-title"/)
    expect(src).toMatch(/<h2[^>]*id="stats-title"/)
  })

  it('el contador entrega el valor real en el HTML inicial (no «0»)', () => {
    const html = renderToStaticMarkup(
      createElement(
        NextIntlClientProvider,
        { locale: 'es', messages: {} },
        createElement(StatCounter, { value: 4985, label: 'Estudiantes' }),
      ),
    )
    expect(html).toContain('4985')
  })

  it('el contador respeta la preferencia de movimiento reducido', () => {
    expect(read('components/stats/StatCounter.tsx')).toMatch(/prefers-reduced-motion: reduce/)
  })
})
