import { getPayload } from 'payload'
import config from '../../../payload.config'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '50')
  const page = parseInt(searchParams.get('page') || '1')
  const usuario = searchParams.get('usuario')
  const accion = searchParams.get('accion')
  const resultado = searchParams.get('resultado')

  try {
    const payload = await getPayload({ config })

    const { user } = await payload.auth({ headers: request.headers })
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const whereConditions: any = {}

    if (usuario) {
      whereConditions.usuario = { contains: usuario }
    }
    if (accion) {
      whereConditions.accion = { equals: accion }
    }
    if (resultado) {
      whereConditions.resultado = { equals: resultado }
    }

    const logs = await payload.find({
      collection: 'auditoria',
      where: Object.keys(whereConditions).length > 0 ? whereConditions : undefined,
      sort: '-fechaHora',
      limit,
      page,
    })

    return Response.json(logs)
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return Response.json(
      { error: 'Error fetching audit logs' },
      { status: 500 },
    )
  }
}
