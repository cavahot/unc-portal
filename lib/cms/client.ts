import { CmsError } from './errors';

const CMS_URL = process.env.CMS_URL || 'http://localhost:3002';

interface FetchOptions extends RequestInit {
  tags?: string[];
}

export async function cmsFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const url = `${CMS_URL}/api${endpoint}`;

  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    next: {
      tags: options.tags,
      revalidate: options.next?.revalidate,
    },
  };

  try {
    const res = await fetch(url, fetchOptions);

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new CmsError(
        errorData.message || `Failed to fetch from CMS endpoint: ${endpoint}`,
        res.status
      );
    }

    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof CmsError) {
      throw error;
    }
    throw new CmsError(
      error instanceof Error ? error.message : 'Unknown CMS connection error',
      500
    );
  }
}
