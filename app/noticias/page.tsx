import Link from "next/link";

export default function NoticiasPage() {
  const noticias = [
    { slug: "inicio-clases-2026", titulo: "Inicio de clases 2026", fecha: "15 de julio, 2026", cat: "Institucional" },
    { slug: "nueva-carrera-ia", titulo: "Nueva carrera de Inteligencia Artificial", fecha: "10 de julio, 2026", cat: "Academica" },
    { slug: "convenio-internacional", titulo: "Convenio internacional de investigacion", fecha: "5 de julio, 2026", cat: "Investigacion" },
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-blue-900 mb-6">Noticias</h1>
      <div className="grid md:grid-cols-3 gap-6">
        {noticias.map((n) => (
          <Link key={n.slug} href={`/noticias/detalle?slug=${n.slug}`} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
            <div className="h-40 bg-gray-200 flex items-center justify-center text-gray-400">
              <span>Imagen</span>
            </div>
            <div className="p-4">
              <span className="text-xs font-semibold text-orange-500 uppercase">{n.cat}</span>
              <h4 className="font-bold text-gray-800 mt-1 mb-2">{n.titulo}</h4>
              <p className="text-sm text-gray-500">{n.fecha}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
