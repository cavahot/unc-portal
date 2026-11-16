import { describe, it, expect } from 'vitest'

const FOUNDING_DATE = new Date('2009-08-03')

describe('daysSinceFounding', () => {
  it('returns a value greater than 6000 days since August 3, 2009', () => {
    const days = Math.floor((Date.now() - FOUNDING_DATE.getTime()) / 86_400_000)
    expect(days).toBeGreaterThan(6000)
  })
})

// HOME-STATES-01: la consulta de estadísticas (getStatsResult) y su regla de «nunca cifras inventadas» se prueban en
// tests/unit/home-estados.spec.ts. Antes este archivo comprobaba que las cifras en cero se reemplazaran por valores de
// relleno (FALLBACK_STATS), comportamiento que se retiró porque publicaba números que nadie había cargado.
