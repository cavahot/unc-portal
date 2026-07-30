import { draftMode } from 'next/headers';
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

  try {
    pagina = await getPageBySlug(fullSlug, isDraft);
  } catch (error) {
    console.error(`[CatchAllPage] Failed to fetch page "${fullSlug}":`, error);
    pagina = null;
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
