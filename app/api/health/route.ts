export const dynamic = 'force-dynamic'

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL ?? 'http://localhost:3002'

/**
 * DEP-09 (B): sonda INFORMATIVA del CMS (liveness `/api/health`, no readiness).
 * Devuelve solo estado y latencia: nunca el texto de la excepción (`e.message` puede traer host,
 * puerto o URL internos). Límite: no distingue «CMS caído» de «CMS lento» (tope de 3 s).
 */
async function probeCMS(): Promise<{ status: 'up' | 'down'; latencyMs: number }> {
  const start = Date.now()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 3_000)
  try {
    const res = await fetch(`${CMS_URL}/api/health`, { signal: controller.signal })
    return { status: res.ok ? 'up' : 'down', latencyMs: Date.now() - start }
  } catch {
    return { status: 'down', latencyMs: Date.now() - start }
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * DEP-09 (B): liveness del portal. Responde 200 mientras el proceso del portal esté vivo; la caída
 * del CMS se reporta como `degraded` en el cuerpo pero NO cambia el código HTTP.
 * Por qué: el healthcheck de Docker y el gate del deploy usan esta ruta; si dependiera del CMS, un
 * parpadeo del CMS marcaría `unhealthy` al portal (que ya degrada a datos de respaldo) y forzaría un
 * rollback innecesario. Amenaza que evita además: fuga de errores internos (antes `String(error)`).
 * Límite: no prueba que el portal pueda renderizar páginas con datos reales del CMS.
 * Spec: docs/specs/deploy/DEP-09-health-y-rollback.md · RDD-DEP-30.
 */
export async function GET() {
  try {
    const cms = await probeCMS()
    return Response.json({
      status: cms.status === 'up' ? 'up' : 'degraded',
      service: 'portal',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
      dependencies: { cms },
    })
  } catch (error) {
    // Solo el nombre en el log del servidor; el cliente recibe un cuerpo fijo.
    console.error(`[api/health] portal health failed: ${error instanceof Error ? error.name : 'non-Error thrown'}`)
    return Response.json({ status: 'down', service: 'portal' }, { status: 500 })
  }
}
