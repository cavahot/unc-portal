import { S3Client, CreateBucketCommand } from '@aws-sdk/client-s3'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
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

    console.log(`Creating bucket: ${bucketName}`)
    console.log(`Endpoint: ${process.env.S3_ENDPOINT}`)

    try {
      const command = new CreateBucketCommand({
        Bucket: bucketName,
      })

      const response = await s3Client.send(command)

      return Response.json({
        success: true,
        message: `Bucket '${bucketName}' created successfully`,
        response: response,
      })
    } catch (error: any) {
      if (error.Code === 'BucketAlreadyOwnedByYou') {
        return Response.json({
          success: true,
          message: `Bucket '${bucketName}' already exists`,
        })
      }

      throw error
    }
  } catch (error) {
    console.error('Error creating bucket:', error)

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
