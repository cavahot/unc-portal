import Link from "next/link"
import { draftMode } from "next/headers"
import { getNewsBySlug, getNewsBySlugDraft } from "@/lib/cms/queries/news"
import { notFound } from "next/navigation"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const noticia = await getNewsBySlug(slug)

  if (!noticia) {
    return {
      title: "Noticia no encontrada",
      description: "La noticia que buscas no existe",
    }
  }

  return {
    title: `${noticia.title} - Portal UNC`,
    description: noticia.summary,
  }
}

export default async function NoticiaDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { isEnabled: isDraft } = await draftMode()

  const noticia = isDraft
    ? await getNewsBySlugDraft(slug)
    : await getNewsBySlug(slug)

  if (!noticia) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      {isDraft && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-center py-2 px-4 flex items-center justify-between">
          <span className="text-sm font-semibold">
            👁 MODO PREVIEW — Esta noticia no está publicada
          </span>
          <a
            href="/api/disable-preview"
            className="text-xs bg-white text-amber-600 font-bold px-3 py-1 rounded hover:bg-amber-50 transition"
          >
            Salir del preview
          </a>
        </div>
      )}

      <div className={`container mx-auto px-4 max-w-3xl ${isDraft ? "mt-10" : ""}`}>
        <Link
          href="/noticias"
          className="text-blue-600 hover:text-blue-800 mb-8 inline-flex items-center gap-2"
        >
          <span>←</span> Volver a noticias
        </Link>

        {noticia.category && (
          <span className="inline-block text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded mb-6">
            {noticia.category.toUpperCase()}
          </span>
        )}

        <h1 className="text-4xl font-bold mb-4 text-gray-900">{noticia.title}</h1>

        {noticia.publishedAt && (
          <p className="text-gray-600 mb-8 text-lg">
            Publicado:{" "}
            {new Date(noticia.publishedAt).toLocaleDateString("es-PY", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        )}

        {noticia.featuredImage?.url && (
          <div className="mb-8 rounded-lg overflow-hidden shadow-md">
            <img
              src={noticia.featuredImage.url}
              alt={noticia.featuredImage.alt || noticia.title}
              className="w-full h-auto object-cover"
            />
          </div>
        )}

        <div className="bg-white p-8 rounded-lg shadow-md mb-8">
          {noticia.summary && (
            <p className="text-lg text-gray-700 leading-relaxed mb-6 font-semibold">
              {noticia.summary}
            </p>
          )}

          {noticia.content && (
            <div className="text-gray-700 leading-relaxed prose prose-sm max-w-none">
              {typeof noticia.content === "object" && noticia.content.root ? (
                <p>Contenido enriquecido disponible en Payload CMS</p>
              ) : typeof noticia.content === "string" ? (
                <div>{noticia.content}</div>
              ) : null}
            </div>
          )}
        </div>

        {noticia.tags && noticia.tags.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {noticia.tags.map((item, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-gray-200 text-gray-800 rounded-full text-sm hover:bg-gray-300 transition"
                >
                  {item.tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {noticia.author && (
          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-gray-700">
              <strong>Autor:</strong> {noticia.author}
            </p>
          </div>
        )}

        <div className="mt-12 pt-8 border-t border-gray-200">
          <Link
            href="/noticias"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold"
          >
            <span>←</span> Ver más noticias
          </Link>
        </div>
      </div>
    </main>
  )
}
