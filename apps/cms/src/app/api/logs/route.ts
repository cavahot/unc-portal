import { getPayload } from 'payload'
import config from '../../../payload.config'
import { logger, LogCategory } from '../../../../../lib/monitoring/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const category = (searchParams.get('category') || 'api') as LogCategory
  const level = searchParams.get('level') as string | null
  const limit = parseInt(searchParams.get('limit') || '100')
  const hours = parseInt(searchParams.get('hours') || '24')

  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    return Response.json(
      { error: 'Failed to fetch logs', details: String(error) },
      { status: 500 }
    )
  }
}
