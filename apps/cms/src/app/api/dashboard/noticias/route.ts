import { getPayload } from 'payload'
import config from '../../../payload.config'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'en_revision'
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
  const page = parseInt(searchParams.get('page') || '1')

  try {
    const payload = await getPayload({ config })

    const noticias = await payload.find({
      collection: 'noticias',
      where: {
        approvalStatus: { equals: status },
      },
      sort: '-updatedAt',
      limit,
      page,
      depth: 2,
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
    console.error('Error fetching noticias:', error)
    return Response.json(
      { error: 'Failed to fetch noticias' },
      { status: 500 }
    )
  }
}
