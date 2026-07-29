import { getPayload } from 'payload'
import config from '../../../payload.config'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const payload = await getPayload({ config })

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
      usuariosData.docs.forEach((user: any) => {
        const rol = user.role || 'sin-rol'
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
    console.error('Error fetching metrics:', error)
    return Response.json(
      {
        error: 'Failed to fetch metrics',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
