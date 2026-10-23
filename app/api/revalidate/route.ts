import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import { readBodyLimited, payloadTooLarge } from '@/lib/security/bodyLimit'
import { getClientIp } from '@/lib/security/clientIp'
import { createRateLimiter, tooManyRequests } from '@/lib/security/rateLimit'
import { safeEqual } from '@/lib/security/safeEqual'
import { readStrongSecret } from '@/lib/security/secrets'

// DEP-06 / RDD-DEP-14: 120 llamadas por minuto por IP confiable y cuerpo <= 8 KiB.
// Amenaza: fuerza bruta del Bearer y revalidación en bucle. Holgado a propósito: el hook
// del CMS llama directo (sin nginx, sin x-real-ip) y comparte el cubo 'no-ip'.
// Límite: store en memoria por instancia; el límite no sustituye al secreto.
const limiter = createRateLimiter({ limit: 120, windowMs: 60_000 })
const MAX_BODY_BYTES = 8 * 1024

export async function POST(request: NextRequest) {
  const rate = limiter.check(getClientIp(request.headers))
  if (!rate.allowed) {
    return tooManyRequests(rate, 'Too many requests')
  }
  if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) {
    return payloadTooLarge()
  }

  // DEP-16/B: sin secreto fuerte configurado el endpoint no opera. Respuesta genérica 503 (sin
  // nombre de variable ni detalle); el log del servidor registra solo el nombre. Límite: no detecta
  // un secreto fuerte pero filtrado.
  const secret = readStrongSecret('REVALIDATION_SECRET', process.env.REVALIDATION_SECRET)
  if (!secret) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }

  // DEP-16/C: comparación por digests SHA-256 (safeEqual): una longitud distinta ya no lanza
  // RangeError (500) ni revela la longitud del secreto. Cualquier fallo es el mismo 401.
  const authHeader = request.headers.get('Authorization')
  if (authHeader === null || !safeEqual(authHeader, `Bearer ${secret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Cuerpo acotado por bytes reales (Content-Length puede faltar o mentir); JSON inválido = {}.
    const raw = await readBodyLimited(request, MAX_BODY_BYTES)
    if (!raw.ok) return payloadTooLarge()
    let body: { tag?: string; path?: string } = {}
    try {
      body = JSON.parse(raw.text) ?? {}
    } catch {
      body = {}
    }
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
      // DEP-19b: lista de slugs de Páginas (la consume getPageSlugs); antes el CMS enviaba `paginas:list`.
      'paginas-slugs',
    ]);

    // DEP-19b: `paginas:<slug>` es la etiqueta por página que usa getPageBySlug; se valida el slug (no se acepta
    // cualquier cadena tras el prefijo). Límite: no comprueba que el slug exista.
    const isPageTag = /^paginas:[a-z0-9-]{1,80}$/.test(tag ?? '')
    if (tag && !ALLOWED_TAGS.has(tag) && !tag.startsWith('noticias:') && !isPageTag) {
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
      revalidateTag(tag, {});
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
    // M4: el cuerpo del 500 es fijo; el detalle (rutas, nombres de caché) queda solo en el log del servidor.
    // Amenaza: divulgación de información interna al cliente. Límite: el log no incluye el Bearer ni el cuerpo.
    console.error('[Revalidate] Error interno:', error instanceof Error ? error.message : 'error desconocido');
    return NextResponse.json({ error: 'Revalidation failed' }, { status: 500 });
  }
}

