import { getPayload } from 'payload'
import config from '../../../../payload.config'
import { S3Client, CreateBucketCommand } from '@aws-sdk/client-s3'
import { internalError, requireRole } from '../../../../utilities/routeGuard'

export const dynamic = 'force-dynamic'

/**
 * DEP-04 (RDD-DEP-12): crea el bucket de medios. Es una mutación de infraestructura, por eso es
 * `POST` (un GET puede dispararse por prefetch, un <img> o un enlace) y exclusivo de superadmin.
 * Amenaza: creación de recursos por navegación o por cualquier sesión, y fuga del endpoint S3 y de
 * la respuesta cruda del SDK. No se imprime el endpoint ni se devuelve `response`.
 * Límite: no valida el nombre del bucket más allá de la configuración de entorno; sin rate limit.
 */
export async function POST(request: Request) {
  try {
    const payload = await getPayload({ config })

    const guard = await requireRole(payload, request, ['superadmin'])
    if (!guard.ok) return guard.response

    const s3Client = new S3Client({
      endpoint: process.env.S3_ENDPOINT || 'http://127.0.0.1:9100',
      region: process.env.S3_REGION || 'us-east-1',
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      },
    })

    const bucketName = process.env.S3_BUCKET || 'unc-media'

    try {
      await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }))

      return Response.json({
        success: true,
        message: `Bucket '${bucketName}' created successfully`,
      })
    } catch (error: any) {
      if (error?.Code === 'BucketAlreadyOwnedByYou') {
        return Response.json({
          success: true,
          message: `Bucket '${bucketName}' already exists`,
        })
      }

      throw error
    }
  } catch (error) {
    return internalError('api/setup/create-bucket', error, 'Failed to create bucket')
  }
}
