import { getPayload } from 'payload'
import config from '../../../payload.config'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const payload = await getPayload({ config })

    // Obtener estadísticas del flujo editorial
    const borrador = await payload.count({
      collection: 'noticias',
      where: {
        approvalStatus: { equals: 'draft' },
      },
    })

    const enRevision = await payload.count({
      collection: 'noticias',
      where: {
        approvalStatus: { equals: 'en_revision' },
      },
    })

    const aprobado = await payload.count({
      collection: 'noticias',
      where: {
        approvalStatus: { equals: 'aprobado' },
      },
    })

    const rechazado = await payload.count({
      collection: 'noticias',
      where: {
        approvalStatus: { equals: 'rechazado' },
      },
    })

    const publicado = await payload.count({
      collection: 'noticias',
      where: {
        approvalStatus: { equals: 'publicado' },
      },
    })

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
    console.error('Error fetching dashboard stats:', error)
    return Response.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}
