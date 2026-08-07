import { describe, it, expect } from 'vitest'
import { statsSchema, newsItemSchema } from '../../tests/fixtures/schemas'
import statsFixture from '../../tests/fixtures/cms-responses/stats.fixture.json'
import newsFixture from '../../tests/fixtures/cms-responses/news.fixture.json'

describe('statsSchema', () => {
  it('parses the stats fixture successfully', () => {
    expect(() => statsSchema.parse(statsFixture)).not.toThrow()
  })

  it('rejects non-numeric fields', () => {
    expect(
      statsSchema.safeParse({
        totalEstudiantes: 'bad',
        totalDocentes: 762,
        totalEgresados: 672,
        totalCarrerasAcreditadas: 10,
        totalFacultades: 6,
      }).success
    ).toBe(false)
  })

  it('rejects negative numbers', () => {
    expect(
      statsSchema.safeParse({
        totalEstudiantes: -1,
        totalDocentes: 762,
        totalEgresados: 672,
        totalCarrerasAcreditadas: 10,
        totalFacultades: 6,
      }).success
    ).toBe(false)
  })
})

describe('newsItemSchema', () => {
  it('parses the first news fixture item successfully', () => {
    expect(() => newsItemSchema.parse(newsFixture[0])).not.toThrow()
  })

  it('rejects items without required fields', () => {
    expect(newsItemSchema.safeParse({ id: 1 }).success).toBe(false)
  })
})
