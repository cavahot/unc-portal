import { cmsFetch } from '../client'

export interface StatsData {
  totalEstudiantes: number
  totalDocentes: number
  totalEgresados: number
  totalCarrerasAcreditadas: number
  totalFacultades: number
}

export const FALLBACK_STATS: StatsData = {
  totalEstudiantes: 4985,
  totalDocentes: 762,
  totalEgresados: 672,
  totalCarrerasAcreditadas: 10,
  totalFacultades: 6,
}

function pick(v: unknown, fallback: number): number {
  return typeof v === 'number' && v > 0 ? v : fallback
}

export async function getStatsGlobal(): Promise<StatsData> {
  try {
    const raw = await cmsFetch<Partial<StatsData>>('/globals/estadisticas', {
      tags: ['estadisticas'],
    })
    return {
      totalEstudiantes: pick(raw.totalEstudiantes, FALLBACK_STATS.totalEstudiantes),
      totalDocentes: pick(raw.totalDocentes, FALLBACK_STATS.totalDocentes),
      totalEgresados: pick(raw.totalEgresados, FALLBACK_STATS.totalEgresados),
      totalCarrerasAcreditadas: pick(raw.totalCarrerasAcreditadas, FALLBACK_STATS.totalCarrerasAcreditadas),
      totalFacultades: pick(raw.totalFacultades, FALLBACK_STATS.totalFacultades),
    }
  } catch {
    return FALLBACK_STATS
  }
}
