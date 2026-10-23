import { getPayload } from 'payload'
import config from '../../../../payload.config'
import { DASHBOARD_ROLES } from '../../../../access/roles'
import { internalError, requireRole } from '../../../../utilities/routeGuard'

export const dynamic = 'force-dynamic'

/**
 * DEP-04 (RDD-DEP-11): conteos por estado editorial para roles editoriales y auditor.
 * Cada `count` usa `overrideAccess:false` y `user`, así las ACL de `noticias` (DEP-02) limitan lo
 * que cada rol puede contar. Se lee `totalDocs`: `payload.count` devuelve un objeto y antes se
 * sumaba como si fuera número. Límite: para `auditor` los conteos son parciales (solo publicados
 * por DEP-02); política PROVISIONAL a la espera de SEC-03.
 */
export async function GET(request: Request) {
  try {
    const payload = await getPayload({ config })

    const guard = await requireRole(payload, request, DASHBOARD_ROLES)
    if (!guard.ok) return guard.response

    const countByStatus = async (approvalStatus: string): Promise<number> => {
      const { totalDocs } = await payload.count({
        collection: 'noticias',
        where: { approvalStatus: { equals: approvalStatus } },
        overrideAccess: false,
        user: guard.user,
      })
      return totalDocs
    }

    const borrador = await countByStatus('draft')
    const enRevision = await countByStatus('en_revision')
    const aprobado = await countByStatus('aprobado')
    const rechazado = await countByStatus('rechazado')
    const publicado = await countByStatus('publicado')

    return Response.json({
      stats: {
        borrador,
        enRevision,
        aprobado,
        rechazado,
        publicado,
        total: borrador + enRevision + aprobado + rechazado + publicado,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return internalError('api/dashboard/stats', error, 'Failed to fetch statistics')
  }
}
