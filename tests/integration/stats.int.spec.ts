import { describe, it, expect } from 'vitest'
import { statsSchema } from '../../tests/fixtures/schemas'

const CMS_URL = process.env.CMS_URL ?? 'http://localhost:3002'

describe('Stats global — integration', () => {
  it('returns a valid stats object from the CMS', async (ctx) => {
    let res: Response
    try {
      res = await fetch(`${CMS_URL}/api/globals/estadisticas`)
    } catch {
      ctx.skip()
      return
    }
    expect(res.ok).toBe(true)
    const data = await res.json()
    const parsed = statsSchema.safeParse(data)
    expect(
      parsed.success,
      `Schema validation failed: ${JSON.stringify(parsed.error?.issues)}`
    ).toBe(true)
    if (parsed.success) {
      expect(parsed.data.totalEstudiantes).toBeGreaterThanOrEqual(0)
      expect(parsed.data.totalDocentes).toBeGreaterThanOrEqual(0)
      expect(parsed.data.totalEgresados).toBeGreaterThanOrEqual(0)
      expect(parsed.data.totalCarrerasAcreditadas).toBeGreaterThanOrEqual(0)
      expect(parsed.data.totalFacultades).toBeGreaterThanOrEqual(0)
    }
  })
})
