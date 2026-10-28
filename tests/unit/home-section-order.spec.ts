// HOME-ORDER-01: orden de las secciones del inicio del portal (decisión del Product Owner, 2026-10-28).
// Orden exigido: portada → Actualidad universitaria (noticias) → UNC en números (estadísticas) →
// Servicios institucionales (accesos rápidos + accesos institucionales) → Transparencia → Premios → cierre.
// Por qué: las noticias son el primer contenido vivo tras la portada; los accesos pasan a ser una sección normal.
// Amenaza que evita: que una edición posterior deje la sección que sigue a la portada sin la transición
// (degradé superpuesto) y la portada oscura corte en seco contra un fondo plano. Límite: lee el código fuente de la
// página; no valida el render ni el contenido que llega del CMS.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const SRC = readFileSync(path.resolve(__dirname, '..', '..', 'app', '[locale]', 'page.tsx'), 'utf8')

/** Posición de la primera aparición de un marcador del JSX; falla con un mensaje claro si no existe. */
function at(marker: string): number {
  const i = SRC.indexOf(marker)
  expect(i, `falta «${marker}» en app/[locale]/page.tsx`).toBeGreaterThanOrEqual(0)
  return i
}

/** Etiqueta de apertura `<section ... >` que contiene el marcador (para revisar sus clases). */
function sectionOpening(marker: string): string {
  const i = at(marker)
  const start = SRC.lastIndexOf('<section', i)
  const end = SRC.indexOf('>', i)
  return SRC.slice(start, end + 1)
}

describe('orden de las secciones del inicio (HOME-ORDER-01)', () => {
  it('sigue el orden: portada, noticias, estadísticas, accesos, accesos institucionales, transparencia, premios, cierre', () => {
    const order = [
      '<CinematicHero',
      'id="noticias"',
      '<StatsBlock',
      'id="accesos"',
      '<InstitutionalAccessSection',
      'id="transparencia"',
      '<AwardsAccreditationsSection',
      'id="institucional"',
    ].map(at)
    expect(order).toEqual([...order].sort((a, b) => a - b))
  })

  it('la sección que sigue a la portada (noticias) arranca en el papel con que termina la portada y baja a verde sin transparencias', () => {
    // La portada (CinematicHero) termina fundida en #F4F7F5. Un degradé translúcido sobre ella deja una costura
    // visible al acabar la portada; el degradé opaco papel → verde de marca entrega el paso sin corte.
    const news = sectionOpening('id="noticias"')
    expect(news).toMatch(/linear-gradient\(to_bottom,#F4F7F5_0/)
    expect(news).toMatch(/#00A300_100%/)
    expect(news).not.toMatch(/rgba\(/)
    expect(news).not.toMatch(/-mt-\[/)
    // El escenario fijo de la portada deja asomar ~1 px de su fondo oscuro por redondeo en su borde inferior
    // (se vio como una línea gris). Un solapamiento opaco de 8 px, del mismo papel, lo tapa sin cambiar el diseño.
    expect(news).toMatch(/\bz-20\b/)
    expect(news).toMatch(/(^|\s)-mt-2(\s|")/)
  })

  it('los accesos rápidos ya no se superponen a la portada: son una sección normal', () => {
    const quick = sectionOpening('id="accesos"')
    expect(quick).not.toMatch(/-mt-\[/)
    expect(quick).not.toMatch(/pt-\[\d+svh\]/)
    expect(quick).not.toMatch(/linear-gradient/)
  })

  it('conserva los anclajes y los títulos accesibles de cada sección', () => {
    for (const marker of ['id="accesos"', 'id="noticias"', 'id="transparencia"', 'id="institucional"']) {
      expect(SRC.split(marker).length - 1, marker).toBe(1)
    }
    for (const label of ['quick-links-title', 'news-title', 'transparency-title']) {
      expect(SRC).toContain(`aria-labelledby="${label}"`)
      expect(SRC).toContain(`id="${label}"`)
    }
  })
})
