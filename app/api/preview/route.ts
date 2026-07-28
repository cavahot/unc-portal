import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const secret = searchParams.get('secret')
  const slug = searchParams.get('slug')
  const type = searchParams.get('type') || 'noticia'

  if (secret !== process.env.PREVIEW_SECRET) {
    return new Response('Invalid preview token', { status: 401 })
  }

  if (!slug) {
    return new Response('Missing slug parameter', { status: 400 })
  }

  const draft = await draftMode()
  draft.enable()

  if (type === 'page') {
    redirect(`/${slug}`)
  }

  redirect(`/noticias/${slug}`)
}
