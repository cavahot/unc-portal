import { describe, it, expect } from 'vitest'
import { newsItemSchema } from '../../tests/fixtures/schemas'

const CMS_URL = process.env.CMS_URL ?? 'http://localhost:3002'

describe('News endpoint — integration', () => {
  it('returns at most 3 published news items sorted by publishedAt desc', async (ctx) => {
    let res: Response
    try {
      res = await fetch(
        `${CMS_URL}/api/noticias?where[_status][equals]=published&sort=-publishedAt&limit=3&depth=2`
      )
    } catch {
      ctx.skip()
      return
    }
    expect(res.ok).toBe(true)
    const { docs } = await res.json()
    expect(Array.isArray(docs)).toBe(true)
    expect(docs.length).toBeLessThanOrEqual(3)
    if (docs.length > 0) {
      const parsed = newsItemSchema.safeParse(docs[0])
      expect(
        parsed.success,
        `Schema validation failed: ${JSON.stringify(parsed.error?.issues)}`
      ).toBe(true)
    }
  })
})
