export default function NoticiaDetallePage({ searchParams }: { searchParams: { slug?: string } }) {
  const slug = searchParams.slug || "inicio-clases-2026";

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <span className="text-orange-500 font-semibold text-sm uppercase">Noticias</span>
      <h1 className="text-3xl font-bold text-blue-900 mt-2 mb-4">{slug.replace(/-/g, " ")}</h1>
      <p className="text-gray-500 text-sm mb-8">Publicado el 15 de julio de 2026 | Por Comunicacion Institucional</p>

      <div className="h-64 bg-gray-200 rounded-lg mb-8 flex items-center justify-center text-gray-400">
        <span>Imagen destacada</span>
      </div>

      <div className="prose max-w-none text-gray-700">
        <p className="text-lg leading-relaxed mb-4">
          Contenido de la noticia en desarrollo. Esta es una plantilla para demostrar 
          la estructura de la pagina de detalle de noticias del portal institucional.
        </p>
        <p className="leading-relaxed mb-4">
          La Universidad Nacional de Concepcion continua su proceso de modernizacion 
          digital para brindar mejores servicios a la comunidad universitaria.
        </p>
      </div>
    </div>
  );
}
