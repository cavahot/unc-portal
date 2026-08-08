import { cmsFetch } from '../client';
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

export async function getPageBySlug(slug: string, draft = false): Promise<Pagina | null> {
  const params = new URLSearchParams();
  params.append('where[slug][equals]', slug);
  params.append('limit', '1');
  params.append('depth', '2');

  if (draft) {
    params.append('draft', 'true');
  } else {
    params.append('where[_status][equals]', 'published');
  }

  const res = await cmsFetch<PayloadResponse<Pagina>>(`/paginas?${params.toString()}`, {
    tags: [`paginas:${slug}`],
    ...(draft ? { cache: 'no-store' as const } : {}),
  });

  return res.docs[0] || null;
}
