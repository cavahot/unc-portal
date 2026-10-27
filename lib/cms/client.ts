import { CmsError } from './errors';

const CMS_URL = process.env.CMS_URL || 'http://localhost:3002';

interface FetchOptions extends RequestInit {
  tags?: string[];
  /**
   * Token JWT del editor (cookie payload-token). DEP-02b: solo se usa en la
   * ruta de borradores del preview; nunca en consultas públicas.
   */
  authToken?: string;
}

/**
 * Cliente REST del CMS. Con `authToken` añade `Authorization: JWT <token>`.
 * Amenazas que evita (DEP-02b): (1) fuga del token a otro host: con token el
 * endpoint debe empezar por `/` y la URL final debe conservar el origen de
 * CMS_URL; (2) cacheo de borradores/tokens entre usuarios: con token fuerza
 * `cache: 'no-store'` y descarta `revalidate`/`tags`. Límite: no registra ni
 * valida el token; la autorización la decide el CMS.
 */
export async function cmsFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { authToken, ...rest } = options;
  const url = `${CMS_URL}/api${endpoint}`;

  if (authToken) {
    // Defensa contra endpoints que cambian el host (`//h`, `@h`, URL absoluta).
    let sameOrigin = false;
    try {
      sameOrigin =
        endpoint.startsWith('/') &&
        !endpoint.startsWith('//') &&
        new URL(url).origin === new URL(CMS_URL).origin;
    } catch {
      sameOrigin = false;
    }
    if (!sameOrigin) {
      throw new CmsError('Endpoint inválido para petición autenticada', 400);
    }
  }

  const headers = new Headers(rest.headers);
  headers.set('Accept', 'application/json');
  if (authToken) headers.set('Authorization', `JWT ${authToken}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  const fetchOptions: RequestInit = authToken
    ? {
        ...rest,
        headers,
        signal: controller.signal,
        cache: 'no-store',
        next: undefined,
      }
    : {
        ...rest,
        headers,
        signal: controller.signal,
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
  } finally {
    // Se cancela solo tras terminar la lectura del cuerpo: un cuerpo colgado también queda acotado por el timeout.
    clearTimeout(timeoutId);
  }
}
