import { getPayload } from 'payload'
import config from '../../../payload.config'
import { MONITORING_ROLES } from '../../../access/roles'
import { internalError, requireRole } from '../../../utilities/routeGuard'

export const dynamic = 'force-dynamic'

/**
 * DEP-04 (RDD-DEP-11): métricas agregadas (conteos por estado, usuarios por rol, memoria) solo
 * para superadmin y auditor. Amenaza: que cualquier sesión conozca la composición de usuarios y
 * el estado del proceso. Límite: las consultas conservan el acceso de servidor (sin
 * `overrideAccess:false`) a propósito: son conteos agregados y el auditor no puede leer `users`
 * ni borradores por ACL; el control efectivo es el guard de rol de arriba. Sin rate limit (DEP-06).
 */
export async function GET(request: Request) {
  try {
    const payload = await getPayload({ config })

    const guard = await requireRole(payload, request, MONITORING_ROLES)
    if (!guard.ok) return guard.response

    // Noticias por estado
    const borrador = await payload.find({
      collection: 'noticias',
      where: { approvalStatus: { equals: 'draft' } },
      limit: 1,
      pagination: false,
    })

    const enRevision = await payload.find({
      collection: 'noticias',
      where: { approvalStatus: { equals: 'en_revision' } },
      limit: 1,
      pagination: false,
    })

    const aprobado = await payload.find({
      collection: 'noticias',
      where: { approvalStatus: { equals: 'aprobado' } },
      limit: 1,
      pagination: false,
    })

    const rechazado = await payload.find({
      collection: 'noticias',
      where: { approvalStatus: { equals: 'rechazado' } },
      limit: 1,
      pagination: false,
    })

    const publicado = await payload.find({
      collection: 'noticias',
      where: { approvalStatus: { equals: 'publicado' } },
      limit: 1,
      pagination: false,
    })

    const borradorCount = borrador.totalDocs || 0
    const enRevisionCount = enRevision.totalDocs || 0
    const aprobadoCount = aprobado.totalDocs || 0
    const rechazadoCount = rechazado.totalDocs || 0
    const publicadoCount = publicado.totalDocs || 0
    const totalNoticias = borradorCount + enRevisionCount + aprobadoCount + rechazadoCount + publicadoCount

    const tasaAprobacion = publicadoCount + rechazadoCount > 0
      ? Math.round((publicadoCount / (publicadoCount + rechazadoCount)) * 100)
      : 0

    // Usuarios
    const usuariosData = await payload.find({
      collection: 'users',
      limit: 100,
      pagination: false,
    })

    const rolesCounts: Record<string, number> = {}
    if (usuariosData.docs && Array.isArray(usuariosData.docs)) {
      usuariosData.docs.forEach((usuario: any) => {
        const rol = usuario.role || 'sin-rol'
        rolesCounts[rol] = (rolesCounts[rol] || 0) + 1
      })
    }

    return Response.json({
      timestamp: new Date().toISOString(),
      sistema: {
        uptime: process.uptime(),
        memoria: {
          usado: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          porcentaje: Math.round(
            (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100
          ),
        },
      },
      noticias: {
        total: totalNoticias,
        por_estado: {
          borrador: borradorCount,
          en_revision: enRevisionCount,
          aprobado: aprobadoCount,
          rechazado: rechazadoCount,
          publicado: publicadoCount,
        },
        tasa_aprobacion: tasaAprobacion,
      },
      usuarios: {
        total: usuariosData.totalDocs || 0,
        por_rol: rolesCounts,
      },
      auditoria: {
        registros_hoy: 0,
      },
    })
  } catch (error) {
    return internalError('api/metrics', error, 'Failed to fetch metrics')
  }
}
