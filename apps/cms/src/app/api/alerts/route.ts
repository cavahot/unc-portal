import { getPayload } from 'payload'
import config from '../../../payload.config'
import { hasRole, MONITORING_ROLES } from '../../../access/roles'
import { internalError, invalidParameter, parseBoundedInt, requireRole } from '../../../utilities/routeGuard'
// SEC-05: el módulo de monitoreo compartido está en la raíz del monorepo.
import { alertManager } from '../../../../../../lib/monitoring/alerts'

export const dynamic = 'force-dynamic'

/**
 * DEP-04 (RDD-DEP-11): estado de alertas solo para superadmin y auditor (antes, cualquier sesión).
 * Orden: autenticación y rol → validación de `hours` → lectura. Amenaza: que un editor/viewer
 * vea umbrales y alertas internas. Límite: el almacén de alertas es en memoria por instancia;
 * `POST` conserva su política de SEC-05 (solo superadmin).
 */
export async function GET(request: Request) {
  try {
    const payload = await getPayload({ config })
    const guard = await requireRole(payload, request, MONITORING_ROLES)
    if (!guard.ok) return guard.response

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'active'
    const hours = parseBoundedInt(searchParams.get('hours'), { min: 1, max: 720, fallback: 24 })
    if (hours === null) return invalidParameter('hours')

    let alerts

    if (action === 'active') {
      alerts = alertManager.getActiveAlerts()
    } else if (action === 'recent') {
      alerts = alertManager.getRecentAlerts(hours)
    } else {
      alerts = alertManager.getRecentAlerts(hours)
    }

    const criticalCount = alerts.filter((a) => a.severity === 'critical').length
    const warningCount = alerts.filter((a) => a.severity === 'warning').length

    return Response.json({
      action,
      hours,
      totalAlerts: alerts.length,
      critical: criticalCount,
      warnings: warningCount,
      thresholds: alertManager.getThresholds(),
      alerts: alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    })
  } catch (error) {
    return internalError('api/alerts GET', error, 'Failed to fetch alerts')
  }
}

/**
 * SEC-05: autentica y autoriza en el handler antes de cambiar alertas.
 * CORS/middleware no identifica roles y no protege contra clientes HTTP directos.
 */
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Política restrictiva provisional: SEC-03 debe aprobar quién puede operar alertas.
    if (!hasRole(user, ['superadmin'])) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    if (action === 'resolve') {
      const { alertId } = body
      alertManager.resolveAlert(alertId)

      return Response.json({
        message: 'Alert resolved',
        alertId,
      })
    }

    if (action === 'set-threshold') {
      const { thresholdKey, value } = body
      alertManager.setThreshold(thresholdKey, value)

      return Response.json({
        message: 'Threshold updated',
        thresholds: alertManager.getThresholds(),
      })
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    // DEP-04: mensaje genérico; el detalle solo va al log del servidor.
    return internalError('api/alerts POST', error, 'Failed to process alert action')
  }
}
