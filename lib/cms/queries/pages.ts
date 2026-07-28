import { cmsFetch } from '../client';
import { PayloadResponse } from '../types';
import type { Pagina } from '@unc/cms-types';

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
