export const dynamic = 'force-dynamic'

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL ?? 'http://localhost:3002'

async function probeCMS(): Promise<{ status: 'up' | 'down'; latencyMs?: number; error?: string }> {
  const start = Date.now()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3_000)
    const res = await fetch(`${CMS_URL}/api/health`, { signal: controller.signal })
    clearTimeout(timeout)
    return { status: res.ok ? 'up' : 'down', latencyMs: Date.now() - start }
  } catch (e) {
    return { status: 'down', latencyMs: Date.now() - start, error: e instanceof Error ? e.message : 'unknown' }
  }
}

export async function GET() {
  try {
    const [cms] = await Promise.all([probeCMS()])
    const healthy = cms.status === 'up'
    return Response.json({
      status: healthy ? 'up' : 'degraded',
      service: 'portal',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
      dependencies: { cms },
    }, { status: healthy ? 200 : 503 })
  } catch (error) {
    return Response.json({ status: 'down', service: 'portal', error: String(error) }, { status: 500 })
  }
}
