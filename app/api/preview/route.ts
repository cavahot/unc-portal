import { timingSafeEqual } from 'node:crypto'
import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

const SLUG_RE = /^[a-z0-9][a-z0-9-/]{0,120}$/

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const secret = searchParams.get('secret')
  const slug = searchParams.get('slug')
  const type = searchParams.get('type') || 'noticia'

  const expectedSecret = process.env.PREVIEW_SECRET ?? ''
  if (!expectedSecret || !safeCompare(secret ?? '', expectedSecret)) {
    return new Response('Invalid preview token', { status: 401 })
  }

  if (!slug) {
    return new Response('Missing slug parameter', { status: 400 })
  }

  if (!SLUG_RE.test(slug)) {
    return new Response('Invalid slug', { status: 400 })
  }

  const draft = await draftMode()
  draft.enable()

  if (type === 'page') {
    redirect(`/${slug}`)
  }

  redirect(`/noticias/${slug}`)
}
