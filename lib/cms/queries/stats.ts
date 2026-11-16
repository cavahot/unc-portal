import { cmsFetch } from '../client'
import { demoFallbackAllowed } from '../errors'

export interface StatsData {
  totalEstudiantes: number
  totalDocentes: number
  totalEgresados: number
  totalCarrerasAcreditadas: number
  totalFacultades: number
}

/** Estado de las estadísticas del inicio (mismo contrato que el resto de las páginas del CMS). */
export type StatsState = 'ok' | 'empty' | 'unavailable'

export interface StatsResult {
  state: StatsState
  /** Solo las cifras publicadas (mayores que cero). Nunca contiene valores de relleno. */
  stats: Partial<StatsData>
}

// HOME-STATES-01: cifras de DEMOSTRACIÓN, solo para desarrollo local (`demoFallbackAllowed`). Antes se mostraban en
// producción cuando el CMS fallaba o una cifra estaba en cero, y la portada publicaba números que nadie había cargado.
// Amenaza: cifra institucional falsa en la página principal. Límite: en producción y en pruebas nunca se usan.
export const DEMO_STATS: StatsData = {
  totalEstudiantes: 4985,
  totalDocentes: 762,
  totalEgresados: 672,
  totalCarrerasAcreditadas: 10,
  totalFacultades: 6,
}

const KEYS: (keyof StatsData)[] = [
  'totalEstudiantes',
  'totalDocentes',
  'totalEgresados',
  'totalCarrerasAcreditadas',
  'totalFacultades',
]

/**
 * Estadísticas institucionales con estado: `ok` (al menos una cifra publicada), `empty` (el CMS respondió sin cifras) o
 * `unavailable` (el CMS no respondió). Qué hace: conserva solo las cifras mayores que cero y descarta el resto en lugar
 * de reemplazarlas. Por qué: una cifra ausente debe verse como ausente, no como un número inventado.
 * Límite: solo en desarrollo una caída devuelve `DEMO_STATS`.
 */
export async function getStatsResult(): Promise<StatsResult> {
  try {
    const raw = await cmsFetch<Partial<StatsData>>('/globals/estadisticas', {
      tags: ['estadisticas'],
    })
    const stats: Partial<StatsData> = {}
    for (const k of KEYS) {
      const v = raw?.[k]
      if (typeof v === 'number' && v > 0) stats[k] = v
    }
    return Object.keys(stats).length > 0 ? { state: 'ok', stats } : { state: 'empty', stats: {} }
  } catch {
    if (demoFallbackAllowed()) return { state: 'ok', stats: { ...DEMO_STATS } }
    return { state: 'unavailable', stats: {} }
  }
}
