/**
 * Sentry tunnel endpoint — proxies Sentry envelopes through our own domain.
 *
 * Why: ad-blockers and privacy extensions block requests to *.sentry.io.
 * Routing events through /api/monitoring (same origin) bypasses this.
 *
 * The `tunnelRoute` option in withSentryConfig points here automatically.
 */
import { type NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const envelope = await request.text()

  // The first line of a Sentry envelope is always a JSON header.
  const headerLine = envelope.split('\n')[0] ?? '{}'
  let header: { dsn?: string }
  try {
    header = JSON.parse(headerLine) as { dsn?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid envelope' }, { status: 400 })
  }

  // Resolve DSN: prefer what the SDK sent, fall back to server env.
  const dsn = header.dsn ?? process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn) {
    return NextResponse.json({ error: 'Sentry DSN not configured' }, { status: 400 })
  }

  // DSN format: https://PUBLIC_KEY@HOST/PROJECT_ID
  // Ingest URL:  https://HOST/api/PROJECT_ID/envelope/
  let parsedDsn: URL
  try {
    parsedDsn = new URL(dsn)
  } catch {
    return NextResponse.json({ error: 'Invalid DSN' }, { status: 400 })
  }

  const projectId = parsedDsn.pathname.replace(/^\//, '')
  const upstreamUrl = `https://${parsedDsn.host}/api/${projectId}/envelope/`

  const upstream = await fetch(upstreamUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-sentry-envelope' },
    body: envelope,
  })

  return new NextResponse(null, { status: upstream.ok ? 200 : upstream.status })
}
