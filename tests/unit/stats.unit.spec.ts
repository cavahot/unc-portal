import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FALLBACK_STATS } from '../../lib/cms/queries/stats'

const FOUNDING_DATE = new Date('2009-08-03')

describe('daysSinceFounding', () => {
  it('returns a value greater than 6000 days since August 3, 2009', () => {
    const days = Math.floor((Date.now() - FOUNDING_DATE.getTime()) / 86_400_000)
    expect(days).toBeGreaterThan(6000)
  })
})

// Mock the CMS client — path must match the import in lib/cms/queries/stats.ts
vi.mock('../../lib/cms/client', () => ({
  cmsFetch: vi.fn(),
}))

describe('getStatsGlobal', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('returns CMS data when fetch succeeds with valid values', async () => {
    const { cmsFetch } = await import('../../lib/cms/client')
    const mockData = {
      totalEstudiantes: 5000,
      totalDocentes: 800,
      totalEgresados: 700,
      totalCarrerasAcreditadas: 12,
      totalFacultades: 7,
    }
    vi.mocked(cmsFetch).mockResolvedValueOnce(mockData)
    const { getStatsGlobal } = await import('../../lib/cms/queries/stats')
    const result = await getStatsGlobal()
    expect(result).toEqual(mockData)
  })

  it('returns FALLBACK_STATS when fetch throws', async () => {
    const { cmsFetch } = await import('../../lib/cms/client')
    vi.mocked(cmsFetch).mockRejectedValueOnce(new Error('CMS down'))
    const { getStatsGlobal } = await import('../../lib/cms/queries/stats')
    const result = await getStatsGlobal()
    expect(result).toEqual(FALLBACK_STATS)
  })

  it('uses fallback for zero-value fields', async () => {
    const { cmsFetch } = await import('../../lib/cms/client')
    vi.mocked(cmsFetch).mockResolvedValueOnce({
      totalEstudiantes: 0,
      totalDocentes: 762,
      totalEgresados: 672,
      totalCarrerasAcreditadas: 10,
      totalFacultades: 6,
    })
    const { getStatsGlobal } = await import('../../lib/cms/queries/stats')
    const result = await getStatsGlobal()
    expect(result.totalEstudiantes).toBe(FALLBACK_STATS.totalEstudiantes)
    expect(result.totalDocentes).toBe(762)
  })

  it('FALLBACK_STATS has all positive values', () => {
    expect(FALLBACK_STATS.totalEstudiantes).toBeGreaterThan(0)
    expect(FALLBACK_STATS.totalDocentes).toBeGreaterThan(0)
    expect(FALLBACK_STATS.totalEgresados).toBeGreaterThan(0)
    expect(FALLBACK_STATS.totalCarrerasAcreditadas).toBeGreaterThan(0)
    expect(FALLBACK_STATS.totalFacultades).toBeGreaterThan(0)
  })
})
