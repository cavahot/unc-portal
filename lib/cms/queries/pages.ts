import { cmsFetch } from '../client';
import { isCmsNotFound } from '../errors';
import { PayloadResponse } from '../types';
import type { Pagina } from '@unc/cms-types';

/**
 * Fetch slugs of all published Page Builder pages for sitemap generation.
 * Uses depth:0 and select[slug] to minimise payload size.
 */
export async function getPageSlugs(): Promise<string[]> {
  try {
    const params = new URLSearchParams()
    params.append('where[_status][equals]', 'published')
    params.append('limit', '200')
    params.append('depth', '0')
    params.append('select[slug]', 'true')

    const res = await cmsFetch<PayloadResponse<{ slug: string }>>(
      `/paginas?${params.toString()}`,
      { tags: ['paginas-slugs'] },
    )
    return res.docs.map((d) => d.slug).filter(Boolean)
  } catch {
    return []
  }
}

/**
 * Página por slug. Con `draft` Y `authToken` consulta el borrador reenviando
 * el token del editor (DEP-02b, no-store). En cualquier otro caso consulta solo
 * publicados y NUNCA envía Authorization, aunque se pase un token (evita usar
 * el token en consultas públicas cacheables). Límite: el CMS decide el acceso.
 * DEP-15: lista vacía o 404 -> `null`; red caída, timeout o 5xx -> propaga
 * `CmsError` (la página no cachea un 404 por una caída del CMS).
 */
export async function getPageBySlug(
  slug: string,
  draft = false,
  authToken?: string,
): Promise<Pagina | null> {
  const useDraft = draft && !!authToken;
  const params = new URLSearchParams();
  params.append('where[slug][equals]', slug);
  params.append('limit', '1');
  params.append('depth', '2');

  if (useDraft) {
    params.append('draft', 'true');
  } else {
    params.append('where[_status][equals]', 'published');
  }

  try {
    const res = await cmsFetch<PayloadResponse<Pagina>>(
      `/paginas?${params.toString()}`,
      useDraft ? { authToken } : { tags: [`paginas:${slug}`] },
    );
    return res.docs[0] || null;
  } catch (error) {
    if (isCmsNotFound(error)) return null;
    throw error;
  }
}
