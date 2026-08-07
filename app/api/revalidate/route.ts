import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const secret = process.env.REVALIDATION_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: 'Revalidation secret is not configured on the server' },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { tag, path } = body;

    if (!tag && !path) {
      return NextResponse.json(
        { error: 'You must provide a "tag" or a "path" to revalidate' },
        { status: 400 }
      );
    }

    const ALLOWED_TAGS = new Set([
      'noticias',
      'noticias-search',
      'navegacion',
      'transparencia',
      'revistas',
      'tesis',
      'enlaces-externos',
      'facultades',
      'carreras',
      'convenios',
      'tribunal-miembros',
      'tribunal-documentos',
      'aranceles-rectorado',
      'estadisticas',
    ]);

    if (tag && !ALLOWED_TAGS.has(tag) && !tag.startsWith('noticias:')) {
      return NextResponse.json({ error: `Unknown tag: ${tag}` }, { status: 400 });
    }

    if (path) {
      const ALLOWED_PATHS = new Set(['/', '/es', '/en', '/pt-BR', '/gn'])
      const pathBase = path.split('?')[0]
      if (!ALLOWED_PATHS.has(pathBase) && !pathBase.match(/^\/[a-z-]{2,20}(\/[a-z0-9-]{1,80})*$/)) {
        return NextResponse.json({ error: `Invalid path: ${path}` }, { status: 400 })
      }
    }

    if (tag) {
      revalidateTag(tag, { expire: 0 });
      console.log(`[Revalidate] Success for tag: ${tag}`);
    }

    if (path) {
      revalidatePath(path);
      console.log(`[Revalidate] Success for path: ${path}`);
    }

    return NextResponse.json({
      revalidated: true,
      tag: tag || null,
      path: path || null,
      now: Date.now(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown revalidation error' },
      { status: 500 }
    );
  }
}

