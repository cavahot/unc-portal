import { cookies, draftMode } from 'next/headers';
import { notFound } from 'next/navigation';
import { getPageBySlug } from '@/lib/cms/queries/pages';
import { BlockRenderer } from '@/lib/cms/blocks/renderer';

interface PageProps {
  params: Promise<{ locale: string; slug: string[] }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const fullSlug = slug.join('/');
  const pagina = await getPageBySlug(fullSlug).catch(() => null);

  if (!pagina) {
    return {
      title: 'Página no encontrada',
    };
  }

  return {
    title: `${pagina.title} - Portal UNC`,
  };
}

export default async function CatchAllPage({ params }: PageProps) {
  const { slug } = await params;
  const fullSlug = slug.join('/');
  const { isEnabled: isDraft } = await draftMode();

  let pagina;

  if (isDraft) {
    // DEP-02b: el token del editor se lee solo en la rama de preview (ISR
    // público intacto) y solo viaja a la consulta de borrador. Si el CMS lo
    // rechaza (401/403) se degrada a publicados.
    const cookieStore = await cookies();
    const payloadToken = cookieStore.get('payload-token')?.value;
    pagina = payloadToken
      ? await getPageBySlug(fullSlug, true, payloadToken).catch(() => null)
      : null;
  }
  if (!pagina) {
    // DEP-15: sin try/catch; null = no existe (404), CmsError = CMS caído (se
    // propaga para que Next no cachee un 404 por una caída transitoria).
    pagina = await getPageBySlug(fullSlug);
  }

  if (!pagina) {
    notFound();
  }

  return (
    <main className="min-h-screen">
      {isDraft && (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-amber-500 px-4 py-2 text-center text-white">
          <span className="text-sm font-semibold">
            👁 MODO PREVIEW — Esta página no está publicada
          </span>
          <a
            href="/api/disable-preview"
            className="rounded bg-white px-3 py-1 text-xs font-bold text-amber-600 transition hover:bg-amber-50"
          >
            Salir del preview
          </a>
        </div>
      )}

      <BlockRenderer layout={pagina.layout} />
    </main>
  );
}
