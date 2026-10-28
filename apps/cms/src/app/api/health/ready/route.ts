import { createReadinessHandler, probeDatabase } from '../../../../utilities/readiness'

export const dynamic = 'force-dynamic'

// El handler se crea una vez por proceso: la caché de resultado y el limitador viven en su cierre.
const handle = createReadinessHandler({ probe: probeDatabase })

/**
 * DEP-09 (A): readiness del CMS. Pública a propósito y SIN sesión, porque la consultan el healthcheck
 * de Docker y el gate del deploy desde dentro de la red interna (no hay cookie). Responde 200
 * `{status:'ready'}` solo si Postgres contesta `SELECT 1` en ≈ 2 s; si no, 503 `{status:'unavailable'}`.
 * Amenazas: health engañoso (verde con la BD caída) y fuga de infraestructura; por eso el cuerpo es
 * constante, el resultado se cachea 5 s y hay un limitador por IP (ver utilities/readiness.ts).
 * Límite: no valida el esquema ni el almacenamiento S3; la liveness barata sigue en `/api/health`.
 * Spec: docs/specs/deploy/DEP-09-health-y-rollback.md · RDD-DEP-27.
 */
export async function GET(request: Request) {
  return handle(request.headers)
}
