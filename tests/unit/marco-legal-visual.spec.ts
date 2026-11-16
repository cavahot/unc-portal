// MLG-02: contrato visual del hero de Marco Legal.
// Qué hace: garantiza textura institucional, jerarquía en escalones y microinteracciones coherentes.
// Amenaza: evita que la portada se degrade a un bloque verde plano sin orientación visual.
// Límite: valida clases y estructura estática; el contraste final se confirma en navegador.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const source = readFileSync('app/[locale]/marco-legal/page.tsx', 'utf8')
const css = readFileSync('app/globals.css', 'utf8')

describe('MLG-02 — dirección visual del Marco Legal', () => {
  it('usa hero con textura, composición editorial y jerarquía visual', () => {
    expect(source).toContain('marco-legal-hero-grid')
    expect(source).toContain('min-h-[620px]')
    expect(source).toContain('text-[clamp(3.75rem,7vw,6.5rem)]')
    expect(source).toContain('legal-tier')
  })

  it('define movimiento sutil y respeta reducción de movimiento', () => {
    expect(css).toContain('.legal-tier')
    expect(css).toContain('legal-tier-in')
    expect(css).toContain('prefers-reduced-motion: no-preference')
    expect(css).toContain('prefers-reduced-motion: reduce')
  })
})
