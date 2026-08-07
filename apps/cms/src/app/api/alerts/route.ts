import { getPayload } from 'payload'
import config from '../../../payload.config'
import { alertManager } from '../../../../../lib/monitoring/alerts'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const action = searchParams.get('action') || 'active'
  const hours = parseInt(searchParams.get('hours') || '24')

  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    return Response.json(
      { error: 'Failed to fetch alerts', details: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
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
    return Response.json(
      { error: 'Failed to process alert action', details: String(error) },
      { status: 500 }
    )
  }
}
