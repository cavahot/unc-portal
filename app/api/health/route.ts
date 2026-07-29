export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    return Response.json({
      status: 'up',
      service: 'portal',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
    })
  } catch (error) {
    return Response.json(
      {
        status: 'down',
        service: 'portal',
        error: String(error),
      },
      { status: 500 }
    )
  }
}
