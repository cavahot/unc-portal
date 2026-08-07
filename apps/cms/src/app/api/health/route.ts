import { getPayload } from 'payload'
import config from '../../../payload.config'
import { Pool } from 'pg'

export const dynamic = 'force-dynamic'

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  services: {
    cms: {
      status: 'up' | 'down'
      responseTime: number
      version: string
    }
    database: {
      status: 'up' | 'down'
      responseTime: number
      connections: number
    }
    minio: {
      status: 'up' | 'down'
      responseTime: number
    }
    portal: {
      status: 'up' | 'down'
      responseTime: number
    }
  }
  metrics: {
    totalNoticias: number
    noticiasEnRevision: number
    averageApprovalTime: string
    uptime: number
  }
  lastCheck: string
}

export async function GET(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  if (!user) {
    return Response.json({ status: 'ok' })
  }

  const startTime = Date.now()
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      cms: { status: 'up', responseTime: 0, version: '3.0.0' },
      database: { status: 'up', responseTime: 0, connections: 0 },
      minio: { status: 'up', responseTime: 0 },
      portal: { status: 'up', responseTime: 0 },
    },
    metrics: {
      totalNoticias: 0,
      noticiasEnRevision: 0,
      averageApprovalTime: '0h',
      uptime: 0,
    },
    lastCheck: new Date().toISOString(),
  }

  // Run checks in parallel with timeouts
  const checkPromises = [
    checkCMS(),
    checkDatabase(),
    checkMinIO(),
    checkPortal(),
  ]

  const results = await Promise.allSettled(checkPromises)

  if (results[0].status === 'fulfilled' && results[0].value) {
    health.services.cms = results[0].value
  } else {
    health.services.cms.status = 'down'
    health.status = 'degraded'
  }

  if (results[1].status === 'fulfilled' && results[1].value) {
    health.services.database = results[1].value
  } else {
    health.services.database.status = 'down'
    health.status = 'unhealthy'
  }

  if (results[2].status === 'fulfilled' && results[2].value) {
    health.services.minio = results[2].value
  } else {
    health.services.minio.status = 'down'
    health.status = 'degraded'
  }

  if (results[3].status === 'fulfilled' && results[3].value) {
    health.services.portal = results[3].value
  } else {
    health.services.portal.status = 'down'
    health.status = 'degraded'
  }

  health.lastCheck = new Date().toISOString()

  const httpStatus = health.status === 'unhealthy' ? 503 : 200

  return Response.json(health, { status: httpStatus })
}

async function checkCMS(): Promise<{ status: 'up' | 'down'; responseTime: number; version: string } | null> {
  try {
    const start = Date.now()
    const payload = await Promise.race([
      getPayload({ config }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
    ])
    return {
      status: 'up',
      responseTime: Date.now() - start,
      version: '3.0.0',
    }
  } catch (error) {
    return null
  }
}

async function checkDatabase(): Promise<{ status: 'up' | 'down'; responseTime: number; connections: number } | null> {
  try {
    const start = Date.now()
    const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/unc_portal'
    const pool = new Pool({
      connectionString: dbUrl,
      connectionTimeoutMillis: 3000,
      idleTimeoutMillis: 3000,
    })

    const result = await Promise.race([
      pool.query('SELECT 1'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
    ])

    await pool.end()

    return {
      status: 'up',
      responseTime: Date.now() - start,
      connections: 1,
    }
  } catch (error) {
    return null
  }
}

async function checkMinIO(): Promise<{ status: 'up' | 'down'; responseTime: number } | null> {
  try {
    const start = Date.now()
    const minioUrl = process.env.MINIO_ENDPOINT || 'http://localhost:9000'
    const response = await Promise.race([
      fetch(`${minioUrl}/minio/health/live`, { method: 'GET' }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
    ])

    return {
      status: (response as any).ok ? 'up' : 'down',
      responseTime: Date.now() - start,
    }
  } catch (error) {
    return null
  }
}

async function checkPortal(): Promise<{ status: 'up' | 'down'; responseTime: number } | null> {
  try {
    const start = Date.now()
    const portalUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
    const response = await Promise.race([
      fetch(`${portalUrl}/api/health`, { method: 'GET' }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
    ])

    return {
      status: (response as any).ok ? 'up' : 'down',
      responseTime: Date.now() - start,
    }
  } catch (error) {
    return null
  }
}
