import { getPayload } from 'payload'
import config from '../../../../payload.config'
import { DASHBOARD_ROLES } from '../../../../access/roles'
import {
  internalError,
  invalidParameter,
  parseAllowed,
  parseBoundedInt,
  requireRole,
} from '../../../../utilities/routeGuard'

export const dynamic = 'force-dynamic'

// DEP-04: estados editoriales válidos del campo `approvalStatus`; cualquier otro valor es 400.
const APPROVAL_STATUSES = ['draft', 'en_revision', 'aprobado', 'rechazado', 'publicado'] as const

/**
 * DEP-04 (RDD-DEP-11): listado del panel editorial para roles editoriales y auditor.
 * La consulta usa `overrideAccess:false` y `user`: aplican las ACL de `noticias` (DEP-02), de modo
 * que un rol sin permiso no recibe borradores ni comentarios de aprobación.
 * Amenaza: sesión sin función editorial leyendo borradores/comentarios por Local API sin ACL.
 * Límite: política PROVISIONAL (SEC-03); `reviewer` y `correspondent` leen borradores ajenos.
 */
export async function GET(request: Request) {
  try {
    const payload = await getPayload({ config })

    const guard = await requireRole(payload, request, DASHBOARD_ROLES)
    if (!guard.ok) return guard.response

    const { searchParams } = new URL(request.url)
    const status = parseAllowed(searchParams.get('status'), APPROVAL_STATUSES, 'en_revision')
    if (!status) return invalidParameter('status')
    const limit = parseBoundedInt(searchParams.get('limit'), { min: 1, max: 200, fallback: 20 })
    if (limit === null) return invalidParameter('limit')
    const page = parseBoundedInt(searchParams.get('page'), { min: 1, max: 10000, fallback: 1 })
    if (page === null) return invalidParameter('page')

    const noticias = await payload.find({
      collection: 'noticias',
      where: {
        approvalStatus: { equals: status },
      },
      sort: '-updatedAt',
      limit,
      page,
      depth: 2,
      overrideAccess: false,
      user: guard.user,
    })

    return Response.json({
      noticias: noticias.docs.map((n: any) => ({
        id: n.id,
        title: n.title,
        slug: n.slug,
        category: n.category,
        approvalStatus: n.approvalStatus,
        createdBy: n.createdBy,
        updatedAt: n.updatedAt,
        publishedAt: n.publishedAt,
        lastComment: n.approvalHistory?.[n.approvalHistory.length - 1]?.comentario || null,
      })),
      pagination: {
        page: noticias.page,
        limit: noticias.limit,
        totalDocs: noticias.totalDocs,
        totalPages: noticias.totalPages,
        hasNextPage: noticias.hasNextPage,
        hasPrevPage: noticias.hasPrevPage,
      },
    })
  } catch (error) {
    return internalError('api/dashboard/noticias', error, 'Failed to fetch noticias')
  }
}
