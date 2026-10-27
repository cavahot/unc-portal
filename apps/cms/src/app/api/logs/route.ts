import { getPayload } from 'payload'
import config from '../../../payload.config'
import { MONITORING_ROLES } from '../../../access/roles'
import { logger, type LogCategory } from '../../../../../../lib/monitoring/logger'
import {
  internalError,
  invalidParameter,
  parseAllowed,
  parseBoundedInt,
  requireRole,
} from '../../../utilities/routeGuard'

export const dynamic = 'force-dynamic'

// DEP-04: listas blancas; `category` compone el nombre del archivo de log, no debe aceptar texto libre.
const CATEGORIES: readonly LogCategory[] = ['cms', 'portal', 'database', 'auth', 'api', 'security', 'performance']
const LEVELS = ['debug', 'info', 'warn', 'error', 'critical'] as const

/**
 * DEP-04 (RDD-DEP-11): logs del servidor solo para superadmin y auditor.
 * Amenaza: lectura de trazas internas por cualquier sesión y `category` como vector de ruta.
 * Límite: los logs en archivo son por instancia; sin rate limit (DEP-06). Se corrigió además la
 * ruta de importación del logger (apuntaba a `apps/lib`, TS2307).
 */
export async function GET(request: Request) {
  try {
    const payload = await getPayload({ config })

    const guard = await requireRole(payload, request, MONITORING_ROLES)
    if (!guard.ok) return guard.response

    const { searchParams } = new URL(request.url)
    const category = parseAllowed(searchParams.get('category'), CATEGORIES, 'api')
    if (!category) return invalidParameter('category')
    const level = parseAllowed(searchParams.get('level'), LEVELS, undefined)
    if (level === null) return invalidParameter('level')
    const limit = parseBoundedInt(searchParams.get('limit'), { min: 1, max: 200, fallback: 100 })
    if (limit === null) return invalidParameter('limit')
    const hours = parseBoundedInt(searchParams.get('hours'), { min: 1, max: 720, fallback: 24 })
    if (hours === null) return invalidParameter('hours')

    let logs = logger.getLogs(category, limit)

    // Filtrar por nivel si se proporciona
    if (level) {
      logs = logs.filter((log) => log.level === level)
    }

    // Filtrar por tiempo
    const cutoff = new Date(Date.now() - hours * 3600 * 1000).toISOString()
    logs = logs.filter((log) => log.timestamp > cutoff)

    return Response.json({
      category,
      level: level || 'all',
      hours,
      count: logs.length,
      logs: logs.reverse(), // Mostrar más recientes primero
    })
  } catch (error) {
    return internalError('api/logs', error, 'Failed to fetch logs')
  }
}
